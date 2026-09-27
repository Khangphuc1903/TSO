using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.API.Services;
using TutorPlatform.DTOs;

namespace TutorPlatform.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        public AuthController(AuthService authService) => _authService = authService;

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            try
            {
                var (success, message) = await _authService.RegisterAsync(dto);
                if (!success) return BadRequest(new { message });
                return Ok(new { message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đăng ký thất bại: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }

        [AllowAnonymous]
        [HttpPost("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(ConfirmEmailDto dto)
        {
                var (success, message, token, needsOnboarding) = await _authService.ConfirmEmailAsync(dto);
                if (!success) return BadRequest(new { message });
                return Ok(new { message, token, needsOnboarding });
        }

        [AllowAnonymous]
        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode(ResendCodeDto dto)
        {
            var (success, message) = await _authService.ResendConfirmationAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                var (success, message, token, needsOnboarding) = await _authService.LoginAsync(dto);
                if (!success) return Unauthorized(new { message });
                return Ok(new { message, token, needsOnboarding });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đăng nhập thất bại: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var (success, message) = await _authService.ForgotPasswordAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var (success, message) = await _authService.ResetPasswordAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [AllowAnonymous]
        [HttpGet("google-config")]
        public IActionResult GoogleConfig()
        {
            var clientId = _authService.GetGoogleClientId();
            var configured = !string.IsNullOrWhiteSpace(clientId) &&
                             !clientId.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase);
            return Ok(new { clientId = configured ? clientId : "", configured });
        }

        [AllowAnonymous]
        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin(GoogleLoginDto dto)
        {
            try
            {
                var (success, message, token, needsOnboarding) = await _authService.GoogleLoginAsync(dto);
                if (!success) return Unauthorized(new { message });
                return Ok(new { message, token, needsOnboarding });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Google login thất bại: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var id = GetUserId();
            if (id == null) return Unauthorized(new { message = "Chưa đăng nhập." });
            var profile = await _authService.GetProfileAsync(id.Value);
            return profile == null ? NotFound(new { message = "Không tìm thấy tài khoản." }) : Ok(profile);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto dto)
        {
            var id = GetUserId();
            if (id == null) return Unauthorized(new { message = "Chưa đăng nhập." });
            var (success, message, data) = await _authService.UpdateProfileAsync(id.Value, dto);
            return success ? Ok(new { message, profile = data }) : BadRequest(new { message });
        }

        [Authorize]
        [HttpPost("complete-onboarding")]
        public async Task<IActionResult> CompleteOnboarding(CompleteOnboardingDto dto)
        {
            var id = GetUserId();
            if (id == null) return Unauthorized(new { message = "Chưa đăng nhập." });
            var (success, message, token, profile) = await _authService.CompleteOnboardingAsync(id.Value, dto);
            return success ? Ok(new { message, token, profile }) : BadRequest(new { message });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
        {
            var id = GetUserId();
            if (id == null) return Unauthorized(new { message = "Chưa đăng nhập." });
            var (success, message) = await _authService.ChangePasswordAsync(id.Value, dto);
            return success ? Ok(new { message }) : BadRequest(new { message });
        }

        private int? GetUserId()
            => int.TryParse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier), out var id) ? id : null;
    }
}