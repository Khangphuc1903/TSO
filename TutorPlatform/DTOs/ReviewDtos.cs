using System.ComponentModel.DataAnnotations;

namespace TutorPlatform.DTOs;

public class CreateReviewDto
{
    public int? BookingId { get; set; }

    [Range(1, 5)]
    public byte Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
}

public class ReviewableBookingDto
{
    public int BookingId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string ScheduledDate { get; set; } = null!;
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public string Status { get; set; } = null!;
}

public class ReviewListItemDto
{
    public int ReviewId { get; set; }
    public string ReviewerName { get; set; } = null!;
    public byte Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TutorReviewsDto
{
    public int TutorId { get; set; }
    public decimal? AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public List<ReviewListItemDto> Reviews { get; set; } = new();
}