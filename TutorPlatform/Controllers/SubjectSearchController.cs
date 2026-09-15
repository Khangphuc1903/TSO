using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectSearchController : ControllerBase
    {
        private readonly SubjectSearchService _subjectSearchService;

        public SubjectSearchController(SubjectSearchService subjectSearchService)
        {
            _subjectSearchService = subjectSearchService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] SubjectSearchRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var subjects = await _subjectSearchService.SearchAsync(request, cancellationToken);
                return Ok(new
                {
                    totalCount = subjects.Count,
                    items = subjects,
                    message = subjects.Count == 0 ? "Không tìm thấy môn học nào phù hợp." : null
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
        public async Task<IActionResult> GetDefaultSubjects(CancellationToken cancellationToken)
        {
            try
            {
                var subjects = await _subjectSearchService.SearchAsync(new SubjectSearchRequest { OnlyActive = true }, cancellationToken);
                return Ok(new
                {
                    totalCount = subjects.Count,
                    items = subjects,
                    message = subjects.Count == 0 ? "Hiện chưa có môn học nào được kích hoạt." : null
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
    }
}
