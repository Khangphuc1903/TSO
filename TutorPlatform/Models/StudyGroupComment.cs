using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TutorPlatform.Model;

[Table("StudyGroupComments")]
public class StudyGroupComment
{
    [Key]
    public int CommentId { get; set; }

    public int PostId { get; set; }

    public int? ParentCommentId { get; set; }

    public int AuthorId { get; set; }

    [MaxLength(2000)]
    public string Body { get; set; } = "";

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }
}
