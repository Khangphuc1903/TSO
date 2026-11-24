namespace TutorPlatform.DTOs;

public class GroupCardDto
{
    public int GroupId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string SubjectName { get; set; } = "";
    public string OwnerName { get; set; } = "";
    public string OwnerRole { get; set; } = "";
    public int MemberCount { get; set; }
    public string MyStatus { get; set; } = "None";
    public bool IsOwner { get; set; }
}

public class GroupPageDto : GroupCardDto
{
    public bool IsMember { get; set; }
    public bool CanModerate { get; set; }
    public List<GroupPersonDto> Members { get; set; } = new();
    public List<GroupJoinRequestDto> JoinRequests { get; set; } = new();
    public List<GroupPostDto> Posts { get; set; } = new();
}

public class GroupPersonDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = "";
    public string Role { get; set; } = "";
    public string? AvatarUrl { get; set; }
}

public class GroupJoinRequestDto : GroupPersonDto
{
    public string? Message { get; set; }
}

public class GroupFileDto
{
    public string FileUrl { get; set; } = "";
    public string FileName { get; set; } = "";
    public string Kind { get; set; } = "file";
}

public class GroupHomeItemDto
{
    public int GroupId { get; set; }
    public string GroupTitle { get; set; } = "";
    public GroupPostDto Post { get; set; } = new();
}

public class GroupPostDto
{
    public int PostId { get; set; }
    public string Body { get; set; } = "";
    public string Status { get; set; } = "Approved";
    public DateTime CreatedAt { get; set; }
    public GroupPersonDto Author { get; set; } = new();
    public List<GroupFileDto> Files { get; set; } = new();
    public List<GroupCommentDto> Comments { get; set; } = new();
}

public class GroupCommentDto
{
    public int CommentId { get; set; }
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public GroupPersonDto Author { get; set; } = new();
    public List<GroupFileDto> Files { get; set; } = new();
    public List<GroupCommentDto> Replies { get; set; } = new();
}

public class GroupReportDto
{
    public string? Reason { get; set; }
    public string? Description { get; set; }
}
