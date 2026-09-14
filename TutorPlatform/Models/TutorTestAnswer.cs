using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class TutorTestAnswer
{
    public int AnswerId { get; set; }

    public int AttemptId { get; set; }

    public int QuestionId { get; set; }

    public string? SelectedOption { get; set; }

    public bool IsCorrect { get; set; }

    public virtual TutorTestAttempt Attempt { get; set; } = null!;

    public virtual Question Question { get; set; } = null!;
}
