using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Report
{
    public int ReportId { get; set; }

    public int ReporterId { get; set; }

    public string ReportedEntityType { get; set; } = null!;

    public int ReportedEntityId { get; set; }

    public string Reason { get; set; } = null!;

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public int? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ActionTaken { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User Reporter { get; set; } = null!;

    public virtual User? ReviewedByNavigation { get; set; }
}
