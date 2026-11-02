USE TutorPlatformDB;
GO

-- =====================================================================
-- 3 tính năng: Smart Match + SOS 15 phút + Đấu thầu ngược nhóm học
-- Idempotent: chạy lại được, không xóa dữ liệu cũ.
-- Chạy trong SSMS (F5). Không cần sửa C#.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cột phụ trên bảng đã có
-- ---------------------------------------------------------------------
IF COL_LENGTH('dbo.TutorProfiles', 'IsSosReady') IS NULL
    ALTER TABLE dbo.TutorProfiles ADD IsSosReady BIT NOT NULL CONSTRAINT DF_TutorProfiles_IsSosReady DEFAULT (0);
IF COL_LENGTH('dbo.TutorProfiles', 'SosReadyAt') IS NULL
    ALTER TABLE dbo.TutorProfiles ADD SosReadyAt DATETIME NULL;
IF COL_LENGTH('dbo.TutorProfiles', 'LastSosHeartbeat') IS NULL
    ALTER TABLE dbo.TutorProfiles ADD LastSosHeartbeat DATETIME NULL;
GO

IF COL_LENGTH('dbo.StudyGroups', 'HiringMode') IS NULL
    ALTER TABLE dbo.StudyGroups ADD HiringMode NVARCHAR(20) NOT NULL CONSTRAINT DF_StudyGroups_HiringMode DEFAULT (N'Standard');
IF COL_LENGTH('dbo.StudyGroups', 'BudgetPerSession') IS NULL
    ALTER TABLE dbo.StudyGroups ADD BudgetPerSession DECIMAL(10, 0) NULL;
IF COL_LENGTH('dbo.StudyGroups', 'BidDeadline') IS NULL
    ALTER TABLE dbo.StudyGroups ADD BidDeadline DATETIME NULL;
GO

-- =====================================================================
-- 1) AI Smart Matchmaker & Chẩn đoán lỗ hổng kiến thức
-- =====================================================================

IF OBJECT_ID(N'dbo.KnowledgeTopics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KnowledgeTopics (
        TopicId          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SubjectId        INT NOT NULL,
        GradeLevel       NVARCHAR(50)  NULL,          -- THCS / THPT / Lớp 11
        TopicName        NVARCHAR(200) NOT NULL,      -- Hình học không gian - Khoảng cách
        TopicCode        NVARCHAR(80)  NULL,
        Description      NVARCHAR(500) NULL,
        IsActive         BIT NOT NULL CONSTRAINT DF_KnowledgeTopics_IsActive DEFAULT (1),
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_KnowledgeTopics_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_KnowledgeTopic_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId)
    );
    CREATE INDEX IX_KnowledgeTopics_Subject ON dbo.KnowledgeTopics (SubjectId, GradeLevel);
END
GO

IF OBJECT_ID(N'dbo.KnowledgeGapDiagnoses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KnowledgeGapDiagnoses (
        DiagnosisId      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId        INT NOT NULL,
        SubjectId        INT NULL,
        TopicId          INT NULL,
        ImageUrl         NVARCHAR(500) NOT NULL,      -- /uploads/diagnosis/{userId}/...
        OcrText          NVARCHAR(MAX) NULL,          -- chữ OCR (VNPT)
        AiSummary        NVARCHAR(1000) NULL,         -- "Hổng Hình học không gian - Khoảng cách lớp 11"
        GapDetail        NVARCHAR(MAX) NULL,          -- giải thích LLM
        GradeLevel       NVARCHAR(50)  NULL,
        Status           NVARCHAR(20)  NOT NULL CONSTRAINT DF_KGD_Status DEFAULT (N'Pending'), -- Pending / Done / Failed
        RawAiJson        NVARCHAR(MAX) NULL,
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_KGD_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_KGD_Student FOREIGN KEY (StudentId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_KGD_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId),
        CONSTRAINT FK_KGD_Topic   FOREIGN KEY (TopicId)   REFERENCES dbo.KnowledgeTopics(TopicId)
    );
    CREATE INDEX IX_KGD_Student ON dbo.KnowledgeGapDiagnoses (StudentId, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.TutorMatchSuggestions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TutorMatchSuggestions (
        SuggestionId     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DiagnosisId      INT NOT NULL,
        TutorId          INT NOT NULL,
        RankNo           TINYINT NOT NULL,            -- 1..3
        MatchScore       DECIMAL(5, 2) NOT NULL,      -- điểm test chuyên môn / độ khớp
        Reason           NVARCHAR(500) NULL,
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_TMS_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_TMS UNIQUE (DiagnosisId, TutorId),
        CONSTRAINT FK_TMS_Diagnosis FOREIGN KEY (DiagnosisId) REFERENCES dbo.KnowledgeGapDiagnoses(DiagnosisId),
        CONSTRAINT FK_TMS_Tutor     FOREIGN KEY (TutorId)     REFERENCES dbo.TutorProfiles(TutorId)
    );
END
GO

IF OBJECT_ID(N'dbo.NaturalSearchQueries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NaturalSearchQueries (
        QueryId          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId           INT NULL,
        PromptText       NVARCHAR(1000) NOT NULL,     -- câu gõ tự nhiên
        ParsedJson       NVARCHAR(MAX) NULL,          -- filter AI tách ra
        SubjectId        INT NULL,
        GradeLevel       NVARCHAR(50) NULL,
        Gender           NVARCHAR(10) NULL,
        TeachingMode     NVARCHAR(20) NULL,           -- Online / Offline / Both
        PreferredDays    NVARCHAR(50) NULL,           -- 2,4,6
        PreferredTime    NVARCHAR(50) NULL,           -- tối
        MinPrice         DECIMAL(10, 0) NULL,
        MaxPrice         DECIMAL(10, 0) NULL,
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_NSQ_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_NSQ_User    FOREIGN KEY (UserId)    REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_NSQ_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId)
    );
END
GO

-- =====================================================================
-- 2) SOS Cứu viện bài tập 15 phút
-- =====================================================================

IF OBJECT_ID(N'dbo.SosRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SosRequests (
        RequestId        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId        INT NOT NULL,
        SubjectId        INT NULL,
        TopicId          INT NULL,
        ImageUrl         NVARCHAR(500) NOT NULL,
        QuestionNote     NVARCHAR(500) NULL,
        FeeAmount        DECIMAL(10, 0) NOT NULL,     -- 20000 / 30000
        Status           NVARCHAR(20) NOT NULL CONSTRAINT DF_SosReq_Status DEFAULT (N'Open'),
        -- Open / Claimed / Expired / Cancelled / Completed
        ClaimedByTutorId INT NULL,
        ConversationId   INT NULL,
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_SosReq_CreatedAt DEFAULT (GETDATE()),
        ExpiresAt        DATETIME NULL,               -- hết hạn nếu không ai nhận
        ClaimedAt        DATETIME NULL,
        CONSTRAINT FK_SosReq_Student FOREIGN KEY (StudentId)        REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_SosReq_Subject FOREIGN KEY (SubjectId)        REFERENCES dbo.Subjects(SubjectId),
        CONSTRAINT FK_SosReq_Topic   FOREIGN KEY (TopicId)          REFERENCES dbo.KnowledgeTopics(TopicId),
        CONSTRAINT FK_SosReq_Tutor   FOREIGN KEY (ClaimedByTutorId) REFERENCES dbo.TutorProfiles(TutorId),
        CONSTRAINT FK_SosReq_Conv    FOREIGN KEY (ConversationId)   REFERENCES dbo.Conversations(ConversationId)
    );
    CREATE INDEX IX_SosRequests_Open ON dbo.SosRequests (Status, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SosSessions (
        SessionId        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RequestId        INT NOT NULL,
        StudentId        INT NOT NULL,
        TutorId          INT NOT NULL,
        ConversationId   INT NULL,
        StartedAt        DATETIME NOT NULL CONSTRAINT DF_SosSes_StartedAt DEFAULT (GETDATE()),
        EndsAt           DATETIME NOT NULL,           -- StartedAt + 15 phút
        EndedAt          DATETIME NULL,
        DurationMinutes  INT NOT NULL CONSTRAINT DF_SosSes_Duration DEFAULT (15),
        FeeAmount        DECIMAL(10, 0) NOT NULL,
        PayoutStatus     NVARCHAR(20) NOT NULL CONSTRAINT DF_SosSes_Payout DEFAULT (N'Held'),
        -- Held / PaidTutor / Refunded
        GatewayTransactionId NVARCHAR(100) NULL,
        CONSTRAINT UQ_SosSes_Request UNIQUE (RequestId),
        CONSTRAINT FK_SosSes_Request FOREIGN KEY (RequestId)      REFERENCES dbo.SosRequests(RequestId),
        CONSTRAINT FK_SosSes_Student FOREIGN KEY (StudentId)      REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_SosSes_Tutor   FOREIGN KEY (TutorId)        REFERENCES dbo.TutorProfiles(TutorId),
        CONSTRAINT FK_SosSes_Conv    FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId)
    );
END
GO

-- =====================================================================
-- 3) Nhóm học đấu thầu ngược
-- =====================================================================

IF OBJECT_ID(N'dbo.StudyGroupBids', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudyGroupBids (
        BidId            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        GroupId          INT NOT NULL,
        TutorId          INT NOT NULL,
        ProposedPrice    DECIMAL(10, 0) NOT NULL,     -- giá đề nghị / buổi cho cả nhóm
        CurriculumNote   NVARCHAR(1000) NULL,         -- giáo trình
        CertificateNote  NVARCHAR(500) NULL,
        Status           NVARCHAR(20) NOT NULL CONSTRAINT DF_SGB_Status DEFAULT (N'Pending'),
        -- Pending / Withdrawn / Won / Lost
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_SGB_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_StudyGroupBid UNIQUE (GroupId, TutorId),
        CONSTRAINT FK_SGB_Group FOREIGN KEY (GroupId) REFERENCES dbo.StudyGroups(GroupId),
        CONSTRAINT FK_SGB_Tutor FOREIGN KEY (TutorId) REFERENCES dbo.TutorProfiles(TutorId)
    );
    CREATE INDEX IX_StudyGroupBids_Group ON dbo.StudyGroupBids (GroupId, Status);
END
GO

IF OBJECT_ID(N'dbo.StudyGroupBidVotes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudyGroupBidVotes (
        VoteId           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BidId            INT NOT NULL,
        VoterUserId      INT NOT NULL,
        CreatedAt        DATETIME NOT NULL CONSTRAINT DF_SGBV_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_StudyGroupBidVote UNIQUE (BidId, VoterUserId),
        CONSTRAINT FK_SGBV_Bid   FOREIGN KEY (BidId)       REFERENCES dbo.StudyGroupBids(BidId),
        CONSTRAINT FK_SGBV_Voter FOREIGN KEY (VoterUserId) REFERENCES dbo.Users(UserId)
    );
END
GO

-- Mỗi thành viên nhóm chỉ vote 1 lần / 1 nhóm (không vote nhiều bid cùng lúc)
IF OBJECT_ID(N'dbo.TR_StudyGroupBidVotes_OnePerGroup', N'TR') IS NULL
EXEC(N'
CREATE TRIGGER dbo.TR_StudyGroupBidVotes_OnePerGroup
ON dbo.StudyGroupBidVotes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.StudyGroupBids b ON b.BidId = i.BidId
        JOIN dbo.StudyGroupBids other ON other.GroupId = b.GroupId AND other.BidId <> b.BidId
        JOIN dbo.StudyGroupBidVotes v ON v.BidId = other.BidId AND v.VoterUserId = i.VoterUserId
    )
    BEGIN
        RAISERROR(N''Mỗi thành viên chỉ được vote 1 gia sư trong nhóm.'', 16, 1);
        ROLLBACK TRANSACTION;
    END
END
');
GO

-- =====================================================================
-- Seed chuyên đề mẫu (để demo match) — chỉ chèn nếu chưa có
-- =====================================================================
DECLARE @Toan INT = (SELECT TOP 1 SubjectId FROM dbo.Subjects WHERE SubjectName IN (N'Toan', N'Toán') AND IsActive = 1);
DECLARE @Ly   INT = (SELECT TOP 1 SubjectId FROM dbo.Subjects WHERE SubjectName IN (N'Vat Ly', N'Vật Lý') AND IsActive = 1);
DECLARE @Anh  INT = (SELECT TOP 1 SubjectId FROM dbo.Subjects WHERE SubjectName IN (N'Tieng Anh', N'Tiếng Anh') AND IsActive = 1);
DECLARE @Hoa  INT = (SELECT TOP 1 SubjectId FROM dbo.Subjects WHERE SubjectName IN (N'Hoa Hoc', N'Hóa Học') AND IsActive = 1);

IF @Toan IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.KnowledgeTopics WHERE SubjectId = @Toan AND TopicName = N'Hình học không gian - Khoảng cách')
        INSERT INTO dbo.KnowledgeTopics (SubjectId, GradeLevel, TopicName, TopicCode) VALUES
        (@Toan, N'THPT', N'Hình học không gian - Khoảng cách', N'TOAN-KG-KC'),
        (@Toan, N'THPT', N'Đạo hàm và ứng dụng', N'TOAN-DH'),
        (@Toan, N'THPT', N'Hàm số mũ - logarit', N'TOAN-LOG'),
        (@Toan, N'THCS', N'Phương trình bậc nhất một ẩn', N'TOAN-PTB1'),
        (@Toan, N'THCS', N'Định lý Pythagoras', N'TOAN-PYT');
END

IF @Ly IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.KnowledgeTopics WHERE SubjectId = @Ly AND TopicName = N'Dao động cơ')
    INSERT INTO dbo.KnowledgeTopics (SubjectId, GradeLevel, TopicName, TopicCode) VALUES
    (@Ly, N'THPT', N'Dao động cơ', N'LY-DDC'),
    (@Ly, N'THPT', N'Dòng điện xoay chiều', N'LY-XD'),
    (@Ly, N'THPT', N'Quang hình', N'LY-QH');

IF @Anh IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.KnowledgeTopics WHERE SubjectId = @Anh AND TopicName = N'IELTS Writing Task 2')
    INSERT INTO dbo.KnowledgeTopics (SubjectId, GradeLevel, TopicName, TopicCode) VALUES
    (@Anh, N'THPT', N'IELTS Writing Task 2', N'ANH-W2'),
    (@Anh, N'THCS', N'Thì hiện tại hoàn thành', N'ANH-PPT');

IF @Hoa IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.KnowledgeTopics WHERE SubjectId = @Hoa AND TopicName = N'Este - Lipit')
    INSERT INTO dbo.KnowledgeTopics (SubjectId, GradeLevel, TopicName, TopicCode) VALUES
    (@Hoa, N'THPT', N'Este - Lipit', N'HOA-ESTE'),
    (@Hoa, N'THPT', N'Cân bằng hóa học', N'HOA-CB');
GO

-- Cài đặt phí SOS mặc định
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosFeeAmount')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
    VALUES (N'SosFeeAmount', N'25000', N'Phí SOS cứu viện 15 phút (VNĐ)', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosDurationMinutes')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
    VALUES (N'SosDurationMinutes', N'15', N'Thời lượng phiên SOS (phút)', GETDATE());
GO

-- Kiểm tra
SELECT 'KnowledgeTopics' AS Bang, COUNT(*) AS SoDong FROM dbo.KnowledgeTopics
UNION ALL SELECT 'KnowledgeGapDiagnoses', COUNT(*) FROM dbo.KnowledgeGapDiagnoses
UNION ALL SELECT 'TutorMatchSuggestions', COUNT(*) FROM dbo.TutorMatchSuggestions
UNION ALL SELECT 'NaturalSearchQueries', COUNT(*) FROM dbo.NaturalSearchQueries
UNION ALL SELECT 'SosRequests', COUNT(*) FROM dbo.SosRequests
UNION ALL SELECT 'SosSessions', COUNT(*) FROM dbo.SosSessions
UNION ALL SELECT 'StudyGroupBids', COUNT(*) FROM dbo.StudyGroupBids
UNION ALL SELECT 'StudyGroupBidVotes', COUNT(*) FROM dbo.StudyGroupBidVotes;
GO
