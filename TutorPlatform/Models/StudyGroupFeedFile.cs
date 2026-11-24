using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TutorPlatform.Model;

[Table("StudyGroupFeedFiles")]
public class StudyGroupFeedFile
{
    [Key]
    public int FileId { get; set; }

    public int? PostId { get; set; }

    public int? CommentId { get; set; }

    [MaxLength(500)]
    public string FileUrl { get; set; } = null!;

    [MaxLength(260)]
    public string FileName { get; set; } = null!;

    [MaxLength(20)]
    public string Kind { get; set; } = "file";
}
