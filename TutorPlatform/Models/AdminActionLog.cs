using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class AdminActionLog
{
    public int LogId { get; set; }

    public int AdminId { get; set; }

    public string ActionType { get; set; } = null!;

    public string? TargetEntityType { get; set; }

    public int? TargetEntityId { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User Admin { get; set; } = null!;
}
