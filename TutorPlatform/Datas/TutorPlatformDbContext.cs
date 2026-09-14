using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Model;

namespace TutorPlatform.Datas;

public partial class TutorPlatformDbContext : DbContext
{
    public TutorPlatformDbContext()
    {
    }

    public TutorPlatformDbContext(DbContextOptions<TutorPlatformDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AdminActionLog> AdminActionLogs { get; set; }

    public virtual DbSet<AvailabilitySlot> AvailabilitySlots { get; set; }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<BookingReschedule> BookingReschedules { get; set; }

    public virtual DbSet<CancellationPolicy> CancellationPolicies { get; set; }

    public virtual DbSet<Conversation> Conversations { get; set; }

    public virtual DbSet<FaceVerificationLog> FaceVerificationLogs { get; set; }

    public virtual DbSet<IdentityDocument> IdentityDocuments { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<OcrExtractionResult> OcrExtractionResults { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<PlatformSetting> PlatformSettings { get; set; }

    public virtual DbSet<Question> Questions { get; set; }

    public virtual DbSet<Refund> Refunds { get; set; }

    public virtual DbSet<RefundRule> RefundRules { get; set; }

    public virtual DbSet<Report> Reports { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SafetyGuideline> SafetyGuidelines { get; set; }

    public virtual DbSet<StudentProfile> StudentProfiles { get; set; }

    public virtual DbSet<StudyGroup> StudyGroups { get; set; }

    public virtual DbSet<StudyGroupMember> StudyGroupMembers { get; set; }

    public virtual DbSet<StudyGroupMentor> StudyGroupMentors { get; set; }

    public virtual DbSet<StudyGroupSchedule> StudyGroupSchedules { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<TutorCertificate> TutorCertificates { get; set; }

    public virtual DbSet<TutorProfile> TutorProfiles { get; set; }

    public virtual DbSet<TutorSubject> TutorSubjects { get; set; }

    public virtual DbSet<TutorTestAnswer> TutorTestAnswers { get; set; }

    public virtual DbSet<TutorTestAttempt> TutorTestAttempts { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Wishlist> Wishlists { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server= LAPTOP-PJCV33QV\\SQLEXPRESS; Database= TutorPlatformDB; Uid=sa; Pwd=123; TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminActionLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PK__AdminAct__5E5486482E8EE075");

            entity.Property(e => e.ActionType).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.TargetEntityType).HasMaxLength(50);

            entity.HasOne(d => d.Admin).WithMany(p => p.AdminActionLogs)
                .HasForeignKey(d => d.AdminId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Log_Admin");
        });

        modelBuilder.Entity<AvailabilitySlot>(entity =>
        {
            entity.HasKey(e => e.SlotId).HasName("PK__Availabi__0A124AAF1206A294");

            entity.Property(e => e.IsRecurring).HasDefaultValue(true);

            entity.HasOne(d => d.Tutor).WithMany(p => p.AvailabilitySlots)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Slot_Tutor");
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.BookingId).HasName("PK__Bookings__73951AEDEB250BE4");

            entity.Property(e => e.CancellationReason).HasMaxLength(300);
            entity.Property(e => e.CancelledAt).HasColumnType("datetime");
            entity.Property(e => e.CompletedAt).HasColumnType("datetime");
            entity.Property(e => e.ConfirmedAt).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.Price).HasColumnType("decimal(10, 0)");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");
            entity.Property(e => e.TeachingMode).HasMaxLength(20);

            entity.HasOne(d => d.Slot).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.SlotId)
                .HasConstraintName("FK_Booking_Slot");

            entity.HasOne(d => d.Student).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_Student");

            entity.HasOne(d => d.Subject).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_Subject");

            entity.HasOne(d => d.Tutor).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_Tutor");
        });

        modelBuilder.Entity<BookingReschedule>(entity =>
        {
            entity.HasKey(e => e.RescheduleId).HasName("PK__BookingR__66612A9E9B087944");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Reason).HasMaxLength(300);
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Booking).WithMany(p => p.BookingReschedules)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reschedule_Booking");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.BookingRescheduleRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reschedule_Requester");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.BookingRescheduleReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("FK_Reschedule_Reviewer");
        });

        modelBuilder.Entity<CancellationPolicy>(entity =>
        {
            entity.HasKey(e => e.PolicyId).HasName("PK__Cancella__2E1339A4946D9B70");

            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.PolicyType).HasMaxLength(20);

            entity.HasOne(d => d.Tutor).WithMany(p => p.CancellationPolicies)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Policy_Tutor");
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.ConversationId).HasName("PK__Conversa__C050D8773A4F0056");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.LastMessageAt).HasColumnType("datetime");

            entity.HasOne(d => d.Booking).WithMany(p => p.Conversations)
                .HasForeignKey(d => d.BookingId)
                .HasConstraintName("FK_Conv_Booking");

            entity.HasOne(d => d.User1).WithMany(p => p.ConversationUser1s)
                .HasForeignKey(d => d.User1Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Conv_User1");

            entity.HasOne(d => d.User2).WithMany(p => p.ConversationUser2s)
                .HasForeignKey(d => d.User2Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Conv_User2");
        });

        modelBuilder.Entity<FaceVerificationLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PK__FaceVeri__5E548648CC0ACFFD");

            entity.Property(e => e.ApiProvider)
                .HasMaxLength(50)
                .HasDefaultValue("FPT.AI");
            entity.Property(e => e.AttemptNumber).HasDefaultValue(1);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.MatchConfidenceScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.SelfieImageUrl).HasMaxLength(500);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Document).WithMany(p => p.FaceVerificationLogs)
                .HasForeignKey(d => d.DocumentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Face_Document");

            entity.HasOne(d => d.Tutor).WithMany(p => p.FaceVerificationLogs)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Face_Tutor");
        });

        modelBuilder.Entity<IdentityDocument>(entity =>
        {
            entity.HasKey(e => e.DocumentId).HasName("PK__Identity__1ABEEF0FD41B3766");

            entity.Property(e => e.IdCardBackUrl).HasMaxLength(500);
            entity.Property(e => e.IdCardFrontUrl).HasMaxLength(500);
            entity.Property(e => e.RejectionReason).HasMaxLength(300);
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");
            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.IdentityDocuments)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("FK_ID_Admin");

            entity.HasOne(d => d.Tutor).WithMany(p => p.IdentityDocuments)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ID_Tutor");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.MessageId).HasName("PK__Messages__C87C0C9C4A0B76CF");

            entity.Property(e => e.Content).HasMaxLength(2000);
            entity.Property(e => e.SentAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Conversation).WithMany(p => p.Messages)
                .HasForeignKey(d => d.ConversationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Msg_Conversation");

            entity.HasOne(d => d.Sender).WithMany(p => p.Messages)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Msg_Sender");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK__Notifica__20CF2E12C15CCFAC");

            entity.Property(e => e.Content).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.RelatedEntityType).HasMaxLength(50);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Type).HasMaxLength(50);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Notif_User");
        });

        modelBuilder.Entity<OcrExtractionResult>(entity =>
        {
            entity.HasKey(e => e.ExtractionId).HasName("PK__OcrExtra__DA8CD94E6CAB4263");

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.ExtractedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.IdNumber).HasMaxLength(20);

            entity.HasOne(d => d.Document).WithMany(p => p.OcrExtractionResults)
                .HasForeignKey(d => d.DocumentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_OCR_Document");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.PaymentId).HasName("PK__Payments__9B556A38CFC2CBF5");

            entity.Property(e => e.Amount).HasColumnType("decimal(10, 0)");
            entity.Property(e => e.CallbackReceivedAt).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.GatewayResponseCode).HasMaxLength(50);
            entity.Property(e => e.GatewayTransactionId).HasMaxLength(100);
            entity.Property(e => e.PaidAt).HasColumnType("datetime");
            entity.Property(e => e.PaymentMethod).HasMaxLength(20);
            entity.Property(e => e.PaymentUrl).HasMaxLength(1000);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");
            entity.Property(e => e.TransactionCode).HasMaxLength(100);

            entity.HasOne(d => d.Booking).WithMany(p => p.Payments)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payment_Booking");

            entity.HasOne(d => d.PayerUser).WithMany(p => p.Payments)
                .HasForeignKey(d => d.PayerUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payment_Payer");
        });

        modelBuilder.Entity<PlatformSetting>(entity =>
        {
            entity.HasKey(e => e.SettingKey).HasName("PK__Platform__01E719AC4A8B53A3");

            entity.Property(e => e.SettingKey).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(300);
            entity.Property(e => e.SettingValue).HasMaxLength(500);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.QuestionId).HasName("PK__Question__0DC06FAC06E57BCF");

            entity.Property(e => e.Content).HasMaxLength(500);
            entity.Property(e => e.CorrectAnswer)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Difficulty).HasMaxLength(20);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.OptionA).HasMaxLength(255);
            entity.Property(e => e.OptionB).HasMaxLength(255);
            entity.Property(e => e.OptionC).HasMaxLength(255);
            entity.Property(e => e.OptionD).HasMaxLength(255);
            entity.Property(e => e.TestType).HasMaxLength(20);

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Questions)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK_Q_Admin");

            entity.HasOne(d => d.Subject).WithMany(p => p.Questions)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_Q_Subject");
        });

        modelBuilder.Entity<Refund>(entity =>
        {
            entity.HasKey(e => e.RefundId).HasName("PK__Refunds__725AB92032E8BBC1");

            entity.Property(e => e.Amount).HasColumnType("decimal(10, 0)");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.ProcessedAt).HasColumnType("datetime");
            entity.Property(e => e.Reason).HasMaxLength(300);
            entity.Property(e => e.RefundPercent).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Booking).WithMany(p => p.Refunds)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Refund_Booking");

            entity.HasOne(d => d.Payment).WithMany(p => p.Refunds)
                .HasForeignKey(d => d.PaymentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Refund_Payment");
        });

        modelBuilder.Entity<RefundRule>(entity =>
        {
            entity.HasKey(e => e.RuleId).HasName("PK__RefundRu__110458E2E3EBC7E3");

            entity.Property(e => e.RefundPercentage).HasColumnType("decimal(5, 2)");

            entity.HasOne(d => d.Policy).WithMany(p => p.RefundRules)
                .HasForeignKey(d => d.PolicyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Rule_Policy");
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.ReportId).HasName("PK__Reports__D5BD48054488F139");

            entity.Property(e => e.ActionTaken).HasMaxLength(300);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Reason).HasMaxLength(100);
            entity.Property(e => e.ReportedEntityType).HasMaxLength(30);
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Reporter).WithMany(p => p.ReportReporters)
                .HasForeignKey(d => d.ReporterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Report_Reporter");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.ReportReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("FK_Report_Admin");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.ReviewId).HasName("PK__Reviews__74BC79CE92506F30");

            entity.HasIndex(e => e.BookingId, "UQ__Reviews__73951AEC275C67DB").IsUnique();

            entity.Property(e => e.Comment).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.RepliedAt).HasColumnType("datetime");
            entity.Property(e => e.TutorReply).HasMaxLength(1000);

            entity.HasOne(d => d.Booking).WithOne(p => p.Review)
                .HasForeignKey<Review>(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Review_Booking");

            entity.HasOne(d => d.Student).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Review_Student");

            entity.HasOne(d => d.Tutor).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Review_Tutor");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE1A311B0C91");

            entity.HasIndex(e => e.RoleName, "UQ__Roles__8A2B6160339FD4F0").IsUnique();

            entity.Property(e => e.RoleName).HasMaxLength(50);
        });

        modelBuilder.Entity<SafetyGuideline>(entity =>
        {
            entity.HasKey(e => e.GuidelineId).HasName("PK__SafetyGu__65D06B6834B8C6E2");

            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Version).HasDefaultValue(1);
        });

        modelBuilder.Entity<StudentProfile>(entity =>
        {
            entity.HasKey(e => e.StudentId).HasName("PK__StudentP__32C52B99C30449D9");

            entity.Property(e => e.StudentId).ValueGeneratedNever();
            entity.Property(e => e.GradeLevel).HasMaxLength(50);
            entity.Property(e => e.LearningGoals).HasMaxLength(500);
            entity.Property(e => e.SchoolName).HasMaxLength(150);

            entity.HasOne(d => d.Student).WithOne(p => p.StudentProfile)
                .HasForeignKey<StudentProfile>(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StudentProfiles_Users");
        });

        modelBuilder.Entity<StudyGroup>(entity =>
        {
            entity.HasKey(e => e.GroupId).HasName("PK__StudyGro__149AF36AE419A90E");

            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.EducationLevel).HasMaxLength(50);
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.MaxMembers).HasDefaultValue(6);
            entity.Property(e => e.MeetingMode).HasMaxLength(20);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Open");
            entity.Property(e => e.StudyGoal).HasMaxLength(50);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.CreatedByUser).WithMany(p => p.StudyGroups)
                .HasForeignKey(d => d.CreatedByUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Group_Creator");

            entity.HasOne(d => d.Subject).WithMany(p => p.StudyGroups)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Group_Subject");
        });

        modelBuilder.Entity<StudyGroupMember>(entity =>
        {
            entity.HasKey(e => e.MemberId).HasName("PK__StudyGro__0CF04B18DE568E10");

            entity.HasIndex(e => new { e.GroupId, e.UserId }, "UQ_GroupMember").IsUnique();

            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Group).WithMany(p => p.StudyGroupMembers)
                .HasForeignKey(d => d.GroupId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GMember_Group");

            entity.HasOne(d => d.User).WithMany(p => p.StudyGroupMembers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GMember_User");
        });

        modelBuilder.Entity<StudyGroupMentor>(entity =>
        {
            entity.HasKey(e => e.StudyGroupMentorId).HasName("PK__StudyGro__9BBE94A73216B026");

            entity.HasIndex(e => new { e.GroupId, e.TutorId }, "UQ_GroupMentor").IsUnique();

            entity.HasIndex(e => e.GroupId, "UQ_StudyGroup_ActiveMentor")
                .IsUnique()
                .HasFilter("([Status]='Accepted')");

            entity.Property(e => e.InviteMessage).HasMaxLength(500);
            entity.Property(e => e.InvitedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.RespondedAt).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Group).WithOne(p => p.StudyGroupMentor)
                .HasForeignKey<StudyGroupMentor>(d => d.GroupId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GroupMentor_Group");

            entity.HasOne(d => d.InvitedByUser).WithMany(p => p.StudyGroupMentors)
                .HasForeignKey(d => d.InvitedByUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GroupMentor_Inviter");

            entity.HasOne(d => d.Tutor).WithMany(p => p.StudyGroupMentors)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GroupMentor_Tutor");
        });

        modelBuilder.Entity<StudyGroupSchedule>(entity =>
        {
            entity.HasKey(e => e.ScheduleId).HasName("PK__StudyGro__9C8A5B49317B8076");

            entity.HasOne(d => d.Group).WithMany(p => p.StudyGroupSchedules)
                .HasForeignKey(d => d.GroupId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GSchedule_Group");
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.SubjectId).HasName("PK__Subjects__AC1BA3A88FDE7474");

            entity.Property(e => e.EducationLevel).HasMaxLength(50);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.SubjectName).HasMaxLength(100);
        });

        modelBuilder.Entity<TutorCertificate>(entity =>
        {
            entity.HasKey(e => e.CertificateId).HasName("PK__TutorCer__BBF8A7C1D7B7F228");

            entity.Property(e => e.CertificateName).HasMaxLength(200);
            entity.Property(e => e.FileUrl).HasMaxLength(500);
            entity.Property(e => e.IssuedBy).HasMaxLength(150);
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Tutor).WithMany(p => p.TutorCertificates)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cert_Tutor");
        });

        modelBuilder.Entity<TutorProfile>(entity =>
        {
            entity.HasKey(e => e.TutorId).HasName("PK__TutorPro__77C70FE28C21EA99");

            entity.Property(e => e.TutorId).ValueGeneratedNever();
            entity.Property(e => e.AverageRating).HasColumnType("decimal(3, 2)");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.HourlyRateMax).HasColumnType("decimal(10, 0)");
            entity.Property(e => e.HourlyRateMin).HasColumnType("decimal(10, 0)");
            entity.Property(e => e.Major).HasMaxLength(150);
            entity.Property(e => e.TeachingMode)
                .HasMaxLength(20)
                .HasDefaultValue("Both");
            entity.Property(e => e.University).HasMaxLength(150);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.VerificationStatus)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Tutor).WithOne(p => p.TutorProfile)
                .HasForeignKey<TutorProfile>(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TutorProfiles_Users");
        });

        modelBuilder.Entity<TutorSubject>(entity =>
        {
            entity.HasKey(e => e.TutorSubjectId).HasName("PK__TutorSub__2D58B9FBB68C7880");

            entity.HasIndex(e => new { e.TutorId, e.SubjectId }, "UQ_TutorSubject").IsUnique();

            entity.Property(e => e.VerifiedAt).HasColumnType("datetime");

            entity.HasOne(d => d.Subject).WithMany(p => p.TutorSubjects)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TS_Subject");

            entity.HasOne(d => d.Tutor).WithMany(p => p.TutorSubjects)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TS_Tutor");
        });

        modelBuilder.Entity<TutorTestAnswer>(entity =>
        {
            entity.HasKey(e => e.AnswerId).HasName("PK__TutorTes__D48250047D6F9A08");

            entity.Property(e => e.SelectedOption)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength();

            entity.HasOne(d => d.Attempt).WithMany(p => p.TutorTestAnswers)
                .HasForeignKey(d => d.AttemptId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Answer_Attempt");

            entity.HasOne(d => d.Question).WithMany(p => p.TutorTestAnswers)
                .HasForeignKey(d => d.QuestionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Answer_Question");
        });

        modelBuilder.Entity<TutorTestAttempt>(entity =>
        {
            entity.HasKey(e => e.AttemptId).HasName("PK__TutorTes__891A68E6D1E8EAD4");

            entity.Property(e => e.AttemptNumber).HasDefaultValue(1);
            entity.Property(e => e.PassThreshold).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.ScorePercent).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.StartedAt).HasColumnType("datetime");
            entity.Property(e => e.SubmittedAt).HasColumnType("datetime");
            entity.Property(e => e.TestType).HasMaxLength(20);

            entity.HasOne(d => d.Subject).WithMany(p => p.TutorTestAttempts)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_Attempt_Subject");

            entity.HasOne(d => d.Tutor).WithMany(p => p.TutorTestAttempts)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Attempt_Tutor");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4CB9D907CC");

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534B882FDC2").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.EmailConfirmToken).HasMaxLength(255);
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.Gender).HasMaxLength(10);
            entity.Property(e => e.Latitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.Longitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.PasswordResetExpiry).HasColumnType("datetime");
            entity.Property(e => e.PasswordResetToken).HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Active");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Users_Roles");
        });

        modelBuilder.Entity<Wishlist>(entity =>
        {
            entity.HasKey(e => e.WishlistId).HasName("PK__Wishlist__233189EBCDFCE5C0");

            entity.ToTable("Wishlist");

            entity.HasIndex(e => new { e.StudentId, e.TutorId }, "UQ_Wishlist").IsUnique();

            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Student).WithMany(p => p.Wishlists)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Wishlist_Student");

            entity.HasOne(d => d.Tutor).WithMany(p => p.Wishlists)
                .HasForeignKey(d => d.TutorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Wishlist_Tutor");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
