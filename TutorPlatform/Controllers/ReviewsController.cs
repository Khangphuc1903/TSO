using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly ReviewService _reviewService;

    public ReviewsController(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet("tutor/{tutorId:int}")]
    public async Task<IActionResult> GetTutorReviews(int tutorId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _reviewService.GetTutorReviewsAsync(tutorId, cancellationToken);
            return result.Success ? Ok(result.Data) : StatusCode(result.StatusCode, new { message = result.Message });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Không thể trả danh sách đánh giá hiện táji. Vui lòng thử lại sau." });
        }
    }

    [Authorize(Roles = "Student")]
    [HttpPost("tutor/{tutorId:int}")]
    public async Task<IActionResult> CreateReview(
        int tutorId,
        [FromBody] CreateReviewDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng đăng nhập." });
            }

            var result = await _reviewService.CreateReviewAsync(tutorId, userId, dto, cancellationToken);
            return result.Success
                ? StatusCode(result.StatusCode, result.Data)
                : StatusCode(result.StatusCode, new { message = result.Message });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Không thể gửi đánh giá hiện táji. Vui lòng thử lại sau." });
        }
    }
}