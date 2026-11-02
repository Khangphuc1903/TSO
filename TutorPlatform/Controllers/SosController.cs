using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize]
[Route("api/sos")]
public sealed class SosController : ControllerBase
{
    private readonly SosService _sos;

    public SosController(SosService sos) => _sos = sos;

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                     User.FindFirstValue("nameid") ??
                     User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpPost("requests")]
    [Authorize(Roles = "Student")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Create(
        [FromForm] CreateSosRequestDto dto,
        [FromForm] IFormFile image,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _sos.CreateRequestAsync(userId, dto, image, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("requests/open")]
    [Authorize(Roles = "Tutor")]
    public async Task<IActionResult> OpenRequests(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try { return Ok(await _sos.OpenRequestsAsync(userId, cancellationToken)); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
    }

    [HttpGet("requests/mine")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> MyRequests(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        return Ok(await _sos.MyRequestsAsync(userId, cancellationToken));
    }

    [HttpGet("requests/{requestId:int}")]
    [Authorize(Roles = "Student,Tutor")]
    public async Task<IActionResult> GetRequest(int requestId, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _sos.GetRequestAsync(
                userId, requestId, User.IsInRole("Tutor"), cancellationToken));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("requests/{requestId:int}/claim")]
    [Authorize(Roles = "Tutor")]
    public async Task<IActionResult> Claim(int requestId, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try { return Ok(await _sos.ClaimAsync(userId, requestId, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPut("ready")]
    [Authorize(Roles = "Tutor")]
    public async Task<IActionResult> SetReady([FromBody] SosReadyDto dto, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try
        {
            await _sos.SetReadyAsync(userId, dto.IsReady, cancellationToken);
            return Ok(new { isSosReady = dto.IsReady });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
    }

    [HttpGet("ready")]
    [Authorize(Roles = "Tutor")]
    public async Task<IActionResult> GetReady(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try { return Ok(await _sos.GetReadyAsync(userId, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("sessions/{sessionId:int}")]
    public async Task<IActionResult> Session(int sessionId, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try { return Ok(await _sos.GetSessionAsync(userId, sessionId, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("sessions/{sessionId:int}/end")]
    [Authorize(Roles = "Student,Tutor")]
    public async Task<IActionResult> EndSession(int sessionId, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _sos.EndSessionAsync(userId, sessionId, cancellationToken));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("heartbeat")]
    [Authorize(Roles = "Tutor")]
    public async Task<IActionResult> Heartbeat(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        try
        {
            await _sos.HeartbeatAsync(userId, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }
}
