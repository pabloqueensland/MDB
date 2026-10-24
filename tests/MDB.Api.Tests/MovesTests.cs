using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class MovesTests(ApiFixture fixture)
{
    [Theory]
    [InlineData("luna.vega@mdb.example")]
    [InlineData("jasper.wilde@mdb.example")]
    public async Task School_leaders_can_edit_own_moves_but_not_other_schools(string email)
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var schoolId = await database.DanceSchools.Where(x => x.Slug == "midnight-motion").Select(x => x.Id).SingleAsync();
        var otherSchool = new DanceSchool { Name = "Other edit school", Slug = $"edit-{Guid.NewGuid():N}" };
        var ownMove = new Move { Name = "Editable move", Level = 1, VideoUrl = "", SchoolId = schoolId };
        var otherMove = new Move { Name = "Private edit move", Level = 1, VideoUrl = "", School = otherSchool };
        database.Moves.AddRange(ownMove, otherMove);
        await database.SaveChangesAsync();
        using var client = await LoginDemo(email);
        var update = new { name = "Updated move", level = 1.5m, videoUrl = "https://example.com/demo.mp4", description = "Updated description", block = "B" };

        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync($"/api/moves/{ownMove.Id}", update)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync($"/api/moves/{otherMove.Id}", update)).StatusCode);
        await database.Entry(ownMove).ReloadAsync();
        Assert.Equal(update.name, ownMove.Name);
        Assert.Equal(update.level, ownMove.Level);
        Assert.Equal(update.videoUrl, ownMove.VideoUrl);
        Assert.Equal(update.description, ownMove.Description);
        Assert.Equal(update.block, ownMove.Block);
        await database.Entry(otherMove).ReloadAsync();
        Assert.Equal("Private edit move", otherMove.Name);
    }

    [Fact]
    public async Task Move_edits_require_authorized_roles_and_valid_input()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var schoolId = await database.DanceSchools.Where(x => x.Slug == "midnight-motion").Select(x => x.Id).SingleAsync();
        var move = new Move { Name = "Validation move", Level = 1, VideoUrl = "", SchoolId = schoolId };
        database.Moves.Add(move);
        await database.SaveChangesAsync();
        var path = $"/api/moves/{move.Id}";
        var valid = new { name = "Changed", level = 2m, videoUrl = "", block = "A" };
        using var anonymous = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(path, valid)).StatusCode);

        foreach (var email in new[] { "aria.sol@mdb.example", "nova.quinn@mdb.example" })
        {
            using var client = await LoginDemo(email);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync(path, valid)).StatusCode);
        }

        using var admin = await fixture.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(path, new { name = " ", level = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(path, new { name = "Changed", level = -1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(path, new { name = "Changed", level = 1.123m })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(path, new { name = "Changed", level = 1, videoUrl = "javascript:alert(1)" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(path, new { name = "Changed", level = 1, block = string.Join(" ", Enumerable.Repeat("word", 21)) })).StatusCode);
        await database.Entry(move).ReloadAsync();
        Assert.Equal("Validation move", move.Name);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync(path, valid)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync($"/api/moves/{Guid.NewGuid()}", valid)).StatusCode);
    }

    [Fact]
    public async Task Anonymous_requests_are_rejected_and_unassigned_users_see_no_moves()
    {
        using var anonymous = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/moves")).StatusCode);
        using var unassigned = await fixture.CreateStudentClientAsync();
        var moves = await unassigned.GetFromJsonAsync<List<MoveResponse>>("/api/moves");
        Assert.NotNull(moves);
        Assert.Empty(moves);
    }

    [Fact]
    public async Task Platform_admin_can_fetch_seeded_salsa_moves_by_class()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var danceClass = await database.DanceClasses.AsNoTracking()
            .SingleAsync(x => x.Name == "Salsa 1.5" && x.School.Slug == "midnight-motion");
        using var admin = await fixture.CreateAdminClientAsync();
        var moves = await admin.GetFromJsonAsync<List<MoveResponse>>($"/api/moves?classId={danceClass.Id}");
        Assert.NotNull(moves);
        Assert.Equal(37, moves.Count);
        Assert.All(moves, move =>
        {
            Assert.Equal(1.5m, move.Level);
            Assert.Equal("Midnight Motion", move.SchoolName);
            Assert.Contains(move.Classes, item => item.Id == danceClass.Id);
        });
    }

    [Fact]
    public async Task School_member_sees_own_school_moves_but_not_another_schools_moves()
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var otherSchool = new DanceSchool { Name = "Private school", Slug = $"private-moves-{Guid.NewGuid():N}" };
        var privateMove = new Move { Name = "Private move", Level = 2m, VideoUrl = "", School = otherSchool };
        database.Moves.Add(privateMove);
        await database.SaveChangesAsync();
        using var teacher = await LoginDemo("aria.sol@mdb.example");
        var moves = await teacher.GetFromJsonAsync<List<MoveResponse>>("/api/moves");
        Assert.NotNull(moves);
        Assert.NotEmpty(moves);
        Assert.All(moves, move => Assert.Equal("Midnight Motion", move.SchoolName));
        Assert.DoesNotContain(moves, move => move.Id == privateMove.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await teacher.GetAsync($"/api/moves?schoolId={otherSchool.Id}")).StatusCode);
        using var admin = await fixture.CreateAdminClientAsync();
        var all = await admin.GetFromJsonAsync<List<MoveResponse>>("/api/moves");
        Assert.Contains(all!, move => move.Id == privateMove.Id);
    }

    [Fact]
    public async Task Enrolled_salsa_student_can_browse_seeded_salsa_moves()
    {
        using var student = await LoginDemo("nova.quinn@mdb.example");
        var moves = await student.GetFromJsonAsync<List<MoveResponse>>("/api/moves");
        Assert.NotNull(moves);
        Assert.NotEmpty(moves);
        Assert.All(moves, move => Assert.Equal("Midnight Motion", move.SchoolName));
    }

    private async Task<HttpClient> LoginDemo(string email)
    {
        var client = fixture.CreateClient();
        var tokens = await ApiFixture.LoginAsync(client, email, "Test-only-Demo-Password1!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        return client;
    }

    private sealed record ClassResponse(Guid Id, string Name, decimal Level);
    private sealed record MoveResponse(Guid Id, string Name, decimal Level, string VideoUrl, string SchoolName, List<ClassResponse> Classes);
}
