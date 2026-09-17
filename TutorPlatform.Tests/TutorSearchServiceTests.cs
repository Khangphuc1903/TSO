using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Tests;

public class TutorSearchServiceTests
{
    [Fact]
    public void ApplyFilters_KeywordSubjectAndCity_ShouldReturnMatchingTutors()
    {
        var tutors = new List<TutorProfile>
        {
            new TutorProfile
            {
                TutorId = 1,
                Tutor = new User { UserId = 1, FullName = "Alice", City = "Hanoi" },
                Bio = "Math tutor with IELTS coaching",
                YearsOfExperience = 5,
                HourlyRateMin = 150000,
                HourlyRateMax = 250000,
                TeachingMode = "Online",
                VerificationStatus = "Verified",
                IsPublished = true,
                TutorSubjects = new List<TutorSubject>
                {
                    new TutorSubject
                    {
                        SubjectId = 1,
                        Subject = new Subject { SubjectId = 1, SubjectName = "Toán" }
                    }
                }
            },
            new TutorProfile
            {
                TutorId = 2,
                Tutor = new User { UserId = 2, FullName = "Bob", City = "Da Nang" },
                Bio = "English tutor",
                YearsOfExperience = 2,
                HourlyRateMin = 120000,
                HourlyRateMax = 180000,
                TeachingMode = "Offline",
                VerificationStatus = "Pending",
                IsPublished = true,
                TutorSubjects = new List<TutorSubject>
                {
                    new TutorSubject { Subject = new Subject { SubjectName = "Tiếng Anh" } }
                }
            }
        };

        var result = TutorSearchService.ApplyFilters(tutors, new TutorSearchRequest
        {
            Keyword = "toán",
            SubjectId = 1,
            City = "Hanoi",
            MinPrice = 100000,
            MaxPrice = 300000,
            MinExperience = 1,
            TeachingMode = "Online"
        });

        Assert.Single(result);
        Assert.Equal(1, result[0].TutorId);
    }

    [Fact]
    public void ApplyFilters_EmptyQuery_ShouldReturnPublishedTutors()
    {
        var tutors = new List<TutorProfile>
        {
            new TutorProfile { TutorId = 1, IsPublished = true, Tutor = new User { FullName = "Alice", City = "Hanoi" }, TutorSubjects = new List<TutorSubject>() },
            new TutorProfile { TutorId = 2, IsPublished = false, Tutor = new User { FullName = "Bob", City = "Hanoi" }, TutorSubjects = new List<TutorSubject>() },
            new TutorProfile { TutorId = 3, IsPublished = true, Tutor = new User { FullName = "Charlie", City = "Da Nang" }, TutorSubjects = new List<TutorSubject>() }
        };

        var result = TutorSearchService.ApplyFilters(tutors, new TutorSearchRequest());

        Assert.Equal(2, result.Count);
        Assert.All(result, tutor => Assert.True(tutor.IsPublished));
    }
}
