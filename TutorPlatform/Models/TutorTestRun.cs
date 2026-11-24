namespace TutorPlatform.Model;

public class TutorTestRun
{
    public int RunId { get; set; }
    public int TutorId { get; set; }
    public string TestType { get; set; } = null!;
    public int? SubjectId { get; set; }
    public string? GradeLevel { get; set; }
    public string QuestionIds { get; set; } = "[]";
    public string AnswersJson { get; set; } = "[]";
    public DateTime StartedAt { get; set; }
    public DateTime EndsAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public string Status { get; set; } = "Open";
    public string? CloseReason { get; set; }
    public int? AttemptId { get; set; }
    public DateTime? ClosedAt { get; set; }
}
