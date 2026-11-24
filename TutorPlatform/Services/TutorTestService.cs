using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class TutorTestService
{
    private const string ProfessionalTestType = "Professional";
    public const string PedagogicalTestType = "Pedagogical";
    public const string IeltsTestType = "IELTS";
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
        var groups = subjects
            .GroupBy(s => SubjectKey(s.SubjectName))
            .Select(group =>
            {
                var rows = group.ToList();
                var display = rows
                    .OrderByDescending(s => SubjectKey(s.SubjectName) == "ngu van" && VietnameseText.Fold(s.SubjectName) == "ngu van")
                    .ThenByDescending(s => VietnameseText.Fold(s.SubjectName) != s.SubjectName)
                    .First();
                return new
                {
                    Key = group.Key,
                    display.SubjectId,
                    SubjectName = SubjectKey(display.SubjectName) == "ngu van" ? "Ngữ Văn" : display.SubjectName,
                    Ids = rows.Select(s => s.SubjectId).ToHashSet()
                };
            })
            .OrderBy(s => SubjectOrder(s.Key))
            .ThenBy(s => s.SubjectName, StringComparer.CurrentCulture)
            .ToList();

        var result = new List<TutorTestLevelDto>();
        foreach (var band in new[] { "Tiểu học", "THCS", "THPT" })
        {
            var levelDto = new TutorTestLevelDto { EducationLevel = band };
            foreach (var subject in groups)
            {
                var primarySubject = subject.Key is "toan" or "tieng viet";
                if (band == "Tiểu học" && !primarySubject) continue;
                if (band != "Tiểu học" && subject.Key == "tieng viet") continue;
                var count = questionCounts
                    .Where(item => subject.Ids.Contains(item.SubjectId) && GradeInBand(item.GradeLevel, band))
                    .Sum(item => item.Count);
                var latest = LatestFor(latestAttempts, subject.SubjectId, band);
                levelDto.Subjects.Add(new TutorTestSubjectDto
                {
                    SubjectId = subject.SubjectId,
                    SubjectName = subject.SubjectName,
                    QuestionCount = count,
                    Grades = new List<TutorTestGradeDto>
                    {
                        new()
                        {
                            GradeLevel = band,
                            QuestionCount = count,
                            Status = StatusOf(latest),
                            LatestScorePercent = latest?.ScorePercent,
                            LatestIsPassed = latest?.IsPassed,
                            LatestAttemptNumber = latest?.AttemptNumber,
                            RetryAvailableAt = latest?.RetryAvailableAt
                        }
                    }
                });
            }
            result.Add(levelDto);
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
                LatestAttemptNumber = latest?.AttemptNumber,
                RetryAvailableAt = latest?.RetryAvailableAt
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
            .Where(question => question.IsActive && question.TestType == ProfessionalTestType
                && question.SubjectId == subjectId && question.GradeLevel != null)
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
                    LatestAttemptNumber = latest?.AttemptNumber,
                    RetryAvailableAt = latest?.RetryAvailableAt
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
            question => question.IsActive && question.TestType == ProfessionalTestType
                && question.SubjectId == subjectId && question.GradeLevel == normalizedGrade, cancellationToken);

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
            IsRegistered = isRegistered,
            RetryAvailableAt = latest?.RetryAvailableAt
        });
    }

    public async Task<List<TutorTestCommonDto>> ListCommonTestsAsync(int tutorId, CancellationToken cancellationToken)
    {
        var pedQuestionsCount = await _db.Questions.CountAsync(
            q => q.IsActive && q.TestType == PedagogicalTestType && q.SubjectId == null && q.GradeLevel == null, cancellationToken);

        var latestAttempt = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(a => a.TutorId == tutorId && a.TestType == PedagogicalTestType)
            .OrderByDescending(a => a.SubmittedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var status = latestAttempt == null ? "Chưa làm" : latestAttempt.IsPassed ? "Đạt" : "Không đạt";
        var pedFails = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(a => a.TutorId == tutorId && a.TestType == PedagogicalTestType && !a.IsPassed)
            .Select(a => a.SubmittedAt)
            .ToListAsync(cancellationToken);
        var retryAt = (latestAttempt != null && !latestAttempt.IsPassed)
            ? LaterWait(RetryMoment(latestAttempt.SubmittedAt, latestAttempt.AttemptNumber), pedFails)
            : null;

        var ieltsCount = await _db.Questions.CountAsync(
            q => q.IsActive && q.TestType == IeltsTestType, cancellationToken);
        var ieltsAttempt = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(a => a.TutorId == tutorId && a.TestType == IeltsTestType)
            .OrderByDescending(a => a.SubmittedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var ieltsStatus = ieltsAttempt == null ? "Chưa làm" : ieltsAttempt.IsPassed ? "Đạt" : "Không đạt";
        var ieltsFails = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(a => a.TutorId == tutorId && a.TestType == IeltsTestType && !a.IsPassed)
            .Select(a => a.SubmittedAt)
            .ToListAsync(cancellationToken);
        var ieltsRetry = (ieltsAttempt != null && !ieltsAttempt.IsPassed)
            ? LaterWait(RetryMoment(ieltsAttempt.SubmittedAt, ieltsAttempt.AttemptNumber), ieltsFails)
            : null;

        return new List<TutorTestCommonDto>
        {
            new TutorTestCommonDto
            {
                TestType = "Pedagogical",
                Title = "Kỹ năng sư phạm & Quy tắc ứng xử",
                QuestionCount = pedQuestionsCount,
                Status = status,
                RetryAvailableAt = retryAt
            },
            new TutorTestCommonDto
            {
                TestType = IeltsTestType,
                Title = "Bài test IELTS",
                QuestionCount = ieltsCount,
                Status = ieltsStatus,
                RetryAvailableAt = ieltsRetry
            }
        };
    }

    public async Task<TutorPedagogicalTestStatusDto> GetPedagogicalTestStatusAsync(
        int tutorId, CancellationToken cancellationToken)
    {
        var latest = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(attempt => attempt.TutorId == tutorId
                && attempt.TestType == PedagogicalTestType
                && attempt.SubjectId == null
                && attempt.GradeLevel == null)
            .OrderByDescending(attempt => attempt.SubmittedAt)
            .ThenByDescending(attempt => attempt.AttemptId)
            .Select(attempt => new
            {
                attempt.ScorePercent,
                attempt.IsPassed,
                attempt.AttemptNumber,
                attempt.SubmittedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new TutorPedagogicalTestStatusDto
        {
            Status = StatusOf(latest == null ? null : new LatestAttempt
            {
                ScorePercent = latest.ScorePercent,
                IsPassed = latest.IsPassed,
                AttemptNumber = latest.AttemptNumber
            }),
            LatestScorePercent = latest?.ScorePercent,
            LatestIsPassed = latest?.IsPassed,
            LatestAttemptNumber = latest?.AttemptNumber,
            RetryAvailableAt = (latest != null && !latest.IsPassed) ? RetryMoment(latest.SubmittedAt, latest.AttemptNumber) : null
        };
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorPedagogicalTestQuestionsDto? Data)> GetPedagogicalTestQuestionsAsync(
        int tutorId, CancellationToken cancellationToken)
    {
        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, PedagogicalTestType, null, null, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var pool = await LoadPedagogicalQuestionsAsync(cancellationToken);
        if (pool.Count == 0)
            return (false, 404, "Hiện chưa có câu hỏi cho bài kiểm tra kỹ năng sư phạm.", null);

        var sampled = SampleQuestions(pool, 25);
        var now = DateTime.UtcNow;
        var paper = new TutorPedagogicalTestQuestionsDto
        {
            PassThreshold = await GetPassThresholdAsync(PedagogicalTestType, cancellationToken),
            StartedAt = now,
            DurationMinutes = 25,
            EndsAt = now.AddMinutes(25),
            Questions = sampled.Select(question => new TutorTestQuestionDto
            {
                QuestionId = question.QuestionId,
                Content = question.Content,
                OptionA = question.OptionA,
                OptionB = question.OptionB,
                OptionC = question.OptionC,
                OptionD = question.OptionD,
                Difficulty = question.Difficulty
            }).ToList()
        };
        paper.RunId = await OpenRunAsync(tutorId, PedagogicalTestType, null, null, paper.Questions.Select(q => q.QuestionId), paper.StartedAt, paper.EndsAt, cancellationToken);
        return (true, 200, string.Empty, paper);
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorPedagogicalTestResultDto? Data)> SubmitPedagogicalTestAsync(
        int tutorId, SubmitTutorPedagogicalTestDto dto, CancellationToken cancellationToken)
    {
        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, PedagogicalTestType, null, null, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var submittedAnswers = dto.Answers ?? new List<TutorTestAnswerSubmissionDto>();
        if (submittedAnswers.Count == 0)
            return (false, 400, "Bài làm không có câu trả lời nào.", null);

        if (submittedAnswers.GroupBy(answer => answer.QuestionId).Any(group => group.Count() > 1))
            return (false, 400, "Không được gửi câu trả lời trùng lặp.", null);

        if (submittedAnswers.Any(answer =>
                NormalizeOption(answer.SelectedOption) is { } option && option is not ("A" or "B" or "C" or "D")))
            return (false, 400, "Đáp án chỉ được chọn A, B, C hoặc D.", null);

        var submittedQuestionIds = submittedAnswers.Select(a => a.QuestionId).Distinct().ToList();
        var questions = await _db.Questions
            .Where(q => q.IsActive
                && q.TestType == PedagogicalTestType
                && q.SubjectId == null
                && q.GradeLevel == null
                && submittedQuestionIds.Contains(q.QuestionId))
            .ToListAsync(cancellationToken);

        if (questions.Count != submittedQuestionIds.Count)
            return (false, 400, "Bài làm chứa câu hỏi không thuộc bài kiểm tra này.", null);

        var answers = submittedAnswers.ToDictionary(
            answer => answer.QuestionId,
            answer => NormalizeOption(answer.SelectedOption));

        var passThreshold = await GetPassThresholdAsync(PedagogicalTestType, cancellationToken);
        var score = ScoreAnswers(questions, answers, passThreshold);
        var submittedAt = DateTime.UtcNow;
        var startedAt = dto.StartedAt?.ToUniversalTime() ?? submittedAt;
        if (startedAt > submittedAt)
            return (false, 400, "Thời điểm bắt đầu bài test không hợp lệ.", null);

        var attemptNumber = (await _db.TutorTestAttempts
            .Where(attempt => attempt.TutorId == tutorId
                && attempt.TestType == PedagogicalTestType
                && attempt.SubjectId == null
                && attempt.GradeLevel == null)
            .Select(attempt => (int?)attempt.AttemptNumber)
            .MaxAsync(cancellationToken) ?? 0) + 1;

        var retryAvailableAt = score.IsPassed ? null : (DateTime?)RetryMoment(submittedAt, attemptNumber);

        var attempt = new TutorTestAttempt
        {
            TutorId = tutorId,
            TestType = PedagogicalTestType,
            SubjectId = null,
            GradeLevel = null,
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
        await _db.SaveChangesAsync(cancellationToken);

        return (true, 200, string.Empty, new TutorPedagogicalTestResultDto
        {
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            ScorePercent = attempt.ScorePercent,
            PassThreshold = attempt.PassThreshold,
            IsPassed = attempt.IsPassed,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            RetryAvailableAt = retryAvailableAt
        });
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorTestQuestionsDto? Data)> GetIeltsTestQuestionsAsync(
        int tutorId, CancellationToken cancellationToken)
    {
        var subjectId = await IeltsSubjectIdAsync(cancellationToken);
        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, IeltsTestType, subjectId, null, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var pool = await _db.Questions
            .Where(q => q.IsActive && q.TestType == IeltsTestType)
            .OrderBy(q => q.QuestionId)
            .ToListAsync(cancellationToken);
        if (pool.Count == 0)
            return (false, 404, "Hiện chưa có câu hỏi cho bài test IELTS.", null);

        var sampled = SampleQuestions(pool, 25);
        var now = DateTime.UtcNow;
        var paper = new TutorTestQuestionsDto
        {
            SubjectId = subjectId ?? 0,
            SubjectName = "IELTS",
            EducationLevel = "Ngoại ngữ",
            GradeLevel = null,
            TestType = IeltsTestType,
            PassThreshold = await GetPassThresholdAsync(IeltsTestType, cancellationToken),
            StartedAt = now,
            DurationMinutes = 25,
            EndsAt = now.AddMinutes(25),
            Questions = sampled.Select(question => new TutorTestQuestionDto
            {
                QuestionId = question.QuestionId,
                Content = question.Content,
                OptionA = question.OptionA,
                OptionB = question.OptionB,
                OptionC = question.OptionC,
                OptionD = question.OptionD,
                Difficulty = question.Difficulty
            }).ToList()
        };
        paper.RunId = await OpenRunAsync(tutorId, IeltsTestType, subjectId, null, paper.Questions.Select(q => q.QuestionId), paper.StartedAt, paper.EndsAt, cancellationToken);
        return (true, 200, string.Empty, paper);
    }

    public async Task<(bool Success, int StatusCode, string Message, TutorTestAttemptDto? Data)> SubmitIeltsTestAsync(
        int tutorId, SubmitTutorTestDto dto, CancellationToken cancellationToken)
    {
        var subjectId = await IeltsSubjectIdAsync(cancellationToken);
        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, IeltsTestType, subjectId, null, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var submittedAnswers = dto.Answers ?? new List<TutorTestAnswerSubmissionDto>();
        if (submittedAnswers.Count == 0)
            return (false, 400, "Bài làm không có câu trả lời nào.", null);
        if (submittedAnswers.GroupBy(answer => answer.QuestionId).Any(group => group.Count() > 1))
            return (false, 400, "Không được gửi câu trả lời trùng lặp.", null);
        if (submittedAnswers.Any(answer =>
                NormalizeOption(answer.SelectedOption) is { } option && option is not ("A" or "B" or "C" or "D")))
            return (false, 400, "Đáp án chỉ được chọn A, B, C hoặc D.", null);

        var submittedQuestionIds = submittedAnswers.Select(a => a.QuestionId).Distinct().ToList();
        var questions = await _db.Questions
            .Where(q => q.IsActive && q.TestType == IeltsTestType && submittedQuestionIds.Contains(q.QuestionId))
            .ToListAsync(cancellationToken);
        if (questions.Count != submittedQuestionIds.Count)
            return (false, 400, "Bài làm chứa câu hỏi không thuộc bài test IELTS.", null);

        var answers = submittedAnswers.ToDictionary(
            answer => answer.QuestionId,
            answer => NormalizeOption(answer.SelectedOption));
        var passThreshold = await GetPassThresholdAsync(IeltsTestType, cancellationToken);
        var score = ScoreAnswers(questions, answers, passThreshold);
        var submittedAt = DateTime.UtcNow;
        var startedAt = dto.StartedAt?.ToUniversalTime() ?? submittedAt;
        if (startedAt > submittedAt)
            return (false, 400, "Thời điểm bắt đầu bài test không hợp lệ.", null);

        var attemptNumber = (await _db.TutorTestAttempts
            .Where(attempt => attempt.TutorId == tutorId && attempt.TestType == IeltsTestType)
            .Select(attempt => (int?)attempt.AttemptNumber)
            .MaxAsync(cancellationToken) ?? 0) + 1;
        var retryAvailableAt = score.IsPassed ? null : (DateTime?)RetryMoment(submittedAt, attemptNumber);

        var attempt = new TutorTestAttempt
        {
            TutorId = tutorId,
            TestType = IeltsTestType,
            SubjectId = subjectId,
            GradeLevel = null,
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
        await _db.SaveChangesAsync(cancellationToken);

        return (true, 200, string.Empty, new TutorTestAttemptDto
        {
            AttemptId = attempt.AttemptId,
            TestType = IeltsTestType,
            SubjectId = subjectId ?? 0,
            SubjectName = "Bài test IELTS",
            EducationLevel = "Ngoại ngữ",
            GradeLevel = null,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            ScorePercent = attempt.ScorePercent,
            PassThreshold = attempt.PassThreshold,
            IsPassed = attempt.IsPassed,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            RetryAvailableAt = retryAvailableAt
        });
    }

    private async Task<int?> IeltsSubjectIdAsync(CancellationToken cancellationToken)
    {
        return await _db.Subjects
            .AsNoTracking()
            .Where(s => s.IsActive && s.SubjectName == "IELTS")
            .Select(s => (int?)s.SubjectId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    // ---------------- ATTEMPTS HISTORY ----------------

    public async Task<List<TutorTestAttemptDto>> ListAttemptsAsync(int tutorId, CancellationToken cancellationToken)
    {
        await CloseStaleRunsAsync(cancellationToken);
        var attempts = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(attempt => attempt.TutorId == tutorId)
            .OrderByDescending(attempt => attempt.SubmittedAt)
            .Select(attempt => new
            {
                attempt.AttemptId,
                attempt.TestType,
                SubjectId = attempt.SubjectId ?? 0,
                SubjectName = attempt.Subject == null
                    ? (attempt.TestType == IeltsTestType
                        ? "Bài test IELTS"
                        : (attempt.TestType == PedagogicalTestType ? "Kỹ năng sư phạm & An toàn" : null))
                    : (attempt.TestType == IeltsTestType ? "Bài test IELTS" : attempt.Subject.SubjectName),
                EducationLevel = attempt.Subject == null ? "" : (attempt.Subject.EducationLevel ?? ""),
                attempt.GradeLevel,
                attempt.TotalQuestions,
                attempt.CorrectCount,
                attempt.ScorePercent,
                attempt.PassThreshold,
                attempt.IsPassed,
                attempt.AttemptNumber,
                attempt.StartedAt,
                attempt.SubmittedAt
            })
            .ToListAsync(cancellationToken);

        var rows = attempts.Select(attempt => new TutorTestAttemptDto
        {
            AttemptId = attempt.AttemptId,
            TestType = attempt.TestType,
            SubjectId = attempt.SubjectId,
            SubjectName = attempt.SubjectName,
            EducationLevel = attempt.EducationLevel,
            GradeLevel = attempt.GradeLevel,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            ScorePercent = attempt.ScorePercent,
            PassThreshold = attempt.PassThreshold,
            IsPassed = attempt.IsPassed,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            RetryAvailableAt = attempt.IsPassed ? null : (DateTime?)RetryMoment(attempt.SubmittedAt, attempt.AttemptNumber)
        }).ToList();

        foreach (var group in rows.GroupBy(row => (row.TestType, row.SubjectId, row.GradeLevel)))
        {
            var latest = group.OrderByDescending(row => row.SubmittedAt).First();
            if (latest.IsPassed) continue;
            latest.RetryAvailableAt = LaterWait(latest.RetryAvailableAt, group.Select(row => row.SubmittedAt));
        }
        return rows;
    }

    // ---------------- QUESTION SET ----------------

    public async Task<(bool Success, int StatusCode, string Message, TutorTestQuestionsDto? Data)> GetQuestionsAsync(
        int tutorId, int subjectId, string? gradeLevel, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(gradeLevel);
        if (normalizedGrade == null)
            return (false, 400, "Chọn lớp để làm bài kiểm tra.", null);

        var isRegistered = await _db.TutorSubjects.AnyAsync(
            ts => ts.TutorId == tutorId && ts.SubjectId == subjectId && ts.GradeLevel == normalizedGrade, cancellationToken);
        if (!isRegistered)
            return (false, 403, "Đăng ký tổ hợp (môn + lớp) trước khi làm bài kiểm tra.", null);

        var subject = await _db.Subjects
            .AsNoTracking()
            .Where(s => s.SubjectId == subjectId && s.IsActive)
            .Select(s => new { s.SubjectName, s.EducationLevel })
            .FirstOrDefaultAsync(cancellationToken);

        if (subject == null)
            return (false, 404, "Môn học không tồn tại hoặc chưa được kích hoạt.", null);

        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, ProfessionalTestType, subjectId, normalizedGrade, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var pool = await LoadQuestionsAsync(subjectId, normalizedGrade, cancellationToken);
        if (pool.Count == 0)
            return (false, 404, "Hiện chưa có câu hỏi cho bài kiểm tra này (môn + lớp).", null);

        var sampled = SampleQuestions(pool, 25);
        var now = DateTime.UtcNow;
        var paper = new TutorTestQuestionsDto
        {
            SubjectId = subjectId,
            SubjectName = subject.SubjectName,
            EducationLevel = subject.EducationLevel,
            GradeLevel = normalizedGrade,
            PassThreshold = await GetPassThresholdAsync(ProfessionalTestType, cancellationToken),
            StartedAt = now,
            DurationMinutes = 25,
            EndsAt = now.AddMinutes(25),
            Questions = sampled.Select(question => new TutorTestQuestionDto
            {
                QuestionId = question.QuestionId,
                Content = question.Content,
                OptionA = question.OptionA,
                OptionB = question.OptionB,
                OptionC = question.OptionC,
                OptionD = question.OptionD,
                Difficulty = question.Difficulty
            }).ToList()
        };
        paper.RunId = await OpenRunAsync(tutorId, ProfessionalTestType, subjectId, normalizedGrade, paper.Questions.Select(q => q.QuestionId), paper.StartedAt, paper.EndsAt, cancellationToken);
        return (true, 200, string.Empty, paper);
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

        var subjectInfo = await _db.Subjects
            .Where(subject => subject.SubjectId == dto.SubjectId)
            .Select(subject => new { subject.SubjectName, subject.EducationLevel })
            .FirstOrDefaultAsync(cancellationToken);
        if (subjectInfo == null)
            return (false, 404, "Môn học không tồn tại.", null);

        var retakeCheck = await CheckRetakeAllowedAsync(tutorId, ProfessionalTestType, dto.SubjectId, normalizedGrade, cancellationToken);
        if (!retakeCheck.Allowed)
            return (false, retakeCheck.StatusCode, retakeCheck.Message, null);

        var submittedAnswers = dto.Answers ?? new List<TutorTestAnswerSubmissionDto>();
        if (submittedAnswers.Count == 0)
            return (false, 400, "Bài làm không có câu trả lời nào.", null);

        if (submittedAnswers.GroupBy(answer => answer.QuestionId).Any(group => group.Count() > 1))
            return (false, 400, "Không được gửi câu trả lời trùng lặp.", null);

        if (submittedAnswers.Any(answer =>
                NormalizeOption(answer.SelectedOption) is { } option && option is not ("A" or "B" or "C" or "D")))
            return (false, 400, "Đáp án chỉ được chọn A, B, C hoặc D.", null);

        var submittedQuestionIds = submittedAnswers.Select(a => a.QuestionId).Distinct().ToList();
        var questions = await WhereGrade(
                _db.Questions.Where(q => q.IsActive
                    && q.TestType == ProfessionalTestType
                    && q.SubjectId == dto.SubjectId
                    && submittedQuestionIds.Contains(q.QuestionId)),
                normalizedGrade)
            .ToListAsync(cancellationToken);

        if (questions.Count != submittedQuestionIds.Count)
            return (false, 400, "Bài làm chứa câu hỏi không hợp lệ hoặc không thuộc bài kiểm tra này.", null);

        var answers = submittedAnswers.ToDictionary(
            answer => answer.QuestionId,
            answer => NormalizeOption(answer.SelectedOption));

        var passThreshold = await GetPassThresholdAsync(ProfessionalTestType, cancellationToken);
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

        var retryAvailableAt = score.IsPassed ? null : (DateTime?)RetryMoment(submittedAt, attemptNumber);

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
            SubmittedAt = attempt.SubmittedAt,
            RetryAvailableAt = retryAvailableAt
        });
    }

    // ---------------- REGISTRATION ----------------

    public async Task<(bool Success, int StatusCode, string Message)> CommitTeachingSubjectsAsync(
        int tutorId, CommitTeachingSubjectsDto? dto, CancellationToken cancellationToken)
    {
        var ids = (dto?.SubjectIds ?? new List<int>()).Where(id => id > 0).Distinct().ToList();
        var band = dto?.GradeLevel?.Trim();
        if (band is not ("Tiểu học" or "THCS" or "THPT"))
            return (false, 400, "Chọn cấp 1, THCS hoặc THPT trước.");
        if (ids.Count is < 1 or > 2)
            return (false, 400, "Chọn 1 hoặc 2 môn bạn muốn dạy.");

        var subjects = await _db.Subjects
            .Where(s => ids.Contains(s.SubjectId) && s.IsActive)
            .ToListAsync(cancellationToken);
        if (subjects.Count != ids.Count)
            return (false, 400, "Có môn học không hợp lệ.");
        foreach (var subject in subjects)
        {
            var pool = await LoadQuestionsAsync(subject.SubjectId, band, cancellationToken);
            if (pool.Count == 0)
                return (false, 409, $"Chưa có bài test {band} cho {subject.SubjectName}.");
        }

        var profile = await _db.TutorProfiles.FirstOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken);
        if (profile == null)
            return (false, 400, "Hồ sơ gia sư chưa có.");

        var existing = await _db.TutorSubjects.Where(ts => ts.TutorId == tutorId).ToListAsync(cancellationToken);
        var currentIds = existing.Select(ts => ts.SubjectId).Distinct().OrderBy(id => id).ToList();
        var wantedIds = ids.OrderBy(id => id).ToList();
        if (profile.SubjectsLocked)
        {
            if (!wantedIds.SequenceEqual(currentIds))
                return (false, 400, "Bạn đã chọn môn dạy và không sửa lại được.");
            return (true, 200, "Môn dạy đã được khóa.");
        }

        _db.TutorSubjects.RemoveRange(existing);
        await _db.SaveChangesAsync(cancellationToken);
        foreach (var subject in subjects)
        {
            _db.TutorSubjects.Add(new TutorSubject
            {
                TutorId = tutorId,
                SubjectId = subject.SubjectId,
                GradeLevel = band,
                IsVerified = false
            });
        }
        profile.SubjectsLocked = true;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        var names = string.Join(", ", subjects.Select(s => s.SubjectName));
        return (true, 200, $"Đã khóa môn dạy: {names}. Mỗi môn có một bài test chuyên môn.");
    }

    public async Task<(bool Success, int StatusCode, string Message)> RegisterCombinationAsync(
        int tutorId, RegisterTestCombinationDto dto, CancellationToken cancellationToken)
    {
        var normalizedGrade = NormalizeGrade(dto.GradeLevel);
        if (normalizedGrade == null)
            return (false, 400, "Chọn lớp cho môn học.");

        var subjectOk = await _db.Subjects.AnyAsync(s => s.SubjectId == dto.SubjectId && s.IsActive, cancellationToken);
        if (!subjectOk)
            return (false, 404, "Môn học không tồn tại hoặc chưa được kích hoạt.");

        var profile = await _db.TutorProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.TutorId == tutorId, cancellationToken);
        if (profile?.SubjectsLocked == true)
        {
            var allowed = await _db.TutorSubjects.AnyAsync(
                ts => ts.TutorId == tutorId && ts.SubjectId == dto.SubjectId, cancellationToken);
            if (!allowed)
                return (false, 403, "Môn này không nằm trong môn bạn đã chọn.");
        }

        var pool = await LoadQuestionsAsync(dto.SubjectId, normalizedGrade, cancellationToken);
        if (pool.Count == 0)
            return (false, 409, "Hiện chưa có bài test cho môn này.");

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

    // ---------------- RETAKE & COOLDOWN VALIDATION ----------------

    private async Task<(bool Allowed, int StatusCode, string Message, DateTime? RetryAvailableAt)> CheckRetakeAllowedAsync(
        int tutorId, string testType, int? subjectId, string? gradeLevel, CancellationToken cancellationToken)
    {
        var attempts = await _db.TutorTestAttempts
            .AsNoTracking()
            .Where(a => a.TutorId == tutorId
                && a.TestType == testType
                && a.SubjectId == subjectId
                && a.GradeLevel == gradeLevel)
            .OrderByDescending(a => a.SubmittedAt)
            .ToListAsync(cancellationToken);

        // 1. If tutor already passed, retaking is locked
        if (attempts.Any(a => a.IsPassed))
        {
            return (false, 409, "Bạn đã hoàn thành bài kiểm tra và đạt chuẩn. Không cần thi lại.", null);
        }

        var latest = attempts.FirstOrDefault();
        if (latest == null)
        {
            return (true, 200, string.Empty, null);
        }

        // 2. Max 3 failed attempts in the last 30 days
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var attemptsInWindow = attempts.Where(a => a.SubmittedAt >= thirtyDaysAgo).ToList();
        if (attemptsInWindow.Count >= 3)
        {
            var earliest = attemptsInWindow.MinBy(a => a.SubmittedAt);
            var retryDate = earliest!.SubmittedAt.AddDays(30);
            if (DateTime.UtcNow < retryDate)
            {
                return (false, 429, $"Bạn đã thi không đạt 3 lần trong vòng 30 ngày. Vui lòng ôn tập thêm và thử lại sau {retryDate:dd/MM/yyyy HH:mm}.", retryDate);
            }
        }

        var retryAvailableAt = RetryMoment(latest.SubmittedAt, latest.AttemptNumber);
        if (DateTime.UtcNow < retryAvailableAt)
        {
            var remaining = retryAvailableAt - DateTime.UtcNow;
            var hours = Math.Max(1, latest.AttemptNumber);
            var remainingMinutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
            return (false, 429, $"Lần thi này phải chờ {hours} giờ. Còn khoảng {remainingMinutes} phút.", retryAvailableAt);
        }

        return (true, 200, string.Empty, null);
    }

    // ---------------- DIFFICULTY MATRIX SAMPLING ----------------

    private static List<Question> SampleQuestions(List<Question> pool, int targetCount = 25)
    {
        if (pool.Count <= targetCount)
        {
            var fullList = pool.ToList();
            Shuffle(fullList);
            return fullList;
        }

        // Difficulty Matrix:
        // Easy (~15%): 3-4 questions
        // Medium (~60%): ~15 questions
        // Hard (~25%): 5-6 questions
        var easyList = new List<Question>();
        var mediumList = new List<Question>();
        var hardList = new List<Question>();

        foreach (var q in pool)
        {
            var diff = CategorizeDifficulty(q.Difficulty);
            if (diff == "Easy") easyList.Add(q);
            else if (diff == "Hard") hardList.Add(q);
            else mediumList.Add(q);
        }

        Shuffle(easyList);
        Shuffle(mediumList);
        Shuffle(hardList);

        var targetEasy = Math.Min(easyList.Count, Math.Max(1, (int)Math.Round(targetCount * 0.15)));
        var targetHard = Math.Min(hardList.Count, Math.Max(1, (int)Math.Round(targetCount * 0.25)));
        var targetMedium = Math.Min(mediumList.Count, targetCount - targetEasy - targetHard);

        var selected = new List<Question>();
        selected.AddRange(easyList.Take(targetEasy));
        selected.AddRange(hardList.Take(targetHard));
        selected.AddRange(mediumList.Take(targetMedium));

        // If targetCount still not reached due to small bucket counts, pull from remaining
        if (selected.Count < targetCount)
        {
            var selectedIds = selected.Select(q => q.QuestionId).ToHashSet();
            var remaining = pool.Where(q => !selectedIds.Contains(q.QuestionId)).ToList();
            Shuffle(remaining);
            selected.AddRange(remaining.Take(targetCount - selected.Count));
        }

        // Shuffle the final set so easy/medium/hard questions are evenly intermixed
        Shuffle(selected);
        return selected;
    }

    private static string CategorizeDifficulty(string? diff)
    {
        if (string.IsNullOrWhiteSpace(diff)) return "Medium";
        var d = diff.Trim().ToLowerInvariant();
        if (d.Contains("dễ") || d.Contains("easy") || d.Contains("nhận biết") || d.Contains("thông hiểu"))
            return "Easy";
        if (d.Contains("khó") || d.Contains("hard") || d.Contains("nâng cao") || d.Contains("sư phạm") || d.Contains("tình huống") || d.Contains("bảo vệ") || d.Contains("quy tắc an toàn"))
            return "Hard";
        return "Medium";
    }

    private static void Shuffle<T>(IList<T> list)
    {
        var rng = Random.Shared;
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
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
        return await WhereGrade(
                _db.Questions.Where(question => question.IsActive
                    && question.TestType == ProfessionalTestType
                    && question.SubjectId == subjectId),
                gradeLevel)
            .OrderBy(question => question.QuestionId)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<Question>> LoadPedagogicalQuestionsAsync(CancellationToken cancellationToken)
    {
        return await _db.Questions
            .Where(question => question.IsActive
                && question.TestType == PedagogicalTestType
                && question.SubjectId == null
                && question.GradeLevel == null)
            .OrderBy(question => question.QuestionId)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<GradeQuestionCount>> LoadQuestionCountsByGradeAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Questions
            .AsNoTracking()
            .Where(question => question.IsActive && question.TestType == ProfessionalTestType
                && question.SubjectId != null && question.GradeLevel != null)
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
            .Where(attempt => attempt.TutorId == tutorId
                && attempt.TestType == ProfessionalTestType
                && attempt.SubjectId != null)
            .OrderByDescending(attempt => attempt.SubmittedAt)
            .ThenByDescending(attempt => attempt.AttemptId)
            .Select(attempt => new
            {
                attempt.SubjectId,
                attempt.GradeLevel,
                attempt.ScorePercent,
                attempt.IsPassed,
                attempt.AttemptNumber,
                attempt.SubmittedAt
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<string, LatestAttempt>();
        foreach (var attempt in attempts)
        {
            var key = KeyOf(attempt.SubjectId!.Value, attempt.GradeLevel);
            if (!result.ContainsKey(key))
            {
                var retryAt = attempt.IsPassed ? null : (DateTime?)RetryMoment(attempt.SubmittedAt, attempt.AttemptNumber);
                result[key] = new LatestAttempt
                {
                    ScorePercent = attempt.ScorePercent,
                    IsPassed = attempt.IsPassed,
                    AttemptNumber = attempt.AttemptNumber,
                    SubmittedAt = attempt.SubmittedAt,
                    RetryAvailableAt = retryAt
                };
            }
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

    private async Task<decimal> GetPassThresholdAsync(string testType, CancellationToken cancellationToken)
    {
        var settingKey = testType == PedagogicalTestType ? "SAFETY_TEST_PASS_SCORE" : "SUBJECT_TEST_PASS_SCORE";
        var rawValue = await _db.PlatformSettings
            .AsNoTracking()
            .Where(setting => setting.SettingKey == settingKey || setting.SettingKey == PassThresholdSettingKey)
            .OrderByDescending(setting => setting.SettingKey == settingKey ? 1 : 0)
            .Select(setting => setting.SettingValue)
            .FirstOrDefaultAsync(cancellationToken);

        return decimal.TryParse(rawValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var threshold)
            && threshold is >= 0m and <= 100m
            ? threshold
            : (testType == PedagogicalTestType ? 80m : DefaultPassThreshold);
    }

    private static DateTime? LaterWait(DateTime? hourWait, IEnumerable<DateTime> submittedAt)
    {
        var now = DateTime.UtcNow;
        var recent = submittedAt
            .Select(at => at.Kind == DateTimeKind.Utc ? at : DateTime.SpecifyKind(at, DateTimeKind.Utc))
            .Where(at => at >= now.AddDays(-30))
            .OrderBy(at => at)
            .ToList();
        if (recent.Count < 3) return hourWait;
        var lockedUntil = recent[0].AddDays(30);
        if (hourWait == null || lockedUntil > hourWait.Value) return lockedUntil;
        return hourWait;
    }

    private static DateTime RetryMoment(DateTime submittedAt, int attemptNumber)
    {
        var hours = Math.Clamp(attemptNumber < 1 ? 1 : attemptNumber, 1, 24);
        var at = submittedAt.Kind == DateTimeKind.Utc
            ? submittedAt
            : DateTime.SpecifyKind(submittedAt, DateTimeKind.Utc);
        return at.AddHours(hours);
    }

    private static IQueryable<Question> WhereGrade(IQueryable<Question> query, string gradeLevel)
    {
        if (gradeLevel == "Tiểu học")
            return query.Where(q => q.GradeLevel == "Tiểu học"
                || q.GradeLevel == "Lớp 1" || q.GradeLevel == "Lớp 2"
                || q.GradeLevel == "Lớp 3" || q.GradeLevel == "Lớp 4"
                || q.GradeLevel == "Lớp 5");
        if (gradeLevel == "THCS")
            return query.Where(q => q.GradeLevel == "THCS"
                || q.GradeLevel == "Lớp 6" || q.GradeLevel == "Lớp 7"
                || q.GradeLevel == "Lớp 8" || q.GradeLevel == "Lớp 9");
        if (gradeLevel == "THPT")
            return query.Where(q => q.GradeLevel == "THPT"
                || q.GradeLevel == "Lớp 10" || q.GradeLevel == "Lớp 11"
                || q.GradeLevel == "Lớp 12");
        return query.Where(q => q.GradeLevel == gradeLevel);
    }

    private static string SubjectKey(string? name)
    {
        var folded = VietnameseText.Fold(name);
        return folded is "van" or "ngu van" ? "ngu van" : folded;
    }

    private static int SubjectOrder(string key)
    {
        var order = new[] { "toan", "tieng viet", "ngu van", "tieng anh", "ielts", "vat ly", "hoa hoc", "sinh hoc" };
        var index = Array.IndexOf(order, key);
        return index < 0 ? 100 : index;
    }

    private static bool GradeInBand(string? grade, string band)
    {
        if (string.IsNullOrWhiteSpace(grade)) return false;
        if (string.Equals(grade.Trim(), band, StringComparison.OrdinalIgnoreCase)) return true;
        var digits = new string(grade.Where(char.IsDigit).ToArray());
        if (!int.TryParse(digits, out var level)) return false;
        if (band == "Tiểu học") return level is >= 1 and <= 5;
        return band == "THCS" ? level is >= 6 and <= 9 : level is >= 10 and <= 12;
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

    private static LatestAttempt? LatestForAny(
        Dictionary<string, LatestAttempt> map, HashSet<int> subjectIds, string? gradeLevel)
    {
        LatestAttempt? best = null;
        foreach (var id in subjectIds)
        {
            var latest = LatestFor(map, id, gradeLevel);
            if (latest == null) continue;
            if (best == null || latest.SubmittedAt > best.SubmittedAt)
                best = latest;
        }
        return best;
    }

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
        public DateTime SubmittedAt { get; set; }
        public DateTime? RetryAvailableAt { get; set; }
    }

    public async Task HeartbeatRunAsync(int tutorId, int runId, List<TutorTestAnswerSubmissionDto>? answers, CancellationToken cancellationToken)
    {
        var run = await _db.TutorTestRuns.FirstOrDefaultAsync(r => r.RunId == runId && r.TutorId == tutorId && r.Status == "Open", cancellationToken);
        if (run == null) return;
        if (answers != null)
            run.AnswersJson = JsonSerializer.Serialize(answers);
        run.LastSeenAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CloseStaleRunsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var silentBefore = now.AddSeconds(-20);
        var rows = await _db.TutorTestRuns
            .AsNoTracking()
            .Where(r => r.Status == "Open" && (r.EndsAt <= now || (r.LastSeenAt < r.EndsAt && r.LastSeenAt <= silentBefore)))
            .Select(r => new { r.RunId, r.TutorId, r.EndsAt })
            .ToListAsync(cancellationToken);
        foreach (var row in rows)
        {
            var reason = row.EndsAt <= now
                ? "Hết giờ làm bài"
                : "Mất kết nối hoặc mất nguồn. Hệ thống đã nộp bài đã lưu.";
            await FinalizeRunAsync(row.TutorId, row.RunId, new SubmitTutorTestDto(), reason, cancellationToken);
        }
    }

    public async Task<(bool Success, int Status, string Message, object? Data)> FinalizeRunAsync(
        int tutorId, int runId, SubmitTutorTestDto dto, string? reason, CancellationToken cancellationToken)
    {
        var run = await _db.TutorTestRuns.FirstOrDefaultAsync(r => r.RunId == runId && r.TutorId == tutorId, cancellationToken);
        if (run == null)
            return (false, 404, "Không thấy phiên bài test.", null);
        if (run.Status == "Submitted" && run.AttemptId is int doneId)
            return (true, 200, "Bài đã được nộp.", await MapStoredAttemptAsync(doneId, cancellationToken));

        if (dto.Answers is { Count: > 0 })
            run.AnswersJson = JsonSerializer.Serialize(dto.Answers);
        run.CloseReason = string.IsNullOrWhiteSpace(reason) ? "Nộp bài" : reason.Trim();
        await _db.SaveChangesAsync(cancellationToken);

        var claimed = await _db.TutorTestRuns
            .Where(r => r.RunId == runId && r.TutorId == tutorId && r.Status == "Open")
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "Closing"), cancellationToken);
        if (claimed == 0)
        {
            var again = await _db.TutorTestRuns.AsNoTracking().FirstAsync(r => r.RunId == runId, cancellationToken);
            if (again.AttemptId is int existing)
                return (true, 200, "Bài đã được nộp.", await MapStoredAttemptAsync(existing, cancellationToken));
            return (false, 409, "Bài đang được nộp.", null);
        }

        var questionIds = JsonSerializer.Deserialize<List<int>>(run.QuestionIds) ?? new List<int>();
        var saved = string.IsNullOrWhiteSpace(run.AnswersJson)
            ? new List<TutorTestAnswerSubmissionDto>()
            : JsonSerializer.Deserialize<List<TutorTestAnswerSubmissionDto>>(run.AnswersJson) ?? new List<TutorTestAnswerSubmissionDto>();
        var byId = saved.GroupBy(a => a.QuestionId).ToDictionary(g => g.Key, g => g.Last().SelectedOption);
        dto.TestType = run.TestType;
        dto.SubjectId = run.SubjectId ?? dto.SubjectId;
        dto.GradeLevel = run.GradeLevel ?? dto.GradeLevel;
        dto.StartedAt = run.StartedAt.Kind == DateTimeKind.Utc ? run.StartedAt : DateTime.SpecifyKind(run.StartedAt, DateTimeKind.Utc);
        dto.Answers = questionIds.Select(id => new TutorTestAnswerSubmissionDto
        {
            QuestionId = id,
            SelectedOption = byId.TryGetValue(id, out var option) ? option : null
        }).ToList();

        (bool Success, int Status, string Message, object? Data, int? AttemptId) result;
        if (string.Equals(run.TestType, IeltsTestType, StringComparison.OrdinalIgnoreCase))
        {
            var ielts = await SubmitIeltsTestAsync(tutorId, dto, cancellationToken);
            result = (ielts.Success, ielts.StatusCode, ielts.Message, ielts.Data, ielts.Data?.AttemptId);
        }
        else if (string.Equals(run.TestType, PedagogicalTestType, StringComparison.OrdinalIgnoreCase)
            || string.Equals(run.TestType, "Safety", StringComparison.OrdinalIgnoreCase)
            || string.Equals(run.TestType, "Pedagogy", StringComparison.OrdinalIgnoreCase))
        {
            var ped = await SubmitPedagogicalTestAsync(tutorId, new SubmitTutorPedagogicalTestDto
            {
                StartedAt = dto.StartedAt,
                Answers = dto.Answers
            }, cancellationToken);
            result = (ped.Success, ped.StatusCode, ped.Message, ped.Data, ped.Data?.AttemptNumber > 0 ? null : null);
            if (ped.Success && ped.Data != null)
            {
                var attemptId = await _db.TutorTestAttempts
                    .Where(a => a.TutorId == tutorId && a.TestType == PedagogicalTestType)
                    .OrderByDescending(a => a.AttemptId)
                    .Select(a => (int?)a.AttemptId)
                    .FirstOrDefaultAsync(cancellationToken);
                result = (true, ped.StatusCode, ped.Message, ped.Data, attemptId);
            }
        }
        else
        {
            var pro = await SubmitAsync(tutorId, dto, cancellationToken);
            result = (pro.Success, pro.StatusCode, pro.Message, pro.Data, pro.Data?.AttemptId);
        }

        var tracked = await _db.TutorTestRuns.FirstAsync(r => r.RunId == runId, cancellationToken);
        if (!result.Success)
        {
            tracked.Status = "Open";
            await _db.SaveChangesAsync(cancellationToken);
            return (false, result.Status, result.Message, null);
        }

        tracked.Status = "Submitted";
        tracked.AttemptId = result.AttemptId;
        tracked.ClosedAt = DateTime.UtcNow;
        tracked.CloseReason = run.CloseReason;
        await _db.SaveChangesAsync(cancellationToken);
        return (true, 200, result.Message, result.Data);
    }

    private async Task<int> OpenRunAsync(
        int tutorId, string testType, int? subjectId, string? gradeLevel,
        IEnumerable<int> questionIds, DateTime startedAt, DateTime endsAt, CancellationToken cancellationToken)
    {
        var ids = questionIds.Distinct().ToList();
        var run = new TutorTestRun
        {
            TutorId = tutorId,
            TestType = testType,
            SubjectId = subjectId,
            GradeLevel = gradeLevel,
            QuestionIds = JsonSerializer.Serialize(ids),
            AnswersJson = "[]",
            StartedAt = startedAt,
            EndsAt = endsAt,
            LastSeenAt = endsAt,
            Status = "Open"
        };
        _db.TutorTestRuns.Add(run);
        await _db.SaveChangesAsync(cancellationToken);
        return run.RunId;
    }

    private async Task<TutorTestAttemptDto?> MapStoredAttemptAsync(int attemptId, CancellationToken cancellationToken)
    {
        var attempt = await _db.TutorTestAttempts
            .AsNoTracking()
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.AttemptId == attemptId, cancellationToken);
        if (attempt == null) return null;
        return new TutorTestAttemptDto
        {
            AttemptId = attempt.AttemptId,
            TestType = attempt.TestType,
            SubjectId = attempt.SubjectId ?? 0,
            SubjectName = attempt.Subject?.SubjectName ?? attempt.TestType,
            EducationLevel = attempt.Subject?.EducationLevel ?? "",
            GradeLevel = attempt.GradeLevel,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            ScorePercent = attempt.ScorePercent,
            PassThreshold = attempt.PassThreshold,
            IsPassed = attempt.IsPassed,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt.Kind == DateTimeKind.Utc ? attempt.StartedAt : DateTime.SpecifyKind(attempt.StartedAt, DateTimeKind.Utc),
            SubmittedAt = attempt.SubmittedAt.Kind == DateTimeKind.Utc ? attempt.SubmittedAt : DateTime.SpecifyKind(attempt.SubmittedAt, DateTimeKind.Utc),
            RetryAvailableAt = attempt.IsPassed ? null : (DateTime?)RetryMoment(attempt.SubmittedAt, attempt.AttemptNumber)
        };
    }

    private static string? NormalizeOption(string? option)
    {
        if (string.IsNullOrWhiteSpace(option)) return null;
        return option.Trim().ToUpperInvariant();
    }
}
