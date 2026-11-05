using System;

namespace TutorPlatform.Model;

public partial class TutorMatchSuggestion
{
    public int SuggestionId { get; set; }

    public int DiagnosisId { get; set; }

    public int TutorId { get; set; }

    public byte RankNo { get; set; }

    public decimal MatchScore { get; set; }

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual KnowledgeGapDiagnosis Diagnosis { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
