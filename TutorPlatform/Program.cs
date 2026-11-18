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
        EXEC(N'ALTER TABLE dbo.Payments ADD GatewayResponseCode NVARCHAR(50) NULL');
    IF COL_LENGTH('dbo.Payments','CallbackReceivedAt') IS NULL
        EXEC(N'ALTER TABLE dbo.Payments ADD CallbackReceivedAt DATETIME NULL');
END
""");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Bo qua SQL khoi tao schema (cot/bang da co).");
    }
}

if (args.Contains("--seed-demo"))
{
    await DemoTutorSeeder.SeedAsync(app.Services);
    return;
}

if (app.Environment.IsDevelopment())
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();
        if (!await db.TutorProfiles.AnyAsync())
        {
            await DemoTutorSeeder.SeedAsync(app.Services);
        }
        await KnowledgeTopicSeeder.SeedTopicsAsync(db);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Không thể tự động nạp gia sư demo lúc khởi động.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

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
app.Run();