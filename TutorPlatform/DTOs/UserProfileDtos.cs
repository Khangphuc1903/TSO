using System.ComponentModel.DataAnnotations;

namespace TutorPlatform.DTOs
{
    public class UserProfileDto
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? AvatarUrl { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public bool IsEmailConfirmed { get; set; }
        public DateTime CreatedAt { get; set; }
        public StudentProfileDto? StudentProfile { get; set; }
        public TutorProfileDetailDto? TutorProfile { get; set; }
        public List<UserStudyGroupSummaryDto> JoinedGroups { get; set; } = new();
    }

    public class StudentProfileDto
    {
        public string? GradeLevel { get; set; }
        public string? SchoolName { get; set; }
        public string? LearningGoals { get; set; }
    }

    public class TutorProfileDetailDto
    {
        public int TutorId { get; set; }
        public string? Bio { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public int? YearsOfExperience { get; set; }
        public decimal? HourlyRateMin { get; set; }
        public decimal? HourlyRateMax { get; set; }
        public string? TeachingMode { get; set; }
        public string? VerificationStatus { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
    }

    public class UserStudyGroupSummaryDto
    {
        public int GroupId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string MeetingMode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int MaxMembers { get; set; }
        public int CurrentMembersCount { get; set; }
        public bool IsCreator { get; set; }
    }

    public class UpdateUserProfileRequest
    {
        [Required(ErrorMessage = "Họ và tên không được để trống")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ và tên phải từ 2 đến 100 ký tự")]
        public string FullName { get; set; } = string.Empty;

        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số bắt đầu bằng số 0")]
        public string? PhoneNumber { get; set; }

        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
    }

    public class UpdateStudentProfileRequest
    {
        public string? GradeLevel { get; set; }
        public string? SchoolName { get; set; }
        public string? LearningGoals { get; set; }
    }

    public class UpdateTutorProfileRequest
    {
        public string? Bio { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }

        [Range(0, 50, ErrorMessage = "Số năm kinh nghiệm phải từ 0 đến 50")]
        public int? YearsOfExperience { get; set; }

        [Range(0, 100000000, ErrorMessage = "Học phí tối thiểu không hợp lệ")]
        public decimal? HourlyRateMin { get; set; }

        [Range(0, 100000000, ErrorMessage = "Học phí tối đa không hợp lệ")]
        public decimal? HourlyRateMax { get; set; }

        public string? TeachingMode { get; set; }
    }

    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        [MinLength(6, ErrorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Xác nhận mật khẩu mới không được để trống")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
