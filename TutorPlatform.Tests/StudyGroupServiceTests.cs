using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;
using TutorPlatform.Services;

namespace TutorPlatform.Tests;

public class StudyGroupServiceTests
{
    private static TutorPlatformDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<TutorPlatformDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new TutorPlatformDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_WhenTitleIsEmpty_ShouldReturnError()
    {
        using var db = CreateInMemoryDb("Db_Create_EmptyTitle");
        var service = new StudyGroupService(db, null!);

        var result = await service.CreateAsync(1, new CreateStudyGroupDto
        {
            Title = "   ",
            SubjectId = 1,
            City = "Hà Nội",
            District = "Quận Ba Đình"
        }, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.Status);
        Assert.Equal("Nhập tiêu đề nhóm.", result.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenSubjectInvalid_ShouldReturnError()
    {
        using var db = CreateInMemoryDb("Db_Create_InvalidSubject");
        var service = new StudyGroupService(db, null!);

        var result = await service.CreateAsync(1, new CreateStudyGroupDto
        {
            Title = "Nhóm ôn thi Toán",
            SubjectId = 999,
            City = "Hà Nội",
            District = "Quận Ba Đình"
        }, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.Status);
        Assert.Equal("Môn học không hợp lệ.", result.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenValid_ShouldCreateGroupAndAddCreatorAsAcceptedMember()
    {
        using var db = CreateInMemoryDb("Db_Create_Valid");
        db.Subjects.Add(new Subject { SubjectId = 1, SubjectName = "Toán", EducationLevel = "THPT", IsActive = true });
        db.Users.Add(new User
        {
            UserId = 1,
            FullName = "Nguyễn Văn A",
            Email = "a@test.com",
            PasswordHash = "hash",
            RoleId = 1,
            Status = "Active"
        });
        await db.SaveChangesAsync();

        var service = new StudyGroupService(db, null!);

        var result = await service.CreateAsync(1, new CreateStudyGroupDto
        {
            Title = "Nhóm Toán 12",
            SubjectId = 1,
            City = "Hà Nội",
            District = "Ba Đình",
            MaxMembers = 5,
            MeetingMode = "Online"
        }, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(201, result.Status);
        Assert.NotNull(result.Data);

        var member = await db.StudyGroupMembers.FirstOrDefaultAsync(m => m.UserId == 1);
        Assert.NotNull(member);
        Assert.Equal("Accepted", member.Status);
    }

    [Fact]
    public async Task JoinAsync_WhenMessageTooShort_ShouldReturnError()
    {
        using var db = CreateInMemoryDb("Db_Join_ShortMsg");
        var service = new StudyGroupService(db, null!);

        var result = await service.JoinAsync(2, 1, new JoinStudyGroupDto
        {
            Message = "Xin vào" // < 10 ký tự
        }, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.Status);
        Assert.Contains("ít nhất 10 ký tự", result.Message);
    }

    [Fact]
    public async Task JoinAsync_WhenUserIsOwner_ShouldReturnError()
    {
        using var db = CreateInMemoryDb("Db_Join_Owner");
        db.StudyGroups.Add(new StudyGroup
        {
            GroupId = 1,
            CreatedByUserId = 1,
            Title = "Nhóm Lý",
            Status = "Open",
            MaxMembers = 5,
            MeetingMode = "Online",
            StudyGoal = "PeerStudy"
        });
        await db.SaveChangesAsync();

        var service = new StudyGroupService(db, null!);

        var result = await service.JoinAsync(1, 1, new JoinStudyGroupDto
        {
            Message = "Tôi muốn tham gia nhóm này học tập"
        }, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.Status);
        Assert.Equal("Bạn đã là chủ nhóm.", result.Message);
    }

    [Fact]
    public async Task JoinAsync_WhenGroupFull_ShouldReturnError()
    {
        using var db = CreateInMemoryDb("Db_Join_Full");
        var group = new StudyGroup
        {
            GroupId = 1,
            CreatedByUserId = 1,
            Title = "Nhóm Hóa",
            Status = "Open",
            MaxMembers = 2,
            MeetingMode = "Online",
            StudyGoal = "PeerStudy"
        };
        db.StudyGroups.Add(group);
        db.StudyGroupMembers.Add(new StudyGroupMember { GroupId = 1, UserId = 1, Status = "Accepted" });
        db.StudyGroupMembers.Add(new StudyGroupMember { GroupId = 1, UserId = 3, Status = "Accepted" });
        await db.SaveChangesAsync();

        var service = new StudyGroupService(db, null!);

        var result = await service.JoinAsync(2, 1, new JoinStudyGroupDto
        {
            Message = "Tôi muốn tham gia nhóm học cùng các bạn"
        }, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.Status);
        Assert.Equal("Nhóm đã đủ thành viên.", result.Message);
    }
}
