using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Helpers;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class StudyGroupService
{
    private readonly TutorPlatformDbContext _db;
    private readonly NotificationService _notifications;

    public StudyGroupService(TutorPlatformDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<List<StudyGroupListItemDto>> SearchAsync(StudyGroupSearchRequest request, CancellationToken cancellationToken)
    {
        var query = _db.StudyGroups
            .AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.CreatedByUser)
            .Include(g => g.StudyGroupMembers)
            .Include(g => g.StudyGroupMentor)
                .ThenInclude(m => m!.Tutor)
                    .ThenInclude(t => t.Tutor)
            .Where(g => g.Status == "Open" || g.Status == "Active");

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var kw = request.Keyword.Trim();
            query = query.Where(g => g.Title.Contains(kw) || (g.Description != null && g.Description.Contains(kw)));
        }
        if (request.SubjectId.HasValue)
            query = query.Where(g => g.SubjectId == request.SubjectId.Value);
        if (!string.IsNullOrWhiteSpace(request.City))
            query = query.Where(g => g.City != null && g.City.Contains(request.City.Trim()));
        if (!string.IsNullOrWhiteSpace(request.District))
            query = query.Where(g => g.District != null && g.District.Contains(request.District.Trim()));
        if (request.HasMentor.HasValue)
            query = query.Where(g => g.HasMentor == request.HasMentor.Value);

        var groups = await query.OrderByDescending(g => g.CreatedAt).ToListAsync(cancellationToken);
        return groups.Select(MapList).ToList();
    }

    public async Task<StudyGroupDetailDto?> GetAsync(int groupId, int? currentUserId, CancellationToken cancellationToken)
    {
        var g = await _db.StudyGroups
            .AsNoTracking()
            .Include(x => x.Subject)
            .Include(x => x.CreatedByUser)
            .Include(x => x.StudyGroupMembers).ThenInclude(m => m.User)
            .Include(x => x.StudyGroupMentor)
                .ThenInclude(m => m!.Tutor)
                    .ThenInclude(t => t.Tutor)
            .FirstOrDefaultAsync(x => x.GroupId == groupId, cancellationToken);
        if (g == null) return null;

        var dto = (StudyGroupDetailDto)MapList(g);
        dto.CreatedByUserId = g.CreatedByUserId;
        dto.StudyGoal = g.StudyGoal;
        dto.Location = g.Location;
        dto.IsOwner = currentUserId.HasValue && g.CreatedByUserId == currentUserId;
        var myRow = currentUserId.HasValue
            ? g.StudyGroupMembers.FirstOrDefault(m => m.UserId == currentUserId)
            : null;
        dto.IsMember = dto.IsOwner ||
            myRow?.Status == "Accepted" ||
            (g.StudyGroupMentor?.Status == "Accepted" && g.StudyGroupMentor.TutorId == currentUserId);
        dto.MyJoinStatus = dto.IsOwner
            ? "Accepted"
            : myRow?.Status
              ?? (g.StudyGroupMentor?.Status == "Accepted" && g.StudyGroupMentor.TutorId == currentUserId ? "Accepted" : "None");
        dto.Members = g.StudyGroupMembers
            .Where(m => m.Status == "Accepted")
            .Select(m => new StudyGroupMemberDto
            {
                UserId = m.UserId,
                FullName = m.User.FullName,
                AvatarUrl = m.User.AvatarUrl,
                Status = m.Status
            }).ToList();
        if (dto.IsOwner)
        {
            dto.JoinRequests = g.StudyGroupMembers
                .Where(m => m.Status == "Pending")
                .Select(m => new StudyGroupJoinRequestDto
                {
                    UserId = m.UserId,
                    FullName = m.User.FullName,
                    AvatarUrl = m.User.AvatarUrl,
                    JoinMessage = m.JoinMessage,
                    RequestedAt = m.JoinedAt
                })
                .OrderByDescending(m => m.RequestedAt)
                .ToList();
        }
        return dto;
    }

    public async Task<(bool Success, int Status, string Message, StudyGroupDetailDto? Data)> CreateAsync(
        int userId, CreateStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return (false, 400, "Nhập tiêu đề nhóm.", null);

        var subjectOk = await _db.Subjects.AnyAsync(s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
        if (!subjectOk)
            return (false, 400, "Môn học không hợp lệ.", null);

        if (dto.HasMentor && dto.TutorId.HasValue)
        {
            var tutorOk = await _db.TutorProfiles.AnyAsync(t => t.TutorId == dto.TutorId && t.IsPublished, cancellationToken);
            if (!tutorOk)
                return (false, 400, "Gia sư không hợp lệ.", null);
        }

        if (!VietnamLocations.IsValidRegion(dto.City, dto.District))
            return (false, 400, "Hãy chọn tỉnh/thành và quận/huyện hợp lệ.", null);

        var group = new StudyGroup
        {
            CreatedByUserId = userId,
            SubjectId = dto.SubjectId,
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            EducationLevel = dto.EducationLevel,
            StudyGoal = string.IsNullOrWhiteSpace(dto.StudyGoal) ? "PeerStudy" : dto.StudyGoal.Trim(),
            MaxMembers = dto.MaxMembers <= 0 ? 6 : dto.MaxMembers,
            MeetingMode = string.IsNullOrWhiteSpace(dto.MeetingMode) ? "Online" : dto.MeetingMode,
            Location = dto.Location,
            City = dto.City?.Trim(),
            District = dto.District?.Trim(),
            Status = "Open",
            HasMentor = dto.HasMentor,
            CreatedAt = DateTime.Now
        };
        _db.StudyGroups.Add(group);
        await _db.SaveChangesAsync(cancellationToken);

        _db.StudyGroupMembers.Add(new StudyGroupMember
        {
            GroupId = group.GroupId,
            UserId = userId,
            Status = "Accepted",
            JoinedAt = DateTime.Now
        });

        if (dto.HasMentor && dto.TutorId.HasValue)
        {
            _db.StudyGroupMentors.Add(new StudyGroupMentor
            {
                GroupId = group.GroupId,
                TutorId = dto.TutorId.Value,
                InvitedByUserId = userId,
                Status = "Pending",
                InviteMessage = dto.InviteMessage,
                InvitedAt = DateTime.Now
            });
            await _db.SaveChangesAsync(cancellationToken);
            await _notifications.NotifyAsync(
                dto.TutorId.Value,
                "MentorInvite",
                "Lời mời mentor nhóm học",
                $"Bạn được mời mentor nhóm \"{group.Title}\".",
                "StudyGroup",
                group.GroupId,
                cancellationToken);
        }
        else
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        var detail = await GetAsync(group.GroupId, userId, cancellationToken);
        return (true, 201, "Tạo nhóm thành công.", detail);
    }

    public async Task<(bool Success, int Status, string Message)> JoinAsync(
        int userId, int groupId, JoinStudyGroupDto dto, CancellationToken cancellationToken)
    {
        var message = (dto.Message ?? "").Trim();
        if (message.Length < 10)
            return (false, 400, "Viết lời xin vào nhóm (ít nhất 10 ký tự).");
        if (message.Length > 500)
            return (false, 400, "Lời xin tối đa 500 ký tự.");

        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMembers)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null)
            return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId == userId)
            return (false, 400, "Bạn đã là chủ nhóm.");
        if (group.Status != "Open")
            return (false, 400, "Nhóm không còn nhận thành viên.");

        var accepted = group.StudyGroupMembers.Count(m => m.Status == "Accepted");
        if (accepted >= group.MaxMembers)
            return (false, 400, "Nhóm đã đủ thành viên.");

        var existing = group.StudyGroupMembers.FirstOrDefault(m => m.UserId == userId);
        if (existing != null)
        {
            if (existing.Status == "Accepted")
                return (false, 409, "Bạn đã trong nhóm.");
            if (existing.Status == "Pending")
                return (false, 409, "Bạn đã gửi lời xin, đang chờ chủ nhóm xác nhận.");
            existing.Status = "Pending";
            existing.JoinMessage = message;
            existing.JoinedAt = DateTime.Now;
        }
        else
        {
            _db.StudyGroupMembers.Add(new StudyGroupMember
            {
                GroupId = groupId,
                UserId = userId,
                Status = "Pending",
                JoinMessage = message,
                JoinedAt = DateTime.Now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        var applicant = await _db.Users.AsNoTracking().FirstAsync(u => u.UserId == userId, cancellationToken);
        await _notifications.NotifyAsync(
            group.CreatedByUserId,
            "GroupJoinRequest",
            "Có người xin vào nhóm",
            $"{applicant.FullName}: {message}",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, "Đã gửi lời xin. Chờ chủ nhóm xác nhận.");
    }

    public async Task<(bool Success, int Status, string Message)> RespondToJoinRequestAsync(
        int ownerId, int groupId, int applicantUserId, bool accept, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMembers)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null)
            return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId != ownerId)
            return (false, 403, "Chỉ chủ nhóm mới duyệt thành viên.");

        var row = group.StudyGroupMembers.FirstOrDefault(m => m.UserId == applicantUserId);
        if (row == null || row.Status != "Pending")
            return (false, 404, "Không tìm thấy lời xin đang chờ.");

        if (accept)
        {
            var accepted = group.StudyGroupMembers.Count(m => m.Status == "Accepted");
            if (accepted >= group.MaxMembers)
                return (false, 400, "Nhóm đã đủ thành viên.");
            row.Status = "Accepted";
            row.JoinedAt = DateTime.Now;
        }
        else
        {
            row.Status = "Rejected";
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            applicantUserId,
            accept ? "GroupJoinAccepted" : "GroupJoinRejected",
            accept ? "Chủ nhóm đã chấp nhận" : "Chủ nhóm đã từ chối",
            accept
                ? $"Bạn đã được vào nhóm \"{group.Title}\"."
                : $"Lời xin vào nhóm \"{group.Title}\" chưa được duyệt.",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, accept ? "Đã chấp nhận thành viên." : "Đã từ chối lời xin.");
    }

    public async Task<(bool Success, int Status, string Message)> InviteTutorAsync(int userId, int groupId, InviteTutorDto dto, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMentor)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null)
            return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId != userId)
            return (false, 403, "Chỉ chủ nhóm mới mời gia sư.");

        var tutorOk = await _db.TutorProfiles.AnyAsync(t => t.TutorId == dto.TutorId && t.IsPublished, cancellationToken);
        if (!tutorOk)
            return (false, 400, "Gia sư không hợp lệ.");

        group.HasMentor = true;
        if (group.StudyGroupMentor == null)
        {
            _db.StudyGroupMentors.Add(new StudyGroupMentor
            {
                GroupId = groupId,
                TutorId = dto.TutorId,
                InvitedByUserId = userId,
                Status = "Pending",
                InviteMessage = dto.InviteMessage,
                InvitedAt = DateTime.Now
            });
        }
        else if (group.StudyGroupMentor.Status != "Accepted")
        {
            group.StudyGroupMentor.TutorId = dto.TutorId;
            group.StudyGroupMentor.Status = "Pending";
            group.StudyGroupMentor.InviteMessage = dto.InviteMessage;
            group.StudyGroupMentor.InvitedAt = DateTime.Now;
            group.StudyGroupMentor.RespondedAt = null;
        }
        else
        {
            return (false, 409, "Nhóm đã có mentor.");
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            dto.TutorId,
            "MentorInvite",
            "Lời mời mentor nhóm học",
            $"Bạn được mời mentor nhóm \"{group.Title}\".",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, "Đã gửi lời mời gia sư.");
    }

    public async Task<List<MentorInviteDto>> ListInvitesForTutorAsync(int tutorId, CancellationToken cancellationToken)
    {
        var rows = await _db.StudyGroupMentors
            .AsNoTracking()
            .Include(m => m.Group).ThenInclude(g => g.Subject)
            .Include(m => m.InvitedByUser)
            .Where(m => m.TutorId == tutorId)
            .OrderByDescending(m => m.InvitedAt)
            .ToListAsync(cancellationToken);

        return rows.Select(m => new MentorInviteDto
        {
            GroupId = m.GroupId,
            Title = m.Group.Title,
            SubjectName = m.Group.Subject.SubjectName,
            InviteMessage = m.InviteMessage,
            Status = m.Status,
            InvitedByName = m.InvitedByUser.FullName,
            InvitedAt = m.InvitedAt,
            RespondedAt = m.RespondedAt
        }).ToList();
    }

    public async Task<(bool Success, int Status, string Message)> RespondToInviteAsync(
        int tutorId, int groupId, bool accept, CancellationToken cancellationToken)
    {
        var row = await _db.StudyGroupMentors
            .Include(m => m.Group)
            .FirstOrDefaultAsync(m => m.TutorId == tutorId && m.GroupId == groupId, cancellationToken);
        if (row == null)
            return (false, 404, "Không tìm thấy lời mời.");
        if (row.Status != "Pending")
            return (false, 400, "Lời mời đã được xử lý.");

        row.Status = accept ? "Accepted" : "Rejected";
        row.RespondedAt = DateTime.Now;
        row.Group.HasMentor = accept;

        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            row.InvitedByUserId,
            accept ? "MentorAccepted" : "MentorRejected",
            accept ? "Gia sư đã nhận lời mentor" : "Gia sư đã từ chối lời mời",
            accept
                ? $"Gia sư đã tham gia nhóm \"{row.Group.Title}\"."
                : $"Gia sư từ chối mentor nhóm \"{row.Group.Title}\".",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, accept ? "Bạn đã nhận lời mentor nhóm." : "Đã từ chối lời mời.");
    }

    private static StudyGroupListItemDto MapList(StudyGroup g)
    {
        var mentor = g.StudyGroupMentor;
        return new StudyGroupDetailDto
        {
            GroupId = g.GroupId,
            Title = g.Title,
            Description = g.Description,
            SubjectId = g.SubjectId,
            SubjectName = g.Subject.SubjectName,
            City = g.City,
            District = g.District,
            MeetingMode = g.MeetingMode,
            HasMentor = g.HasMentor,
            MentorName = mentor?.Tutor?.Tutor?.FullName,
            MentorStatus = mentor?.Status ?? "None",
            MemberCount = g.StudyGroupMembers.Count(m => m.Status == "Accepted"),
            MaxMembers = g.MaxMembers,
            Status = g.Status,
            CreatorName = g.CreatedByUser.FullName,
            CreatedAt = g.CreatedAt
        };
    }
}
