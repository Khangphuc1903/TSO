namespace TutorPlatform.DTOs;

public class NotificationDto
{
    public int NotificationId { get; set; }
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Content { get; set; }
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ConversationDto
{
    public int ConversationId { get; set; }
    public int OtherUserId { get; set; }
    public string OtherUserName { get; set; } = null!;
    public string? OtherAvatarUrl { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}

public class ChatMessageDto
{
    public int MessageId { get; set; }
    public int ConversationId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }
}

public class SendMessageDto
{
    public string Content { get; set; } = null!;
}

public class OpenConversationDto
{
    public int OtherUserId { get; set; }
    public int? BookingId { get; set; }
}

public class CreateStudyGroupDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int SubjectId { get; set; }
    public string? EducationLevel { get; set; }
    public string StudyGoal { get; set; } = "PeerStudy";
    public int MaxMembers { get; set; } = 6;
    public string MeetingMode { get; set; } = "Online";
    public string? Location { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public bool HasMentor { get; set; }
    public int? TutorId { get; set; }
    public string? InviteMessage { get; set; }
}

public class StudyGroupSearchRequest
{
    public string? Keyword { get; set; }
    public int? SubjectId { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public bool? HasMentor { get; set; }
}

public class StudyGroupListItemDto
{
    public int GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public string? City { get; set; }
    public string? District { get; set; }
    public string MeetingMode { get; set; } = null!;
    public bool HasMentor { get; set; }
    public string? MentorName { get; set; }
    public string MentorStatus { get; set; } = "None";
    public int MemberCount { get; set; }
    public int MaxMembers { get; set; }
    public string Status { get; set; } = null!;
    public string CreatorName { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

public class StudyGroupDetailDto : StudyGroupListItemDto
{
    public int CreatedByUserId { get; set; }
    public string StudyGoal { get; set; } = null!;
    public string? Location { get; set; }
    public bool IsMember { get; set; }
    public string MyJoinStatus { get; set; } = "None";
    public bool IsOwner { get; set; }
    public List<StudyGroupMemberDto> Members { get; set; } = new();
    public List<StudyGroupJoinRequestDto> JoinRequests { get; set; } = new();
}

public class StudyGroupMemberDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string Status { get; set; } = null!;
}

public class StudyGroupJoinRequestDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? JoinMessage { get; set; }
    public DateTime RequestedAt { get; set; }
}

public class JoinStudyGroupDto
{
    public string Message { get; set; } = null!;
}

public class RespondJoinRequestDto
{
    public bool Accept { get; set; }
}

public class SendGroupMessageDto
{
    public string Content { get; set; } = null!;
}

public class GroupChatMessageDto
{
    public int MessageId { get; set; }
    public int GroupId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = null!;
    public string? SenderAvatarUrl { get; set; }
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }
}

public class GroupChatListItemDto
{
    public int GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int MemberCount { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
}

public class InviteTutorDto
{
    public int TutorId { get; set; }
    public string? InviteMessage { get; set; }
}

public class BookingListItemDto
{
    public int BookingId { get; set; }
    public int StudentId { get; set; }
    public int TutorId { get; set; }
    public string StudentName { get; set; } = null!;
    public string TutorName { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public string ScheduledDate { get; set; } = null!;
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public string Status { get; set; } = null!;
    public decimal Price { get; set; }
    public string TeachingMode { get; set; } = null!;
    public string? Location { get; set; }
    public bool IsToday { get; set; }
    public string? PaymentStatus { get; set; }
    public string? PaymentUrl { get; set; }
}

public class UserProfileDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public bool NeedsOnboarding { get; set; }
}

public class UpdateProfileDto
{
    public string FullName { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? Gender { get; set; }
    public string? DateOfBirth { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}
