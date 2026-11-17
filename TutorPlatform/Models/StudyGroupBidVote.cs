using System;

namespace TutorPlatform.Model;

public partial class StudyGroupBidVote
{
    public int VoteId { get; set; }

    public int BidId { get; set; }

    public int VoterUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual StudyGroupBid Bid { get; set; } = null!;

    public virtual User Voter { get; set; } = null!;
}
