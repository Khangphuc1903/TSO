using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/bookings")]
public class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [Authorize(Roles = "Student,Parent")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingDto dto, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
            return Unauthorized(new { message = "Không xác định được người dùng đăng nhập." });

        try
        {
            var result = await _bookingService.CreateFromSlotAsync(userId, dto, cancellationToken);
            return result.Success
                ? StatusCode(result.StatusCode, new { message = result.Message, booking = result.Data })
                : StatusCode(result.StatusCode, new { message = result.Message });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Không thể đặt lịch hiện tại. Vui lòng thử lại sau."
            });
        }
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
            return Unauthorized();
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "Student";
        var items = await _bookingService.ListMineAsync(userId, role, cancellationToken);
        await _bookingService.EnsureTodayRemindersAsync(userId, cancellationToken);
        return Ok(items);
    }

    [Authorize(Roles = "Tutor")]
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
            return Unauthorized();
        var result = await _bookingService.RejectAsync(userId, id, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [Authorize(Roles = "Tutor")]
    [HttpPost("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
            return Unauthorized();
        var result = await _bookingService.ConfirmAsync(userId, id, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.StatusCode, new { message = result.Message });
    }
}
