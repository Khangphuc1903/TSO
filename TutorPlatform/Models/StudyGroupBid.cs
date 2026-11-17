using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class StudyGroupBid
{
    public int BidId { get; set; }

    public int GroupId { get; set; }

    public int TutorId { get; set; }

    public decimal ProposedPrice { get; set; }

    public string? CurriculumNote { get; set; }

    public string? CertificateNote { get; set; }

    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; }

    public virtual StudyGroup Group { get; set; } = null!;

    public virtual TutorProfile Tutor { get; set; } = null!;

    public virtual ICollection<StudyGroupBidVote> Votes { get; set; } = new List<StudyGroupBidVote>();
}
