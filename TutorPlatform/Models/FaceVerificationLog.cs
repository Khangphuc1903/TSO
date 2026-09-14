using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class FaceVerificationLog
{
    public int LogId { get; set; }

    public int TutorId { get; set; }

    public int DocumentId { get; set; }

    public string SelfieImageUrl { get; set; } = null!;

    public decimal? MatchConfidenceScore { get; set; }

    public bool IsMatch { get; set; }

    public string ApiProvider { get; set; } = null!;

    public string? RawResponseJson { get; set; }

    public int AttemptNumber { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual IdentityDocument Document { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
