using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.Datas;
using TutorPlatform.Model;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly TutorPlatformDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ReportsController(TutorPlatformDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost("upload-evidence")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> UploadEvidence([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn tệp bằng chứng hợp lệ." });

        if (file.Length > 25 * 1024 * 1024)
            return BadRequest(new { message = "Dung lượng tệp không được vượt quá 25MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar", ".mp4", ".mov" };
        if (!allowedExts.Contains(ext))
            return BadRequest(new { message = "Định dạng tệp không được hỗ trợ. Vui lòng tải ảnh (.jpg, .png, .webp) hoặc tài liệu (.pdf, .docx, .zip, .mp4)." });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", "reports");
        if (!Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var guidPart = Guid.NewGuid().ToString("N")[..8];
        var safeFileName = $"evidence_{DateTime.UtcNow:yyyyMMddHHmmss}_{guidPart}{ext}";
        var filePath = Path.Combine(dir, safeFileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream, cancellationToken);

        var relativeUrl = $"/uploads/reports/{safeFileName}";
        return Ok(new
        {
            url = relativeUrl,
            fileName = file.FileName,
            fileSize = file.Length,
            isImage = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp" }.Contains(ext)
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest dto, CancellationToken cancellationToken)
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("nameid")
            ?? User.FindFirstValue("sub");

        if (!int.TryParse(rawId, out var reporterId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Vui lòng chọn lý do báo cáo." });

        if (string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest(new { message = "Vui lòng nhập mô tả chi tiết lý do báo cáo." });

        if (string.IsNullOrWhiteSpace(dto.Evidence))
            return BadRequest(new { message = "Vui lòng cung cấp bằng chứng (ảnh chụp màn hình, tệp tài liệu hoặc liên kết chứng minh)." });

        var report = new Report
        {
            ReporterId = reporterId,
            ReportedEntityType = dto.EntityType ?? "User",
            ReportedEntityId = dto.EntityId,
            Reason = dto.Reason.Trim(),
            Description = dto.Description.Trim(),
            Evidence = dto.Evidence.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _db.Reports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Đã gửi báo cáo thành công tới Quản trị viên. Hệ thống sẽ xem xét bằng chứng và xử lý.", reportId = report.ReportId });
    }
}

public class CreateReportRequest
{
    public string? EntityType { get; set; }
    public int EntityId { get; set; }
    public string? Reason { get; set; }
    public string? Description { get; set; }
    public string? Evidence { get; set; }
}
