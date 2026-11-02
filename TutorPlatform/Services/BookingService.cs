using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class BookingService
{
    private readonly TutorPlatformDbContext _db;
    private readonly NotificationService _notifications;

    public BookingService(TutorPlatformDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<(bool Success, int StatusCode, string Message, object? Data)> CreateFromSlotAsync(
        int studentId,
        CreateBookingDto dto,
        CancellationToken cancellationToken = default)
    {
        if (studentId == dto.TutorId)
            return (false, StatusCodes.Status400BadRequest, "Bạn không thể đặt lịch với chính mình.", null);

        var slot = await _db.AvailabilitySlots
            .Include(s => s.Tutor)
                .ThenInclude(tp => tp.Tutor)
            .FirstOrDefaultAsync(s => s.SlotId == dto.SlotId && s.TutorId == dto.TutorId, cancellationToken);

        if (slot == null)
            return (false, StatusCodes.Status404NotFound, "Không tìm thấy lịch trống của gia sư.", null);

        if (!slot.IsRecurring && slot.IsBooked)
            return (false, StatusCodes.Status409Conflict, "Khung giờ này đã được đặt.", null);

        var teachesSubject = await _db.TutorSubjects
            .AnyAsync(ts => ts.TutorId == dto.TutorId && ts.SubjectId == dto.SubjectId, cancellationToken);

        if (!teachesSubject)
            return (false, StatusCodes.Status400BadRequest, "Gia sư không dạy môn học này.", null);

        DateOnly scheduledDate;
        if (slot.SpecificDate.HasValue)
        {
            scheduledDate = slot.SpecificDate.Value;
        }
        else if (dto.ScheduledDate.HasValue)
        {
            scheduledDate = dto.ScheduledDate.Value;
            if (slot.DayOfWeek.HasValue && !MatchesDay(slot.DayOfWeek.Value, scheduledDate))
                return (false, StatusCodes.Status400BadRequest, "Ngày chọn không khớp thứ trong lịch của gia sư.", null);
        }
        else
        {
            return (false, StatusCodes.Status400BadRequest, "Vui lòng chọn ngày học cho khung giờ lặp lại.", null);
        }

        if (scheduledDate < DateOnly.FromDateTime(DateTime.Today))
            return (false, StatusCodes.Status400BadRequest, "Không thể đặt lịch trong quá khứ.", null);

        var overlap = await _db.Bookings.AnyAsync(b =>
            b.SlotId == slot.SlotId &&
            b.ScheduledDate == scheduledDate &&
            b.Status != "Cancelled" &&
            b.Status != "Rejected", cancellationToken);

        if (overlap)
            return (false, StatusCodes.Status409Conflict, "Khung giờ ngày này đã có người đặt.", null);

        var mode = string.IsNullOrWhiteSpace(dto.TeachingMode)
            ? slot.Tutor.TeachingMode
            : dto.TeachingMode.Trim();

        var hours = (slot.EndTime.ToTimeSpan() - slot.StartTime.ToTimeSpan()).TotalHours;
        if (hours <= 0) hours = 1;
        var hourlyMin = slot.Tutor.HourlyRateMin ?? slot.Tutor.HourlyRateMax ?? 0;
        var hourlyMax = slot.Tutor.HourlyRateMax ?? slot.Tutor.HourlyRateMin ?? hourlyMin;
        if (hourlyMax < hourlyMin) hourlyMax = hourlyMin;
        var sessionMin = Math.Round((decimal)hours * hourlyMin, 0);
        var sessionMax = Math.Round((decimal)hours * hourlyMax, 0);
        decimal price;
        if (dto.Price.HasValue)
        {
            price = Math.Round(dto.Price.Value, 0);
            if (price < sessionMin || price > sessionMax)
                return (false, StatusCodes.Status400BadRequest,
                    $"Giá buổi học phải trong khoảng {sessionMin:N0} – {sessionMax:N0} ₫.", null);
        }
        else
        {
            price = sessionMin;
        }

        var booking = new Booking
        {
            StudentId = studentId,
            TutorId = dto.TutorId,
            SubjectId = dto.SubjectId,
            SlotId = slot.SlotId,
            ScheduledDate = scheduledDate,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            TeachingMode = mode,
            Location = slot.Tutor.Tutor?.City,
            Price = price,
            Status = "Pending",
            CreatedAt = DateTime.Now
        };

        _db.Bookings.Add(booking);

        if (!slot.IsRecurring)
            slot.IsBooked = true;

        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyAsync(
            dto.TutorId,
            "BookingRequest",
            "Yêu cầu đặt lịch mới",
            "Một học viên vừa đặt lịch với bạn. Hãy xác nhận buổi học.",
            "Booking",
            booking.BookingId,
            cancellationToken);

        return (true, StatusCodes.Status201Created, "Đặt lịch thành công.", new
        {
            booking.BookingId,
            booking.TutorId,
            booking.SlotId,
            booking.SubjectId,
            scheduledDate = booking.ScheduledDate.ToString("yyyy-MM-dd"),
            startTime = booking.StartTime.ToString("HH:mm"),
            endTime = booking.EndTime.ToString("HH:mm"),
            booking.TeachingMode,
            booking.Price,
            booking.Status
        });
    }

    public async Task<List<BookingListItemDto>> ListMineAsync(int userId, string role, CancellationToken cancellationToken)
    {
        var query = _db.Bookings
            .AsNoTracking()
            .Include(b => b.Student)
            .Include(b => b.Tutor).ThenInclude(t => t.Tutor)
            .Include(b => b.Subject)
            .Include(b => b.Payments)
            .AsQueryable();

        query = role.Equals("Tutor", StringComparison.OrdinalIgnoreCase)
            ? query.Where(b => b.TutorId == userId)
            : query.Where(b => b.StudentId == userId);

        var items = await query.OrderByDescending(b => b.ScheduledDate).ToListAsync(cancellationToken);
        return items.Select(b =>
        {
            var successOrRefunded = b.Payments
                .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
                .FirstOrDefault(p => p.Status is "Success" or "Refunded" or "PartiallyRefunded");
            var lastPayment = successOrRefunded ?? b.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            return new BookingListItemDto
            {
                BookingId = b.BookingId,
                StudentId = b.StudentId,
                TutorId = b.TutorId,
                StudentName = b.Student.FullName,
                TutorName = b.Tutor.Tutor.FullName,
                SubjectName = b.Subject.SubjectName,
                ScheduledDate = b.ScheduledDate.ToString("yyyy-MM-dd"),
                StartTime = b.StartTime.ToString("HH:mm"),
                EndTime = b.EndTime.ToString("HH:mm"),
                Status = b.Status,
                Price = b.Price,
                TeachingMode = b.TeachingMode,
                Location = b.Location,
                IsToday = b.ScheduledDate == DateOnly.FromDateTime(DateTime.Today),
                PaymentStatus = lastPayment?.Status ?? (b.Status == "Confirmed" ? "Success" : "Unpaid"),
                PaymentUrl = lastPayment?.PaymentUrl
            };
        }).ToList();
    }

    public async Task<(bool Success, int StatusCode, string Message)> RejectAsync(int tutorId, int bookingId, CancellationToken cancellationToken)
    {
        var booking = await _db.Bookings
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.TutorId == tutorId, cancellationToken);
        if (booking == null)
            return (false, 404, "Không tìm thấy booking.");
        if (booking.Status != "Pending")
            return (false, 400, "Chỉ từ chối được đơn đang chờ xác nhận.");

        using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

        booking.Status = "Rejected";
        booking.CancelledAt = DateTime.Now;
        booking.CancelledBy = tutorId;
        if (booking.SlotId is int slotId)
        {
            var slot = await _db.AvailabilitySlots.FirstOrDefaultAsync(s => s.SlotId == slotId, cancellationToken);
            if (slot is { IsRecurring: false })
                slot.IsBooked = false;
        }

        // Tự động hoàn tiền 100% nếu học viên đã thanh toán tiền giữ chỗ
        var successPayment = booking.Payments.FirstOrDefault(p => p.Status == "Success");
        if (successPayment != null)
        {
            var refund = new Refund
            {
                PaymentId = successPayment.PaymentId,
                BookingId = booking.BookingId,
                Amount = successPayment.Amount,
                RefundPercent = 100m,
                Reason = "Gia sư từ chối đơn đặt lịch",
                Status = "Processed",
                ProcessedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            _db.Refunds.Add(refund);
            successPayment.Status = "Refunded";
        }

        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        var notifyMsg = successPayment != null
            ? $"Gia sư đã từ chối buổi học ngày {booking.ScheduledDate:dd/MM/yyyy}. Số tiền {successPayment.Amount:N0} ₫ giữ chỗ của bạn đã được hệ thống tự động hoàn trả 100%."
            : $"Buổi {booking.ScheduledDate:dd/MM/yyyy} không được xác nhận. Bạn có thể đặt khung giờ khác.";

        await _notifications.NotifyAsync(
            booking.StudentId,
            "BookingRejected",
            "Gia sư đã từ chối buổi học",
            notifyMsg,
            "Booking",
            booking.BookingId,
            cancellationToken);

        return (true, 200, successPayment != null 
            ? "Đã từ chối đơn đặt lịch và tự động hoàn trả 100% tiền giữ chỗ cho học viên." 
            : "Đã từ chối đơn đặt lịch.");
    }

    public async Task EnsureTodayRemindersAsync(int userId, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var bookings = await _db.Bookings
            .Where(b =>
                (b.StudentId == userId || b.TutorId == userId) &&
                b.ScheduledDate == today &&
                (b.Status == "Confirmed" || b.Status == "Pending"))
            .ToListAsync(cancellationToken);

        foreach (var booking in bookings)
        {
            var exists = await _db.Notifications.AnyAsync(n =>
                n.UserId == userId &&
                n.Type == "LessonReminder" &&
                n.RelatedEntityType == "Booking" &&
                n.RelatedEntityId == booking.BookingId, cancellationToken);
            if (exists) continue;

            var isTutor = booking.TutorId == userId;
            await _notifications.NotifyAsync(
                userId,
                "LessonReminder",
                isTutor ? "Nhắc lịch dạy hôm nay" : "Nhắc lịch học hôm nay",
                $"Hôm nay bạn có buổi lúc {booking.StartTime:HH\\:mm}.",
                "Booking",
                booking.BookingId,
                cancellationToken);
        }
    }

    public async Task<(bool Success, int StatusCode, string Message)> ConfirmAsync(int tutorId, int bookingId, CancellationToken cancellationToken)
    {
        var booking = await _db.Bookings
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.TutorId == tutorId, cancellationToken);
        if (booking == null)
            return (false, 404, "Không tìm thấy booking.");
        if (booking.Status != "Pending")
            return (false, 400, "Booking không ở trạng thái chờ xác nhận.");

        var hasPaid = booking.Payments.Any(p => p.Status == "Success");
        if (booking.Price > 0 && !hasPaid)
        {
            return (false, 400, "Học viên chưa hoàn tất thanh toán tiền giữ chỗ. Vui lòng chờ học viên thanh toán trước khi duyệt.");
        }

        booking.Status = "Confirmed";
        booking.ConfirmedAt = DateTime.Now;
        if (booking.SlotId is int slotId)
        {
            var slot = await _db.AvailabilitySlots.FirstOrDefaultAsync(s => s.SlotId == slotId, cancellationToken);
            if (slot is { IsRecurring: false })
                slot.IsBooked = true;
        }
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyAsync(
            booking.StudentId,
            "BookingConfirmed",
            "Gia sư đã xác nhận buổi học",
            $"Buổi học ngày {booking.ScheduledDate:dd/MM/yyyy} ({booking.StartTime:HH\\:mm}-{booking.EndTime:HH\\:mm}) đã được xác nhận.",
            "Booking",
            booking.BookingId,
            cancellationToken);

        return (true, 200, "Đã xác nhận buổi học.");
    }

    private static bool MatchesDay(byte slotDay, DateOnly date)
    {
        var sundayZero = (int)date.DayOfWeek;
        var mondayOne = sundayZero == 0 ? 7 : sundayZero;
        var sundayOne = sundayZero + 1;
        return slotDay == sundayZero || slotDay == mondayOne || slotDay == sundayOne;
    }
}
