using System;

namespace TutorPlatform.Model;

public partial class SosRequest
{
    public int RequestId { get; set; }
    public int StudentId { get; set; }
    public int SubjectId { get; set; }
    public int? TopicId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public string? QuestionNote { get; set; }
    public decimal FeeAmount { get; set; }
    public string Status { get; set; } = null!;
    public int? ClaimedByTutorId { get; set; }
    public int? ConversationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ClaimedAt { get; set; }

    public virtual User Student { get; set; } = null!;
    public virtual Subject Subject { get; set; } = null!;
    public virtual TutorProfile? ClaimedByTutor { get; set; }
    public virtual Conversation? Conversation { get; set; }
}
