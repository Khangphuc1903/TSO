using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services
{
    public class SubjectSearchService
    {
        private readonly TutorPlatformDbContext _db;

        public SubjectSearchService(TutorPlatformDbContext db)
        {
            _db = db;
        }

        public static List<Subject> ApplyFilters(IEnumerable<Subject> subjects, SubjectSearchRequest? request)
        {
            var search = request ?? new SubjectSearchRequest();
            var query = subjects.AsQueryable();

            if (search.OnlyActive)
            {
                query = query.Where(s => s.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var keyword = search.Keyword.Trim();
                query = query.Where(s =>
                    (!string.IsNullOrWhiteSpace(s.SubjectName) && s.SubjectName.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(s.EducationLevel) && s.EducationLevel.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                );
            }

            if (!string.IsNullOrWhiteSpace(search.EducationLevel))
            {
                var level = search.EducationLevel.Trim();
                query = query.Where(s => !string.IsNullOrWhiteSpace(s.EducationLevel) && s.EducationLevel.Contains(level, StringComparison.OrdinalIgnoreCase));
            }

            return query
                .OrderBy(s => s.SubjectName)
                .ToList();
        }

        public async Task<List<Subject>> SearchAsync(SubjectSearchRequest? request, CancellationToken cancellationToken = default)
        {
            var search = request ?? new SubjectSearchRequest();

            var query = _db.Subjects
                .AsNoTracking()
                .AsQueryable();

            if (search.OnlyActive)
            {
                query = query.Where(s => s.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var keyword = search.Keyword.Trim();
                query = query.Where(s =>
                    (!string.IsNullOrWhiteSpace(s.SubjectName) && s.SubjectName.Contains(keyword)) ||
                    (!string.IsNullOrWhiteSpace(s.EducationLevel) && s.EducationLevel.Contains(keyword))
                );
            }

            if (!string.IsNullOrWhiteSpace(search.EducationLevel))
            {
                var level = search.EducationLevel.Trim();
                query = query.Where(s => !string.IsNullOrWhiteSpace(s.EducationLevel) && s.EducationLevel.Contains(level));
            }

            return await query
                .OrderBy(s => s.SubjectName)
                .ToListAsync(cancellationToken);
        }
    }
}
