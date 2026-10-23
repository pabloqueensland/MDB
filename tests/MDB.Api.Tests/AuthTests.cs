using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace MDB.Api.Tests;

[Collection("API")]
public sealed class AuthTests(ApiFixture fixture)
{
    [Fact]
    public async Task Registration_login_and_account_lookup_work_together()
    {
        using var client = fixture.CreateClient();
        var email = $"auth-{Guid.NewGuid():N}@mdb.example";
        var credentials = new { email, password = ApiFixture.AdminPassword };

        var registration = await client.PostAsJsonAsync("/auth/register", credentials);
        Assert.Equal(HttpStatusCode.OK, registration.StatusCode);

        var duplicate = await client.PostAsJsonAsync("/auth/register", credentials);
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);

        var tokens = await ApiFixture.LoginAsync(client, email, credentials.password);
        Assert.Equal("Bearer", tokens.TokenType);
        Assert.False(string.IsNullOrWhiteSpace(tokens.RefreshToken));
        Assert.True(tokens.ExpiresIn > 0);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        var account = await client.GetFromJsonAsync<AccountResponse>("/api/me");
        Assert.NotNull(account);
        Assert.Equal(email, account.Email);
        Assert.False(string.IsNullOrWhiteSpace(account.Id));
    }

    [Theory]
    [InlineData("not-an-email", "Strong-Password1!")]
    [InlineData("valid@mdb.example", "weak")]
    [InlineData("", "")]
    public async Task Invalid_registration_returns_400(string email, string password)
    {
        using var client = fixture.CreateClient();
        var response = await client.PostAsJsonAsync("/auth/register", new { email, password });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Account_lookup_requires_a_valid_token()
    {
        using var client = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "invalid");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task Refresh_returns_a_working_token_and_rejects_invalid_tokens()
    {
        using var client = fixture.CreateClient();
        var tokens = await ApiFixture.LoginAsync(client, ApiFixture.AdminEmail, ApiFixture.AdminPassword);
        var response = await client.PostAsJsonAsync("/auth/refresh", new { refreshToken = tokens.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var renewed = await response.Content.ReadFromJsonAsync<TokenResponse>();
        Assert.NotNull(renewed);
        Assert.False(string.IsNullOrWhiteSpace(renewed.RefreshToken));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", renewed.AccessToken);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);

        var invalid = await client.PostAsJsonAsync("/auth/refresh", new { refreshToken = "invalid" });
        Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);
    }

    [Fact]
    public async Task Failed_password_attempts_lock_account_and_prevent_refresh()
    {
        using var client = fixture.CreateClient();
        var email = $"lockout-{Guid.NewGuid():N}@mdb.example";
        (await client.PostAsJsonAsync("/auth/register", new { email, password = ApiFixture.AdminPassword }))
            .EnsureSuccessStatusCode();
        var tokens = await ApiFixture.LoginAsync(client, email, ApiFixture.AdminPassword);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var wrong = await client.PostAsJsonAsync("/auth/login", new { email, password = "Wrong1!" });
            Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        }

        var correct = await client.PostAsJsonAsync("/auth/login", new { email, password = ApiFixture.AdminPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, correct.StatusCode);
        var refresh = await client.PostAsJsonAsync("/auth/refresh", new { refreshToken = tokens.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }
}
