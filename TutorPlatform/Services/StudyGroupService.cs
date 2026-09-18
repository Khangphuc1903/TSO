using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services
{
    public class StudyGroupService
    {
        private readonly TutorPlatformDbContext _context;

        public StudyGroupService(TutorPlatformDbContext context)
        {
            _context = context;
        }

        public async Task<List<StudyGroupListItemDto>> SearchAsync(StudyGroupSearchRequest? request, CancellationToken ct)
        {
            var query = _context.StudyGroups
                .Include(g => g.Subject)
                .Include(g => g.CreatedByUser)
                .Include(g => g.StudyGroupMentor).ThenInclude(m => m.Tutor).ThenInclude(t => t.Tutor)
                .Include(g => g.StudyGroupMembers)
                .Include(g => g.StudyGroupSchedules)
                .AsNoTracking()
                .Where(g => g.Status == "Open" || g.Status == "Full");

            if (request != null)
            {
                if (!string.IsNullOrEmpty(request.Keyword))
                {
                    var keyword = request.Keyword.ToLower();
                    query = query.Where(g => g.Title.ToLower().Contains(keyword) || 
                                             (g.Description != null && g.Description.ToLower().Contains(keyword)) ||
                                             (g.Subject != null && g.Subject.SubjectName.ToLower().Contains(keyword)));
                }
                if (request.SubjectId.HasValue)
                {
                    query = query.Where(g => g.SubjectId == request.SubjectId.Value);
                }
                if (!string.IsNullOrEmpty(request.EducationLevel))
                {
                    query = query.Where(g => g.EducationLevel == request.EducationLevel);
                }
                if (!string.IsNullOrEmpty(request.StudyGoal))
                {
                    query = query.Where(g => g.StudyGoal == request.StudyGoal);
                }
                if (!string.IsNullOrEmpty(request.MeetingMode))
                {
                    query = query.Where(g => g.MeetingMode == request.MeetingMode);
                }
                if (request.HasMentor.HasValue)
                {
                    query = query.Where(g => g.HasMentor == request.HasMentor.Value);
                }
            }

            var groups = await query.OrderByDescending(g => g.CreatedAt).ToListAsync(ct);
            
            return groups.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, int StatusCode, string Message, StudyGroupListItemDto? Data)> GetByIdAsync(int groupId, CancellationToken ct)
        {
            var group = await _context.StudyGroups
                .Include(g => g.Subject)
                .Include(g => g.CreatedByUser)
                .Include(g => g.StudyGroupMentor).ThenInclude(m => m.Tutor).ThenInclude(t => t.Tutor)
                .Include(g => g.StudyGroupMembers)
                .Include(g => g.StudyGroupSchedules)
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.GroupId == groupId, ct);

            if (group == null)
            {
                return (false, 404, "Không tìm thấy nhóm học tập.", null);
            }

            return (true, 200, "Thành công.", MapToDto(group));
        }

        public async Task<List<Subject>> GetSubjectsAsync(CancellationToken ct)
        {
            return await _context.Subjects
                .Where(s => s.IsActive == true)
                .OrderBy(s => s.SubjectName)
                .AsNoTracking()
                .ToListAsync(ct);
        }

        public async Task<(bool Success, int StatusCode, string Message, StudyGroupListItemDto? Data)> CreateAsync(int userId, CreateStudyGroupRequest dto, CancellationToken ct)
        {
            if (dto.MaxMembers < 2 || dto.MaxMembers > 12)
            {
                return (false, 400, "Số lượng thành viên tối đa phải từ 2 đến 12.", null);
            }

            TimeOnly? startTime = null;
            TimeOnly? endTime = null;

            if (!string.IsNullOrEmpty(dto.StartTime) && !string.IsNullOrEmpty(dto.EndTime))
            {
                if (!TimeOnly.TryParse(dto.StartTime, out var parsedStart) || !TimeOnly.TryParse(dto.EndTime, out var parsedEnd))
                {
                    return (false, 400, "Định dạng thời gian không hợp lệ.", null);
                }
                if (parsedEnd <= parsedStart)
                {
                    return (false, 400, "Thời gian kết thúc phải sau thời gian bắt đầu.", null);
                }
                startTime = parsedStart;
                endTime = parsedEnd;
            }

            var newGroup = new StudyGroup
            {
                CreatedByUserId = userId,
                SubjectId = dto.SubjectId,
                Title = dto.Title,
                Description = dto.Description,
                EducationLevel = dto.EducationLevel,
                StudyGoal = dto.StudyGoal,
                MaxMembers = dto.MaxMembers,
                MeetingMode = dto.MeetingMode,
                Location = dto.Location,
                City = dto.City,
                District = dto.District,
                Status = "Open",
                HasMentor = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.StudyGroups.Add(newGroup);
            
            // Add creator as member
            _context.StudyGroupMembers.Add(new StudyGroupMember
            {
                Group = newGroup,
                UserId = userId,
                Status = "Approved",
                JoinedAt = DateTime.UtcNow
            });

            // Add schedule if provided
            if (dto.ScheduleDayOfWeek.HasValue && startTime.HasValue && endTime.HasValue)
            {
                _context.StudyGroupSchedules.Add(new StudyGroupSchedule
                {
                    Group = newGroup,
                    DayOfWeek = (byte)dto.ScheduleDayOfWeek.Value,
                    StartTime = startTime.Value,
                    EndTime = endTime.Value
                });
            }

            await _context.SaveChangesAsync(ct);

            // Fetch the created group with all navigation properties for DTO mapping
            var createdGroup = await _context.StudyGroups
                .Include(g => g.Subject)
                .Include(g => g.CreatedByUser)
                .Include(g => g.StudyGroupMentor).ThenInclude(m => m.Tutor).ThenInclude(t => t.Tutor)
                .Include(g => g.StudyGroupMembers)
                .Include(g => g.StudyGroupSchedules)
                .FirstOrDefaultAsync(g => g.GroupId == newGroup.GroupId, ct);

            return (true, 201, "Tạo nhóm học tập thành công.", MapToDto(createdGroup!));
        }

        public async Task<(bool Success, int StatusCode, string Message, object? Data)> JoinAsync(int groupId, int userId, CancellationToken ct)
        {
            var group = await _context.StudyGroups
                .Include(g => g.StudyGroupMembers)
                .FirstOrDefaultAsync(g => g.GroupId == groupId, ct);

            if (group == null)
            {
                return (false, 404, "Không tìm thấy nhóm học tập.", null);
            }

            if (group.Status != "Open")
            {
                return (false, 400, "Nhóm học tập không còn mở để tham gia.", null);
            }

            var currentMembers = group.StudyGroupMembers.Count(m => m.Status == "Approved");
            if (currentMembers >= group.MaxMembers)
            {
                return (false, 400, "Nhóm học tập đã đủ thành viên.", null);
            }

            if (group.StudyGroupMembers.Any(m => m.UserId == userId))
            {
                return (false, 400, "Bạn đã tham gia hoặc đã gửi yêu cầu tham gia nhóm này.", null);
            }

            var newMember = new StudyGroupMember
            {
                GroupId = groupId,
                UserId = userId,
                Status = "Approved", // Simplified flow
                JoinedAt = DateTime.UtcNow
            };

            _context.StudyGroupMembers.Add(newMember);

            if (currentMembers + 1 >= group.MaxMembers)
            {
                group.Status = "Full";
            }

            await _context.SaveChangesAsync(ct);
            return (true, 200, "Tham gia nhóm học tập thành công.", null);
        }

        public async Task<(bool Success, int StatusCode, string Message, object? Data)> LeaveAsync(int groupId, int userId, CancellationToken ct)
        {
            var group = await _context.StudyGroups
                .Include(g => g.StudyGroupMembers)
                .FirstOrDefaultAsync(g => g.GroupId == groupId, ct);

            if (group == null)
            {
                return (false, 404, "Không tìm thấy nhóm học tập.", null);
            }

            if (group.CreatedByUserId == userId)
            {
                return (false, 400, "Trưởng nhóm không thể rời nhóm.", null);
            }

            var member = group.StudyGroupMembers.FirstOrDefault(m => m.UserId == userId);
            if (member == null)
            {
                return (false, 400, "Bạn chưa tham gia nhóm này.", null);
            }

            _context.StudyGroupMembers.Remove(member);

            if (group.Status == "Full")
            {
                group.Status = "Open";
            }

            await _context.SaveChangesAsync(ct);
            return (true, 200, "Rời nhóm học tập thành công.", null);
        }

        private StudyGroupListItemDto MapToDto(StudyGroup group)
        {
            return new StudyGroupListItemDto
            {
                GroupId = group.GroupId,
                SubjectId = group.SubjectId,
                SubjectName = group.Subject?.SubjectName ?? string.Empty,
                Title = group.Title ?? string.Empty,
                Description = group.Description,
                EducationLevel = group.EducationLevel,
                StudyGoal = group.StudyGoal ?? string.Empty,
                MaxMembers = group.MaxMembers,
                CurrentMembersCount = group.StudyGroupMembers?.Count(m => m.Status == "Approved") ?? 0,
                MeetingMode = group.MeetingMode,
                Location = group.Location,
                City = group.City,
                District = group.District,
                Status = group.Status ?? string.Empty,
                HasMentor = group.HasMentor,
                CreatorName = group.CreatedByUser?.FullName ?? string.Empty,
                Mentor = group.StudyGroupMentor?.Tutor != null ? new StudyGroupMentorDto
                {
                    TutorId = group.StudyGroupMentor.Tutor.TutorId,
                    TutorName = group.StudyGroupMentor.Tutor.Tutor?.FullName ?? string.Empty,
                    University = group.StudyGroupMentor.Tutor.University,
                    AverageRating = group.StudyGroupMentor.Tutor.AverageRating
                } : null,
                Schedules = group.StudyGroupSchedules?.Select(s => new StudyGroupScheduleDto
                {
                    DayOfWeek = s.DayOfWeek ?? 0,
                    StartTime = s.StartTime.ToString("HH:mm"),
                    EndTime = s.EndTime.ToString("HH:mm")
                }).ToList() ?? new List<StudyGroupScheduleDto>()
            };
        }
    }
}
