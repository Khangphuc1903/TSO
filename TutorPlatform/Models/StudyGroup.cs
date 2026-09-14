using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudyGroup
{
    public int GroupId { get; set; }

    public int CreatedByUserId { get; set; }

    public int SubjectId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string? EducationLevel { get; set; }

    public string StudyGoal { get; set; } = null!;

    public int MaxMembers { get; set; }

    public string MeetingMode { get; set; } = null!;

    public string? Location { get; set; }

    public string? City { get; set; }

    public string? District { get; set; }

    public string Status { get; set; } = null!;

    public bool HasMentor { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User CreatedByUser { get; set; } = null!;

    public virtual ICollection<StudyGroupMember> StudyGroupMembers { get; set; } = new List<StudyGroupMember>();

    public virtual StudyGroupMentor? StudyGroupMentor { get; set; }

    public virtual ICollection<StudyGroupSchedule> StudyGroupSchedules { get; set; } = new List<StudyGroupSchedule>();

    public virtual Subject Subject { get; set; } = null!;
}
