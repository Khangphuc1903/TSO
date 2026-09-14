using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class TutorSubject
{
    public int TutorSubjectId { get; set; }

    public int TutorId { get; set; }

    public int SubjectId { get; set; }

    public bool IsVerified { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public virtual Subject Subject { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
