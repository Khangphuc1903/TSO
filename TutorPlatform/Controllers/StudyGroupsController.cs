using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudyGroupsController : ControllerBase
    {
        private readonly StudyGroupService _studyGroupService;

        public StudyGroupsController(StudyGroupService studyGroupService)
        {
            _studyGroupService = studyGroupService;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] StudyGroupSearchRequest request, CancellationToken ct)
        {
            try
            {
                var items = await _studyGroupService.SearchAsync(request, ct);
                return Ok(new
                {
                    totalCount = items.Count,
                    items = items,
                    message = "Lấy danh sách nhóm học tập thành công."
                });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    totalCount = 0,
                    items = new List<object>(),
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            try
            {
                var result = await _studyGroupService.GetByIdAsync(id, ct);
                if (!result.Success)
                {
                    return StatusCode(result.StatusCode, new { message = result.Message });
                }
                return Ok(new { data = result.Data, message = result.Message });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjects(CancellationToken ct)
        {
            try
            {
                var items = await _studyGroupService.GetSubjectsAsync(ct);
                return Ok(new
                {
                    totalCount = items.Count,
                    items = items,
                    message = "Lấy danh sách môn học thành công."
                });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    totalCount = 0,
                    items = new List<object>(),
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStudyGroupRequest request, CancellationToken ct)
        {
            try
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    return Unauthorized(new { message = "Không xác định được người dùng." });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(new { message = "Dữ liệu không hợp lệ.", errors = ModelState });
                }

                var result = await _studyGroupService.CreateAsync(userId, request, ct);
                if (!result.Success)
                {
                    return StatusCode(result.StatusCode, new { message = result.Message });
                }

                return StatusCode(result.StatusCode, new { data = result.Data, message = result.Message });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [Authorize]
        [HttpPost("{id:int}/join")]
        public async Task<IActionResult> Join(int id, CancellationToken ct)
        {
            try
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    return Unauthorized(new { message = "Không xác định được người dùng." });
                }

                var result = await _studyGroupService.JoinAsync(id, userId, ct);
                if (!result.Success)
                {
                    return StatusCode(result.StatusCode, new { message = result.Message });
                }

                return Ok(new { message = result.Message });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [Authorize]
        [HttpPost("{id:int}/leave")]
        public async Task<IActionResult> Leave(int id, CancellationToken ct)
        {
            try
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    return Unauthorized(new { message = "Không xác định được người dùng." });
                }

                var result = await _studyGroupService.LeaveAsync(id, userId, ct);
                if (!result.Success)
                {
                    return StatusCode(result.StatusCode, new { message = result.Message });
                }

                return Ok(new { message = result.Message });
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }
    }
}
