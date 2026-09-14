using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class BookingReschedule
{
    public int RescheduleId { get; set; }

    public int BookingId { get; set; }

    public int RequestedBy { get; set; }

    public DateOnly OldDate { get; set; }

    public TimeOnly OldStartTime { get; set; }

    public TimeOnly OldEndTime { get; set; }

    public DateOnly NewDate { get; set; }

    public TimeOnly NewStartTime { get; set; }

    public TimeOnly NewEndTime { get; set; }

    public string Status { get; set; } = null!;

    public string? Reason { get; set; }

    public int? ReviewedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual User RequestedByNavigation { get; set; } = null!;

    public virtual User? ReviewedByNavigation { get; set; }
}
