using System.ComponentModel.DataAnnotations;
using MDB.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MDB.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController(
    UserManager<IdentityUser> users,
    SignInManager<IdentityUser> signIn,
    IOptionsMonitor<BearerTokenOptions> bearerOptions,
    TimeProvider clock,
    ApplicationDbContext database) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new IdentityUser { UserName = request.Email, Email = request.Email };
        var result = await users.CreateAsync(user, request.Password);
        if (result.Succeeded)
        {
            return Ok();
        }

        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(error.Code, error.Description);
        }
        return ValidationProblem(ModelState);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        signIn.AuthenticationScheme = IdentityConstants.BearerScheme;
        var result = await signIn.PasswordSignInAsync(
            request.Email, request.Password, isPersistent: false, lockoutOnFailure: true);
        // The bearer handler writes the token response on successful sign-in.
        return result.Succeeded ? new EmptyResult() : Unauthorized();
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request)
    {
        var ticket = bearerOptions.Get(IdentityConstants.BearerScheme)
            .RefreshTokenProtector.Unprotect(request.RefreshToken);
        if (ticket?.Properties.ExpiresUtc is not { } expires || expires <= clock.GetUtcNow())
        {
            return Unauthorized();
        }

        if (ticket.Principal.HasClaim(claim => claim.Type == PlatformUsersController.SessionClaim))
        {
            return Unauthorized();
        }

        var user = await signIn.ValidateSecurityStampAsync(ticket.Principal);
        if (user is null || !await signIn.CanSignInAsync(user) || await users.IsLockedOutAsync(user))
        {
            return Unauthorized();
        }

        var principal = await signIn.CreateUserPrincipalAsync(user);
        return SignIn(principal, new AuthenticationProperties(), IdentityConstants.BearerScheme);
    }

    [Authorize]
    [HttpGet("/api/me")]
    public async Task<IActionResult> Me()
    {
        var user = await users.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await users.GetRolesAsync(user);
        var memberships = await database.SchoolMemberships.AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .Select(x => new { x.SchoolId, SchoolName = x.School.Name, Role = x.Role.ToString() })
            .ToListAsync();
        return Ok(new { user.Id, user.Email, Roles = roles, Memberships = memberships });
    }
}

public sealed record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record RefreshRequest([Required] string RefreshToken);
