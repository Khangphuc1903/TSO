using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public static class DemoTutorSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();

        var tutorRole = await EnsureRoleAsync(db, "Tutor");
        var studentRole = await EnsureRoleAsync(db, "Student");
        await EnsureSubjectsAsync(db);

        var subjects = await db.Subjects.AsNoTracking().Where(s => s.IsActive).ToListAsync();
        if (subjects.Count == 0)
            throw new InvalidOperationException("Không có môn học để gán cho gia sư demo.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

        var student = await EnsureUserAsync(db, studentRole.RoleId, passwordHash, new DemoUser(
            "student.demo@tsg.com",
            "Nguyen Minh Anh",
            "0901000000",
            "Female",
            "Ha Noi",
            "Cau Giay",
            "12 Tran Duy Hung",
            "https://i.pravatar.cc/300?img=32"));

        if (await db.StudentProfiles.FindAsync(student.UserId) == null)
        {
            db.StudentProfiles.Add(new StudentProfile
            {
                StudentId = student.UserId,
                GradeLevel = "University",
                SchoolName = "Dai hoc FPT",
                LearningGoals = "On thi va nang diem mon Toan, Tieng Anh"
            });
            await db.SaveChangesAsync();
        }

        var tutors = new[]
        {
            new DemoTutor(
                "tutor.vance@tsg.com", "Marcus Vance", "Male", "Ha Noi", "Ba Dinh", "18 Lieu Giai",
                "https://i.pravatar.cc/300?img=13", "0901111001",
                "Gia su Data Science, huong dan Python, Machine Learning va thong ke ung dung cho sinh vien.",
                "Dai hoc Bach Khoa Ha Noi", "Khoa hoc May tinh", 8, 250000, 450000, "Online", "Verified", 4.90m, 12,
                new[] { "Tieng Anh", "Toan" },
                new[] { ("IELTS 8.0", "British Council", "2022-05-10"), ("AWS Cloud Practitioner", "Amazon", "2023-01-20") },
                new[] { (1, "18:00", "20:00"), (3, "19:00", "21:00"), (6, "09:00", "11:00") }),
            new DemoTutor(
                "tutor.chen@tsg.com", "Sarah Chen", "Female", "Ha Noi", "Dong Da", "22 Ton Duc Thang",
                "https://i.pravatar.cc/300?img=47", "0901111002",
                "Chuyen Toan cap 3 va luyen thi Dai hoc. Giai de chi tiet, tap trung tu duy.",
                "Dai hoc Su Pham Ha Noi", "Su pham Toan", 6, 180000, 300000, "Both", "Verified", 5.00m, 20,
                new[] { "Toan", "Vat Ly" },
                new[] { ("Chung chi Su pham Toan", "Bo GD&DT", "2020-08-01"), ("IMO Trainer", "VMO", "2021-11-15") },
                new[] { (2, "17:30", "19:30"), (4, "17:30", "19:30"), (0, "08:00", "10:00") }),
            new DemoTutor(
                "tutor.rodriguez@tsg.com", "David Rodriguez", "Male", "TP. Ho Chi Minh", "Binh Thanh", "45 Xo Viet Nghe Tinh",
                "https://i.pravatar.cc/300?img=12", "0901111003",
                "Full-stack web: React, Node.js, CSS. Kem cap do an va phong van junior.",
                "RMIT Vietnam", "Software Engineering", 5, 220000, 400000, "Online", "Verified", 4.80m, 9,
                new[] { "Tieng Anh" },
                new[] { ("Meta Front-End Certificate", "Coursera", "2023-03-12") },
                new[] { (1, "20:00", "22:00"), (5, "20:00", "22:00") }),
            new DemoTutor(
                "tutor.rostova@tsg.com", "Elena Rostova", "Female", "Ha Noi", "Hai Ba Trung", "7 Pho Hue",
                "https://i.pravatar.cc/300?img=48", "0901111004",
                "Luyen Writing va van hoc Anh. Sua bai luan, IELTS Writing task 1-2.",
                "University of Cambridge", "English Literature", 10, 300000, 550000, "Both", "Verified", 4.90m, 18,
                new[] { "Van", "Tieng Anh" },
                new[] { ("CELTA", "Cambridge English", "2018-06-01"), ("IELTS 8.5", "IDP", "2024-02-02") },
                new[] { (2, "19:00", "21:00"), (6, "14:00", "16:00") }),
            new DemoTutor(
                "tutor.minh@tsg.com", "Tran Gia Minh", "Male", "Da Nang", "Hai Chau", "10 Bach Dang",
                "https://i.pravatar.cc/300?img=15", "0901111005",
                "Gia su Hoa va Sinh cap 3, on thi khoi B. Bai tap theo chuyen de, de minh hoa.",
                "Dai hoc Y Duoc Hue", "Hoa Sinh", 4, 150000, 250000, "Offline", "Verified", 4.70m, 7,
                new[] { "Hoa Hoc", "Sinh Hoc" },
                new[] { ("Olympic Hoa sinh vien", "Bo GD&DT", "2019-04-18") },
                new[] { (3, "18:00", "20:00"), (5, "18:00", "20:00"), (6, "09:00", "11:00") })
        };

        var createdTutors = new List<User>();
        foreach (var item in tutors)
        {
            var user = await EnsureUserAsync(db, tutorRole.RoleId, passwordHash, new DemoUser(
                item.Email, item.FullName, item.Phone, item.Gender, item.City, item.District, item.Address, item.AvatarUrl));
            createdTutors.Add(user);
            await EnsureTutorProfileAsync(db, user.UserId, item, subjects);
        }

        await EnsureDemoReviewsAsync(db, student.UserId, createdTutors, subjects);
        Console.WriteLine("Seed demo tutors xong. Login student: student.demo@tsg.com / Password123!");
    }

    private static async Task<Role> EnsureRoleAsync(TutorPlatformDbContext db, string roleName)
    {
        var role = await db.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
        if (role != null) return role;
        role = new Role { RoleName = roleName };
        db.Roles.Add(role);
        await db.SaveChangesAsync();
        return role;
    }

    private static async Task EnsureSubjectsAsync(TutorPlatformDbContext db)
    {
        var needed = new (string Name, string Level)[]
        {
            ("Toan", "Secondary"), ("Van", "Secondary"), ("Tieng Anh", "Secondary"),
            ("Vat Ly", "HighSchool"), ("Hoa Hoc", "HighSchool"), ("Sinh Hoc", "HighSchool")
        };
        foreach (var (name, level) in needed)
        {
            var exists = await db.Subjects.AnyAsync(s => s.SubjectName == name);
            if (!exists)
                db.Subjects.Add(new Subject { SubjectName = name, EducationLevel = level, IsActive = true });
        }
        await db.SaveChangesAsync();
    }

    private static async Task<User> EnsureUserAsync(TutorPlatformDbContext db, int roleId, string passwordHash, DemoUser info)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == info.Email);
        if (user != null) return user;

        user = new User
        {
            Email = info.Email,
            PasswordHash = passwordHash,
            FullName = info.FullName,
            PhoneNumber = info.Phone,
            Gender = info.Gender,
            City = info.City,
            District = info.District,
            Address = info.Address,
            AvatarUrl = info.AvatarUrl,
            RoleId = roleId,
            Status = "Active",
            IsEmailConfirmed = true,
            CreatedAt = DateTime.Now
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task EnsureTutorProfileAsync(TutorPlatformDbContext db, int tutorId, DemoTutor item, List<Subject> subjects)
    {
        var profile = await db.TutorProfiles.FindAsync(tutorId);
        if (profile == null)
        {
            profile = new TutorProfile
            {
                TutorId = tutorId,
                Bio = item.Bio,
                University = item.University,
                Major = item.Major,
                YearsOfExperience = item.Years,
                HourlyRateMin = item.RateMin,
                HourlyRateMax = item.RateMax,
                TeachingMode = item.Mode,
                VerificationStatus = item.Verification,
                AverageRating = item.Rating,
                TotalReviews = item.Reviews,
                IsPublished = true,
                CreatedAt = DateTime.Now
            };
            db.TutorProfiles.Add(profile);
            await db.SaveChangesAsync();
        }
        else
        {
            profile.IsPublished = true;
            profile.VerificationStatus = item.Verification;
            profile.Bio = item.Bio;
            profile.University = item.University;
            profile.Major = item.Major;
            profile.YearsOfExperience = item.Years;
            profile.HourlyRateMin = item.RateMin;
            profile.HourlyRateMax = item.RateMax;
            profile.TeachingMode = item.Mode;
            await db.SaveChangesAsync();
        }

        foreach (var subjectName in item.Subjects)
        {
            var subject = subjects.FirstOrDefault(s => s.SubjectName == subjectName)
                          ?? subjects[0];
            var exists = await db.TutorSubjects.AnyAsync(ts => ts.TutorId == tutorId && ts.SubjectId == subject.SubjectId);
            if (!exists)
            {
                db.TutorSubjects.Add(new TutorSubject
                {
                    TutorId = tutorId,
                    SubjectId = subject.SubjectId,
                    IsVerified = true,
                    VerifiedAt = DateTime.Now
                });
            }
        }

        if (!await db.TutorCertificates.AnyAsync(c => c.TutorId == tutorId))
        {
            foreach (var cert in item.Certificates)
            {
                db.TutorCertificates.Add(new TutorCertificate
                {
                    TutorId = tutorId,
                    CertificateName = cert.Name,
                    IssuedBy = cert.IssuedBy,
                    IssuedDate = DateOnly.Parse(cert.IssuedDate),
                    FileUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    UploadedAt = DateTime.Now
                });
            }
        }

        if (!await db.AvailabilitySlots.AnyAsync(s => s.TutorId == tutorId))
        {
            foreach (var slot in item.Slots)
            {
                db.AvailabilitySlots.Add(new AvailabilitySlot
                {
                    TutorId = tutorId,
                    DayOfWeek = (byte)slot.Day,
                    SpecificDate = null,
                    StartTime = TimeOnly.Parse(slot.Start),
                    EndTime = TimeOnly.Parse(slot.End),
                    IsRecurring = true,
                    IsBooked = false
                });
            }

            db.AvailabilitySlots.Add(new AvailabilitySlot
            {
                TutorId = tutorId,
                DayOfWeek = null,
                SpecificDate = DateOnly.FromDateTime(DateTime.Today.AddDays(3)),
                StartTime = new TimeOnly(19, 0),
                EndTime = new TimeOnly(21, 0),
                IsRecurring = false,
                IsBooked = false
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task EnsureDemoReviewsAsync(TutorPlatformDbContext db, int studentId, List<User> tutors, List<Subject> subjects)
    {
        var comments = new[]
        {
            "Giang day ro rang, bai tap sat de thi.",
            "Rat nhiet tinh, tien bo ro sau 2 buoi.",
            "Phuong phap hay, de hieu."
        };
        var ratings = new byte[] { 5, 5, 4, 5, 4 };

        for (var i = 0; i < tutors.Count; i++)
        {
            var tutorId = tutors[i].UserId;
            if (await db.Reviews.AnyAsync(r => r.TutorId == tutorId && r.StudentId == studentId))
                continue;

            var subjectId = await db.TutorSubjects
                .Where(ts => ts.TutorId == tutorId)
                .Select(ts => ts.SubjectId)
                .FirstAsync();

            var booking = new Booking
            {
                StudentId = studentId,
                TutorId = tutorId,
                SubjectId = subjectId,
                ScheduledDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-7)),
                StartTime = new TimeOnly(19, 0),
                EndTime = new TimeOnly(21, 0),
                TeachingMode = "Online",
                Location = "Online",
                Price = 200000,
                Status = "Completed",
                CreatedAt = DateTime.Now.AddDays(-8),
                ConfirmedAt = DateTime.Now.AddDays(-8),
                CompletedAt = DateTime.Now.AddDays(-7)
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();

            db.Reviews.Add(new Review
            {
                BookingId = booking.BookingId,
                StudentId = studentId,
                TutorId = tutorId,
                Rating = ratings[i],
                Comment = comments[i % comments.Length],
                IsHidden = false,
                CreatedAt = DateTime.Now.AddDays(-6)
            });
            await db.SaveChangesAsync();
        }
    }

    private record DemoUser(string Email, string FullName, string Phone, string Gender, string City, string District, string Address, string AvatarUrl);

    private record DemoTutor(
        string Email, string FullName, string Gender, string City, string District, string Address,
        string AvatarUrl, string Phone, string Bio, string University, string Major, int Years,
        decimal RateMin, decimal RateMax, string Mode, string Verification, decimal Rating, int Reviews,
        string[] Subjects, (string Name, string IssuedBy, string IssuedDate)[] Certificates,
        (int Day, string Start, string End)[] Slots);
}
