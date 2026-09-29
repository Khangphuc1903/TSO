namespace TutorPlatform.DTOs;

public class CreatePaymentIntentRequest
{
    public int BookingId { get; set; }
}

public class PaymentIntentResponse
{
    public int PaymentId { get; set; }
    public int BookingId { get; set; }
    public long OrderCode { get; set; }
    public string CheckoutUrl { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;
    public string Bin { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string QrImageUrl { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = "Pending";
}

public class PaymentStatusDto
{
    public int PaymentId { get; set; }
    public int BookingId { get; set; }
    public string? TransactionCode { get; set; }
    public string Status { get; set; } = "Pending";
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "PayOS";
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RefundPreviewDto
{
    public int BookingId { get; set; }
    public decimal OriginalPrice { get; set; }
    public double HoursRemaining { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal RefundAmount { get; set; }
    public string PolicyType { get; set; } = "Moderate";
    public string Description { get; set; } = string.Empty;
}

public class CancelBookingWithRefundRequest
{
    public string? Reason { get; set; }
}
