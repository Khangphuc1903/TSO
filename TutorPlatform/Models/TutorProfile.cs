using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class TutorProfile
{
    public int TutorId { get; set; }

    public string? Bio { get; set; }

    public string? University { get; set; }

    public string? Major { get; set; }

    public int? YearsOfExperience { get; set; }

    public decimal? HourlyRateMin { get; set; }

    public decimal? HourlyRateMax { get; set; }

    public string TeachingMode { get; set; } = null!;

    public string VerificationStatus { get; set; } = null!;

    public decimal AverageRating { get; set; }

    public int TotalReviews { get; set; }

    public bool IsPublished { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = new List<AvailabilitySlot>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<CancellationPolicy> CancellationPolicies { get; set; } = new List<CancellationPolicy>();

    public virtual ICollection<FaceVerificationLog> FaceVerificationLogs { get; set; } = new List<FaceVerificationLog>();

    public virtual ICollection<IdentityDocument> IdentityDocuments { get; set; } = new List<IdentityDocument>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<StudyGroupMentor> StudyGroupMentors { get; set; } = new List<StudyGroupMentor>();

    public virtual User Tutor { get; set; } = null!;

    public virtual ICollection<TutorCertificate> TutorCertificates { get; set; } = new List<TutorCertificate>();

    public virtual ICollection<TutorSubject> TutorSubjects { get; set; } = new List<TutorSubject>();

    public virtual ICollection<TutorTestAttempt> TutorTestAttempts { get; set; } = new List<TutorTestAttempt>();

    public virtual ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}
