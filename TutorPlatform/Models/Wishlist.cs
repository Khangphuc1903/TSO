using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class Wishlist
{
    public int WishlistId { get; set; }

    public int StudentId { get; set; }

    public int TutorId { get; set; }

    public DateTime AddedAt { get; set; }

    public virtual User Student { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;
}
