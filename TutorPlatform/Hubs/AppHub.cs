using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using TutorPlatform.Services;
using TutorPlatform.Datas;
using Microsoft.EntityFrameworkCore;

namespace TutorPlatform.Hubs;

[Authorize]
public class AppHub : Hub
{
    private readonly TutorPlatformDbContext _db;

    public AppHub(TutorPlatformDbContext db) => _db = db;

    public override Task OnConnectedAsync()
    {
        if (int.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            SosPresence.Connected(userId, Context.ConnectionId);
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (int.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            SosPresence.Disconnected(userId, Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    public async Task JoinConversation(int conversationId)
    {
        if (!int.TryParse(Context.UserIdentifier, out var userId))
            throw new HubException("Không xác định được người dùng.");
        var conversation = await _db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId);
        if (conversation is null || (conversation.User1Id != userId && conversation.User2Id != userId))
            throw new HubException("Bạn không có quyền tham gia cuộc trò chuyện này.");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv-{conversationId}");
    }

    public async Task JoinSosSession(int sessionId)
    {
        if (!int.TryParse(Context.UserIdentifier, out var userId))
            throw new HubException("Không xác định được người dùng.");
        var allowed = await _db.SosSessions.AsNoTracking()
            .AnyAsync(s => s.SessionId == sessionId && (s.StudentId == userId || s.TutorId == userId));
        if (!allowed)
            throw new HubException("Bạn không có quyền tham gia phiên SOS này.");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"sos-session-{sessionId}");
    }

    public async Task JoinGroupChat(int groupId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"group-{groupId}");
    }
}
