using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Helpers;
using TutorPlatform.Model;
using TutorPlatform.Services;
using static TutorPlatform.DTOs.RegisterDto;

namespace TutorPlatform.API.Services
{
    public class AuthService
    {
        private readonly TutorPlatformDbContext _db;
        private readonly JwtHelper _jwt;
        private readonly EmailService _email;

        public AuthService(TutorPlatformDbContext db, JwtHelper jwt, EmailService email)
        {
            _db = db;
            _jwt = jwt;
            _email = email;
        }

        // ---------------- REGISTER ----------------
        public async Task<(bool Success, string Message)> RegisterAsync(RegisterDto dto)
        {
            bool emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return (false, "Email already registered.");

            var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.Role);
            if (role == null)
                return (false, "Invalid role.");

            var code = EmailService.GenerateOtpCode();

            var user = new User
            {
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                RoleId = role.RoleId,
                Status = "Active",
                IsEmailConfirmed = false,
                EmailConfirmToken = code,
                EmailConfirmExpiry = DateTime.Now.AddMinutes(10),
                CreatedAt = DateTime.Now
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await _email.SendEmailAsync(
                user.Email,
                "Verify your TSG account",
                $"<p>Hi {user.FullName},</p><p>Your verification code is:</p><h2>{code}</h2><p>This code expires in 10 minutes.</p>"
            );

            return (true, "Registered successfully. Please check your email for the verification code.");
        }

        // ---------------- CONFIRM EMAIL ----------------
        public async Task<(bool Success, string Message, string? Token)> ConfirmEmailAsync(ConfirmEmailDto dto)
        {
            var user = await _db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return (false, "Account not found.", null);

            if (user.IsEmailConfirmed)
                return (false, "Email already verified.", null);

            if (user.EmailConfirmToken != dto.Code)
                return (false, "Invalid verification code.", null);

            if (user.EmailConfirmExpiry == null || user.EmailConfirmExpiry < DateTime.Now)
                return (false, "Verification code has expired. Please request a new one.", null);

            user.IsEmailConfirmed = true;
            user.EmailConfirmToken = null;
            user.EmailConfirmExpiry = null;
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Email verified successfully.", token);
        }

        // ---------------- RESEND CODE ----------------
        public async Task<(bool Success, string Message)> ResendConfirmationAsync(ResendCodeDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
                return (false, "Account not found.");

            if (user.IsEmailConfirmed)
                return (false, "Email already verified.");

            var code = EmailService.GenerateOtpCode();
            user.EmailConfirmToken = code;
            user.EmailConfirmExpiry = DateTime.Now.AddMinutes(10);
            await _db.SaveChangesAsync();

            await _email.SendEmailAsync(
                user.Email,
                "Your new verification code",
                $"<p>Your new verification code is:</p><h2>{code}</h2><p>This code expires in 10 minutes.</p>"
            );

            return (true, "A new verification code has been sent to your email.");
        }

        // ---------------- LOGIN ----------------
        public async Task<(bool Success, string Message, string? Token)> LoginAsync(LoginDto dto)
        {
            var user = await _db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return (false, "Invalid email or password.", null);

            if (user.Status != "Active")
                return (false, "Account is not active.", null);

            if (!user.IsEmailConfirmed)
                return (false, "Please verify your email before signing in.", null);

            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Login successful.", token);
        }

        // ---------------- FORGOT PASSWORD ----------------
        public async Task<(bool Success, string Message)> ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            // Không tiết lộ email có tồn tại hay không (tránh dò email người khác)
            if (user == null)
                return (true, "If this email exists, a reset code has been sent.");

            var code = EmailService.GenerateOtpCode();
            user.PasswordResetToken = code;
            user.PasswordResetExpiry = DateTime.Now.AddMinutes(10);
            await _db.SaveChangesAsync();

            await _email.SendEmailAsync(
                user.Email,
                "Reset your TSG password",
                $"<p>Your password reset code is:</p><h2>{code}</h2><p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>"
            );

            return (true, "If this email exists, a reset code has been sent.");
        }

        // ---------------- RESET PASSWORD ----------------
        public async Task<(bool Success, string Message)> ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
                return (false, "Invalid request.");

            if (user.PasswordResetToken != dto.Code)
                return (false, "Invalid reset code.");

            if (user.PasswordResetExpiry == null || user.PasswordResetExpiry < DateTime.Now)
                return (false, "Reset code has expired. Please request a new one.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.PasswordResetToken = null;
            user.PasswordResetExpiry = null;
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            return (true, "Password has been reset successfully. You can now sign in.");
        }
    }
}