using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/study-groups")]
public class StudyGroupsController : ControllerBase
{
    private readonly StudyGroupService _service;
    private readonly GroupChatService _groupChat;

    public StudyGroupsController(StudyGroupService service, GroupChatService groupChat)
    {
        _service = service;
        _groupChat = groupChat;
    }

    private int? UserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("nameid")
                ?? User.FindFirstValue("sub");
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] StudyGroupSearchRequest request, CancellationToken cancellationToken)
    {
        var items = await _service.SearchAsync(request, cancellationToken);
        return Ok(new { totalCount = items.Count, items });
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _groupChat.ListMineAsync(id, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetAsync(id, UserId, cancellationToken);
        return item == null ? NotFound(new { message = "Không tìm thấy nhóm." }) : Ok(item);
    }

    [Authorize]
    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _groupChat.ListMessagesAsync(userId, id, cancellationToken));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> Send(int id, [FromBody] SendGroupMessageDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            var msg = await _groupChat.SendAsync(userId, id, dto.Content, cancellationToken);
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

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _service.CreateAsync(id, dto, cancellationToken);
        return result.Success
            ? StatusCode(result.Status, new { message = result.Message, group = result.Data })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> Join(int id, [FromBody] JoinStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.JoinAsync(userId, id, dto, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/join-requests/{applicantId:int}/respond")]
    public async Task<IActionResult> RespondJoin(int id, int applicantId, [FromBody] RespondJoinRequestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.RespondToJoinRequestAsync(userId, id, applicantId, dto.Accept, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/invite-tutor")]
    public async Task<IActionResult> Invite(int id, [FromBody] InviteTutorDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.InviteTutorAsync(userId, id, dto, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }
}
