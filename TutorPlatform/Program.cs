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

builder.Services.AddDbContext<TutorPlatformDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174")
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

var payOsSection = builder.Configuration.GetSection("PayOS");
builder.Services.AddSingleton(new PayOS.PayOSClient(
    payOsSection["ClientId"] ?? "",
    payOsSection["ApiKey"] ?? "",
    payOsSection["ChecksumKey"] ?? ""
));

builder.Services.AddHostedService<LessonReminderService>();
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10_000_000;
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TutorPlatformDbContext>();
    await db.Database.ExecuteSqlRawAsync(@"
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = N'Pending')
    INSERT INTO Roles (RoleName) VALUES (N'Pending');

IF COL_LENGTH('Users','EmailConfirmExpiry') IS NULL
    ALTER TABLE Users ADD EmailConfirmExpiry DATETIME NULL;

IF COL_LENGTH('StudyGroupMembers','JoinMessage') IS NULL
    ALTER TABLE StudyGroupMembers ADD JoinMessage NVARCHAR(500) NULL;

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

-- ==== Tutor subject knowledge test: Level + Subject + Grade (Lớp) support ====
-- Backward-compatible: only adds NULLABLE columns; never drops/modifies existing data.
IF OBJECT_ID(N'dbo.Questions', N'U') IS NOT NULL AND COL_LENGTH('Questions','GradeLevel') IS NULL
    ALTER TABLE Questions ADD GradeLevel NVARCHAR(50) NULL;
IF OBJECT_ID(N'dbo.Question', N'U') IS NOT NULL AND COL_LENGTH('Question','GradeLevel') IS NULL
    ALTER TABLE Question ADD GradeLevel NVARCHAR(50) NULL;

IF OBJECT_ID(N'dbo.TutorTestAttempts', N'U') IS NOT NULL AND COL_LENGTH('TutorTestAttempts','GradeLevel') IS NULL
    ALTER TABLE TutorTestAttempts ADD GradeLevel NVARCHAR(50) NULL;
IF OBJECT_ID(N'dbo.TutorTestAttempt', N'U') IS NOT NULL AND COL_LENGTH('TutorTestAttempt','GradeLevel') IS NULL
    ALTER TABLE TutorTestAttempt ADD GradeLevel NVARCHAR(50) NULL;

IF OBJECT_ID(N'dbo.TutorSubjects', N'U') IS NOT NULL AND COL_LENGTH('TutorSubjects','GradeLevel') IS NULL
    ALTER TABLE TutorSubjects ADD GradeLevel NVARCHAR(50) NULL;
IF OBJECT_ID(N'dbo.TutorSubject', N'U') IS NOT NULL AND COL_LENGTH('TutorSubject','GradeLevel') IS NULL
    ALTER TABLE TutorSubject ADD GradeLevel NVARCHAR(50) NULL;

-- One tutor may register the same subject for several grades, so the old
-- (TutorId, SubjectId) unique index is replaced by grade-aware unique indexes.
IF OBJECT_ID(N'dbo.TutorSubjects', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_TutorSubject' AND parent_object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        ALTER TABLE TutorSubjects DROP CONSTRAINT UQ_TutorSubject;
    ELSE IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        DROP INDEX UQ_TutorSubject ON TutorSubjects;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject_Combo' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        EXEC(N'CREATE UNIQUE INDEX UQ_TutorSubject_Combo ON TutorSubjects (TutorId, SubjectId, GradeLevel) WHERE GradeLevel IS NOT NULL;');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_TutorSubject_NoGrade' AND object_id = OBJECT_ID(N'dbo.TutorSubjects'))
        EXEC(N'CREATE UNIQUE INDEX UQ_TutorSubject_NoGrade ON TutorSubjects (TutorId, SubjectId) WHERE GradeLevel IS NULL;');
END
");
}

if (args.Contains("--seed-demo"))
{
    await DemoTutorSeeder.SeedAsync(app.Services);
    return;
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