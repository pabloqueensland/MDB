using System.Net;
using System.Net.Http.Json;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class EnrolmentsTests(ApiFixture fixture)
{
    [Fact]
    public async Task Access_uses_active_enrolled_class_level_and_stream_not_move_level()
    {
        using var student = await fixture.CreateStudentClientAsync();
        var account = (await student.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = new DanceSchool { Name = "Access test", Slug = $"access-{Guid.NewGuid():N}" };
        var salsa = new DanceStream { Name = "Salsa On1", School = school };
        var on2 = new DanceStream { Name = "Salsa On2", School = school };
        var bachata = new DanceStream { Name = "Bachata", School = school };
        var lower = ClassWithMove(school, salsa, "Salsa 1", 1m);
        var current = ClassWithMove(school, salsa, "Salsa 1.5", 1.5m);
        var higher = ClassWithMove(school, salsa, "Salsa 2", 2m);
        var on2Class = ClassWithMove(school, on2, "Salsa On2 1", 1m);
        var bachata1 = ClassWithMove(school, bachata, "Bachata 1", 1m);
        var bachata4 = ClassWithMove(school, bachata, "Bachata 4", 4m);
        database.DanceClasses.AddRange(lower, current, higher, on2Class, bachata1, bachata4);
        database.SchoolMemberships.Add(new SchoolMembership { School = school, UserId = account.Id });
        await database.SaveChangesAsync();
        using var admin = await fixture.CreateAdminClientAsync();

        Assert.Empty((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}"))!);
        (await Save(admin, school.Id, account.Id, salsa.Id, current.Id, true)).EnsureSuccessStatusCode();
        var moves = await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}");
        Assert.Equal(new[] { "Salsa 1", "Salsa 1.5" }, moves!.Select(x => x.Name).OrderBy(x => x).ToArray());
        Assert.Empty((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}&classId={higher.Id}"))!);
        Assert.Empty((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}&streamId={on2.Id}"))!);

        (await Save(admin, school.Id, account.Id, salsa.Id, current.Id, false)).EnsureSuccessStatusCode();
        Assert.Empty((await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}"))!);
        (await Save(admin, school.Id, account.Id, bachata.Id, bachata4.Id, true)).EnsureSuccessStatusCode();
        moves = await student.GetFromJsonAsync<List<MoveItem>>($"/api/moves?schoolId={school.Id}");
        Assert.Equal(new[] { "Bachata 1", "Bachata 4" }, moves!.Select(x => x.Name).OrderBy(x => x).ToArray());
    }

    [Fact]
    public async Task Enrolments_are_school_scoped_admin_managed_and_student_readable()
    {
        using var student = await fixture.CreateStudentClientAsync();
        var account = (await student.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        using var admin = await fixture.CreateAdminClientAsync();
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var danceClass = await database.DanceClasses.SingleAsync(x => x.Name == "Salsa 1.5" && x.School.Slug == "midnight-motion");
        var otherStream = await database.DanceStreams.SingleAsync(x => x.SchoolId == danceClass.SchoolId && x.Name == "Bachata");
        (await admin.PutAsJsonAsync("/api/memberships", new { danceClass.SchoolId, account.Email, role = "Student" })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await Save(student, danceClass.SchoolId, account.Id, danceClass.StreamId, danceClass.Id, true)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(admin, danceClass.SchoolId, account.Id, otherStream.Id, danceClass.Id, true)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync($"/api/enrolments?schoolId={danceClass.SchoolId}&userId=another-user")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Save(admin, danceClass.SchoolId, account.Id, danceClass.StreamId, danceClass.Id, true)).StatusCode);
        var enrolments = await student.GetFromJsonAsync<List<EnrolmentItem>>($"/api/enrolments?schoolId={danceClass.SchoolId}&userId={account.Id}");
        Assert.Single(enrolments!);
        Assert.Equal(danceClass.StreamId, enrolments![0].StreamId);

        (await Save(admin, danceClass.SchoolId, account.Id, danceClass.StreamId, danceClass.Id, false)).EnsureSuccessStatusCode();
        enrolments = await student.GetFromJsonAsync<List<EnrolmentItem>>($"/api/enrolments?schoolId={danceClass.SchoolId}&userId={account.Id}");
        Assert.Single(enrolments!);
        Assert.False(enrolments![0].IsActive);
    }

    [Fact]
    public async Task Database_rejects_enrolment_with_class_from_another_stream()
    {
        using var student = await fixture.CreateStudentClientAsync();
        var account = (await student.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var danceClass = await database.DanceClasses.SingleAsync(x => x.Name == "Salsa 1.5" && x.School.Slug == "midnight-motion");
        var otherStream = await database.DanceStreams.SingleAsync(x => x.SchoolId == danceClass.SchoolId && x.Name == "Bachata");
        database.SchoolMemberships.Add(new SchoolMembership { SchoolId = danceClass.SchoolId, UserId = account.Id });
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();
        database.ClassEnrolments.Add(new ClassEnrolment { SchoolId = danceClass.SchoolId, UserId = account.Id,
            StreamId = otherStream.Id, ClassId = danceClass.Id });

        await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());
    }

    [Theory]
    [InlineData(SchoolRole.SchoolManager, HttpStatusCode.OK)]
    [InlineData(SchoolRole.SchoolAdmin, HttpStatusCode.OK)]
    [InlineData(SchoolRole.Instructor, HttpStatusCode.Forbidden)]
    public async Task School_roles_control_enrolment_management(SchoolRole role, HttpStatusCode expected)
    {
        using var caller = await fixture.CreateStudentClientAsync();
        using var student = await fixture.CreateStudentClientAsync();
        var actor = (await caller.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        var target = (await student.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = new DanceSchool { Name = "Enrolment roles", Slug = $"enrol-roles-{Guid.NewGuid():N}" };
        var stream = new DanceStream { Name = "Bachata", School = school };
        var danceClass = ClassWithMove(school, stream, "Bachata 1", 1m);
        database.DanceClasses.Add(danceClass);
        database.SchoolMemberships.AddRange(
            new SchoolMembership { School = school, UserId = actor.Id, Role = role },
            new SchoolMembership { School = school, UserId = target.Id, Role = SchoolRole.Student });
        await database.SaveChangesAsync();

        Assert.Equal(expected, (await Save(caller, school.Id, target.Id, stream.Id, danceClass.Id, true)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await Save(caller, Guid.NewGuid(), target.Id, stream.Id, danceClass.Id, true)).StatusCode);
    }

    private static DanceClass ClassWithMove(DanceSchool school, DanceStream stream, string name, decimal level)
    {
        return new DanceClass { Name = name, Level = level, School = school, Stream = stream,
            Moves = [new Move { Name = name, Level = 999m, School = school, VideoUrl = "" }] };
    }

    private static Task<HttpResponseMessage> Save(HttpClient client, Guid schoolId, string userId, Guid streamId, Guid classId, bool isActive)
    {
        return client.PutAsJsonAsync("/api/enrolments", new { schoolId, userId, streamId, classId, isActive });
    }

    private sealed record MoveItem(Guid Id, string Name);
    private sealed record EnrolmentItem(Guid StreamId, Guid ClassId, bool IsActive);
}
