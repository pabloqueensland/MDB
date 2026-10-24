using System.Net;
using System.Net.Http.Json;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class MasteryTests(ApiFixture fixture)
{
    [Fact]
    public async Task Student_can_master_reload_and_unmaster_move_without_duplicate_links()
    {
        using var student = await fixture.CreateStudentClientAsync();
        var account = (await student.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        var scenario = await CreateScenario(account.Id);
        var path = $"/api/moves/{scenario.MoveId}/mastery";

        Assert.False(Assert.Single((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={scenario.SchoolId}"))!).IsMastered);
        Assert.Equal(HttpStatusCode.OK, (await student.PutAsJsonAsync(path, new { isMastered = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await student.PutAsJsonAsync(path, new { isMastered = true })).StatusCode);
        var reloaded = Assert.Single((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={scenario.SchoolId}"))!);
        Assert.True(reloaded.IsMastered);
        Assert.True(reloaded.CanMarkMastered);
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await database.StudentMoves.CountAsync(x => x.UserId == account.Id && x.MoveId == scenario.MoveId));

        Assert.Equal(HttpStatusCode.OK, (await student.PutAsJsonAsync(path, new { isMastered = false })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await student.PutAsJsonAsync(path, new { isMastered = false })).StatusCode);
        Assert.False(Assert.Single((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={scenario.SchoolId}"))!).IsMastered);
        Assert.Equal(0, await database.StudentMoves.CountAsync(x => x.UserId == account.Id && x.MoveId == scenario.MoveId));
    }

    [Fact]
    public async Task Mastery_is_owned_by_authenticated_student_and_requires_current_access()
    {
        using var first = await fixture.CreateStudentClientAsync();
        using var second = await fixture.CreateStudentClientAsync();
        var firstAccount = (await first.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        var secondAccount = (await second.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        var scenario = await CreateScenario(firstAccount.Id);
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        database.SchoolMemberships.Add(new SchoolMembership { SchoolId = scenario.SchoolId, UserId = secondAccount.Id });
        database.ClassEnrolments.Add(new ClassEnrolment { SchoolId = scenario.SchoolId, UserId = secondAccount.Id,
            StreamId = scenario.StreamId, ClassId = scenario.ClassId });
        await database.SaveChangesAsync();
        var path = $"/api/moves/{scenario.MoveId}/mastery";

        // A supplied userId is ignored; the endpoint uses the token's identity.
        (await first.PutAsJsonAsync(path, new { isMastered = true, userId = secondAccount.Id })).EnsureSuccessStatusCode();
        Assert.True(await database.StudentMoves.AnyAsync(x => x.MoveId == scenario.MoveId && x.UserId == firstAccount.Id));
        Assert.False(await database.StudentMoves.AnyAsync(x => x.MoveId == scenario.MoveId && x.UserId == secondAccount.Id));
        Assert.False(Assert.Single((await second.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={scenario.SchoolId}"))!).IsMastered);

        await database.ClassEnrolments.Where(x => x.UserId == firstAccount.Id && x.SchoolId == scenario.SchoolId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsActive, false));
        Assert.Equal(HttpStatusCode.Forbidden, (await first.PutAsJsonAsync(path, new { isMastered = false })).StatusCode);
    }

    [Fact]
    public async Task Anonymous_unassigned_and_staff_accounts_cannot_write_student_mastery()
    {
        using var enrolled = await fixture.CreateStudentClientAsync();
        var account = (await enrolled.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        var scenario = await CreateScenario(account.Id);
        var path = $"/api/moves/{scenario.MoveId}/mastery";
        using var anonymous = fixture.CreateClient();
        using var unassigned = await fixture.CreateStudentClientAsync();
        using var platform = await fixture.CreateAdminClientAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(path, new { isMastered = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await unassigned.PutAsJsonAsync(path, new { isMastered = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await platform.PutAsJsonAsync(path, new { isMastered = true })).StatusCode);

        var platformMoves = await platform.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={scenario.SchoolId}");
        Assert.False(Assert.Single(platformMoves!).CanMarkMastered);
    }

    private async Task<Scenario> CreateScenario(string userId)
    {
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = new DanceSchool { Name = "Mastery tests", Slug = $"mastery-{Guid.NewGuid():N}" };
        var stream = new DanceStream { Name = "Salsa On1", School = school };
        var move = new Move { Name = "Basic step", Level = 1m, School = school, VideoUrl = "" };
        var danceClass = new DanceClass { Name = "Salsa 1", Level = 1m, School = school, Stream = stream, Moves = [move] };
        database.DanceClasses.Add(danceClass);
        database.SchoolMemberships.Add(new SchoolMembership { School = school, UserId = userId });
        await database.SaveChangesAsync();
        database.ClassEnrolments.Add(new ClassEnrolment { SchoolId = school.Id, UserId = userId, StreamId = stream.Id, ClassId = danceClass.Id });
        await database.SaveChangesAsync();

        return new Scenario(school.Id, stream.Id, danceClass.Id, move.Id);
    }

    private sealed record Scenario(Guid SchoolId, Guid StreamId, Guid ClassId, Guid MoveId);
    private sealed record MoveItem(Guid Id, bool IsMastered, bool CanMarkMastered);
}
