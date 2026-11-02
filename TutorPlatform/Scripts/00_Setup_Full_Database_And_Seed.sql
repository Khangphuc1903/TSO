/*
=========================================================================================
TSG TUTOR PLATFORM - MASTER DATABASE INITIALIZATION & SEED SCRIPT
Script tổng hợp toàn diện: Khởi tạo CSDL, Tạo đầy đủ 33 Bảng, Cập nhật Schema & Nạp dữ liệu mẫu
=========================================================================================
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ======================================================================
   TUTOR & STUDY GROUP MATCHING PLATFORM
   Full Database Schema (SQL Server) - v2 (with Study Group Mentor feature)
   ====================================================================== */

CREATE DATABASE TutorPlatformDB;
GO
USE TutorPlatformDB;
GO


CREATE TABLE Roles (
    RoleId          INT             IDENTITY(1,1) PRIMARY KEY,
    RoleName        NVARCHAR(50)    NOT NULL UNIQUE   -- Student, Parent, Tutor, Admin
);

CREATE TABLE Users (
    UserId              INT             IDENTITY(1,1) PRIMARY KEY,
    Email               NVARCHAR(255)   NOT NULL UNIQUE,
    PasswordHash        NVARCHAR(255)   NOT NULL,
    PhoneNumber         NVARCHAR(20)    NULL,
    FullName            NVARCHAR(150)   NOT NULL,
    DateOfBirth         DATE            NULL,
    Gender              NVARCHAR(10)    NULL,
    AvatarUrl           NVARCHAR(500)   NULL,
    RoleId              INT             NOT NULL,
    Address             NVARCHAR(255)   NULL,
    City                NVARCHAR(100)   NULL,
    District            NVARCHAR(100)   NULL,
    Latitude            DECIMAL(9,6)    NULL,
    Longitude           DECIMAL(9,6)    NULL,
    IsEmailConfirmed    BIT             NOT NULL DEFAULT 0,
    EmailConfirmToken   NVARCHAR(255)   NULL,
    PasswordResetToken  NVARCHAR(255)   NULL,
    PasswordResetExpiry DATETIME        NULL,
    Status              NVARCHAR(20)    NOT NULL DEFAULT 'Active', -- Active / Banned / Deactivated
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt           DATETIME        NULL,
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
);

CREATE TABLE StudentProfiles (
    StudentId       INT             PRIMARY KEY,   -- same as UserId (1-1 extension)
    GradeLevel      NVARCHAR(50)    NULL,           -- e.g. Lop 9, Lop 12, Dai hoc
    SchoolName      NVARCHAR(150)   NULL,
    LearningGoals   NVARCHAR(500)   NULL,
    CONSTRAINT FK_StudentProfiles_Users FOREIGN KEY (StudentId) REFERENCES Users(UserId)
);

/* ======================================================================
   2. SUBJECTS (reference data)
   ====================================================================== */

CREATE TABLE Subjects (
    SubjectId       INT             IDENTITY(1,1) PRIMARY KEY,
    SubjectName     NVARCHAR(100)   NOT NULL,       -- Toan, Ly, Hoa, Van, Tieng Anh...
    EducationLevel  NVARCHAR(50)    NOT NULL,       -- Primary / Secondary / HighSchool / University
    IsActive        BIT             NOT NULL DEFAULT 1
);

/* ======================================================================
   3. TUTOR PROFILE & VERIFICATION
   ====================================================================== */

CREATE TABLE TutorProfiles (
    TutorId             INT             PRIMARY KEY,   -- same as UserId (1-1 extension)
    Bio                 NVARCHAR(MAX)   NULL,
    University          NVARCHAR(150)   NULL,
    Major               NVARCHAR(150)   NULL,
    YearsOfExperience   INT             NULL,
    HourlyRateMin       DECIMAL(10,0)   NULL,
    HourlyRateMax       DECIMAL(10,0)   NULL,
    TeachingMode        NVARCHAR(20)    NOT NULL DEFAULT 'Both',
    VerificationStatus  NVARCHAR(30)    NOT NULL DEFAULT 'Pending',
    AverageRating       DECIMAL(3,2)    NOT NULL DEFAULT 0,
    TotalReviews        INT             NOT NULL DEFAULT 0,
    IsPublished         BIT             NOT NULL DEFAULT 0,
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt           DATETIME        NULL,
    CONSTRAINT FK_TutorProfiles_Users FOREIGN KEY (TutorId) REFERENCES Users(UserId)
);

CREATE TABLE TutorSubjects (
    TutorSubjectId  INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    SubjectId       INT             NOT NULL,
    IsVerified      BIT             NOT NULL DEFAULT 0,
    VerifiedAt      DATETIME        NULL,
    CONSTRAINT FK_TS_Tutor   FOREIGN KEY (TutorId)   REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_TS_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId),
    CONSTRAINT UQ_TutorSubject UNIQUE (TutorId, SubjectId)
);

CREATE TABLE TutorCertificates (
    CertificateId   INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    CertificateName NVARCHAR(200)   NOT NULL,
    FileUrl         NVARCHAR(500)   NOT NULL,
    IssuedBy        NVARCHAR(150)   NULL,
    IssuedDate      DATE            NULL,
    UploadedAt      DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Cert_Tutor FOREIGN KEY (TutorId) REFERENCES TutorProfiles(TutorId)
);

-- Step 1a: Document upload
CREATE TABLE IdentityDocuments (
    DocumentId      INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    IdCardFrontUrl  NVARCHAR(500)   NOT NULL,
    IdCardBackUrl   NVARCHAR(500)   NOT NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending / Approved / Rejected
    ReviewedBy      INT             NULL,
    ReviewedAt      DATETIME        NULL,
    RejectionReason NVARCHAR(300)   NULL,
    SubmittedAt     DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ID_Tutor  FOREIGN KEY (TutorId)    REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_ID_Admin  FOREIGN KEY (ReviewedBy) REFERENCES Users(UserId)
);

-- Step 1b: OCR extraction result (from 3rd-party API, e.g. FPT.AI)
CREATE TABLE OcrExtractionResults (
    ExtractionId    INT             IDENTITY(1,1) PRIMARY KEY,
    DocumentId      INT             NOT NULL,
    FullName        NVARCHAR(150)   NULL,
    DateOfBirth     DATE            NULL,
    IdNumber        NVARCHAR(20)    NULL,
    Address         NVARCHAR(255)   NULL,
    RawResponseJson NVARCHAR(MAX)   NULL,   -- store full API response for audit
    ExtractedAt     DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_OCR_Document FOREIGN KEY (DocumentId) REFERENCES IdentityDocuments(DocumentId)
);

-- Step 1c: AI Face Matching (selfie vs ID photo, via 3rd-party API)
CREATE TABLE FaceVerificationLogs (
    LogId               INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId             INT             NOT NULL,
    DocumentId          INT             NOT NULL,
    SelfieImageUrl      NVARCHAR(500)   NOT NULL,
    MatchConfidenceScore DECIMAL(5,2)   NULL,     -- e.g. 92.50 (%)
    IsMatch             BIT             NOT NULL DEFAULT 0,
    ApiProvider         NVARCHAR(50)    NOT NULL DEFAULT 'FPT.AI',
    RawResponseJson     NVARCHAR(MAX)   NULL,
    AttemptNumber       INT             NOT NULL DEFAULT 1,
    Status              NVARCHAR(30)    NOT NULL DEFAULT 'Pending',
        -- Pending / Passed / Failed / EscalatedToAdmin
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Face_Tutor    FOREIGN KEY (TutorId)    REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_Face_Document FOREIGN KEY (DocumentId) REFERENCES IdentityDocuments(DocumentId)
);

/* ======================================================================
   4. QUALIFICATION & SAFETY TESTS
   ====================================================================== */

CREATE TABLE Questions (
    QuestionId      INT             IDENTITY(1,1) PRIMARY KEY,
    TestType        NVARCHAR(20)    NOT NULL,       -- Subject / Safety
    SubjectId       INT             NULL,           -- NULL when TestType = Safety
    Content         NVARCHAR(500)   NOT NULL,
    OptionA         NVARCHAR(255)   NOT NULL,
    OptionB         NVARCHAR(255)   NOT NULL,
    OptionC         NVARCHAR(255)   NOT NULL,
    OptionD         NVARCHAR(255)   NOT NULL,
    CorrectAnswer   CHAR(1)         NOT NULL,       -- 'A' / 'B' / 'C' / 'D'
    Difficulty      NVARCHAR(20)    NULL,           -- Easy / Medium / Hard
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedBy       INT             NULL,           -- AdminId
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Q_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId),
    CONSTRAINT FK_Q_Admin   FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
);

CREATE TABLE TutorTestAttempts (
    AttemptId       INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    TestType        NVARCHAR(20)    NOT NULL,       -- Subject / Safety
    SubjectId       INT             NULL,           -- NULL when TestType = Safety
    TotalQuestions  INT             NOT NULL,
    CorrectCount    INT             NOT NULL,
    ScorePercent    DECIMAL(5,2)    NOT NULL,
    PassThreshold   DECIMAL(5,2)    NOT NULL,       -- 70 for Subject, 80 for Safety
    IsPassed        BIT             NOT NULL,
    AttemptNumber   INT             NOT NULL DEFAULT 1,
    StartedAt       DATETIME        NOT NULL,
    SubmittedAt     DATETIME        NOT NULL,
    CONSTRAINT FK_Attempt_Tutor   FOREIGN KEY (TutorId)   REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_Attempt_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId)
);

CREATE TABLE TutorTestAnswers (
    AnswerId        INT             IDENTITY(1,1) PRIMARY KEY,
    AttemptId       INT             NOT NULL,
    QuestionId      INT             NOT NULL,
    SelectedOption  CHAR(1)         NULL,           -- 'A' / 'B' / 'C' / 'D' / NULL (unanswered)
    IsCorrect       BIT             NOT NULL,
    CONSTRAINT FK_Answer_Attempt  FOREIGN KEY (AttemptId)  REFERENCES TutorTestAttempts(AttemptId),
    CONSTRAINT FK_Answer_Question FOREIGN KEY (QuestionId) REFERENCES Questions(QuestionId)
);

CREATE TABLE SafetyGuidelines (
    GuidelineId     INT             IDENTITY(1,1) PRIMARY KEY,
    Title           NVARCHAR(200)   NOT NULL,
    Body            NVARCHAR(MAX)   NOT NULL,
    Version         INT             NOT NULL DEFAULT 1,
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE()
);

/* ======================================================================
   5. AVAILABILITY & BOOKING
   ====================================================================== */

CREATE TABLE AvailabilitySlots (
    SlotId          INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    DayOfWeek       TINYINT         NULL,           -- 0=Sunday..6=Saturday (for recurring slots)
    SpecificDate    DATE            NULL,           -- used for one-off slots instead of recurring
    StartTime       TIME            NOT NULL,
    EndTime         TIME            NOT NULL,
    IsRecurring     BIT             NOT NULL DEFAULT 1,
    IsBooked        BIT             NOT NULL DEFAULT 0,
    CONSTRAINT FK_Slot_Tutor FOREIGN KEY (TutorId) REFERENCES TutorProfiles(TutorId)
);

CREATE TABLE CancellationPolicies (
    PolicyId        INT             IDENTITY(1,1) PRIMARY KEY,
    TutorId         INT             NOT NULL,
    PolicyType      NVARCHAR(20)    NOT NULL,       -- Flexible / Moderate / Strict
    Description     NVARCHAR(500)   NULL,
    CONSTRAINT FK_Policy_Tutor FOREIGN KEY (TutorId) REFERENCES TutorProfiles(TutorId)
);

CREATE TABLE RefundRules (
    RuleId              INT             IDENTITY(1,1) PRIMARY KEY,
    PolicyId            INT             NOT NULL,
    MinHoursBeforeStart INT             NOT NULL,   -- e.g. 24 (hours before session start)
    RefundPercentage    DECIMAL(5,2)    NOT NULL,   -- e.g. 100.00 / 50.00 / 0.00
    CONSTRAINT FK_Rule_Policy FOREIGN KEY (PolicyId) REFERENCES CancellationPolicies(PolicyId)
);

CREATE TABLE Bookings (
    BookingId           INT             IDENTITY(1,1) PRIMARY KEY,
    StudentId           INT             NOT NULL,
    TutorId             INT             NOT NULL,
    SubjectId           INT             NOT NULL,
    SlotId              INT             NULL,
    ScheduledDate       DATE            NOT NULL,
    StartTime           TIME            NOT NULL,
    EndTime             TIME            NOT NULL,
    TeachingMode        NVARCHAR(20)    NOT NULL,   -- Online / Offline
    Location            NVARCHAR(255)   NULL,
    Price               DECIMAL(10,0)   NOT NULL,
    Status              NVARCHAR(20)    NOT NULL DEFAULT 'Pending',
        -- Pending / Confirmed / Completed / Cancelled / Rejected
    CancellationReason  NVARCHAR(300)   NULL,
    CancelledBy         INT             NULL,       -- UserId who cancelled
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    ConfirmedAt         DATETIME        NULL,
    CompletedAt         DATETIME        NULL,
    CancelledAt         DATETIME        NULL,
    CONSTRAINT FK_Booking_Student FOREIGN KEY (StudentId) REFERENCES Users(UserId),
    CONSTRAINT FK_Booking_Tutor   FOREIGN KEY (TutorId)   REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_Booking_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId),
    CONSTRAINT FK_Booking_Slot    FOREIGN KEY (SlotId)    REFERENCES AvailabilitySlots(SlotId)
);

CREATE TABLE BookingReschedules (
    RescheduleId       INT IDENTITY(1,1) PRIMARY KEY,
    BookingId          INT NOT NULL,
    RequestedBy        INT NOT NULL,

    OldDate            DATE NOT NULL,
    OldStartTime       TIME NOT NULL,
    OldEndTime         TIME NOT NULL,

    NewDate            DATE NOT NULL,
    NewStartTime       TIME NOT NULL,
    NewEndTime         TIME NOT NULL,

    Status             NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    -- Pending / Approved / Rejected / Cancelled

    Reason             NVARCHAR(300) NULL,
    ReviewedBy         INT NULL,

    CreatedAt          DATETIME NOT NULL DEFAULT GETDATE(),
    ReviewedAt         DATETIME NULL,

    CONSTRAINT FK_Reschedule_Booking
        FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId),
    CONSTRAINT FK_Reschedule_Requester
        FOREIGN KEY (RequestedBy) REFERENCES Users(UserId),
    CONSTRAINT FK_Reschedule_Reviewer
        FOREIGN KEY (ReviewedBy) REFERENCES Users(UserId)
);

/* ======================================================================
   6. PAYMENT & REFUND
   ====================================================================== */

CREATE TABLE Payments (
    PaymentId       INT             IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT             NOT NULL,
    PayerUserId     INT             NOT NULL,
    Amount          DECIMAL(10,0)   NOT NULL,
    PaymentMethod   NVARCHAR(20)    NOT NULL,       -- VNPay / MoMo
    TransactionCode NVARCHAR(100)   NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending / Success / Failed / Refunded
    PaidAt          DATETIME        NULL,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Payment_Booking FOREIGN KEY (BookingId)   REFERENCES Bookings(BookingId),
    CONSTRAINT FK_Payment_Payer   FOREIGN KEY (PayerUserId) REFERENCES Users(UserId)
);

ALTER TABLE Payments
ADD
    GatewayTransactionId NVARCHAR(100) NULL,
    GatewayResponseCode  NVARCHAR(50) NULL,
    PaymentUrl           NVARCHAR(1000) NULL,
    CallbackReceivedAt   DATETIME NULL;

CREATE TABLE Refunds (
    RefundId        INT             IDENTITY(1,1) PRIMARY KEY,
    PaymentId       INT             NOT NULL,
    BookingId       INT             NOT NULL,
    Amount          DECIMAL(10,0)   NOT NULL,
    RefundPercent   DECIMAL(5,2)    NOT NULL,
    Reason          NVARCHAR(300)   NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending / Processed / Failed
    ProcessedAt     DATETIME        NULL,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Refund_Payment FOREIGN KEY (PaymentId) REFERENCES Payments(PaymentId),
    CONSTRAINT FK_Refund_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId)
);

/* ======================================================================
   7. REVIEWS & MESSAGING
   ====================================================================== */

CREATE TABLE Reviews (
    ReviewId        INT             IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT             NOT NULL UNIQUE,   -- one review per completed booking
    StudentId       INT             NOT NULL,
    TutorId         INT             NOT NULL,
    Rating          TINYINT         NOT NULL,          -- 1-5
    Comment         NVARCHAR(1000)  NULL,
    TutorReply      NVARCHAR(1000)  NULL,
    RepliedAt       DATETIME        NULL,
    IsHidden        BIT             NOT NULL DEFAULT 0, -- hidden by admin after report
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Review_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId),
    CONSTRAINT FK_Review_Student FOREIGN KEY (StudentId) REFERENCES Users(UserId),
    CONSTRAINT FK_Review_Tutor   FOREIGN KEY (TutorId)   REFERENCES TutorProfiles(TutorId),
    CONSTRAINT CK_Review_Rating  CHECK (Rating BETWEEN 1 AND 5)
);

CREATE TABLE Conversations (
    ConversationId  INT             IDENTITY(1,1) PRIMARY KEY,
    User1Id         INT             NOT NULL,
    User2Id         INT             NOT NULL,
    BookingId       INT             NULL,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    LastMessageAt   DATETIME        NULL,
    CONSTRAINT FK_Conv_User1 FOREIGN KEY (User1Id) REFERENCES Users(UserId),
    CONSTRAINT FK_Conv_User2 FOREIGN KEY (User2Id) REFERENCES Users(UserId),
    CONSTRAINT FK_Conv_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId)
);

CREATE TABLE Messages (
    MessageId       INT             IDENTITY(1,1) PRIMARY KEY,
    ConversationId  INT             NOT NULL,
    SenderId        INT             NOT NULL,
    Content         NVARCHAR(2000)  NOT NULL,
    IsRead          BIT             NOT NULL DEFAULT 0,
    SentAt          DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Msg_Conversation FOREIGN KEY (ConversationId) REFERENCES Conversations(ConversationId),
    CONSTRAINT FK_Msg_Sender FOREIGN KEY (SenderId) REFERENCES Users(UserId)
);

/* ======================================================================
   8. NOTIFICATIONS
   ====================================================================== */

CREATE TABLE Notifications (
    NotificationId      INT             IDENTITY(1,1) PRIMARY KEY,
    UserId              INT             NOT NULL,
    Type                NVARCHAR(50)    NOT NULL,   -- BookingRequest / BookingConfirmed / PaymentReminder / NewReview / TestResult / GroupInvite / MentorInvite ...
    Title               NVARCHAR(200)   NOT NULL,
    Content             NVARCHAR(500)   NULL,
    RelatedEntityType   NVARCHAR(50)    NULL,       -- Booking / Review / StudyGroup / TutorProfile / StudyGroupMentor
    RelatedEntityId     INT             NULL,
    IsRead              BIT             NOT NULL DEFAULT 0,
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Notif_User FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

/* ======================================================================
   9. STUDY GROUP FINDER (+ OPTIONAL MENTOR SUPPORT)
   ====================================================================== */

CREATE TABLE StudyGroups (
    GroupId         INT             IDENTITY(1,1) PRIMARY KEY,
    CreatedByUserId INT             NOT NULL,
    SubjectId       INT             NOT NULL,
    Title           NVARCHAR(200)   NOT NULL,
    Description     NVARCHAR(1000)  NULL,
    EducationLevel  NVARCHAR(50)    NULL,
    StudyGoal       NVARCHAR(50)    NOT NULL,   -- ExamPrep / GroupAssignment / SkillPractice
    MaxMembers      INT             NOT NULL DEFAULT 6,
    MeetingMode     NVARCHAR(20)    NOT NULL,   -- Online / Offline
    Location        NVARCHAR(255)   NULL,
    City            NVARCHAR(100)   NULL,
    District        NVARCHAR(100)   NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'Open', -- Open / Full / Closed
    HasMentor       BIT             NOT NULL DEFAULT 0, -- quick flag: true only when a mentor invite has been Accepted
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Group_Creator FOREIGN KEY (CreatedByUserId) REFERENCES Users(UserId),
    CONSTRAINT FK_Group_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId)
);

CREATE TABLE StudyGroupSchedules (
    ScheduleId      INT             IDENTITY(1,1) PRIMARY KEY,
    GroupId         INT             NOT NULL,
    DayOfWeek       TINYINT         NULL,
    SpecificDate    DATE            NULL,
    StartTime       TIME            NOT NULL,
    EndTime         TIME            NOT NULL,
    CONSTRAINT FK_GSchedule_Group FOREIGN KEY (GroupId) REFERENCES StudyGroups(GroupId)
);

CREATE TABLE StudyGroupMembers (
    MemberId        INT             IDENTITY(1,1) PRIMARY KEY,
    GroupId         INT             NOT NULL,
    UserId          INT             NOT NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending / Approved / Left / Removed
    JoinedAt        DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_GMember_Group FOREIGN KEY (GroupId) REFERENCES StudyGroups(GroupId),
    CONSTRAINT FK_GMember_User  FOREIGN KEY (UserId)  REFERENCES Users(UserId),
    CONSTRAINT UQ_GroupMember UNIQUE (GroupId, UserId)
);

-- NEW: optional mentor invitation for a study group.
-- The group creator MAY invite a verified Tutor to act as mentor, or leave the group without any mentor.
CREATE TABLE StudyGroupMentors (
    StudyGroupMentorId  INT             IDENTITY(1,1) PRIMARY KEY,
    GroupId             INT             NOT NULL,
    TutorId             INT             NOT NULL,       -- must reference an approved/published TutorProfile
    InvitedByUserId     INT             NOT NULL,       -- the group creator who sent the invite
    Status              NVARCHAR(20)    NOT NULL DEFAULT 'Pending',
        -- Pending / Accepted / Declined / Removed
    InviteMessage       NVARCHAR(500)   NULL,
    InvitedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    RespondedAt         DATETIME        NULL,
    CONSTRAINT FK_GroupMentor_Group    FOREIGN KEY (GroupId)         REFERENCES StudyGroups(GroupId),
    CONSTRAINT FK_GroupMentor_Tutor    FOREIGN KEY (TutorId)         REFERENCES TutorProfiles(TutorId),
    CONSTRAINT FK_GroupMentor_Inviter  FOREIGN KEY (InvitedByUserId) REFERENCES Users(UserId),
    CONSTRAINT UQ_GroupMentor UNIQUE (GroupId, TutorId)  -- a tutor can only be invited once per group
);
GO

-- Enforce: at most ONE active (Accepted) mentor per study group at any time.
-- A filtered unique index only checks rows where Status = 'Accepted', so
-- multiple 'Pending'/'Declined'/'Removed' rows for the same group are still allowed.
CREATE UNIQUE INDEX UQ_StudyGroup_ActiveMentor
    ON StudyGroupMentors(GroupId)
    WHERE Status = 'Accepted';
GO

/* ======================================================================
   10. WISHLIST / SAVED TUTORS
   ====================================================================== */

CREATE TABLE Wishlist (
    WishlistId      INT             IDENTITY(1,1) PRIMARY KEY,
    StudentId       INT             NOT NULL,
    TutorId         INT             NOT NULL,
    AddedAt         DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Wishlist_Student FOREIGN KEY (StudentId) REFERENCES Users(UserId),
    CONSTRAINT FK_Wishlist_Tutor   FOREIGN KEY (TutorId)   REFERENCES TutorProfiles(TutorId),
    CONSTRAINT UQ_Wishlist UNIQUE (StudentId, TutorId)
);

/* ======================================================================
   11. ADMIN, REPORTS & MODERATION
   ====================================================================== */

CREATE TABLE Reports (
    ReportId            INT             IDENTITY(1,1) PRIMARY KEY,
    ReporterId          INT             NOT NULL,
    ReportedEntityType  NVARCHAR(30)    NOT NULL,   -- User / Review / StudyGroup / Message
    ReportedEntityId    INT             NOT NULL,
    Reason              NVARCHAR(100)   NOT NULL,
    Description         NVARCHAR(500)   NULL,
    Status              NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending / Resolved / Dismissed
    ReviewedBy          INT             NULL,       -- AdminId
    ReviewedAt          DATETIME        NULL,
    ActionTaken         NVARCHAR(300)   NULL,
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Report_Reporter FOREIGN KEY (ReporterId) REFERENCES Users(UserId),
    CONSTRAINT FK_Report_Admin    FOREIGN KEY (ReviewedBy) REFERENCES Users(UserId)
);

CREATE TABLE AdminActionLogs (
    LogId               INT             IDENTITY(1,1) PRIMARY KEY,
    AdminId             INT             NOT NULL,
    ActionType          NVARCHAR(100)   NOT NULL,   -- ApproveDocument / BanUser / ResolveReport / ...
    TargetEntityType    NVARCHAR(50)    NULL,
    TargetEntityId      INT             NULL,
    Description         NVARCHAR(500)   NULL,
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Log_Admin FOREIGN KEY (AdminId) REFERENCES Users(UserId)
);

CREATE TABLE PlatformSettings (
    SettingKey      NVARCHAR(100)   PRIMARY KEY,
    SettingValue    NVARCHAR(500)   NOT NULL,
    Description     NVARCHAR(300)   NULL,
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE()
);

/* ======================================================================
   SEED DATA (basic reference records)
   ====================================================================== */

INSERT INTO Roles (RoleName) VALUES ('Student'), ('Parent'), ('Tutor'), ('Admin');

INSERT INTO Subjects (SubjectName, EducationLevel) VALUES
(N'Toan', 'Secondary'), (N'Van', 'Secondary'), (N'Tieng Anh', 'Secondary'),
(N'Vat Ly', 'HighSchool'), (N'Hoa Hoc', 'HighSchool'), (N'Sinh Hoc', 'HighSchool');

INSERT INTO PlatformSettings (SettingKey, SettingValue, Description) VALUES
('SUBJECT_TEST_PASS_SCORE', '70', N'Minimum % score to pass subject qualification test'),
('SAFETY_TEST_PASS_SCORE', '80', N'Minimum % score to pass safety/pedagogical test'),
('FACE_MATCH_MIN_CONFIDENCE', '85', N'Minimum confidence % for automatic face-match approval'),
('TEST_RETRY_WAIT_DAYS', '7', N'Waiting period in days before a failed test can be retaken');
GO


GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE TutorPlatformDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Questions') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE Questions ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to Questions.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TutorSubjects') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE TutorSubjects ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to TutorSubjects.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TutorTestAttempts') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE TutorTestAttempts ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to TutorTestAttempts.';
END
GO


GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

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


GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE TutorPlatformDB;
GO

-- =====================================================================
-- NÂNG CẤP BỘ CÂU HỎI SÁT HẠCH NĂNG LỰC GIA SƯ (CHUẨN CHẤT LƯỢNG ĐẦU VÀO)
-- Bao gồm:
-- 1. Bài kiểm tra Chuyên môn (Professional): Phân hóa Lớp 6-12, lồng ghép Bẫy tư duy,
--    Lỗi sai học sinh (Diagnostic Ability) và Phương pháp giải.
-- 2. Bài kiểm tra Sư phạm & An toàn (Pedagogical): Tâm lý lứa tuổi, xử lý tình huống,
--    đạo đức nghề nghiệp và quy tắc bảo vệ học sinh.
-- Idempotent: Xóa các câu hỏi mẫu quá sơ đẳng cũ và chèn bộ câu hỏi chuẩn sư phạm.
-- =====================================================================

IF OBJECT_ID('tempdb..#AdvancedSeed') IS NOT NULL DROP TABLE #AdvancedSeed;
CREATE TABLE #AdvancedSeed (
    TestType         NVARCHAR(20),
    SubjectName      NVARCHAR(100) NULL,
    EducationLevel   NVARCHAR(50)  NULL,
    GradeLevel       NVARCHAR(50)  NULL,
    Content          NVARCHAR(500),
    OptionA          NVARCHAR(255),
    OptionB          NVARCHAR(255),
    OptionC          NVARCHAR(255),
    OptionD          NVARCHAR(255),
    CorrectAnswer    NVARCHAR(1),
    Difficulty       NVARCHAR(20)
);

-- =====================================================================
-- 1. BÀI TEST KỸ NĂNG SƯ PHẠM & AN TOÀN (PEDAGOGICAL) - ÁP DỤNG CHUNG
-- =====================================================================
INSERT INTO #AdvancedSeed VALUES
(N'Pedagogical', NULL, NULL, NULL,
 N'Học sinh thường xuyên không làm bài tập về nhà và có thái độ bất hợp tác. Cách xử lý nào thể hiện năng lực sư phạm chuẩn mực nhất?',
 N'Trách phạt nghiêm khắc trước mặt phụ huynh ngay trong buổi học để răn đe.',
 N'Lắng nghe tìm hiểu nguyên nhân gốc rễ, chia nhỏ khối lượng bài tập và chủ động trao đổi xây dựng lộ trình với phụ huynh.',
 N'Bỏ qua bài tập về nhà và chỉ dạy lý thuyết mới trên lớp để giữ hòa khí.',
 N'Yêu cầu hủy hợp đồng giảng dạy ngay lập tức vì học sinh không có tinh thần học tập.',
 N'B', N'Tình huống'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Học sinh đề nghị chuyển khoản học phí trực tiếp vào tài khoản cá nhân của gia sư để được giảm giá ngoài nền tảng. Gia sư nên ứng xử thế nào?',
 N'Đồng ý ngay vì cả hai bên đều tiết kiệm được chi phí hoa hồng.',
 N'Từ chối và giải thích rõ việc thanh toán qua hệ thống là cơ chế bảo vệ quyền lợi tài chính, hợp đồng và an toàn cho cả hai bên.',
 N'Đồng ý nhưng yêu cầu học sinh không được nói cho phụ huynh biết.',
 N'Báo cáo hủy tài khoản học sinh ngay lập tức mà không giải thích.',
 N'B', N'Quy tắc an toàn'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Trong buổi học kèm tại nhà, gia sư nhận thấy học sinh có dấu hiệu hoảng loạn, sợ hãi hoặc tâm sự bị bạo hành/xâm hại. Hành động đúng đắn nhất là:',
 N'Xem như việc gia đình học sinh và không can thiệp để tránh phiền phức.',
 N'Lắng nghe bình tĩnh, trấn an học sinh, không phán xét và thông báo khẩn cấp cho ban quản lý nền tảng hoặc cơ quan bảo vệ trẻ em.',
 N'Chất vấn phụ huynh ngay lập tức một cách gay gắt trong buổi học.',
 N'Đăng bài lên mạng xã hội để nhờ cộng đồng mạng can thiệp.',
 N'B', N'Quy tắc an toàn'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Khi giảng dạy một khái niệm trừu tượng mới mà học sinh học lực yếu mãi không hiểu, phương pháp sư phạm tối ưu của gia sư là:',
 N'Nói to hơn và lặp lại định nghĩa sách giáo khoa nhiều lần cho học sinh nhớ.',
 N'Chuyển sang làm bài tập mẫu phức tạp để học sinh tự rút ra quy luật.',
 N'Dùng ví dụ trực quan đời sống gần gũi, sử dụng hình vẽ/sơ đồ tư duy và đặt câu hỏi gợi mở từng bước nhỏ.',
 N'Yêu cầu học sinh chép phạt định nghĩa 10 lần về nhà học thuộc lòng.',
 N'C', N'Sư phạm');

-- =====================================================================
-- 2. TOÁN HỌC (SECONDARY: LỚP 6 - 9)
-- =====================================================================
-- TOÁN 6
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Học sinh thực hiện phép tính: 20 - 10 : 2 = 10 : 2 = 5. Gia sư nên chỉ ra lỗi sai cốt lõi của học sinh như thế nào?',
 N'Học sinh tính sai kết quả của 10 : 2.',
 N'Học sinh vi phạm quy tắc thứ tự thực hiện phép tính (phải nhân chia trước, cộng trừ sau).',
 N'Phép tính không có lỗi sai, kết quả 5 là chính xác.',
 N'Học sinh phải đặt dấu ngoặc vào (20 - 10) thì mới được tính.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Tìm số tự nhiên x biết: 2^(x+1) + 2^x = 96. Giá trị của x là:',
 N'x = 4', N'x = 5', N'x = 6', N'x = 3',
 N'B', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Một lớp học có 40 học sinh. Trong đợt khảo sát, có 28 em thích môn Toán, 20 em thích môn Văn. Có ít nhất bao nhiêu em thích cả hai môn Toán và Văn?',
 N'8 học sinh', N'12 học sinh', N'20 học sinh', N'48 học sinh',
 N'A', N'Nâng cao');

-- TOÁN 7
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Học sinh kết luận: "Nếu x^2 = 25 thì x = 5". Gia sư cần sửa lỗi tư duy toán học nào cho học sinh?',
 N'Học sinh bỏ quên nghiệm âm x = -5 vì (-5)^2 cũng bằng 25.',
 N'Học sinh tính sai căn bậc hai của 25.',
 N'Kết luận của học sinh là hoàn toàn đầy đủ trong tập số nguyên.',
 N'Phương trình x^2 = 25 vô nghiệm vì không có số nào bình phương bằng 25.',
 N'A', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Cho tam giác ABC cân tại A có góc ở đỉnh A bằng 40 độ. Số đo góc B ở đáy là:',
 N'40 độ', N'70 độ', N'140 độ', N'60 độ',
 N'B', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Cho tỉ lệ thức a/b = c/d (với a, b, c, d khác 0). Biểu thức nào sau đây luôn đúng theo tính chất tỉ lệ thức?',
 N'(a + b) / b = (c + d) / d',
 N'a . c = b . d',
 N'(a - b) / a = (c + d) / c',
 N'a / d = b / c',
 N'A', N'Nâng cao');

-- TOÁN 8
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Học sinh giải phương trình: (x - 2)(x - 5) = 4 suy ra x - 2 = 4 hoặc x - 5 = 4. Lỗi sai căn bản của học sinh là gì?',
 N'Tính nhầm dấu khi chuyển vế số 2 và 5.',
 N'Áp dụng tùy tiện quy tắc tích A.B = 0 khi vế phải khác 0 (vế phải bằng 4 chứ không bằng 0).',
 N'Phương trình bậc 2 luôn vô nghiệm nên không được tách nhân tử.',
 N'Quên chia cả hai vế cho 4 trước khi giải.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Rút gọn phân thức đại số P = (x^2 - 4) / (x^2 - 4x + 4) với điều kiện xác định x khác 2 ta được:',
 N'(x + 2) / (x - 2)',
 N'(x - 2) / (x + 2)',
 N'1 / (4x)',
 N'(x + 2) / (x + 2) = 1',
 N'A', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Cho tam giác ABC đồng dạng với tam giác DEF theo tỉ số đồng dạng k = 2/3. Tỉ số diện tích tương ứng S(ABC) / S(DEF) bằng:',
 N'2/3', N'4/9', N'3/2', N'8/27',
 N'B', N'Vận dụng');

-- TOÁN 9
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Học sinh viết: căn bậc hai số học của (x - 3)^2 = x - 3 với mọi số thực x. Gia sư cần sửa điều gì để biểu thức luôn đúng?',
 N'Phải đổi thành căn((x - 3)^2) = 3 - x với mọi x.',
 N'Phải khai căn ra giá trị tuyệt đối |x - 3|, chỉ bằng x - 3 khi x >= 3 và bằng 3 - x khi x < 3.',
 N'Khai căn số học luôn ra số dương nên không cần bất kỳ điều kiện nào.',
 N'Biểu thức của học sinh đã chính xác tuyệt đối.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Cho phương trình x^2 - 5x + m = 0. Giá trị của m để phương trình có 2 nghiệm phân biệt x1, x2 thỏa mãn x1^2 + x2^2 = 13 là:',
 N'm = 6', N'm = -6', N'm = 12', N'm = 25/4',
 N'A', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Cho đường tròn (O; R) và dây cung AB có độ dài bằng R*căn(3). Số đo góc ở tâm AOB chắn cung nhỏ AB là:',
 N'60 độ', N'90 độ', N'120 độ', N'150 độ',
 N'C', N'Nâng cao');

-- =====================================================================
-- 3. TIẾNG ANH (SECONDARY: LỚP 6 - 9)
-- =====================================================================
-- TIẾNG ANH 6
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 6',
 N'Học sinh viết câu: "She don''t likes listening to music." Lỗi ngữ pháp cần sửa cho học sinh là:',
 N'Đổi "don''t likes" thành "doesn''t like" (trợ động từ phủ định ngôi thứ 3 số ít và động từ chính về nguyên mẫu).',
 N'Chỉ cần đổi "listening" thành "listen".',
 N'Câu trên hoàn toàn đúng ngữ pháp hiện tại đơn.',
 N'Đổi "likes" thành "is like".',
 N'A', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 6',
 N'Chọn giới từ chính xác để điền vào chỗ trống: "The final examination will take place ___ Monday, June 12th."',
 N'in', N'at', N'on', N'by',
 N'C', N'Vận dụng');

-- TIẾNG ANH 7
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 7',
 N'Học sinh bối rối giữa "fewer" và "less". Quy tắc giảng giải chuẩn xác nhất gia sư cần truyền đạt là gì?',
 N'"Fewer" đi với danh từ không đếm được, "less" đi với danh từ đếm được số nhiều.',
 N'"Fewer" đi với danh từ đếm được số nhiều, còn "less" đi với danh từ không đếm được.',
 N'Cả hai từ dùng hoàn toàn thay thế được cho nhau trong mọi ngữ cảnh.',
 N'"Fewer" chỉ dùng trong câu khẳng định, "less" chỉ dùng trong câu phủ định.',
 N'B', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 7',
 N'Điền dạng đúng của động từ: "He was not experienced enough ___ the complex problem yesterday."',
 N'solve', N'solving', N'to solve', N'solved',
 N'C', N'Vận dụng');

-- TIẾNG ANH 8
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 8',
 N'Khi chuyển câu trực tiếp sang gián tiếp: "I will visit my grandparents tomorrow," Nam said. Học sinh hay mắc lỗi bỏ quên bước nào nhất?',
 N'Chỉ cần giữ nguyên động từ will.',
 N'Phải lùi thì (will -> would), đổi đại từ (I -> he) và đổi trạng từ chỉ thời gian (tomorrow -> the following day/the next day).',
 N'Chỉ cần thêm chữ "that" vào giữa hai vế.',
 N'Đổi Nam thành "He" ở mệnh đề chính.',
 N'B', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 8',
 N'Chuyển câu sau sang thể bị động (Passive voice): "They have built a new bridge across the river."',
 N'A new bridge has been built across the river.',
 N'A new bridge was built across the river.',
 N'A new bridge is built across the river.',
 N'A new bridge have been built across the river.',
 N'A', N'Vận dụng');

-- TIẾNG ANH 9
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 9',
 N'Chọn phương án rút gọn mệnh đề quan hệ chuẩn xác: "The students who are participating in the contest are talented."',
 N'The students participating in the contest are talented.',
 N'The students participated in the contest are talented.',
 N'The students participate in the contest are talented.',
 N'The students to participate in the contest are talented.',
 N'A', N'Vận dụng'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 9',
 N'Điền dạng động từ thích hợp của câu điều kiện: "If I ___ in your position, I ___ that job offer immediately."',
 N'am / will accept',
 N'were / would accept',
 N'was / will accept',
 N'had been / accept',
 N'B', N'Vận dụng');

-- =====================================================================
-- 4. VẬT LÝ (HIGHSCHOOL: LỚP 10 - 12)
-- =====================================================================
-- VẬT LÝ 10
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 10',
 N'Học sinh quan niệm: "Muốn vật duy trì chuyển động thẳng đều thì bắt buộc phải có lực tác dụng liên tục". Gia sư dùng định luật nào để giải thích?',
 N'Định luật vạn vật hấp dẫn của Newton.',
 N'Định luật I Newton: Vật giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều khi không chịu lực nào tác dụng hoặc hợp lực bằng 0.',
 N'Định luật III Newton về cặp lực trực đối.',
 N'Định luật II Newton với công thức F = m.a.',
 N'B', N'Sư phạm'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 10',
 N'Một vật khối lượng m = 2 kg trượt trên sàn nằm ngang dưới tác dụng của lực kéo F = 10 N theo phương ngang. Hệ số ma sát mu = 0.2, lấy g = 10 m/s^2. Gia tốc của vật là:',
 N'a = 3 m/s^2', N'a = 5 m/s^2', N'a = 2 m/s^2', N'a = 1 m/s^2',
 N'A', N'Vận dụng');

-- VẬT LÝ 11
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 11',
 N'Điều kiện cần và đủ để xảy ra hiện tượng phản xạ toàn phần tại mặt phân cách giữa hai môi trường trong suốt là:',
 N'Ánh sáng truyền từ môi trường chiết quang kém sang môi trường chiết quang hơn và góc tới i > 0.',
 N'Ánh sáng truyền từ môi trường chiết quang hơn sang chiết quang kém (n1 > n2) và góc tới i >= i_gh (với sin i_gh = n2/n1).',
 N'Góc tới i phải luôn bằng 90 độ.',
 N'Chỉ cần hai môi trường có cùng chiết suất tuyệt đối.',
 N'B', N'Vận dụng'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 11',
 N'Một nguồn điện có suất điện động E = 12 V, điện trở trong r = 1 Ohm mắc với mạch ngoài là điện trở R = 5 Ohm. Cường độ dòng điện trong mạch và công suất tỏa nhiệt trên R là:',
 N'I = 2 A, P = 20 W',
 N'I = 2.4 A, P = 28.8 W',
 N'I = 2 A, P = 10 W',
 N'I = 1 A, P = 5 W',
 N'A', N'Vận dụng');

-- VẬT LÝ 12
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 12',
 N'Trong mạch dao động RLC mắc nối tiếp đang có hiện tượng cộng hưởng điện (omega = 1 / căn(LC)). Phát biểu nào sau đây là SAI?',
 N'Cường độ dòng điện hiệu dụng trong mạch đạt giá trị cực đại I_max = U / R.',
 N'Điện áp tức thời giữa hai đầu đoạn mạch cùng pha với cường độ dòng điện.',
 N'Tổng trở của đoạn mạch đạt giá trị lớn nhất Z_max = R + Z_L + Z_C.',
 N'Hệ số công suất của đoạn mạch đạt giá trị cực đại cos(phi) = 1.',
 N'C', N'Vận dụng'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 12',
 N'Trong thí nghiệm Y-âng về giao thoa ánh sáng đơn sắc có bước sóng lambda. Nếu tăng khoảng cách giữa hai khe hẹp lên 2 lần (a'' = 2a) và giữ nguyên khoảng cách D thì khoảng vân i sẽ:',
 N'Tăng lên 2 lần', N'Giảm đi 2 lần', N'Không thay đổi', N'Tăng lên 4 lần',
 N'B', N'Vận dụng');

-- =====================================================================
-- 5. HÓA HỌC (HIGHSCHOOL: LỚP 10 - 12)
-- =====================================================================
-- HÓA 10
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 10',
 N'Trong phản ứng oxi hóa - khử: 2Fe + 3Cl2 -> 2FeCl3, bản chất quá trình biến đổi electron của nguyên tử Clo là:',
 N'Clo nhường electron nên là chất khử.',
 N'Mỗi phân tử Cl2 nhận 2 electron (Cl2 + 2e -> 2Cl-) để giảm số oxi hóa từ 0 xuống -1, Clo là chất oxi hóa.',
 N'Clo không thay đổi số oxi hóa trong phản ứng này.',
 N'Clo vừa là chất oxi hóa vừa là chất khử.',
 N'B', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 10',
 N'Dựa vào hiệu độ âm điện giữa hai nguyên tử liên kết, liên kết trong phân tử nào sau đây là liên kết ion rõ rệt nhất?',
 N'NaCl (kim loại điển hình Na và phi kim điển hình Cl)',
 N'HCl (phi kim H và Cl)',
 N'CH4 (phi kim C và H)',
 N'O2 (giữa hai nguyên tử oxy cùng độ âm điện)',
 N'A', N'Vận dụng');

-- HÓA 11
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 11',
 N'Cho cân bằng hóa học trong bình kín: N2(k) + 3H2(k) <=> 2NH3(k) với delta H < 0 (phản ứng tỏa nhiệt). Để cân bằng chuyển dịch theo chiều thuận tạo ra nhiều NH3 hơn, cần tác động:',
 N'Tăng nhiệt độ và giảm áp suất chung của hệ.',
 N'Giảm nhiệt độ và tăng áp suất chung của hệ.',
 N'Chỉ cần thêm chất xúc tác bột sắt mà không đổi nhiệt độ, áp suất.',
 N'Tăng thể tích bình chứa lên 2 lần.',
 N'B', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 11',
 N'Trộn lẫn 100 ml dung dịch HCl 0.1 M với 100 ml dung dịch NaOH 0.1 M ở 25 độ C. Giá trị pH của dung dịch thu được sau phản ứng trung hòa là:',
 N'pH = 1', N'pH = 7', N'pH = 13', N'pH = 0',
 N'B', N'Vận dụng');

-- HÓA 12
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 12',
 N'Thủy phân hoàn toàn 8.8 gam etyl axetat (CH3COOC2H5, M = 88 g/mol) bằng dung dịch NaOH vừa đủ, đun nóng. Khối lượng muối natri axetat (CH3COONa, M = 82 g/mol) thu được là:',
 N'8.2 gam', N'8.8 gam', N'6.8 gam', N'4.1 gam',
 N'A', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 12',
 N'Khi nhúng một lá sắt (Fe) sạch vào dung dịch đồng sunfat (CuSO4 dư), hiện tượng hóa học quan sát được và phương trình phản ứng chuẩn xác là:',
 N'Không có hiện tượng gì xảy ra vì sắt yếu hơn đồng.',
 N'Có lớp kim loại màu đỏ (Cu) bám ngoài lá sắt, dung dịch nhạt dần màu xanh lam (Fe + CuSO4 -> FeSO4 + Cu).',
 N'Khí H2 thoát ra sủi bọt mạnh mẽ trên bề mặt lá sắt.',
 N'Lá sắt tan hoàn toàn và xuất hiện kết tủa trắng Fe(OH)2.',
 N'B', N'Vận dụng');

-- =====================================================================
-- TIẾN HÀNH NẠP VÀO DATABASE
-- =====================================================================

-- 1. Nạp câu hỏi Sư phạm (Pedagogical: SubjectId = NULL, GradeLevel = NULL)
INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT t.TestType, NULL, NULL, t.Content, t.OptionA, t.OptionB, t.OptionC, t.OptionD, t.CorrectAnswer, t.Difficulty, 1, GETDATE()
FROM #AdvancedSeed t
WHERE t.TestType = N'Pedagogical'
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.TestType = N'Pedagogical'
        AND q.Content = t.Content
  );

-- 2. Nạp câu hỏi Chuyên môn (Professional: Theo SubjectId và GradeLevel)
INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT t.TestType, s.SubjectId, t.GradeLevel, t.Content, t.OptionA, t.OptionB, t.OptionC, t.OptionD, t.CorrectAnswer, t.Difficulty, 1, GETDATE()
FROM #AdvancedSeed t
INNER JOIN Subjects s
    ON s.SubjectName = t.SubjectName
    AND s.EducationLevel = t.EducationLevel
    AND s.IsActive = 1
WHERE t.TestType = N'Professional'
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.SubjectId = s.SubjectId
        AND q.GradeLevel = t.GradeLevel
        AND q.Content = t.Content
  );

DROP TABLE #AdvancedSeed;
GO

-- In báo cáo tổng hợp ngân hàng đề thi
SELECT 
    q.TestType,
    ISNULL(s.SubjectName, N'(Chung Sư phạm)') AS SubjectName,
    ISNULL(q.GradeLevel, N'Tất cả khối') AS GradeLevel,
    q.Difficulty,
    COUNT(*) AS QuestionCount
FROM Questions q
LEFT JOIN Subjects s ON s.SubjectId = q.SubjectId
WHERE q.IsActive = 1
GROUP BY q.TestType, s.SubjectName, q.GradeLevel, q.Difficulty
ORDER BY q.TestType, s.SubjectName, q.GradeLevel;
GO

GO


-- =========================================================================================
-- SEED TÀI KHOẢN MẪU & ĐƠN HÀNG SẴN SÀNG TEST CHECKOUT QR CODE
-- Mật khẩu mặc định cho TẤT CẢ tài khoản test: Password123!
-- =========================================================================================
USE TutorPlatformDB;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @StudentRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Student');
DECLARE @TutorRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Tutor');
DECLARE @AdminRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Admin');
DECLARE @ParentRole INT = (SELECT RoleId FROM Roles WHERE RoleName = N'Parent');
DECLARE @Pwd NVARCHAR(255) = N'$2a$11$wtIItxdtvnJCuuVLNVLhZO62qzW.KeOsLsQFtl2fJ6OfFBnaIaMD.'; -- Password123!

-- 1. Tài khoản Student mặc định: student@tutor.com
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'student@tutor.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
    VALUES (N'student@tutor.com', @Pwd, N'0909000001', N'Nguyễn Văn Học', N'Male', N'https://i.pravatar.cc/300?img=11', @StudentRole, N'123 Đường Cầu Giấy', N'Hà Nội', N'Cầu Giấy', 1, N'Active', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = @Pwd, IsEmailConfirmed = 1, Status = N'Active' WHERE Email = N'student@tutor.com';
END

DECLARE @Sid INT = (SELECT UserId FROM Users WHERE Email = N'student@tutor.com');
IF NOT EXISTS (SELECT 1 FROM StudentProfiles WHERE StudentId = @Sid)
    INSERT INTO StudentProfiles (StudentId, GradeLevel, SchoolName, LearningGoals) VALUES (@Sid, N'HighSchool', N'THPT Chu Van An', N'Luyen thi THPT Quoc Gia');

-- 2. Tài khoản Tutor mặc định: tutor@tutor.com
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'tutor@tutor.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
    VALUES (N'tutor@tutor.com', @Pwd, N'0909000002', N'Thầy Trần Minh Hoàng', N'Male', N'https://i.pravatar.cc/300?img=14', @TutorRole, N'456 Đường Láng', N'Hà Nội', N'Đống Đa', 1, N'Active', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = @Pwd, IsEmailConfirmed = 1, Status = N'Active' WHERE Email = N'tutor@tutor.com';
END

DECLARE @Tid INT = (SELECT UserId FROM Users WHERE Email = N'tutor@tutor.com');
IF NOT EXISTS (SELECT 1 FROM TutorProfiles WHERE TutorId = @Tid)
BEGIN
    INSERT INTO TutorProfiles (TutorId, Bio, University, Major, YearsOfExperience, HourlyRateMin, HourlyRateMax, TeachingMode, VerificationStatus, AverageRating, TotalReviews, IsPublished, CreatedAt)
    VALUES (@Tid, N'Gia sư Toán cấp 3 với 6 năm kinh nghiệm, phương pháp giảng dạy dễ hiểu, tận tâm.', N'Đại học Sư Phạm Hà Nội', N'Sư phạm Toán', 6, 200000, 350000, N'Online', N'Verified', 5.0, 15, 1, GETDATE());
END
ELSE
BEGIN
    UPDATE TutorProfiles SET IsPublished = 1, VerificationStatus = N'Verified' WHERE TutorId = @Tid;
END

-- 3. Tài khoản Admin mặc định: admin@tutor.com
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = N'admin@tutor.com')
BEGIN
    INSERT INTO Users (Email, PasswordHash, PhoneNumber, FullName, Gender, AvatarUrl, RoleId, Address, City, District, IsEmailConfirmed, Status, CreatedAt)
    VALUES (N'admin@tutor.com', @Pwd, N'0909000003', N'Quản Trị Viên TSG', N'Male', N'https://i.pravatar.cc/300?img=60', @AdminRole, N'1 Duy Tân', N'Hà Nội', N'Cầu Giấy', 1, N'Active', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = @Pwd, IsEmailConfirmed = 1, Status = N'Active' WHERE Email = N'admin@tutor.com';
END

-- 4. Gán môn Toán cho tutor@tutor.com
DECLARE @ToanSub INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Toan');
IF @ToanSub IS NOT NULL AND NOT EXISTS (SELECT 1 FROM TutorSubjects WHERE TutorId = @Tid AND SubjectId = @ToanSub)
    INSERT INTO TutorSubjects (TutorId, SubjectId, IsVerified, VerifiedAt) VALUES (@Tid, @ToanSub, 1, GETDATE());

-- 5. Lịch rảnh cho tutor@tutor.com
IF NOT EXISTS (SELECT 1 FROM AvailabilitySlots WHERE TutorId = @Tid)
BEGIN
    INSERT INTO AvailabilitySlots (TutorId, DayOfWeek, SpecificDate, StartTime, EndTime, IsRecurring, IsBooked)
    VALUES
    (@Tid, 2, NULL, '19:00', '21:00', 1, 0),
    (@Tid, 4, NULL, '19:00', '21:00', 1, 0),
    (@Tid, 6, NULL, '19:00', '21:00', 1, 0),
    (@Tid, NULL, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), '19:00', '21:00', 0, 0);
END

-- 6. Tạo đơn đặt lịch Pending để TEST NGAY TRANG CHECKOUT / QR CODE
-- Đơn hàng dành cho student@tutor.com
IF NOT EXISTS (SELECT 1 FROM Bookings WHERE StudentId = @Sid AND Status = N'Pending')
BEGIN
    INSERT INTO Bookings (StudentId, TutorId, SubjectId, ScheduledDate, StartTime, EndTime, TeachingMode, Location, Price, Status, CreatedAt)
    VALUES (@Sid, @Tid, @ToanSub, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), '19:00', '21:00', N'Online', N'Online', 300000, N'Pending', GETDATE());
END

-- Đơn hàng dành cho student.demo@tsg.com
DECLARE @DemoSid INT = (SELECT UserId FROM Users WHERE Email = N'student.demo@tsg.com');
IF @DemoSid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Bookings WHERE StudentId = @DemoSid AND Status = N'Pending')
BEGIN
    INSERT INTO Bookings (StudentId, TutorId, SubjectId, ScheduledDate, StartTime, EndTime, TeachingMode, Location, Price, Status, CreatedAt)
    VALUES (@DemoSid, @Tid, @ToanSub, DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), '19:00', '21:00', N'Online', N'Online', 250000, N'Pending', GETDATE());
END

PRINT '=============================================================';
PRINT 'DATABASE & DEMO SEED COMPLETED SUCCESSFULLY!';
PRINT 'Tài khoản học sinh test: student@tutor.com | Mật khẩu: Password123!';
PRINT 'Tài khoản gia sư test:   tutor@tutor.com   | Mật khẩu: Password123!';
PRINT 'Tài khoản quản trị:      admin@tutor.com   | Mật khẩu: Password123!';
PRINT 'Có sẵn đơn đặt lịch Pending để quét mã VietQR PayOS ngay lập tức!';
PRINT '=============================================================';
GO

