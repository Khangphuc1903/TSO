using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserProfileController : ControllerBase
    {
        private readonly UserProfileService _profileService;

        public UserProfileController(UserProfileService profileService)
        {
            _profileService = profileService;
        }

        private int? GetCurrentUserId()
        {
            var str = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(str, out var id) ? id : null;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetProfile(CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện thao tác này." });
                }

                var result = await _profileService.GetProfileAsync(userId.Value, ct);
                if (!result.Success)
                {
                    return StatusCode(result.StatusCode, new { message = result.Message });
                }

                return Ok(new { data = result.Data, message = result.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserProfile Exception] {ex}");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateGeneralInfo([FromBody] UpdateUserProfileRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện thao tác này." });
                }

                var result = await _profileService.UpdateGeneralInfoAsync(userId.Value, request, ct);
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

        [HttpPut("student")]
        public async Task<IActionResult> UpdateStudentProfile([FromBody] UpdateStudentProfileRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện thao tác này." });
                }

                var result = await _profileService.UpdateStudentProfileAsync(userId.Value, request, ct);
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

        [HttpPut("tutor")]
        public async Task<IActionResult> UpdateTutorProfile([FromBody] UpdateTutorProfileRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện thao tác này." });
                }

                var result = await _profileService.UpdateTutorProfileAsync(userId.Value, request, ct);
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

        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện thao tác này." });
                }

                var result = await _profileService.ChangePasswordAsync(userId.Value, request, ct);
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
    }
}
