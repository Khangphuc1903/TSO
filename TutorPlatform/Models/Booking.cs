using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Booking
{
    public int BookingId { get; set; }

    public int StudentId { get; set; }

    public int TutorId { get; set; }

    public int SubjectId { get; set; }

    public int? SlotId { get; set; }

    public DateOnly ScheduledDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string TeachingMode { get; set; } = null!;

    public string? Location { get; set; }

    public decimal Price { get; set; }

    public string Status { get; set; } = null!;

    public string? CancellationReason { get; set; }

    public int? CancelledBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ConfirmedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public virtual ICollection<BookingReschedule> BookingReschedules { get; set; } = new List<BookingReschedule>();

    public virtual ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<Refund> Refunds { get; set; } = new List<Refund>();

    public virtual Review? Review { get; set; }

    public virtual AvailabilitySlot? Slot { get; set; }

    public virtual User Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
