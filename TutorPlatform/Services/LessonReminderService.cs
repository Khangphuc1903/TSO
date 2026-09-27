using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;

namespace TutorPlatform.Services;

public class LessonReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<LessonReminderService> _logger;

    public LessonReminderService(IServiceScopeFactory scopes, ILogger<LessonReminderService> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendReminders(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lesson reminder failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task SendReminders(CancellationToken cancellationToken)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<NotificationService>();
        var today = DateOnly.FromDateTime(DateTime.Today);

        var bookings = await db.Bookings
            .Where(b => b.ScheduledDate == today && (b.Status == "Confirmed" || b.Status == "Pending"))
            .ToListAsync(cancellationToken);

        foreach (var booking in bookings)
        {
            var exists = await db.Notifications.AnyAsync(n =>
                n.Type == "LessonReminder" &&
                n.RelatedEntityType == "Booking" &&
                n.RelatedEntityId == booking.BookingId, cancellationToken);
            if (exists) continue;

            var body = $"Hôm nay bạn có buổi học lúc {booking.StartTime:HH\\:mm}.";
            await notifications.NotifyAsync(booking.StudentId, "LessonReminder", "Nhắc lịch học hôm nay", body, "Booking", booking.BookingId, cancellationToken);
            await notifications.NotifyAsync(booking.TutorId, "LessonReminder", "Nhắc lịch dạy hôm nay", body, "Booking", booking.BookingId, cancellationToken);
        }
    }
}
