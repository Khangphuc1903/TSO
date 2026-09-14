using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudyGroupSchedule
{
    public int ScheduleId { get; set; }

    public int GroupId { get; set; }

    public byte? DayOfWeek { get; set; }

    public DateOnly? SpecificDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public virtual StudyGroup Group { get; set; } = null!;
}
