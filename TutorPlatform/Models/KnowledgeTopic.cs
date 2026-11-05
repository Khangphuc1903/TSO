using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class KnowledgeTopic
{
    public int TopicId { get; set; }

    public int SubjectId { get; set; }

    public string? GradeLevel { get; set; }

    public string TopicName { get; set; } = null!;

    public string? TopicCode { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Subject Subject { get; set; } = null!;

    public virtual ICollection<KnowledgeGapDiagnosis> KnowledgeGapDiagnoses { get; set; } = new List<KnowledgeGapDiagnosis>();
}
