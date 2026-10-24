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
