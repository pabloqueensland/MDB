using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MDB.Api.Models;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class SchoolsTests(ApiFixture fixture)
{
    [Fact]
    public async Task Seeded_admin_can_create_and_retrieve_school()
    {
        using var client = await fixture.CreateAdminClientAsync();
        var slug = $"school-{Guid.NewGuid():N}";
        var response = await client.PostAsJsonAsync("/api/schools", new { name = "  Brisbane Salsa  ", slug = slug.ToUpperInvariant() });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var school = await response.Content.ReadFromJsonAsync<SchoolResponse>();
        Assert.NotNull(school);
        Assert.NotEqual(Guid.Empty, school.Id);
        Assert.Equal("Brisbane Salsa", school.Name);
        Assert.Equal(slug, school.Slug);
        Assert.NotNull(response.Headers.Location);
        var saved = await client.GetFromJsonAsync<SchoolResponse>(response.Headers.Location);
        Assert.Equal(school, saved);
    }

    [Fact]
    public async Task Anonymous_requests_cannot_manage_schools()
    {
        using var client = fixture.CreateClient();
        var create = await client.PostAsJsonAsync("/api/schools", new { name = "School", slug = "school" });
        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/schools/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Public_registration_cannot_grant_platform_admin()
    {
        using var client = fixture.CreateClient();
        var email = $"escalation-{Guid.NewGuid():N}@mdb.example";
        var response = await client.PostAsJsonAsync("/auth/register", new
        {
            email, password = ApiFixture.AdminPassword, role = "PlatformAdmin", roles = new[] { "PlatformAdmin" }
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = fixture.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var user = await users.FindByEmailAsync(email);
        Assert.NotNull(user);
        Assert.False(await users.IsInRoleAsync(user, PlatformRoles.Admin));
    }

    [Fact]
    public async Task Ordinary_user_cannot_create_or_read_schools()
    {
        using var client = await fixture.CreateStudentClientAsync();
        var create = await client.PostAsJsonAsync("/api/schools", new { name = "School", slug = "school" });
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/schools/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Duplicate_slug_returns_409_even_with_different_casing()
    {
        using var client = await fixture.CreateAdminClientAsync();
        var slug = $"duplicate-{Guid.NewGuid():N}";
        var first = await client.PostAsJsonAsync("/api/schools", new { name = "First School", slug });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var duplicate = await client.PostAsJsonAsync("/api/schools", new { name = "Second School", slug = slug.ToUpperInvariant() });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Theory]
    [InlineData("", "valid-slug")]
    [InlineData("   ", "valid-slug")]
    [InlineData("School", "")]
    [InlineData("School", "bad slug")]
    [InlineData("School", "bad--slug")]
    [InlineData("School", "-bad-slug")]
    public async Task Invalid_school_returns_400(string name, string slug)
    {
        using var client = await fixture.CreateAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/schools", new { name, slug });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Oversized_school_fields_return_400()
    {
        using var client = await fixture.CreateAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/schools", new { name = new string('n', 201), slug = new string('s', 101) });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Missing_school_returns_404_for_admin()
    {
        using var client = await fixture.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/schools/{Guid.NewGuid()}")).StatusCode);
    }
}
