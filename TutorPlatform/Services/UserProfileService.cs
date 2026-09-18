using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services
{
    public class UserProfileService
    {
        private readonly TutorPlatformDbContext _db;

        public UserProfileService(TutorPlatformDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, int StatusCode, string Message, UserProfileDto? Data)> GetProfileAsync(int userId, CancellationToken ct)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .Include(u => u.StudentProfile)
                .Include(u => u.TutorProfile)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user == null)
            {
                return (false, 404, "Không tìm thấy thông tin người dùng.", null);
            }

            var joinedGroups = await _db.StudyGroupMembers
                .Where(m => m.UserId == userId && m.Status == "Approved")
                .Include(m => m.Group).ThenInclude(g => g.Subject)
                .Select(m => new UserStudyGroupSummaryDto
                {
                    GroupId = m.GroupId,
                    Title = m.Group.Title,
                    SubjectName = m.Group.Subject != null ? m.Group.Subject.SubjectName : string.Empty,
                    MeetingMode = m.Group.MeetingMode,
                    Status = m.Group.Status,
                    MaxMembers = m.Group.MaxMembers,
                    CurrentMembersCount = m.Group.StudyGroupMembers.Count(x => x.Status == "Approved"),
                    IsCreator = m.Group.CreatedByUserId == userId
                })
                .AsNoTracking()
                .ToListAsync(ct);

            var dto = new UserProfileDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                AvatarUrl = user.AvatarUrl,
                RoleName = user.Role?.RoleName ?? string.Empty,
                Address = user.Address,
                City = user.City,
                District = user.District,
                IsEmailConfirmed = user.IsEmailConfirmed,
                CreatedAt = user.CreatedAt,
                StudentProfile = user.StudentProfile == null ? null : new StudentProfileDto
                {
                    GradeLevel = user.StudentProfile.GradeLevel,
                    SchoolName = user.StudentProfile.SchoolName,
                    LearningGoals = user.StudentProfile.LearningGoals
                },
                TutorProfile = user.TutorProfile == null ? null : new TutorProfileDetailDto
                {
                    TutorId = user.TutorProfile.TutorId,
                    Bio = user.TutorProfile.Bio,
                    University = user.TutorProfile.University,
                    Major = user.TutorProfile.Major,
                    YearsOfExperience = user.TutorProfile.YearsOfExperience,
                    HourlyRateMin = user.TutorProfile.HourlyRateMin,
                    HourlyRateMax = user.TutorProfile.HourlyRateMax,
                    TeachingMode = user.TutorProfile.TeachingMode,
                    VerificationStatus = user.TutorProfile.VerificationStatus,
                    AverageRating = user.TutorProfile.AverageRating,
                    TotalReviews = user.TutorProfile.TotalReviews
                },
                JoinedGroups = joinedGroups
            };

            return (true, 200, "Thành công.", dto);
        }

        public async Task<(bool Success, int StatusCode, string Message, UserProfileDto? Data)> UpdateGeneralInfoAsync(int userId, UpdateUserProfileRequest request, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user == null)
            {
                return (false, 404, "Không tìm thấy thông tin người dùng.", null);
            }

            if (request.DateOfBirth.HasValue)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var dob = request.DateOfBirth.Value;
                var age = today.Year - dob.Year;
                if (dob > today.AddYears(-age))
                {
                    age--;
                }

                if (age < 6 || age > 100)
                {
                    return (false, 400, "Độ tuổi phải từ 6 đến 100 tuổi.", null);
                }
            }

            user.FullName = request.FullName.Trim();
            user.PhoneNumber = request.PhoneNumber;
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = request.Gender;
            user.AvatarUrl = request.AvatarUrl;
            user.Address = request.Address;
            user.City = request.City;
            user.District = request.District;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await GetProfileAsync(userId, ct);
        }

        public async Task<(bool Success, int StatusCode, string Message, object? Data)> UpdateStudentProfileAsync(int userId, UpdateStudentProfileRequest request, CancellationToken ct)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .Include(u => u.StudentProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user == null)
            {
                return (false, 404, "Không tìm thấy thông tin người dùng.", null);
            }

            if (user.Role?.RoleName != "Student" && user.StudentProfile == null)
            {
                return (false, 403, "Tài khoản không có quyền cập nhật hồ sơ học sinh.", null);
            }

            if (user.StudentProfile == null)
            {
                user.StudentProfile = new StudentProfile
                {
                    StudentId = userId,
                    GradeLevel = request.GradeLevel,
                    SchoolName = request.SchoolName,
                    LearningGoals = request.LearningGoals
                };
                _db.StudentProfiles.Add(user.StudentProfile);
            }
            else
            {
                user.StudentProfile.GradeLevel = request.GradeLevel;
                user.StudentProfile.SchoolName = request.SchoolName;
                user.StudentProfile.LearningGoals = request.LearningGoals;
            }

            await _db.SaveChangesAsync(ct);
            return (true, 200, "Cập nhật hồ sơ học sinh thành công.", null);
        }

        public async Task<(bool Success, int StatusCode, string Message, object? Data)> UpdateTutorProfileAsync(int userId, UpdateTutorProfileRequest request, CancellationToken ct)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .Include(u => u.TutorProfile)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user == null)
            {
                return (false, 404, "Không tìm thấy thông tin người dùng.", null);
            }

            if (user.Role?.RoleName != "Tutor" && user.TutorProfile == null)
            {
                return (false, 403, "Tài khoản không có quyền cập nhật hồ sơ gia sư.", null);
            }

            if (request.HourlyRateMin.HasValue && request.HourlyRateMax.HasValue && request.HourlyRateMax.Value < request.HourlyRateMin.Value)
            {
                return (false, 400, "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.", null);
            }

            if (user.TutorProfile == null)
            {
                user.TutorProfile = new TutorProfile
                {
                    TutorId = userId,
                    Bio = request.Bio,
                    University = request.University,
                    Major = request.Major,
                    YearsOfExperience = request.YearsOfExperience,
                    HourlyRateMin = request.HourlyRateMin,
                    HourlyRateMax = request.HourlyRateMax,
                    TeachingMode = request.TeachingMode ?? "Online",
                    VerificationStatus = "Pending",
                    AverageRating = 0,
                    TotalReviews = 0,
                    IsPublished = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.TutorProfiles.Add(user.TutorProfile);
            }
            else
            {
                user.TutorProfile.Bio = request.Bio;
                user.TutorProfile.University = request.University;
                user.TutorProfile.Major = request.Major;
                user.TutorProfile.YearsOfExperience = request.YearsOfExperience;
                user.TutorProfile.HourlyRateMin = request.HourlyRateMin;
                user.TutorProfile.HourlyRateMax = request.HourlyRateMax;
                if (!string.IsNullOrEmpty(request.TeachingMode))
                {
                    user.TutorProfile.TeachingMode = request.TeachingMode;
                }
                user.TutorProfile.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            return (true, 200, "Cập nhật hồ sơ gia sư thành công.", null);
        }

        public async Task<(bool Success, int StatusCode, string Message, object? Data)> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user == null)
            {
                return (false, 404, "Không tìm thấy thông tin người dùng.", null);
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return (false, 400, "Mật khẩu hiện tại không chính xác.", null);
            }

            if (request.NewPassword == request.CurrentPassword)
            {
                return (false, 400, "Mật khẩu mới không được trùng với mật khẩu hiện tại.", null);
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return (false, 400, "Xác nhận mật khẩu mới không khớp.", null);
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return (true, 200, "Đổi mật khẩu thành công.", null);
        }
    }
}
