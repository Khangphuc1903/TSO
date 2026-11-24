using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Authorize]
[Route("api/wishlist")]
public class WishlistController : ControllerBase
{
    private readonly TutorPlatformDbContext _db;

    public WishlistController(TutorPlatformDbContext db) => _db = db;

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        var ids = await _db.Wishlists.AsNoTracking()
            .Where(w => w.StudentId == userId)
            .OrderByDescending(w => w.AddedAt)
            .Select(w => w.TutorId)
            .ToListAsync(cancellationToken);
        if (ids.Count == 0) return Ok(Array.Empty<TutorSearchResultItem>());

        var tutors = await _db.TutorProfiles.AsNoTracking()
            .Include(t => t.Tutor)
            .Include(t => t.TutorSubjects).ThenInclude(ts => ts.Subject)
            .Where(t => ids.Contains(t.TutorId))
            .ToListAsync(cancellationToken);
        var order = ids.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        var items = tutors
            .OrderBy(t => order.GetValueOrDefault(t.TutorId, int.MaxValue))
            .Select(tp => new TutorSearchResultItem
            {
                TutorId = tp.TutorId,
                FullName = tp.Tutor?.FullName,
                Email = tp.Tutor?.Email,
                PhoneNumber = tp.Tutor?.PhoneNumber,
                City = tp.Tutor?.City,
                District = tp.Tutor?.District,
                AvatarUrl = tp.Tutor?.AvatarUrl,
                Bio = tp.Bio,
                University = tp.University,
                Major = tp.Major,
                YearsOfExperience = tp.YearsOfExperience,
                HourlyRateMin = tp.HourlyRateMin,
                HourlyRateMax = tp.HourlyRateMax,
                TeachingMode = tp.TeachingMode,
                AverageRating = tp.AverageRating,
                TotalReviews = tp.TotalReviews,
                VerificationStatus = tp.VerificationStatus,
                IsPublished = tp.IsPublished,
                Subjects = tp.TutorSubjects
                    .Where(ts => ts.Subject != null)
                    .Select(ts => ts.Subject.SubjectName)
                    .Distinct()
                    .ToList()
            })
            .ToList();
        return Ok(items);
    }

    [HttpGet("ids")]
    public async Task<IActionResult> Ids(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        var ids = await _db.Wishlists.AsNoTracking()
            .Where(w => w.StudentId == userId)
            .Select(w => w.TutorId)
            .ToListAsync(cancellationToken);
        return Ok(ids);
    }

    [HttpPost("{tutorId:int}")]
    public async Task<IActionResult> Toggle(int tutorId, CancellationToken cancellationToken)
    {
        if (CurrentUserId is not int userId) return Unauthorized();
        if (tutorId == userId)
            return BadRequest(new { message = "Không thể lưu chính mình vào danh sách yêu thích." });

        var tutorExists = await _db.TutorProfiles.AnyAsync(t => t.TutorId == tutorId, cancellationToken);
        if (!tutorExists)
            return NotFound(new { message = "Không tìm thấy gia sư." });

        var existing = await _db.Wishlists
            .FirstOrDefaultAsync(w => w.StudentId == userId && w.TutorId == tutorId, cancellationToken);
        if (existing != null)
        {
            _db.Wishlists.Remove(existing);
            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { saved = false });
        }

        _db.Wishlists.Add(new Wishlist
        {
            StudentId = userId,
            TutorId = tutorId,
            AddedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { saved = true });
    }
}
