using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/ai")]
public class AiMatchController : ControllerBase
{
    private readonly AiMatchmakerService _aiService;
    private readonly ILogger<AiMatchController> _logger;

    public AiMatchController(AiMatchmakerService aiService, ILogger<AiMatchController> logger)
    {
        _aiService = aiService;
        _logger = logger;
    }

    private int? CurrentUserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? User.FindFirstValue("nameid")
                   ?? User.FindFirstValue("sub");
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    /// <summary>
    /// Học sinh tải ảnh bài tập / bài kiểm tra lên để AI chẩn đoán lỗ hổng kiến thức và gợi ý Top 3 gia sư
    /// </summary>
    [Authorize]
    [HttpPost("diagnose")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12_000_000)]
    public async Task<IActionResult> DiagnoseHomework(
        [FromForm] DiagnoseHomeworkRequest form,
        CancellationToken ct)
    {
        if (CurrentUserId is not int studentId)
            return Unauthorized();

        try
        {
            var problemFile = form.ProblemFile ?? form.ProblemImage ?? form.File;
            var solutionFile = form.StudentSolutionFile ?? form.StudentSolutionImage ?? form.SolutionFile;
            var result = await _aiService.DiagnoseHomeworkAsync(
                studentId,
                problemFile,
                solutionFile,
                form.StudentNote,
                ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi trong quá trình chẩn đoán bài tập với AI");
            return StatusCode(500, new { message = "Không thể chẩn đoán bài tập lúc này. Vui lòng thử lại sau." });
        }
    }

    /// <summary>
    /// Lấy danh sách lịch sử các ca chẩn đoán của học sinh đang đăng nhập
    /// </summary>
    [Authorize]
    [HttpGet("diagnoses/mine")]
    public async Task<IActionResult> GetMyDiagnoses(CancellationToken ct)
    {
        if (CurrentUserId is not int studentId)
            return Unauthorized();

        var list = await _aiService.GetMyDiagnosesAsync(studentId, ct);
        return Ok(list);
    }

    /// <summary>
    /// Lấy chi tiết 1 ca chẩn đoán theo ID kèm Top 3 gia sư đề xuất
    /// </summary>
    [Authorize]
    [HttpGet("diagnoses/{id:int}")]
    public async Task<IActionResult> GetDiagnosisById(int id, CancellationToken ct)
    {
        var item = await _aiService.GetDiagnosisByIdAsync(id, ct);
        if (item == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ chẩn đoán này." });

        return Ok(item);
    }

    /// <summary>
    /// Tìm kiếm gia sư thông minh bằng câu văn tự nhiên (Hỗ trợ cả khách vãng lai và học sinh)
    /// </summary>
    [HttpPost("natural-search")]
    public async Task<IActionResult> NaturalSearch(
        [FromBody] NaturalSearchRequestDto request,
        CancellationToken ct)
    {
        try
        {
            var result = await _aiService.SearchNaturalAsync(CurrentUserId, request, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi tìm kiếm tự nhiên qua AI");
            return StatusCode(500, new { message = "Không thể phân tích yêu cầu tìm kiếm lúc này." });
        }
    }

    /// <summary>
    /// Lấy danh mục cây chuyên đề kiến thức chuẩn GDPT 2018 theo môn
    /// </summary>
    [HttpGet("topics")]
    public async Task<IActionResult> GetTopics([FromQuery] int? subjectId, CancellationToken ct)
    {
        var list = await _aiService.GetTopicsAsync(subjectId, ct);
        return Ok(list);
    }
}
