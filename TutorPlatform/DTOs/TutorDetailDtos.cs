namespace TutorPlatform.DTOs;

public class TutorCertificateItemDto
{
    public int CertificateId { get; set; }
    public string CertificateName { get; set; } = null!;
    public string? IssuedBy { get; set; }
    public DateOnly? IssuedDate { get; set; }
    public string FileUrl { get; set; } = null!;
}

public class TutorSubjectItemDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public bool IsVerified { get; set; }
}

public class AvailabilitySlotDto
{
    public int SlotId { get; set; }
    public byte? DayOfWeek { get; set; }
    public DateOnly? SpecificDate { get; set; }
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public bool IsRecurring { get; set; }
    public bool IsBooked { get; set; }
}

public class TutorDetailDto
{
    public int TutorId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public int? YearsOfExperience { get; set; }
    public decimal? HourlyRateMin { get; set; }
    public decimal? HourlyRateMax { get; set; }
    public string? TeachingMode { get; set; }
    public decimal AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public string? VerificationStatus { get; set; }
    public bool IsPublished { get; set; }
    public List<string> Subjects { get; set; } = new();
    public List<TutorSubjectItemDto> SubjectDetails { get; set; } = new();
    public List<TutorCertificateItemDto> Certificates { get; set; } = new();
    public List<AvailabilitySlotDto> AvailableSlots { get; set; } = new();
}

public class CreateBookingDto
{
    public int TutorId { get; set; }
    public int SlotId { get; set; }
    public int SubjectId { get; set; }
    public DateOnly? ScheduledDate { get; set; }
    public string? TeachingMode { get; set; }
    public decimal? Price { get; set; }
}

public class UpdateTutorTeachingProfileDto
{
    public string? Bio { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public int? YearsOfExperience { get; set; }
    public decimal? HourlyRateMin { get; set; }
    public decimal? HourlyRateMax { get; set; }
    public string TeachingMode { get; set; } = "Both";
    public bool IsPublished { get; set; }
    public List<int> SubjectIds { get; set; } = new();
}

public class CreateAvailabilitySlotDto
{
    public byte? DayOfWeek { get; set; }
    public DateOnly? SpecificDate { get; set; }
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public bool IsRecurring { get; set; } = true;
}

public class TutorWorkspaceDto
{
    public int TutorId { get; set; }
    public string? Bio { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public int? YearsOfExperience { get; set; }
    public decimal? HourlyRateMin { get; set; }
    public decimal? HourlyRateMax { get; set; }
    public string TeachingMode { get; set; } = "Both";
    public bool IsPublished { get; set; }
    public string VerificationStatus { get; set; } = "Pending";
    public decimal AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public List<TutorSubjectItemDto> Subjects { get; set; } = new();
    public List<TutorCertificateItemDto> Certificates { get; set; } = new();
    public List<AvailabilitySlotDto> Slots { get; set; } = new();
}

public class MentorInviteDto
{
    public int GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public string? InviteMessage { get; set; }
    public string Status { get; set; } = null!;
    public string InvitedByName { get; set; } = null!;
    public DateTime InvitedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}

public class RespondMentorInviteDto
{
    public bool Accept { get; set; }
}
