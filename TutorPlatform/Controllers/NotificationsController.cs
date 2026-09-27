using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _service;
    public NotificationsController(NotificationService service) => _service = service;

    private int? UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var items = await _service.ListAsync(id, cancellationToken);
        var unread = items.Count(x => !x.IsRead);
        return Ok(new { unreadCount = unread, items });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> Read(int id, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        await _service.MarkReadAsync(userId, id, cancellationToken);
        return Ok(new { message = "Đã đọc." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll(CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        await _service.MarkReadAsync(userId, null, cancellationToken);
        return Ok(new { message = "Đã đọc tất cả." });
    }
}
