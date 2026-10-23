using System.ComponentModel.DataAnnotations;
using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace MDB.Api.Data;

public static class DevelopmentData
{
    public static async Task RecreateAndSeedAsync(IServiceProvider services, IConfiguration configuration)
    {
        var email = configuration["SeedAdmin:Email"];
        var password = configuration["SeedAdmin:Password"];
        var demoPassword = configuration["SeedDemo:Password"];
        if (string.IsNullOrWhiteSpace(email) || !new EmailAddressAttribute().IsValid(email)
            || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Set SeedAdmin:Email and SeedAdmin:Password before recreating the development database.");
        }

        var users = services.GetRequiredService<UserManager<IdentityUser>>();
        var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
        // Validate credentials before deleting any existing data.
        foreach (var validator in users.PasswordValidators)
        {
            RequireSuccess(await validator.ValidateAsync(users, user, password));
        }

        if (string.IsNullOrWhiteSpace(demoPassword))
        {
            throw new InvalidOperationException("Set SeedDemo:Password before recreating the development database.");
        }
        foreach (var validator in users.PasswordValidators)
        {
            RequireSuccess(await validator.ValidateAsync(users, new IdentityUser { UserName = "demo@mdb.example", Email = "demo@mdb.example" }, demoPassword));
        }

        var database = services.GetRequiredService<ApplicationDbContext>();
        await database.Database.EnsureDeletedAsync();
        await database.Database.EnsureCreatedAsync();

        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        RequireSuccess(await roles.CreateAsync(new IdentityRole(PlatformRoles.Admin)));
        RequireSuccess(await users.CreateAsync(user, password));
        RequireSuccess(await users.AddToRoleAsync(user, PlatformRoles.Admin));
        await DemoSchools.SeedAsync(database, users, demoPassword);
    }

    private static void RequireSuccess(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(error => error.Description)));
        }
    }
}
