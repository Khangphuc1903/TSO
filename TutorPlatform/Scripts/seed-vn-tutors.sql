SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @hash nvarchar(500), @role int;
SELECT @hash = PasswordHash, @role = RoleId FROM Users WHERE Email IN (N'tutor.vance@tsg.com', N'tutor.lananh@tsg.com');
IF @role IS NULL
    SELECT @role = RoleId FROM Roles WHERE RoleName = N'Tutor';

IF EXISTS (SELECT 1 FROM Users WHERE Email = N'tutor.vance@tsg.com')
   AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'tutor.lananh@tsg.com')
    UPDATE Users SET Email = N'tutor.lananh@tsg.com' WHERE Email = N'tutor.vance@tsg.com';

DECLARE @people TABLE (
    Email nvarchar(200), FullName nvarchar(200), Gender nvarchar(20),
    City nvarchar(100), District nvarchar(100), Address nvarchar(300),
    Avatar nvarchar(300), Phone nvarchar(20), Bio nvarchar(1000),
    University nvarchar(200), Major nvarchar(200), Years int,
    RateMin decimal(10,0), RateMax decimal(10,0), Mode nvarchar(20),
    Rating decimal(3,2), Reviews int, SubjectName nvarchar(100)
);

INSERT INTO @people VALUES
(N'tutor.lananh@tsg.com', N'Nguyễn Lan Anh', N'Female', N'Hà Nội', N'Cầu Giấy', N'12 Trần Duy Hưng', N'/uploads/avatars/lan-anh.jpg', N'0902000001', N'Giáo viên Toán cấp 2, cấp 3. Dạy chậm, chữa bài từng bước và kèm đề thi học kỳ.', N'Đại học Sư phạm Hà Nội', N'Sư phạm Toán', 6, 180000, 280000, N'Both', 4.90, 18, N'Toan'),
(N'tutor.thuha@tsg.com', N'Trần Thu Hà', N'Female', N'TP. Hồ Chí Minh', N'Quận 3', N'45 Nam Kỳ Khởi Nghĩa', N'/uploads/avatars/thu-ha.webp', N'0902000002', N'Luyện tiếng Anh giao tiếp và ngữ pháp THPT. Sửa bài viết mỗi buổi.', N'Đại học Ngoại thương', N'Ngôn ngữ Anh', 7, 220000, 350000, N'Online', 4.80, 14, N'Tieng Anh'),
(N'tutor.minhkhoa@tsg.com', N'Lê Minh Khoa', N'Male', N'Đà Nẵng', N'Hải Châu', N'10 Bạch Đằng', N'/uploads/avatars/minh-khoa.jpg', N'0902000003', N'Dạy Vật lý cấp 3, chú trọng công thức và bài tập vận dụng.', N'Đại học Bách khoa Đà Nẵng', N'Sư phạm Vật lý', 5, 170000, 260000, N'Both', 4.70, 9, N'Vat Ly'),
(N'tutor.quochuy@tsg.com', N'Phạm Quốc Huy', N'Male', N'Cần Thơ', N'Ninh Kiều', N'25 Hòa Bình', N'/uploads/avatars/quoc-huy.jpg', N'0902000004', N'Ôn Toán lớp 12 và đánh giá năng lực. Có giáo án theo tuần.', N'Đại học Cần Thơ', N'Sư phạm Toán', 4, 150000, 240000, N'Offline', 4.80, 11, N'Toan'),
(N'tutor.thanhnam@tsg.com', N'Võ Thành Nam', N'Male', N'Hải Phòng', N'Ngô Quyền', N'8 Lạch Tray', N'/uploads/avatars/thanh-nam.webp', N'0902000005', N'Tiếng Anh cấp 2, phát âm và từ vựng theo chủ đề.', N'Đại học Hàng hải Việt Nam', N'Ngôn ngữ Anh', 5, 160000, 250000, N'Both', 4.60, 8, N'Tieng Anh'),
(N'tutor.hoanglong@tsg.com', N'Đặng Hoàng Long', N'Male', N'Thừa Thiên Huế', N'Huế', N'15 Lê Lợi', N'/uploads/avatars/hoang-long.jpg', N'0902000006', N'Ngữ văn THPT, đọc hiểu và nghị luận xã hội.', N'Đại học Sư phạm Huế', N'Sư phạm Ngữ văn', 8, 160000, 250000, N'Online', 4.90, 16, N'Van'),
(N'tutor.thanhtam@tsg.com', N'Lý Thanh Tâm', N'Female', N'Khánh Hòa', N'Nha Trang', N'30 Trần Phú', N'/uploads/avatars/thanh-tam.webp', N'0902000007', N'Dạy Văn và kể chuyện cho học sinh cấp 2.', N'Đại học Khánh Hòa', N'Sư phạm Ngữ văn', 6, 150000, 230000, N'Offline', 4.80, 10, N'Van'),
(N'tutor.ducanh@tsg.com', N'Ngô Đức Anh', N'Male', N'Nghệ An', N'Vinh', N'5 Quang Trung', N'/uploads/avatars/duc-anh.jpg', N'0902000008', N'Hóa học lớp 10–12, bài tập định lượng và đề minh họa.', N'Đại học Vinh', N'Sư phạm Hóa', 4, 150000, 240000, N'Both', 4.70, 7, N'Hoa Hoc'),
(N'tutor.ngocmai@tsg.com', N'Bùi Ngọc Mai', N'Female', N'Đồng Nai', N'Biên Hòa', N'18 Phạm Văn Thuận', N'/uploads/avatars/ngoc-mai.webp', N'0902000009', N'Tiếng Anh tiểu học và THCS. Dạy bằng hội thoại ngắn.', N'Đại học Sư phạm TP.HCM', N'Sư phạm Tiếng Anh', 5, 140000, 220000, N'Offline', 5.00, 21, N'Tieng Anh'),
(N'tutor.hongnhung@tsg.com', N'Phan Hồng Nhung', N'Female', N'Bình Dương', N'Thủ Dầu Một', N'9 Yersin', N'/uploads/avatars/hong-nhung.jpg', N'0902000010', N'Sinh học cấp 3, sơ đồ tư duy và ôn chuyên đề di truyền.', N'Đại học Khoa học Tự nhiên', N'Sư phạm Sinh', 6, 160000, 250000, N'Online', 4.80, 12, N'Sinh Hoc'),
(N'tutor.giabao@tsg.com', N'Đỗ Gia Bảo', N'Male', N'Hà Nội', N'Đống Đa', N'40 Tây Sơn', N'/uploads/avatars/gia-bao.jpg', N'0902000011', N'Toán lớp 9 và luyện thi vào 10. Chữa đề theo dạng.', N'Đại học Bách khoa Hà Nội', N'Toán tin', 3, 170000, 260000, N'Both', 4.60, 6, N'Toan');

INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
SELECT p.Email, @hash, p.Phone, p.FullName, p.Gender, p.Avatar, @role, p.Address, p.City, p.District, 1, N'Active', GETDATE()
FROM @people p
WHERE NOT EXISTS (SELECT 1 FROM Users u WHERE u.Email = p.Email);

UPDATE u
SET FullName = p.FullName, PhoneNumber = p.Phone, Gender = p.Gender, City = p.City, District = p.District,
    Address = p.Address, AvatarUrl = p.Avatar, Status = N'Active', IsEmailConfirmed = 1, RoleId = @role
FROM Users u
JOIN @people p ON p.Email = u.Email;

INSERT INTO TutorProfiles (TutorId, Bio, University, Major, YearsOfExperience, HourlyRateMin, HourlyRateMax, TeachingMode, VerificationStatus, AverageRating, TotalReviews, IsPublished, IsSosReady, CreatedAt)
SELECT u.UserId, p.Bio, p.University, p.Major, p.Years, p.RateMin, p.RateMax, p.Mode, N'Verified', p.Rating, p.Reviews, 1, 0, GETDATE()
FROM @people p
JOIN Users u ON u.Email = p.Email
WHERE NOT EXISTS (SELECT 1 FROM TutorProfiles tp WHERE tp.TutorId = u.UserId);

UPDATE tp
SET Bio = p.Bio, University = p.University, Major = p.Major, YearsOfExperience = p.Years,
    HourlyRateMin = p.RateMin, HourlyRateMax = p.RateMax, TeachingMode = p.Mode,
    VerificationStatus = N'Verified', AverageRating = p.Rating, TotalReviews = p.Reviews, IsPublished = 1
FROM TutorProfiles tp
JOIN Users u ON u.UserId = tp.TutorId
JOIN @people p ON p.Email = u.Email;

INSERT INTO TutorSubjects (TutorId, SubjectId, IsVerified, VerifiedAt)
SELECT u.UserId, s.SubjectId, 1, GETDATE()
FROM @people p
JOIN Users u ON u.Email = p.Email
JOIN Subjects s ON s.SubjectName = p.SubjectName
WHERE NOT EXISTS (
    SELECT 1 FROM TutorSubjects ts WHERE ts.TutorId = u.UserId AND ts.SubjectId = s.SubjectId
);

UPDATE Users
SET Status = N'Inactive', AvatarUrl = NULL
WHERE Email IN (N'tutor.vance@tsg.com', N'tutor.chen@tsg.com', N'tutor.rodriguez@tsg.com', N'tutor.rostova@tsg.com');

UPDATE tp
SET IsPublished = 0
FROM TutorProfiles tp
JOIN Users u ON u.UserId = tp.TutorId
WHERE u.Email IN (N'tutor.vance@tsg.com', N'tutor.chen@tsg.com', N'tutor.rodriguez@tsg.com', N'tutor.rostova@tsg.com');

SELECT u.FullName, u.City, u.AvatarUrl
FROM Users u
JOIN TutorProfiles tp ON tp.TutorId = u.UserId
WHERE tp.IsPublished = 1
ORDER BY u.City, u.FullName;
