using System.Net.Http.Headers;
using System.Net.Http.Json;
using MDB.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.MsSql;

namespace MDB.Api.Tests;

[CollectionDefinition("API")]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
}

public sealed class ApiFixture : IAsyncLifetime
{
    public const string AdminEmail = "admin@mdb.example";
    public const string AdminPassword = "Test-only-Admin-Password1!";

    private readonly MsSqlContainer sql = new MsSqlBuilder()
        .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
        .Build();
    private TestApiFactory? factory;

    public IServiceProvider Services => factory!.Services;

    public async Task InitializeAsync()
    {
        await sql.StartAsync();
        var connection = new SqlConnectionStringBuilder(sql.GetConnectionString())
        {
            InitialCatalog = "MDB_Tests"
        };
        factory = new TestApiFactory(connection.ConnectionString);
        using var scope = Services.CreateScope();
        var seedConfiguration = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["SeedAdmin:Email"] = AdminEmail,
                ["SeedAdmin:Password"] = AdminPassword
            }).Build();
        await DevelopmentData.RecreateAndSeedAsync(scope.ServiceProvider, seedConfiguration);
    }

    public HttpClient CreateClient() => factory!.CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false,
        HandleCookies = false
    });

    public async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = CreateClient();
        var tokens = await LoginAsync(client, AdminEmail, AdminPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        return client;
    }

    public async Task<HttpClient> CreateStudentClientAsync()
    {
        var client = CreateClient();
        var email = $"student-{Guid.NewGuid():N}@mdb.example";
        var response = await client.PostAsJsonAsync("/auth/register", new { email, password = AdminPassword });
        response.EnsureSuccessStatusCode();
        var tokens = await LoginAsync(client, email, AdminPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        return client;
    }

    public static async Task<TokenResponse> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TokenResponse>())!;
    }

    public async Task DisposeAsync()
    {
        if (factory is not null)
        {
            await factory.DisposeAsync();
        }
        await sql.DisposeAsync();
    }

    private sealed class TestApiFactory(string connectionString) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // Never run the app's Development startup against a developer's DB.
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ApplicationDbContext>();
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
            });
        }
    }
}

public sealed record TokenResponse(string TokenType, string AccessToken, string RefreshToken, int ExpiresIn);
public sealed record AccountResponse(string Id, string Email);
public sealed record SchoolResponse(Guid Id, string Name, string Slug);
