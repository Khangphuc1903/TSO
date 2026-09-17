using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Tests;

public class SubjectSearchServiceTests
{
    private static List<Subject> BuildSubjects() => new()
    {
        new Subject
        {
            SubjectId = 1,
            SubjectName = "Toán",
            EducationLevel = "THPT",
            IsActive = true
        },
        new Subject
        {
            SubjectId = 2,
            SubjectName = "Toán cao cấp",
            EducationLevel = "Đại học",
            IsActive = true
        },
        new Subject
        {
            SubjectId = 3,
            SubjectName = "Tiếng Anh",
            EducationLevel = "THCS",
            IsActive = false
        }
    };

    [Fact]
    public void ApplyFilters_Keyword_ShouldReturnMatchingSubjectsOnly()
    {
        var subjects = BuildSubjects();

        var result = SubjectSearchService.ApplyFilters(subjects, new SubjectSearchRequest
        {
            Keyword = "toán"
        });

        Assert.Equal(2, result.Count);
        Assert.All(result, s => Assert.Contains("toán", s.SubjectName, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void ApplyFilters_OnlyActive_ShouldExcludeInactiveSubjects()
    {
        var subjects = BuildSubjects();

        var result = SubjectSearchService.ApplyFilters(subjects, new SubjectSearchRequest
        {
            OnlyActive = true
        });

        Assert.Equal(2, result.Count);
        Assert.All(result, s => Assert.True(s.IsActive));
    }

    [Fact]
    public void ApplyFilters_NoMatch_ShouldReturnEmptyList()
    {
        var subjects = BuildSubjects();

        var result = SubjectSearchService.ApplyFilters(subjects, new SubjectSearchRequest
        {
            Keyword = "không tồn tại",
            OnlyActive = true
        });

        Assert.Empty(result);
    }
}