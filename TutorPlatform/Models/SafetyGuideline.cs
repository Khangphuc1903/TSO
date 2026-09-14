using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class SafetyGuideline
{
    public int GuidelineId { get; set; }

    public string Title { get; set; } = null!;

    public string Body { get; set; } = null!;

    public int Version { get; set; }

    public DateTime UpdatedAt { get; set; }
}
