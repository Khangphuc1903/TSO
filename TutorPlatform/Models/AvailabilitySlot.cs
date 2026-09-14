using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class AvailabilitySlot
{
    public int SlotId { get; set; }

    public int TutorId { get; set; }

    public byte? DayOfWeek { get; set; }

    public DateOnly? SpecificDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public bool IsRecurring { get; set; }

    public bool IsBooked { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual TutorProfile Tutor { get; set; } = null!;
}
