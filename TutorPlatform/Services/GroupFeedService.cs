using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class GroupFeedService
{
    private const int MaxFiles = 6;
    private readonly TutorPlatformDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly NotificationService _notifications;

    public GroupFeedService(TutorPlatformDbContext db, IWebHostEnvironment environment, NotificationService notifications)
    {
        _db = db;
        _environment = environment;
        _notifications = notifications;
    }

    public async Task<List<GroupCardDto>> ListAsync(int? userId, string? keyword, CancellationToken cancellationToken)
    {
        var query = _db.StudyGroups.AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.CreatedByUser).ThenInclude(u => u.Role)
            .Include(g => g.StudyGroupMembers)
            .Where(g => g.Status == "Open" || g.Status == "Active");
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            query = query.Where(g => g.Title.Contains(kw) || (g.Description != null && g.Description.Contains(kw)));
        }

        var groups = await query.OrderByDescending(g => g.CreatedAt).ToListAsync(cancellationToken);
        return groups.Select(g =>
        {
            var mine = userId.HasValue ? g.StudyGroupMembers.FirstOrDefault(m => m.UserId == userId) : null;
            var isOwner = userId.HasValue && g.CreatedByUserId == userId;
            return new GroupCardDto
            {
                GroupId = g.GroupId,
                Title = g.Title,
                Description = g.Description,
                SubjectName = g.Subject?.SubjectName ?? "",
                OwnerName = g.CreatedByUser?.FullName ?? "",
                OwnerRole = RoleLabel(g.CreatedByUser?.Role?.RoleName),
                MemberCount = g.StudyGroupMembers.Count(m => m.Status == "Accepted"),
                MyStatus = isOwner ? "Accepted" : mine?.Status ?? "None",
                IsOwner = isOwner
            };
        }).ToList();
    }

    public async Task<(bool Success, int Status, string Message, int? GroupId)> CreateAsync(
        int userId, string? title, string? description, int subjectId, CancellationToken cancellationToken)
    {
        if (!await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Chỉ gia sư mới được tạo nhóm.", null);
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length < 3)
            return (false, 400, "Tên nhóm cần ít nhất 3 ký tự.", null);
        var subjectOk = await _db.Subjects.AnyAsync(s => s.SubjectId == subjectId && s.IsActive, cancellationToken);
        if (!subjectOk)
            return (false, 400, "Hãy chọn môn học.", null);

        var owner = await _db.Users.AsNoTracking().FirstAsync(u => u.UserId == userId, cancellationToken);
        var group = new StudyGroup
        {
            CreatedByUserId = userId,
            SubjectId = subjectId,
            Title = title.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            EducationLevel = "THPT",
            StudyGoal = "Question",
            MaxMembers = 200,
            MeetingMode = "Online",
            City = owner.City,
            District = owner.District,
            Status = "Open",
            HasMentor = false,
            HiringMode = "Standard",
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
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 201, "Đã tạo nhóm.", group.GroupId);
    }

    public async Task<GroupPageDto?> GetPageAsync(int groupId, int? userId, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups.AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.CreatedByUser).ThenInclude(u => u.Role)
            .Include(g => g.StudyGroupMembers).ThenInclude(m => m.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return null;

        var mine = userId.HasValue ? group.StudyGroupMembers.FirstOrDefault(m => m.UserId == userId) : null;
        var isOwner = userId.HasValue && group.CreatedByUserId == userId;
        var isMember = isOwner || mine?.Status == "Accepted";
        var ownerIsTutor = await IsTutorAsync(group.CreatedByUserId, cancellationToken);

        var page = new GroupPageDto
        {
            GroupId = group.GroupId,
            Title = group.Title,
            Description = group.Description,
            SubjectName = group.Subject?.SubjectName ?? "",
            OwnerName = group.CreatedByUser?.FullName ?? "",
            OwnerRole = RoleLabel(group.CreatedByUser?.Role?.RoleName),
            MemberCount = group.StudyGroupMembers.Count(m => m.Status == "Accepted"),
            IsOwner = isOwner,
            IsMember = isMember,
            CanModerate = isOwner && ownerIsTutor,
            MyStatus = isOwner ? "Accepted" : mine?.Status ?? "None",
            Members = group.StudyGroupMembers
                .Where(m => m.Status == "Accepted")
                .Select(m => new GroupPersonDto
                {
                    UserId = m.UserId,
                    FullName = m.User.FullName,
                    Role = RoleLabel(m.User.Role?.RoleName),
                    AvatarUrl = m.User.AvatarUrl
                })
                .ToList()
        };
        if (page.CanModerate)
        {
            page.JoinRequests = group.StudyGroupMembers
                .Where(m => m.Status == "Pending")
                .OrderByDescending(m => m.JoinedAt)
                .Select(m => new GroupJoinRequestDto
                {
                    UserId = m.UserId,
                    FullName = m.User.FullName,
                    Role = RoleLabel(m.User.Role?.RoleName),
                    AvatarUrl = m.User.AvatarUrl,
                    Message = m.JoinMessage
                })
                .ToList();
        }
        if (isMember)
            page.Posts = await LoadPostsAsync(groupId, userId, page.CanModerate, cancellationToken);
        return page;
    }

    public async Task<(bool Success, int Status, string Message)> RequestJoinAsync(
        int userId, int groupId, string? message, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups.Include(g => g.StudyGroupMembers)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId == userId) return (false, 400, "Bạn là chủ nhóm.");
        if (!await IsTutorAsync(group.CreatedByUserId, cancellationToken))
            return (false, 400, "Nhóm này chưa có gia sư duyệt thành viên.");

        var note = (message ?? "").Trim();
        if (note.Length > 500) return (false, 400, "Lời nhắn tối đa 500 ký tự.");
        var row = group.StudyGroupMembers.FirstOrDefault(m => m.UserId == userId);
        if (row?.Status == "Accepted") return (false, 400, "Bạn đã ở trong nhóm.");
        if (row?.Status == "Pending") return (false, 400, "Lời xin của bạn đang chờ gia sư duyệt.");
        if (row == null)
        {
            _db.StudyGroupMembers.Add(new StudyGroupMember
            {
                GroupId = groupId,
                UserId = userId,
                Status = "Pending",
                JoinMessage = string.IsNullOrWhiteSpace(note) ? null : note,
                JoinedAt = DateTime.Now
            });
        }
        else
        {
            row.Status = "Pending";
            row.JoinMessage = string.IsNullOrWhiteSpace(note) ? null : note;
            row.JoinedAt = DateTime.Now;
        }
        await _db.SaveChangesAsync(cancellationToken);
        var who = await _db.Users.AsNoTracking().Where(u => u.UserId == userId).Select(u => u.FullName).FirstOrDefaultAsync(cancellationToken);
        await _notifications.NotifyAsync(
            group.CreatedByUserId,
            "GroupJoinRequest",
            "Có người xin vào nhóm",
            $"{who ?? "Một thành viên"} xin vào nhóm \"{group.Title}\".",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, "Đã gửi lời xin. Gia sư sẽ duyệt.");
    }

    public async Task<(bool Success, int Status, string Message)> ModerateAsync(
        int userId, int groupId, int applicantId, bool accept, CancellationToken cancellationToken)
    {
        if (!await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Chỉ gia sư mới được duyệt thành viên.");
        var group = await _db.StudyGroups.AsNoTracking().FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId != userId)
            return (false, 403, "Chỉ gia sư tạo nhóm mới được duyệt thành viên.");
        return await new StudyGroupService(_db, _notifications).RespondToJoinRequestAsync(userId, groupId, applicantId, accept, cancellationToken);
    }

    public async Task<(bool Success, int Status, string Message)> CreatePostAsync(
        int userId, int groupId, string? body, IReadOnlyList<IFormFile>? files, CancellationToken cancellationToken)
    {
        if (!await IsAcceptedAsync(userId, groupId, cancellationToken))
            return (false, 403, "Chỉ thành viên đã được duyệt mới được đăng bài.");
        var text = (body ?? "").Trim();
        var uploads = (files ?? Array.Empty<IFormFile>()).Where(f => f.Length > 0).ToList();
        if (text.Length == 0 && uploads.Count == 0)
            return (false, 400, "Viết câu hỏi hoặc đính kèm ảnh, tệp.");
        if (text.Length > 4000)
            return (false, 400, "Bài đăng tối đa 4000 ký tự.");
        if (uploads.Count > MaxFiles)
            return (false, 400, "Mỗi bài đăng tối đa 6 ảnh hoặc tệp.");

        var ownerId = await _db.StudyGroups.AsNoTracking()
            .Where(g => g.GroupId == groupId)
            .Select(g => g.CreatedByUserId)
            .FirstAsync(cancellationToken);
        var approved = ownerId == userId;
        var post = new StudyGroupPost
        {
            GroupId = groupId,
            AuthorId = userId,
            PostType = "Question",
            Body = text,
            Status = approved ? "Approved" : "Pending",
            CreatedAt = DateTime.Now
        };
        _db.StudyGroupPosts.Add(post);
        await _db.SaveChangesAsync(cancellationToken);
        await SaveFilesAsync(uploads, post.PostId, null, cancellationToken);
        if (!approved)
        {
            var who = await _db.Users.AsNoTracking().Where(u => u.UserId == userId).Select(u => u.FullName).FirstOrDefaultAsync(cancellationToken);
            var title = await _db.StudyGroups.AsNoTracking().Where(g => g.GroupId == groupId).Select(g => g.Title).FirstOrDefaultAsync(cancellationToken);
            await _notifications.NotifyAsync(
                ownerId,
                "GroupPostReview",
                "Có bài hỏi chờ duyệt",
                $"{who ?? "Một thành viên"} vừa gửi bài trong nhóm \"{title}\".",
                "StudyGroup",
                groupId,
                cancellationToken);
            return (true, 201, "Đã gửi bài. Gia sư duyệt xong bài mới hiện trên nhóm.");
        }
        return (true, 201, "Đã đăng câu hỏi.");
    }

    public async Task<(bool Success, int Status, string Message)> ReviewPostAsync(
        int userId, int groupId, int postId, bool accept, CancellationToken cancellationToken)
    {
        if (!await IsTutorAsync(userId, cancellationToken))
            return (false, 403, "Chỉ gia sư mới được duyệt bài.");
        var group = await _db.StudyGroups.AsNoTracking().FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return (false, 404, "Không tìm thấy nhóm.");
        if (group.CreatedByUserId != userId)
            return (false, 403, "Chỉ gia sư chủ nhóm mới được duyệt bài.");
        var post = await _db.StudyGroupPosts.FirstOrDefaultAsync(p => p.PostId == postId && p.GroupId == groupId, cancellationToken);
        if (post == null) return (false, 404, "Không thấy bài đăng.");
        post.Status = accept ? "Approved" : "Rejected";
        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.NotifyAsync(
            post.AuthorId,
            "GroupPostReview",
            accept ? "Bài đã được duyệt" : "Bài chưa được đăng",
            accept
                ? $"Gia sư đã duyệt bài của bạn trong nhóm \"{group.Title}\"."
                : $"Gia sư chưa cho đăng bài trong nhóm \"{group.Title}\".",
            "StudyGroup",
            groupId,
            cancellationToken);
        return (true, 200, accept ? "Đã duyệt bài." : "Đã từ chối bài.");
    }

    public async Task<(bool Success, int Status, string Message)> CommentAsync(
        int userId, int groupId, int postId, int? parentCommentId, string? body, IReadOnlyList<IFormFile>? files, CancellationToken cancellationToken)
    {
        if (!await IsAcceptedAsync(userId, groupId, cancellationToken))
            return (false, 403, "Chỉ thành viên đã được duyệt mới được bình luận.");
        var post = await _db.StudyGroupPosts.AsNoTracking().FirstOrDefaultAsync(p => p.PostId == postId && p.GroupId == groupId, cancellationToken);
        if (post == null) return (false, 404, "Không thấy bài đăng.");
        if (!string.Equals(post.Status, "Approved", StringComparison.OrdinalIgnoreCase))
            return (false, 400, "Bài chưa được gia sư duyệt.");
        if (parentCommentId is int parentId)
        {
            var parent = await _db.StudyGroupComments.AsNoTracking().FirstOrDefaultAsync(c => c.CommentId == parentId && c.PostId == postId, cancellationToken);
            if (parent == null || parent.ParentCommentId != null)
                return (false, 400, "Chỉ trả lời được bình luận gốc.");
        }

        var text = (body ?? "").Trim();
        var uploads = (files ?? Array.Empty<IFormFile>()).Where(f => f.Length > 0).ToList();
        if (text.Length == 0 && uploads.Count == 0)
            return (false, 400, "Viết bình luận hoặc đính kèm ảnh, tệp.");
        if (text.Length > 2000)
            return (false, 400, "Bình luận tối đa 2000 ký tự.");
        if (uploads.Count > MaxFiles)
            return (false, 400, "Mỗi bình luận tối đa 6 ảnh hoặc tệp.");

        var comment = new StudyGroupComment
        {
            PostId = postId,
            ParentCommentId = parentCommentId,
            AuthorId = userId,
            Body = text,
            CreatedAt = DateTime.Now
        };
        _db.StudyGroupComments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken);
        await SaveFilesAsync(uploads, null, comment.CommentId, cancellationToken);
        return (true, 201, parentCommentId.HasValue ? "Đã trả lời." : "Đã bình luận.");
    }

    public async Task<(bool Success, int Status, string Message)> ReportAsync(
        int userId, int groupId, string entityType, int entityId, string? reason, string? description, CancellationToken cancellationToken)
    {
        if (!await IsAcceptedAsync(userId, groupId, cancellationToken))
            return (false, 403, "Chỉ thành viên nhóm mới được báo cáo.");
        var kind = string.Equals(entityType, "GroupComment", StringComparison.OrdinalIgnoreCase) ? "GroupComment" : "GroupPost";
        int? authorId;
        if (kind == "GroupPost")
        {
            authorId = await _db.StudyGroupPosts.AsNoTracking()
                .Where(p => p.PostId == entityId && p.GroupId == groupId)
                .Select(p => (int?)p.AuthorId)
                .FirstOrDefaultAsync(cancellationToken);
        }
        else
        {
            authorId = await _db.StudyGroupComments.AsNoTracking()
                .Where(c => c.CommentId == entityId && _db.StudyGroupPosts.Any(p => p.PostId == c.PostId && p.GroupId == groupId))
                .Select(c => (int?)c.AuthorId)
                .FirstOrDefaultAsync(cancellationToken);
        }
        if (authorId == null) return (false, 404, "Không thấy nội dung cần báo cáo.");
        if (authorId == userId) return (false, 400, "Không báo cáo nội dung của chính mình.");

        var why = string.IsNullOrWhiteSpace(reason) ? "Khác" : reason.Trim();
        if (why.Length > 100) why = why[..100];
        _db.Reports.Add(new Report
        {
            ReporterId = userId,
            ReportedEntityType = kind,
            ReportedEntityId = entityId,
            Reason = why,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, "Đã gửi báo cáo cho quản trị viên.");
    }

    public async Task<int?> AuthorOfAsync(string? entityType, int entityId, CancellationToken cancellationToken)
    {
        if (string.Equals(entityType, "GroupPost", StringComparison.OrdinalIgnoreCase))
            return await _db.StudyGroupPosts.AsNoTracking().Where(p => p.PostId == entityId).Select(p => (int?)p.AuthorId).FirstOrDefaultAsync(cancellationToken);
        if (string.Equals(entityType, "GroupComment", StringComparison.OrdinalIgnoreCase))
            return await _db.StudyGroupComments.AsNoTracking().Where(c => c.CommentId == entityId).Select(c => (int?)c.AuthorId).FirstOrDefaultAsync(cancellationToken);
        return null;
    }

    public async Task<string?> SnippetAsync(string? entityType, int entityId, CancellationToken cancellationToken)
    {
        string? text = null;
        if (string.Equals(entityType, "GroupPost", StringComparison.OrdinalIgnoreCase))
            text = await _db.StudyGroupPosts.AsNoTracking().Where(p => p.PostId == entityId).Select(p => p.Body).FirstOrDefaultAsync(cancellationToken);
        else if (string.Equals(entityType, "GroupComment", StringComparison.OrdinalIgnoreCase))
            text = await _db.StudyGroupComments.AsNoTracking().Where(c => c.CommentId == entityId).Select(c => c.Body).FirstOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(text)) return null;
        text = text.Trim();
        return text.Length <= 180 ? text : text[..180] + "…";
    }

    public async Task<List<GroupHomeItemDto>> HomeAsync(int userId, CancellationToken cancellationToken)
    {
        var joined = await _db.StudyGroupMembers.AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == "Accepted")
            .Select(m => m.GroupId)
            .ToListAsync(cancellationToken);
        var owned = await _db.StudyGroups.AsNoTracking()
            .Where(g => g.CreatedByUserId == userId)
            .Select(g => g.GroupId)
            .ToListAsync(cancellationToken);
        var ids = joined.Concat(owned).Distinct().ToList();
        if (ids.Count == 0) return new List<GroupHomeItemDto>();

        var posts = await _db.StudyGroupPosts.AsNoTracking()
            .Where(p => ids.Contains(p.GroupId) && p.Status == "Approved")
            .OrderByDescending(p => p.CreatedAt)
            .Take(40)
            .ToListAsync(cancellationToken);
        var mapped = await MapPostsAsync(posts, cancellationToken);
        var titles = await _db.StudyGroups.AsNoTracking()
            .Where(g => ids.Contains(g.GroupId))
            .Select(g => new { g.GroupId, g.Title })
            .ToListAsync(cancellationToken);
        var titleOf = titles.ToDictionary(g => g.GroupId, g => g.Title);
        var byPost = mapped.ToDictionary(p => p.PostId);
        return posts.Select(post => new GroupHomeItemDto
        {
            GroupId = post.GroupId,
            GroupTitle = titleOf.GetValueOrDefault(post.GroupId) ?? "",
            Post = byPost[post.PostId]
        }).ToList();
    }

    private async Task<List<GroupPostDto>> LoadPostsAsync(int groupId, int? userId, bool canModerate, CancellationToken cancellationToken)
    {
        var posts = await _db.StudyGroupPosts.AsNoTracking()
            .Where(p => p.GroupId == groupId && p.Status != "Rejected")
            .Where(p => p.Status == "Approved" || canModerate || (userId != null && p.AuthorId == userId && p.Status == "Pending"))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);
        return await MapPostsAsync(posts, cancellationToken);
    }

    private async Task<List<GroupPostDto>> MapPostsAsync(List<StudyGroupPost> posts, CancellationToken cancellationToken)
    {
        var postIds = posts.Select(p => p.PostId).ToList();
        var comments = postIds.Count == 0
            ? new List<StudyGroupComment>()
            : await _db.StudyGroupComments.AsNoTracking().Where(c => postIds.Contains(c.PostId)).OrderBy(c => c.CreatedAt).ToListAsync(cancellationToken);
        var commentIds = comments.Select(c => c.CommentId).ToList();
        var files = await _db.StudyGroupFeedFiles.AsNoTracking()
            .Where(f => (f.PostId != null && postIds.Contains(f.PostId.Value)) || (f.CommentId != null && commentIds.Contains(f.CommentId.Value)))
            .ToListAsync(cancellationToken);
        var userIds = posts.Select(p => p.AuthorId).Concat(comments.Select(c => c.AuthorId)).Distinct().ToList();
        var people = await _db.Users.AsNoTracking().Include(u => u.Role).Where(u => userIds.Contains(u.UserId)).ToListAsync(cancellationToken);
        var byUser = people.ToDictionary(u => u.UserId);

        GroupPersonDto Person(int id)
        {
            if (!byUser.TryGetValue(id, out var user))
                return new GroupPersonDto { UserId = id, FullName = "Thành viên", Role = "" };
            return new GroupPersonDto
            {
                UserId = id,
                FullName = user.FullName,
                Role = RoleLabel(user.Role?.RoleName),
                AvatarUrl = user.AvatarUrl
            };
        }

        List<GroupFileDto> FilesFor(int? postId, int? commentId) => files
            .Where(f => postId.HasValue ? f.PostId == postId : f.CommentId == commentId)
            .Select(f => new GroupFileDto { FileUrl = f.FileUrl, FileName = f.FileName, Kind = f.Kind })
            .ToList();

        return posts.Select(post =>
        {
            var roots = comments.Where(c => c.PostId == post.PostId && c.ParentCommentId == null).ToList();
            return new GroupPostDto
            {
                PostId = post.PostId,
                Body = post.Body,
                Status = string.IsNullOrWhiteSpace(post.Status) ? "Approved" : post.Status,
                CreatedAt = post.CreatedAt,
                Author = Person(post.AuthorId),
                Files = FilesFor(post.PostId, null),
                Comments = roots.Select(root => new GroupCommentDto
                {
                    CommentId = root.CommentId,
                    Body = root.Body,
                    CreatedAt = root.CreatedAt,
                    Author = Person(root.AuthorId),
                    Files = FilesFor(null, root.CommentId),
                    Replies = comments.Where(c => c.ParentCommentId == root.CommentId).Select(reply => new GroupCommentDto
                    {
                        CommentId = reply.CommentId,
                        Body = reply.Body,
                        CreatedAt = reply.CreatedAt,
                        Author = Person(reply.AuthorId),
                        Files = FilesFor(null, reply.CommentId)
                    }).ToList()
                }).ToList()
            };
        }).ToList();
    }

    private async Task SaveFilesAsync(List<IFormFile> uploads, int? postId, int? commentId, CancellationToken cancellationToken)
    {
        foreach (var file in uploads)
        {
            var (url, kind) = await ChatAttachmentStore.SaveAsync(_environment, file, "group-feed", cancellationToken);
            _db.StudyGroupFeedFiles.Add(new StudyGroupFeedFile
            {
                PostId = postId,
                CommentId = commentId,
                FileUrl = url,
                FileName = Path.GetFileName(file.FileName),
                Kind = kind
            });
        }
        if (uploads.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<bool> IsTutorAsync(int userId, CancellationToken cancellationToken)
    {
        var role = await _db.Users.AsNoTracking().Where(u => u.UserId == userId).Select(u => u.Role.RoleName).FirstOrDefaultAsync(cancellationToken);
        return string.Equals(role, "Tutor", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<bool> IsAcceptedAsync(int userId, int groupId, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups.AsNoTracking().FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return false;
        if (group.CreatedByUserId == userId) return true;
        return await _db.StudyGroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId && m.Status == "Accepted", cancellationToken);
    }

    private static string RoleLabel(string? role) => role switch
    {
        "Tutor" => "Gia sư",
        "Student" => "Học sinh",
        "Parent" => "Phụ huynh",
        "Admin" => "Quản trị",
        _ => role ?? ""
    };
}
