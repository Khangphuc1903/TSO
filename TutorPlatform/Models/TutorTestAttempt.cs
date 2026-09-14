using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class TutorTestAttempt
{
    public int AttemptId { get; set; }

    public int TutorId { get; set; }

    public string TestType { get; set; } = null!;

    public int? SubjectId { get; set; }

    public int TotalQuestions { get; set; }

    public int CorrectCount { get; set; }

    public decimal ScorePercent { get; set; }

    public decimal PassThreshold { get; set; }

    public bool IsPassed { get; set; }

    public int AttemptNumber { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime SubmittedAt { get; set; }

    public virtual Subject? Subject { get; set; }

    public virtual TutorProfile Tutor { get; set; } = null!;

    public virtual ICollection<TutorTestAnswer> TutorTestAnswers { get; set; } = new List<TutorTestAnswer>();
}
