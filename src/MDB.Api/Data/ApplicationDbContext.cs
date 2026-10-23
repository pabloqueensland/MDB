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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

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
