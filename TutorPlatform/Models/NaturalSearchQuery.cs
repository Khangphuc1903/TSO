using System;

namespace TutorPlatform.Model;

public partial class NaturalSearchQuery
{
    public int QueryId { get; set; }

    public int? UserId { get; set; }

    public string PromptText { get; set; } = null!;

    public string? ParsedJson { get; set; }

    public int? SubjectId { get; set; }

    public string? GradeLevel { get; set; }

    public string? Gender { get; set; }

    public string? TeachingMode { get; set; }

    public string? PreferredDays { get; set; }

    public string? PreferredTime { get; set; }

    public decimal? MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User? User { get; set; }

    public virtual Subject? Subject { get; set; }
}
