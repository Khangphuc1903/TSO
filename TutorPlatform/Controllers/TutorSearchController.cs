using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TutorSearchController : ControllerBase
    {
        private readonly TutorSearchService _tutorSearchService;
        private readonly SubjectSearchService _subjectSearchService;

        public TutorSearchController(TutorSearchService tutorSearchService, SubjectSearchService subjectSearchService)
        {
            _tutorSearchService = tutorSearchService;
            _subjectSearchService = subjectSearchService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] TutorSearchRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var items = await _tutorSearchService.SearchAsync(request, cancellationToken);

                return Ok(new
                {
                    totalCount = items.Count,
                    items
                });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    totalCount = 0,
                    items = new List<object>(),
                    message = "Không thể truy vấn dữ liệu gia sư hiện tại. Vui lòng thử lại sau."
                });
            }
        }

        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjectOptions(CancellationToken cancellationToken)
        {
            try
            {
                var subjects = await _subjectSearchService.SearchAsync(new SubjectSearchRequest { OnlyActive = true }, cancellationToken);

                return Ok(new
                {
                    totalCount = subjects.Count,
                    items = subjects.Select(s => new
                    {
                        subjectId = s.SubjectId,
                        subjectName = s.SubjectName,
                        educationLevel = s.EducationLevel,
                        isActive = s.IsActive
                    })
                });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    totalCount = 0,
                    items = new List<object>(),
                    message = "Không thể truy vấn danh sách môn học hiện tại. Vui lòng thử lại sau."
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetDefaultTutors(CancellationToken cancellationToken)
        {
            try
            {
                var items = await _tutorSearchService.SearchAsync(new TutorSearchRequest { IsPublishedOnly = true }, cancellationToken);
                return Ok(new
                {
                    totalCount = items.Count,
                    items
                });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    totalCount = 0,
                    items = new List<object>(),
                    message = "Không thể truy vấn dữ liệu gia sư hiện tại. Vui lòng thử lại sau."
                });
            }
        }
    }
}
