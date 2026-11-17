using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class AiMatchmakerService
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private readonly TutorPlatformDbContext _db;
    private readonly AiGeminiService _gemini;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AiMatchmakerService> _logger;

    public AiMatchmakerService(
        TutorPlatformDbContext db,
        AiGeminiService gemini,
        IWebHostEnvironment env,
        ILogger<AiMatchmakerService> logger)
    {
        _db = db;
        _gemini = gemini;
        _env = env;
        _logger = logger;
    }

    public async Task<DiagnosisResultDto> DiagnoseHomeworkAsync(
        int studentId,
        IFormFile? file,
        string? studentNote,
        CancellationToken ct = default)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Vui lòng chọn ảnh bài tập hoặc đề thi cần chẩn đoán.");

        if (file.Length > 10 * 1024 * 1024)
            throw new ArgumentException("Dung lượng ảnh tối đa 10 MB.");

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            throw new ArgumentException("Chỉ chấp nhận định dạng ảnh JPG, PNG, WEBP.");

        // 1. Lưu ảnh vào wwwroot/uploads/diagnoses/{studentId}/...
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", "diagnoses", studentId.ToString());
        Directory.CreateDirectory(dir);

        var safeName = $"diag_{studentId}_{DateTime.UtcNow.Ticks}{ext.ToLowerInvariant()}";
        var physicalPath = Path.Combine(dir, safeName);

        byte[] imageBytes;
        await using (var fileStream = File.Create(physicalPath))
        {
            await file.CopyToAsync(fileStream, ct);
        }
        imageBytes = await File.ReadAllBytesAsync(physicalPath, ct);

        var relativeUrl = $"/uploads/diagnoses/{studentId}/{safeName}";

        // 2. Gọi AI Gemini chẩn đoán
        var aiOutput = await _gemini.DiagnoseHomeworkImageAsync(imageBytes, file.ContentType, studentNote, ct);
        if (aiOutput == null)
            throw new InvalidOperationException("Gemini không đọc được ảnh.");

        // 3. Khớp SubjectId & TopicId
        var subject = await FindMatchingSubjectAsync(aiOutput.SubjectName, ct);
        int? subjectId = subject?.SubjectId;

        var topic = await FindOrCreateTopicAsync(subjectId, aiOutput.TopicName, aiOutput.TopicCode, aiOutput.GradeLevel, ct);
        int? topicId = topic?.TopicId;

        // 4. Lưu bản ghi KnowledgeGapDiagnoses
        var diagnosis = new KnowledgeGapDiagnosis
        {
            StudentId = studentId,
            SubjectId = subjectId,
            TopicId = topicId,
            ImageUrl = relativeUrl,
            OcrText = aiOutput.OcrText,
            AiSummary = aiOutput.AiSummary,
            GapDetail = aiOutput.GapDetail,
            GradeLevel = aiOutput.GradeLevel,
            Status = "Done",
            RawAiJson = JsonSerializer.Serialize(aiOutput),
            CreatedAt = DateTime.UtcNow
        };

        _db.KnowledgeGapDiagnoses.Add(diagnosis);
        await _db.SaveChangesAsync(ct);

        // 5. Chạy thuật toán Smart Matching tìm Top 3 gia sư
        var topTutors = await FindTop3MatchingTutorsAsync(diagnosis, subjectId, aiOutput, ct);

        // Lưu TutorMatchSuggestions
        foreach (var sug in topTutors)
        {
            _db.TutorMatchSuggestions.Add(new TutorMatchSuggestion
            {
                DiagnosisId = diagnosis.DiagnosisId,
                TutorId = sug.TutorId,
                RankNo = sug.RankNo,
                MatchScore = sug.MatchScore,
                Reason = sug.Reason,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync(ct);

        return new DiagnosisResultDto
        {
            DiagnosisId = diagnosis.DiagnosisId,
            ImageUrl = relativeUrl,
            SubjectName = subject?.SubjectName ?? aiOutput.SubjectName,
            GradeLevel = aiOutput.GradeLevel,
            TopicName = topic?.TopicName ?? aiOutput.TopicName,
            TopicCode = topic?.TopicCode ?? aiOutput.TopicCode,
            Severity = string.IsNullOrWhiteSpace(aiOutput.Severity) ? "Moderate" : aiOutput.Severity,
            OcrText = aiOutput.OcrText,
            AiSummary = aiOutput.AiSummary,
            GapDetail = aiOutput.GapDetail,
            StudentMistake = aiOutput.StudentMistake,
            StudyPlan = aiOutput.StudyPlan,
            Status = "Done",
            CreatedAt = diagnosis.CreatedAt,
            SuggestedTutors = topTutors
        };
    }

    public async Task<List<DiagnosisResultDto>> GetMyDiagnosesAsync(int studentId, CancellationToken ct = default)
    {
        var list = await _db.KnowledgeGapDiagnoses
            .Include(d => d.Subject)
            .Include(d => d.Topic)
            .Include(d => d.TutorMatchSuggestions)
                .ThenInclude(s => s.Tutor)
                    .ThenInclude(t => t.Tutor)
            .Where(d => d.StudentId == studentId)
            .OrderByDescending(d => d.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        return list.Select(MapDiagnosisDto).ToList();
    }

    public async Task<DiagnosisResultDto?> GetDiagnosisByIdAsync(int diagnosisId, CancellationToken ct = default)
    {
        var item = await _db.KnowledgeGapDiagnoses
            .Include(d => d.Subject)
            .Include(d => d.Topic)
            .Include(d => d.TutorMatchSuggestions)
                .ThenInclude(s => s.Tutor)
                    .ThenInclude(t => t.Tutor)
            .FirstOrDefaultAsync(d => d.DiagnosisId == diagnosisId, ct);

        return item == null ? null : MapDiagnosisDto(item);
    }

    public async Task<NaturalSearchResultDto> SearchNaturalAsync(
        int? userId,
        NaturalSearchRequestDto request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
            throw new ArgumentException("Vui lòng nhập câu tìm kiếm.");

        var prompt = request.Prompt.Trim();
        var parsed = await _gemini.ParseNaturalSearchQueryAsync(prompt, ct);

        // Lưu lịch sử NaturalSearchQueries
        int? subId = null;
        var matchingSubIds = new List<int>();
        if (parsed?.SubjectName != null)
        {
            matchingSubIds = await FindMatchingSubjectIdsAsync(parsed.SubjectName, ct);
            subId = matchingSubIds.FirstOrDefault();
            if (subId == 0) subId = null;
        }

        var log = new NaturalSearchQuery
        {
            UserId = userId,
            PromptText = prompt,
            ParsedJson = parsed != null ? JsonSerializer.Serialize(parsed) : null,
            SubjectId = subId,
            GradeLevel = parsed?.GradeLevel,
            Gender = parsed?.Gender,
            TeachingMode = parsed?.TeachingMode,
            PreferredDays = parsed?.PreferredDays != null ? string.Join(",", parsed.PreferredDays) : null,
            PreferredTime = parsed?.PreferredTime,
            MinPrice = parsed?.MinPrice,
            MaxPrice = parsed?.MaxPrice,
            CreatedAt = DateTime.UtcNow
        };
        _db.NaturalSearchQueries.Add(log);
        await _db.SaveChangesAsync(ct);

        // Query database gia sư theo filter
        var candidatesQuery = _db.TutorProfiles
            .Include(t => t.Tutor)
            .Include(t => t.TutorSubjects)
                .ThenInclude(ts => ts.Subject)
            .Where(t => t.IsPublished && t.Tutor.Status == "Active");

        if (matchingSubIds.Any())
        {
            candidatesQuery = candidatesQuery.Where(t => t.TutorSubjects.Any(ts => matchingSubIds.Contains(ts.SubjectId)));
        }

        if (!string.IsNullOrWhiteSpace(parsed?.Gender))
        {
            var g = parsed.Gender.Trim().ToLower();
            if (g == "female")
                candidatesQuery = candidatesQuery.Where(t => t.Tutor.Gender == "Female" || t.Tutor.Gender == "Nữ");
            else if (g == "male")
                candidatesQuery = candidatesQuery.Where(t => t.Tutor.Gender == "Male" || t.Tutor.Gender == "Nam");
        }

        if (!string.IsNullOrWhiteSpace(parsed?.TeachingMode) && parsed.TeachingMode != "Both")
        {
            candidatesQuery = candidatesQuery.Where(t => t.TeachingMode == parsed.TeachingMode || t.TeachingMode == "Both");
        }

        if (parsed?.MaxPrice > 0)
        {
            candidatesQuery = candidatesQuery.Where(t => t.HourlyRateMin <= parsed.MaxPrice.Value);
        }

        var candidateList = await candidatesQuery.Take(15).ToListAsync(ct);

        // Nếu lọc quá chặt dẫn đến 0 kết quả, nới lỏng học phí và hình thức học để tìm gia sư gần khớp nhất
        if (!candidateList.Any() && matchingSubIds.Any())
        {
            var fallbackQuery = _db.TutorProfiles
                .Include(t => t.Tutor)
                .Include(t => t.TutorSubjects)
                    .ThenInclude(ts => ts.Subject)
                .Where(t => t.IsPublished && t.Tutor.Status == "Active" && t.TutorSubjects.Any(ts => matchingSubIds.Contains(ts.SubjectId)));

            if (!string.IsNullOrWhiteSpace(parsed?.Gender))
            {
                var g = parsed.Gender.Trim().ToLower();
                if (g == "female")
                    fallbackQuery = fallbackQuery.Where(t => t.Tutor.Gender == "Female" || t.Tutor.Gender == "Nữ");
                else if (g == "male")
                    fallbackQuery = fallbackQuery.Where(t => t.Tutor.Gender == "Male" || t.Tutor.Gender == "Nam");
            }

            candidateList = await fallbackQuery.Take(10).ToListAsync(ct);
        }

        // Tính điểm độ khớp cho từng gia sư
        var scoredList = new List<TutorSuggestionItemDto>();
        byte rank = 1;
        foreach (var t in candidateList)
        {
            decimal score = 80m;
            var reasons = new List<string>();

            if (subId.HasValue)
            {
                score += 10m;
                reasons.Add($"Dạy chuyên sâu môn {parsed?.SubjectName}");
            }

            if (t.AverageRating >= 4.8m)
            {
                score += 5m;
                reasons.Add($"Đánh giá xuất sắc {t.AverageRating:N1}⭐");
            }

            if (parsed?.MaxPrice > 0 && t.HourlyRateMin <= parsed.MaxPrice)
            {
                reasons.Add($"Học phí hợp lý (~{t.HourlyRateMin:N0}₫/buổi)");
            }

            if (parsed?.Keywords != null)
            {
                foreach (var kw in parsed.Keywords)
                {
                    if (!string.IsNullOrEmpty(t.Bio) && t.Bio.Contains(kw, StringComparison.OrdinalIgnoreCase))
                    {
                        score += 3m;
                        reasons.Add($"Phù hợp tiêu chí \"{kw}\"");
                        break;
                    }
                }
            }

            scoredList.Add(new TutorSuggestionItemDto
            {
                TutorId = t.TutorId,
                FullName = t.Tutor.FullName,
                AvatarUrl = t.Tutor.AvatarUrl,
                RankNo = rank++,
                MatchScore = Math.Min(99.0m, score),
                Reason = reasons.Any() ? string.Join(" • ", reasons) : "Đáp ứng đầy đủ tiêu chí tìm kiếm của bạn",
                HourlyRateMin = t.HourlyRateMin ?? 0m,
                HourlyRateMax = t.HourlyRateMax ?? 0m,
                AverageRating = t.AverageRating,
                TotalReviews = t.TotalReviews,
                TeachingMode = t.TeachingMode,
                VerificationStatus = t.VerificationStatus,
                Bio = t.Bio,
                University = t.University,
                SubjectNames = t.TutorSubjects.Select(s => s.Subject.SubjectName).ToList()
            });
        }

        scoredList = scoredList.OrderByDescending(s => s.MatchScore).ToList();
        // Cập nhật lại rank
        for (int i = 0; i < scoredList.Count; i++)
        {
            scoredList[i].RankNo = (byte)(i + 1);
        }

        return new NaturalSearchResultDto
        {
            Prompt = prompt,
            Filter = new NaturalSearchParsedFilterDto
            {
                SubjectName = parsed?.SubjectName,
                GradeLevel = parsed?.GradeLevel,
                Gender = parsed?.Gender,
                TeachingMode = parsed?.TeachingMode,
                PreferredDays = parsed?.PreferredDays ?? new(),
                PreferredTime = parsed?.PreferredTime,
                MinPrice = parsed?.MinPrice,
                MaxPrice = parsed?.MaxPrice,
                Keywords = parsed?.Keywords ?? new(),
                Explanation = parsed?.Explanation ?? "Đã tự động trích xuất các tiêu chí tìm kiếm từ câu hỏi của bạn."
            },
            Tutors = scoredList
        };
    }

    public async Task<List<TopicItemDto>> GetTopicsAsync(int? subjectId, CancellationToken ct = default)
    {
        var query = _db.KnowledgeTopics.Include(t => t.Subject).Where(t => t.IsActive);
        if (subjectId.HasValue)
        {
            query = query.Where(t => t.SubjectId == subjectId.Value);
        }

        var list = await query.OrderBy(t => t.GradeLevel).ThenBy(t => t.TopicName).ToListAsync(ct);
        return list.Select(t => new TopicItemDto
        {
            TopicId = t.TopicId,
            SubjectId = t.SubjectId,
            SubjectName = t.Subject.SubjectName,
            GradeLevel = t.GradeLevel,
            TopicName = t.TopicName,
            TopicCode = t.TopicCode,
            Description = t.Description
        }).ToList();
    }

    // === PRIVATE HELPERS ===

    private async Task<List<TutorSuggestionItemDto>> FindTop3MatchingTutorsAsync(
        KnowledgeGapDiagnosis diagnosis,
        int? subjectId,
        GeminiDiagnosisOutput aiOutput,
        CancellationToken ct)
    {
        var candidatesQuery = _db.TutorProfiles
            .Include(t => t.Tutor)
            .Include(t => t.TutorSubjects)
                .ThenInclude(ts => ts.Subject)
            .Where(t => t.IsPublished && t.Tutor.Status == "Active");

        var matchingSubIds = await FindMatchingSubjectIdsAsync(aiOutput?.SubjectName, ct);
        if (subjectId.HasValue && !matchingSubIds.Contains(subjectId.Value))
        {
            matchingSubIds.Add(subjectId.Value);
        }

        if (matchingSubIds.Any())
        {
            candidatesQuery = candidatesQuery.Where(t => t.TutorSubjects.Any(ts => matchingSubIds.Contains(ts.SubjectId)));
        }

        var candidates = await candidatesQuery.ToListAsync(ct);
        if (!candidates.Any())
        {
            // Fallback nếu không có ai dạy đúng subjectId
            candidates = await _db.TutorProfiles
                .Include(t => t.Tutor)
                .Include(t => t.TutorSubjects)
                    .ThenInclude(ts => ts.Subject)
                .Where(t => t.IsPublished && t.Tutor.Status == "Active")
                .Take(5)
                .ToListAsync(ct);
        }

        // Lấy điểm thi test chuyên môn của các gia sư
        var tutorIds = candidates.Select(c => c.TutorId).ToList();
        var testAttempts = await _db.TutorTestAttempts
            .Where(a => tutorIds.Contains(a.TutorId) && a.IsPassed)
            .OrderByDescending(a => a.ScorePercent)
            .ToListAsync(ct);

        var scored = new List<(TutorProfile tutor, decimal score, decimal? testScore, string reason)>();

        foreach (var tutor in candidates)
        {
            var bestAttempt = testAttempts.FirstOrDefault(a => a.TutorId == tutor.TutorId && (subjectId == null || a.SubjectId == subjectId));
            decimal testScore = bestAttempt?.ScorePercent ?? (tutor.VerificationStatus == "Verified" ? 85m : 75m);
            decimal ratingScore = (tutor.AverageRating > 0 ? tutor.AverageRating : 4.8m) * 20m;
            decimal bonus = 0m;

            var reasons = new List<string>();

            if (bestAttempt != null)
            {
                bonus += 10m;
                reasons.Add($"Đạt {bestAttempt.ScorePercent:N0}% điểm bài test năng lực chuyên môn");
            }
            else
            {
                reasons.Add("Hồ sơ năng lực chuyên môn đã được kiểm duyệt");
            }

            if (tutor.AverageRating >= 4.8m)
            {
                reasons.Add($"Đánh giá xuất sắc {tutor.AverageRating:N1}⭐ ({tutor.TotalReviews} đánh giá)");
            }

            if (!string.IsNullOrEmpty(aiOutput?.TopicName) && !string.IsNullOrEmpty(tutor.Bio) &&
                tutor.Bio.Contains(aiOutput.TopicName, StringComparison.OrdinalIgnoreCase))
            {
                bonus += 10m;
                reasons.Add($"Chuyên gia kèm cặp chuyên đề {aiOutput.TopicName}");
            }
            else
            {
                reasons.Add($"Nhiều năm kinh nghiệm lấy lại gốc môn {aiOutput?.SubjectName ?? "học"}");
            }

            // Công thức: MatchScore = 50% TestScore + 30% RatingScore + 20% Bonus
            decimal totalScore = Math.Min(99.5m, (testScore * 0.50m) + (ratingScore * 0.30m) + (bonus * 0.20m));
            scored.Add((tutor, totalScore, bestAttempt?.ScorePercent, string.Join(" • ", reasons)));
        }

        var top3 = scored
            .OrderByDescending(s => s.score)
            .Take(3)
            .ToList();

        var result = new List<TutorSuggestionItemDto>();
        byte rank = 1;
        foreach (var (t, score, testSc, reason) in top3)
        {
            result.Add(new TutorSuggestionItemDto
            {
                TutorId = t.TutorId,
                FullName = t.Tutor.FullName,
                AvatarUrl = t.Tutor.AvatarUrl,
                RankNo = rank++,
                MatchScore = score,
                Reason = reason,
                TestScore = testSc,
                HourlyRateMin = t.HourlyRateMin ?? 0m,
                HourlyRateMax = t.HourlyRateMax ?? 0m,
                AverageRating = t.AverageRating,
                TotalReviews = t.TotalReviews,
                TeachingMode = t.TeachingMode,
                VerificationStatus = t.VerificationStatus,
                Bio = t.Bio,
                University = t.University,
                SubjectNames = t.TutorSubjects.Select(s => s.Subject.SubjectName).ToList()
            });
        }

        return result;
    }

    private async Task<Subject?> FindMatchingSubjectAsync(string? subjectName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(subjectName)) return null;

        var clean = subjectName.Trim();
        var folded = VietnameseText.Fold(clean);

        var subjects = await _db.Subjects.ToListAsync(ct);
        return subjects.FirstOrDefault(s =>
            string.Equals(s.SubjectName, clean, StringComparison.OrdinalIgnoreCase) ||
            VietnameseText.Fold(s.SubjectName).Equals(folded, StringComparison.OrdinalIgnoreCase) ||
            s.SubjectName.Contains(clean, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<List<int>> FindMatchingSubjectIdsAsync(string? subjectName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(subjectName)) return new List<int>();

        var clean = subjectName.Trim();
        var folded = VietnameseText.Fold(clean);

        var subjects = await _db.Subjects.ToListAsync(ct);
        return subjects
            .Where(s =>
                string.Equals(s.SubjectName, clean, StringComparison.OrdinalIgnoreCase) ||
                VietnameseText.Fold(s.SubjectName).Equals(folded, StringComparison.OrdinalIgnoreCase) ||
                s.SubjectName.Contains(clean, StringComparison.OrdinalIgnoreCase) ||
                clean.Contains(s.SubjectName, StringComparison.OrdinalIgnoreCase))
            .Select(s => s.SubjectId)
            .ToList();
    }

    private async Task<KnowledgeTopic?> FindOrCreateTopicAsync(
        int? subjectId,
        string? topicName,
        string? topicCode,
        string? gradeLevel,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(topicName) || !subjectId.HasValue) return null;

        var cleanName = topicName.Trim();
        var existing = await _db.KnowledgeTopics
            .FirstOrDefaultAsync(t => t.SubjectId == subjectId.Value &&
                (t.TopicName == cleanName || (topicCode != null && t.TopicCode == topicCode)), ct);

        if (existing != null) return existing;

        var newTopic = new KnowledgeTopic
        {
            SubjectId = subjectId.Value,
            TopicName = cleanName,
            TopicCode = topicCode ?? $"TOPIC_{DateTime.UtcNow.Ticks % 100000}",
            GradeLevel = gradeLevel,
            Description = $"Chuyên đề kiến thức được AI tự động phân tích: {cleanName}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.KnowledgeTopics.Add(newTopic);
        await _db.SaveChangesAsync(ct);
        return newTopic;
    }

    private static DiagnosisResultDto MapDiagnosisDto(KnowledgeGapDiagnosis d)
    {
        var rawParsed = !string.IsNullOrEmpty(d.RawAiJson)
            ? JsonSerializer.Deserialize<GeminiDiagnosisOutput>(d.RawAiJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            : null;

        return new DiagnosisResultDto
        {
            DiagnosisId = d.DiagnosisId,
            ImageUrl = d.ImageUrl,
            SubjectName = d.Subject?.SubjectName ?? rawParsed?.SubjectName,
            GradeLevel = d.GradeLevel ?? rawParsed?.GradeLevel,
            TopicName = d.Topic?.TopicName ?? rawParsed?.TopicName,
            TopicCode = d.Topic?.TopicCode ?? rawParsed?.TopicCode,
            Severity = rawParsed?.Severity ?? "Moderate",
            OcrText = d.OcrText,
            AiSummary = d.AiSummary,
            GapDetail = d.GapDetail,
            StudentMistake = rawParsed?.StudentMistake,
            StudyPlan = rawParsed?.StudyPlan,
            Status = d.Status,
            CreatedAt = d.CreatedAt,
            SuggestedTutors = d.TutorMatchSuggestions
                .OrderBy(s => s.RankNo)
                .Select(s => new TutorSuggestionItemDto
                {
                    TutorId = s.TutorId,
                    FullName = s.Tutor.Tutor.FullName,
                    AvatarUrl = s.Tutor.Tutor.AvatarUrl,
                    RankNo = s.RankNo,
                    MatchScore = s.MatchScore,
                    Reason = s.Reason,
                    HourlyRateMin = s.Tutor.HourlyRateMin ?? 0m,
                    HourlyRateMax = s.Tutor.HourlyRateMax ?? 0m,
                    AverageRating = s.Tutor.AverageRating,
                    TotalReviews = s.Tutor.TotalReviews,
                    TeachingMode = s.Tutor.TeachingMode,
                    VerificationStatus = s.Tutor.VerificationStatus,
                    Bio = s.Tutor.Bio,
                    University = s.Tutor.University,
                    SubjectNames = s.Tutor.TutorSubjects.Select(ts => ts.Subject.SubjectName).ToList()
                }).ToList()
        };
    }
}
