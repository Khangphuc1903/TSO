namespace TutorPlatform.DTOs
{
    public class CreateStudyGroupDto
    {
        public int SubjectId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? EducationLevel { get; set; }
        public string StudyGoal { get; set; } = "ExamPrep";
        public int MaxMembers { get; set; } = 6;
        public string MeetingMode { get; set; } = "Online";
        public string? Location { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public int? CreatedByUserId { get; set; }
    }

    public class StudyGroupResponseDto
    {
        public int GroupId { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? EducationLevel { get; set; }
        public string StudyGoal { get; set; } = null!;
        public int MaxMembers { get; set; }
        public int CurrentMembersCount { get; set; }
        public string MeetingMode { get; set; } = null!;
        public string? Location { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string Status { get; set; } = null!;
        public bool HasMentor { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatorName { get; set; } = null!;
        public MentorSummaryDto? Mentor { get; set; }
        public List<ScheduleSummaryDto> Schedules { get; set; } = new();
    }

    public class MentorSummaryDto
    {
        public int TutorId { get; set; }
        public string TutorName { get; set; } = null!;
        public string? University { get; set; }
        public decimal AverageRating { get; set; }
    }

    public class ScheduleSummaryDto
    {
        public byte? DayOfWeek { get; set; }
        public string StartTime { get; set; } = null!;
        public string EndTime { get; set; } = null!;
    }
}
