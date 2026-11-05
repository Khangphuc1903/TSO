using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class KnowledgeGapDiagnosis
{
    public int DiagnosisId { get; set; }

    public int StudentId { get; set; }

    public int? SubjectId { get; set; }

    public int? TopicId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public string? OcrText { get; set; }

    public string? AiSummary { get; set; }

    public string? GapDetail { get; set; }

    public string? GradeLevel { get; set; }

    public string Status { get; set; } = "Pending";

    public string? RawAiJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User Student { get; set; } = null!;

    public virtual Subject? Subject { get; set; }

    public virtual KnowledgeTopic? Topic { get; set; }

    public virtual ICollection<TutorMatchSuggestion> TutorMatchSuggestions { get; set; } = new List<TutorMatchSuggestion>();
}
