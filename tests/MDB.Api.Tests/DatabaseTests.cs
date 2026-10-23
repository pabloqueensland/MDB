using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class DatabaseTests(ApiFixture fixture)
{
    [Theory]
    [InlineData("midnight-motion")]
    [InlineData("velvet-tempo")]
    [InlineData("neon-rhythm-collective")]
    public async Task Demo_school_has_leadership_teachers_and_students(string slug)
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = await database.DanceSchools.SingleAsync(x => x.Slug == slug);
        var memberships = await database.SchoolMemberships.AsNoTracking()
            .Where(x => x.SchoolId == school.Id).ToListAsync();
        Assert.Single(memberships, x => x.Role == SchoolRole.SchoolManager);
        Assert.Single(memberships, x => x.Role == SchoolRole.SchoolAdmin);
        Assert.Equal(2, memberships.Count(x => x.Role == SchoolRole.Instructor));
        Assert.Equal(4, memberships.Count(x => x.Role == SchoolRole.Student));
        foreach (var membership in memberships)
        {
            Assert.True(await database.UserClaims.AnyAsync(x => x.UserId == membership.UserId
                && x.ClaimType == DemoSchools.DisplayNameClaim && x.ClaimValue != null));
        }
    }

    [Fact]
    public async Task User_can_belong_to_multiple_schools_with_different_roles()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var admin = await users.FindByEmailAsync(ApiFixture.AdminEmail);
        Assert.NotNull(admin);
        var first = new DanceSchool { Name = "First", Slug = $"first-{Guid.NewGuid():N}" };
        var second = new DanceSchool { Name = "Second", Slug = $"second-{Guid.NewGuid():N}" };
        database.SchoolMemberships.AddRange(
            new SchoolMembership { School = first, UserId = admin.Id, Role = SchoolRole.Instructor },
            new SchoolMembership { School = second, UserId = admin.Id, Role = SchoolRole.Student });
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();

        var memberships = await database.SchoolMemberships.AsNoTracking()
            .Where(x => x.SchoolId == first.Id || x.SchoolId == second.Id).ToListAsync();
        Assert.Equal(2, memberships.Count);
        Assert.Contains(memberships, x => x.SchoolId == first.Id && x.Role == SchoolRole.Instructor);
        Assert.Contains(memberships, x => x.SchoolId == second.Id && x.Role == SchoolRole.Student);
    }

    [Fact]
    public async Task Database_rejects_duplicate_school_memberships()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var admin = await users.FindByEmailAsync(ApiFixture.AdminEmail);
        Assert.NotNull(admin);
        var school = new DanceSchool { Name = "Membership test", Slug = $"membership-{Guid.NewGuid():N}" };
        database.SchoolMemberships.Add(new SchoolMembership { School = school, UserId = admin.Id });
        await database.SaveChangesAsync();
        // Clear tracking to exercise the SQL constraint, rather than EF's identity map.
        database.ChangeTracker.Clear();
        database.SchoolMemberships.Add(new SchoolMembership { SchoolId = school.Id, UserId = admin.Id });
        await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("invalid", "Strong-Password1!")]
    [InlineData("seed@mdb.example", "weak")]
    public async Task Invalid_seed_configuration_does_not_delete_existing_data(string? email, string? password)
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var marker = new DanceSchool { Name = "Keep me", Slug = $"keep-{Guid.NewGuid():N}" };
        database.DanceSchools.Add(marker);
        await database.SaveChangesAsync();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["SeedAdmin:Email"] = email,
                ["SeedAdmin:Password"] = password
            }).Build();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DevelopmentData.RecreateAndSeedAsync(scope.ServiceProvider, configuration));

        Assert.True(await database.DanceSchools.AsNoTracking().AnyAsync(x => x.Id == marker.Id));
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        Assert.NotNull(await users.FindByEmailAsync(ApiFixture.AdminEmail));
    }
}
