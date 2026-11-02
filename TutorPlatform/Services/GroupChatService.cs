using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Hubs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class GroupChatService
{
    private readonly TutorPlatformDbContext _db;
    private readonly IHubContext<AppHub> _hub;
    private readonly IWebHostEnvironment _environment;

    public GroupChatService(TutorPlatformDbContext db, IHubContext<AppHub> hub, IWebHostEnvironment environment)
    {
        _db = db;
        _hub = hub;
        _environment = environment;
    }

    public async Task<bool> CanAccessAsync(int userId, int groupId, CancellationToken cancellationToken)
    {
        var group = await _db.StudyGroups
            .AsNoTracking()
            .Include(g => g.StudyGroupMembers)
            .Include(g => g.StudyGroupMentor)
            .FirstOrDefaultAsync(g => g.GroupId == groupId, cancellationToken);
        if (group == null) return false;

        if (group.CreatedByUserId == userId) return true;
        if (group.StudyGroupMembers.Any(m => m.UserId == userId && m.Status == "Accepted"))
            return true;
        if (group.StudyGroupMentor is { Status: "Accepted", TutorId: var tutorId } && tutorId == userId)
            return true;
        return false;
    }

    public async Task<List<GroupChatListItemDto>> ListMineAsync(int userId, CancellationToken cancellationToken)
    {
        var groupIds = await _db.StudyGroupMembers
            .Where(m => m.UserId == userId && m.Status == "Accepted")
            .Select(m => m.GroupId)
            .ToListAsync(cancellationToken);

        var mentorGroupIds = await _db.StudyGroupMentors
            .Where(m => m.TutorId == userId && m.Status == "Accepted")
            .Select(m => m.GroupId)
            .ToListAsync(cancellationToken);

        var ids = groupIds.Concat(mentorGroupIds).Distinct().ToList();
        if (ids.Count == 0) return new List<GroupChatListItemDto>();

        var groups = await _db.StudyGroups
            .AsNoTracking()
            .Include(g => g.Subject)
            .Include(g => g.StudyGroupMembers)
            .Where(g => ids.Contains(g.GroupId))
            .ToListAsync(cancellationToken);

        var lastRows = await _db.StudyGroupMessages
            .AsNoTracking()
            .Where(m => ids.Contains(m.GroupId))
            .ToListAsync(cancellationToken);
        var lastMap = lastRows
            .GroupBy(m => m.GroupId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.SentAt).First());

        return groups.Select(g =>
        {
            lastMap.TryGetValue(g.GroupId, out var last);
            return new GroupChatListItemDto
            {
                GroupId = g.GroupId,
                Title = g.Title,
                SubjectName = g.Subject.SubjectName,
                MemberCount = g.StudyGroupMembers.Count(m => m.Status == "Accepted"),
                LastMessage = ChatAttachmentStore.PreviewText(last?.Content, last?.AttachmentType),
                LastMessageAt = last?.SentAt
            };
        }).OrderByDescending(g => g.LastMessageAt ?? DateTime.MinValue).ToList();
    }

    public async Task<List<GroupChatMessageDto>> ListMessagesAsync(int userId, int groupId, CancellationToken cancellationToken)
    {
        if (!await CanAccessAsync(userId, groupId, cancellationToken))
            throw new UnauthorizedAccessException();

        var items = await _db.StudyGroupMessages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.SentAt)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<GroupChatMessageDto> SendAsync(
        int userId,
        int groupId,
        string? content,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (content is { Length: > 2000 })
            throw new InvalidOperationException("Tin nhắn tối đa 2000 ký tự.");

        string? attachmentUrl = null;
        string? attachmentType = null;
        if (file is not null)
        {
            (attachmentUrl, attachmentType) = await ChatAttachmentStore.SaveAsync(
                _environment, file, "group-chat", cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(content) && attachmentUrl is null)
            throw new InvalidOperationException("Nhập tin nhắn hoặc đính kèm ảnh/tệp.");
        if (!await CanAccessAsync(userId, groupId, cancellationToken))
            throw new UnauthorizedAccessException();

        var sender = await _db.Users.FindAsync(new object[] { userId }, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

        var msg = new StudyGroupMessage
        {
            GroupId = groupId,
            SenderId = userId,
            Content = ChatAttachmentStore.FallbackContent(content, attachmentType),
            AttachmentUrl = attachmentUrl,
            AttachmentType = attachmentType,
            SentAt = DateTime.Now
        };
        _db.StudyGroupMessages.Add(msg);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new GroupChatMessageDto
        {
            MessageId = msg.MessageId,
            GroupId = groupId,
            SenderId = userId,
            SenderName = sender.FullName,
            SenderAvatarUrl = sender.AvatarUrl,
            Content = msg.Content,
            AttachmentUrl = msg.AttachmentUrl,
            AttachmentType = msg.AttachmentType,
            SentAt = msg.SentAt
        };

        await _hub.Clients.Group($"group-{groupId}").SendAsync("ReceiveGroupMessage", dto, cancellationToken);
        return dto;
    }

    private static GroupChatMessageDto Map(StudyGroupMessage m) => new()
    {
        MessageId = m.MessageId,
        GroupId = m.GroupId,
        SenderId = m.SenderId,
        SenderName = m.Sender.FullName,
        SenderAvatarUrl = m.Sender.AvatarUrl,
        Content = m.Content,
        AttachmentUrl = m.AttachmentUrl,
        AttachmentType = m.AttachmentType,
        SentAt = m.SentAt
    };
}
