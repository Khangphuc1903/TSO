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
    private readonly NotificationService _notifications;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SosService> _logger;

    public SosService(
        TutorPlatformDbContext db,
        IHubContext<AppHub> hub,
        NotificationService notifications,
        IWebHostEnvironment environment,
        ILogger<SosService> logger)
    {
        _db = db;
        _hub = hub;
        _notifications = notifications;
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

        var tutorIds = await SubjectTutorIdsAsync(dto.SubjectId, cancellationToken);

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

        if (tutorIds.Count > 0)
        {
            try
            {
                await _hub.Clients.Users(tutorIds.Select(id => id.ToString()).ToList())
                    .SendAsync("SosRequestCreated", notification, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to broadcast SOS request {RequestId}", request.RequestId);
            }
        }

        foreach (var tutorId in tutorIds)
        {
            await NotifyTutorAsync(
                tutorId,
                "SosRequest",
                "Có yêu cầu SOS mới",
                $"Có yêu cầu trợ giúp môn {subjectName}.",
                request.RequestId,
                cancellationToken);
        }

        return MapRequest(request, subjectName);
    }

    public async Task<object> GetConfigAsync(CancellationToken cancellationToken)
    {
        decimal fee;
        try { fee = await GetSettingDecimalAsync("SosFeeAmount", cancellationToken); }
        catch { fee = 25000m; }
        var minutes = await GetSettingIntAsync("SosDurationMinutes", 15, cancellationToken);
        return new { feeAmount = fee, durationMinutes = minutes };
    }

    public async Task<List<SosRequestDto>> OpenRequestsAsync(int tutorId, CancellationToken cancellationToken)
    {
        await RequireEligibleTutorAsync(tutorId, cancellationToken);
        var now = DateTime.UtcNow;
        var requests = await _db.SosRequests.AsNoTracking()
            .Include(r => r.Subject)
            .Where(r => r.Status == "Open" && r.ExpiresAt > now &&
                        r.Subject.TutorSubjects.Any(ts => ts.TutorId == tutorId && ts.IsVerified))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return await MapRequestsAsync(requests, cancellationToken);
    }

    public async Task<List<SosRequestDto>> MyRequestsAsync(int userId, CancellationToken cancellationToken)
    {
        var requests = await _db.SosRequests.AsNoTracking()
            .Include(r => r.Subject)
            .Where(r => r.StudentId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return await MapRequestsAsync(requests, cancellationToken);
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
            var teaches = await TeachesSubjectAsync(userId, request.SubjectId, cancellationToken);
            allowed = await IsEligibleTutorAsync(userId, cancellationToken) &&
                      ((request.Status == "Open" && teaches) || request.ClaimedByTutorId == userId);
        }

        if (!allowed)
            throw new UnauthorizedAccessException();

        var sessionId = await _db.SosSessions.AsNoTracking()
            .Where(s => s.RequestId == request.RequestId)
            .Select(s => (int?)s.SessionId)
            .FirstOrDefaultAsync(cancellationToken);
        return MapRequest(request, request.Subject.SubjectName, sessionId);
    }

    public async Task<SosRequestDto> ClaimAsync(int tutorId, int requestId, CancellationToken cancellationToken)
    {
        await RequireEligibleTutorAsync(tutorId, cancellationToken);
        var request = await _db.SosRequests.AsNoTracking().Include(r => r.Subject)
            .FirstOrDefaultAsync(r => r.RequestId == requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu SOS.");
        if (!await TeachesSubjectAsync(tutorId, request.SubjectId, cancellationToken))
            throw new UnauthorizedAccessException("Bạn không dạy môn của yêu cầu SOS này.");

        var now = DateTime.UtcNow;
        SosRequest claimed;
        Conversation conversation;
        SosSession session;
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        try
        {
        var changed = await _db.SosRequests
            .Where(r => r.RequestId == requestId && r.Status == "Open" && r.ExpiresAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(r => r.Status, "Claimed")
                .SetProperty(r => r.ClaimedByTutorId, tutorId)
                .SetProperty(r => r.ClaimedAt, now), cancellationToken);
        if (changed != 1)
            throw new InvalidOperationException("Yêu cầu đã được gia sư khác nhận hoặc đã hết hạn.");

        claimed = await _db.SosRequests.AsNoTracking().Include(r => r.Subject)
            .SingleAsync(r => r.RequestId == requestId, cancellationToken);
        var user1 = Math.Min(claimed.StudentId, tutorId);
        var user2 = Math.Max(claimed.StudentId, tutorId);
        var found = await _db.Conversations
            .FirstOrDefaultAsync(c => c.User1Id == user1 && c.User2Id == user2 && c.GroupId == null, cancellationToken);
        if (found is null)
        {
            found = new Conversation
            {
                User1Id = user1,
                User2Id = user2,
                CreatedAt = now
            };
            _db.Conversations.Add(found);
            await _db.SaveChangesAsync(cancellationToken);
        }
        conversation = found;

        var duration = await GetSettingIntAsync("SosDurationMinutes", 15, cancellationToken);
        var conversationUpdated = await _db.SosRequests
            .Where(r => r.RequestId == requestId &&
                        r.Status == "Claimed" &&
                        r.ClaimedByTutorId == tutorId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(
                r => r.ConversationId, conversation.ConversationId), cancellationToken);
        if (conversationUpdated != 1)
            throw new InvalidOperationException("Không thể cập nhật yêu cầu SOS đã nhận.");
        claimed.ConversationId = conversation.ConversationId;
        session = new SosSession
        {
            RequestId = claimed.RequestId,
            StudentId = claimed.StudentId,
            TutorId = tutorId,
            ConversationId = conversation.ConversationId,
            StartedAt = now,
            EndsAt = now.AddMinutes(duration),
            DurationMinutes = duration,
            FeeAmount = claimed.FeeAmount,
            PayoutStatus = "Held"
        };
        _db.SosSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unable to claim SOS request {RequestId} for tutor {TutorId}", requestId, tutorId);
            throw new InvalidOperationException("Không nhận được đơn SOS. Hãy thử lại.");
        }

        await _hub.Clients.User(claimed.StudentId.ToString()).SendAsync("SosRequestClaimed",
            new { requestId, tutorId, conversationId = conversation.ConversationId, sessionId = session.SessionId }, cancellationToken);
        await _hub.Clients.User(tutorId.ToString()).SendAsync("SosSessionStarted",
            new { requestId, conversationId = conversation.ConversationId, sessionId = session.SessionId }, cancellationToken);

        var otherTutorIds = (await SubjectTutorIdsAsync(claimed.SubjectId, cancellationToken))
            .Where(id => id != tutorId)
            .ToList();

        foreach (var otherTutorId in otherTutorIds)
        {
            await NotifyTutorAsync(
                otherTutorId,
                "SosRequestClaimed",
                "Yêu cầu SOS đã được nhận",
                "Yêu cầu SOS này đã được một gia sư khác nhận.",
                requestId,
                cancellationToken);
        }

        await _hub.Clients.Users(otherTutorIds.Select(id => id.ToString()).ToList())
            .SendAsync("SosRequestClaimedByOther",
                new { requestId, tutorId, sessionId = session.SessionId }, cancellationToken);
        return MapRequest(claimed, claimed.Subject.SubjectName, session.SessionId);
    }

    public async Task SetReadyAsync(int tutorId, bool isReady, CancellationToken cancellationToken)
    {
        await RequireEligibleTutorAsync(tutorId, cancellationToken);
        var profile = await _db.TutorProfiles.FirstAsync(t => t.TutorId == tutorId, cancellationToken);
        profile.IsSosReady = true;
        profile.SosReadyAt ??= DateTime.UtcNow;
        profile.LastSosHeartbeat = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await _hub.Clients.User(tutorId.ToString()).SendAsync("SosTutorPresenceChanged",
            new { tutorId, isSosReady = true, online = SosPresence.IsOnline(tutorId) }, cancellationToken);
    }

    public async Task<object> GetReadyAsync(int tutorId, CancellationToken cancellationToken)
    {
        var profile = await _db.TutorProfiles.AsNoTracking()
            .SingleOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ gia sư.");
        return new
        {
            tutorId,
            isSosReady = true,
            online = SosPresence.IsOnline(tutorId),
            lastSosHeartbeat = profile.LastSosHeartbeat
        };
    }

    public async Task<SosSessionDto> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken)
    {
        var session = await _db.SosSessions.AsNoTracking()
            .Include(s => s.Request).ThenInclude(r => r.Subject)
            .Include(s => s.Student)
            .Include(s => s.Tutor).ThenInclude(t => t.Tutor)
            .SingleOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên SOS.");
        if (session.StudentId != userId && session.TutorId != userId)
            throw new UnauthorizedAccessException();
        return await WithReviewAsync(session, userId, cancellationToken);
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
            .Include(s => s.Request).ThenInclude(r => r.Subject)
            .Include(s => s.Student)
            .Include(s => s.Tutor).ThenInclude(t => t.Tutor)
            .SingleAsync(s => s.SessionId == sessionId, cancellationToken);
        if (changed == 1)
            await PublishSessionEndedAsync(updated, cancellationToken);

        return await WithReviewAsync(updated, userId, cancellationToken);
    }

    public async Task<SosSessionDto> ReviewSessionAsync(
        int studentId,
        int sessionId,
        byte rating,
        string? comment,
        CancellationToken cancellationToken)
    {
        if (rating is < 1 or > 5)
            throw new InvalidOperationException("Số sao phải từ 1 đến 5.");

        var session = await _db.SosSessions
            .SingleOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên SOS.");
        if (session.StudentId != studentId)
            throw new UnauthorizedAccessException();
        if (session.EndedAt == null && (session.EndsAt == null || session.EndsAt > DateTime.UtcNow))
            throw new InvalidOperationException("Hãy đợi phiên kết thúc rồi mới đánh giá.");
        if (await _db.Reviews.AnyAsync(r => r.SosSessionId == sessionId, cancellationToken))
            throw new InvalidOperationException("Bạn đã đánh giá phiên này.");

        _db.Reviews.Add(new Review
        {
            SosSessionId = sessionId,
            StudentId = studentId,
            TutorId = session.TutorId,
            Rating = rating,
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
            IsHidden = false,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
        await RefreshTutorRatingAsync(session.TutorId, cancellationToken);
        var full = await _db.SosSessions.AsNoTracking()
            .Include(s => s.Request).ThenInclude(r => r.Subject)
            .Include(s => s.Student)
            .Include(s => s.Tutor).ThenInclude(t => t.Tutor)
            .SingleAsync(s => s.SessionId == sessionId, cancellationToken);
        return await WithReviewAsync(full, studentId, cancellationToken);
    }

    public async Task HeartbeatAsync(int tutorId, CancellationToken cancellationToken)
    {
        await RequireEligibleTutorAsync(tutorId, cancellationToken);
        await _db.TutorProfiles
            .Where(t => t.TutorId == tutorId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(
                t => t.LastSosHeartbeat, DateTime.UtcNow), cancellationToken);
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
                var row = await _db.SosRequests
                    .Where(r => r.RequestId == requestId)
                    .Select(r => new { r.StudentId, r.SubjectId })
                    .SingleAsync(cancellationToken);
                await _hub.Clients.User(row.StudentId.ToString()).SendAsync(
                    "SosRequestExpired", new { requestId }, cancellationToken);
                var tutorIds = await SubjectTutorIdsAsync(row.SubjectId, cancellationToken);
                if (tutorIds.Count > 0)
                {
                    await _hub.Clients.Users(tutorIds.Select(id => id.ToString()).ToList())
                        .SendAsync("SosRequestExpired", new { requestId }, cancellationToken);
                }
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

    private IQueryable<TutorProfile> EligibleTutors() =>
        _db.TutorProfiles.Where(t =>
            t.IsPublished &&
            t.VerificationStatus == "Verified" &&
            t.Tutor.Status == "Active");

    private IQueryable<TutorProfile> SubjectTutors(int subjectId) =>
        EligibleTutors().Where(t => t.TutorSubjects.Any(ts => ts.SubjectId == subjectId && ts.IsVerified));

    private Task<List<int>> SubjectTutorIdsAsync(int subjectId, CancellationToken cancellationToken) =>
        SubjectTutors(subjectId).Select(t => t.TutorId).ToListAsync(cancellationToken);

    private Task<bool> TeachesSubjectAsync(int tutorId, int subjectId, CancellationToken cancellationToken) =>
        SubjectTutors(subjectId).AnyAsync(t => t.TutorId == tutorId, cancellationToken);

    private Task<bool> IsEligibleTutorAsync(int tutorId, CancellationToken cancellationToken) =>
        EligibleTutors().AnyAsync(t => t.TutorId == tutorId, cancellationToken);

    private async Task RequireEligibleTutorAsync(int tutorId, CancellationToken cancellationToken)
    {
        if (!await IsEligibleTutorAsync(tutorId, cancellationToken))
            throw new UnauthorizedAccessException("Hồ sơ gia sư chưa đủ điều kiện SOS.");
    }

    private async Task NotifyTutorAsync(
        int tutorId,
        string type,
        string title,
        string content,
        int requestId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _notifications.NotifyAsync(
                tutorId,
                type,
                title,
                content,
                "SosRequest",
                requestId,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Unable to persist SOS notification for tutor {TutorId}, request {RequestId}",
                tutorId,
                requestId);
        }
    }

    private async Task<decimal> GetSettingDecimalAsync(string key, CancellationToken ct)
    {
        var value = await _db.PlatformSettings.Where(s => s.SettingKey == key)
            .Select(s => s.SettingValue).SingleOrDefaultAsync(ct);
        if (!decimal.TryParse(value, out var amount) || amount < 0)
            return 25000m;
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

    private async Task<List<SosRequestDto>> MapRequestsAsync(List<SosRequest> requests, CancellationToken cancellationToken)
    {
        if (requests.Count == 0) return new List<SosRequestDto>();
        var ids = requests.Select(r => r.RequestId).ToList();
        var sessions = await _db.SosSessions.AsNoTracking()
            .Where(s => ids.Contains(s.RequestId))
            .Select(s => new { s.RequestId, s.SessionId })
            .ToListAsync(cancellationToken);
        var map = sessions.ToDictionary(s => s.RequestId, s => (int?)s.SessionId);
        return requests.Select(r =>
        {
            map.TryGetValue(r.RequestId, out var sid);
            return MapRequest(r, r.Subject.SubjectName, sid);
        }).ToList();
    }

    private static SosRequestDto MapRequest(SosRequest request, string subjectName, int? sessionId = null) => new()
    {
        RequestId = request.RequestId, StudentId = request.StudentId, SubjectId = request.SubjectId,
        SubjectName = subjectName, ImageUrl = request.ImageUrl, QuestionNote = request.QuestionNote,
        FeeAmount = request.FeeAmount, Status = request.Status, ClaimedByTutorId = request.ClaimedByTutorId,
        ConversationId = request.ConversationId, SessionId = sessionId,
        CreatedAt = request.CreatedAt, ExpiresAt = request.ExpiresAt,
        ClaimedAt = request.ClaimedAt
    };

    private async Task<SosSessionDto> WithReviewAsync(SosSession session, int viewerId, CancellationToken cancellationToken)
    {
        var dto = MapSession(session);
        var rating = await _db.Reviews.AsNoTracking()
            .Where(r => r.SosSessionId == session.SessionId)
            .Select(r => (byte?)r.Rating)
            .FirstOrDefaultAsync(cancellationToken);
        var ended = session.EndedAt != null || (session.EndsAt != null && session.EndsAt <= DateTime.UtcNow);
        dto.MyRating = rating;
        dto.CanReview = ended && viewerId == session.StudentId && rating == null;
        return dto;
    }

    private async Task RefreshTutorRatingAsync(int tutorId, CancellationToken cancellationToken)
    {
        var summary = await _db.Reviews
            .Where(review => review.TutorId == tutorId && !review.IsHidden)
            .GroupBy(review => review.TutorId)
            .Select(group => new
            {
                Average = group.Average(review => (decimal)review.Rating),
                Count = group.Count()
            })
            .SingleOrDefaultAsync(cancellationToken);
        var tutor = await _db.TutorProfiles.SingleAsync(profile => profile.TutorId == tutorId, cancellationToken);
        tutor.AverageRating = summary == null ? 0 : Math.Round(summary.Average, 2);
        tutor.TotalReviews = summary?.Count ?? 0;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static DateTime AsUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static DateTime? AsUtc(DateTime? value) =>
        value.HasValue ? AsUtc(value.Value) : null;

    private static SosSessionDto MapSession(SosSession session) => new()
    {
        SessionId = session.SessionId, RequestId = session.RequestId, StudentId = session.StudentId,
        StudentName = session.Student?.FullName,
        TutorId = session.TutorId, TutorName = session.Tutor?.Tutor?.FullName,
        ConversationId = session.ConversationId,
        SubjectName = session.Request?.Subject?.SubjectName,
        ImageUrl = session.Request?.ImageUrl,
        QuestionNote = session.Request?.QuestionNote,
        StartedAt = AsUtc(session.StartedAt),
        EndsAt = AsUtc(session.EndsAt ?? session.StartedAt.AddMinutes(session.DurationMinutes)),
        EndedAt = AsUtc(session.EndedAt), DurationMinutes = session.DurationMinutes, FeeAmount = session.FeeAmount,
        PayoutStatus = session.PayoutStatus
    };
}
