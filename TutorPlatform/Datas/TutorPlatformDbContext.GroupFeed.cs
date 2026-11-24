using Microsoft.EntityFrameworkCore;
using TutorPlatform.Model;

namespace TutorPlatform.Datas;

public partial class TutorPlatformDbContext
{
    public virtual DbSet<StudyGroupPost> StudyGroupPosts { get; set; }

    public virtual DbSet<StudyGroupComment> StudyGroupComments { get; set; }

    public virtual DbSet<StudyGroupFeedFile> StudyGroupFeedFiles { get; set; }
}
