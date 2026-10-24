using System.Security.Claims;
using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace MDB.Api.Data;

public static class DemoSchools
{
    public const string DisplayNameClaim = "display_name";

    private static readonly SchoolSeed[] Schools =
    [
        new("Midnight Motion", "midnight-motion",
        [
            new("Luna Vega", "luna.vega", SchoolRole.SchoolManager),
            new("Jasper Wilde", "jasper.wilde", SchoolRole.SchoolAdmin),
            new("Aria Sol", "aria.sol", SchoolRole.Instructor),
            new("Nico Blaze", "nico.blaze", SchoolRole.Instructor),
            new("Nova Quinn", "nova.quinn", SchoolRole.Student),
            new("Leo Sterling", "leo.sterling", SchoolRole.Student),
            new("Ivy Moon", "ivy.moon", SchoolRole.Student),
            new("Zane River", "zane.river", SchoolRole.Student)
        ]),
        new("Velvet Tempo", "velvet-tempo",
        [
            new("Sienna Vale", "sienna.vale", SchoolRole.SchoolManager),
            new("Felix Knight", "felix.knight", SchoolRole.SchoolAdmin),
            new("Maya Cruz", "maya.cruz", SchoolRole.Instructor),
            new("Dante Rhodes", "dante.rhodes", SchoolRole.Instructor),
            new("Cleo Hart", "cleo.hart", SchoolRole.Student),
            new("Kai Phoenix", "kai.phoenix", SchoolRole.Student),
            new("Ruby Wren", "ruby.wren", SchoolRole.Student),
            new("Atlas Reed", "atlas.reed", SchoolRole.Student)
        ]),
        new("Neon Rhythm Collective", "neon-rhythm-collective",
        [
            new("Rafael Storm", "rafael.storm", SchoolRole.SchoolManager),
            new("Esme Fox", "esme.fox", SchoolRole.SchoolAdmin),
            new("Zara Lux", "zara.lux", SchoolRole.Instructor),
            new("Miles Orion", "miles.orion", SchoolRole.Instructor),
            new("Freya Skye", "freya.skye", SchoolRole.Student),
            new("Ezra Sage", "ezra.sage", SchoolRole.Student),
            new("Thea Bloom", "thea.bloom", SchoolRole.Student),
            new("Jett Wilder", "jett.wilder", SchoolRole.Student)
        ])
    ];

    public static async Task SeedAsync(ApplicationDbContext database, UserManager<IdentityUser> users, string password)
    {
        foreach (var seed in Schools)
        {
            var school = new DanceSchool { Name = seed.Name, Slug = seed.Slug };
            database.DanceSchools.Add(school);

            if (seed.Slug == "midnight-motion")
            {
                var salsa = new DanceStream { Name = "Salsa On1", School = school };
                var salsaOn2 = new DanceStream { Name = "Salsa On2", School = school };
                var bachata = new DanceStream { Name = "Bachata", School = school };
                school.Streams.Add(salsa);
                school.Streams.Add(salsaOn2);
                school.Streams.Add(bachata);
                school.Classes.Add(new DanceClass { Name = "Salsa 1", Level = 1m, School = school, Stream = salsa });
                school.Classes.Add(new DanceClass
                {
                    Name = "Salsa 1.5",
                    Level = 1.5m,
                    School = school,
                    Stream = salsa,
                    Moves = Salsa15Moves.Create(school)
                });
                school.Classes.Add(new DanceClass { Name = "Salsa 2", Level = 2m, School = school, Stream = salsa });
                school.Classes.Add(new DanceClass { Name = "Salsa On2 1", Level = 1m, School = school, Stream = salsaOn2 });
                school.Classes.Add(new DanceClass { Name = "Bachata 1", Level = 1m, School = school, Stream = bachata });
                school.Classes.Add(new DanceClass { Name = "Bachata 4", Level = 4m, School = school, Stream = bachata });
            }

            foreach (var person in seed.People)
            {
                var email = $"{person.Alias}@mdb.example";
                var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
                RequireSuccess(await users.CreateAsync(user, password));
                RequireSuccess(await users.AddClaimAsync(user, new Claim(DisplayNameClaim, person.Name)));
                var membership = new SchoolMembership
                {
                    School = school,
                    UserId = user.Id,
                    Role = person.Role
                };
                database.SchoolMemberships.Add(membership);

                if (seed.Slug == "midnight-motion" && person.Role == SchoolRole.Student)
                {
                    var className = person.Alias switch
                    {
                        "nova.quinn" => "Salsa 1.5",
                        "leo.sterling" => "Salsa 1",
                        "ivy.moon" => "Bachata 4",
                        _ => "Salsa 2"
                    };
                    var enrolledClass = school.Classes.Single(x => x.Name == className);
                    database.ClassEnrolments.Add(new ClassEnrolment
                    {
                        SchoolId = school.Id, UserId = user.Id,
                        StreamId = enrolledClass.Stream.Id, ClassId = enrolledClass.Id,
                        Membership = membership, Class = enrolledClass
                    });
                }
            }
        }

        await database.SaveChangesAsync();

        PersonSeed[] unassigned =
        [
            new("Indigo Sparks", "indigo.sparks", SchoolRole.Student),
            new("Romy Starlight", "romy.starlight", SchoolRole.Student),
            new("Orion Chase", "orion.chase", SchoolRole.Student)
        ];
        foreach (var person in unassigned)
        {
            var email = $"{person.Alias}@mdb.example";
            var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            RequireSuccess(await users.CreateAsync(user, password));
            RequireSuccess(await users.AddClaimAsync(user, new Claim(DisplayNameClaim, person.Name)));
        }
    }

    private static void RequireSuccess(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(error => error.Description)));
        }
    }

    private sealed record SchoolSeed(string Name, string Slug, PersonSeed[] People);
    private sealed record PersonSeed(string Name, string Alias, SchoolRole Role);
}
