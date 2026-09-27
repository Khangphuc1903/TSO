using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Hubs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class NotificationService
{
    private readonly TutorPlatformDbContext _db;
    private readonly IHubContext<AppHub> _hub;

    public NotificationService(TutorPlatformDbContext db, IHubContext<AppHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task NotifyAsync(
        int userId,
        string type,
        string title,
        string? content,
        string? relatedType = null,
        int? relatedId = null,
        CancellationToken cancellationToken = default)
    {
        var item = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Content = content,
            RelatedEntityType = relatedType,
            RelatedEntityId = relatedId,
            IsRead = false,
            CreatedAt = DateTime.Now
        };
        _db.Notifications.Add(item);
        await _db.SaveChangesAsync(cancellationToken);

        await _hub.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", new NotificationDto
        {
            NotificationId = item.NotificationId,
            Type = item.Type,
            Title = item.Title,
            Content = item.Content,
            RelatedEntityType = item.RelatedEntityType,
            RelatedEntityId = item.RelatedEntityId,
            IsRead = item.IsRead,
            CreatedAt = item.CreatedAt
        }, cancellationToken);
    }

    public async Task<List<NotificationDto>> ListAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                Type = n.Type,
                Title = n.Title,
                Content = n.Content,
                RelatedEntityType = n.RelatedEntityType,
                RelatedEntityId = n.RelatedEntityId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<int> UnreadCountAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
    }

    public async Task MarkReadAsync(int userId, int? notificationId, CancellationToken cancellationToken = default)
    {
        var query = _db.Notifications.Where(n => n.UserId == userId);
        if (notificationId.HasValue)
            query = query.Where(n => n.NotificationId == notificationId.Value);
        else
            query = query.Where(n => !n.IsRead);

        await query.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);
    }
}
