using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Helpers;
using TutorPlatform.Model;
using TutorPlatform.Services;
using System.Net.Http.Json;

namespace TutorPlatform.API.Services
{
    public class AuthService
    {
        private readonly TutorPlatformDbContext _db;
        private readonly JwtHelper _jwt;
        private readonly EmailService _email;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _http;

        public AuthService(TutorPlatformDbContext db, JwtHelper jwt, EmailService email, IConfiguration config, IHttpClientFactory http)
        {
            _db = db;
            _jwt = jwt;
            _email = email;
            _config = config;
            _http = http;
        }

        public async Task<(bool Success, string Message)> RegisterAsync(RegisterDto dto)
        {
            bool emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return (false, "Email already registered.");

            if (dto.Role is not ("Student" or "Tutor" or "Parent"))
                return (false, "Invalid role.");

            var basicsError = VietnamLocations.ValidateProfileBasics(dto.PhoneNumber, dto.City, dto.District);
            if (basicsError != null)
                return (false, basicsError);

            var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.Role);
            if (role == null)
                return (false, "Invalid role.");

            var code = EmailService.GenerateOtpCode();

            var user = new User
            {
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                PhoneNumber = VietnamLocations.NormalizePhone(dto.PhoneNumber),
                City = dto.City.Trim(),
                District = dto.District.Trim(),
                RoleId = role.RoleId,
                Status = "Active",
                IsEmailConfirmed = false,
                EmailConfirmToken = code,
                EmailConfirmExpiry = DateTime.Now.AddMinutes(10),
                CreatedAt = DateTime.Now
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            await EnsureTutorProfileAsync(user.UserId, dto.Role);

            await _email.SendEmailAsync(
                user.Email,
                "Verify your TSG account",
                $"<p>Hi {user.FullName},</p><p>Your verification code is:</p><h2>{code}</h2><p>This code expires in 10 minutes.</p>"
            );

            return (true, "Registered successfully. Please check your email for the verification code.");
        }

        
        public async Task<(bool Success, string Message, string? Token, bool NeedsOnboarding)> ConfirmEmailAsync(ConfirmEmailDto dto)
        {
            var user = await _db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return (false, "Account not found.", null, false);

            if (user.IsEmailConfirmed)
                return (false, "Email already verified.", null, false);

            if (user.EmailConfirmToken != dto.Code)
                return (false, "Invalid verification code.", null, false);

            if (user.EmailConfirmExpiry == null || user.EmailConfirmExpiry < DateTime.Now)
                return (false, "Verification code has expired. Please request a new one.", null, false);

            user.IsEmailConfirmed = true;
            user.EmailConfirmToken = null;
            user.EmailConfirmExpiry = null;
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Email verified successfully.", token, NeedsOnboarding(user));
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
        public async Task<(bool Success, string Message, string? Token, bool NeedsOnboarding)> LoginAsync(LoginDto dto)
        {
            var email = (dto.Email ?? "").Trim();
            var user = await _db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
                return (false, "Invalid email or password.", null, false);

            bool passwordOk;
            try
            {
                passwordOk = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            }
            catch
            {
                passwordOk = false;
            }

            if (!passwordOk)
                return (false, "Invalid email or password.", null, false);

            if (user.Status != "Active")
                return (false, "Account is not active.", null, false);

            if (!user.IsEmailConfirmed)
                return (false, "Please verify your email before signing in.", null, false);

            await EnsureTutorProfileAsync(user.UserId, user.Role.RoleName);
            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Login successful.", token, NeedsOnboarding(user));
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

        public async Task<UserProfileDto?> GetProfileAsync(int userId)
        {
            var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
            return user == null ? null : MapProfile(user);
        }

        public async Task<(bool Success, string Message, UserProfileDto? Data)> UpdateProfileAsync(int userId, UpdateProfileDto dto)
        {
            var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return (false, "Không tìm thấy tài khoản.", null);
            if (string.IsNullOrWhiteSpace(dto.FullName))
                return (false, "Họ tên không được trống.", null);

            var basicsError = VietnamLocations.ValidateProfileBasics(dto.PhoneNumber, dto.City, dto.District);
            if (basicsError != null)
                return (false, basicsError, null);

            user.FullName = dto.FullName.Trim();
            user.PhoneNumber = VietnamLocations.NormalizePhone(dto.PhoneNumber!);
            user.Gender = string.IsNullOrWhiteSpace(dto.Gender) ? null : dto.Gender.Trim();
            user.AvatarUrl = string.IsNullOrWhiteSpace(dto.AvatarUrl) ? user.AvatarUrl : dto.AvatarUrl.Trim();
            user.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
            user.City = dto.City!.Trim();
            user.District = dto.District!.Trim();
            if (DateOnly.TryParse(dto.DateOfBirth, out var dob))
                user.DateOfBirth = dob;
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();
            return (true, "Đã cập nhật thông tin.", MapProfile(user));
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return (false, "Mật khẩu mới tối thiểu 6 ký tự.");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return (false, "Không tìm thấy tài khoản.");

            bool ok;
            try { ok = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash); }
            catch { ok = false; }

            if (!ok)
                return (false, "Mật khẩu hiện tại không đúng.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();
            return (true, "Đổi mật khẩu thành công.");
        }

        public string? GetGoogleClientId()
            => _config["Google:ClientId"];

        public async Task<(bool Success, string Message, string? Token, bool NeedsOnboarding)> GoogleLoginAsync(GoogleLoginDto dto)
        {
            var clientId = GetGoogleClientId();
            if (string.IsNullOrWhiteSpace(clientId) || clientId.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase))
                return (false, "Chưa cấu hình Google Client ID trên server.", null, false);
            if (string.IsNullOrWhiteSpace(dto.IdToken))
                return (false, "Thiếu Google token.", null, false);

            GoogleTokenInfo? payload;
            try
            {
                var client = _http.CreateClient();
                var url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + Uri.EscapeDataString(dto.IdToken);
                payload = await client.GetFromJsonAsync<GoogleTokenInfo>(url);
            }
            catch
            {
                return (false, "Không xác thực được Google token.", null, false);
            }

            if (payload == null ||
                !string.Equals(payload.Aud, clientId, StringComparison.Ordinal) ||
                !payload.IsEmailVerified)
                return (false, "Google token không hợp lệ hoặc đã hết hạn.", null, false);

            var email = payload.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return (false, "Tài khoản Google chưa xác thực email.", null, false);

            var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == "Pending");
                if (role == null)
                    return (false, "Hệ thống chưa có vai trò Pending.", null, false);

                user = new User
                {
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    FullName = string.IsNullOrWhiteSpace(payload.Name) ? email.Split('@')[0] : payload.Name.Trim(),
                    AvatarUrl = payload.Picture,
                    RoleId = role.RoleId,
                    Status = "Active",
                    IsEmailConfirmed = true,
                    CreatedAt = DateTime.Now
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
                user.Role = role;
            }
            else
            {
                if (user.Status != "Active")
                    return (false, "Account is not active.", null, false);
                user.IsEmailConfirmed = true;
                if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
                    user.AvatarUrl = payload.Picture;
                user.UpdatedAt = DateTime.Now;
                await _db.SaveChangesAsync();
            }

            await EnsureTutorProfileAsync(user.UserId, user.Role.RoleName);
            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Login successful.", token, NeedsOnboarding(user));
        }

        public async Task<(bool Success, string Message, string? Token, UserProfileDto? Profile)> CompleteOnboardingAsync(int userId, CompleteOnboardingDto dto)
        {
            var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return (false, "Không tìm thấy tài khoản.", null, null);
            if (string.IsNullOrWhiteSpace(dto.FullName))
                return (false, "Họ tên không được trống.", null, null);

            var basicsError = VietnamLocations.ValidateProfileBasics(dto.PhoneNumber, dto.City, dto.District);
            if (basicsError != null)
                return (false, basicsError, null, null);

            var currentRole = user.Role.RoleName;
            if (string.Equals(currentRole, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                var roleName = (dto.Role ?? "").Trim();
                if (roleName is not ("Student" or "Tutor" or "Parent"))
                    return (false, "Hãy chọn vai trò Học sinh, Phụ huynh hoặc Gia sư.", null, null);
                var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
                if (role == null)
                    return (false, "Invalid role.", null, null);
                user.RoleId = role.RoleId;
                user.Role = role;
            }

            user.FullName = dto.FullName.Trim();
            user.PhoneNumber = VietnamLocations.NormalizePhone(dto.PhoneNumber);
            user.Gender = string.IsNullOrWhiteSpace(dto.Gender) ? null : dto.Gender.Trim();
            user.City = dto.City.Trim();
            user.District = dto.District.Trim();
            user.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();
            await EnsureTutorProfileAsync(user.UserId, user.Role.RoleName);

            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Đã hoàn tất hồ sơ.", token, MapProfile(user));
        }

        private async Task EnsureTutorProfileAsync(int userId, string? roleName)
        {
            if (!string.Equals(roleName, "Tutor", StringComparison.OrdinalIgnoreCase))
                return;
            if (await _db.TutorProfiles.AnyAsync(t => t.TutorId == userId))
                return;
            _db.TutorProfiles.Add(new TutorProfile
            {
                TutorId = userId,
                TeachingMode = "Both",
                VerificationStatus = "Pending",
                IsPublished = false,
                AverageRating = 0,
                TotalReviews = 0,
                CreatedAt = DateTime.Now
            });
            await _db.SaveChangesAsync();
        }

        private static UserProfileDto MapProfile(User user) => new()
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.RoleName,
            PhoneNumber = user.PhoneNumber,
            Gender = user.Gender,
            DateOfBirth = user.DateOfBirth?.ToString("yyyy-MM-dd"),
            AvatarUrl = user.AvatarUrl,
            Address = user.Address,
            City = user.City,
            District = user.District,
            NeedsOnboarding = NeedsOnboarding(user)
        };

        private static bool NeedsOnboarding(User user)
            => string.Equals(user.Role.RoleName, "Pending", StringComparison.OrdinalIgnoreCase)
               || VietnamLocations.ValidateProfileBasics(user.PhoneNumber, user.City, user.District) != null;

        private sealed class GoogleTokenInfo
        {
            public string? Aud { get; set; }
            public string? Email { get; set; }
            [System.Text.Json.Serialization.JsonPropertyName("email_verified")]
            public System.Text.Json.JsonElement EmailVerified { get; set; }
            public string? Name { get; set; }
            public string? Picture { get; set; }

            public bool IsEmailVerified =>
                EmailVerified.ValueKind == System.Text.Json.JsonValueKind.True ||
                (EmailVerified.ValueKind == System.Text.Json.JsonValueKind.String &&
                 (EmailVerified.GetString() is "true" or "True"));
        }
    }
}