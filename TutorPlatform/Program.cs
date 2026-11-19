using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using TutorPlatform.API.Services;
using TutorPlatform.Datas;
using TutorPlatform.Helpers;
using TutorPlatform.Hubs;
using TutorPlatform.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddDbContext<TutorPlatformDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.SetIsOriginAllowed(origin => !string.IsNullOrEmpty(origin) && (new Uri(origin).Host is "localhost" or "127.0.0.1"))








              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
        // SignalR cần credentials; origin React phải khớp chính xác.
    });
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var p = context.Request.Path.Value ?? "";
                if (p.StartsWith("/api/Auth", StringComparison.OrdinalIgnoreCase) &&
                    !p.Contains("/me", StringComparison.OrdinalIgnoreCase) &&
                    !p.Contains("/profile", StringComparison.OrdinalIgnoreCase) &&
                    !p.Contains("change-password", StringComparison.OrdinalIgnoreCase))
                    context.NoResult();
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddSingleton<IUserIdProvider, NameUserIdProvider>();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<JwtHelper>();
builder.Services.AddScoped<TutorSearchService>();
builder.Services.AddScoped<SubjectSearchService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ReviewService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<StudyGroupService>();
builder.Services.AddScoped<GroupChatService>();
builder.Services.AddScoped<TutorWorkspaceService>();
builder.Services.AddScoped<TutorTestService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<SosService>();
builder.Services.AddScoped<AiGeminiService>();
builder.Services.AddScoped<IdentityVerificationService>();
builder.Services.AddHostedService<IdentityImagePurgeService>();
builder.Services.AddScoped<AiMatchmakerService>();

var payOsSection = builder.Configuration.GetSection("PayOS");
builder.Services.AddSingleton(new PayOS.PayOSClient(
    payOsSection["ClientId"] ?? "",
    payOsSection["ApiKey"] ?? "",
    payOsSection["ChecksumKey"] ?? ""
));

builder.Services.AddHostedService<LessonReminderService>();
builder.Services.AddHostedService<SosSessionExpiryService>();
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10_000_000;
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type => (type.FullName ?? type.Name).Replace("+", "."));
    options.MapType<IFormFile>(() => new Microsoft.OpenApi.Models.OpenApiSchema
    {
        Type = "string",
        Format = "binary"
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();
    try
    {
        await db.Database.ExecuteSqlRawAsync("""
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = N'Pending')
    INSERT INTO Roles (RoleName) VALUES (N'Pending');

IF COL_LENGTH('Users','EmailConfirmExpiry') IS NULL
    EXEC(N'ALTER TABLE Users ADD EmailConfirmExpiry DATETIME NULL');

IF COL_LENGTH('StudyGroupMembers','JoinMessage') IS NULL
    EXEC(N'ALTER TABLE StudyGroupMembers ADD JoinMessage NVARCHAR(500) NULL');

IF OBJECT_ID(N'dbo.StudyGroupMessages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudyGroupMessages (
        MessageId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        GroupId INT NOT NULL,
        SenderId INT NOT NULL,
        Content NVARCHAR(2000) NOT NULL,
        SentAt DATETIME NOT NULL,
        CONSTRAINT FK_StudyGroupMessages_Group FOREIGN KEY (GroupId) REFERENCES dbo.StudyGroups(GroupId),
        CONSTRAINT FK_StudyGroupMessages_Sender FOREIGN KEY (SenderId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_StudyGroupMessages_Group_SentAt ON dbo.StudyGroupMessages(GroupId, SentAt);
END

IF OBJECT_ID(N'dbo.Questions', N'U') IS NOT NULL AND COL_LENGTH('Questions','GradeLevel') IS NULL
    EXEC(N'ALTER TABLE Questions ADD GradeLevel NVARCHAR(50) NULL');
IF OBJECT_ID(N'dbo.TutorTestAttempts', N'U') IS NOT NULL AND COL_LENGTH('TutorTestAttempts','GradeLevel') IS NULL
    EXEC(N'ALTER TABLE TutorTestAttempts ADD GradeLevel NVARCHAR(50) NULL');
IF OBJECT_ID(N'dbo.TutorSubjects', N'U') IS NOT NULL AND COL_LENGTH('TutorSubjects','GradeLevel') IS NULL
    EXEC(N'ALTER TABLE TutorSubjects ADD GradeLevel NVARCHAR(50) NULL');

IF OBJECT_ID(N'dbo.StudyGroupMessages', N'U') IS NOT NULL AND COL_LENGTH('StudyGroupMessages','AttachmentUrl') IS NULL
    EXEC(N'ALTER TABLE StudyGroupMessages ADD AttachmentUrl NVARCHAR(500) NULL');
IF OBJECT_ID(N'dbo.StudyGroupMessages', N'U') IS NOT NULL AND COL_LENGTH('StudyGroupMessages','AttachmentType') IS NULL
    EXEC(N'ALTER TABLE StudyGroupMessages ADD AttachmentType NVARCHAR(50) NULL');

IF OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL AND COL_LENGTH('TutorProfiles','SubjectsLocked') IS NULL
    EXEC(N'ALTER TABLE TutorProfiles ADD SubjectsLocked BIT NOT NULL CONSTRAINT DF_TutorProfiles_SubjectsLocked DEFAULT (0)');

IF OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL AND COL_LENGTH('Bookings','TutorCompleted') IS NULL
    EXEC(N'ALTER TABLE Bookings ADD TutorCompleted BIT NOT NULL CONSTRAINT DF_Bookings_TutorCompleted DEFAULT (0)');
IF OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL AND COL_LENGTH('Bookings','StudentCompleted') IS NULL
    EXEC(N'ALTER TABLE Bookings ADD StudentCompleted BIT NOT NULL CONSTRAINT DF_Bookings_StudentCompleted DEFAULT (0)');

IF OBJECT_ID(N'dbo.LessonReports', N'U') IS NULL AND OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.LessonReports (
        LessonReportId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BookingId INT NOT NULL,
        TutorId INT NOT NULL,
        Content NVARCHAR(2000) NOT NULL,
        Homework NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL,
        UpdatedAt DATETIME NULL,
        CONSTRAINT FK_LessonReports_Booking FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId),
        CONSTRAINT UQ_LessonReports_Booking UNIQUE (BookingId)
    );
END

IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NOT NULL AND COL_LENGTH('SosSessions','BookingId') IS NULL
    EXEC(N'ALTER TABLE SosSessions ADD BookingId INT NULL');

IF OBJECT_ID(N'dbo.PlatformSettings', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosFeeAmount')
        INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
        VALUES (N'SosFeeAmount', N'25000', N'Phí SOS cứu viện 15 phút (VNĐ)', GETDATE());
    IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosDurationMinutes')
        INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
        VALUES (N'SosDurationMinutes', N'15', N'Thời lượng phiên SOS (phút)', GETDATE());
END

IF OBJECT_ID(N'dbo.TutorSubjects', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_TutorSubject' AND parent_object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        ALTER TABLE TutorSubjects DROP CONSTRAINT UQ_TutorSubject;
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        DROP INDEX UQ_TutorSubject ON TutorSubjects;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject_Combo' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        EXEC(N'CREATE UNIQUE INDEX UQ_TutorSubject_Combo ON TutorSubjects (TutorId, SubjectId, GradeLevel) WHERE GradeLevel IS NOT NULL;');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject_NoGrade' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        EXEC(N'CREATE UNIQUE INDEX UQ_TutorSubject_NoGrade ON TutorSubjects (TutorId, SubjectId) WHERE GradeLevel IS NULL;');
END

IF OBJECT_ID(N'dbo.UserBankAccounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserBankAccounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        BankCode NVARCHAR(50) NOT NULL,
        BankName NVARCHAR(255) NOT NULL,
        AccountNumber NVARCHAR(50) NOT NULL,
        AccountHolderName NVARCHAR(255) NOT NULL,
        QrCodeUrl NVARCHAR(500) NULL,
        IsDefault BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CONSTRAINT FK_UserBankAccounts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );
    CREATE UNIQUE INDEX IX_UserBankAccounts_User ON dbo.UserBankAccounts(UserId);
END

IF OBJECT_ID(N'dbo.Payments', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Payments','PaymentUrl') IS NULL
        EXEC(N'ALTER TABLE dbo.Payments ADD PaymentUrl NVARCHAR(1000) NULL');
    IF COL_LENGTH('dbo.Payments','GatewayTransactionId') IS NULL
        EXEC(N'ALTER TABLE dbo.Payments ADD GatewayTransactionId NVARCHAR(100) NULL');
    IF COL_LENGTH('dbo.Payments','GatewayResponseCode') IS NULL
        EXEC(N'ALTER TABLE dbo.Payments ADD GatewayResponseCode NVARCHAR(1000) NULL');
    IF COL_LENGTH('dbo.Payments','CallbackReceivedAt') IS NULL
        EXEC(N'ALTER TABLE dbo.Payments ADD CallbackReceivedAt DATETIME NULL');
    IF COL_LENGTH('dbo.Payments','GatewayResponseCode') IS NOT NULL
       AND (SELECT max_length FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Payments') AND name = N'GatewayResponseCode') < 2000
        ALTER TABLE dbo.Payments ALTER COLUMN GatewayResponseCode NVARCHAR(1000) NULL;
    IF COL_LENGTH('dbo.Payments','GatewayTransactionId') IS NOT NULL
       AND (SELECT max_length FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Payments') AND name = N'GatewayTransactionId') < 400
        ALTER TABLE dbo.Payments ALTER COLUMN GatewayTransactionId NVARCHAR(200) NULL;
END
""");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Bo qua SQL khoi tao schema (cot/bang da co).");
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync("""
IF OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL AND COL_LENGTH('TutorProfiles','IsSosReady') IS NULL
    EXEC(N'ALTER TABLE TutorProfiles ADD IsSosReady BIT NOT NULL CONSTRAINT DF_TutorProfiles_IsSosReady DEFAULT (0)');
IF OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL AND COL_LENGTH('TutorProfiles','SosReadyAt') IS NULL
    EXEC(N'ALTER TABLE TutorProfiles ADD SosReadyAt DATETIME NULL');
IF OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL AND COL_LENGTH('TutorProfiles','LastSosHeartbeat') IS NULL
    EXEC(N'ALTER TABLE TutorProfiles ADD LastSosHeartbeat DATETIME NULL');
IF OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL AND COL_LENGTH('TutorProfiles','SubjectsLocked') IS NULL
    EXEC(N'ALTER TABLE TutorProfiles ADD SubjectsLocked BIT NOT NULL CONSTRAINT DF_TutorProfiles_SubjectsLocked2 DEFAULT (0)');

IF OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL AND COL_LENGTH('Bookings','TutorCompleted') IS NULL
    EXEC(N'ALTER TABLE Bookings ADD TutorCompleted BIT NOT NULL CONSTRAINT DF_Bookings_TutorCompleted2 DEFAULT (0)');
IF OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL AND COL_LENGTH('Bookings','StudentCompleted') IS NULL
    EXEC(N'ALTER TABLE Bookings ADD StudentCompleted BIT NOT NULL CONSTRAINT DF_Bookings_StudentCompleted2 DEFAULT (0)');

IF OBJECT_ID(N'dbo.LessonReports', N'U') IS NULL AND OBJECT_ID(N'dbo.Bookings', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.LessonReports (
        LessonReportId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BookingId INT NOT NULL,
        TutorId INT NOT NULL,
        Content NVARCHAR(2000) NOT NULL,
        Homework NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL,
        UpdatedAt DATETIME NULL,
        CONSTRAINT FK_LessonReports_Booking2 FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId),
        CONSTRAINT UQ_LessonReports_Booking2 UNIQUE (BookingId)
    );
END

IF OBJECT_ID(N'dbo.KnowledgeTopics', N'U') IS NULL AND OBJECT_ID(N'dbo.Subjects', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.KnowledgeTopics (
        TopicId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SubjectId INT NOT NULL,
        GradeLevel NVARCHAR(50) NULL,
        TopicName NVARCHAR(200) NOT NULL,
        TopicCode NVARCHAR(80) NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_KnowledgeTopics_IsActive DEFAULT (1),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_KnowledgeTopics_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_KnowledgeTopic_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId)
    );
END

IF OBJECT_ID(N'dbo.KnowledgeGapDiagnoses', N'U') IS NULL AND OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.KnowledgeGapDiagnoses (
        DiagnosisId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        SubjectId INT NULL,
        TopicId INT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        OcrText NVARCHAR(MAX) NULL,
        AiSummary NVARCHAR(1000) NULL,
        GapDetail NVARCHAR(MAX) NULL,
        GradeLevel NVARCHAR(50) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_KGD_Status DEFAULT (N'Pending'),
        RawAiJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_KGD_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_KGD_Student FOREIGN KEY (StudentId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_KGD_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId),
        CONSTRAINT FK_KGD_Topic FOREIGN KEY (TopicId) REFERENCES dbo.KnowledgeTopics(TopicId)
    );
END

IF OBJECT_ID(N'dbo.TutorMatchSuggestions', N'U') IS NULL
    AND OBJECT_ID(N'dbo.KnowledgeGapDiagnoses', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.TutorMatchSuggestions (
        SuggestionId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DiagnosisId INT NOT NULL,
        TutorId INT NOT NULL,
        RankNo TINYINT NOT NULL,
        MatchScore DECIMAL(5, 2) NOT NULL,
        Reason NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_TMS_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_TMS UNIQUE (DiagnosisId, TutorId),
        CONSTRAINT FK_TMS_Diagnosis FOREIGN KEY (DiagnosisId) REFERENCES dbo.KnowledgeGapDiagnoses(DiagnosisId),
        CONSTRAINT FK_TMS_Tutor FOREIGN KEY (TutorId) REFERENCES dbo.TutorProfiles(TutorId)
    );
END

IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NOT NULL AND COL_LENGTH('StudyGroups','HiringMode') IS NULL
    EXEC(N'ALTER TABLE StudyGroups ADD HiringMode NVARCHAR(20) NOT NULL CONSTRAINT DF_StudyGroups_HiringMode2 DEFAULT (N''Standard'')');
IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NOT NULL AND COL_LENGTH('StudyGroups','BudgetPerSession') IS NULL
    EXEC(N'ALTER TABLE StudyGroups ADD BudgetPerSession DECIMAL(10, 0) NULL');
IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NOT NULL AND COL_LENGTH('StudyGroups','BidDeadline') IS NULL
    EXEC(N'ALTER TABLE StudyGroups ADD BidDeadline DATETIME NULL');
IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NOT NULL AND COL_LENGTH('StudyGroups','TutorRequirements') IS NULL
    EXEC(N'ALTER TABLE StudyGroups ADD TutorRequirements NVARCHAR(1000) NULL');
IF OBJECT_ID(N'dbo.StudyGroupMembers', N'U') IS NOT NULL AND COL_LENGTH('StudyGroupMembers','JoinMessage') IS NULL
    EXEC(N'ALTER TABLE StudyGroupMembers ADD JoinMessage NVARCHAR(500) NULL');

IF OBJECT_ID(N'dbo.StudyGroupBids', N'U') IS NULL AND OBJECT_ID(N'dbo.StudyGroups', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.TutorProfiles', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.StudyGroupBids (
        BidId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        GroupId INT NOT NULL,
        TutorId INT NOT NULL,
        ProposedPrice DECIMAL(10, 0) NOT NULL,
        CurriculumNote NVARCHAR(1000) NULL,
        CertificateNote NVARCHAR(500) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_SGB_Status DEFAULT (N'Pending'),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_SGB_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_StudyGroupBid UNIQUE (GroupId, TutorId),
        CONSTRAINT FK_SGB_Group FOREIGN KEY (GroupId) REFERENCES dbo.StudyGroups(GroupId),
        CONSTRAINT FK_SGB_Tutor FOREIGN KEY (TutorId) REFERENCES dbo.TutorProfiles(TutorId)
    );
END

IF OBJECT_ID(N'dbo.StudyGroupBidVotes', N'U') IS NULL AND OBJECT_ID(N'dbo.StudyGroupBids', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.StudyGroupBidVotes (
        VoteId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BidId INT NOT NULL,
        VoterUserId INT NOT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_SGBV_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_StudyGroupBidVote UNIQUE (BidId, VoterUserId),
        CONSTRAINT FK_SGBV_Bid FOREIGN KEY (BidId) REFERENCES dbo.StudyGroupBids(BidId),
        CONSTRAINT FK_SGBV_Voter FOREIGN KEY (VoterUserId) REFERENCES dbo.Users(UserId)
    );
END

IF OBJECT_ID(N'dbo.Subjects', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE SubjectName = N'Toán')
        UPDATE dbo.Subjects SET SubjectName = N'Toán' WHERE SubjectName = N'Toan';
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE SubjectName = N'Tiếng Anh')
        UPDATE dbo.Subjects SET SubjectName = N'Tiếng Anh' WHERE SubjectName = N'Tieng Anh';
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE SubjectName = N'Vật Lý')
        UPDATE dbo.Subjects SET SubjectName = N'Vật Lý' WHERE SubjectName = N'Vat Ly';
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE SubjectName = N'Hóa Học')
        UPDATE dbo.Subjects SET SubjectName = N'Hóa Học' WHERE SubjectName = N'Hoa Hoc';
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE SubjectName = N'Sinh Học')
        UPDATE dbo.Subjects SET SubjectName = N'Sinh Học' WHERE SubjectName = N'Sinh Hoc';
    UPDATE dbo.Subjects SET SubjectName = N'Ngữ Văn' WHERE SubjectName = N'Van';
END

IF OBJECT_ID(N'dbo.Conversations', N'U') IS NOT NULL AND COL_LENGTH('Conversations','GroupId') IS NULL
    EXEC(N'ALTER TABLE Conversations ADD GroupId INT NULL');

IF OBJECT_ID(N'dbo.SosRequests', N'U') IS NULL AND OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.SosRequests (
        RequestId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        SubjectId INT NOT NULL,
        TopicId INT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        QuestionNote NVARCHAR(1000) NULL,
        FeeAmount DECIMAL(10, 0) NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_SosReq_Status2 DEFAULT (N'Open'),
        ClaimedByTutorId INT NULL,
        ConversationId INT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_SosReq_CreatedAt2 DEFAULT (GETDATE()),
        ExpiresAt DATETIME NOT NULL,
        ClaimedAt DATETIME NULL,
        CONSTRAINT FK_SosReq_Student2 FOREIGN KEY (StudentId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_SosReq_Subject2 FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId),
        CONSTRAINT FK_SosReq_Tutor2 FOREIGN KEY (ClaimedByTutorId) REFERENCES dbo.TutorProfiles(TutorId),
        CONSTRAINT FK_SosReq_Conv2 FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId)
    );
END

IF OBJECT_ID(N'dbo.SosRequests', N'U') IS NOT NULL AND COL_LENGTH('SosRequests','TopicId') IS NULL
    EXEC(N'ALTER TABLE SosRequests ADD TopicId INT NULL');
IF OBJECT_ID(N'dbo.SosRequests', N'U') IS NOT NULL AND COL_LENGTH('SosRequests','ExpiresAt') IS NULL
    EXEC(N'ALTER TABLE SosRequests ADD ExpiresAt DATETIME NULL');

IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NULL AND OBJECT_ID(N'dbo.SosRequests', N'U') IS NOT NULL
BEGIN
    CREATE TABLE dbo.SosSessions (
        SessionId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RequestId INT NOT NULL,
        StudentId INT NOT NULL,
        TutorId INT NOT NULL,
        ConversationId INT NULL,
        VideoRoomId NVARCHAR(200) NULL,
        StartedAt DATETIME NOT NULL,
        EndsAt DATETIME NOT NULL,
        EndedAt DATETIME NULL,
        DurationMinutes INT NOT NULL CONSTRAINT DF_SosSes_Duration2 DEFAULT (15),
        FeeAmount DECIMAL(10, 0) NOT NULL,
        PayoutStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_SosSes_Payout2 DEFAULT (N'Held'),
        BookingId INT NULL,
        GatewayTransactionId NVARCHAR(100) NULL,
        CONSTRAINT UQ_SosSes_Request2 UNIQUE (RequestId),
        CONSTRAINT FK_SosSes_Request2 FOREIGN KEY (RequestId) REFERENCES dbo.SosRequests(RequestId),
        CONSTRAINT FK_SosSes_Student2 FOREIGN KEY (StudentId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_SosSes_Tutor2 FOREIGN KEY (TutorId) REFERENCES dbo.TutorProfiles(TutorId),
        CONSTRAINT FK_SosSes_Conv2 FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId)
    );
END

IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NOT NULL AND COL_LENGTH('SosSessions','VideoRoomId') IS NULL
    EXEC(N'ALTER TABLE SosSessions ADD VideoRoomId NVARCHAR(200) NULL');
IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NOT NULL AND COL_LENGTH('SosSessions','BookingId') IS NULL
    EXEC(N'ALTER TABLE SosSessions ADD BookingId INT NULL');

IF OBJECT_ID(N'dbo.PlatformSettings', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosFeeAmount')
        INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
        VALUES (N'SosFeeAmount', N'25000', N'Phí SOS cứu viện 15 phút (VNĐ)', GETDATE());
    IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = N'SosDurationMinutes')
        INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description, UpdatedAt)
        VALUES (N'SosDurationMinutes', N'15', N'Thời lượng phiên SOS (phút)', GETDATE());
END

IF OBJECT_ID(N'dbo.Reviews', N'U') IS NOT NULL
BEGIN
    DECLARE @dropReview nvarchar(max) = N'';
    SELECT @dropReview = @dropReview + N'ALTER TABLE dbo.Reviews DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE kc.parent_object_id = OBJECT_ID(N'dbo.Reviews')
      AND kc.[type] = 'UQ'
      AND c.name = N'BookingId';
    IF @dropReview <> N'' EXEC sp_executesql @dropReview;

    IF COL_LENGTH('dbo.Reviews','SosSessionId') IS NULL
        ALTER TABLE dbo.Reviews ADD SosSessionId INT NULL;
    IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.Reviews') AND name = N'BookingId' AND is_nullable = 0)
        ALTER TABLE dbo.Reviews ALTER COLUMN BookingId INT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Reviews_Booking' AND object_id = OBJECT_ID(N'dbo.Reviews'))
        EXEC(N'CREATE UNIQUE INDEX UQ_Reviews_Booking ON dbo.Reviews(BookingId) WHERE BookingId IS NOT NULL');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Reviews_SosSession' AND object_id = OBJECT_ID(N'dbo.Reviews'))
        EXEC(N'CREATE UNIQUE INDEX UQ_Reviews_SosSession ON dbo.Reviews(SosSessionId) WHERE SosSessionId IS NOT NULL');
    IF OBJECT_ID(N'dbo.SosSessions', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Review_SosSession')
        ALTER TABLE dbo.Reviews ADD CONSTRAINT FK_Review_SosSession
            FOREIGN KEY (SosSessionId) REFERENCES dbo.SosSessions(SessionId);
END
""");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Bo qua SQL bang chan doan va danh gia buoi hoc.");
    }
}

if (args.Contains("--seed-demo"))
{
    await DemoTutorSeeder.SeedAsync(app.Services);
    return;
}

try
{
    await DemoTutorSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Bo qua seed gia su Viet Nam.");
}

if (app.Environment.IsDevelopment())
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();
        await KnowledgeTopicSeeder.SeedTopicsAsync(db);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Không thể tự động nạp gia sư demo lúc khởi động.");
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowReactApp");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<AppHub>("/hubs/app");
var indexPath = Path.Combine(app.Environment.WebRootPath ?? "", "index.html");
if (File.Exists(indexPath))
{
    app.MapFallback(async context =>
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/hubs", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(indexPath);
    });
}
app.Run();