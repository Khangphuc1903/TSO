USE TutorPlatformDB;
GO



DECLARE @TutorRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Tutor');
IF @TutorRole IS NULL
BEGIN
    INSERT INTO Roles (RoleName) VALUES (N'Tutor');
    SET @TutorRole = SCOPE_IDENTITY();
END


DECLARE @Pwd NVARCHAR(255) = N'$2a$11$wtIItxdtvnJCuuVLNVLhZO62qzW.KeOsLsQFtl2fJ6OfFBnaIaMD.';

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'tutor.test@tsg.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
    VALUES (
        N'tutor.test@tsg.com',
        @Pwd,
        N'0901999000',
        N'Tutor Test',
        N'Male',
        N'https://i.pravatar.cc/300?img=8',
        @TutorRole,
        N'1 Duy Tan',
        N'Ha Noi',
        N'Cau Giay',
        1,
        N'Active',
        GETDATE()
    );
END
ELSE
BEGIN
    UPDATE Users
    SET PasswordHash = @Pwd,
        RoleId = @TutorRole,
        IsEmailConfirmed = 1,
        Status = N'Active',
        EmailConfirmToken = NULL,
        EmailConfirmExpiry = NULL
    WHERE Email = N'tutor.test@tsg.com';
END

DECLARE @TutorId INT = (SELECT UserId FROM Users WHERE Email = N'tutor.test@tsg.com');

IF NOT EXISTS (SELECT 1 FROM TutorProfiles WHERE TutorId = @TutorId)
BEGIN
    INSERT INTO TutorProfiles (TutorId, Bio, University, Major, YearsOfExperience, HourlyRateMin, HourlyRateMax, TeachingMode, VerificationStatus, AverageRating, TotalReviews, IsPublished, CreatedAt)
    VALUES (
        @TutorId,
        N'Tai khoan gia su dung de test xac nhan booking, lich trong, chung chi, chat.',
        N'Dai hoc FPT',
        N'Su pham Toan',
        3,
        150000,
        250000,
        N'Both',
        N'Pending',
        0,
        0,
        1,
        GETDATE()
    );
END

DECLARE @Toan INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Toan');
IF @Toan IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM TutorSubjects WHERE TutorId = @TutorId AND SubjectId = @Toan)
    INSERT INTO TutorSubjects (TutorId, SubjectId, IsVerified, VerifiedAt)
    VALUES (@TutorId, @Toan, 0, NULL);

IF NOT EXISTS (SELECT 1 FROM AvailabilitySlots WHERE TutorId = @TutorId)
BEGIN
    INSERT INTO AvailabilitySlots (TutorId, DayOfWeek, SpecificDate, StartTime, EndTime, IsRecurring, IsBooked)
    VALUES
        (@TutorId, 2, NULL, '18:00', '20:00', 1, 0),
        (@TutorId, 5, NULL, '19:00', '21:00', 1, 0);
END

SELECT u.UserId, u.Email, u.FullName, r.RoleName, u.Status, u.IsEmailConfirmed, tp.IsPublished
FROM Users u
JOIN Roles r ON r.RoleId = u.RoleId
LEFT JOIN TutorProfiles tp ON tp.TutorId = u.UserId
WHERE u.Email = N'tutor.test@tsg.com';
GO
