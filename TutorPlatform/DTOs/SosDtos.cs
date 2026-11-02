using System.ComponentModel.DataAnnotations;

namespace TutorPlatform.DTOs;

public sealed class CreateSosRequestDto
{
    [Range(1, int.MaxValue)]
    public int SubjectId { get; set; }

    public int? TopicId { get; set; }

    [MaxLength(1000)]
    public string? QuestionNote { get; set; }
}

public sealed class SosReadyDto
{
    public bool IsReady { get; set; }
}

public sealed class SosRequestDto
{
    public int RequestId { get; set; }
    public int StudentId { get; set; }
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string ImageUrl { get; set; } = null!;
    public string? QuestionNote { get; set; }
    public decimal FeeAmount { get; set; }
    public string Status { get; set; } = null!;
    public int? ClaimedByTutorId { get; set; }
    public int? ConversationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ClaimedAt { get; set; }
}

public sealed class SosSessionDto
{
    public int SessionId { get; set; }
    public int RequestId { get; set; }
    public int StudentId { get; set; }
    public int TutorId { get; set; }
    public int? ConversationId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int DurationMinutes { get; set; }
    public decimal FeeAmount { get; set; }
    public string PayoutStatus { get; set; } = null!;
}
