using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudentProfile
{
    public int StudentId { get; set; }

    public string? GradeLevel { get; set; }

    public string? SchoolName { get; set; }

    public string? LearningGoals { get; set; }

    public virtual User Student { get; set; } = null!;
}
