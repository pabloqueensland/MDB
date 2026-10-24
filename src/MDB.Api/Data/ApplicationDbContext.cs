using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Data;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<DanceSchool> DanceSchools => Set<DanceSchool>();
    public DbSet<SchoolMembership> SchoolMemberships => Set<SchoolMembership>();
    public DbSet<ImpersonationSession> ImpersonationSessions => Set<ImpersonationSession>();
    public DbSet<Move> Moves => Set<Move>();
    public DbSet<DanceClass> DanceClasses => Set<DanceClass>();
    public DbSet<ClassMove> ClassMoves => Set<ClassMove>();
    public DbSet<DanceStream> DanceStreams => Set<DanceStream>();
    public DbSet<ClassEnrolment> ClassEnrolments => Set<ClassEnrolment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<DanceStream>(stream =>
        {
            stream.HasKey(x => x.Id);
            stream.HasAlternateKey(x => new { x.SchoolId, x.Id });
            stream.Property(x => x.Name).HasMaxLength(100).IsRequired();
            stream.HasIndex(x => new { x.SchoolId, x.Name }).IsUnique();
            stream.HasOne(x => x.School).WithMany(x => x.Streams)
                .HasForeignKey(x => x.SchoolId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ClassEnrolment>(enrolment =>
        {
            enrolment.HasKey(x => new { x.SchoolId, x.UserId, x.StreamId, x.ClassId });
            enrolment.HasOne(x => x.Membership).WithMany(x => x.Enrolments)
                .HasForeignKey(x => new { x.SchoolId, x.UserId })
                .OnDelete(DeleteBehavior.NoAction);
            enrolment.HasOne(x => x.Class).WithMany(x => x.Enrolments)
                .HasForeignKey(x => new { x.SchoolId, x.StreamId, x.ClassId })
                .HasPrincipalKey(x => new { x.SchoolId, x.StreamId, x.Id })
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DanceClass>(danceClass =>
        {
            danceClass.HasKey(x => x.Id);
            danceClass.HasAlternateKey(x => new { x.SchoolId, x.Id });
            danceClass.HasAlternateKey(x => new { x.SchoolId, x.StreamId, x.Id });
            danceClass.Property(x => x.Name).HasMaxLength(200).IsRequired();
            danceClass.Property(x => x.Level).HasPrecision(6, 2);
            danceClass.HasOne(x => x.School)
                .WithMany(x => x.Classes)
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.NoAction);

            danceClass.HasOne(x => x.Stream).WithMany(x => x.Classes)
                .HasForeignKey(x => new { x.SchoolId, x.StreamId })
                .HasPrincipalKey(x => new { x.SchoolId, x.Id })
                .OnDelete(DeleteBehavior.Cascade);

            danceClass.HasMany(x => x.Moves)
                .WithMany(x => x.Classes)
                .UsingEntity<ClassMove>(
                    link => link.HasOne(x => x.Move)
                        .WithMany()
                        .HasForeignKey(x => new { x.SchoolId, x.MoveId })
                        .HasPrincipalKey(x => new { x.SchoolId, x.Id })
                        .OnDelete(DeleteBehavior.NoAction),
                    link => link.HasOne(x => x.Class)
                        .WithMany()
                        .HasForeignKey(x => new { x.SchoolId, x.ClassId })
                        .HasPrincipalKey(x => new { x.SchoolId, x.Id })
                        .OnDelete(DeleteBehavior.Cascade),
                    link =>
                    {
                        // Shared SchoolId prevents links between different schools.
                        link.HasKey(x => new { x.SchoolId, x.ClassId, x.MoveId });
                    });
        });

        builder.Entity<Move>(move =>
        {
            move.HasKey(x => x.Id);
            move.HasAlternateKey(x => new { x.SchoolId, x.Id });
            move.Property(x => x.Name).HasMaxLength(200).IsRequired();
            move.Property(x => x.Level).HasPrecision(6, 2);
            move.Property(x => x.VideoUrl).HasMaxLength(2048).IsRequired();
            move.Property(x => x.Description).HasMaxLength(4000);
            move.HasIndex(x => new { x.SchoolId, x.Level });
            move.HasOne(x => x.School)
                .WithMany(x => x.Moves)
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ImpersonationSession>(session =>
        {
            session.Property(x => x.AdminUserId).HasMaxLength(450).IsRequired();
            session.Property(x => x.TargetUserId).HasMaxLength(450).IsRequired();
            session.Property(x => x.AdminSecurityStamp).HasMaxLength(256).IsRequired();
            session.HasIndex(x => x.ExpiresAt);
        });

        builder.Entity<DanceSchool>(school =>
        {
            school.HasKey(x => x.Id);
            school.Property(x => x.Name).HasMaxLength(200).IsRequired();
            school.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            school.HasIndex(x => x.Slug).IsUnique();
        });

        builder.Entity<SchoolMembership>(membership =>
        {
            // One membership per user per school, with a role specific to that school.
            membership.HasKey(x => new { x.SchoolId, x.UserId });
            membership.Property(x => x.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
            membership.HasOne(x => x.School)
                .WithMany(x => x.Memberships)
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);
            membership.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
