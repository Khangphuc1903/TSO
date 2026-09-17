using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class User
{
    public int UserId { get; set; }
    public DateTime? EmailConfirmExpiry { get; set; }
    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public string FullName { get; set; } = null!;

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public string? AvatarUrl { get; set; }

    public int RoleId { get; set; }

    public string? Address { get; set; }

    public string? City { get; set; }

    public string? District { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public bool IsEmailConfirmed { get; set; }

    public string? EmailConfirmToken { get; set; }

    public string? PasswordResetToken { get; set; }

    public DateTime? PasswordResetExpiry { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AdminActionLog> AdminActionLogs { get; set; } = new List<AdminActionLog>();

    public virtual ICollection<BookingReschedule> BookingRescheduleRequestedByNavigations { get; set; } = new List<BookingReschedule>();

    public virtual ICollection<BookingReschedule> BookingRescheduleReviewedByNavigations { get; set; } = new List<BookingReschedule>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<Conversation> ConversationUser1s { get; set; } = new List<Conversation>();

    public virtual ICollection<Conversation> ConversationUser2s { get; set; } = new List<Conversation>();

    public virtual ICollection<IdentityDocument> IdentityDocuments { get; set; } = new List<IdentityDocument>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

    public virtual ICollection<Report> ReportReporters { get; set; } = new List<Report>();

    public virtual ICollection<Report> ReportReviewedByNavigations { get; set; } = new List<Report>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual Role Role { get; set; } = null!;

    public virtual StudentProfile? StudentProfile { get; set; }

    public virtual ICollection<StudyGroupMember> StudyGroupMembers { get; set; } = new List<StudyGroupMember>();

    public virtual ICollection<StudyGroupMentor> StudyGroupMentors { get; set; } = new List<StudyGroupMentor>();

    public virtual ICollection<StudyGroup> StudyGroups { get; set; } = new List<StudyGroup>();

    public virtual TutorProfile? TutorProfile { get; set; }

    public virtual ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}
