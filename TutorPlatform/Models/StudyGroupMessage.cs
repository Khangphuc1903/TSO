using System;

namespace TutorPlatform.Model;

public partial class StudyGroupMessage
{
    public int MessageId { get; set; }
    public int GroupId { get; set; }
    public int SenderId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }

    public virtual StudyGroup Group { get; set; } = null!;
    public virtual User Sender { get; set; } = null!;
}
