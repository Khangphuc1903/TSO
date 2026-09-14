using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudyGroupMember
{
    public int MemberId { get; set; }

    public int GroupId { get; set; }

    public int UserId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime JoinedAt { get; set; }

    public virtual StudyGroup Group { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
