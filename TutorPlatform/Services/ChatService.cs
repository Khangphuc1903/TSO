using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Hubs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class ChatService
{
    private readonly TutorPlatformDbContext _db;
    private readonly IHubContext<AppHub> _hub;

    public ChatService(TutorPlatformDbContext db, IHubContext<AppHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<Conversation> GetOrCreateAsync(int userId, int otherUserId, int? bookingId, CancellationToken cancellationToken)
    {
        if (userId == otherUserId)
            throw new InvalidOperationException("Không thể chat với chính mình.");

        var conv = await _db.Conversations.FirstOrDefaultAsync(c =>
            (c.User1Id == userId && c.User2Id == otherUserId) ||
            (c.User1Id == otherUserId && c.User2Id == userId), cancellationToken);

        if (conv == null)
        {
            conv = new Conversation
            {
                User1Id = Math.Min(userId, otherUserId),
                User2Id = Math.Max(userId, otherUserId),
                BookingId = bookingId,
                CreatedAt = DateTime.Now
            };
            _db.Conversations.Add(conv);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return conv;
    }

    public async Task<List<ConversationDto>> ListAsync(int userId, CancellationToken cancellationToken)
    {
        var convs = await _db.Conversations
            .AsNoTracking()
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Messages)
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

        return convs.Select(c =>
        {
            var other = c.User1Id == userId ? c.User2 : c.User1;
            var last = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault();
            return new ConversationDto
            {
                ConversationId = c.ConversationId,
                OtherUserId = other.UserId,
                OtherUserName = other.FullName,
                OtherAvatarUrl = other.AvatarUrl,
                LastMessage = last?.Content,
                LastMessageAt = c.LastMessageAt,
                UnreadCount = c.Messages.Count(m => m.SenderId != userId && !m.IsRead)
            };
        }).ToList();
    }

    public async Task<List<ChatMessageDto>> MessagesAsync(int userId, int conversationId, CancellationToken cancellationToken)
    {
        var conv = await RequireMember(userId, conversationId, cancellationToken);
        var items = await _db.Messages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .ToListAsync(cancellationToken);

        var unread = await _db.Messages
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead)
            .ToListAsync(cancellationToken);
        foreach (var m in unread) m.IsRead = true;
        await _db.SaveChangesAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<ChatMessageDto> SendAsync(int userId, int conversationId, string content, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("Nội dung trống.");

        var conv = await RequireMember(userId, conversationId, cancellationToken);
        var sender = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId = userId,
            Content = content.Trim(),
            IsRead = false,
            SentAt = DateTime.Now
        };
        _db.Messages.Add(msg);
        conv.LastMessageAt = msg.SentAt;
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new ChatMessageDto
        {
            MessageId = msg.MessageId,
            ConversationId = conversationId,
            SenderId = userId,
            SenderName = sender?.FullName ?? "User",
            Content = msg.Content,
            SentAt = msg.SentAt
        };

        await _hub.Clients.Group($"conv-{conversationId}").SendAsync("ReceiveMessage", dto, cancellationToken);
        var otherId = conv.User1Id == userId ? conv.User2Id : conv.User1Id;
        await _hub.Clients.User(otherId.ToString()).SendAsync("ReceiveMessage", dto, cancellationToken);
        return dto;
    }

    private async Task<Conversation> RequireMember(int userId, int conversationId, CancellationToken cancellationToken)
    {
        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.ConversationId == conversationId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy cuộc trò chuyện.");
        if (conv.User1Id != userId && conv.User2Id != userId)
            throw new UnauthorizedAccessException();
        return conv;
    }

    private static ChatMessageDto Map(Message m) => new()
    {
        MessageId = m.MessageId,
        ConversationId = m.ConversationId,
        SenderId = m.SenderId,
        SenderName = m.Sender.FullName,
        Content = m.Content,
        SentAt = m.SentAt
    };
}
