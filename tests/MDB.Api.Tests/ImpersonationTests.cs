using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class ImpersonationTests(ApiFixture fixture)
{
    [Fact]
    public async Task Only_platform_admin_can_list_users_and_start_impersonation()
    {
        using var anonymous = fixture.CreateClient();
        using var student = await fixture.CreateStudentClientAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/platform/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/platform/users/target/impersonate", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync("/api/platform/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.PostAsync("/api/platform/users/target/impersonate", null)).StatusCode);
    }

    [Fact]
    public async Task Impersonation_uses_target_permissions_and_stop_revokes_its_token()
    {
        using var admin = await fixture.CreateAdminClientAsync();
        using var target = await fixture.CreateStudentClientAsync();
        var account = await target.GetFromJsonAsync<AccountResponse>("/api/me");
        Assert.NotNull(account);
        var response = await admin.PostAsync($"/api/platform/users/{account.Id}/impersonate", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>();
        Assert.NotNull(tokens);
        Assert.Equal(900, tokens.ExpiresIn);
        Assert.Equal("", tokens.RefreshToken);
        using var impersonated = fixture.CreateClient();
        impersonated.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        Assert.Equal(account.Id, (await impersonated.GetFromJsonAsync<AccountResponse>("/api/me"))!.Id);
        Assert.Equal(HttpStatusCode.Forbidden, (await impersonated.GetAsync("/api/schools")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await impersonated.GetAsync("/api/memberships")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await impersonated.GetAsync("/api/platform/users")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await impersonated.PostAsync("/api/impersonation/stop", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await impersonated.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/platform/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await target.GetAsync("/api/me")).StatusCode);

        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var session = await database.ImpersonationSessions.SingleAsync(x => x.TargetUserId == account.Id);
        Assert.NotNull(session.EndedAt);
        Assert.NotEqual(session.AdminUserId, session.TargetUserId);
    }

    [Fact]
    public async Task Impersonating_an_admin_cannot_start_nested_impersonation()
    {
        using var original = await fixture.CreateAdminClientAsync();
        using var second = await CreateAdditionalAdmin();
        var account = await second.GetFromJsonAsync<AccountResponse>("/api/me");
        var response = await original.PostAsync($"/api/platform/users/{account!.Id}/impersonate", null);
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>();
        using var impersonated = fixture.CreateClient();
        impersonated.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await impersonated.PostAsync("/api/platform/users/any-id/impersonate", null)).StatusCode);
    }

    [Fact]
    public async Task Removing_actor_admin_role_revokes_impersonation_immediately()
    {
        using var actor = await CreateAdditionalAdmin();
        using var target = await fixture.CreateStudentClientAsync();
        var account = await target.GetFromJsonAsync<AccountResponse>("/api/me");
        var actorAccount = await actor.GetFromJsonAsync<AccountResponse>("/api/me");
        var response = await actor.PostAsync($"/api/platform/users/{account!.Id}/impersonate", null);
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>();
        using var scope = fixture.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var actorUser = await users.FindByIdAsync(actorAccount!.Id);
        Assert.True((await users.RemoveFromRoleAsync(actorUser!, PlatformRoles.Admin)).Succeeded);
        using var impersonated = fixture.CreateClient();
        impersonated.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        Assert.Equal(HttpStatusCode.Unauthorized, (await impersonated.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task Expired_session_is_rejected_even_if_access_token_has_not_expired()
    {
        using var admin = await fixture.CreateAdminClientAsync();
        using var target = await fixture.CreateStudentClientAsync();
        var account = await target.GetFromJsonAsync<AccountResponse>("/api/me");
        var response = await admin.PostAsync($"/api/platform/users/{account!.Id}/impersonate", null);
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>();
        using var scope = fixture.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var session = await database.ImpersonationSessions.SingleAsync(x => x.TargetUserId == account.Id);
        session.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await database.SaveChangesAsync();
        using var impersonated = fixture.CreateClient();
        impersonated.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        Assert.Equal(HttpStatusCode.Unauthorized, (await impersonated.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task All_users_includes_unassigned_demo_users_who_can_be_impersonated()
    {
        using var admin = await fixture.CreateAdminClientAsync();
        var people = await admin.GetFromJsonAsync<JsonElement[]>("/api/platform/users");
        var unassigned = Assert.Single(people!, person => person.GetProperty("email").GetString() == "indigo.sparks@mdb.example");
        Assert.Equal(0, unassigned.GetProperty("memberships").GetArrayLength());
        Assert.Equal(0, unassigned.GetProperty("roles").GetArrayLength());
        var response = await admin.PostAsync($"/api/platform/users/{unassigned.GetProperty("id").GetString()}/impersonate", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<HttpClient> CreateAdditionalAdmin()
    {
        var client = await fixture.CreateStudentClientAsync();
        var account = await client.GetFromJsonAsync<AccountResponse>("/api/me");
        using var scope = fixture.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var user = await users.FindByIdAsync(account!.Id);
        Assert.True((await users.AddToRoleAsync(user!, PlatformRoles.Admin)).Succeeded);
        var tokens = await ApiFixture.LoginAsync(client, account.Email, ApiFixture.AdminPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        return client;
    }
}
