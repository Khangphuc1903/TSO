using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Payment
{
    public int PaymentId { get; set; }

    public int BookingId { get; set; }

    public int PayerUserId { get; set; }

    public decimal Amount { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public string? TransactionCode { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? GatewayTransactionId { get; set; }

    public string? GatewayResponseCode { get; set; }

    public string? PaymentUrl { get; set; }

    public DateTime? CallbackReceivedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual User PayerUser { get; set; } = null!;

    public virtual ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}
