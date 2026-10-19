using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly TutorPlatformDbContext _db;

    public AdminController(TutorPlatformDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("nameid")
                ?? User.FindFirstValue("sub");
            return int.TryParse(raw, out var id) ? id : 0;
        }
    }

    // =========================================================================
    // 1. NGÂN HÀNG CÂU HỎI (QUESTION MANAGEMENT & QUALITY ASSURANCE)
    // =========================================================================

    [HttpGet("questions")]
    public async Task<IActionResult> ListQuestions([FromQuery] string? testType, CancellationToken cancellationToken)
    {
        var query = _db.Questions
            .Include(q => q.Subject)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(testType))
        {
            if (string.Equals(testType, "Safety", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(testType, "Pedagogical", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(q => q.TestType == "Pedagogical" || q.TestType == "Safety");
            }
            else
            {
                query = query.Where(q => q.TestType == testType);
            }
        }

        var questions = await query
            .OrderByDescending(q => q.QuestionId)
            .Select(q => new AdminQuestionItemDto
            {
                QuestionId = q.QuestionId,
                TestType = q.TestType,
                SubjectId = q.SubjectId,
                SubjectName = q.Subject != null ? q.Subject.SubjectName : null,
                GradeLevel = q.GradeLevel,
                Content = q.Content,
                OptionA = q.OptionA,
                OptionB = q.OptionB,
                OptionC = q.OptionC,
                OptionD = q.OptionD,
                CorrectAnswer = q.CorrectAnswer,
                Difficulty = q.Difficulty,
                IsActive = q.IsActive,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(questions);
    }

    [HttpPost("questions")]
    public async Task<IActionResult> CreateQuestion([FromBody] AdminSaveQuestionDto dto, CancellationToken cancellationToken)
    {
        var validation = ValidateQuestion(dto);
        if (!validation.IsValid)
            return BadRequest(new { message = validation.ErrorMessage });

        // Normalize testType ("Safety" -> "Pedagogical")
        var normalizedTestType = string.Equals(dto.TestType, "Safety", StringComparison.OrdinalIgnoreCase)
            ? "Pedagogical"
            : dto.TestType.Trim();

        dto.TestType = normalizedTestType;

        // Duplicate Check
        if (await IsDuplicateQuestionAsync(dto, null, cancellationToken))
            return Conflict(new { message = "Câu hỏi với nội dung tương tự đã tồn tại trong ngân hàng câu hỏi." });

        // If professional, check Subject exists
        if (dto.TestType == "Professional")
        {
            var subjectExists = await _db.Subjects.AnyAsync(s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
            if (!subjectExists)
                return NotFound(new { message = "Môn học không tồn tại hoặc đã bị vô hiệu hóa." });
        }

        var question = new Question
        {
            TestType = dto.TestType,
            SubjectId = dto.TestType == "Professional" ? dto.SubjectId : null,
            GradeLevel = dto.TestType == "Professional" ? dto.GradeLevel?.Trim() : null,
            Content = dto.Content.Trim(),
            OptionA = dto.OptionA.Trim(),
            OptionB = dto.OptionB.Trim(),
            OptionC = dto.OptionC.Trim(),
            OptionD = dto.OptionD.Trim(),
            CorrectAnswer = dto.CorrectAnswer.Trim().ToUpperInvariant(),
            Difficulty = string.IsNullOrWhiteSpace(dto.Difficulty) ? "Medium" : dto.Difficulty.Trim(),
            IsActive = dto.IsActive,
            CreatedBy = CurrentUserId > 0 ? CurrentUserId : null,
            CreatedAt = DateTime.UtcNow
        };

        _db.Questions.Add(question);

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "CreateQuestion",
                TargetEntityType = "Question",
                Description = $"Tạo câu hỏi mới: {question.Content.Substring(0, Math.Min(50, question.Content.Length))}...",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = "Đã tạo câu hỏi thành công.",
            questionId = question.QuestionId
        });
    }

    [HttpPut("questions/{id:int}")]
    public async Task<IActionResult> UpdateQuestion(int id, [FromBody] AdminSaveQuestionDto dto, CancellationToken cancellationToken)
    {
        var question = await _db.Questions.FirstOrDefaultAsync(q => q.QuestionId == id, cancellationToken);
        if (question == null)
            return NotFound(new { message = "Không tìm thấy câu hỏi cần cập nhật." });

        var validation = ValidateQuestion(dto);
        if (!validation.IsValid)
            return BadRequest(new { message = validation.ErrorMessage });

        var normalizedTestType = string.Equals(dto.TestType, "Safety", StringComparison.OrdinalIgnoreCase)
            ? "Pedagogical"
            : dto.TestType.Trim();

        dto.TestType = normalizedTestType;

        // Duplicate Check (excluding current question)
        if (await IsDuplicateQuestionAsync(dto, id, cancellationToken))
            return Conflict(new { message = "Câu hỏi với nội dung tương tự đã tồn tại trong ngân hàng câu hỏi." });

        if (dto.TestType == "Professional")
        {
            var subjectExists = await _db.Subjects.AnyAsync(s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
            if (!subjectExists)
                return NotFound(new { message = "Môn học không tồn tại hoặc đã bị vô hiệu hóa." });
        }

        question.TestType = dto.TestType;
        question.SubjectId = dto.TestType == "Professional" ? dto.SubjectId : null;
        question.GradeLevel = dto.TestType == "Professional" ? dto.GradeLevel?.Trim() : null;
        question.Content = dto.Content.Trim();
        question.OptionA = dto.OptionA.Trim();
        question.OptionB = dto.OptionB.Trim();
        question.OptionC = dto.OptionC.Trim();
        question.OptionD = dto.OptionD.Trim();
        question.CorrectAnswer = dto.CorrectAnswer.Trim().ToUpperInvariant();
        question.Difficulty = string.IsNullOrWhiteSpace(dto.Difficulty) ? "Medium" : dto.Difficulty.Trim();
        question.IsActive = dto.IsActive;

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "UpdateQuestion",
                TargetEntityType = "Question",
                TargetEntityId = id,
                Description = $"Cập nhật câu hỏi #{id}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Đã cập nhật câu hỏi thành công." });
    }

    [HttpPost("questions/{id:int}/toggle")]
    public async Task<IActionResult> ToggleQuestion(int id, CancellationToken cancellationToken)
    {
        var question = await _db.Questions.FirstOrDefaultAsync(q => q.QuestionId == id, cancellationToken);
        if (question == null)
            return NotFound(new { message = "Không tìm thấy câu hỏi." });

        question.IsActive = !question.IsActive;

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "ToggleQuestion",
                TargetEntityType = "Question",
                TargetEntityId = id,
                Description = $"Chuyển trạng thái câu hỏi #{id} thành {(question.IsActive ? "Hiện" : "Ẩn")}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = question.IsActive ? "Đã hiện câu hỏi trong ngân hàng đề." : "Đã ẩn câu hỏi.",
            isActive = question.IsActive
        });
    }

    // =========================================================================
    // 2. METRICS & OVERVIEW
    // =========================================================================

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics(CancellationToken cancellationToken)
    {
        var totalUsers = await _db.Users.CountAsync(cancellationToken);
        var totalTutors = await _db.Users.CountAsync(u => u.Role.RoleName == "Tutor", cancellationToken);
        var totalStudents = await _db.Users.CountAsync(u => u.Role.RoleName == "Student", cancellationToken);
        var bannedUsers = await _db.Users.CountAsync(u => u.Status == "Banned", cancellationToken);
        var pendingIdentity = await _db.IdentityDocuments.CountAsync(d => d.Status == "Pending", cancellationToken);
        var lowConfidenceFaces = await _db.FaceVerificationLogs.CountAsync(f => f.MatchConfidenceScore < 70, cancellationToken);
        var pendingReports = await _db.Reports.CountAsync(r => r.Status == "Pending", cancellationToken);
        var bookings = await _db.Bookings.CountAsync(cancellationToken);
        var paidPayments = await _db.Payments.CountAsync(p => p.Status == "Paid" || p.Status == "Completed", cancellationToken);
        var testsPassed = await _db.TutorTestAttempts.CountAsync(a => a.IsPassed, cancellationToken);

        // Monthly growth: past 12 months
        var now = DateTime.UtcNow;
        var monthlyGrowth = new List<AdminMetricGrowthDto>();
        for (var i = 11; i >= 0; i--)
        {
            var monthDate = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
            var nextMonth = monthDate.AddMonths(1);

            var tutorCount = await _db.Users.CountAsync(
                u => u.Role.RoleName == "Tutor" && u.CreatedAt >= monthDate && u.CreatedAt < nextMonth, cancellationToken);
            var studentCount = await _db.Users.CountAsync(
                u => u.Role.RoleName == "Student" && u.CreatedAt >= monthDate && u.CreatedAt < nextMonth, cancellationToken);
            var parentCount = await _db.Users.CountAsync(
                u => u.Role.RoleName == "Parent" && u.CreatedAt >= monthDate && u.CreatedAt < nextMonth, cancellationToken);
            var bookingCount = await _db.Bookings.CountAsync(
                b => b.CreatedAt >= monthDate && b.CreatedAt < nextMonth, cancellationToken);

            monthlyGrowth.Add(new AdminMetricGrowthDto
            {
                Label = monthDate.ToString("MM/yyyy"),
                Tutors = tutorCount,
                Students = studentCount,
                Parents = parentCount,
                Bookings = bookingCount
            });
        }

        return Ok(new AdminMetricsDto
        {
            TotalUsers = totalUsers,
            TotalTutors = totalTutors,
            TotalStudents = totalStudents,
            BannedUsers = bannedUsers,
            PendingIdentity = pendingIdentity,
            LowConfidenceFaces = lowConfidenceFaces,
            PendingReports = pendingReports,
            Bookings = bookings,
            PaidPayments = paidPayments,
            TestsPassed = testsPassed,
            MonthlyGrowth = monthlyGrowth
        });
    }

    // =========================================================================
    // 3. CCCD / IDENTITY VERIFICATION
    // =========================================================================

    [HttpGet("identity")]
    public async Task<IActionResult> ListIdentity([FromQuery] string? filter, CancellationToken cancellationToken)
    {
        var query = _db.IdentityDocuments
            .Include(d => d.Tutor).ThenInclude(t => t.Tutor)
            .AsNoTracking();

        if (string.Equals(filter, "pending", StringComparison.OrdinalIgnoreCase))
            query = query.Where(d => d.Status == "Pending");

        var documents = await query
            .OrderByDescending(d => d.SubmittedAt)
            .ToListAsync(cancellationToken);

        var tutorIds = documents.Select(d => d.TutorId).Distinct().ToList();

        // Load passed tests for these tutors to display qualification context
        var attempts = await _db.TutorTestAttempts
            .Include(a => a.Subject)
            .AsNoTracking()
            .Where(a => tutorIds.Contains(a.TutorId))
            .OrderByDescending(a => a.SubmittedAt)
            .ToListAsync(cancellationToken);

        var result = documents.Select(d =>
        {
            var tutorTests = attempts
                .Where(a => a.TutorId == d.TutorId)
                .GroupBy(a => new { a.SubjectId, a.GradeLevel, a.TestType })
                .Select(g => g.First())
                .Select(a => new AdminIdentityTestDto
                {
                    SubjectName = a.Subject != null ? a.Subject.SubjectName : (a.TestType == "Pedagogical" ? "Sư phạm & An toàn" : "Chung"),
                    GradeLevel = a.GradeLevel,
                    ScorePercent = a.ScorePercent,
                    IsPassed = a.IsPassed
                })
                .ToList();

            return new AdminIdentityDto
            {
                DocumentId = d.DocumentId,
                TutorId = d.TutorId,
                TutorName = d.Tutor?.Tutor?.FullName ?? $"Gia sư #{d.TutorId}",
                Status = d.Status,
                FrontUrl = d.IdCardFrontUrl,
                BackUrl = d.IdCardBackUrl,
                SelfieUrl = null,
                SubmittedAt = d.SubmittedAt,
                Tests = tutorTests
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("identity/{documentId:int}/review")]
    public async Task<IActionResult> ReviewIdentity(int documentId, [FromBody] AdminReviewIdentityDto dto, CancellationToken cancellationToken)
    {
        var doc = await _db.IdentityDocuments
            .Include(d => d.Tutor)
            .FirstOrDefaultAsync(d => d.DocumentId == documentId, cancellationToken);

        if (doc == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ CCCD." });

        var isApprove = string.Equals(dto.Action, "Approve", StringComparison.OrdinalIgnoreCase);
        doc.Status = isApprove ? "Approved" : "Rejected";
        doc.RejectionReason = isApprove ? null : dto.Reason;
        doc.ReviewedBy = CurrentUserId > 0 ? CurrentUserId : null;
        doc.ReviewedAt = DateTime.UtcNow;

        if (isApprove && doc.Tutor != null)
        {
            doc.Tutor.VerificationStatus = "Verified";
        }

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = isApprove ? "ApproveIdentity" : "RejectIdentity",
                TargetEntityType = "IdentityDocument",
                TargetEntityId = documentId,
                Description = $"Duyệt CCCD #{documentId}: {doc.Status}. Lý do: {dto.Reason}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = isApprove ? "Đã duyệt CCCD thành công." : "Đã từ chối CCCD." });
    }

    // =========================================================================
    // 4. USERS & BAN
    // =========================================================================

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _db.Users.Include(u => u.Role).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(100)
            .Select(u => new AdminUserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role.RoleName,
                Status = u.Status
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost("users/{userId:int}/ban")]
    public async Task<IActionResult> BanUser(int userId, [FromBody] AdminBanUserDto dto, CancellationToken cancellationToken)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId, cancellationToken);
        if (user == null)
            return NotFound(new { message = "Không tìm thấy người dùng." });

        if (user.Role?.RoleName == "Admin")
            return BadRequest(new { message = "Không thể khóa tài khoản quản trị viên." });

        user.Status = dto.Ban ? "Banned" : "Active";
        user.UpdatedAt = DateTime.UtcNow;

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = dto.Ban ? "BanUser" : "UnbanUser",
                TargetEntityType = "User",
                TargetEntityId = userId,
                Description = $"{(dto.Ban ? "Khóa" : "Mở khóa")} tài khoản #{userId}. Lý do: {dto.Reason}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = dto.Ban ? "Đã khóa tài khoản thành công." : "Đã mở khóa tài khoản." });
    }

    // =========================================================================
    // 5. REPORTS
    // =========================================================================

    [HttpGet("reports")]
    public async Task<IActionResult> ListReports([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var query = _db.Reports.Include(r => r.Reporter).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new AdminReportDto
            {
                ReportId = r.ReportId,
                ReporterName = r.Reporter.FullName,
                ReporterEmail = r.Reporter.Email,
                Reason = r.Reason,
                Description = r.Description,
                EntityType = r.ReportedEntityType,
                EntityId = r.ReportedEntityId,
                CreatedAt = r.CreatedAt,
                Status = r.Status
            })
            .ToListAsync(cancellationToken);

        return Ok(reports);
    }

    [HttpPost("reports/{id:int}/resolve")]
    public async Task<IActionResult> ResolveReport(int id, [FromBody] AdminResolveReportDto dto, CancellationToken cancellationToken)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.ReportId == id, cancellationToken);
        if (report == null)
            return NotFound(new { message = "Không tìm thấy báo cáo." });

        report.Status = "Resolved";
        report.ActionTaken = dto.Action + (string.IsNullOrWhiteSpace(dto.Note) ? "" : $": {dto.Note}");
        report.ReviewedBy = CurrentUserId > 0 ? CurrentUserId : null;
        report.ReviewedAt = DateTime.UtcNow;

        // If action is Ban and entity is User, ban the user
        if (string.Equals(dto.Action, "Ban", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(report.ReportedEntityType, "User", StringComparison.OrdinalIgnoreCase))
        {
            var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == report.ReportedEntityId, cancellationToken);
            if (targetUser != null && targetUser.RoleId != 1) // not Admin
            {
                targetUser.Status = "Banned";
                targetUser.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "ResolveReport",
                TargetEntityType = "Report",
                TargetEntityId = id,
                Description = $"Xử lý báo cáo #{id}: {dto.Action}. Ghi chú: {dto.Note}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Đã xử lý báo cáo thành công." });
    }

    // =========================================================================
    // 6. PLATFORM SETTINGS
    // =========================================================================

    [HttpGet("settings")]
    public async Task<IActionResult> ListSettings(CancellationToken cancellationToken)
    {
        var settings = await _db.PlatformSettings
            .AsNoTracking()
            .OrderBy(s => s.SettingKey)
            .Select(s => new AdminSettingItemDto
            {
                Key = s.SettingKey,
                Value = s.SettingValue,
                Description = s.Description
            })
            .ToListAsync(cancellationToken);

        return Ok(settings);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] AdminSaveSettingsDto dto, CancellationToken cancellationToken)
    {
        if (dto.Settings == null || dto.Settings.Count == 0)
            return BadRequest(new { message = "Không có cấu hình nào được gửi." });

        var now = DateTime.UtcNow;
        foreach (var item in dto.Settings)
        {
            if (string.IsNullOrWhiteSpace(item.Key)) continue;

            var existing = await _db.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == item.Key, cancellationToken);
            if (existing != null)
            {
                existing.SettingValue = item.Value ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(item.Description))
                    existing.Description = item.Description;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.PlatformSettings.Add(new PlatformSetting
                {
                    SettingKey = item.Key,
                    SettingValue = item.Value ?? string.Empty,
                    Description = item.Description,
                    UpdatedAt = now
                });
            }
        }

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "SaveSettings",
                TargetEntityType = "PlatformSettings",
                Description = "Cập nhật các tham số cấu hình hệ thống.",
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Đã lưu cấu hình hệ thống thành công." });
    }

    // =========================================================================
    // PRIVATE VALIDATION HELPERS
    // =========================================================================

    private static (bool IsValid, string ErrorMessage) ValidateQuestion(AdminSaveQuestionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Trim().Length < 10)
            return (false, "Nội dung câu hỏi phải có ít nhất 10 ký tự.");

        if (string.IsNullOrWhiteSpace(dto.OptionA) || string.IsNullOrWhiteSpace(dto.OptionB)
            || string.IsNullOrWhiteSpace(dto.OptionC) || string.IsNullOrWhiteSpace(dto.OptionD))
            return (false, "Tất cả 4 phương án trả lời (A, B, C, D) đều bắt buộc.");

        var options = new[] { dto.OptionA.Trim(), dto.OptionB.Trim(), dto.OptionC.Trim(), dto.OptionD.Trim() };
        if (options.Distinct(StringComparer.OrdinalIgnoreCase).Count() < 4)
            return (false, "Các phương án trả lời A, B, C, D không được trùng lặp nội dung.");

        var correct = dto.CorrectAnswer?.Trim().ToUpperInvariant();
        if (correct is not ("A" or "B" or "C" or "D"))
            return (false, "Đáp án đúng phải là A, B, C hoặc D.");

        var testType = dto.TestType?.Trim();
        if (!string.Equals(testType, "Professional", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(testType, "Pedagogical", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(testType, "Safety", StringComparison.OrdinalIgnoreCase))
            return (false, "Loại bài kiểm tra không hợp lệ (chỉ chấp nhận Professional hoặc Safety/Pedagogical).");

        if (string.Equals(testType, "Professional", StringComparison.OrdinalIgnoreCase))
        {
            if (dto.SubjectId == null || dto.SubjectId <= 0)
                return (false, "Bài kiểm tra chuyên môn bắt buộc phải chọn môn học.");

            if (string.IsNullOrWhiteSpace(dto.GradeLevel))
                return (false, "Bài kiểm tra chuyên môn bắt buộc phải chọn lớp/khối.");
        }

        return (true, string.Empty);
    }

    private async Task<bool> IsDuplicateQuestionAsync(AdminSaveQuestionDto dto, int? excludeQuestionId, CancellationToken cancellationToken)
    {
        var trimmedContent = dto.Content.Trim().ToLowerInvariant();
        var isProfessional = string.Equals(dto.TestType, "Professional", StringComparison.OrdinalIgnoreCase);

        var query = _db.Questions.AsNoTracking().Where(q => q.IsActive);
        if (excludeQuestionId.HasValue)
            query = query.Where(q => q.QuestionId != excludeQuestionId.Value);

        if (isProfessional)
        {
            query = query.Where(q => q.TestType == "Professional"
                && q.SubjectId == dto.SubjectId
                && q.GradeLevel == dto.GradeLevel);
        }
        else
        {
            query = query.Where(q => q.TestType == "Pedagogical" || q.TestType == "Safety");
        }

        var existingQuestions = await query.Select(q => q.Content).ToListAsync(cancellationToken);
        return existingQuestions.Any(c => string.Equals(c.Trim(), trimmedContent, StringComparison.OrdinalIgnoreCase));
    }
}
