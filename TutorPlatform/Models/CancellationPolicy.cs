using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class CancellationPolicy
{
    public int PolicyId { get; set; }

    public int TutorId { get; set; }

    public string PolicyType { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<RefundRule> RefundRules { get; set; } = new List<RefundRule>();

    public virtual TutorProfile Tutor { get; set; } = null!;
}
