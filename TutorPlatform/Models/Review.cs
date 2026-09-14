using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Review
{
    public int ReviewId { get; set; }

    public int BookingId { get; set; }

    public int StudentId { get; set; }

    public int TutorId { get; set; }

    public byte Rating { get; set; }

    public string? Comment { get; set; }

    public string? TutorReply { get; set; }

    public DateTime? RepliedAt { get; set; }

    public bool IsHidden { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual User Student { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
