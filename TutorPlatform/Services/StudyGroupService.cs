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

    public async Task<List<StudyGroupDetailDto>> ListMyDeskAsync(int userId, CancellationToken cancellationToken)
    {
        var ids = await _db.StudyGroups
            .AsNoTracking()
            .Where(g => (g.Status == "Open" || g.Status == "Active") &&
                (g.CreatedByUserId == userId ||
                 g.StudyGroupMembers.Any(m => m.UserId == userId && m.Status == "Accepted")))
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => g.GroupId)
            .ToListAsync(cancellationToken);

        var list = new List<StudyGroupDetailDto>();
        foreach (var id in ids)
        {
            var dto = await GetAsync(id, userId, cancellationToken);
            if (dto != null) list.Add(dto);
        }
        return list;
    }

    public async Task<List<StudyGroupListItemDto>> SearchAsync(StudyGroupSearchRequest request, CancellationToken cancellationToken)
    {
        var query = GroupQuery();

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
        var level = CanonicalStudyLevel(request.EducationLevel);
        if (level != null)
            groups = groups.Where(g => CanonicalStudyLevel(g.EducationLevel) == level).ToList();

        return groups.Select(g =>
        {
            var item = MapList(g);
            if (string.Equals(item.HiringMode, "ReverseBid", StringComparison.OrdinalIgnoreCase))
            {
                item.BudgetPerSession = null;
                item.TutorRequirements = null;
                item.BidCount = 0;
            }
            return item;
        }).ToList();
    }

    private IQueryable<StudyGroup> GroupQuery()
    {
        return _db.StudyGroups
            .AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.CreatedByUser)
            .Include(g => g.StudyGroupMembers)
            .Include(g => g.StudyGroupBids)
            .Include(g => g.StudyGroupMentor)
                .ThenInclude(m => m!.Tutor)
                    .ThenInclude(t => t.Tutor)
            .Where(g => g.Status == "Open" || g.Status == "Active");
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
            .Include(x => x.StudyGroupBids)
                .ThenInclude(b => b.Tutor)
                    .ThenInclude(t => t.Tutor)
            .Include(x => x.StudyGroupBids)
                .ThenInclude(b => b.Votes)
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

        var isReverse = string.Equals(g.HiringMode, "ReverseBid", StringComparison.OrdinalIgnoreCase);
        var isTutor = currentUserId.HasValue && await IsTutorAsync(currentUserId.Value, cancellationToken);
        var chosen = g.StudyGroupMentor?.Status == "Accepted";
        var biddingOpen = isReverse && !chosen && (g.BidDeadline == null || g.BidDeadline >= DateTime.Now);
        if (isReverse && !chosen && !dto.IsMember && !isTutor)
        {
            dto.Restricted = true;
            dto.Description = null;
            dto.TutorRequirements = null;
            dto.BudgetPerSession = null;
            dto.Location = null;
            dto.Members = new();
            dto.BidCount = g.StudyGroupBids.Count(b => b.Status == "Pending" || b.Status == "Won");
            return dto;
        }

        var visibleBids = g.StudyGroupBids
            .Where(b => b.Status != "Withdrawn" && (!chosen || b.Status == "Won"))
            .OrderByDescending(b => b.Status == "Won")
            .ThenByDescending(b => b.Votes.Count)
            .ThenBy(b => b.ProposedPrice)
            .ToList();
        dto.BidCount = visibleBids.Count;
        if (dto.IsMember)
        {
            dto.Bids = visibleBids.Select(b => MapBid(b, currentUserId)).ToList();
            dto.CanVote = biddingOpen;
            dto.CanSelect = dto.IsOwner && biddingOpen && visibleBids.Any(b => b.Status == "Pending");
        }
        else if (isTutor && currentUserId.HasValue)
        {
            var mine = g.StudyGroupBids.FirstOrDefault(b => b.TutorId == currentUserId.Value);
            if (mine != null && mine.Status != "Withdrawn")
                dto.MyBid = MapBid(mine, currentUserId);
            dto.CanBid = biddingOpen && g.CreatedByUserId != currentUserId.Value;
        }
        return dto;
    }

    public async Task<(bool Success, int Status, string Message, StudyGroupDetailDto? Data)> CreateAsync(
        int userId, CreateStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return (false, 400, "Nhập tiêu đề nhóm.", null);

        var level = CanonicalStudyLevel(dto.EducationLevel);
        if (level == null)
            return (false, 400, "Hãy chọn cấp học. Nhóm chỉ ghép bạn cùng cấp, cấp 3 không học chung với cấp 1.", null);
        dto.EducationLevel = level;

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

        var hiring = string.Equals(dto.HiringMode, "ReverseBid", StringComparison.OrdinalIgnoreCase)
            ? "ReverseBid"
            : "Standard";
        if (hiring == "ReverseBid")
        {
            if (dto.BudgetPerSession is not decimal budget || budget < 50_000)
                return (false, 400, "Ngân sách mỗi buổi tối thiểu 50.000đ cho cả nhóm.", null);
            if ((dto.TutorRequirements ?? "").Trim().Length < 20)
                return (false, 400, "Viết yêu cầu dành cho gia sư, ít nhất 20 ký tự.", null);
            if (dto.BidDeadline is not DateTime deadline || deadline.Date < DateTime.Today)
                return (false, 400, "Hạn chào thầu phải là hôm nay hoặc một ngày sau.", null);
            if (dto.MaxMembers < 3 || dto.MaxMembers > 5)
                return (false, 400, "Nhóm đấu thầu có từ 3 đến 5 học sinh.", null);
            dto.HasMentor = false;
            dto.TutorId = null;
        }

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
            HiringMode = hiring,
            BudgetPerSession = hiring == "ReverseBid" ? dto.BudgetPerSession : null,
            BidDeadline = hiring == "ReverseBid" ? dto.BidDeadline!.Value.Date.AddHours(23).AddMinutes(59) : null,
            TutorRequirements = hiring == "ReverseBid" ? dto.TutorRequirements!.Trim() : null,
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
        if (await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Gia sư không xin vào nhóm học. Hãy gửi bài ứng tuyển.");
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

    public async Task<(bool Success, int Status, string Message, List<StudyGroupListItemDto> Items)> ListBidBoardAsync(
        int userId, CancellationToken cancellationToken)
    {
        if (!await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Bảng chào thầu chỉ gia sư mới xem được.", new());

        var now = DateTime.Now;
        var groups = await _db.StudyGroups
            .AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.CreatedByUser)
            .Include(g => g.StudyGroupMembers)
            .Include(g => g.StudyGroupMentor)
            .Include(g => g.StudyGroupBids)
            .Where(g => g.HiringMode == "ReverseBid" && g.Status == "Open")
            .Where(g => g.StudyGroupMentor == null || g.StudyGroupMentor.Status != "Accepted")
            .Where(g => g.BidDeadline == null || g.BidDeadline >= now)
            .OrderBy(g => g.BidDeadline)
            .ToListAsync(cancellationToken);
        return (true, 200, "", groups.Select(MapList).ToList());
    }

    public async Task<List<StudyGroupBidDto>> ListMyBidsAsync(int userId, CancellationToken cancellationToken)
    {
        var bids = await _db.StudyGroupBids
            .AsNoTracking()
            .Include(b => b.Group)
            .Include(b => b.Tutor).ThenInclude(t => t.Tutor)
            .Include(b => b.Votes)
            .Where(b => b.TutorId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);
        return bids.Select(b => MapBid(b, userId)).ToList();
    }

    public async Task<(bool Success, int Status, string Message)> PlaceBidAsync(
        int userId, int groupId, PlaceStudyGroupBidDto dto, CancellationToken cancellationToken)
    {
        if (!await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Chỉ gia sư mới ứng tuyển được.");

        var published = await _db.TutorProfiles.AnyAsync(
            t => t.TutorId == userId && t.IsPublished, cancellationToken);
        if (!published)
            return (false, 400, "Hồ sơ gia sư cần được đăng công khai trước khi ứng tuyển.");

        var curriculum = (dto.CurriculumNote ?? "").Trim();
        var certificate = (dto.CertificateNote ?? "").Trim();
        if (dto.ProposedPrice < 50_000)
            return (false, 400, "Giá đề nghị tối thiểu 50.000đ mỗi buổi.");
        if (curriculum.Length < 10)
            return (false, 400, "Mô tả giáo trình ít nhất 10 ký tự.");
        if (certificate.Length < 5)
            return (false, 400, "Ghi bằng cấp hoặc chứng chỉ, ít nhất 5 ký tự.");

        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMentor)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null || group.HiringMode != "ReverseBid")
            return (false, 404, "Không có bài tìm gia sư này.");
        if (group.CreatedByUserId == userId)
            return (false, 400, "Chủ nhóm không tự ứng tuyển.");
        if (group.StudyGroupMentor?.Status == "Accepted")
            return (false, 400, "Nhóm đã chọn gia sư.");
        if (group.BidDeadline.HasValue && group.BidDeadline < DateTime.Now)
            return (false, 400, "Đã hết hạn chào thầu.");

        var bid = await _db.StudyGroupBids
            .FirstOrDefaultAsync(b => b.GroupId == groupId && b.TutorId == userId, cancellationToken);
        var isNew = bid == null;
        if (bid == null)
        {
            bid = new StudyGroupBid
            {
                GroupId = groupId,
                TutorId = userId,
                CreatedAt = DateTime.Now
            };
            _db.StudyGroupBids.Add(bid);
        }
        else if (bid.Status == "Won")
        {
            return (false, 400, "Bạn đã được nhóm chọn.");
        }

        bid.ProposedPrice = dto.ProposedPrice;
        bid.CurriculumNote = curriculum;
        bid.CertificateNote = certificate;
        bid.Status = "Pending";
        await _db.SaveChangesAsync(cancellationToken);

        if (isNew)
        {
            await _notifications.NotifyAsync(
                group.CreatedByUserId,
                "StudyGroupBid",
                "Có gia sư ứng tuyển",
                $"Một gia sư vừa chào thầu nhóm \"{group.Title}\".",
                "StudyGroup",
                group.GroupId,
                cancellationToken);
        }

        return (true, 200, isNew ? "Đã gửi hồ sơ ứng tuyển." : "Đã cập nhật hồ sơ ứng tuyển.");
    }

    public async Task<(bool Success, int Status, string Message)> WithdrawBidAsync(
        int userId, int groupId, CancellationToken cancellationToken)
    {
        var bid = await _db.StudyGroupBids
            .FirstOrDefaultAsync(b => b.GroupId == groupId && b.TutorId == userId, cancellationToken);
        if (bid == null || bid.Status == "Withdrawn")
            return (false, 404, "Bạn chưa ứng tuyển nhóm này.");
        if (bid.Status == "Won")
            return (false, 400, "Bạn đã được chọn, không rút hồ sơ được.");
        bid.Status = "Withdrawn";
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã rút hồ sơ ứng tuyển.");
    }

    public async Task<(bool Success, int Status, string Message)> VoteBidAsync(
        int userId, int groupId, int bidId, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMembers)
            .Include(g => g.StudyGroupMentor)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null || group.HiringMode != "ReverseBid")
            return (false, 404, "Không có bài tìm gia sư này.");
        var isMember = group.CreatedByUserId == userId ||
            group.StudyGroupMembers.Any(m => m.UserId == userId && m.Status == "Accepted");
        if (!isMember)
            return (false, 403, "Chỉ thành viên nhóm mới bình chọn được.");
        if (group.StudyGroupMentor?.Status == "Accepted")
            return (false, 400, "Nhóm đã chọn gia sư.");

        var bid = await _db.StudyGroupBids
            .FirstOrDefaultAsync(b => b.BidId == bidId && b.GroupId == groupId && b.Status == "Pending", cancellationToken);
        if (bid == null)
            return (false, 404, "Hồ sơ ứng tuyển không còn để chọn.");

        var previous = await _db.StudyGroupBidVotes
            .Where(v => v.VoterUserId == userId && v.Bid.GroupId == groupId)
            .ToListAsync(cancellationToken);
        if (previous.Any(v => v.BidId == bidId))
            return (true, 200, "Bạn đã bình chọn gia sư này.");
        if (previous.Count > 0)
            _db.StudyGroupBidVotes.RemoveRange(previous);
        if (previous.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);

        _db.StudyGroupBidVotes.Add(new StudyGroupBidVote
        {
            BidId = bidId,
            VoterUserId = userId,
            CreatedAt = DateTime.Now
        });
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã bình chọn gia sư này.");
    }

    public async Task<(bool Success, int Status, string Message)> SelectBidAsync(
        int userId, int groupId, int bidId, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups
            .Include(g => g.StudyGroupMentor)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null || group.HiringMode != "ReverseBid")
            return (false, 404, "Không có bài tìm gia sư này.");
        if (group.CreatedByUserId != userId)
            return (false, 403, "Chỉ chủ nhóm mới chốt gia sư.");
        if (group.StudyGroupMentor?.Status == "Accepted")
            return (false, 400, "Nhóm đã có gia sư.");

        var bids = await _db.StudyGroupBids.Where(b => b.GroupId == groupId).ToListAsync(cancellationToken);
        var chosen = bids.FirstOrDefault(b => b.BidId == bidId && b.Status == "Pending");
        if (chosen == null)
            return (false, 404, "Hồ sơ ứng tuyển không còn để chọn.");

        foreach (var bid in bids)
        {
            if (bid.BidId == chosen.BidId) bid.Status = "Won";
            else if (bid.Status == "Pending") bid.Status = "Lost";
        }

        if (group.StudyGroupMentor == null)
        {
            _db.StudyGroupMentors.Add(new StudyGroupMentor
            {
                GroupId = groupId,
                TutorId = chosen.TutorId,
                InvitedByUserId = userId,
                Status = "Accepted",
                InviteMessage = "Nhóm đã chọn bạn sau vòng ứng tuyển.",
                InvitedAt = DateTime.Now,
                RespondedAt = DateTime.Now
            });
        }
        else
        {
            group.StudyGroupMentor.TutorId = chosen.TutorId;
            group.StudyGroupMentor.Status = "Accepted";
            group.StudyGroupMentor.InvitedByUserId = userId;
            group.StudyGroupMentor.RespondedAt = DateTime.Now;
        }

        group.HasMentor = true;
        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            chosen.TutorId,
            "StudyGroupBidWon",
            "Nhóm đã chọn bạn",
            $"Nhóm \"{group.Title}\" chọn bạn làm gia sư, {chosen.ProposedPrice:N0}đ/buổi.",
            "StudyGroup",
            group.GroupId,
            cancellationToken);
        foreach (var loser in bids.Where(b => b.Status == "Lost"))
        {
            await _notifications.NotifyAsync(
                loser.TutorId,
                "StudyGroupBidLost",
                "Nhóm đã chọn gia sư khác",
                $"Nhóm \"{group.Title}\" đã chốt gia sư khác. Hồ sơ của bạn không được chọn.",
                "StudyGroup",
                group.GroupId,
                cancellationToken);
        }
        return (true, 200, "Đã chốt gia sư cho nhóm. Các gia sư còn lại đã được báo từ chối.");
    }

    private async Task<bool> IsTutorAsync(int userId, CancellationToken cancellationToken)
    {
        return await _db.Users.AsNoTracking()
            .AnyAsync(u => u.UserId == userId && u.Role.RoleName == "Tutor", cancellationToken);
    }

    private static StudyGroupBidDto MapBid(StudyGroupBid bid, int? currentUserId)
    {
        return new StudyGroupBidDto
        {
            BidId = bid.BidId,
            GroupId = bid.GroupId,
            GroupTitle = bid.Group?.Title,
            TutorId = bid.TutorId,
            TutorName = bid.Tutor?.Tutor?.FullName ?? "Gia sư",
            University = bid.Tutor?.University,
            Major = bid.Tutor?.Major,
            YearsOfExperience = bid.Tutor?.YearsOfExperience,
            AverageRating = bid.Tutor?.AverageRating ?? 0,
            ProposedPrice = bid.ProposedPrice,
            CurriculumNote = bid.CurriculumNote,
            CertificateNote = bid.CertificateNote,
            Status = bid.Status,
            VoteCount = bid.Votes?.Count ?? 0,
            VotedByMe = currentUserId.HasValue && bid.Votes != null && bid.Votes.Any(v => v.VoterUserId == currentUserId),
            CreatedAt = bid.CreatedAt
        };
    }

    private static string? CanonicalStudyLevel(string? value)
    {
        var v = VietnameseText.Fold(value);
        if (string.IsNullOrWhiteSpace(v)) return null;
        if (v.Contains("tieu") || v.Contains("cap 1") || v.Contains("cap1") || v is "primary")
            return "Tiểu học";
        if (v.Contains("thcs") || v.Contains("cap 2") || v.Contains("cap2") || v is "secondary")
            return "THCS";
        if (v.Contains("thpt") || v.Contains("cap 3") || v.Contains("cap3") || v.Contains("high"))
            return "THPT";
        return null;
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
            EducationLevel = g.EducationLevel,
            City = g.City,
            District = g.District,
            MeetingMode = g.MeetingMode,
            HasMentor = g.HasMentor,
            MentorName = mentor?.Tutor?.Tutor?.FullName,
            MentorStatus = mentor?.Status ?? "None",
            HiringMode = string.IsNullOrWhiteSpace(g.HiringMode) ? "Standard" : g.HiringMode,
            BudgetPerSession = g.BudgetPerSession,
            BidDeadline = g.BidDeadline,
            TutorRequirements = g.TutorRequirements,
            BidCount = g.StudyGroupBids?.Count(b => b.Status == "Pending" || b.Status == "Won") ?? 0,
            MemberCount = g.StudyGroupMembers.Count(m => m.Status == "Accepted"),
            MaxMembers = g.MaxMembers,
            Status = g.Status,
            CreatorName = g.CreatedByUser.FullName,
            CreatedAt = g.CreatedAt
        };
    }
}
