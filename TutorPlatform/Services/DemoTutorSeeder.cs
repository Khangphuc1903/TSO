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

        await RenameLegacyTutorAsync(db, "tutor.vance@tsg.com", "tutor.lananh@tsg.com");
        await HideForeignDemoTutorsAsync(db);

        var tutors = new[]
        {
            Tutor("tutor.lananh@tsg.com", "Nguyễn Lan Anh", "Female", "Hà Nội", "Cầu Giấy", "12 Trần Duy Hưng", "/uploads/avatars/lan-anh.jpg", "0902000001",
                "Giáo viên Toán cấp 2, cấp 3. Dạy chậm, chữa bài từng bước và kèm đề thi học kỳ.", "Đại học Sư phạm Hà Nội", "Sư phạm Toán", 6, 180000, 280000, "Both", 4.90m, 18, new[] { "Toan" }),
            Tutor("tutor.thuha@tsg.com", "Trần Thu Hà", "Female", "TP. Hồ Chí Minh", "Quận 3", "45 Nam Kỳ Khởi Nghĩa", "/uploads/avatars/thu-ha.webp", "0902000002",
                "Luyện tiếng Anh giao tiếp và ngữ pháp THPT. Sửa bài viết mỗi buổi.", "Đại học Ngoại thương", "Ngôn ngữ Anh", 7, 220000, 350000, "Online", 4.80m, 14, new[] { "Tieng Anh" }),
            Tutor("tutor.minhkhoa@tsg.com", "Lê Minh Khoa", "Male", "Đà Nẵng", "Hải Châu", "10 Bạch Đằng", "/uploads/avatars/minh-khoa.jpg", "0902000003",
                "Dạy Vật lý cấp 3, chú trọng công thức và bài tập vận dụng.", "Đại học Bách khoa Đà Nẵng", "Sư phạm Vật lý", 5, 170000, 260000, "Both", 4.70m, 9, new[] { "Vat Ly" }),
            Tutor("tutor.quochuy@tsg.com", "Phạm Quốc Huy", "Male", "Cần Thơ", "Ninh Kiều", "25 Hòa Bình", "/uploads/avatars/quoc-huy.jpg", "0902000004",
                "Ôn Toán lớp 12 và đánh giá năng lực. Có giáo án theo tuần.", "Đại học Cần Thơ", "Sư phạm Toán", 4, 150000, 240000, "Offline", 4.80m, 11, new[] { "Toan" }),
            Tutor("tutor.thanhnam@tsg.com", "Võ Thành Nam", "Male", "Hải Phòng", "Ngô Quyền", "8 Lạch Tray", "/uploads/avatars/thanh-nam.webp", "0902000005",
                "Tiếng Anh cấp 2, phát âm và từ vựng theo chủ đề.", "Đại học Hàng hải Việt Nam", "Ngôn ngữ Anh", 5, 160000, 250000, "Both", 4.60m, 8, new[] { "Tieng Anh" }),
            Tutor("tutor.hoanglong@tsg.com", "Đặng Hoàng Long", "Male", "Thừa Thiên Huế", "Huế", "15 Lê Lợi", "/uploads/avatars/hoang-long.jpg", "0902000006",
                "Ngữ văn THPT, đọc hiểu và nghị luận xã hội.", "Đại học Sư phạm Huế", "Sư phạm Ngữ văn", 8, 160000, 250000, "Online", 4.90m, 16, new[] { "Van", "Ngữ Văn" }),
            Tutor("tutor.thanhtam@tsg.com", "Lý Thanh Tâm", "Female", "Khánh Hòa", "Nha Trang", "30 Trần Phú", "/uploads/avatars/thanh-tam.webp", "0902000007",
                "Dạy Văn và kể chuyện cho học sinh cấp 2. Giao bài đọc mỗi tuần.", "Đại học Khánh Hòa", "Sư phạm Ngữ văn", 6, 150000, 230000, "Offline", 4.80m, 10, new[] { "Van" }),
            Tutor("tutor.ducanh@tsg.com", "Ngô Đức Anh", "Male", "Nghệ An", "Vinh", "5 Quang Trung", "/uploads/avatars/duc-anh.jpg", "0902000008",
                "Hóa học lớp 10–12, bài tập định lượng và đề minh họa.", "Đại học Vinh", "Sư phạm Hóa", 4, 150000, 240000, "Both", 4.70m, 7, new[] { "Hoa Hoc" }),
            Tutor("tutor.ngocmai@tsg.com", "Bùi Ngọc Mai", "Female", "Đồng Nai", "Biên Hòa", "18 Phạm Văn Thuận", "/uploads/avatars/ngoc-mai.webp", "0902000009",
                "Tiếng Anh tiểu học và THCS. Dạy bằng trò chơi và hội thoại ngắn.", "Đại học Sư phạm TP.HCM", "Sư phạm Tiếng Anh", 5, 140000, 220000, "Offline", 5.00m, 21, new[] { "Tieng Anh" }),
            Tutor("tutor.hongnhung@tsg.com", "Phan Hồng Nhung", "Female", "Bình Dương", "Thủ Dầu Một", "9 Yersin", "/uploads/avatars/hong-nhung.jpg", "0902000010",
                "Sinh học cấp 3, sơ đồ tư duy và ôn chuyên đề di truyền.", "Đại học Khoa học Tự nhiên", "Sư phạm Sinh", 6, 160000, 250000, "Online", 4.80m, 12, new[] { "Sinh Hoc" }),
            Tutor("tutor.giabao@tsg.com", "Đỗ Gia Bảo", "Male", "Hà Nội", "Đống Đa", "40 Tây Sơn", "/uploads/avatars/gia-bao.jpg", "0902000011",
                "Toán lớp 9 và luyện thi vào 10. Chữa đề theo dạng.", "Đại học Bách khoa Hà Nội", "Toán tin", 3, 170000, 260000, "Both", 4.60m, 6, new[] { "Toan" }),
            Tutor("tutor.nhatnam@tsg.com", "Nguyễn Nhật Nam", "Male", "TP. Hồ Chí Minh", "Quận 1", "21 Nguyễn Huệ", "/uploads/avatars/nhat-nam.jpg", "0902000012",
                "Tiếng Anh giao tiếp THPT. Sửa phát âm và viết đoạn theo chủ đề.", "Đại học Ngoại ngữ - ĐHQG Hà Nội", "Sư phạm Tiếng Anh", 5, 200000, 320000, "Online", 4.80m, 13, new[] { "Tieng Anh" }),
            Tutor("tutor.duckhai@tsg.com", "Trần Đức Khải", "Male", "Hà Nội", "Thanh Xuân", "8 Nguyễn Trãi", "/uploads/avatars/duc-khai.jpg", "0902000013",
                "Toán THPT, công thức cần nhớ và bài tập vận dụng.", "Đại học Sư phạm Hà Nội", "Sư phạm Toán", 4, 180000, 280000, "Both", 4.70m, 9, new[] { "Toan" }),
            Tutor("tutor.phuongthao@tsg.com", "Lê Phương Thảo", "Female", "Hà Nội", "Hoàn Kiếm", "5 Hàng Bài", "/uploads/avatars/phuong-thao.jpg", "0902000014",
                "Tiếng Việt tiểu học. Tập đọc, chính tả và kể chuyện.", "Đại học Sư phạm Hà Nội", "Giáo dục Tiểu học", 6, 140000, 220000, "Offline", 4.90m, 15, new[] { "Tiếng Việt" }),
            Tutor("tutor.quynhchi@tsg.com", "Phạm Quỳnh Chi", "Female", "Đà Nẵng", "Sơn Trà", "16 Phạm Văn Đồng", "/uploads/avatars/quynh-chi.jpg", "0902000015",
                "Ngữ văn THPT, đọc hiểu và nghị luận. Chữa bài theo dàn ý.", "Đại học Sư phạm - ĐH Đà Nẵng", "Sư phạm Ngữ văn", 5, 160000, 250000, "Both", 4.80m, 11, new[] { "Van", "Ngữ Văn" }),
        };

        var createdTutors = new List<User>();
        foreach (var item in tutors)
        {
            var user = await EnsureUserAsync(db, tutorRole.RoleId, passwordHash, new DemoUser(
                item.Email, item.FullName, item.Phone, item.Gender, item.City, item.District, item.Address, item.AvatarUrl));
            createdTutors.Add(user);
            await EnsureTutorProfileAsync(db, user.UserId, item, subjects);
        }

        await ReplaceAvatarAsync(db, "tutor@tutor.com", "/uploads/avatars/minh-hoang.jpg");
        await ReplaceAvatarAsync(db, "tutor.minh@tsg.com", "/uploads/avatars/gia-minh.jpg");

        await EnsureDemoReviewsAsync(db, student.UserId, createdTutors, subjects);

        // Đảm bảo student.demo@tsg.com có sẵn đơn đặt lịch Pending để test ngay mã VietQR PayOS
        if (!await db.Bookings.AnyAsync(b => b.StudentId == student.UserId && b.Status == "Pending"))
        {
            var firstTutor = createdTutors[0].UserId;
            var firstSub = await db.TutorSubjects.Where(ts => ts.TutorId == firstTutor).Select(ts => ts.SubjectId).FirstAsync();
            db.Bookings.Add(new Booking
            {
                StudentId = student.UserId,
                TutorId = firstTutor,
                SubjectId = firstSub,
                ScheduledDate = DateOnly.FromDateTime(DateTime.Today.AddDays(2)),
                StartTime = new TimeOnly(19, 0),
                EndTime = new TimeOnly(21, 0),
                TeachingMode = "Online",
                Location = "Online",
                Price = 250000,
                Status = "Pending",
                CreatedAt = DateTime.Now
            });
            await db.SaveChangesAsync();
        }

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
            ("Toán", "Secondary"), ("Ngữ Văn", "Secondary"), ("Tiếng Anh", "Secondary"), ("IELTS", "Ngoại ngữ"),
            ("Tiếng Việt", "Primary"),
            ("Vật Lý", "HighSchool"), ("Hóa Học", "HighSchool"), ("Sinh Học", "HighSchool")
        };
        var existing = await db.Subjects.AsNoTracking().Select(s => s.SubjectName).ToListAsync();
        foreach (var (name, level) in needed)
        {
            var folded = VietnameseText.Fold(name);
            var exists = existing.Any(n =>
                string.Equals(n, name, StringComparison.OrdinalIgnoreCase) ||
                VietnameseText.Fold(n) == folded);
            if (!exists)
            {
                db.Subjects.Add(new Subject { SubjectName = name, EducationLevel = level, IsActive = true });
                existing.Add(name);
            }
        }
        await db.SaveChangesAsync();
    }

    private static async Task<User> EnsureUserAsync(TutorPlatformDbContext db, int roleId, string passwordHash, DemoUser info)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == info.Email);
        if (user != null)
        {
            user.FullName = info.FullName;
            user.PhoneNumber = info.Phone;
            user.Gender = info.Gender;
            user.City = info.City;
            user.District = info.District;
            user.Address = info.Address;
            user.AvatarUrl = info.AvatarUrl;
            user.Status = "Active";
            user.IsEmailConfirmed = true;
            await db.SaveChangesAsync();
            return user;
        }

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
            profile.AverageRating = item.Rating;
            profile.TotalReviews = item.Reviews;
            profile.SubjectsLocked = true;
            await db.SaveChangesAsync();
        }

        profile.SubjectsLocked = true;

        foreach (var subjectName in item.Subjects)
        {
            var folded = VietnameseText.Fold(subjectName);
            var subject = subjects.FirstOrDefault(s =>
                              string.Equals(s.SubjectName, subjectName, StringComparison.OrdinalIgnoreCase) ||
                              VietnameseText.Fold(s.SubjectName) == folded)
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

        if (!await db.AvailabilitySlots.AnyAsync(s => s.TutorId == tutorId && s.IsRecurring))
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
        }

        var openDates = new (int Offset, TimeOnly Start, TimeOnly End)[]
        {
            (1, new TimeOnly(18, 0), new TimeOnly(20, 0)),
            (2, new TimeOnly(19, 0), new TimeOnly(21, 0)),
            (3, new TimeOnly(9, 0), new TimeOnly(11, 0)),
            (4, new TimeOnly(14, 0), new TimeOnly(16, 0))
        };
        foreach (var open in openDates)
        {
            var date = DateOnly.FromDateTime(DateTime.Today.AddDays(open.Offset));
            var exists = await db.AvailabilitySlots.AnyAsync(s =>
                s.TutorId == tutorId && !s.IsRecurring && s.SpecificDate == date && s.StartTime == open.Start);
            if (exists) continue;
            db.AvailabilitySlots.Add(new AvailabilitySlot
            {
                TutorId = tutorId,
                DayOfWeek = null,
                SpecificDate = date,
                StartTime = open.Start,
                EndTime = open.End,
                IsRecurring = false,
                IsBooked = false
            });
        }

        await db.SaveChangesAsync();
        await EnsureVerifiedAsync(db, tutorId, item);
    }

    private static async Task EnsureVerifiedAsync(TutorPlatformDbContext db, int tutorId, DemoTutor item)
    {
        var now = DateTime.Now;
        var doc = await db.IdentityDocuments
            .Where(d => d.TutorId == tutorId)
            .OrderByDescending(d => d.SubmittedAt)
            .FirstOrDefaultAsync();
        if (doc == null)
        {
            doc = new IdentityDocument
            {
                TutorId = tutorId,
                IdCardFrontUrl = item.AvatarUrl,
                IdCardBackUrl = item.AvatarUrl,
                Status = "Approved",
                ReviewedAt = now,
                SubmittedAt = now
            };
            db.IdentityDocuments.Add(doc);
            await db.SaveChangesAsync();
        }
        else if (doc.Status != "Approved")
        {
            doc.Status = "Approved";
            doc.ReviewedAt = now;
            doc.RejectionReason = null;
            await db.SaveChangesAsync();
        }

        if (!await db.OcrExtractionResults.AnyAsync(o => o.DocumentId == doc.DocumentId))
        {
            db.OcrExtractionResults.Add(new OcrExtractionResult
            {
                DocumentId = doc.DocumentId,
                FullName = item.FullName,
                DateOfBirth = new DateOnly(1998, 5, 12),
                IdNumber = $"001098{tutorId:D6}",
                Address = item.Address,
                ExtractedAt = now
            });
        }

        if (!await db.FaceVerificationLogs.AnyAsync(f => f.DocumentId == doc.DocumentId))
        {
            db.FaceVerificationLogs.Add(new FaceVerificationLog
            {
                TutorId = tutorId,
                DocumentId = doc.DocumentId,
                SelfieImageUrl = item.AvatarUrl,
                MatchConfidenceScore = 98.5m,
                IsMatch = true,
                ApiProvider = "Admin",
                AttemptNumber = 1,
                Status = "Passed",
                CreatedAt = now
            });
        }

        var subjectId = await db.TutorSubjects
            .Where(ts => ts.TutorId == tutorId)
            .Select(ts => (int?)ts.SubjectId)
            .FirstOrDefaultAsync();

        if (!await db.TutorTestAttempts.AnyAsync(a => a.TutorId == tutorId && a.TestType == "Pedagogical" && a.IsPassed))
        {
            db.TutorTestAttempts.Add(PassedAttempt(tutorId, "Pedagogical", null, now));
        }

        if (!await db.TutorTestAttempts.AnyAsync(a => a.TutorId == tutorId && a.TestType == "Professional" && a.IsPassed))
        {
            db.TutorTestAttempts.Add(PassedAttempt(tutorId, "Professional", subjectId, now));
        }

        await db.SaveChangesAsync();
    }

    private static TutorTestAttempt PassedAttempt(int tutorId, string testType, int? subjectId, DateTime now)
    {
        return new TutorTestAttempt
        {
            TutorId = tutorId,
            TestType = testType,
            SubjectId = subjectId,
            TotalQuestions = 10,
            CorrectCount = 9,
            ScorePercent = 90,
            PassThreshold = 70,
            IsPassed = true,
            AttemptNumber = 1,
            StartedAt = now.AddMinutes(-20),
            SubmittedAt = now
        };
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
                Rating = ratings[i % ratings.Length],
                Comment = comments[i % comments.Length],
                IsHidden = false,
                CreatedAt = DateTime.Now.AddDays(-6)
            });
            await db.SaveChangesAsync();
        }
    }

    private static async Task ReplaceAvatarAsync(TutorPlatformDbContext db, string email, string avatarUrl)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.AvatarUrl == avatarUrl) return;
        user.AvatarUrl = avatarUrl;
        await db.SaveChangesAsync();
    }

    private static async Task RenameLegacyTutorAsync(TutorPlatformDbContext db, string fromEmail, string toEmail)
    {
        if (await db.Users.AnyAsync(u => u.Email == toEmail)) return;
        var source = await db.Users.FirstOrDefaultAsync(u => u.Email == fromEmail);
        if (source == null) return;
        source.Email = toEmail;
        await db.SaveChangesAsync();
    }

    private static async Task HideForeignDemoTutorsAsync(TutorPlatformDbContext db)
    {
        var legacyEmails = new[]
        {
            "tutor.vance@tsg.com", "tutor.chen@tsg.com", "tutor.rodriguez@tsg.com", "tutor.rostova@tsg.com"
        };
        var legacy = await db.Users.Where(u => legacyEmails.Contains(u.Email)).ToListAsync();
        foreach (var user in legacy)
        {
            user.Status = "Inactive";
            user.AvatarUrl = null;
            var profile = await db.TutorProfiles.FindAsync(user.UserId);
            if (profile != null) profile.IsPublished = false;
        }
        if (legacy.Count > 0) await db.SaveChangesAsync();
    }

    private static DemoTutor Tutor(
        string email, string name, string gender, string city, string district, string address, string avatar, string phone,
        string bio, string university, string major, int years, decimal rateMin, decimal rateMax, string mode,
        decimal rating, int reviews, string[] subjects)
    {
        return new DemoTutor(
            email, name, gender, city, district, address, avatar, phone, bio, university, major, years,
            rateMin, rateMax, mode, "Verified", rating, reviews, subjects,
            new[] { ("Bằng tốt nghiệp sư phạm", "Bộ GD&ĐT", "2020-08-01") },
            new[] { (1, "18:00", "20:00"), (3, "18:00", "20:00"), (6, "09:00", "11:00") });
    }

    private record DemoUser(string Email, string FullName, string Phone, string Gender, string City, string District, string Address, string AvatarUrl);

    private record DemoTutor(
        string Email, string FullName, string Gender, string City, string District, string Address,
        string AvatarUrl, string Phone, string Bio, string University, string Major, int Years,
        decimal RateMin, decimal RateMax, string Mode, string Verification, decimal Rating, int Reviews,
        string[] Subjects, (string Name, string IssuedBy, string IssuedDate)[] Certificates,
        (int Day, string Start, string End)[] Slots);
}
