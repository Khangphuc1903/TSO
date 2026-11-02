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
                EducationLevel = s.Subject.EducationLevel ?? "",
                GradeLevel = s.GradeLevel,
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

        var wanted = BuildWantedRegistrations(dto);
        if (wanted.Count > 0)
        {
            var wantedIds = wanted.Select(reg => reg.SubjectId).Distinct().ToList();
            var validCount = await _db.Subjects.CountAsync(s => wantedIds.Contains(s.SubjectId) && s.IsActive, cancellationToken);
            if (validCount != wantedIds.Count)
                return (false, 400, "Có môn học không hợp lệ.", null);
        }

        var existing = await _db.TutorSubjects.Where(s => s.TutorId == tutorId).ToListAsync(cancellationToken);

        // Đăng ký lại toàn bộ tổ hợp: giữ lại tổ hợp được chọn, xóa những không được chọn.
        var wantedKeys = wanted.Select(reg => (reg.SubjectId, Grade: reg.gradeLevel)).ToHashSet();
        var keptRows = existing.Where(row => wantedKeys.Contains((row.SubjectId, Grade: row.GradeLevel))).ToList();
        _db.TutorSubjects.RemoveRange(existing.Where(row => !wantedKeys.Contains((row.SubjectId, Grade: row.GradeLevel))));

        var newRows = new List<TutorSubject>();
        foreach (var reg in wanted.Where(reg =>
            keptRows.All(row => !(row.SubjectId == reg.SubjectId && NormalizeGrade(row.GradeLevel) == reg.gradeLevel))))
        {
            var row = new TutorSubject
            {
                TutorId = tutorId,
                SubjectId = reg.SubjectId,
                GradeLevel = reg.gradeLevel,
                IsVerified = false
            };
            newRows.Add(row);
            _db.TutorSubjects.Add(row);
        }

        // Bắt buộc hoàn thành bài kiểm tra chuyên môn trước khi công bố hồ sơ giảng dạy.
        if (dto.IsPublished)
        {
            var totalCombos = keptRows.Count + newRows.Count;
            if (totalCombos == 0)
                return (false, 400,
                    "Chưa thể công bố hồ sơ: hãy chọn ít nhất một tổ hợp (cấp học + môn học + lớp) rồi hoàn thành bài kiểm tra chuyên môn tương ứng.",
                    null);

            var hasPassedPedagogicalTest = await _db.TutorTestAttempts.AnyAsync(attempt =>
                attempt.TutorId == tutorId
                && attempt.TestType == TutorTestService.PedagogicalTestType
                && attempt.SubjectId == null
                && attempt.GradeLevel == null
                && attempt.IsPassed, cancellationToken);
            if (!hasPassedPedagogicalTest)
                return (false, 400,
                    "Không có quyền công bố hồ sơ: gia sư phải đạt bài kiểm tra kỹ năng sư phạm bắt buộc trước.",
                    null);

            // Case 1: tổ hợp nào chưa đạt chuyên môn thì không được công bố.
            var pending = keptRows.Where(row => !row.IsVerified)
                .Concat(newRows)
                .OrderBy(row => row.SubjectId)
                .ToList();
            if (pending.Count > 0)
            {
                var pendingSubjects = await _db.Subjects
                    .Where(s => pending.Select(p => p.SubjectId).Contains(s.SubjectId))
                    .Select(s => new { s.SubjectId, s.SubjectName })
                    .ToListAsync(cancellationToken);
                var names = pendingSubjects.ToDictionary(s => s.SubjectId, s => s.SubjectName);
                var descriptions = pending
                    .Select(p => (names.TryGetValue(p.SubjectId, out var name) ? name : ("môn " + p.SubjectId))
                        + (string.IsNullOrWhiteSpace(p.GradeLevel) ? " (chưa chọn lớp)" : (" – " + p.GradeLevel)))
                    .ToList();
                return (false, 400,
                    "Không có quyền công bố hồ sơ: hoàn thành bài kiểm tra chuyên môn bắt buộc trước cho: " + string.Join(", ", descriptions) + ".",
                    null);
            }
            profile.VerificationStatus = "Verified";
        }

        profile.IsPublished = dto.IsPublished;
        profile.UpdatedAt = DateTime.Now;

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

    private static List<(int SubjectId, string? gradeLevel)> BuildWantedRegistrations(UpdateTutorTeachingProfileDto dto)
    {
        if (dto.SubjectRegistrations != null && dto.SubjectRegistrations.Count > 0)
            return dto.SubjectRegistrations
                .Select(reg => (SubjectId: reg.SubjectId, gradeLevel: NormalizeGrade(reg.GradeLevel)))
                .Distinct()
                .ToList();
        return (dto.SubjectIds ?? new List<int>())
            .Select(id => (SubjectId: id, gradeLevel: (string?)null))
            .Distinct()
            .ToList();
    }

    private static string? NormalizeGrade(string? grade)
    {
        if (string.IsNullOrWhiteSpace(grade)) return null;
        var trimmed = grade.Trim();
        return trimmed.Length > 50 ? trimmed.Substring(0, 50) : trimmed;
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
