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

    public ReportsController(TutorPlatformDbContext db)
    {
        _db = db;
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

        var report = new Report
        {
            ReporterId = reporterId,
            ReportedEntityType = dto.EntityType ?? "User",
            ReportedEntityId = dto.EntityId,
            Reason = dto.Reason ?? "Khác",
            Description = dto.Description,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _db.Reports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Đã gửi báo cáo thành công.", reportId = report.ReportId });
    }
}

public class CreateReportRequest
{
    public string? EntityType { get; set; }
    public int EntityId { get; set; }
    public string? Reason { get; set; }
    public string? Description { get; set; }
}
