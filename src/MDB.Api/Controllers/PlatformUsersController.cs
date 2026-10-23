using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize(Roles = PlatformRoles.Admin)]
[Route("api/platform/users")]
public sealed class PlatformUsersController(ApplicationDbContext database, UserManager<IdentityUser> users,
    SignInManager<IdentityUser> signIn, IOptionsMonitor<BearerTokenOptions> bearerOptions, TimeProvider clock) : ControllerBase
{
    public const string SessionClaim = "mdb_impersonation_session";

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var people = await database.Users.AsNoTracking().OrderBy(x => x.Email)
            .Select(x => new
            {
                x.Id, x.Email,
                Name = database.UserClaims.Where(c => c.UserId == x.Id && c.ClaimType == DemoSchools.DisplayNameClaim)
                    .Select(c => c.ClaimValue).FirstOrDefault() ?? x.Email,
                Roles = database.UserRoles.Where(r => r.UserId == x.Id)
                    .Join(database.Roles, r => r.RoleId, r => r.Id, (link, role) => role.Name).ToList(),
                Memberships = database.SchoolMemberships.Where(m => m.UserId == x.Id)
                    .Select(m => new { m.SchoolId, SchoolName = m.School.Name, Role = m.Role.ToString() }).ToList()
            }).ToListAsync(cancellationToken);
        return Ok(people);
    }

    [HttpPost("{id}/impersonate")]
    public async Task<IActionResult> Impersonate(string id, CancellationToken cancellationToken)
    {
        if (User.HasClaim(claim => claim.Type == SessionClaim))
        {
            return Forbid();
        }
        var admin = await users.GetUserAsync(User);
        if (admin is null || !await users.IsInRoleAsync(admin, PlatformRoles.Admin)
            || await users.IsLockedOutAsync(admin))
        {
            return Forbid();
        }
        if (admin.Id == id)
        {
            return BadRequest(new ProblemDetails { Title = "You are already signed in as this user." });
        }
        var target = await users.FindByIdAsync(id);
        if (target is null)
        {
            return NotFound();
        }
        if (!await signIn.CanSignInAsync(target) || await users.IsLockedOutAsync(target))
        {
            return Conflict(new ProblemDetails { Title = "This user cannot currently sign in." });
        }
        var now = clock.GetUtcNow();
        var session = new ImpersonationSession
        {
            AdminUserId = admin.Id, TargetUserId = target.Id,
            AdminSecurityStamp = await users.GetSecurityStampAsync(admin),
            StartedAt = now, ExpiresAt = now.AddMinutes(15)
        };
        database.ImpersonationSessions.Add(session);
        await database.SaveChangesAsync(cancellationToken);
        var principal = await signIn.CreateUserPrincipalAsync(target);
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(SessionClaim, session.Id.ToString()));
        var ticket = new AuthenticationTicket(principal,
            new AuthenticationProperties { ExpiresUtc = session.ExpiresAt }, IdentityConstants.BearerScheme);
        var accessToken = bearerOptions.Get(IdentityConstants.BearerScheme).BearerTokenProtector.Protect(ticket);
        return Ok(new { tokenType = "Bearer", accessToken, expiresIn = 900, refreshToken = "" });
    }
}
