using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TutorPlatform.Model;

[Table("StudyGroupPosts")]
public class StudyGroupPost
{
    [Key]
    public int PostId { get; set; }

    public int GroupId { get; set; }

    public int AuthorId { get; set; }

    [MaxLength(20)]
    public string PostType { get; set; } = "Question";

    [MaxLength(4000)]
    public string Body { get; set; } = "";

    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }
}
