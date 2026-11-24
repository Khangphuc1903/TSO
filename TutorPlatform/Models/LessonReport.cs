namespace TutorPlatform.Model;

public class LessonReport
{
    public int LessonReportId { get; set; }

    public int BookingId { get; set; }

    public int TutorId { get; set; }

    public string Content { get; set; } = null!;

    public string? Homework { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;
}
