using System.Security.Claims;
using MDB.Api.Controllers;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api;

public sealed class ImpersonationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ApplicationDbContext database,
        UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn, TimeProvider clock)
    {
        var sessionValue = context.User.FindFirstValue(PlatformUsersController.SessionClaim);
        if (sessionValue is null)
        {
            await next(context);
            return;
        }

        var session = Guid.TryParse(sessionValue, out var id)
            ? await database.ImpersonationSessions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, context.RequestAborted)
            : null;

        if (session is null 
            || session.EndedAt.HasValue 
            || session.ExpiresAt <= clock.GetUtcNow()
            || session.TargetUserId != context.User.FindFirstValue(ClaimTypes.NameIdentifier))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var admin = await users.FindByIdAsync(session.AdminUserId);
        var target = await signIn.ValidateSecurityStampAsync(context.User);
        if (admin is null 
            || target is null 
            || !await users.IsInRoleAsync(admin, PlatformRoles.Admin)
            || await users.GetSecurityStampAsync(admin) != session.AdminSecurityStamp
            || await users.IsLockedOutAsync(admin) || !await signIn.CanSignInAsync(target)
            || await users.IsLockedOutAsync(target))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        // Refresh roles from the DB; the impersonated user gets no actor privileges.
        var principal = await signIn.CreateUserPrincipalAsync(target);
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(PlatformUsersController.SessionClaim, sessionValue));
        context.User = principal;
        await next(context);
    }
}
