using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize(Roles = "Tutor")]
[Route("api/tutor/me")]
public class TutorMeController : ControllerBase
{
    private readonly TutorWorkspaceService _workspace;
    private readonly StudyGroupService _groups;
    private readonly TutorTestService _tests;

    public TutorMeController(TutorWorkspaceService workspace, StudyGroupService groups, TutorTestService tests)
    {
        _workspace = workspace;
        _groups = groups;
        _tests = tests;
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
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _workspace.GetWorkspaceAsync(id, cancellationToken));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateTutorTeachingProfileDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _workspace.UpdateProfileAsync(id, dto, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message, workspace = result.Data })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpPost("certificates")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 10_000_000)]
    public async Task<IActionResult> UploadCertificate(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var file = Request.Form.Files.GetFile("file") ?? Request.Form.Files.FirstOrDefault();
        var certificateName = Request.Form["certificateName"].ToString();
        var issuedBy = Request.Form["issuedBy"].ToString();
        var issuedDate = Request.Form["issuedDate"].ToString();
        var result = await _workspace.UploadCertificateAsync(
            id,
            certificateName,
            string.IsNullOrWhiteSpace(issuedBy) ? null : issuedBy,
            string.IsNullOrWhiteSpace(issuedDate) ? null : issuedDate,
            file,
            cancellationToken);
        return result.Success
            ? StatusCode(result.Status, new { message = result.Message, certificate = result.Data })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpDelete("certificates/{certificateId:int}")]
    public async Task<IActionResult> DeleteCertificate(int certificateId, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _workspace.DeleteCertificateAsync(id, certificateId, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpPost("slots")]
    public async Task<IActionResult> CreateSlot([FromBody] CreateAvailabilitySlotDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _workspace.CreateSlotAsync(id, dto, cancellationToken);
        return result.Success
            ? StatusCode(result.Status, new { message = result.Message, slot = result.Data })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpDelete("slots/{slotId:int}")]
    public async Task<IActionResult> DeleteSlot(int slotId, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _workspace.DeleteSlotAsync(id, slotId, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpGet("invites")]
    public async Task<IActionResult> Invites(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _groups.ListInvitesForTutorAsync(id, cancellationToken));
    }

    [HttpPost("invites/{groupId:int}/respond")]
    public async Task<IActionResult> Respond(int groupId, [FromBody] RespondMentorInviteDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _groups.RespondToInviteAsync(id, groupId, dto.Accept, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpGet("tests")]
    public async Task<IActionResult> Tests(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _tests.ListTestsAsync(id, cancellationToken));
    }

    [HttpGet("tests/catalog")]
    public async Task<IActionResult> TestCatalog(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _tests.ListCatalogAsync(id, cancellationToken));
    }

    [HttpGet("tests/history")]
    public async Task<IActionResult> TestHistory(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _tests.ListAttemptsAsync(id, cancellationToken));
    }

    [HttpGet("tests/pedagogical/status")]
    public async Task<IActionResult> PedagogicalTestStatus(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _tests.GetPedagogicalTestStatusAsync(id, cancellationToken));
    }

    [HttpGet("tests/pedagogical/questions")]
    public async Task<IActionResult> PedagogicalTestQuestions(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.GetPedagogicalTestQuestionsAsync(id, cancellationToken);
        return result.Success
            ? Ok(result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [HttpPost("tests/pedagogical/submit")]
    public async Task<IActionResult> SubmitPedagogicalTest(
        [FromBody] SubmitTutorPedagogicalTestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.SubmitPedagogicalTestAsync(id, dto, cancellationToken);
        return result.Success
            ? Ok(result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [HttpGet("tests/grades")]
    public async Task<IActionResult> TestGrades([FromQuery] int subjectId, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _tests.ListGradesAsync(id, subjectId, cancellationToken));
    }

    [HttpGet("tests/status")]
    public async Task<IActionResult> TestStatus(
        [FromQuery] int subjectId, [FromQuery] string gradeLevel, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.GetTestStatusAsync(id, subjectId, gradeLevel, cancellationToken);
        return result.Success
            ? Ok(result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [HttpGet("tests/questions")]
    public async Task<IActionResult> TestQuestions(
        [FromQuery] int subjectId, [FromQuery] string gradeLevel, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.GetQuestionsAsync(id, subjectId, gradeLevel, cancellationToken);
        return result.Success
            ? Ok(result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [HttpPost("tests/submit")]
    public async Task<IActionResult> SubmitTest([FromBody] SubmitTutorTestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.SubmitAsync(id, dto, cancellationToken);
        return result.Success
            ? Ok(result.Data)
            : StatusCode(result.StatusCode, new { message = result.Message });
    }

    [HttpPost("tests/register")]
    public async Task<IActionResult> RegisterTestCombination(
        [FromBody] RegisterTestCombinationDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _tests.RegisterCombinationAsync(id, dto, cancellationToken);
        return result.Success
            ? Ok(new { message = result.Message })
            : StatusCode(result.StatusCode, new { message = result.Message });
    }
}
