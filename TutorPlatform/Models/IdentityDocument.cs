using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class IdentityDocument
{
    public int DocumentId { get; set; }

    public int TutorId { get; set; }

    public string IdCardFrontUrl { get; set; } = null!;

    public string IdCardBackUrl { get; set; } = null!;

    public string Status { get; set; } = null!;

    public int? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? RejectionReason { get; set; }

    public DateTime SubmittedAt { get; set; }

    public virtual ICollection<FaceVerificationLog> FaceVerificationLogs { get; set; } = new List<FaceVerificationLog>();

    public virtual ICollection<OcrExtractionResult> OcrExtractionResults { get; set; } = new List<OcrExtractionResult>();

    public virtual User? ReviewedByNavigation { get; set; }

    public virtual TutorProfile Tutor { get; set; } = null!;
}
