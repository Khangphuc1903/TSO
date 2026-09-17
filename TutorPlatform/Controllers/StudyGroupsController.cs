using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudyGroupsController : ControllerBase
    {
        private readonly TutorPlatformDbContext _db;

        public StudyGroupsController(TutorPlatformDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] int? subjectId,
            [FromQuery] string? educationLevel,
            [FromQuery] string? studyGoal,
            [FromQuery] string? meetingMode,
            [FromQuery] bool? hasMentor)
        {
            var query = _db.StudyGroups
                .Include(g => g.Subject)
                .Include(g => g.CreatedByUser)
                .Include(g => g.StudyGroupMembers)
                .Include(g => g.StudyGroupSchedules)
                .Include(g => g.StudyGroupMentor)
                    .ThenInclude(m => m != null ? m.Tutor : null)
                        .ThenInclude(t => t != null ? t.Tutor : null)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(g => g.Title.ToLower().Contains(s) 
                    || (g.Description != null && g.Description.ToLower().Contains(s))
                    || g.Subject.SubjectName.ToLower().Contains(s));
            }

            if (subjectId.HasValue && subjectId.Value > 0)
            {
                query = query.Where(g => g.SubjectId == subjectId.Value);
            }

            if (!string.IsNullOrWhiteSpace(educationLevel))
            {
                query = query.Where(g => g.EducationLevel == educationLevel);
            }

            if (!string.IsNullOrWhiteSpace(studyGoal))
            {
                query = query.Where(g => g.StudyGoal == studyGoal);
            }

            if (!string.IsNullOrWhiteSpace(meetingMode))
            {
                query = query.Where(g => g.MeetingMode == meetingMode);
            }

            if (hasMentor.HasValue)
            {
                query = query.Where(g => g.HasMentor == hasMentor.Value);
            }

            var groups = await query
                .OrderByDescending(g => g.CreatedAt)
                .Select(g => new StudyGroupResponseDto
                {
                    GroupId = g.GroupId,
                    SubjectId = g.SubjectId,
                    SubjectName = g.Subject.SubjectName,
                    Title = g.Title,
                    Description = g.Description,
                    EducationLevel = g.EducationLevel,
                    StudyGoal = g.StudyGoal,
                    MaxMembers = g.MaxMembers,
                    CurrentMembersCount = g.StudyGroupMembers.Count(m => m.Status == "Approved"),
                    MeetingMode = g.MeetingMode,
                    Location = g.Location,
                    City = g.City,
                    District = g.District,
                    Status = g.Status,
                    HasMentor = g.HasMentor,
                    CreatedAt = g.CreatedAt,
                    CreatorName = g.CreatedByUser.FullName,
                    Mentor = g.StudyGroupMentor != null && g.StudyGroupMentor.Status == "Accepted"
                        ? new MentorSummaryDto
                        {
                            TutorId = g.StudyGroupMentor.TutorId,
                            TutorName = g.StudyGroupMentor.Tutor.Tutor.FullName,
                            University = g.StudyGroupMentor.Tutor.University,
                            AverageRating = g.StudyGroupMentor.Tutor.AverageRating
                        }
                        : null,
                    Schedules = g.StudyGroupSchedules.Select(s => new ScheduleSummaryDto
                    {
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString(@"hh\:mm"),
                        EndTime = s.EndTime.ToString(@"hh\:mm")
                    }).ToList()
                })
                .ToListAsync();

            return Ok(groups);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var g = await _db.StudyGroups
                .Include(x => x.Subject)
                .Include(x => x.CreatedByUser)
                .Include(x => x.StudyGroupMembers).ThenInclude(m => m.User)
                .Include(x => x.StudyGroupSchedules)
                .Include(x => x.StudyGroupMentor)
                    .ThenInclude(m => m != null ? m.Tutor : null)
                        .ThenInclude(t => t != null ? t.Tutor : null)
                .FirstOrDefaultAsync(x => x.GroupId == id);

            if (g == null) return NotFound(new { message = "Study group not found." });

            var result = new
            {
                GroupId = g.GroupId,
                SubjectId = g.SubjectId,
                SubjectName = g.Subject.SubjectName,
                Title = g.Title,
                Description = g.Description,
                EducationLevel = g.EducationLevel,
                StudyGoal = g.StudyGoal,
                MaxMembers = g.MaxMembers,
                CurrentMembersCount = g.StudyGroupMembers.Count(m => m.Status == "Approved"),
                MeetingMode = g.MeetingMode,
                Location = g.Location,
                City = g.City,
                District = g.District,
                Status = g.Status,
                HasMentor = g.HasMentor,
                CreatedAt = g.CreatedAt,
                CreatorName = g.CreatedByUser.FullName,
                Mentor = g.StudyGroupMentor != null && g.StudyGroupMentor.Status == "Accepted"
                    ? new
                    {
                        TutorId = g.StudyGroupMentor.TutorId,
                        TutorName = g.StudyGroupMentor.Tutor.Tutor.FullName,
                        University = g.StudyGroupMentor.Tutor.University,
                        AverageRating = g.StudyGroupMentor.Tutor.AverageRating
                    }
                    : null,
                Members = g.StudyGroupMembers.Select(m => new
                {
                    m.MemberId,
                    m.UserId,
                    FullName = m.User.FullName,
                    m.Status,
                    m.JoinedAt
                }),
                Schedules = g.StudyGroupSchedules.Select(s => new
                {
                    s.DayOfWeek,
                    StartTime = s.StartTime.ToString(@"hh\:mm"),
                    EndTime = s.EndTime.ToString(@"hh\:mm")
                })
            };

            return Ok(result);
        }

        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjects()
        {
            var subjects = await _db.Subjects
                .Where(s => s.IsActive)
                .Select(s => new { s.SubjectId, s.SubjectName, s.EducationLevel })
                .ToListAsync();
            return Ok(subjects);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateStudyGroupDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 5)
                return BadRequest(new { message = "Title must be at least 5 characters." });

            if (dto.Title.Trim().Length > 200)
                return BadRequest(new { message = "Title cannot exceed 200 characters." });

            if (dto.MaxMembers < 2 || dto.MaxMembers > 12)
                return BadRequest(new { message = "MaxMembers must be between 2 and 12." });

            var subject = await _db.Subjects.FindAsync(dto.SubjectId);
            if (subject == null)
                return BadRequest(new { message = "Invalid subject ID." });

            int creatorId = dto.CreatedByUserId ?? 3; // default student user
            var user = await _db.Users.FindAsync(creatorId);
            if (user == null)
                return BadRequest(new { message = "Invalid user." });

            var group = new StudyGroup
            {
                CreatedByUserId = creatorId,
                SubjectId = dto.SubjectId,
                Title = dto.Title,
                Description = dto.Description,
                EducationLevel = dto.EducationLevel ?? subject.EducationLevel,
                StudyGoal = dto.StudyGoal,
                MaxMembers = dto.MaxMembers > 0 ? dto.MaxMembers : 6,
                MeetingMode = dto.MeetingMode,
                Location = dto.Location,
                City = dto.City,
                District = dto.District,
                Status = "Open",
                HasMentor = false,
                CreatedAt = DateTime.Now
            };

            _db.StudyGroups.Add(group);
            await _db.SaveChangesAsync();

            // Auto add creator as first member
            _db.StudyGroupMembers.Add(new StudyGroupMember
            {
                GroupId = group.GroupId,
                UserId = creatorId,
                Status = "Approved",
                JoinedAt = DateTime.Now
            });
            await _db.SaveChangesAsync();

            return Ok(new { message = "Study group created successfully.", groupId = group.GroupId });
        }
    }
}
