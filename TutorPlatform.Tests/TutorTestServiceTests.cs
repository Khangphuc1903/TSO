using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Tests;

public class TutorTestServiceTests
{
    [Fact]
    public async Task PedagogicalTest_CanFailRetryAndPass_WithoutChangingProfessionalTestHistory()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);

        var before = await service.GetPedagogicalTestStatusAsync(1, CancellationToken.None);
        Assert.Equal("Chưa làm", before.Status);

        var questions = await service.GetPedagogicalTestQuestionsAsync(1, CancellationToken.None);
        Assert.True(questions.Success);
        Assert.Equal(new[] { 7, 8 }, questions.Data!.Questions.Select(question => question.QuestionId).ToArray());

        var failed = await service.SubmitPedagogicalTestAsync(1, new SubmitTutorPedagogicalTestDto
        {
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 7, SelectedOption = "B" },
                new() { QuestionId = 8, SelectedOption = "A" }
            }
        }, CancellationToken.None);
        Assert.True(failed.Success);
        Assert.False(failed.Data!.IsPassed);
        Assert.Equal(1, failed.Data.AttemptNumber);
        Assert.Equal("Không đạt", (await service.GetPedagogicalTestStatusAsync(1, CancellationToken.None)).Status);

        var passed = await service.SubmitPedagogicalTestAsync(1, new SubmitTutorPedagogicalTestDto
        {
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 7, SelectedOption = "A" },
                new() { QuestionId = 8, SelectedOption = "C" }
            }
        }, CancellationToken.None);
        Assert.True(passed.Success);
        Assert.True(passed.Data!.IsPassed);
        Assert.Equal(2, passed.Data.AttemptNumber);
        Assert.Equal("Đạt", (await service.GetPedagogicalTestStatusAsync(1, CancellationToken.None)).Status);
        Assert.False((await service.GetPedagogicalTestQuestionsAsync(1, CancellationToken.None)).Success);

        Assert.Equal(2, db.TutorTestAttempts.Count());
        var attempt = db.TutorTestAttempts.OrderByDescending(item => item.AttemptNumber).First();
        Assert.Equal("Pedagogical", attempt.TestType);
        Assert.Null(attempt.SubjectId);
        Assert.Null(attempt.GradeLevel);
        Assert.Empty(await service.ListAttemptsAsync(1, CancellationToken.None));
        Assert.NotEmpty(await service.ListTestsAsync(1, CancellationToken.None));
    }

    [Fact]
    public async Task LevelSubjectGradeFlow_CombosAreTrackedIndependently()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);

        // Case 2: THCS + Toán + Lớp 8 => đúng bộ câu hỏi Toán lớp 8.
        var q8 = await service.GetQuestionsAsync(1, 8, "Lớp 8", CancellationToken.None);
        Assert.True(q8.Success);
        Assert.Equal("Lớp 8", q8.Data!.GradeLevel);
        Assert.Equal(new[] { 1, 2 }, q8.Data.Questions.Select(q => q.QuestionId).ToArray());
        Assert.Equal("THCS", q8.Data.EducationLevel);

        // Case 3: THCS + Toán + Lớp 12 => tutor chưa đăng ký tổ hợp này (và không có bài test
        // cho nó), nên bị chặn — tuyệt đối không lấy nhầm bộ câu hỏi Toán Lớp 8.
        var wrongGrade = await service.GetQuestionsAsync(1, 8, "Lớp 12", CancellationToken.None);
        Assert.False(wrongGrade.Success);
        Assert.Equal(403, wrongGrade.StatusCode);

        // THPT + Toán + Lớp 12 không thể lấy nhầm Toán lớp 8 THCS.
        var highSchool = await service.GetQuestionsAsync(1, 9, "Lớp 12", CancellationToken.None);
        Assert.True(highSchool.Success);
        Assert.Equal(new[] { 5, 6 }, highSchool.Data!.Questions.Select(q => q.QuestionId).ToArray());
        Assert.Equal("THPT", highSchool.Data.EducationLevel);

        // Case 4+5: chưa làm / chưa nộp => chưa được tính hoàn thành.
        var statusBefore = (await service.GetTestStatusAsync(1, 8, "Lớp 8", CancellationToken.None)).Data!;
        Assert.Equal("Chưa làm", statusBefore.Status);

        // Case 6: submit đạt => tổ hợp (cấp + môn + lớp) đạt.
        var passed = await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 8",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 1, SelectedOption = "A" },
                new() { QuestionId = 2, SelectedOption = "B" }
            }
        }, CancellationToken.None);
        Assert.True(passed.Success);
        Assert.True(passed.Data!.IsPassed);
        Assert.Equal(1, passed.Data.AttemptNumber);
        Assert.Equal(100m, passed.Data.ScorePercent);
        Assert.True(db.TutorSubjects.Any(ts => ts.TutorId == 1 && ts.SubjectId == 8 && ts.GradeLevel == "Lớp 8" && ts.IsVerified));

        // Case 8: đạt Lớp 8 không đồng nghĩa đạt Lớp 9.
        var statusGrade9 = (await service.GetTestStatusAsync(1, 8, "Lớp 9", CancellationToken.None)).Data!;
        Assert.Equal("Chưa làm", statusGrade9.Status);
        Assert.False(db.TutorSubjects.Any(ts => ts.TutorId == 1 && ts.SubjectId == 8 && ts.GradeLevel == "Lớp 9" && ts.IsVerified));
    }

    [Fact]
    public async Task FailedAttempt_AllowsRetry_AndKeepsCombinationUnverified()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);

        // Câu 3,4 đáp án đúng là C và D: submit sai để fail.
        var failed = await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 9",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 3, SelectedOption = "A" },
                new() { QuestionId = 4, SelectedOption = "B" }
            }
        }, CancellationToken.None);
        Assert.True(failed.Success);
        Assert.False(failed.Data!.IsPassed);
        Assert.Equal(1, failed.Data.AttemptNumber);
        Assert.False(db.TutorSubjects.Any(ts => ts.TutorId == 1 && ts.SubjectId == 8 && ts.GradeLevel == "Lớp 9" && ts.IsVerified));

        // Case 7: được làm lại.
        var retry = await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 9",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 3, SelectedOption = "C" },
                new() { QuestionId = 4, SelectedOption = "D" }
            }
        }, CancellationToken.None);
        Assert.True(retry.Success);
        Assert.True(retry.Data!.IsPassed);
        Assert.Equal(2, retry.Data.AttemptNumber);
        Assert.Equal("Đạt", (await service.GetTestStatusAsync(1, 8, "Lớp 9", CancellationToken.None)).Data!.Status);
    }

    [Fact]
    public async Task UnregisteredCombo_CannotTakeTest_AndMustRegisterFirst()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);

        // Case 1: chưa đăng ký môn/lớp => không có bài test.
        Assert.Empty(await service.ListTestsAsync(2, CancellationToken.None));

        // Case 9: yêu cầu câu hỏi for tổ hợp chưa đăng ký => reject.
        var forbidden = await service.GetQuestionsAsync(2, 8, "Lớp 8", CancellationToken.None);
        Assert.False(forbidden.Success);
        Assert.Equal(403, forbidden.StatusCode);

        var submitBlocked = await service.SubmitAsync(2, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 8",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 1, SelectedOption = "A" },
                new() { QuestionId = 2, SelectedOption = "B" }
            }
        }, CancellationToken.None);
        Assert.False(submitBlocked.Success);
        Assert.Equal(403, submitBlocked.StatusCode);

        // Đăng ký tổ hợp (cấp + môn + lớp) rồi mới làm được test.
        var reg = await service.RegisterCombinationAsync(2, new RegisterTestCombinationDto { SubjectId = 8, GradeLevel = "Lớp 8" }, CancellationToken.None);
        Assert.True(reg.Success);
        Assert.True((await service.GetQuestionsAsync(2, 8, "Lớp 8", CancellationToken.None)).Success);
    }

    [Fact]
    public async Task RegisterCombination_RequiresExistingTest_AndValidSubject()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);

        // Không có bộ câu hỏi cho tổ hợp này => không cho đăng ký (Case 3).
        var noTest = await service.RegisterCombinationAsync(1, new RegisterTestCombinationDto { SubjectId = 8, GradeLevel = "Lớp 12" }, CancellationToken.None);
        Assert.False(noTest.Success);
        Assert.Equal(409, noTest.StatusCode);

        // Môn không tồn tại => reject.
        var badSubject = await service.RegisterCombinationAsync(1, new RegisterTestCombinationDto { SubjectId = 999, GradeLevel = "Lớp 8" }, CancellationToken.None);
        Assert.False(badSubject.Success);
        Assert.Equal(404, badSubject.StatusCode);

        // Thiếu lớp => 400.
        var noGrade = await service.RegisterCombinationAsync(1, new RegisterTestCombinationDto { SubjectId = 8, GradeLevel = "  " }, CancellationToken.None);
        Assert.False(noGrade.Success);
        Assert.Equal(400, noGrade.StatusCode);
    }
[Fact]
    public async Task CrossTutorAccess_IsRejected()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);
        await service.RegisterCombinationAsync(1, new RegisterTestCombinationDto { SubjectId = 8, GradeLevel = "Lớp 8" }, CancellationToken.None);

        var passed = await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 8",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 1, SelectedOption = "A" },
                new() { QuestionId = 2, SelectedOption = "B" }
            }
        }, CancellationToken.None);
        Assert.True(passed.Success);

        // Case 10: tutor khác không đọc được kết quả / bài test của tutor này.
        Assert.Empty(await service.ListAttemptsAsync(2, CancellationToken.None));
        Assert.Empty(await service.ListTestsAsync(2, CancellationToken.None));
        Assert.False((await service.GetQuestionsAsync(2, 8, "Lớp 8", CancellationToken.None)).Success);

        // Status endpoint chỉ trả trạng thái CỦA CHÍNH tutor đó (chưa làm), không lộ kết quả của tutor 1.
        var ownStatus = (await service.GetTestStatusAsync(2, 8, "Lớp 8", CancellationToken.None)).Data!;
        Assert.False(ownStatus.IsRegistered);
        Assert.Equal("Chưa làm", ownStatus.Status);
        Assert.Null(ownStatus.LatestIsPassed);
    }

    [Fact]
    public async Task Submit_RejectsAnswersFromAnotherTest()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        await db.SaveChangesAsync();

        var service = new TutorTestService(db);
        await service.RegisterCombinationAsync(1, new RegisterTestCombinationDto { SubjectId = 8, GradeLevel = "Lớp 8" }, CancellationToken.None);

        // Câu hỏi 5 thuộc bài khác (Toán THPT Lớp 12) -> rejected.
        var result = await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 8",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 1, SelectedOption = "A" },
                new() { QuestionId = 5, SelectedOption = "B" }
            }
        }, CancellationToken.None);
        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public void ScoreAnswers_AtThreshold_ShouldPassAndRoundToTwoDecimals()
    {
        var questions = new List<Question>
        {
            new() { QuestionId = 1, CorrectAnswer = "A" },
            new() { QuestionId = 2, CorrectAnswer = "B" },
            new() { QuestionId = 3, CorrectAnswer = "C" }
        };
        var answers = new Dictionary<int, string?>
        {
            [1] = "a",
            [2] = "B",
            [3] = "D"
        };

        var result = TutorTestService.ScoreAnswers(questions, answers, 66.67m);

        Assert.Equal(2, result.CorrectCount);
        Assert.Equal(66.67m, result.ScorePercent);
        Assert.True(result.IsPassed);
    }

    [Fact]
    public async Task PublishRequiresAllRegisteredCombosVerified()
    {
        await using var db = CreateDbContext();
        SeedComboData(db);
        db.TutorProfiles.Add(new TutorProfile
        {
            TutorId = 1,
            TeachingMode = "Both",
            VerificationStatus = "Pending",
            IsPublished = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var workspace = new TutorWorkspaceService(db, null!);
        var service = new TutorTestService(db);

        UpdateTutorTeachingProfileDto PublishDto() => new()
        {
            TeachingMode = "Online",
            IsPublished = true,
            SubjectRegistrations = new List<SubjectRegistrationDto>
            {
                new() { SubjectId = 8, GradeLevel = "Lớp 8" },
                new() { SubjectId = 8, GradeLevel = "Lớp 9" }
            }
        };

        // Case 1+4: chưa hoàn thành bài test bắt buộce => KHÔNG được công công quỷ.
        var blocked = await workspace.UpdateProfileAsync(1, PublishDto(), CancellationToken.None);
        Assert.False(blocked.Success);
        Assert.Equal(400, blocked.Status);
        Assert.False(db.TutorProfiles.Single(p => p.TutorId == 1).IsPublished);

        // Case 8: đạt Toán Lớp 8 nhưng Lớp 9 chưa đạt => vẫn chưa đủ điều conditions.
        await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 8",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 1, SelectedOption = "A" },
                new() { QuestionId = 2, SelectedOption = "B" }
            }
        }, CancellationToken.None);

        var stillBlocked = await workspace.UpdateProfileAsync(1, PublishDto(), CancellationToken.None);
        Assert.False(stillBlocked.Success);
        Assert.Equal(400, stillBlocked.Status);

        // Đạt thêm Lớp 9 => đủ điều conditions, công công quỷ thành công.
        await service.SubmitAsync(1, new SubmitTutorTestDto
        {
            SubjectId = 8,
            GradeLevel = "Lớp 9",
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 3, SelectedOption = "C" },
                new() { QuestionId = 4, SelectedOption = "D" }
            }
        }, CancellationToken.None);

        var ok = await workspace.UpdateProfileAsync(1, PublishDto(), CancellationToken.None);
        Assert.False(ok.Success);
        Assert.Contains("sư phạm", ok.Message);

        var pedagogicalPassed = await service.SubmitPedagogicalTestAsync(1, new SubmitTutorPedagogicalTestDto
        {
            Answers = new List<TutorTestAnswerSubmissionDto>
            {
                new() { QuestionId = 7, SelectedOption = "A" },
                new() { QuestionId = 8, SelectedOption = "C" }
            }
        }, CancellationToken.None);
        Assert.True(pedagogicalPassed.Success);
        Assert.True(pedagogicalPassed.Data!.IsPassed);

        ok = await workspace.UpdateProfileAsync(1, PublishDto(), CancellationToken.None);
        Assert.True(ok.Success);
        Assert.True(db.TutorProfiles.Single(p => p.TutorId == 1).IsPublished);
        Assert.Equal("Verified", db.TutorProfiles.Single(p => p.TutorId == 1).VerificationStatus);
    }

    [Fact]
    public void ScoreAnswers_MissingAndWrongAnswers_ShouldFailBelowThreshold()
    {
        var questions = new List<Question>
        {
            new() { QuestionId = 1, CorrectAnswer = "A" },
            new() { QuestionId = 2, CorrectAnswer = "B" }
        };
        var answers = new Dictionary<int, string?> { [1] = null };

        var result = TutorTestService.ScoreAnswers(questions, answers, 70m);

        Assert.Equal(0, result.CorrectCount);
        Assert.Equal(0m, result.ScorePercent);
        Assert.False(result.IsPassed);
    }
private static TutorPlatformDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<TutorPlatformDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TutorPlatformDbContext(options);
    }

    private static void SeedComboData(TutorPlatformDbContext db)
    {
        db.Subjects.AddRange(
            new Subject { SubjectId = 8, SubjectName = "Toán", EducationLevel = "THCS", IsActive = true },
            new Subject { SubjectId = 9, SubjectName = "Toán 12", EducationLevel = "THPT", IsActive = true });

        db.TutorSubjects.AddRange(
            new TutorSubject { TutorId = 1, SubjectId = 8, GradeLevel = "Lớp 8", IsVerified = false },
            new TutorSubject { TutorId = 1, SubjectId = 8, GradeLevel = "Lớp 9", IsVerified = false },
            new TutorSubject { TutorId = 1, SubjectId = 9, GradeLevel = "Lớp 12", IsVerified = false });

        db.Questions.AddRange(
            Question(1, 8, "Lớp 8", "A"),
            Question(2, 8, "Lớp 8", "B"),
            Question(3, 8, "Lớp 9", "C"),
            Question(4, 8, "Lớp 9", "D"),
            Question(5, 9, "Lớp 12", "C"),
            Question(6, 9, "Lớp 12", "A"));

        db.Questions.AddRange(
            PedagogicalQuestion(7, "A"),
            PedagogicalQuestion(8, "C"));

        db.PlatformSettings.Add(new PlatformSetting
        {
            SettingKey = "TutorTestPassThreshold",
            SettingValue = "70",
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static Question Question(int questionId, int subjectId, string grade, string correctAnswer) => new()
    {
        QuestionId = questionId,
        SubjectId = subjectId,
        GradeLevel = grade,
        TestType = "Professional",
        Content = $"Question {questionId} ({grade})",
        OptionA = "Option A",
        OptionB = "Option B",
        OptionC = "Option C",
        OptionD = "Option D",
        CorrectAnswer = correctAnswer,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    private static Question PedagogicalQuestion(int questionId, string correctAnswer) => new()
    {
        QuestionId = questionId,
        TestType = "Pedagogical",
        SubjectId = null,
        GradeLevel = null,
        Content = $"Pedagogical question {questionId}",
        OptionA = "Option A",
        OptionB = "Option B",
        OptionC = "Option C",
        OptionD = "Option D",
        CorrectAnswer = correctAnswer,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
}