using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class ReviewService
{
    private readonly TutorPlatformDbContext _db;

    public ReviewService(TutorPlatformDbContext db)
    {
        _db = db;
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorReviewsDto? Data)> GetTutorReviewsAsync(
        int tutorId,
        CancellationToken cancellationToken = default)
    {
        var tutorExists = await _db.TutorProfiles
            .AsNoTracking()
            .AnyAsync(tutor => tutor.TutorId == tutorId, cancellationToken);

        if (!tutorExists)
        {
            return (false, StatusCodes.Status404NotFound, "Không tìm thấy gia sư.", null);
        }

        var reviews = await _db.Reviews
            .AsNoTracking()
            .Where(review => review.TutorId == tutorId && !review.IsHidden)
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new ReviewListItemDto
            {
                ReviewId = review.ReviewId,
                ReviewerName = review.Student.FullName,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return (true, StatusCodes.Status200OK, string.Empty, new TutorReviewsDto
        {
            TutorId = tutorId,
            AverageRating = reviews.Count == 0 ? null : Math.Round(reviews.Average(review => (decimal)review.Rating), 2),
            TotalReviews = reviews.Count,
            Reviews = reviews
        });
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorReviewsDto? Data)> CreateReviewAsync(
        int tutorId,
        int userId,
        CreateReviewDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.Rating is < 1 or > 5)
        {
            return (false, StatusCodes.Status400BadRequest, "Số sao phải từ 1 đến 5.", null);
        }

        var booking = await _db.Bookings
            .FirstOrDefaultAsync(item =>
                item.BookingId == dto.BookingId && item.StudentId == userId && item.TutorId == tutorId,
                cancellationToken);

        if (booking == null)
        {
            return (false, StatusCodes.Status400BadRequest, "Không tìm thấy booking hợp lệ để đánh giá.", null);
        }

        var alreadyReviewed = await _db.Reviews
            .AnyAsync(review => review.BookingId == booking.BookingId, cancellationToken);

        if (alreadyReviewed)
        {
            return (false, StatusCodes.Status409Conflict, "Booking này đã được đánh giá.", null);
        }

        _db.Reviews.Add(new Review
        {
            BookingId = booking.BookingId,
            StudentId = userId,
            TutorId = tutorId,
            Rating = dto.Rating,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            IsHidden = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(cancellationToken);
        await RefreshTutorRatingAsync(tutorId, cancellationToken);

        var result = await GetTutorReviewsAsync(tutorId, cancellationToken);
        return (true, StatusCodes.Status201Created, "Gửi đánh giá thành công.", result.Data);
    }

    private async Task RefreshTutorRatingAsync(int tutorId, CancellationToken cancellationToken)
    {
        var summary = await _db.Reviews
            .Where(review => review.TutorId == tutorId && !review.IsHidden)
            .GroupBy(review => review.TutorId)
            .Select(group => new
            {
                Average = group.Average(review => (decimal)review.Rating),
                Count = group.Count()
            })
            .SingleOrDefaultAsync(cancellationToken);

        var tutor = await _db.TutorProfiles
            .SingleAsync(profile => profile.TutorId == tutorId, cancellationToken);

        tutor.AverageRating = summary?.Average ?? 0;
        tutor.TotalReviews = summary?.Count ?? 0;
        await _db.SaveChangesAsync(cancellationToken);
    }
}