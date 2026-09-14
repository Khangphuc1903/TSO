using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Helpers;
using TutorPlatform.Model;

using static TutorPlatform.DTOs.RegisterDto;

namespace TutorPlatform.Services
{
    public class AuthService
    {
        private readonly TutorPlatformDbContext _db;
        private readonly JwtHelper _jwt;

        public AuthService(TutorPlatformDbContext db, JwtHelper jwt)
        {
            _db = db;
            _jwt = jwt;
        }

        public async Task<(bool Success, string Message, string? Token)> RegisterAsync(RegisterDto dto)
        {
            bool emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return (false, "Email already registered.", null);

            var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.Role);
            if (role == null)
                return (false, "Invalid role.", null);

            var user = new User
            {
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                RoleId = role.RoleId,
                Status = "Active",
                CreatedAt = DateTime.Now
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var token = _jwt.GenerateToken(user.UserId, user.Email, role.RoleName);
            return (true, "Registered successfully.", token);
        }

        public async Task<(bool Success, string Message, string? Token)> LoginAsync(LoginDto dto)
        {
            var user = await _db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return (false, "Invalid email or password.", null);

            if (user.Status != "Active")
                return (false, "Account is not active.", null);

            var token = _jwt.GenerateToken(user.UserId, user.Email, user.Role.RoleName);
            return (true, "Login successful.", token);
        }
    }
}