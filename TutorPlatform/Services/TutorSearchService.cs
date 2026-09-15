using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services
{
    public class TutorSearchResultItem
    {
        public int TutorId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public int? YearsOfExperience { get; set; }
        public decimal? HourlyRateMin { get; set; }
        public decimal? HourlyRateMax { get; set; }
        public string? TeachingMode { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public string? VerificationStatus { get; set; }
        public bool IsPublished { get; set; }
        public List<string> Subjects { get; set; } = new();
    }

    public class TutorSearchService
    {
        private readonly TutorPlatformDbContext _db;

        public TutorSearchService(TutorPlatformDbContext db)
        {
            _db = db;
        }

        public static List<TutorProfile> ApplyFilters(IEnumerable<TutorProfile> tutors, TutorSearchRequest? request)
        {
            var search = request ?? new TutorSearchRequest();
            var query = tutors.AsQueryable();

            if (search.IsPublishedOnly)
            {
                query = query.Where(tp => tp.IsPublished);
            }

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var keyword = search.Keyword.Trim();
                query = query.Where(tp =>
                    (tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.FullName) && tp.Tutor.FullName.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(tp.Bio) && tp.Bio.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(tp.University) && tp.University.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(tp.Major) && tp.Major.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    tp.TutorSubjects.Any(ts => ts.Subject != null && !string.IsNullOrWhiteSpace(ts.Subject.SubjectName) && ts.Subject.SubjectName.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                );
            }

            if (search.SubjectId.HasValue)
            {
                query = query.Where(tp => tp.TutorSubjects.Any(ts => ts.SubjectId == search.SubjectId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search.SubjectName))
            {
                var subjectName = search.SubjectName.Trim();
                query = query.Where(tp => tp.TutorSubjects.Any(ts =>
                    ts.Subject != null &&
                    !string.IsNullOrWhiteSpace(ts.Subject.SubjectName) &&
                    ts.Subject.SubjectName.Contains(subjectName, StringComparison.OrdinalIgnoreCase)));
            }

            if (!string.IsNullOrWhiteSpace(search.City))
            {
                var city = search.City.Trim();
                query = query.Where(tp => tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.City) && tp.Tutor.City.Contains(city, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search.District))
            {
                var district = search.District.Trim();
                query = query.Where(tp => tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.District) && tp.Tutor.District.Contains(district, StringComparison.OrdinalIgnoreCase));
            }

            if (search.MinPrice.HasValue)
            {
                var minPrice = search.MinPrice.Value;
                query = query.Where(tp =>
                    (tp.HourlyRateMin.HasValue && tp.HourlyRateMin.Value >= minPrice) ||
                    (tp.HourlyRateMax.HasValue && tp.HourlyRateMax.Value >= minPrice));
            }

            if (search.MaxPrice.HasValue)
            {
                var maxPrice = search.MaxPrice.Value;
                query = query.Where(tp =>
                    (!tp.HourlyRateMin.HasValue || tp.HourlyRateMin.Value <= maxPrice) &&
                    (!tp.HourlyRateMax.HasValue || tp.HourlyRateMax.Value <= maxPrice));
            }

            if (search.MinExperience.HasValue)
            {
                query = query.Where(tp => tp.YearsOfExperience.HasValue && tp.YearsOfExperience.Value >= search.MinExperience.Value);
            }

            if (search.MaxExperience.HasValue)
            {
                query = query.Where(tp => !tp.YearsOfExperience.HasValue || tp.YearsOfExperience.Value <= search.MaxExperience.Value);
            }

            if (!string.IsNullOrWhiteSpace(search.TeachingMode))
            {
                var mode = search.TeachingMode.Trim();
                query = query.Where(tp => !string.IsNullOrWhiteSpace(tp.TeachingMode) && tp.TeachingMode.Contains(mode, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search.VerificationStatus))
            {
                var status = search.VerificationStatus.Trim();
                query = query.Where(tp => !string.IsNullOrWhiteSpace(tp.VerificationStatus) && tp.VerificationStatus.Contains(status, StringComparison.OrdinalIgnoreCase));
            }

            return query
                .OrderByDescending(tp => tp.AverageRating)
                .ThenByDescending(tp => tp.TotalReviews)
                .ThenByDescending(tp => tp.CreatedAt)
                .ToList();
        }

        public async Task<List<TutorSearchResultItem>> SearchAsync(TutorSearchRequest? request, CancellationToken cancellationToken = default)
        {
            var search = request ?? new TutorSearchRequest();

            var query = _db.TutorProfiles
                .AsNoTracking()
                .Include(tp => tp.Tutor)
                .Include(tp => tp.TutorSubjects)
                    .ThenInclude(ts => ts.Subject)
                .Where(tp => !search.IsPublishedOnly || tp.IsPublished);

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var keyword = search.Keyword.Trim();
                query = query.Where(tp =>
                    (tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.FullName) && tp.Tutor.FullName.Contains(keyword)) ||
                    (!string.IsNullOrWhiteSpace(tp.Bio) && tp.Bio.Contains(keyword)) ||
                    (!string.IsNullOrWhiteSpace(tp.University) && tp.University.Contains(keyword)) ||
                    (!string.IsNullOrWhiteSpace(tp.Major) && tp.Major.Contains(keyword)) ||
                    tp.TutorSubjects.Any(ts => ts.Subject != null && !string.IsNullOrWhiteSpace(ts.Subject.SubjectName) && ts.Subject.SubjectName.Contains(keyword))
                );
            }

            if (search.SubjectId.HasValue)
            {
                query = query.Where(tp => tp.TutorSubjects.Any(ts => ts.SubjectId == search.SubjectId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search.SubjectName))
            {
                var subjectName = search.SubjectName.Trim();
                query = query.Where(tp => tp.TutorSubjects.Any(ts =>
                    ts.Subject != null &&
                    !string.IsNullOrWhiteSpace(ts.Subject.SubjectName) &&
                    ts.Subject.SubjectName.Contains(subjectName)));
            }

            if (!string.IsNullOrWhiteSpace(search.City))
            {
                var city = search.City.Trim();
                query = query.Where(tp => tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.City) && tp.Tutor.City.Contains(city));
            }

            if (!string.IsNullOrWhiteSpace(search.District))
            {
                var district = search.District.Trim();
                query = query.Where(tp => tp.Tutor != null && !string.IsNullOrWhiteSpace(tp.Tutor.District) && tp.Tutor.District.Contains(district));
            }

            if (search.MinPrice.HasValue)
            {
                var minPrice = search.MinPrice.Value;
                query = query.Where(tp =>
                    (tp.HourlyRateMin.HasValue && tp.HourlyRateMin.Value >= minPrice) ||
                    (tp.HourlyRateMax.HasValue && tp.HourlyRateMax.Value >= minPrice));
            }

            if (search.MaxPrice.HasValue)
            {
                var maxPrice = search.MaxPrice.Value;
                query = query.Where(tp =>
                    (!tp.HourlyRateMin.HasValue || tp.HourlyRateMin.Value <= maxPrice) &&
                    (!tp.HourlyRateMax.HasValue || tp.HourlyRateMax.Value <= maxPrice));
            }

            if (search.MinExperience.HasValue)
            {
                query = query.Where(tp => tp.YearsOfExperience.HasValue && tp.YearsOfExperience.Value >= search.MinExperience.Value);
            }

            if (search.MaxExperience.HasValue)
            {
                query = query.Where(tp => !tp.YearsOfExperience.HasValue || tp.YearsOfExperience.Value <= search.MaxExperience.Value);
            }

            if (!string.IsNullOrWhiteSpace(search.TeachingMode))
            {
                var mode = search.TeachingMode.Trim();
                query = query.Where(tp => !string.IsNullOrWhiteSpace(tp.TeachingMode) && tp.TeachingMode.Contains(mode));
            }

            if (!string.IsNullOrWhiteSpace(search.VerificationStatus))
            {
                var status = search.VerificationStatus.Trim();
                query = query.Where(tp => !string.IsNullOrWhiteSpace(tp.VerificationStatus) && tp.VerificationStatus.Contains(status));
            }

            var tutors = await query
                .OrderByDescending(tp => tp.AverageRating)
                .ThenByDescending(tp => tp.TotalReviews)
                .ThenByDescending(tp => tp.CreatedAt)
                .ToListAsync(cancellationToken);

            return tutors.Select(tp => new TutorSearchResultItem
            {
                TutorId = tp.TutorId,
                FullName = tp.Tutor?.FullName,
                Email = tp.Tutor?.Email,
                PhoneNumber = tp.Tutor?.PhoneNumber,
                City = tp.Tutor?.City,
                District = tp.Tutor?.District,
                AvatarUrl = tp.Tutor?.AvatarUrl,
                Bio = tp.Bio,
                University = tp.University,
                Major = tp.Major,
                YearsOfExperience = tp.YearsOfExperience,
                HourlyRateMin = tp.HourlyRateMin,
                HourlyRateMax = tp.HourlyRateMax,
                TeachingMode = tp.TeachingMode,
                AverageRating = tp.AverageRating,
                TotalReviews = tp.TotalReviews,
                VerificationStatus = tp.VerificationStatus,
                IsPublished = tp.IsPublished,
                Subjects = tp.TutorSubjects
                    .Where(ts => ts.Subject != null)
                    .Select(ts => ts.Subject.SubjectName)
                    .Distinct()
                    .ToList()
            }).ToList();
        }
    }
}
