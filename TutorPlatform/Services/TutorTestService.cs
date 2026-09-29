using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class TutorTestService
{
    private const string ProfessionalTestType = "Professional";
    private const decimal DefaultPassThreshold = 70m;
    private const string PassThresholdSettingKey = "TutorTestPassThreshold";
    private readonly TutorPlatformDbContext _db;

    public TutorTestService(TutorPlatformDbContext db)
    {
        _db = db;
    }

    // ---------------- CATALOG: Level -> Subject -> Grade (data-driven) ----------------

    public async Task<List<TutorTestLevelDto>> ListCatalogAsync(int tutorId, CancellationToken cancellationToken)
    {
        var subjects = await _db.Subjects
            .AsNoTracking()
            .Where(subject => subject.IsActive)
            .OrderBy(subject => subject.SubjectName)
            .Select(subject => new { subject.SubjectId, subject.SubjectName, subject.EducationLevel })
            .ToListAsync(cancellationToken);

        if (subjects.Count == 0) return new List<TutorTestLevelDto>();

        var questionCounts = await LoadQuestionCountsByGradeAsync(cancellationToken);
        var latestAttempts = await LoadLatestAttemptsAsync(tutorId, cancellationToken);
        var result = new List<TutorTestLevelDto>();

        foreach (var subject in subjects)
        {
            var levelDto = result.FirstOrDefault(level => level.EducationLevel == subject.EducationLevel);
            if (levelDto == null)
            {
                levelDto = new TutorTestLevelDto { EducationLevel = subject.EducationLevel };
                result.Add(levelDto);
            }

            var subjectDto = new TutorTestSubjectDto
            {
                SubjectId = subject.SubjectId,
                SubjectName = subject.SubjectName,
                QuestionCount = 0,
                Grades = new List<TutorTestGradeDto>()
            };
            foreach (var entry in questionCounts.Where(item => item.SubjectId == subject.SubjectId && item.GradeLevel != null))
            {
                var latest = LatestFor(latestAttempts, subject.SubjectId, entry.GradeLevel);
                subjectDto.Grades.Add(new TutorTestGradeDto
                {
                    GradeLevel = entry.GradeLevel!,
                    QuestionCount = entry.Count,
                    Status = StatusOf(latest),
                    LatestScorePercent = latest?.ScorePercent,
                    LatestIsPassed = latest?.IsPassed,
                    LatestAttemptNumber = latest?.AttemptNumber
                });
                subjectDto.QuestionCount += entry.Count;
            }
            subjectDto.Grades.Sort((a, b) => a.GradeLevel.CompareTo(b.GradeLevel));
            levelDto.Subjects.Add(subjectDto);
        }

        return result;
    }

    public async Task<List<TutorTestListItemDto>> ListTestsAsync(int tutorId, CancellationToken cancellationToken)
    {
        var subjectIds = await _db.TutorSubjects
            .AsNoTracking()
            .Where(ts => ts.TutorId == tutorId)
            .Select(ts => ts.SubjectId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (subjectIds.Count == 0) return new List<TutorTestListItemDto>();

        var subjects = await _db.Subjects
            .AsNoTracking()
            .Where(subject => subject.IsActive && subjectIds.Contains(subject.SubjectId))
            .Select(subject => new { subject.SubjectId, subject.SubjectName, subject.EducationLevel })
            .ToListAsync(cancellationToken);

        if (subjects.Count == 0) return new List<TutorTestListItemDto>();

        var questionCounts = await LoadQuestionCountsByGradeAsync(cancellationToken);
        var latestAttempts = await LoadLatestAttemptsAsync(tutorId, cancellationToken);
        var names = subjects.ToDictionary(subject => subject.SubjectId, subject => subject);
        var tests = new List<TutorTestListItemDto>();

        foreach (var entry in questionCounts.Where(entry => entry.GradeLevel != null && names.ContainsKey(entry.SubjectId)))
        {
            var subject = names[entry.SubjectId];
            var grade = entry.GradeLevel!;
            var latest = LatestFor(latestAttempts, entry.SubjectId, grade);
            tests.Add(new TutorTestListItemDto
            {
                SubjectId = entry.SubjectId,
                SubjectName = subject.SubjectName,
                EducationLevel = subject.EducationLevel,
                GradeLevel = grade,
                QuestionCount = entry.Count,
                Status = StatusOf(latest),
                LatestScorePercent = latest?.ScorePercent,
                LatestIsPassed = latest?.IsPassed,
                LatestAttemptNumber = latest?.AttemptNumber
            });
        }

        return tests
            .OrderBy(test => test.SubjectName)
            .ThenBy(test => test.GradeLevel)
            .ToList();
    }

    public async Task<List<TutorTestGradeDto>> ListGradesAsync(int tutorId, int subjectId, CancellationToken cancellationToken)
    {
        var subjectOk = await _db.Subjects.AnyAsync(s => s.SubjectId == subjectId && s.IsActive, cancellationToken);
        if (!subjectOk) return new List<TutorTestGradeDto>();

        var questionCounts = await _db.Questions
            .AsNoTracking()
            .Where(question => question.IsActive && question.SubjectId == subjectId && question.GradeLevel != null)
            .Select(question => new { Grade = question.GradeLevel! })
            .GroupBy(group => group.Grade)
            .Select(group => new { Grade = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var latestAttempts = await LoadLatestAttemptsAsync(tutorId, cancellationToken);

        return questionCounts
            .OrderBy(entry => entry.Grade)
            .Select(entry =>
            {
                var latest = LatestFor(latestAttempts, subjectId, entry.Grade);
                return new TutorTestGradeDto
                {
                    GradeLevel = entry.Grade,
                    QuestionCount = entry.Count,
                    Status = StatusOf(latest),
                    LatestScorePercent = latest?.ScorePercent,
                    LatestIsPassed = latest?.IsPassed,
                    LatestAttemptNumber = latest?.AttemptNumber
                };
            })
            .ToList();
    }
public async Task<(bool Success, int StatusCode, string Message, TutorTestStatusDto? Data)> GetTestStatusAsync(
        int tutorId, int subjectId, string? gradeLevel, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(gradeLevel);
        var subject = await _db.Subjects
            .AsNoTracking()
            .Where(subject => subject.SubjectId == subjectId && subject.IsActive)
            .Select(subject => new { subject.SubjectName, subject.EducationLevel })
            .FirstOrDefaultAsync(cancellationToken);

        if (subject == null || normalizedGrade == null)
            return (false, 404, "Tổ hợp cấp học + môn + lớp không tồn tại.", null);

        var isRegistered = await _db.TutorSubjects.AnyAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == subjectId && ts.GradeLevel == normalizedGrade, cancellationToken);

        var questionCount = await _db.Questions.CountAsync(
            question => question.IsActive && question.SubjectId == subjectId && question.GradeLevel == normalizedGrade, cancellationToken);

        if (questionCount == 0)
            return (false, 404, "Hiện chưa có bài kiểm tra cho môn + lớp này.", null);

        var latest = LatestFor(await LoadLatestAttemptsAsync(tutorId, cancellationToken), subjectId, normalizedGrade);

        return (true, 200, string.Empty, new TutorTestStatusDto
        {
            SubjectId = subjectId,
            SubjectName = subject.SubjectName,
            EducationLevel = subject.EducationLevel,
            GradeLevel = normalizedGrade,
            Status = StatusOf(latest),
            LatestScorePercent = latest?.ScorePercent,
            LatestIsPassed = latest?.IsPassed,
            LatestAttemptNumber = latest?.AttemptNumber,
            IsRegistered = isRegistered
        });
    }

    // ---------------- ATTEMPTS HISTORY ----------------

    public async Task<List<TutorTestAttemptDto>> ListAttemptsAsync(int tutorId, CancellationToken cancellationToken)
    {
        return await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(attempt => attempt.TutorId == tutorId)
            .OrderByDescending(attempt => attempt.SubmittedAt)
            .Select(attempt => new TutorTestAttemptDto
            {
                AttemptId = attempt.AttemptId,
                SubjectId = attempt.SubjectId ?? 0,
                SubjectName = attempt.Subject == null ? null : attempt.Subject.SubjectName,
                EducationLevel = attempt.Subject == null ? "" : (attempt.Subject.EducationLevel ?? ""),
                GradeLevel = attempt.GradeLevel,
                TotalQuestions = attempt.TotalQuestions,
                CorrectCount = attempt.CorrectCount,
                ScorePercent = attempt.ScorePercent,
                PassThreshold = attempt.PassThreshold,
                IsPassed = attempt.IsPassed,
                AttemptNumber = attempt.AttemptNumber,
                StartedAt = attempt.StartedAt,
                SubmittedAt = attempt.SubmittedAt
            })
            .ToListAsync(cancellationToken);
    }

    // ---------------- QUESTION SET ----------------

    public async Task<(bool Success, int StatusCode, string Message, TutorTestQuestionsDto? Data)> GetQuestionsAsync(
        int tutorId, int subjectId, string? gradeLevel, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(gradeLevel);
        if (normalizedGrade == null)
            return (false, 400, "Chọn lớp để làm bài kiểm tra.", null);

        // Tutor chỉ truy cập bài kiểm tra của tổ hợp (môn + lớp) mà họ đã đăng ký.
        var isRegistered = await _db.TutorSubjects.AnyAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == subjectId && ts.GradeLevel == normalizedGrade, cancellationToken);
        if (!isRegistered)
            return (false, 403, "Đăng ký tổ hợp (môn + lớp) trước khi làm bài kiểm tra.", null);

        var subject = await _db.Subjects
            .AsNoTracking()
            .Where(subject => subject.SubjectId == subjectId && subject.IsActive)
            .Select(subject => new { subject.SubjectName, subject.EducationLevel })
            .FirstOrDefaultAsync(cancellationToken);

        if (subject == null)
            return (false, 404, "Môn học không tồn tại hoặc chưa được kích hoạt.", null);

        var questions = await LoadQuestionsAsync(subjectId, normalizedGrade, cancellationToken);
        if (questions.Count == 0)
            return (false, 404, "Hiện chưa có câu hỏi cho bài kiểm tra này (môn + lớp).", null);

        return (true, 200, string.Empty, new TutorTestQuestionsDto
        {
            SubjectId = subjectId,
            SubjectName = subject.SubjectName,
            EducationLevel = subject.EducationLevel,
            GradeLevel = normalizedGrade,
            PassThreshold = await GetPassThresholdAsync(cancellationToken),
            StartedAt = DateTime.UtcNow,
            Questions = questions.Select(question => new TutorTestQuestionDto
            {
                QuestionId = question.QuestionId,
                Content = question.Content,
                OptionA = question.OptionA,
                OptionB = question.OptionB,
                OptionC = question.OptionC,
                OptionD = question.OptionD,
                Difficulty = question.Difficulty
            }).ToList()
        });
    }
// ---------------- SUBMIT + SCORING ----------------

    public async Task<(bool Success, int StatusCode, string Message, TutorTestAttemptDto? Data)> SubmitAsync(
        int tutorId, SubmitTutorTestDto dto, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(dto.GradeLevel);
        if (normalizedGrade == null)
            return (false, 400, "Chọn lớp để nộp bài kiểm tra.", null);

        var isRegistered = await _db.TutorSubjects.AnyAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == dto.SubjectId && ts.GradeLevel == normalizedGrade, cancellationToken);
        if (!isRegistered)
            return (false, 403, "Đăng ký tổ hợp trước khi nộp bài kiểm tra.", null);

        var questions = await LoadQuestionsAsync(dto.SubjectId, normalizedGrade, cancellationToken);
        if (questions.Count == 0)
            return (false, 404, "Hiện chưa có câu hỏi cho bài kiểm tra này (môn + lớp).", null);

        var subjectInfo = await _db.Subjects
            .Where(subject => subject.SubjectId == dto.SubjectId)
            .Select(subject => new { subject.SubjectName, subject.EducationLevel })
            .FirstAsync(cancellationToken);

        var submittedAnswers = dto.Answers ?? new List<TutorTestAnswerSubmissionDto>();
        if (submittedAnswers.GroupBy(answer => answer.QuestionId).Any(group => group.Count() > 1))
            return (false, 400, "Không được gửi câu trả lời trùng lặp.", null);
        if (submittedAnswers.Any(answer =>
                NormalizeOption(answer.SelectedOption) is { } option && option is not ("A" or "B" or "C" or "D")))
            return (false, 400, "Đáp án chỉ được chọn A, B, C hoặc D.", null);

        var questionIds = questions.Select(question => question.QuestionId).ToHashSet();
        if (submittedAnswers.Any(answer => !questionIds.Contains(answer.QuestionId)))
            return (false, 400, "Bài làm chứa câu hỏi không thuộc bài kiểm tra này.", null);

        var answers = submittedAnswers.ToDictionary(
            answer => answer.QuestionId,
            answer => NormalizeOption(answer.SelectedOption));
        var passThreshold = await GetPassThresholdAsync(cancellationToken);
        var score = ScoreAnswers(questions, answers, passThreshold);
        var submittedAt = DateTime.UtcNow;
        var startedAt = dto.StartedAt?.ToUniversalTime() ?? submittedAt;
        if (startedAt > submittedAt)
            return (false, 400, "Thời điểm bắt đầu bài test không hợp lệ.", null);

        var attemptNumber = (await _db.TutorTestAttempts
            .Where(attempt => attempt.TutorId == tutorId
                && attempt.SubjectId == dto.SubjectId
                && attempt.GradeLevel == normalizedGrade)
            .Select(attempt => (int?)attempt.AttemptNumber)
            .MaxAsync(cancellationToken) ?? 0) + 1;

        var attempt = new TutorTestAttempt
        {
            TutorId = tutorId,
            SubjectId = dto.SubjectId,
            GradeLevel = normalizedGrade,
            TestType = ProfessionalTestType,
            TotalQuestions = questions.Count,
            CorrectCount = score.CorrectCount,
            ScorePercent = score.ScorePercent,
            PassThreshold = passThreshold,
            IsPassed = score.IsPassed,
            AttemptNumber = attemptNumber,
            StartedAt = startedAt,
            SubmittedAt = submittedAt,
            TutorTestAnswers = questions.Select(question => new TutorTestAnswer
            {
                QuestionId = question.QuestionId,
                SelectedOption = answers.GetValueOrDefault(question.QuestionId),
                IsCorrect = answers.TryGetValue(question.QuestionId, out var selected)
                    && selected == NormalizeOption(question.CorrectAnswer)
            }).ToList()
        };

        _db.TutorTestAttempts.Add(attempt);

        // Đạt ⇒ đánh dấu tổ hợp (môn + lớp) đã đủ điều kiện giảng dạy.
        if (score.IsPassed)
            await MarkCombinationVerifiedAsync(tutorId, dto.SubjectId, normalizedGrade, submittedAt, cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);

        return (true, 200, string.Empty, new TutorTestAttemptDto
        {
            AttemptId = attempt.AttemptId,
            SubjectId = dto.SubjectId,
            SubjectName = subjectInfo.SubjectName,
            EducationLevel = subjectInfo.EducationLevel,
            GradeLevel = attempt.GradeLevel,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            ScorePercent = attempt.ScorePercent,
            PassThreshold = attempt.PassThreshold,
            IsPassed = attempt.IsPassed,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt
        });
    }
// ---------------- REGISTRATION ----------------

    public async Task<(bool Success, int StatusCode, string Message)> RegisterCombinationAsync(
        int tutorId, RegisterTestCombinationDto dto, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(dto.GradeLevel);
        if (normalizedGrade == null)
            return (false, 400, "Chọn lớp cho môn học.");

        var subjectOk = await _db.Subjects.AnyAsync(s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
        if (!subjectOk)
            return (false, 404, "Môn học không tồn tại hoặc chưa được kích hoạt.");

        // Kada tổ hợp phải có bài kiểm tra tương ứng trước đăng ký (không bài kiểm tra "chung" mù quáng).
        var testExists = await _db.Questions.AnyAsync(
            question => question.IsActive && question.SubjectId == dto.SubjectId && question.GradeLevel == normalizedGrade, cancellationToken);
        if (!testExists)
            return (false, 409, "Hiện chưa có bài test for tổ hợp cấp + môn + lớp này.");

        var existing = await _db.TutorSubjects.FirstOrDefaultAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == dto.SubjectId && ts.GradeLevel == normalizedGrade, cancellationToken);

        if (existing == null)
        {
            _db.TutorSubjects.Add(new TutorSubject
            {
                TutorId = tutorId,
                SubjectId = dto.SubjectId,
                GradeLevel = normalizedGrade,
                IsVerified = false
            });
            await _db.SaveChangesAsync(cancellationToken);
        }

        return (true, 200, "Đã đăng ký tổ hợp " + normalizedGrade + ".");
    }

    // ---------------- PUBLIC STATIC SCORING ----------------

    public static (int CorrectCount, decimal ScorePercent, bool IsPassed) ScoreAnswers(
        IReadOnlyCollection<Question> questions,
        IReadOnlyDictionary<int, string?> answers,
        decimal passThreshold)
    {
        var correctCount = questions.Count(question =>
            answers.TryGetValue(question.QuestionId, out var selected)
            && NormalizeOption(selected) == NormalizeOption(question.CorrectAnswer));
        var scorePercent = questions.Count == 0
            ? 0m
            : Math.Round(correctCount * 100m / questions.Count, 2, MidpointRounding.AwayFromZero);
        return (correctCount, scorePercent, scorePercent >= passThreshold);
    }
// ---------------- HELPERS ----------------

    private async Task<List<Question>> LoadQuestionsAsync(int subjectId, string gradeLevel, CancellationToken cancellationToken)
    {
        return await _db.Questions
            .Where(question => question.IsActive
                && question.SubjectId == subjectId
                && question.GradeLevel == gradeLevel)
            .OrderBy(question => question.QuestionId)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<GradeQuestionCount>> LoadQuestionCountsByGradeAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Questions
            .AsNoTracking()
            .Where(question => question.IsActive && question.SubjectId != null && question.GradeLevel != null)
            .Select(question => new { question.SubjectId, question.GradeLevel })
            .ToListAsync(cancellationToken);

        var map = new Dictionary<string, GradeQuestionCount>();
        foreach (var row in rows)
        {
            var key = KeyOf(row.SubjectId!.Value, row.GradeLevel);
            if (map.TryGetValue(key, out var existing))
                existing.Count += 1;
            else
                map[key] = new GradeQuestionCount
                {
                    SubjectId = row.SubjectId!.Value,
                    GradeLevel = row.GradeLevel,
                    Count = 1
                };
        }
        return map.Values.ToList();
    }

    private async Task<Dictionary<string, LatestAttempt>> LoadLatestAttemptsAsync(
        int tutorId, CancellationToken cancellationToken)
    {
        var attempts = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(attempt => attempt.TutorId == tutorId && attempt.SubjectId != null)
            .OrderByDescending(attempt => attempt.SubmittedAt)
            .ThenByDescending(attempt => attempt.AttemptId)
            .Select(attempt => new
            {
                attempt.SubjectId,
                attempt.GradeLevel,
                attempt.ScorePercent,
                attempt.IsPassed,
                attempt.AttemptNumber
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<string, LatestAttempt>();
        foreach (var attempt in attempts)
        {
            var key = KeyOf(attempt.SubjectId!.Value, attempt.GradeLevel);
            if (!result.ContainsKey(key))
                result[key] = new LatestAttempt
                {
                    ScorePercent = attempt.ScorePercent,
                    IsPassed = attempt.IsPassed,
                    AttemptNumber = attempt.AttemptNumber
                };
        }
        return result;
    }

    private async Task MarkCombinationVerifiedAsync(int tutorId, int subjectId, string gradeLevel, DateTime verifiedAt, CancellationToken cancellationToken)
    {
        var row = await _db.TutorSubjects.FirstOrDefaultAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == subjectId && ts.GradeLevel == gradeLevel, cancellationToken);

        if (row != null)
        {
            row.IsVerified = true;
            row.VerifiedAt = verifiedAt;
        }
        else
        {
            _db.TutorSubjects.Add(new TutorSubject
            {
                TutorId = tutorId,
                SubjectId = subjectId,
                GradeLevel = gradeLevel,
                IsVerified = true,
                VerifiedAt = verifiedAt
            });
        }
    }

    private async Task<decimal> GetPassThresholdAsync(CancellationToken cancellationToken)
    {
        var rawValue = await _db.PlatformSettings
            .AsNoTracking()
            .Where(setting => setting.SettingKey == PassThresholdSettingKey)
            .Select(setting => setting.SettingValue)
            .FirstOrDefaultAsync(cancellationToken);

        return decimal.TryParse(rawValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var threshold)
            && threshold is >= 0m and <= 100m
            ? threshold
            : DefaultPassThreshold;
    }

    private static string? NormalizeGrade(string? grade)
    {
        if (string.IsNullOrWhiteSpace(grade)) return null;
        var trimmed = grade.Trim();
        return trimmed.Length > 50 ? trimmed.Substring(0, 50) : trimmed;
    }

    private static string StatusOf(LatestAttempt? latest)
        => latest == null ? "Chưa làm" : latest.IsPassed ? "Đạt" : "Không đạt";

    private static string KeyOf(int subjectId, string? gradeLevel)
        => subjectId.ToString() + "\u0001" + (gradeLevel ?? "");

    private static LatestAttempt? LatestFor(Dictionary<string, LatestAttempt> map, int subjectId, string? gradeLevel)
        => map.TryGetValue(KeyOf(subjectId, gradeLevel), out var latest) ? latest : null;

    private class GradeQuestionCount
    {
        public int SubjectId { get; set; }
        public string? GradeLevel { get; set; }
        public int Count { get; set; }
    }

    private class LatestAttempt
    {
        public decimal ScorePercent { get; set; }
        public bool IsPassed { get; set; }
        public int AttemptNumber { get; set; }
    }

    private static string? NormalizeOption(string? option)
    {
        if (string.IsNullOrWhiteSpace(option)) return null;
        return option.Trim().ToUpperInvariant();
    }
}
