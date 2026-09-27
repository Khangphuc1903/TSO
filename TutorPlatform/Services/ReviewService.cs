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

    public async Task<List<ReviewableBookingDto>> GetEligibleBookingsAsync(
        int tutorId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var items = await EligibleBookingsQuery(tutorId, userId)
            .Include(b => b.Subject)
            .OrderByDescending(b => b.ScheduledDate)
            .ThenByDescending(b => b.StartTime)
            .ToListAsync(cancellationToken);

        return items.Select(b => new ReviewableBookingDto
        {
            BookingId = b.BookingId,
            SubjectName = b.Subject.SubjectName,
            ScheduledDate = b.ScheduledDate.ToString("yyyy-MM-dd"),
            StartTime = b.StartTime.ToString("HH:mm"),
            EndTime = b.EndTime.ToString("HH:mm"),
            Status = b.Status
        }).ToList();
    }

    private IQueryable<Booking> EligibleBookingsQuery(int tutorId, int userId)
    {
        var reviewedIds = _db.Reviews.Where(r => r.StudentId == userId && r.TutorId == tutorId).Select(r => r.BookingId);
        return _db.Bookings.Where(b =>
            b.TutorId == tutorId &&
            b.StudentId == userId &&
            (b.Status == "Confirmed" || b.Status == "Completed") &&
            !reviewedIds.Contains(b.BookingId));
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

        var eligible = await EligibleBookingsQuery(tutorId, userId).ToListAsync(cancellationToken);
        if (eligible.Count == 0)
        {
            return (false, StatusCodes.Status400BadRequest,
                "Bạn cần có buổi học đã được gia sư xác nhận hoặc hoàn thành mới đánh giá được.", null);
        }

        var booking = dto.BookingId is > 0
            ? eligible.FirstOrDefault(item => item.BookingId == dto.BookingId)
            : eligible.OrderByDescending(item => item.ScheduledDate).ThenByDescending(item => item.StartTime).First();

        if (booking == null)
        {
            return (false, StatusCodes.Status400BadRequest, "Buổi học này chưa được xác nhận hoặc đã đánh giá rồi.", null);
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