using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly TutorPlatformDbContext _db;
    private readonly IdentityVerificationService _identity;
    private readonly NotificationService _notifications;

    public AdminController(TutorPlatformDbContext db, IdentityVerificationService identity, NotificationService notifications)
    {
        _db = db;
        _identity = identity;
        _notifications = notifications;
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

    [HttpGet("payouts")]
    public async Task<IActionResult> Payouts(CancellationToken cancellationToken)
    {
        var payments = await LoadSettledPaymentsAsync(cancellationToken);
        var banks = await LoadBanksAsync(payments, cancellationToken);

        var rows = payments.Take(100).Select(p =>
        {
            var split = SplitPayment(p);
            var tutorBank = PickBank(banks, p.Booking.TutorId);
            var studentBank = PickBank(banks, p.Booking.StudentId);
            return new
            {
                p.PaymentId,
                p.BookingId,
                subjectName = p.Booking.Subject?.SubjectName,
                studentName = p.Booking.Student?.FullName,
                tutorName = p.Booking.Tutor?.Tutor?.FullName,
                amount = p.Amount,
                refunded = split.Refunded,
                net = split.Net,
                tutorPercent = 80,
                platformPercent = 20,
                tutorShare = split.TutorShare,
                platformFee = split.PlatformFee,
                status = p.Status,
                paidAt = p.PaidAt,
                tutorBankCode = tutorBank?.BankCode,
                tutorBankName = tutorBank?.BankName,
                tutorAccountNumber = tutorBank?.AccountNumber,
                tutorAccountName = tutorBank?.AccountHolderName,
                tutorQrCodeUrl = tutorBank?.QrCodeUrl,
                bookingStatus = p.Booking.Status,
                tutorPaidAt = p.TutorPaidAt,
                refunds = p.Refunds.Select(r => new
                {
                    r.RefundId,
                    r.Amount,
                    r.RefundPercent,
                    r.Reason,
                    r.Status,
                    studentBankName = studentBank?.BankName,
                    studentAccountNumber = studentBank?.AccountNumber,
                    studentAccountName = studentBank?.AccountHolderName
                })
            };
        });

        return Ok(rows);
    }

    [HttpPost("payouts/{paymentId:int}/confirm")]
    public async Task<IActionResult> ConfirmPayout(int paymentId, CancellationToken cancellationToken)
    {
        var payment = await _db.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId, cancellationToken);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy khoản thanh toán." });
        if (payment.Status != "Success")
            return BadRequest(new { message = "Chỉ xác nhận chuyển tiền khi học viên đã thanh toán thành công." });
        if (payment.TutorPaidAt != null)
            return Ok(new { message = "Khoản này đã được xác nhận chuyển trước đó." });

        payment.TutorPaidAt = DateTime.UtcNow;
        var booking = payment.Booking;
        if (booking.Status is not ("Cancelled" or "Rejected"))
        {
            booking.Status = "Completed";
            booking.CompletedAt ??= DateTime.UtcNow;
        }

        if (CurrentUserId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = CurrentUserId,
                ActionType = "ConfirmTutorPayout",
                TargetEntityType = "Payment",
                TargetEntityId = payment.PaymentId,
                Description = $"Đã chuyển tiền gia sư cho buổi #{booking.BookingId}.",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            booking.TutorId,
            "TutorPayout",
            "Đã nhận học phí",
            $"Quản trị đã chuyển học phí buổi học #{booking.BookingId}. Đơn được ghi hoàn thành.",
            "Booking",
            booking.BookingId,
            cancellationToken);

        return Ok(new { message = $"Đã xác nhận chuyển tiền. Buổi học #{booking.BookingId} được ghi hoàn thành." });
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue(CancellationToken cancellationToken)
    {
        var payments = await LoadSettledPaymentsAsync(cancellationToken);
        var banks = await LoadBanksAsync(payments, cancellationToken);
        var splits = payments.Select(p => (Payment: p, Split: SplitPayment(p))).ToList();

        var byTutor = splits
            .GroupBy(x => x.Payment.Booking.TutorId)
            .Select(g =>
            {
                var first = g.First().Payment;
                var bank = PickBank(banks, g.Key);
                return new
                {
                    tutorId = g.Key,
                    tutorName = first.Booking.Tutor?.Tutor?.FullName ?? $"Gia sư #{g.Key}",
                    bookings = g.Count(),
                    gross = g.Sum(x => x.Payment.Amount),
                    refunded = g.Sum(x => x.Split.Refunded),
                    net = g.Sum(x => x.Split.Net),
                    tutorShare = g.Sum(x => x.Split.TutorShare),
                    platformFee = g.Sum(x => x.Split.PlatformFee),
                    bankCode = bank?.BankCode,
                    bankName = bank?.BankName,
                    accountNumber = bank?.AccountNumber,
                    accountName = bank?.AccountHolderName,
                    qrCodeUrl = bank?.QrCodeUrl
                };
            })
            .OrderByDescending(x => x.tutorShare)
            .ToList();

        var byMonth = splits
            .GroupBy(x =>
            {
                var at = (x.Payment.PaidAt ?? x.Payment.CreatedAt).AddHours(7);
                return new DateTime(at.Year, at.Month, 1);
            })
            .OrderByDescending(g => g.Key)
            .Select(g => new
            {
                label = g.Key.ToString("MM/yyyy"),
                bookings = g.Count(),
                gross = g.Sum(x => x.Payment.Amount),
                refunded = g.Sum(x => x.Split.Refunded),
                net = g.Sum(x => x.Split.Net),
                tutorShare = g.Sum(x => x.Split.TutorShare),
                platformFee = g.Sum(x => x.Split.PlatformFee)
            })
            .ToList();

        return Ok(new
        {
            bookingCount = payments.Count,
            gross = payments.Sum(p => p.Amount),
            refunded = splits.Sum(x => x.Split.Refunded),
            net = splits.Sum(x => x.Split.Net),
            tutorShare = splits.Sum(x => x.Split.TutorShare),
            platformFee = splits.Sum(x => x.Split.PlatformFee),
            tutorPercent = 80,
            platformPercent = 20,
            tutors = byTutor,
            months = byMonth
        });
    }

    private async Task<List<Payment>> LoadSettledPaymentsAsync(CancellationToken cancellationToken)
    {
        return await _db.Payments
            .AsNoTracking()
            .Include(p => p.Booking).ThenInclude(b => b.Student)
            .Include(p => p.Booking).ThenInclude(b => b.Tutor).ThenInclude(t => t.Tutor)
            .Include(p => p.Booking).ThenInclude(b => b.Subject)
            .Include(p => p.Refunds)
            .Where(p => p.Status == "Success" || p.Status == "Refunded" || p.Status == "PartiallyRefunded")
            .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<UserBankAccount>> LoadBanksAsync(List<Payment> payments, CancellationToken cancellationToken)
    {
        var userIds = payments
            .SelectMany(p => new[] { p.Booking.StudentId, p.Booking.TutorId })
            .Distinct()
            .ToList();
        return await _db.UserBankAccounts
            .AsNoTracking()
            .Where(b => userIds.Contains(b.UserId))
            .ToListAsync(cancellationToken);
    }

    private static UserBankAccount? PickBank(IEnumerable<UserBankAccount> banks, int userId) =>
        banks.Where(b => b.UserId == userId).OrderByDescending(b => b.IsDefault).ThenByDescending(b => b.Id).FirstOrDefault();

    private static (decimal Refunded, decimal Net, decimal TutorShare, decimal PlatformFee) SplitPayment(Payment payment)
    {
        const decimal tutorRate = 0.80m;
        var refunded = payment.Refunds.Sum(r => r.Amount);
        if (refunded < 0) refunded = 0;
        if (refunded > payment.Amount) refunded = payment.Amount;
        var net = payment.Amount - refunded;
        var tutorShare = Math.Round(net * tutorRate, 0, MidpointRounding.AwayFromZero);
        return (refunded, net, tutorShare, net - tutorShare);
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
        var paidPayments = await _db.Payments.CountAsync(p => p.Status == "Success" || p.Status == "Paid" || p.Status == "Completed", cancellationToken);
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
        var result = await _identity.ListForAdminAsync(filter, cancellationToken);
        return Ok(result);
    }

    [HttpGet("identity/{documentId:int}/image")]
    public async Task<IActionResult> IdentityImage(int documentId, [FromQuery] string side, CancellationToken cancellationToken)
    {
        var file = await _identity.OpenAdminImageAsync(documentId, side, cancellationToken);
        if (file == null) return NotFound(new { message = "Ảnh CCCD không còn." });
        return File(file.Value.Stream, file.Value.ContentType);
    }

    [HttpPost("identity/{documentId:int}/review")]
    public async Task<IActionResult> ReviewIdentity(int documentId, [FromBody] AdminReviewIdentityDto dto, CancellationToken cancellationToken)
    {
        var approve = dto.Approve == true || string.Equals(dto.Action, "Approve", StringComparison.OrdinalIgnoreCase);
        var result = await _identity.ReviewAsync(documentId, CurrentUserId, approve, dto.Reason, cancellationToken);
        return result.Success ? Ok(new { message = result.Message }) : NotFound(new { message = result.Message });
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

        var personIds = reports
            .Where(r => IsPersonReport(r.EntityType))
            .Select(r => r.EntityId)
            .Distinct()
            .ToList();
        if (personIds.Count > 0)
        {
            var people = await _db.Users
                .AsNoTracking()
                .Where(u => personIds.Contains(u.UserId))
                .Select(u => new { u.UserId, u.FullName, u.Email, Role = u.Role.RoleName })
                .ToListAsync(cancellationToken);
            var byId = people.ToDictionary(p => p.UserId);
            foreach (var report in reports)
            {
                if (!IsPersonReport(report.EntityType) || !byId.TryGetValue(report.EntityId, out var person))
                    continue;
                report.ReportedName = person.FullName;
                report.ReportedEmail = person.Email;
                report.ReportedRole = person.Role;
            }
        }

        return Ok(reports);
    }

    [HttpPost("reports/{id:int}/resolve")]
    public async Task<IActionResult> ResolveReport(int id, [FromBody] AdminResolveReportDto dto, CancellationToken cancellationToken)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.ReportId == id, cancellationToken);
        if (report == null)
            return NotFound(new { message = "Không tìm thấy báo cáo." });

        var action = (dto.Action ?? "").Trim();
        var isWarn = action.Equals("Warn", StringComparison.OrdinalIgnoreCase);
        var isBan = action.Equals("Ban", StringComparison.OrdinalIgnoreCase);
        User? target = null;
        if (IsPersonReport(report.ReportedEntityType))
        {
            target = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == report.ReportedEntityId, cancellationToken);
        }

        if ((isWarn || isBan) && target == null)
            return BadRequest(new { message = "Không tìm thấy người bị báo cáo." });
        if (isBan && target!.Role?.RoleName == "Admin")
            return BadRequest(new { message = "Không thể khóa tài khoản quản trị viên." });

        report.Status = "Resolved";
        report.ActionTaken = action + (string.IsNullOrWhiteSpace(dto.Note) ? "" : $": {dto.Note}");
        report.ReviewedBy = CurrentUserId > 0 ? CurrentUserId : null;
        report.ReviewedAt = DateTime.UtcNow;

        if (isBan && target != null)
        {
            target.Status = "Banned";
            target.UpdatedAt = DateTime.UtcNow;
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

        if (target != null && (isWarn || isBan))
        {
            var detail = string.IsNullOrWhiteSpace(report.Description)
                ? ReasonLabel(report.Reason)
                : report.Description.Trim();
            var name = string.IsNullOrWhiteSpace(target.FullName) ? "người bị báo cáo" : target.FullName.Trim();

            if (isWarn)
            {
                await _notifications.NotifyAsync(
                    target.UserId,
                    "ReportWarning",
                    "Bạn bị cảnh cáo",
                    Clip($"Quản trị viên cảnh cáo bạn vì: {detail}"),
                    "Report",
                    report.ReportId,
                    cancellationToken);
                if (report.ReporterId != target.UserId)
                {
                    await _notifications.NotifyAsync(
                        report.ReporterId,
                        "ReportWarned",
                        "Đã cảnh cáo người bị báo cáo",
                        Clip($"Quản trị viên đã gửi cảnh cáo tới {name}."),
                        "Report",
                        report.ReportId,
                        cancellationToken);
                }
            }
            else
            {
                await _notifications.NotifyAsync(
                    target.UserId,
                    "ReportBan",
                    "Tài khoản đã bị khóa",
                    Clip($"Tài khoản của bạn bị khóa vì: {detail}"),
                    "Report",
                    report.ReportId,
                    cancellationToken);
                if (report.ReporterId != target.UserId)
                {
                    await _notifications.NotifyAsync(
                        report.ReporterId,
                        "ReportBanned",
                        "Đã khóa tài khoản bị báo cáo",
                        Clip($"Quản trị viên đã khóa tài khoản {name} theo báo cáo của bạn."),
                        "Report",
                        report.ReportId,
                        cancellationToken);
                }
            }
        }

        return Ok(new { message = isWarn ? "Đã gửi cảnh cáo và thông báo cho hai bên." : isBan ? "Đã khóa tài khoản và báo cho người gửi báo cáo." : "Đã xử lý báo cáo thành công." });
    }

    private static bool IsPersonReport(string? entityType) =>
        string.Equals(entityType, "User", StringComparison.OrdinalIgnoreCase)
        || string.Equals(entityType, "Tutor", StringComparison.OrdinalIgnoreCase);

    private static string ReasonLabel(string? reason) => reason switch
    {
        "Harassment" => "quấy rối",
        "Fraud" => "gian lận",
        "Safety" => "an toàn",
        "Other" => "khác",
        _ => string.IsNullOrWhiteSpace(reason) ? "vi phạm" : reason.Trim()
    };

    private static string Clip(string value, int max = 500) =>
        value.Length <= max ? value : value[..max];

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
