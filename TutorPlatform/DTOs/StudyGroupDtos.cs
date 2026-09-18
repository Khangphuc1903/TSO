using System.ComponentModel.DataAnnotations;

namespace TutorPlatform.DTOs
{
    public class StudyGroupSearchRequest
    {
        public string? Keyword { get; set; }
        public int? SubjectId { get; set; }
        public string? EducationLevel { get; set; }
        public string? StudyGoal { get; set; }
        public string? MeetingMode { get; set; }
        public bool? HasMentor { get; set; }
    }

    public class CreateStudyGroupRequest
    {
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public int SubjectId { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public string? EducationLevel { get; set; }

        [Required]
        public string StudyGoal { get; set; } = string.Empty;

        [Range(2, 12)]
        public int MaxMembers { get; set; } = 6;

        [Required]
        public string MeetingMode { get; set; } = string.Empty;

        public string? Location { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }

        public int? ScheduleDayOfWeek { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
    }

    public class StudyGroupListItemDto
    {
        public int GroupId { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? EducationLevel { get; set; }
        public string? StudyGoal { get; set; }
        public int MaxMembers { get; set; }
        public int CurrentMembersCount { get; set; }
        public string? MeetingMode { get; set; }
        public string? Location { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool HasMentor { get; set; }
        public string CreatorName { get; set; } = string.Empty;

        public StudyGroupMentorDto? Mentor { get; set; }
        public List<StudyGroupScheduleDto> Schedules { get; set; } = new();
    }

    public class StudyGroupMentorDto
    {
        public int TutorId { get; set; }
        public string TutorName { get; set; } = string.Empty;
        public string? University { get; set; }
        public decimal AverageRating { get; set; }
    }

    public class StudyGroupScheduleDto
    {
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }
}
