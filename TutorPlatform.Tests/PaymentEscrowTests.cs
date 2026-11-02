using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Tests;

public class PaymentEscrowTests
{
    private static TutorPlatformDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<TutorPlatformDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        var db = new TutorPlatformDbContext(options);

        // Seed base entities
        var tutorUser = new User
        {
            UserId = 2,
            FullName = "Trần Gia Sư",
            Email = "tutor@test.com",
            PasswordHash = "hash",
            RoleId = 2,
            Status = "Active"
        };
        var tutorProfile = new TutorProfile
        {
            TutorId = 2,
            Tutor = tutorUser,
            IsPublished = true,
            VerificationStatus = "Verified",
            TeachingMode = "Online"
        };
        var subject = new Subject
        {
            SubjectId = 1,
            SubjectName = "Toán",
            EducationLevel = "THPT",
            IsActive = true
        };

        db.Users.Add(tutorUser);
        db.TutorProfiles.Add(tutorProfile);
        db.Subjects.Add(subject);
        db.SaveChanges();

        return db;
    }

    [Fact]
    public async Task CreatePaymentIntent_WhenBookingNotFound_ShouldReturn404()
    {
        using var db = CreateInMemoryDb("Db_Pay_404");
        var service = new PaymentService(db, null!, null!, null!, null!, null!);

        var result = await service.CreatePaymentIntentAsync(1, new CreatePaymentIntentRequest
        {
            BookingId = 999
        });

        Assert.False(result.Success);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task CreatePaymentIntent_WhenNotStudent_ShouldReturn403()
    {
        using var db = CreateInMemoryDb("Db_Pay_403");
        db.Bookings.Add(new Booking
        {
            BookingId = 1,
            StudentId = 99, // Khác student 1
            TutorId = 2,
            SubjectId = 1,
            Price = 200000,
            Status = "Pending",
            TeachingMode = "Online",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
            StartTime = new TimeOnly(14, 0),
            EndTime = new TimeOnly(16, 0),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, null!, null!, null!, null!, null!);

        var result = await service.CreatePaymentIntentAsync(1, new CreatePaymentIntentRequest
        {
            BookingId = 1
        });

        Assert.False(result.Success);
        Assert.Equal(403, result.StatusCode);
    }

    [Fact]
    public async Task CreatePaymentIntent_WhenAlreadyConfirmed_ShouldReturn400()
    {
        using var db = CreateInMemoryDb("Db_Pay_AlreadyConfirmed");
        db.Bookings.Add(new Booking
        {
            BookingId = 1,
            StudentId = 1,
            TutorId = 2,
            SubjectId = 1,
            Price = 200000,
            Status = "Confirmed",
            TeachingMode = "Online",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
            StartTime = new TimeOnly(14, 0),
            EndTime = new TimeOnly(16, 0),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, null!, null!, null!, null!, null!);

        var result = await service.CreatePaymentIntentAsync(1, new CreatePaymentIntentRequest
        {
            BookingId = 1
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("đã được xác nhận", result.Message);
    }

    [Fact]
    public async Task GetRefundPreview_WhenBookingPending_ShouldRefund100Percent()
    {
        using var db = CreateInMemoryDb("Db_Refund_Pending");
        var tomorrow = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        db.Bookings.Add(new Booking
        {
            BookingId = 1,
            StudentId = 1,
            TutorId = 2,
            SubjectId = 1,
            Price = 300000,
            Status = "Pending",
            TeachingMode = "Online",
            ScheduledDate = tomorrow,
            StartTime = new TimeOnly(15, 0),
            EndTime = new TimeOnly(17, 0),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, null!, null!, null!, null!, null!);

        var preview = await service.GetRefundPreviewAsync(1, 1);

        Assert.NotNull(preview);
        Assert.Equal(100m, preview.RefundPercentage);
        Assert.Equal(300000m, preview.RefundAmount);
    }

    [Fact]
    public async Task GetRefundPreview_WhenConfirmedAndUnder12Hours_ShouldRefund0Percent()
    {
        using var db = CreateInMemoryDb("Db_Refund_Under12h");
        // Lịch học chỉ còn 5 tiếng nữa
        var sessionTime = DateTime.Now.AddHours(5);
        db.Bookings.Add(new Booking
        {
            BookingId = 1,
            StudentId = 1,
            TutorId = 2,
            SubjectId = 1,
            Price = 300000,
            Status = "Confirmed",
            TeachingMode = "Online",
            ScheduledDate = DateOnly.FromDateTime(sessionTime),
            StartTime = TimeOnly.FromDateTime(sessionTime),
            EndTime = TimeOnly.FromDateTime(sessionTime.AddHours(2)),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, null!, null!, null!, null!, null!);

        var preview = await service.GetRefundPreviewAsync(1, 1);

        Assert.NotNull(preview);
        Assert.Equal(0m, preview.RefundPercentage);
        Assert.Equal(0m, preview.RefundAmount);
    }
}
