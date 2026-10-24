using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class ClassMoveTests(ApiFixture fixture)
{
    [Fact]
    public async Task Salsa_2_seed_preserves_blocks_and_does_not_duplicate_tow_truck()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var danceClass = await database.DanceClasses.Include(x => x.Moves)
            .SingleAsync(x => x.Name == "Salsa 2" && x.School.Slug == "midnight-motion");

        Assert.Equal(24, danceClass.Moves.Count);
        Assert.Single(danceClass.Moves, x => x.Name == "Tow Truck");
        Assert.DoesNotContain(danceClass.Moves, x => x.Name == "Revision");
        Assert.Contains(danceClass.Moves, x => x.Name == "Push Turn" && x.Block == "E");
        Assert.Contains(danceClass.Moves, x => x.Name == "Shadow Flick" && x.Block == "F");
        Assert.All(danceClass.Moves, move =>
        {
            Assert.Equal(2m, move.Level);
            Assert.Equal(danceClass.SchoolId, move.SchoolId);
        });
    }

    [Fact]
    public async Task Salsa_15_seed_contains_unique_moves_linked_to_midnight_motion()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var danceClass = await database.DanceClasses.Include(x => x.Moves)
            .SingleAsync(x => x.Name == "Salsa 1.5" && x.School.Slug == "midnight-motion");

        Assert.Equal(37, danceClass.Moves.Count);
        Assert.Equal(37, danceClass.Moves.Select(x => x.Name).Distinct().Count());
        Assert.Contains(danceClass.Moves, x => x.Name == "Hammerlock");
        Assert.Contains(danceClass.Moves, x => x.Name == "Hair Combs");
        Assert.Contains(danceClass.Moves, x => x.Name == "Spot Turn");
        Assert.All(danceClass.Moves, move =>
        {
            Assert.Equal(1.5m, move.Level);
            Assert.Equal(danceClass.SchoolId, move.SchoolId);
            Assert.Equal(string.Empty, move.VideoUrl);
            Assert.Contains(move.Block, new[] { "A", "B", "C", "D", "E", "F" });
        });
    }

    [Fact]
    public async Task Classes_can_share_moves_and_preserve_fractional_levels()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = new DanceSchool { Name = "Class test", Slug = $"classes-{Guid.NewGuid():N}" };
        var stream = new DanceStream { Name = "Bachata", School = school };
        var basic = new Move { Name = "Basic step", Level = 1m, VideoUrl = "https://example.com/basic.mp4", School = school };
        var turn = new Move { Name = "Right turn", Level = 1.5m, VideoUrl = "https://example.com/turn.mp4", School = school };
        var first = new DanceClass { Name = "Bachata 1", Level = 1m, School = school, Stream = stream, Moves = [basic] };
        var silver = new DanceClass { Name = "Bachata Silver", Level = 1.5m, School = school, Stream = stream, Moves = [basic, turn] };
        database.DanceClasses.AddRange(first, silver);
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();

        var saved = await database.DanceClasses.Include(x => x.Moves).SingleAsync(x => x.Id == silver.Id);
        Assert.Equal(1.5m, saved.Level);
        Assert.Equal(2, saved.Moves.Count);
        var shared = await database.Moves.Include(x => x.Classes).SingleAsync(x => x.Id == basic.Id);
        Assert.Equal(2, shared.Classes.Count);
    }

    [Fact]
    public async Task Database_rejects_links_between_different_schools()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var first = new DanceSchool { Name = "First", Slug = $"class-first-{Guid.NewGuid():N}" };
        var second = new DanceSchool { Name = "Second", Slug = $"class-second-{Guid.NewGuid():N}" };
        var danceClass = new DanceClass { Name = "Bachata 1", Level = 1m, School = first,
            Stream = new DanceStream { Name = "Bachata", School = first } };
        var move = new Move { Name = "Other school's move", Level = 1m, VideoUrl = "https://example.com/move.mp4", School = second };
        database.DanceClasses.Add(danceClass);
        database.Moves.Add(move);
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();
        database.ClassMoves.Add(new ClassMove { SchoolId = first.Id, ClassId = danceClass.Id, MoveId = move.Id });

        await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());
    }
}
