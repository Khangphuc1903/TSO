USE TutorPlatformDB;
GO

IF COL_LENGTH('Users','EmailConfirmExpiry') IS NULL
    ALTER TABLE Users ADD EmailConfirmExpiry DATETIME NULL;
GO


IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = N'Student')
    INSERT INTO Roles (RoleName) VALUES (N'Student');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = N'Tutor')
    INSERT INTO Roles (RoleName) VALUES (N'Tutor');

IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Toan')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Toan', N'Secondary', 1);
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Van')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Van', N'Secondary', 1);
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Tieng Anh')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Tieng Anh', N'Secondary', 1);
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Vat Ly')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Vat Ly', N'HighSchool', 1);
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Hoa Hoc')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Hoa Hoc', N'HighSchool', 1);
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Sinh Hoc')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Sinh Hoc', N'HighSchool', 1);
GO

DECLARE @TutorRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Tutor');
DECLARE @StudentRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Student');
-- Password123! (BCrypt.Net-Next)
DECLARE @Pwd NVARCHAR(255) = N'$2a$11$wtIItxdtvnJCuuVLNVLhZO62qzW.KeOsLsQFtl2fJ6OfFBnaIaMD.';

DECLARE @Toan INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Toan');
DECLARE @Van INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Van');
DECLARE @Anh INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Tieng Anh');
DECLARE @Ly INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Vat Ly');
DECLARE @Hoa INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Hoa Hoc');
DECLARE @Sinh INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Sinh Hoc');

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'student.demo@tsg.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
    VALUES (N'student.demo@tsg.com', @Pwd, N'0901000000', N'Nguyen Minh Anh', N'Female', N'https://i.pravatar.cc/300?img=32', @StudentRole, N'12 Tran Duy Hung', N'Ha Noi', N'Cau Giay', 1, N'Active', GETDATE());
END

DECLARE @StudentId INT = (SELECT UserId FROM Users WHERE Email = N'student.demo@tsg.com');
IF NOT EXISTS (SELECT 1 FROM StudentProfiles WHERE StudentId = @StudentId)
    INSERT INTO StudentProfiles (StudentId, GradeLevel, SchoolName, LearningGoals)
    VALUES (@StudentId, N'University', N'Dai hoc FPT', N'On thi Toan va Tieng Anh');

IF COL_LENGTH('Users', 'EmailConfirmExpiry') IS NOT NULL
    UPDATE Users SET EmailConfirmExpiry = NULL WHERE Email LIKE N'%@tsg.com';

CREATE TABLE #Tutors (
    Email NVARCHAR(255), FullName NVARCHAR(150), Phone NVARCHAR(20), Gender NVARCHAR(10),
    City NVARCHAR(100), District NVARCHAR(100), Address NVARCHAR(255), Avatar NVARCHAR(500),
    Bio NVARCHAR(MAX), University NVARCHAR(150), Major NVARCHAR(150), Years INT,
    RateMin DECIMAL(10,0), RateMax DECIMAL(10,0), Mode NVARCHAR(20), Rating DECIMAL(3,2), Reviews INT
);

INSERT INTO #Tutors VALUES
(N'tutor.vance@tsg.com', N'Marcus Vance', N'0901111001', N'Male', N'Ha Noi', N'Ba Dinh', N'18 Lieu Giai', N'https://i.pravatar.cc/300?img=13',
 N'Gia su Data Science, huong dan Python, Machine Learning va thong ke ung dung cho sinh vien.', N'Dai hoc Bach Khoa Ha Noi', N'Khoa hoc May tinh', 8, 250000, 450000, N'Online', 4.90, 12),
(N'tutor.chen@tsg.com', N'Sarah Chen', N'0901111002', N'Female', N'Ha Noi', N'Dong Da', N'22 Ton Duc Thang', N'https://i.pravatar.cc/300?img=47',
 N'Chuyen Toan cap 3 va luyen thi Dai hoc. Giai de chi tiet, tap trung tu duy.', N'Dai hoc Su Pham Ha Noi', N'Su pham Toan', 6, 180000, 300000, N'Both', 5.00, 20),
(N'tutor.rodriguez@tsg.com', N'David Rodriguez', N'0901111003', N'Male', N'TP. Ho Chi Minh', N'Binh Thanh', N'45 Xo Viet Nghe Tinh', N'https://i.pravatar.cc/300?img=12',
 N'Full-stack web: React, Node.js, CSS. Kem cap do an va phong van junior.', N'RMIT Vietnam', N'Software Engineering', 5, 220000, 400000, N'Online', 4.80, 9),
(N'tutor.rostova@tsg.com', N'Elena Rostova', N'0901111004', N'Female', N'Ha Noi', N'Hai Ba Trung', N'7 Pho Hue', N'https://i.pravatar.cc/300?img=48',
 N'Luyen Writing va van hoc Anh. Sua bai luan, IELTS Writing task 1-2.', N'University of Cambridge', N'English Literature', 10, 300000, 550000, N'Both', 4.90, 18),
(N'tutor.minh@tsg.com', N'Tran Gia Minh', N'0901111005', N'Male', N'Da Nang', N'Hai Chau', N'10 Bach Dang', N'https://i.pravatar.cc/300?img=15',
 N'Gia su Hoa va Sinh cap 3, on thi khoi B. Bai tap theo chuyen de.', N'Dai hoc Y Duoc Hue', N'Hoa Sinh', 4, 150000, 250000, N'Offline', 4.70, 7);

DECLARE @Email NVARCHAR(255), @FullName NVARCHAR(150), @Phone NVARCHAR(20), @Gender NVARCHAR(10);
DECLARE @City NVARCHAR(100), @District NVARCHAR(100), @Address NVARCHAR(255), @Avatar NVARCHAR(500);
DECLARE @Bio NVARCHAR(MAX), @University NVARCHAR(150), @Major NVARCHAR(150), @Years INT;
DECLARE @RateMin DECIMAL(10,0), @RateMax DECIMAL(10,0), @Mode NVARCHAR(20), @Rating DECIMAL(3,2), @Reviews INT;
DECLARE @TutorId INT, @Sub1 INT, @Sub2 INT;

DECLARE tutor_cursor CURSOR FOR SELECT * FROM #Tutors;
OPEN tutor_cursor;
FETCH NEXT FROM tutor_cursor INTO @Email, @FullName, @Phone, @Gender, @City, @District, @Address, @Avatar, @Bio, @University, @Major, @Years, @RateMin, @RateMax, @Mode, @Rating, @Reviews;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
        VALUES (@Email, @Pwd, @Phone, @FullName, @Gender, @Avatar, @TutorRole, @Address, @City, @District, 1, N'Active', GETDATE());
    END

    SET @TutorId = (SELECT UserId FROM Users WHERE Email = @Email);

    IF NOT EXISTS (SELECT 1 FROM TutorProfiles WHERE TutorId = @TutorId)
    BEGIN
        INSERT INTO TutorProfiles (TutorId, Bio, University, Major, YearsOfExperience, HourlyRateMin, HourlyRateMax, TeachingMode, VerificationStatus, AverageRating, TotalReviews, IsPublished, CreatedAt)
        VALUES (@TutorId, @Bio, @University, @Major, @Years, @RateMin, @RateMax, @Mode, N'Verified', @Rating, @Reviews, 1, GETDATE());
    END
    ELSE
        UPDATE TutorProfiles SET IsPublished = 1, VerificationStatus = N'Verified', Bio = @Bio WHERE TutorId = @TutorId;

    SET @Sub1 = CASE
        WHEN @Email LIKE N'%vance%' THEN @Anh
        WHEN @Email LIKE N'%chen%' THEN @Toan
        WHEN @Email LIKE N'%rodriguez%' THEN @Anh
        WHEN @Email LIKE N'%rostova%' THEN @Van
        ELSE @Hoa END;
    SET @Sub2 = CASE
        WHEN @Email LIKE N'%vance%' THEN @Toan
        WHEN @Email LIKE N'%chen%' THEN @Ly
        WHEN @Email LIKE N'%rodriguez%' THEN @Anh
        WHEN @Email LIKE N'%rostova%' THEN @Anh
        ELSE @Sinh END;

    IF NOT EXISTS (SELECT 1 FROM TutorSubjects WHERE TutorId = @TutorId AND SubjectId = @Sub1)
        INSERT INTO TutorSubjects (TutorId, SubjectId, IsVerified, VerifiedAt) VALUES (@TutorId, @Sub1, 1, GETDATE());
    IF @Sub2 <> @Sub1 AND NOT EXISTS (SELECT 1 FROM TutorSubjects WHERE TutorId = @TutorId AND SubjectId = @Sub2)
        INSERT INTO TutorSubjects (TutorId, SubjectId, IsVerified, VerifiedAt) VALUES (@TutorId, @Sub2, 1, GETDATE());

    IF NOT EXISTS (SELECT 1 FROM TutorCertificates WHERE TutorId = @TutorId)
    BEGIN
        INSERT INTO TutorCertificates (TutorId, CertificateName, FileUrl, IssuedBy, IssuedDate, UploadedAt)
        VALUES
        (@TutorId, N'Chung chi su pham', N'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', N'Bo GD&DT', '2022-06-01', GETDATE()),
        (@TutorId, N'IELTS / Chuyen mon', N'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', N'British Council', '2023-03-15', GETDATE());
    END

    IF NOT EXISTS (SELECT 1 FROM AvailabilitySlots WHERE TutorId = @TutorId)
    BEGIN
        INSERT INTO AvailabilitySlots (TutorId, DayOfWeek, SpecificDate, StartTime, EndTime, IsRecurring, IsBooked)
        VALUES
        (@TutorId, 1, NULL, '18:00', '20:00', 1, 0),
        (@TutorId, 3, NULL, '19:00', '21:00', 1, 0),
        (@TutorId, 6, NULL, '09:00', '11:00', 1, 0),
        (@TutorId, NULL, DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), '19:00', '21:00', 0, 0);
    END

    IF NOT EXISTS (SELECT 1 FROM Reviews WHERE TutorId = @TutorId AND StudentId = @StudentId)
    BEGIN
        INSERT INTO Bookings (StudentId, TutorId, SubjectId, ScheduledDate, StartTime, EndTime, TeachingMode, Location, Price, Status, CreatedAt, ConfirmedAt, CompletedAt)
        VALUES (@StudentId, @TutorId, @Sub1, DATEADD(DAY, -7, CAST(GETDATE() AS DATE)), '19:00', '21:00', N'Online', N'Online', 200000, N'Completed', DATEADD(DAY, -8, GETDATE()), DATEADD(DAY, -8, GETDATE()), DATEADD(DAY, -7, GETDATE()));

        DECLARE @BookingId INT = SCOPE_IDENTITY();
        INSERT INTO Reviews (BookingId, StudentId, TutorId, Rating, Comment, IsHidden, CreatedAt)
        VALUES (@BookingId, @StudentId, @TutorId, 5, N'Giang day ro rang, tien bo sau 2 buoi.', 0, DATEADD(DAY, -6, GETDATE()));
    END

    FETCH NEXT FROM tutor_cursor INTO @Email, @FullName, @Phone, @Gender, @City, @District, @Address, @Avatar, @Bio, @University, @Major, @Years, @RateMin, @RateMax, @Mode, @Rating, @Reviews;
END

CLOSE tutor_cursor;
DEALLOCATE tutor_cursor;
DROP TABLE #Tutors;

SELECT u.UserId, u.Email, u.FullName, tp.IsPublished, tp.AverageRating, tp.YearsOfExperience
FROM TutorProfiles tp
JOIN Users u ON u.UserId = tp.TutorId
WHERE u.Email LIKE N'%@tsg.com';
GO
