using System.Net;
using System.Net.Http.Json;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class StreamsTests(ApiFixture fixture)
{
    [Theory]
    [InlineData(SchoolRole.SchoolManager, HttpStatusCode.Created)]
    [InlineData(SchoolRole.SchoolAdmin, HttpStatusCode.Created)]
    [InlineData(SchoolRole.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(SchoolRole.Student, HttpStatusCode.Forbidden)]
    public async Task School_roles_control_stream_and_class_creation(SchoolRole role, HttpStatusCode expected)
    {
        using var caller = await fixture.CreateStudentClientAsync();
        var account = (await caller.GetFromJsonAsync<AccountResponse>("/api/me"))!;
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var school = new DanceSchool { Name = "Curriculum permissions", Slug = $"curriculum-{Guid.NewGuid():N}" };
        var existing = new DanceStream { Name = "Existing stream", School = school };
        database.DanceStreams.Add(existing);
        database.SchoolMemberships.Add(new SchoolMembership { School = school, UserId = account.Id, Role = role });
        await database.SaveChangesAsync();

        var stream = await caller.PostAsJsonAsync($"/api/schools/{school.Id}/streams", new { name = "Salsa On2" });
        var danceClass = await caller.PostAsJsonAsync($"/api/schools/{school.Id}/streams/{existing.Id}/classes", new { name = "Silver", level = 1.5m });
        Assert.Equal(expected, stream.StatusCode);
        Assert.Equal(expected, danceClass.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await caller.PostAsJsonAsync($"/api/schools/{Guid.NewGuid()}/streams", new { name = "Other school" })).StatusCode);
    }

    [Fact]
    public async Task Platform_admin_can_create_streams_and_fractional_classes_and_read_them_back()
    {
        using var admin = await fixture.CreateAdminClientAsync();
        var schoolResponse = await admin.PostAsJsonAsync("/api/schools", new { name = "Stream test", slug = $"stream-test-{Guid.NewGuid():N}" });
        var school = (await schoolResponse.Content.ReadFromJsonAsync<SchoolResponse>())!;
        var response = await admin.PostAsJsonAsync($"/api/schools/{school.Id}/streams", new { name = "  Bachata  " });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var stream = (await response.Content.ReadFromJsonAsync<StreamItem>())!;
        Assert.Equal("Bachata", stream.Name);
        var created = await admin.PostAsJsonAsync($"/api/schools/{school.Id}/streams/{stream.Id}/classes", new { name = "Bachata Silver", level = 1.5m });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var available = await admin.GetFromJsonAsync<List<StreamItem>>($"/api/schools/{school.Id}/streams");
        var saved = Assert.Single(available!);
        var danceClass = Assert.Single(saved.Classes);
        Assert.Equal("Bachata Silver", danceClass.Name);
        Assert.Equal(1.5m, danceClass.Level);
        var duplicate = await admin.PostAsJsonAsync($"/api/schools/{school.Id}/streams", new { name = "bachata" });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task Invalid_input_and_cross_school_class_links_are_rejected()
    {
        using var admin = await fixture.CreateAdminClientAsync();
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var first = new DanceSchool { Name = "First", Slug = $"streams-first-{Guid.NewGuid():N}" };
        var second = new DanceSchool { Name = "Second", Slug = $"streams-second-{Guid.NewGuid():N}" };
        var stream = new DanceStream { Name = "Bachata", School = first };
        database.DanceStreams.Add(stream);
        database.DanceSchools.Add(second);
        await database.SaveChangesAsync();

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/schools/{first.Id}/streams", new { name = "   " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/schools/{first.Id}/streams/{stream.Id}/classes", new { name = "Bad level", level = 1.555m })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/schools/{first.Id}/streams/{stream.Id}/classes", new { name = "Bad level", level = -1m })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"/api/schools/{second.Id}/streams/{stream.Id}/classes", new { name = "Wrong school", level = 1m })).StatusCode);
        using var anonymous = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync($"/api/schools/{first.Id}/streams", new { name = "No access" })).StatusCode);
    }

    private sealed record StreamItem(Guid Id, string Name, List<ClassItem> Classes);
    private sealed record ClassItem(Guid Id, string Name, decimal Level);
}
