using System.ComponentModel.DataAnnotations;

namespace TutorPlatform.DTOs;

public class CreateReviewDto
{
    [Range(1, int.MaxValue)]
    public int BookingId { get; set; }

    [Range(1, 5)]
    public byte Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
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