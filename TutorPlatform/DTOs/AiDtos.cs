using System;
using System.Collections.Generic;

namespace TutorPlatform.DTOs;

public class DiagnoseHomeworkRequest
{
    // Kept for backward compatibility with existing clients.
    public IFormFile? File { get; set; }

    public IFormFile? ProblemFile { get; set; }
    public IFormFile? ProblemImage { get; set; }
    public IFormFile? StudentSolutionFile { get; set; }
    public IFormFile? SolutionFile { get; set; }
    public IFormFile? StudentSolutionImage { get; set; }

    public string? StudentNote { get; set; }
}

public class DiagnosisResultDto
{
    public int DiagnosisId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? ProblemImageUrl { get; set; }
    public string? StudentSolutionImageUrl { get; set; }
    public string? SubjectName { get; set; }
    public string? GradeLevel { get; set; }
    public string? TopicName { get; set; }
    public string? TopicCode { get; set; }
    public string Severity { get; set; } = "Moderate"; // Critical / Moderate / Minor
    public string? OcrText { get; set; }
    public string? ProblemText { get; set; }
    public string? StudentSolutionText { get; set; }
    public string? CorrectSteps { get; set; }
    public string? IncorrectOrIncompleteSteps { get; set; }
    public string? ErrorCause { get; set; }
    public string? AiSummary { get; set; }
    public string? GapDetail { get; set; }
    public string? StudentMistake { get; set; }
    public string? StudyPlan { get; set; }
    public string Status { get; set; } = "Done";
    public DateTime CreatedAt { get; set; }
    public List<TutorSuggestionItemDto> SuggestedTutors { get; set; } = new();
}

public class TutorSuggestionItemDto
{
    public int TutorId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public byte RankNo { get; set; }
    public decimal MatchScore { get; set; }
    public string? Reason { get; set; }
    public decimal? TestScore { get; set; }
    public decimal HourlyRateMin { get; set; }
    public decimal HourlyRateMax { get; set; }
    public decimal AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public string TeachingMode { get; set; } = "Both";
    public string VerificationStatus { get; set; } = "Verified";
    public string? Bio { get; set; }
    public string? University { get; set; }
    public List<string> SubjectNames { get; set; } = new();
}

public class NaturalSearchRequestDto
{
    public string Prompt { get; set; } = string.Empty;
}

public class NaturalSearchParsedFilterDto
{
    public string? SubjectName { get; set; }
    public string? GradeLevel { get; set; }
    public string? Gender { get; set; }
    public string? TeachingMode { get; set; }
    public List<string> PreferredDays { get; set; } = new();
    public string? PreferredTime { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public List<string> Keywords { get; set; } = new();
    public string? Explanation { get; set; }
}

public class NaturalSearchResultDto
{
    public string Prompt { get; set; } = string.Empty;
    public NaturalSearchParsedFilterDto Filter { get; set; } = new();
    public List<TutorSuggestionItemDto> Tutors { get; set; } = new();
}

public class TopicItemDto
{
    public int TopicId { get; set; }
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string? GradeLevel { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public string? TopicCode { get; set; }
    public string? Description { get; set; }
}
