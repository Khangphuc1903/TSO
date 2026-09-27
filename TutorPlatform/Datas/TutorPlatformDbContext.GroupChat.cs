using Microsoft.EntityFrameworkCore;
using TutorPlatform.Model;

namespace TutorPlatform.Datas;

public partial class TutorPlatformDbContext
{
    public virtual DbSet<StudyGroupMessage> StudyGroupMessages { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StudyGroupMessage>(entity =>
        {
            entity.HasKey(e => e.MessageId);
            entity.ToTable("StudyGroupMessages");
            entity.Property(e => e.Content).HasMaxLength(2000);
            entity.Property(e => e.SentAt).HasColumnType("datetime");
            entity.HasIndex(e => new { e.GroupId, e.SentAt });

            entity.HasOne(d => d.Group)
                .WithMany(p => p.StudyGroupMessages)
                .HasForeignKey(d => d.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Sender)
                .WithMany()
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });
    }
}
