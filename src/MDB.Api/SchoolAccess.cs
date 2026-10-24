using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api;

public sealed class SchoolAccess(ApplicationDbContext database)
{
    public Task<bool> CanManageAsync(ClaimsPrincipal user, Guid schoolId, CancellationToken cancellationToken)
    {
        if (user.IsInRole(PlatformRoles.Admin))
        {
            return Task.FromResult(true);
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

        return database.SchoolMemberships.AnyAsync(x => x.UserId == userId && x.SchoolId == schoolId
            && (x.Role == SchoolRole.SchoolAdmin || x.Role == SchoolRole.SchoolManager), cancellationToken);
    }

    public Task<bool> IsMemberAsync(ClaimsPrincipal user, Guid schoolId, CancellationToken cancellationToken)
    {
        if (user.IsInRole(PlatformRoles.Admin))
        {
            return Task.FromResult(true);
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

        return database.SchoolMemberships.AnyAsync(x => x.UserId == userId && x.SchoolId == schoolId, cancellationToken);
    }
}
