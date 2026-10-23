using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class MembershipsTests(ApiFixture fixture)
{
    [Fact]
    public async Task Manager_can_appoint_admin_but_cannot_appoint_managers_or_cross_schools()
    {
        using var platform = await fixture.CreateAdminClientAsync();
        var school = await CreateSchool(platform);
        var otherSchool = await CreateSchool(platform);
        var managerEmail = await Register(platform);
        var targetEmail = await Register(platform);
        Assert.Equal(HttpStatusCode.OK, (await Assign(platform, school.Id, managerEmail, "SchoolManager")).StatusCode);
        using var manager = await Login(managerEmail);

        Assert.Equal(HttpStatusCode.OK, (await Assign(manager, school.Id, targetEmail, "SchoolAdmin")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(manager, school.Id, targetEmail, "SchoolManager")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(manager, otherSchool.Id, targetEmail, "SchoolAdmin")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(manager, school.Id, managerEmail, "Student")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.GetAsync("/api/schools")).StatusCode);
    }

    [Fact]
    public async Task Studio_admin_can_assign_teachers_and_students_but_cannot_change_leadership()
    {
        using var platform = await fixture.CreateAdminClientAsync();
        var school = await CreateSchool(platform);
        var adminEmail = await Register(platform);
        var managerEmail = await Register(platform);
        var targetEmail = await Register(platform);
        (await Assign(platform, school.Id, adminEmail, "SchoolAdmin")).EnsureSuccessStatusCode();
        (await Assign(platform, school.Id, managerEmail, "SchoolManager")).EnsureSuccessStatusCode();
        using var admin = await Login(adminEmail);

        Assert.Equal(HttpStatusCode.OK, (await Assign(admin, school.Id, targetEmail, "Instructor")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Assign(admin, school.Id, targetEmail, "Student")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(admin, school.Id, targetEmail, "SchoolAdmin")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(admin, school.Id, managerEmail, "Student")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(admin, school.Id, adminEmail, "Student")).StatusCode);
    }

    [Fact]
    public async Task Directory_is_scoped_to_administered_schools_and_teachers_cannot_read_it()
    {
        using var platform = await fixture.CreateAdminClientAsync();
        var school = await CreateSchool(platform);
        var other = await CreateSchool(platform);
        var adminEmail = await Register(platform);
        var teacherEmail = await Register(platform);
        (await Assign(platform, school.Id, adminEmail, "SchoolAdmin")).EnsureSuccessStatusCode();
        (await Assign(platform, school.Id, teacherEmail, "Instructor")).EnsureSuccessStatusCode();
        (await Assign(platform, other.Id, teacherEmail, "Student")).EnsureSuccessStatusCode();
        using var admin = await Login(adminEmail);
        var directory = await admin.GetFromJsonAsync<List<MemberResponse>>("/api/memberships");
        Assert.NotNull(directory);
        Assert.Contains(directory, member => member.Email == teacherEmail);
        Assert.All(directory, member => Assert.Equal(school.Id, member.SchoolId));
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync($"/api/memberships?schoolId={other.Id}")).StatusCode);

        using var teacher = await Login(teacherEmail);
        Assert.Equal(HttpStatusCode.Forbidden, (await teacher.GetAsync("/api/memberships")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await teacher.GetAsync("/api/schools")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(teacher, school.Id, teacherEmail, "SchoolAdmin")).StatusCode);
    }

    [Fact]
    public async Task Membership_assignment_rejects_unknown_users_and_platform_role_names()
    {
        using var platform = await fixture.CreateAdminClientAsync();
        var school = await CreateSchool(platform);
        Assert.Equal(HttpStatusCode.NotFound, (await Assign(platform, school.Id, $"missing-{Guid.NewGuid():N}@mdb.example", "Student")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Assign(platform, school.Id, ApiFixture.AdminEmail, "PlatformAdmin")).StatusCode);
        using var anonymous = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/memberships")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Assign(anonymous, school.Id, ApiFixture.AdminEmail, "SchoolManager")).StatusCode);
    }

    private static async Task<SchoolResponse> CreateSchool(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/schools", new { name = "Membership School", slug = $"team-{Guid.NewGuid():N}" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SchoolResponse>())!;
    }

    private static async Task<string> Register(HttpClient client)
    {
        var email = $"member-{Guid.NewGuid():N}@mdb.example";
        (await client.PostAsJsonAsync("/auth/register", new { email, password = ApiFixture.AdminPassword })).EnsureSuccessStatusCode();
        return email;
    }

    private async Task<HttpClient> Login(string email)
    {
        var client = fixture.CreateClient();
        var tokens = await ApiFixture.LoginAsync(client, email, ApiFixture.AdminPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        return client;
    }

    private static Task<HttpResponseMessage> Assign(HttpClient client, Guid schoolId, string email, string role)
    {
        return client.PutAsJsonAsync("/api/memberships", new { schoolId, email, role });
    }

    private sealed record MemberResponse(Guid SchoolId, string SchoolName, string UserId, string Email, string Role);
}
