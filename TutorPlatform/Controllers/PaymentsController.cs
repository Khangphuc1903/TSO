using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayOS.Models.Webhooks;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _paymentService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(PaymentService paymentService, ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    [Authorize(Roles = "Student,Parent")]
    [HttpPost("create-intent")]
    public async Task<IActionResult> CreateIntent([FromBody] CreatePaymentIntentRequest request, CancellationToken ct)
    {
        var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdVal, out var userId))
            return Unauthorized();

        var result = await _paymentService.CreatePaymentIntentAsync(userId, request, ct);
        return result.Success
            ? StatusCode(result.StatusCode, result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [Authorize]
    [HttpGet("booking/{bookingId:int}")]
    public async Task<IActionResult> GetByBooking(int bookingId, CancellationToken ct)
    {
        var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdVal, out var userId))
            return Unauthorized();

        var payment = await _paymentService.GetPaymentByBookingIdAsync(bookingId, userId, ct);
        if (payment == null)
            return NotFound(new { message = "Chưa có thông tin thanh toán cho buổi học này." });

        return Ok(payment);
    }

    [Authorize(Roles = "Student,Parent")]
    [HttpGet("booking/{bookingId:int}/refund-preview")]
    public async Task<IActionResult> GetRefundPreview(int bookingId, CancellationToken ct)
    {
        var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdVal, out var userId))
            return Unauthorized();

        var preview = await _paymentService.GetRefundPreviewAsync(bookingId, userId, ct);
        if (preview == null)
            return NotFound(new { message = "Không tìm thấy buổi học hoặc bạn không có quyền xem." });

        return Ok(preview);
    }

    [Authorize(Roles = "Student,Parent")]
    [HttpPost("booking/{bookingId:int}/cancel")]
    public async Task<IActionResult> CancelBooking(int bookingId, [FromBody] CancelBookingWithRefundRequest request, CancellationToken ct)
    {
        var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdVal, out var userId))
            return Unauthorized();

        var result = await _paymentService.CancelAndRefundBookingAsync(bookingId, userId, request?.Reason, ct);
        return result.Success
            ? StatusCode(result.StatusCode, new { message = result.Message })
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [AllowAnonymous]
    [HttpPost("payos-webhook")]
    public async Task<IActionResult> HandlePayOsWebhook([FromBody] Webhook body, CancellationToken ct)
    {
        _logger.LogInformation("Nhận Webhook từ PayOS: OrderCode={OrderCode}, Code={Code}", body?.Data?.OrderCode, body?.Code);
        if (body == null) return BadRequest("Dữ liệu webhook rỗng");
        var result = await _paymentService.ProcessPayOsWebhookAsync(body, ct);
        return Ok(new { success = result.Success, message = result.Message });
    }

    [AllowAnonymous]
    [HttpPost("confirm-webhook")]
    public async Task<IActionResult> ConfirmWebhook([FromBody] ConfirmWebhookRequest request)
    {
        try
        {
            var res = await _paymentService.ConfirmWebhookAsync(request.WebhookUrl);
            return Ok(new { message = "Xác nhận Webhook thành công với PayOS", data = res });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class ConfirmWebhookRequest
{
    public string WebhookUrl { get; set; } = string.Empty;
}
