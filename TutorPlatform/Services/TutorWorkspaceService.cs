using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class TutorWorkspaceService
{
    private static readonly HashSet<string> AllowedCertExt = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp"
    };

    private readonly TutorPlatformDbContext _db;
    private readonly IWebHostEnvironment _env;

    public TutorWorkspaceService(TutorPlatformDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<TutorProfile> EnsureProfileAsync(int tutorId, CancellationToken cancellationToken)
    {
        var profile = await _db.TutorProfiles.FirstOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken);
        if (profile != null) return profile;

        profile = new TutorProfile
        {
            TutorId = tutorId,
            TeachingMode = "Both",
            VerificationStatus = "Pending",
            IsPublished = false,
            AverageRating = 0,
            TotalReviews = 0,
            CreatedAt = DateTime.Now
        };
        _db.TutorProfiles.Add(profile);
        await _db.SaveChangesAsync(cancellationToken);
        return profile;
    }

    public async Task<TutorWorkspaceDto> GetWorkspaceAsync(int tutorId, CancellationToken cancellationToken)
    {
        await EnsureProfileAsync(tutorId, cancellationToken);

        var tp = await _db.TutorProfiles
            .AsNoTracking()
            .Include(t => t.TutorSubjects).ThenInclude(s => s.Subject)
            .Include(t => t.TutorCertificates)
            .Include(t => t.AvailabilitySlots)
            .FirstAsync(t => t.TutorId == tutorId, cancellationToken);

        return new TutorWorkspaceDto
        {
            TutorId = tp.TutorId,
            Bio = tp.Bio,
            University = tp.University,
            Major = tp.Major,
            YearsOfExperience = tp.YearsOfExperience,
            HourlyRateMin = tp.HourlyRateMin,
            HourlyRateMax = tp.HourlyRateMax,
            TeachingMode = tp.TeachingMode,
            IsPublished = tp.IsPublished,
            VerificationStatus = tp.VerificationStatus,
            AverageRating = tp.AverageRating,
            TotalReviews = tp.TotalReviews,
            Subjects = tp.TutorSubjects.Select(s => new TutorSubjectItemDto
            {
                SubjectId = s.SubjectId,
                SubjectName = s.Subject.SubjectName,
                IsVerified = s.IsVerified
            }).ToList(),
            Certificates = tp.TutorCertificates
                .OrderByDescending(c => c.UploadedAt)
                .Select(MapCert)
                .ToList(),
            Slots = tp.AvailabilitySlots
                .OrderBy(s => s.DayOfWeek ?? 99)
                .ThenBy(s => s.SpecificDate)
                .ThenBy(s => s.StartTime)
                .Select(MapSlot)
                .ToList()
        };
    }

    public async Task<(bool Success, int Status, string Message, TutorWorkspaceDto? Data)> UpdateProfileAsync(
        int tutorId, UpdateTutorTeachingProfileDto dto, CancellationToken cancellationToken)
    {
        var profile = await EnsureProfileAsync(tutorId, cancellationToken);
        var mode = string.IsNullOrWhiteSpace(dto.TeachingMode) ? "Both" : dto.TeachingMode.Trim();
        if (mode is not ("Online" or "Offline" or "Both"))
            return (false, 400, "Hình thức dạy phải là Online, Offline hoặc Both.", null);

        if (dto.HourlyRateMin is > 0 && dto.HourlyRateMax is > 0 && dto.HourlyRateMin > dto.HourlyRateMax)
            return (false, 400, "Giá tối thiểu không được lớn hơn giá tối đa.", null);

        profile.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        profile.University = string.IsNullOrWhiteSpace(dto.University) ? null : dto.University.Trim();
        profile.Major = string.IsNullOrWhiteSpace(dto.Major) ? null : dto.Major.Trim();
        profile.YearsOfExperience = dto.YearsOfExperience;
        profile.HourlyRateMin = dto.HourlyRateMin;
        profile.HourlyRateMax = dto.HourlyRateMax;
        profile.TeachingMode = mode;
        profile.IsPublished = dto.IsPublished;
        profile.UpdatedAt = DateTime.Now;

        var wanted = (dto.SubjectIds ?? new List<int>()).Distinct().ToList();
        if (wanted.Count > 0)
        {
            var validCount = await _db.Subjects.CountAsync(s => wanted.Contains(s.SubjectId) && s.IsActive, cancellationToken);
            if (validCount != wanted.Count)
                return (false, 400, "Có môn học không hợp lệ.", null);
        }

        var existing = await _db.TutorSubjects.Where(s => s.TutorId == tutorId).ToListAsync(cancellationToken);
        _db.TutorSubjects.RemoveRange(existing.Where(s => !wanted.Contains(s.SubjectId)));
        foreach (var sid in wanted.Where(id => existing.All(e => e.SubjectId != id)))
        {
            _db.TutorSubjects.Add(new TutorSubject
            {
                TutorId = tutorId,
                SubjectId = sid,
                IsVerified = false
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã lưu hồ sơ dạy học.", await GetWorkspaceAsync(tutorId, cancellationToken));
    }

    public async Task<(bool Success, int Status, string Message, TutorCertificateItemDto? Data)> UploadCertificateAsync(
        int tutorId, string certificateName, string? issuedBy, string? issuedDate, IFormFile? file, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(certificateName))
            return (false, 400, "Nhập tên chứng chỉ.", null);
        if (file == null || file.Length == 0)
            return (false, 400, "Chọn tệp chứng chỉ.", null);
        if (file.Length > 8 * 1024 * 1024)
            return (false, 400, "Tệp tối đa 8MB.", null);

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedCertExt.Contains(ext))
            return (false, 400, "Chỉ nhận PDF, JPG, PNG hoặc WEBP.", null);

        await EnsureProfileAsync(tutorId, cancellationToken);

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", "certs", tutorId.ToString());
        Directory.CreateDirectory(dir);

        var safeName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var physical = Path.Combine(dir, safeName);
        await using (var stream = File.Create(physical))
            await file.CopyToAsync(stream, cancellationToken);

        DateOnly? issued = null;
        if (DateOnly.TryParse(issuedDate, out var parsed))
            issued = parsed;

        var relative = $"/uploads/certs/{tutorId}/{safeName}";
        if (relative.Length > 500)
            return (false, 400, "Đường dẫn tệp quá dài.", null);

        var cert = new TutorCertificate
        {
            TutorId = tutorId,
            CertificateName = certificateName.Trim(),
            FileUrl = relative,
            IssuedBy = string.IsNullOrWhiteSpace(issuedBy) ? null : issuedBy.Trim(),
            IssuedDate = issued,
            UploadedAt = DateTime.Now
        };
        _db.TutorCertificates.Add(cert);
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 201, "Đã tải chứng chỉ.", MapCert(cert));
    }

    public async Task<(bool Success, int Status, string Message)> DeleteCertificateAsync(
        int tutorId, int certificateId, CancellationToken cancellationToken)
    {
        var cert = await _db.TutorCertificates
            .FirstOrDefaultAsync(c => c.CertificateId == certificateId && c.TutorId == tutorId, cancellationToken);
        if (cert == null)
            return (false, 404, "Không tìm thấy chứng chỉ.");

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        if (cert.FileUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var physical = Path.Combine(webRoot, cert.FileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(physical))
                File.Delete(physical);
        }

        _db.TutorCertificates.Remove(cert);
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã xóa chứng chỉ.");
    }

    public async Task<(bool Success, int Status, string Message, AvailabilitySlotDto? Data)> CreateSlotAsync(
        int tutorId, CreateAvailabilitySlotDto dto, CancellationToken cancellationToken)
    {
        await EnsureProfileAsync(tutorId, cancellationToken);

        if (!TimeOnly.TryParse(dto.StartTime, out var start) || !TimeOnly.TryParse(dto.EndTime, out var end))
            return (false, 400, "Giờ bắt đầu/kết thúc không hợp lệ.", null);
        if (end <= start)
            return (false, 400, "Giờ kết thúc phải sau giờ bắt đầu.", null);

        if (dto.IsRecurring)
        {
            if (dto.DayOfWeek is not byte day || day is < 1 or > 7)
                return (false, 400, "Chọn thứ trong tuần (1–7, thứ Hai đến Chủ nhật).", null);
        }
        else if (!dto.SpecificDate.HasValue)
        {
            return (false, 400, "Chọn ngày cụ thể cho lịch một lần.", null);
        }

        var slot = new AvailabilitySlot
        {
            TutorId = tutorId,
            DayOfWeek = dto.IsRecurring ? dto.DayOfWeek : null,
            SpecificDate = dto.IsRecurring ? null : dto.SpecificDate,
            StartTime = start,
            EndTime = end,
            IsRecurring = dto.IsRecurring,
            IsBooked = false
        };
        _db.AvailabilitySlots.Add(slot);
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 201, "Đã thêm lịch trống.", MapSlot(slot));
    }

    public async Task<(bool Success, int Status, string Message)> DeleteSlotAsync(
        int tutorId, int slotId, CancellationToken cancellationToken)
    {
        var slot = await _db.AvailabilitySlots
            .Include(s => s.Bookings)
            .FirstOrDefaultAsync(s => s.SlotId == slotId && s.TutorId == tutorId, cancellationToken);
        if (slot == null)
            return (false, 404, "Không tìm thấy khung giờ.");

        var active = slot.Bookings.Any(b => b.Status is "Pending" or "Confirmed");
        if (active)
            return (false, 400, "Khung giờ đang có booking, không xóa được.");

        _db.AvailabilitySlots.Remove(slot);
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã xóa khung giờ.");
    }

    private static TutorCertificateItemDto MapCert(TutorCertificate c) => new()
    {
        CertificateId = c.CertificateId,
        CertificateName = c.CertificateName,
        IssuedBy = c.IssuedBy,
        IssuedDate = c.IssuedDate,
        FileUrl = c.FileUrl
    };

    private static AvailabilitySlotDto MapSlot(AvailabilitySlot s) => new()
    {
        SlotId = s.SlotId,
        DayOfWeek = s.DayOfWeek,
        SpecificDate = s.SpecificDate,
        StartTime = s.StartTime.ToString("HH:mm"),
        EndTime = s.EndTime.ToString("HH:mm"),
        IsRecurring = s.IsRecurring,
        IsBooked = s.IsBooked
    };
}
