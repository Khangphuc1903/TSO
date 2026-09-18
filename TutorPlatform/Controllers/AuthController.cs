using Microsoft.AspNetCore.Mvc;
using TutorPlatform.API.Services;
using TutorPlatform.DTOs;
using static TutorPlatform.DTOs.RegisterDto;

namespace TutorPlatform.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        public AuthController(AuthService authService) => _authService = authService;

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var (success, message, token) = await _authService.RegisterAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message, token });
        }

        [HttpPost("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(ConfirmEmailDto dto)
        {
            var (success, message, token) = await _authService.ConfirmEmailAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message, token });
        }

        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode(ResendCodeDto dto)
        {
            var (success, message) = await _authService.ResendConfirmationAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var (success, message, token) = await _authService.LoginAsync(dto);
            if (!success) return Unauthorized(new { message });
            return Ok(new { message, token });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var (success, message) = await _authService.ForgotPasswordAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var (success, message) = await _authService.ResetPasswordAsync(dto);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }
    }
}