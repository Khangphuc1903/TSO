using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Refund
{
    public int RefundId { get; set; }

    public int PaymentId { get; set; }

    public int BookingId { get; set; }

    public decimal Amount { get; set; }

    public decimal RefundPercent { get; set; }

    public string? Reason { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? ProcessedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual Payment Payment { get; set; } = null!;
}
