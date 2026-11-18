namespace TutorPlatform.DTOs;

public class AdminQuestionItemDto
{
    public int QuestionId { get; set; }
    public string TestType { get; set; } = null!;
    public int? SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? GradeLevel { get; set; }
    public string Content { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
    public string? Difficulty { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminSaveQuestionDto
{
    public string TestType { get; set; } = "Professional";
    public int? SubjectId { get; set; }
    public string? GradeLevel { get; set; }
    public string Content { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectAnswer { get; set; } = "A";
    public string? Difficulty { get; set; } = "Medium";
    public bool IsActive { get; set; } = true;
}

public class AdminMetricGrowthDto
{
    public string Label { get; set; } = null!;
    public int Tutors { get; set; }
    public int Students { get; set; }
    public int Parents { get; set; }
    public int Bookings { get; set; }
}

public class AdminMetricsDto
{
    public int TotalUsers { get; set; }
    public int TotalTutors { get; set; }
    public int TotalStudents { get; set; }
    public int BannedUsers { get; set; }
    public int PendingIdentity { get; set; }
    public int LowConfidenceFaces { get; set; }
    public int PendingReports { get; set; }
    public int Bookings { get; set; }
    public int PaidPayments { get; set; }
    public int TestsPassed { get; set; }
    public List<AdminMetricGrowthDto> MonthlyGrowth { get; set; } = new();
}

public class AdminUserDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string Status { get; set; } = null!;
}

public class AdminBanUserDto
{
    public bool Ban { get; set; }
    public string? Reason { get; set; }
}

public class AdminReportDto
{
    public int ReportId { get; set; }
    public string ReporterName { get; set; } = null!;
    public string ReporterEmail { get; set; } = null!;
    public string? ReportedName { get; set; }
    public string? ReportedEmail { get; set; }
    public string? ReportedRole { get; set; }
    public string Reason { get; set; } = null!;
    public string? Description { get; set; }
    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = null!;
}

public class AdminResolveReportDto
{
    public string Action { get; set; } = null!;
    public string? Note { get; set; }
}

public class AdminIdentityDto
{
    public int DocumentId { get; set; }
    public int TutorId { get; set; }
    public string TutorName { get; set; } = null!;
    public string? TutorEmail { get; set; }
    public string Status { get; set; } = null!;
    public string? ProfileVerification { get; set; }
    public bool ImagesAvailable { get; set; }
    public bool HasFront { get; set; }
    public bool HasBack { get; set; }
    public bool HasSelfie { get; set; }
    public string? OcrName { get; set; }
    public string? OcrIdNumber { get; set; }
    public string? FaceStatus { get; set; }
    public decimal? FaceScore { get; set; }
    public bool LowConfidence { get; set; }
    public bool FaceMatch { get; set; }
    public DateTime? HoldExpiresAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    public List<AdminIdentityTestDto> Tests { get; set; } = new();
}

public class AdminIdentityTestDto
{
    public string SubjectName { get; set; } = null!;
    public string? GradeLevel { get; set; }
    public decimal ScorePercent { get; set; }
    public bool IsPassed { get; set; }
}

public class AdminReviewIdentityDto
{
    public string? Action { get; set; }
    public bool? Approve { get; set; }
    public string? Reason { get; set; }
}

public class TutorIdentityStatusDto
{
    public string? FullName { get; set; }
    public string? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string? IdNumber { get; set; }
    public string? Address { get; set; }
    public string? OriginLocation { get; set; }
    public string? Status { get; set; }
    public bool IdentityCompleted { get; set; }
    public bool OcrFilled { get; set; }
    public string? OcrMessage { get; set; }
    public decimal? FaceMatchPercent { get; set; }
    public bool ImagesHeldForAdmin { get; set; }
    public DateTime? HoldExpiresAt { get; set; }
}

public class CccdReadResult
{
    public string? FullName { get; set; }
    public string? IdNumber { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public int Confidence { get; set; }
    public bool LooksLikeCccd { get; set; }
}

public class FaceCompareResult
{
    public bool SamePerson { get; set; }
    public int Confidence { get; set; }
}

public class AdminSettingItemDto
{
    public string Key { get; set; } = null!;
    public string Value { get; set; } = null!;
    public string? Description { get; set; }
}

public class AdminSaveSettingsDto
{
    public List<AdminSettingItemDto> Settings { get; set; } = new();
}
