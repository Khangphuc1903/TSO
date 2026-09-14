using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class RefundRule
{
    public int RuleId { get; set; }

    public int PolicyId { get; set; }

    public int MinHoursBeforeStart { get; set; }

    public decimal RefundPercentage { get; set; }

    public virtual CancellationPolicy Policy { get; set; } = null!;
}
