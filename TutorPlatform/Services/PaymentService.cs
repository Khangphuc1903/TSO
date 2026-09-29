using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Hubs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class PaymentService
{
    private static readonly ConcurrentDictionary<long, PaymentIntentResponse> _intentCache = new();

    private readonly TutorPlatformDbContext _db;
    private readonly PayOSClient _payOS;
    private readonly IConfiguration _config;
    private readonly NotificationService _notifications;
    private readonly IHubContext<AppHub> _hub;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        TutorPlatformDbContext db,
        PayOSClient payOS,
        IConfiguration config,
        NotificationService notifications,
        IHubContext<AppHub> hub,
        ILogger<PaymentService> logger)
    {
        _db = db;
        _payOS = payOS;
        _config = config;
        _notifications = notifications;
        _hub = hub;
        _logger = logger;
    }

    public async Task<(bool Success, int StatusCode, string Message, PaymentIntentResponse? Data)> CreatePaymentIntentAsync(
        int studentId,
        CreatePaymentIntentRequest request,
        CancellationToken ct = default)
    {
        var booking = await _db.Bookings
            .Include(b => b.Tutor)
                .ThenInclude(t => t.Tutor)
            .Include(b => b.Subject)
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId, ct);

        if (booking == null)
            return (false, StatusCodes.Status404NotFound, "Không tìm thấy thông tin buổi học.", null);

        if (booking.StudentId != studentId)
            return (false, StatusCodes.Status403Forbidden, "Bạn không có quyền thanh toán cho buổi học này.", null);

        if (booking.Status == "Confirmed")
            return (false, StatusCodes.Status400BadRequest, "Buổi học này đã được xác nhận thanh toán rồi.", null);

        if (booking.Status == "Cancelled" || booking.Status == "Rejected")
            return (false, StatusCodes.Status400BadRequest, "Buổi học này đã bị hủy hoặc từ chối.", null);

        var existingSuccess = await _db.Payments
            .FirstOrDefaultAsync(p => p.BookingId == booking.BookingId && p.Status == "Success", ct);
        if (existingSuccess != null)
            return (false, StatusCodes.Status400BadRequest, "Buổi học này đã được thanh toán thành công trước đó.", null);

        var tutorName = booking.Tutor?.Tutor?.FullName ?? "Gia sư";
        var subjectName = booking.Subject?.SubjectName ?? "Môn học";
        var desc = $"TSG Buoi hoc #{booking.BookingId}";
        if (desc.Length > 25) desc = $"TSG #{booking.BookingId}";

        long amountInt = (long)Math.Round(booking.Price, 0);
        if (amountInt <= 0) amountInt = 10000;

        // Tái sử dụng payment link gần đây (dưới 14 phút) nếu còn hiệu lực để tránh tạo trùng nhiều đơn trên PayOS
        var recentPending = await _db.Payments
            .Where(p => p.BookingId == booking.BookingId && p.Status == "Pending" && p.CreatedAt >= DateTime.UtcNow.AddMinutes(-14))
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (recentPending != null && !string.IsNullOrEmpty(recentPending.PaymentUrl))
        {
            if (long.TryParse(recentPending.TransactionCode, out var existingOrderCode))
            {
                if (_intentCache.TryGetValue(existingOrderCode, out var cachedIntent))
                {
                    return (true, StatusCodes.Status200OK, "Sử dụng lại mã thanh toán VietQR còn hiệu lực.", cachedIntent);
                }

                string bin = "";
                string accNum = "";
                string accName = "";
                if (!string.IsNullOrEmpty(recentPending.GatewayTransactionId))
                {
                    var parts = recentPending.GatewayTransactionId.Split('|');
                    if (parts.Length > 0) bin = parts[0];
                    if (parts.Length > 1) accNum = parts[1];
                    if (parts.Length > 2) accName = parts[2];
                }

                var qrImg = !string.IsNullOrEmpty(bin) && !string.IsNullOrEmpty(accNum)
                    ? $"https://img.vietqr.io/image/{bin}-{accNum}-compact2.png?amount={amountInt}&addInfo={Uri.EscapeDataString(desc)}&accountName={Uri.EscapeDataString(accName)}"
                    : string.Empty;

                var recoveredIntent = new PaymentIntentResponse
                {
                    PaymentId = recentPending.PaymentId,
                    BookingId = booking.BookingId,
                    OrderCode = existingOrderCode,
                    CheckoutUrl = recentPending.PaymentUrl,
                    QrCode = recentPending.GatewayResponseCode ?? string.Empty,
                    Bin = bin,
                    AccountNumber = accNum,
                    AccountName = accName,
                    Description = desc,
                    QrImageUrl = qrImg,
                    Amount = recentPending.Amount,
                    Status = recentPending.Status
                };

                _intentCache[existingOrderCode] = recoveredIntent;
                return (true, StatusCodes.Status200OK, "Sử dụng lại mã thanh toán VietQR còn hiệu lực.", recoveredIntent);
            }
        }

        // Sinh orderCode duy nhất dạng long theo timestamp + bookingId
        long orderCode = long.Parse($"{DateTime.UtcNow:yyMMddHHmmss}{booking.BookingId % 1000:D3}");

        var returnUrl = _config["PayOS:ReturnUrl"] ?? "http://localhost:5173/payment/result";
        var cancelUrl = _config["PayOS:CancelUrl"] ?? "http://localhost:5173/checkout";

        var paymentReq = new CreatePaymentLinkRequest
        {
            OrderCode = orderCode,
            Amount = amountInt,
            Description = desc,
            Items = new List<PaymentLinkItem>
            {
                new PaymentLinkItem
                {
                    Name = $"Hoc phi {subjectName} ({tutorName})",
                    Quantity = 1,
                    Price = amountInt
                }
            },
            CancelUrl = $"{cancelUrl}/{booking.BookingId}?cancelled=true",
            ReturnUrl = $"{returnUrl}?orderCode={orderCode}&bookingId={booking.BookingId}"
        };

        CreatePaymentLinkResponse result;
        try
        {
            result = await _payOS.PaymentRequests.CreateAsync(paymentReq);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi tạo payment link từ PayOS cho booking #{BookingId}", booking.BookingId);
            return (false, StatusCodes.Status502BadGateway, $"Lỗi kết nối cổng thanh toán PayOS: {ex.Message}", null);
        }

        var payment = new Payment
        {
            BookingId = booking.BookingId,
            PayerUserId = studentId,
            Amount = booking.Price,
            PaymentMethod = "PayOS",
            TransactionCode = orderCode.ToString(),
            Status = "Pending",
            PaymentUrl = result.CheckoutUrl,
            GatewayResponseCode = result.QrCode,
            GatewayTransactionId = $"{result.Bin}|{result.AccountNumber}|{result.AccountName}",
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync(ct);

        var qrImageUrl = !string.IsNullOrEmpty(result.Bin) && !string.IsNullOrEmpty(result.AccountNumber)
            ? $"https://img.vietqr.io/image/{result.Bin}-{result.AccountNumber}-compact2.png?amount={amountInt}&addInfo={Uri.EscapeDataString(desc)}&accountName={Uri.EscapeDataString(result.AccountName ?? "")}"
            : string.Empty;

        var intentResponse = new PaymentIntentResponse
        {
            PaymentId = payment.PaymentId,
            BookingId = booking.BookingId,
            OrderCode = orderCode,
            CheckoutUrl = result.CheckoutUrl,
            QrCode = result.QrCode ?? string.Empty,
            Bin = result.Bin ?? string.Empty,
            AccountNumber = result.AccountNumber ?? string.Empty,
            AccountName = result.AccountName ?? string.Empty,
            Description = result.Description ?? desc,
            QrImageUrl = qrImageUrl,
            Amount = booking.Price,
            Status = payment.Status
        };

        _intentCache[orderCode] = intentResponse;

        return (true, StatusCodes.Status200OK, "Tạo link thanh toán VietQR thành công.", intentResponse);
    }

    public async Task<(bool Success, string Message)> ProcessPayOsWebhookAsync(Webhook webhookBody, CancellationToken ct = default)
    {
        WebhookData verifiedData;
        try
        {
            verifiedData = await _payOS.Webhooks.VerifyAsync(webhookBody);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chữ ký webhook PayOS không hợp lệ.");
            return (false, "Chữ ký không hợp lệ: " + ex.Message);
        }

        var orderCodeStr = verifiedData.OrderCode.ToString();
        var payment = await _db.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.TransactionCode == orderCodeStr, ct);

        if (payment == null)
        {
            _logger.LogWarning("Không tìm thấy Payment với TransactionCode = {OrderCode}", orderCodeStr);
            return (true, "Đã nhận webhook nhưng không tìm thấy mã đơn nội bộ");
        }

        // Idempotency: Nếu đã thành công trước đó thì bỏ qua, không xử lý trùng
        if (payment.Status == "Success")
        {
            return (true, "Giao dịch đã được ghi nhận thành công trước đó.");
        }

        if (webhookBody.Code == "00") // Thanh toán thành công
        {
            using var tx = await _db.Database.BeginTransactionAsync(ct);
            payment.Status = "Success";
            payment.PaidAt = DateTime.UtcNow;
            payment.CallbackReceivedAt = DateTime.UtcNow;
            payment.GatewayTransactionId = verifiedData.Reference;
            payment.GatewayResponseCode = webhookBody.Code;

            // In escrow model (Giải pháp 1): tiền được tạm giữ (payment.Status = "Success"),
            // booking.Status giữ nguyên là "Pending" để gia sư duyệt xác nhận hoặc từ chối.
            // Nếu gia sư bấm duyệt thì chuyển thành "Confirmed", nếu từ chối thì tự động hoàn tiền 100%.

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            // Bắn SignalR realtime thông báo tới Payer và Tutor
            if (payment.Booking != null)
            {
                await _notifications.NotifyAsync(
                    payment.PayerUserId,
                    "PaymentSuccess",
                    "Thanh toán tạm giữ thành công!",
                    $"Hệ thống đã nhận tạm giữ học phí {payment.Amount:N0} ₫ cho buổi học #{payment.BookingId}. Vui lòng chờ gia sư duyệt lịch.",
                    "Booking",
                    payment.BookingId,
                    ct);

                await _notifications.NotifyAsync(
                    payment.Booking.TutorId,
                    "BookingPaid",
                    "Học viên đã thanh toán tiền giữ chỗ",
                    $"Học viên đã hoàn tất thanh toán tạm giữ {payment.Amount:N0} ₫ cho buổi học #{payment.BookingId}. Vui lòng kiểm tra và xác nhận hoặc từ chối.",
                    "Booking",
                    payment.BookingId,
                    ct);

                // Phát trực tiếp sự kiện PaymentSucceeded cho màn hình Checkout của học viên
                await _hub.Clients.User(payment.PayerUserId.ToString()).SendAsync("PaymentSucceeded", new
                {
                    bookingId = payment.BookingId,
                    amount = payment.Amount,
                    orderCode = verifiedData.OrderCode
                }, ct);
            }
        }
        else
        {
            payment.Status = "Failed";
            payment.GatewayResponseCode = webhookBody.Code;
            payment.CallbackReceivedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return (true, "Xử lý webhook thành công.");
    }

    public async Task<PaymentStatusDto?> GetPaymentByBookingIdAsync(int bookingId, int userId, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.BookingId == bookingId, ct);
        if (booking == null || (booking.StudentId != userId && booking.TutorId != userId))
            return null;

        var successOrRefunded = await _db.Payments
            .Where(p => p.BookingId == bookingId && (p.Status == "Success" || p.Status == "Refunded" || p.Status == "PartiallyRefunded"))
            .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var payment = successOrRefunded ?? await _db.Payments
            .Where(p => p.BookingId == bookingId)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (payment == null)
            return null;

        // Tự động kiểm tra trực tiếp từ PayOS nếu payment vẫn đang ở trạng thái Pending
        if (payment.Status == "Pending" && long.TryParse(payment.TransactionCode, out var orderCode))
        {
            try
            {
                var payOsInfo = await _payOS.PaymentRequests.GetAsync(orderCode);
                if (payOsInfo != null && (payOsInfo.Status == PaymentLinkStatus.Paid || payOsInfo.AmountPaid >= payment.Amount))
                {
                    _logger.LogInformation("Khớp lệnh tự động từ PayOS thành công cho booking #{BookingId}, orderCode={OrderCode}", bookingId, orderCode);
                    payment.Status = "Success";
                    payment.PaidAt = DateTime.UtcNow;
                    payment.CallbackReceivedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync(ct);

                    await _notifications.NotifyAsync(
                        payment.PayerUserId,
                        "PaymentSuccess",
                        "Thanh toán tạm giữ thành công!",
                        $"Hệ thống đã nhận tạm giữ học phí {payment.Amount:N0} ₫ cho buổi học #{payment.BookingId}. Vui lòng chờ gia sư duyệt lịch.",
                        "Booking",
                        payment.BookingId,
                        ct);

                    await _notifications.NotifyAsync(
                        booking.TutorId,
                        "BookingPaid",
                        "Học viên đã thanh toán tiền giữ chỗ",
                        $"Học viên đã hoàn tất thanh toán tạm giữ {payment.Amount:N0} ₫ cho buổi học #{payment.BookingId}. Vui lòng kiểm tra và xác nhận hoặc từ chối.",
                        "Booking",
                        payment.BookingId,
                        ct);

                    await _hub.Clients.User(payment.PayerUserId.ToString()).SendAsync("PaymentSucceeded", new
                    {
                        bookingId = payment.BookingId,
                        amount = payment.Amount,
                        orderCode = orderCode
                    }, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Không thể kiểm tra PayOS cho orderCode {OrderCode}: {Message}", orderCode, ex.Message);
            }
        }

        return new PaymentStatusDto
        {
            PaymentId = payment.PaymentId,
            BookingId = payment.BookingId,
            TransactionCode = payment.TransactionCode,
            Status = payment.Status,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            PaidAt = payment.PaidAt,
            CreatedAt = payment.CreatedAt
        };
    }

    public async Task<RefundPreviewDto?> GetRefundPreviewAsync(int bookingId, int userId, CancellationToken ct = default)
    {
        var booking = await _db.Bookings
            .Include(b => b.Tutor)
                .ThenInclude(t => t.CancellationPolicies)
                    .ThenInclude(cp => cp.RefundRules)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct);

        if (booking == null || booking.StudentId != userId)
            return null;

        var startDateTime = booking.ScheduledDate.ToDateTime(booking.StartTime);
        var hoursRemaining = (startDateTime - DateTime.Now).TotalHours;

        var policy = booking.Tutor?.CancellationPolicies?.FirstOrDefault();
        decimal refundPercentage = 0m;
        string policyType = policy?.PolicyType ?? "Moderate";
        string description = policy?.Description ?? "Chính sách hủy chuẩn: Hủy trước 24h hoàn 100%, trước 12-24h hoàn 50%, dưới 12h không hoàn tiền.";

        if (booking.Status == "Pending")
        {
            refundPercentage = 100m;
            description = "Buổi học đang chờ gia sư duyệt. Bạn được hoàn tiền 100% khi hủy ở trạng thái này.";
        }
        else if (policy != null && policy.RefundRules.Any())
        {
            var matchedRule = policy.RefundRules
                .Where(r => hoursRemaining >= r.MinHoursBeforeStart)
                .OrderByDescending(r => r.MinHoursBeforeStart)
                .FirstOrDefault();

            refundPercentage = matchedRule?.RefundPercentage ?? 0m;
        }
        else
        {
            // Default Moderate Policy
            if (hoursRemaining >= 24) refundPercentage = 100m;
            else if (hoursRemaining >= 12) refundPercentage = 50m;
            else refundPercentage = 0m;
        }

        var refundAmount = Math.Round(booking.Price * (refundPercentage / 100m), 0);

        return new RefundPreviewDto
        {
            BookingId = booking.BookingId,
            OriginalPrice = booking.Price,
            HoursRemaining = Math.Round(hoursRemaining, 1),
            RefundPercentage = refundPercentage,
            RefundAmount = refundAmount,
            PolicyType = policyType,
            Description = description
        };
    }

    public async Task<(bool Success, int StatusCode, string Message)> CancelAndRefundBookingAsync(
        int bookingId,
        int userId,
        string? reason,
        CancellationToken ct = default)
    {
        var booking = await _db.Bookings
            .Include(b => b.Slot)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct);

        if (booking == null)
            return (false, StatusCodes.Status404NotFound, "Không tìm thấy buổi học.");

        if (booking.StudentId != userId)
            return (false, StatusCodes.Status403Forbidden, "Bạn không có quyền hủy buổi học này.");

        if (booking.Status == "Cancelled")
            return (false, StatusCodes.Status400BadRequest, "Buổi học này đã được hủy trước đó.");

        if (booking.Status == "Completed")
            return (false, StatusCodes.Status400BadRequest, "Buổi học đã hoàn thành, không thể hủy.");

        var preview = await GetRefundPreviewAsync(bookingId, userId, ct);
        if (preview == null)
            return (false, StatusCodes.Status400BadRequest, "Không thể tính toán chính sách hoàn tiền.");

        using var tx = await _db.Database.BeginTransactionAsync(ct);

        booking.Status = "Cancelled";
        booking.CancelledBy = userId;
        booking.CancellationReason = reason ?? "Học viên chủ động hủy";

        // Giải phóng slot nếu slot riêng lẻ
        if (booking.Slot != null && !booking.Slot.IsRecurring)
        {
            booking.Slot.IsBooked = false;
        }

        // Tìm payment thành công nếu có
        var successPayment = booking.Payments.FirstOrDefault(p => p.Status == "Success");
        if (successPayment != null)
        {
            var refund = new Refund
            {
                PaymentId = successPayment.PaymentId,
                BookingId = booking.BookingId,
                Amount = preview.RefundAmount,
                RefundPercent = preview.RefundPercentage,
                Reason = reason ?? "Học viên hủy lịch",
                Status = "Processed",
                ProcessedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            _db.Refunds.Add(refund);

            successPayment.Status = (preview.RefundPercentage >= 100m) ? "Refunded" : "PartiallyRefunded";
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // Thông báo cho gia sư
        await _notifications.NotifyAsync(
            booking.TutorId,
            "BookingCancelled",
            "Buổi học đã bị hủy",
            $"Học viên đã hủy buổi học #{booking.BookingId}. Lý do: {booking.CancellationReason}",
            "Booking",
            booking.BookingId,
            ct);

        return (true, StatusCodes.Status200OK, $"Hủy buổi học thành công. Bạn được hoàn {preview.RefundPercentage}% ({preview.RefundAmount:N0} ₫).");
    }

    public async Task<string> ConfirmWebhookAsync(string webhookUrl)
    {
        var res = await _payOS.Webhooks.ConfirmAsync(webhookUrl);
        return res?.WebhookUrl ?? webhookUrl;
    }
}
