namespace TutorPlatform.DTOs;

public class TutorTestQuestionDto
{
    public int QuestionId { get; set; }
    public string Content { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string? Difficulty { get; set; }
}

public class TutorTestQuestionsDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string EducationLevel { get; set; } = null!;
    public string? GradeLevel { get; set; }
    public decimal PassThreshold { get; set; }
    public DateTime StartedAt { get; set; }
    public int DurationMinutes { get; set; } = 25;
    public DateTime EndsAt { get; set; }
    public string Title => $"{SubjectName} · {GradeLevel}";
    public string TestType => "Professional";
    public List<TutorTestQuestionDto> Questions { get; set; } = new();
}

public class SubmitTutorTestDto
{
    public string? TestType { get; set; }
    public int SubjectId { get; set; }
    public string? GradeLevel { get; set; }
    public DateTime? StartedAt { get; set; }
    public List<TutorTestAnswerSubmissionDto> Answers { get; set; } = new();
}

public class TutorTestAnswerSubmissionDto
{
    public int QuestionId { get; set; }
    public string? SelectedOption { get; set; }
}

public class TutorTestListItemDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string EducationLevel { get; set; } = null!;
    public string? GradeLevel { get; set; }
    public int QuestionCount { get; set; }
    public string Status { get; set; } = "Chưa làm";
    public decimal? LatestScorePercent { get; set; }
    public bool? LatestIsPassed { get; set; }
    public int? LatestAttemptNumber { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class TutorTestAttemptDto
{
    public int AttemptId { get; set; }
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string EducationLevel { get; set; } = null!;
    public string? GradeLevel { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal ScorePercent { get; set; }
    public decimal PassThreshold { get; set; }
    public bool IsPassed { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class RegisterTestCombinationDto
{
    public int SubjectId { get; set; }
    public string GradeLevel { get; set; } = null!;
}

public class TutorTestStatusDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string EducationLevel { get; set; } = null!;
    public string? GradeLevel { get; set; }
    public string Status { get; set; } = "Chưa làm";
    public decimal? LatestScorePercent { get; set; }
    public bool? LatestIsPassed { get; set; }
    public int? LatestAttemptNumber { get; set; }
    public bool IsRegistered { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class TutorPedagogicalTestQuestionsDto
{
    public decimal PassThreshold { get; set; }
    public DateTime StartedAt { get; set; }
    public int DurationMinutes { get; set; } = 25;
    public DateTime EndsAt { get; set; }
    public string Title => "Bài kiểm tra Kỹ năng Sư phạm & An toàn";
    public string TestType => "Pedagogical";
    public List<TutorTestQuestionDto> Questions { get; set; } = new();
}

public class SubmitTutorPedagogicalTestDto
{
    public DateTime? StartedAt { get; set; }
    public List<TutorTestAnswerSubmissionDto> Answers { get; set; } = new();
}

public class TutorPedagogicalTestStatusDto
{
    public string Status { get; set; } = "Chưa làm";
    public decimal? LatestScorePercent { get; set; }
    public bool? LatestIsPassed { get; set; }
    public int? LatestAttemptNumber { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class TutorPedagogicalTestResultDto
{
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal ScorePercent { get; set; }
    public decimal PassThreshold { get; set; }
    public bool IsPassed { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class TutorTestGradeDto
{
    public string GradeLevel { get; set; } = null!;
    public int QuestionCount { get; set; }
    public string Status { get; set; } = "Chưa làm";
    public decimal? LatestScorePercent { get; set; }
    public bool? LatestIsPassed { get; set; }
    public int? LatestAttemptNumber { get; set; }
    public DateTime? RetryAvailableAt { get; set; }
}

public class TutorTestSubjectDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public int QuestionCount { get; set; }
    public List<TutorTestGradeDto> Grades { get; set; } = new();
}

public class TutorTestLevelDto
{
    public string EducationLevel { get; set; } = null!;
    public List<TutorTestSubjectDto> Subjects { get; set; } = new();
}

public class TutorTestCommonDto
{
    public string TestType { get; set; } = null!;
    public string Title { get; set; } = null!;
    public int QuestionCount { get; set; }
    public string Status { get; set; } = "Chưa làm";
    public DateTime? RetryAvailableAt { get; set; }
}