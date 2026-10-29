using System;

namespace TutorPlatform.Model;

public partial class SosSession
{
    public int SessionId { get; set; }
    public int RequestId { get; set; }
    public int StudentId { get; set; }
    public int TutorId { get; set; }
    public int? ConversationId { get; set; }
    public string? VideoRoomId { get; set; }
    public DateTime StartedAt { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime? EndsAt { get; private set; }
    public DateTime? EndedAt { get; set; }
    public decimal FeeAmount { get; set; }
    public string PayoutStatus { get; set; } = null!;
    public string? GatewayTransactionId { get; set; }

    public virtual SosRequest Request { get; set; } = null!;
    public virtual User Student { get; set; } = null!;
    public virtual TutorProfile Tutor { get; set; } = null!;
    public virtual Conversation? Conversation { get; set; }
}
