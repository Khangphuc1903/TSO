using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Question
{
    public int QuestionId { get; set; }

    public string TestType { get; set; } = null!;

    public int? SubjectId { get; set; }

    public string Content { get; set; } = null!;

    public string OptionA { get; set; } = null!;

    public string OptionB { get; set; } = null!;

    public string OptionC { get; set; } = null!;

    public string OptionD { get; set; } = null!;

    public string CorrectAnswer { get; set; } = null!;

    public string? Difficulty { get; set; }

    public bool IsActive { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Subject? Subject { get; set; }

    public virtual ICollection<TutorTestAnswer> TutorTestAnswers { get; set; } = new List<TutorTestAnswer>();
}
