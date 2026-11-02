using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly TutorPlatformDbContext _db;

    public PublicController(TutorPlatformDbContext db)
    {
        _db = db;
    }

    [HttpGet("home")]
    public async Task<IActionResult> GetHomeData(CancellationToken cancellationToken)
    {
        var totalTutors = await _db.TutorProfiles.CountAsync(cancellationToken);
        var totalSubjects = await _db.Subjects.CountAsync(s => s.IsActive, cancellationToken);
        var topSubjects = await _db.Subjects
            .Where(s => s.IsActive)
            .OrderBy(s => s.SubjectName)
            .Take(8)
            .Select(s => new { s.SubjectId, s.SubjectName, s.EducationLevel })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            stats = new
            {
                totalTutors,
                totalSubjects
            },
            subjects = topSubjects
        });
    }

    [HttpPost("contact")]
    public IActionResult SendContact([FromBody] ContactMessageRequest dto)
    {
        return Ok(new { message = "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể." });
    }
}

public class ContactMessageRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
}
