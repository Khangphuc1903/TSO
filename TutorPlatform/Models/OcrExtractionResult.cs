using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class OcrExtractionResult
{
    public int ExtractionId { get; set; }

    public int DocumentId { get; set; }

    public string? FullName { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? IdNumber { get; set; }

    public string? Address { get; set; }

    public string? RawResponseJson { get; set; }

    public DateTime ExtractedAt { get; set; }

    public virtual IdentityDocument Document { get; set; } = null!;
}
