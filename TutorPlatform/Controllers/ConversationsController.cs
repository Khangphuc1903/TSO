using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize]
[Route("api/conversations")]
public class ConversationsController : ControllerBase
{
    private readonly ChatService _chat;
    public ConversationsController(ChatService chat) => _chat = chat;

    private int? UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _chat.ListAsync(id, cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Open([FromBody] OpenConversationDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        try
        {
            var conv = await _chat.GetOrCreateAsync(id, dto.OtherUserId, dto.BookingId, cancellationToken);
            return Ok(new { conversationId = conv.ConversationId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _chat.MessagesAsync(userId, id, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Không tìm thấy cuộc trò chuyện." });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> Send(int id, [FromBody] SendMessageDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            var msg = await _chat.SendAsync(userId, id, dto.Content, cancellationToken);
            return Ok(msg);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
