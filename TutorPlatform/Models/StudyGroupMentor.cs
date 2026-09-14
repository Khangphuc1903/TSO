using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudyGroupMentor
{
    public int StudyGroupMentorId { get; set; }

    public int GroupId { get; set; }

    public int TutorId { get; set; }

    public int InvitedByUserId { get; set; }

    public string Status { get; set; } = null!;

    public string? InviteMessage { get; set; }

    public DateTime InvitedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public virtual StudyGroup Group { get; set; } = null!;

    public virtual User InvitedByUser { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
