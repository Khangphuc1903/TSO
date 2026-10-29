using System.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Hubs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public sealed class SosService
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private readonly TutorPlatformDbContext _db;
    private readonly IHubContext<AppHub> _hub;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SosService> _logger;

    public SosService(
        TutorPlatformDbContext db,
        IHubContext<AppHub> hub,
        IWebHostEnvironment environment,
        ILogger<SosService> logger)
    {
        _db = db;
        _hub = hub;
        _environment = environment;
        _logger = logger;
    }

    public async Task<SosRequestDto> CreateRequestAsync(
        int studentId,
        CreateSosRequestDto dto,
        IFormFile image,
        CancellationToken cancellationToken)
    {
        if (image is null || image.Length == 0)
            throw new InvalidOperationException("Ảnh bài tập là bắt buộc.");
        if (image.Length > 8 * 1024 * 1024)
            throw new InvalidOperationException("Ảnh không được vượt quá 8 MB.");
        if (!AllowedExtensions.Contains(Path.GetExtension(image.FileName)))
            throw new InvalidOperationException("Định dạng ảnh không được hỗ trợ.");
        if (!IsSupportedImage(await ReadHeaderAsync(image, cancellationToken)))
            throw new InvalidOperationException("Nội dung tệp không phải là ảnh hợp lệ.");

        var subjectExists = await _db.Subjects.AnyAsync(
            s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
        if (!subjectExists)
            throw new KeyNotFoundException("Môn học không tồn tại hoặc đã bị khóa.");

        var fee = await GetSettingDecimalAsync("SosFeeAmount", cancellationToken);
        var now = DateTime.UtcNow;
        var relativePath = await SaveImageAsync(image, cancellationToken);

        var request = new SosRequest
        {
            StudentId = studentId,
            SubjectId = dto.SubjectId,
            TopicId = dto.TopicId,
            ImageUrl = relativePath,
            QuestionNote = string.IsNullOrWhiteSpace(dto.QuestionNote) ? null : dto.QuestionNote.Trim(),
            FeeAmount = fee,
            Status = "Open",
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(10)
        };

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            _db.SosRequests.Add(request);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            TryDelete(relativePath);
            throw;
        }

        var tutorIds = await _db.TutorProfiles
            .Where(t => t.IsSosReady &&
                        t.VerificationStatus == "Verified" &&
                        t.IsPublished &&
                        t.Tutor.Status == "Active" &&
                        t.TutorSubjects.Any(ts => ts.SubjectId == dto.SubjectId && ts.IsVerified))
            .Select(t => t.TutorId)
            .ToListAsync(cancellationToken);

        var subjectName = await _db.Subjects
            .Where(s => s.SubjectId == dto.SubjectId)
            .Select(s => s.SubjectName)
            .SingleAsync(cancellationToken);
        var notification = new
        {
            requestId = request.RequestId,
            subjectId = request.SubjectId,
            subjectName,
            imageUrl = request.ImageUrl,
            questionNote = request.QuestionNote,
            feeAmount = request.FeeAmount,
            expiresAt = request.ExpiresAt
        };

        foreach (var tutorId in tutorIds.Where(SosPresence.IsOnline))
        {
            try
            {
                await _hub.Clients.User(tutorId.ToString()).SendAsync(
                    "SosRequestCreated", notification, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to notify tutor {TutorId} about SOS request {RequestId}",
                    tutorId, request.RequestId);
            }
        }

        return MapRequest(request, subjectName);
    }

    public async Task<List<SosRequestDto>> OpenRequestsAsync(int tutorId, CancellationToken cancellationToken)
    {
        await RequireReadyTutorAsync(tutorId, cancellationToken);
        var now = DateTime.UtcNow;
        var requests = await _db.SosRequests.AsNoTracking()
            .Include(r => r.Subject)
            .Where(r => r.Status == "Open" && r.ExpiresAt > now &&
                        r.Subject.TutorSubjects.Any(ts => ts.TutorId == tutorId && ts.IsVerified))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return requests.Select(r => MapRequest(r, r.Subject.SubjectName)).ToList();
    }

    public async Task<List<SosRequestDto>> MyRequestsAsync(int userId, CancellationToken cancellationToken)
    {
        var requests = await _db.SosRequests.AsNoTracking()
            .Include(r => r.Subject)
            .Where(r => r.StudentId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return requests.Select(r => MapRequest(r, r.Subject.SubjectName)).ToList();
    }

    public async Task<SosRequestDto> GetRequestAsync(
        int userId,
        int requestId,
        bool isTutor,
        CancellationToken cancellationToken)
    {
        var request = await _db.SosRequests.AsNoTracking()
            .Include(r => r.Subject)
            .SingleOrDefaultAsync(r => r.RequestId == requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu SOS.");

        var allowed = request.StudentId == userId;
        if (isTutor)
        {
            allowed = await _db.TutorSubjects.AnyAsync(ts =>
                ts.TutorId == userId &&
                ts.SubjectId == request.SubjectId &&
                ts.IsVerified &&
                (request.Status == "Open" || request.ClaimedByTutorId == userId),
                cancellationToken);
        }

        if (!allowed)
            throw new UnauthorizedAccessException();

        return MapRequest(request, request.Subject.SubjectName);
    }

    public async Task<SosRequestDto> ClaimAsync(int tutorId, int requestId, CancellationToken cancellationToken)
    {
        await RequireReadyTutorAsync(tutorId, cancellationToken);
        var request = await _db.SosRequests.Include(r => r.Subject)
            .FirstOrDefaultAsync(r => r.RequestId == requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu SOS.");
        if (!await _db.TutorSubjects.AnyAsync(ts =>
                ts.TutorId == tutorId && ts.SubjectId == request.SubjectId && ts.IsVerified, cancellationToken))
            throw new UnauthorizedAccessException();

        var now = DateTime.UtcNow;
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var changed = await _db.SosRequests
            .Where(r => r.RequestId == requestId && r.Status == "Open" && r.ExpiresAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(r => r.Status, "Claimed")
                .SetProperty(r => r.ClaimedByTutorId, tutorId)
                .SetProperty(r => r.ClaimedAt, now), cancellationToken);
        if (changed != 1)
            throw new InvalidOperationException("Yêu cầu đã được gia sư khác nhận hoặc đã hết hạn.");

        var claimed = await _db.SosRequests.Include(r => r.Subject)
            .SingleAsync(r => r.RequestId == requestId, cancellationToken);
        var conversation = new Conversation
        {
            User1Id = Math.Min(claimed.StudentId, tutorId),
            User2Id = Math.Max(claimed.StudentId, tutorId),
            CreatedAt = now
        };
        _db.Conversations.Add(conversation);
        await _db.SaveChangesAsync(cancellationToken);

        var duration = await GetSettingIntAsync("SosDurationMinutes", 15, cancellationToken);
        claimed.ConversationId = conversation.ConversationId;
        var session = new SosSession
        {
            RequestId = claimed.RequestId,
            StudentId = claimed.StudentId,
            TutorId = tutorId,
            ConversationId = conversation.ConversationId,
            StartedAt = now,
            DurationMinutes = duration,
            FeeAmount = claimed.FeeAmount,
            PayoutStatus = "Held"
        };
        _db.SosSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _hub.Clients.User(claimed.StudentId.ToString()).SendAsync("SosRequestClaimed",
            new { requestId, tutorId, conversationId = conversation.ConversationId, sessionId = session.SessionId }, cancellationToken);
        await _hub.Clients.User(tutorId.ToString()).SendAsync("SosSessionStarted",
            new { requestId, conversationId = conversation.ConversationId, sessionId = session.SessionId }, cancellationToken);
        return MapRequest(claimed, claimed.Subject.SubjectName);
    }

    public async Task SetReadyAsync(int tutorId, bool isReady, CancellationToken cancellationToken)
    {
        var profile = await _db.TutorProfiles.FirstOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ gia sư.");
        if (profile.VerificationStatus != "Verified" || !profile.IsPublished)
            throw new UnauthorizedAccessException("Hồ sơ gia sư chưa đủ điều kiện SOS.");
        profile.IsSosReady = isReady;
        profile.SosReadyAt = isReady ? DateTime.UtcNow : null;
        profile.LastSosHeartbeat = isReady ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync(cancellationToken);
        await _hub.Clients.User(tutorId.ToString()).SendAsync("SosTutorPresenceChanged",
            new { tutorId, isSosReady = isReady, online = SosPresence.IsOnline(tutorId) }, cancellationToken);
    }

    public async Task<object> GetReadyAsync(int tutorId, CancellationToken cancellationToken)
    {
        var profile = await _db.TutorProfiles.AsNoTracking()
            .SingleOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ gia sư.");
        return new
        {
            tutorId,
            isSosReady = profile.IsSosReady,
            online = SosPresence.IsOnline(tutorId),
            lastSosHeartbeat = profile.LastSosHeartbeat
        };
    }

    public async Task<SosSessionDto> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken)
    {
        var session = await _db.SosSessions.AsNoTracking().SingleOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên SOS.");
        if (session.StudentId != userId && session.TutorId != userId)
            throw new UnauthorizedAccessException();
        return MapSession(session);
    }

    public async Task<SosSessionDto> EndSessionAsync(
        int userId,
        int sessionId,
        CancellationToken cancellationToken)
    {
        var session = await _db.SosSessions.AsNoTracking()
            .SingleOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên SOS.");
        if (session.StudentId != userId && session.TutorId != userId)
            throw new UnauthorizedAccessException();

        var endedAt = DateTime.UtcNow;
        var changed = await _db.SosSessions
            .Where(s => s.SessionId == sessionId && s.EndedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.EndedAt, endedAt), cancellationToken);

        var updated = await _db.SosSessions.AsNoTracking()
            .SingleAsync(s => s.SessionId == sessionId, cancellationToken);
        if (changed == 1)
            await PublishSessionEndedAsync(updated, cancellationToken);

        return MapSession(updated);
    }

    public async Task HeartbeatAsync(int tutorId, CancellationToken cancellationToken)
    {
        var changed = await _db.TutorProfiles
            .Where(t => t.TutorId == tutorId && t.IsSosReady)
            .ExecuteUpdateAsync(setters => setters.SetProperty(
                t => t.LastSosHeartbeat, DateTime.UtcNow), cancellationToken);
        if (changed != 1)
            throw new InvalidOperationException("Gia sư chưa bật SOS Ready.");
    }

    public async Task EndExpiredAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var expiredRequests = await _db.SosRequests
            .Where(r => r.Status == "Open" && r.ExpiresAt <= now)
            .Select(r => r.RequestId)
            .ToListAsync(cancellationToken);
        foreach (var requestId in expiredRequests)
        {
            var changed = await _db.SosRequests
                .Where(r => r.RequestId == requestId && r.Status == "Open" && r.ExpiresAt <= now)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "Expired"), cancellationToken);
            if (changed == 1)
            {
                var studentId = await _db.SosRequests
                    .Where(r => r.RequestId == requestId)
                    .Select(r => r.StudentId)
                    .SingleAsync(cancellationToken);
                await _hub.Clients.User(studentId.ToString()).SendAsync(
                    "SosRequestExpired", new { requestId }, cancellationToken);
            }
        }

        var sessions = await _db.SosSessions
            .Where(s => s.EndedAt == null && s.EndsAt <= now)
            .Select(s => s.SessionId)
            .ToListAsync(cancellationToken);
        foreach (var sessionId in sessions)
        {
            var changed = await _db.SosSessions
                .Where(s => s.SessionId == sessionId && s.EndedAt == null &&
                            s.EndsAt <= now)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.EndedAt, now), cancellationToken);
            if (changed == 1)
            {
                var session = await _db.SosSessions.AsNoTracking()
                    .SingleAsync(s => s.SessionId == sessionId, cancellationToken);
                await PublishSessionEndedAsync(session, cancellationToken);
            }
        }
    }

    private async Task PublishSessionEndedAsync(SosSession session, CancellationToken cancellationToken)
    {
        var payload = new { sessionId = session.SessionId, endedAt = session.EndedAt };
        await _hub.Clients.Group($"sos-session-{session.SessionId}")
            .SendAsync("SosSessionEnded", payload, cancellationToken);
        await _hub.Clients.Users(new[] { session.StudentId.ToString(), session.TutorId.ToString() })
            .SendAsync("SosSessionEnded", payload, cancellationToken);
    }

    private async Task RequireReadyTutorAsync(int tutorId, CancellationToken cancellationToken)
    {
        var ready = await _db.TutorProfiles.AnyAsync(t =>
            t.TutorId == tutorId && t.IsSosReady && t.IsPublished &&
            t.VerificationStatus == "Verified" && t.Tutor.Status == "Active", cancellationToken);
        if (!ready || !SosPresence.IsOnline(tutorId))
            throw new UnauthorizedAccessException("Gia sư chưa ở trạng thái SOS Ready hoặc đang offline.");
    }

    private async Task<decimal> GetSettingDecimalAsync(string key, CancellationToken ct)
    {
        var value = await _db.PlatformSettings.Where(s => s.SettingKey == key)
            .Select(s => s.SettingValue).SingleOrDefaultAsync(ct);
        if (!decimal.TryParse(value, out var amount) || amount < 0)
            throw new InvalidOperationException("Cấu hình SosFeeAmount không hợp lệ.");
        return amount;
    }

    private async Task<int> GetSettingIntAsync(string key, int fallback, CancellationToken ct)
    {
        var value = await _db.PlatformSettings.Where(s => s.SettingKey == key)
            .Select(s => s.SettingValue).SingleOrDefaultAsync(ct);
        return int.TryParse(value, out var minutes) && minutes > 0 && minutes <= 120 ? minutes : fallback;
    }

    private async Task<string> SaveImageAsync(IFormFile image, CancellationToken ct)
    {
        var directory = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), "uploads", "sos");
        Directory.CreateDirectory(directory);
        var bytes = await ReadHeaderAsync(image, ct);
        var extension = ".jpg";
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            extension = ".png";
        else if (bytes.Length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F')
            extension = ".webp";
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(directory, fileName);
        await using var stream = File.Create(fullPath);
        await image.CopyToAsync(stream, ct);
        return $"/uploads/sos/{fileName}";
    }

    private static async Task<byte[]> ReadHeaderAsync(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(), ct);
        return header[..read];
    }

    private static bool IsSupportedImage(byte[] bytes) =>
        (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) ||
        (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
         bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) ||
        (bytes.Length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
         bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P');

    private void TryDelete(string relativePath)
    {
        try
        {
            var fullPath = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
                relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to remove SOS upload after failed request save");
        }
    }

    private static SosRequestDto MapRequest(SosRequest request, string subjectName) => new()
    {
        RequestId = request.RequestId, StudentId = request.StudentId, SubjectId = request.SubjectId,
        SubjectName = subjectName, ImageUrl = request.ImageUrl, QuestionNote = request.QuestionNote,
        FeeAmount = request.FeeAmount, Status = request.Status, ClaimedByTutorId = request.ClaimedByTutorId,
        ConversationId = request.ConversationId, CreatedAt = request.CreatedAt, ExpiresAt = request.ExpiresAt,
        ClaimedAt = request.ClaimedAt
    };

    private static SosSessionDto MapSession(SosSession session) => new()
    {
        SessionId = session.SessionId, RequestId = session.RequestId, StudentId = session.StudentId,
        TutorId = session.TutorId, ConversationId = session.ConversationId, StartedAt = session.StartedAt,
        EndsAt = session.EndsAt ?? session.StartedAt.AddMinutes(session.DurationMinutes),
        EndedAt = session.EndedAt, DurationMinutes = session.DurationMinutes, FeeAmount = session.FeeAmount,
        PayoutStatus = session.PayoutStatus
    };
}
