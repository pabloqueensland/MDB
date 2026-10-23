using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/memberships")]
public sealed class MembershipsController(ApplicationDbContext database, UserManager<IdentityUser> users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<MemberResponse>>> List(Guid? schoolId, string? role, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isPlatformAdmin = User.IsInRole(PlatformRoles.Admin);
        var allowedSchools = database.SchoolMemberships.Where(x => x.UserId == userId
            && (x.Role == SchoolRole.SchoolAdmin || x.Role == SchoolRole.SchoolManager)).Select(x => x.SchoolId);

        if (!isPlatformAdmin && (!await allowedSchools.AnyAsync(cancellationToken)
            || (schoolId.HasValue && !await allowedSchools.ContainsAsync(schoolId.Value, cancellationToken))))
        {
            return Forbid();
        }

        var query = database.SchoolMemberships.AsNoTracking();
        if (!isPlatformAdmin)
        {
            query = query.Where(x => allowedSchools.Contains(x.SchoolId));
        }
        if (schoolId.HasValue)
        {
            query = query.Where(x => x.SchoolId == schoolId.Value);
        }
        if (role is not null)
        {
            if (!Enum.GetNames<SchoolRole>().Contains(role))
            {
                return BadRequest(new ProblemDetails { Title = "Invalid school role." });
            }
            var schoolRole = Enum.Parse<SchoolRole>(role);
            query = query.Where(x => x.Role == schoolRole);
        }

        return Ok(await query.OrderBy(x => x.School.Name).ThenBy(x => x.User.Email)
            .Select(x => new MemberResponse(x.SchoolId, x.School.Name, x.UserId, x.User.Email!, x.Role.ToString(),
                database.UserClaims.Where(claim => claim.UserId == x.UserId && claim.ClaimType == DemoSchools.DisplayNameClaim)
                    .Select(claim => claim.ClaimValue).FirstOrDefault() ?? x.User.Email!))
            .ToListAsync(cancellationToken));
    }

    [HttpPut]
    public async Task<ActionResult<MemberResponse>> Assign(AssignMembershipRequest request, CancellationToken cancellationToken)
    {
        var isPlatformAdmin = User.IsInRole(PlatformRoles.Admin);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var callerRole = await database.SchoolMemberships
            .Where(x => x.SchoolId == request.SchoolId && x.UserId == userId)
            .Select(x => (SchoolRole?)x.Role).SingleOrDefaultAsync(cancellationToken);
        var desiredRole = Enum.Parse<SchoolRole>(request.Role);

        if (!isPlatformAdmin && (callerRole is not (SchoolRole.SchoolManager or SchoolRole.SchoolAdmin)
            || desiredRole == SchoolRole.SchoolManager
            || (desiredRole == SchoolRole.SchoolAdmin && callerRole != SchoolRole.SchoolManager)))
        {
            return Forbid();
        }

        var school = await database.DanceSchools.FindAsync([request.SchoolId], cancellationToken);
        if (school is null)
        {
            return NotFound(new ProblemDetails { Title = "School not found." });
        }
        var targetUser = await users.FindByEmailAsync(request.Email.Trim());
        if (targetUser is null)
        {
            return NotFound(new ProblemDetails { Title = "User not found. Ask them to register first." });
        }
        var membership = await database.SchoolMemberships.FindAsync([request.SchoolId, targetUser.Id], cancellationToken);

        // A lower role cannot demote an existing manager/admin by assigning a lower role.
        if (!isPlatformAdmin && (membership?.Role == SchoolRole.SchoolManager
            || (membership?.Role == SchoolRole.SchoolAdmin && callerRole != SchoolRole.SchoolManager)))
        {
            return Forbid();
        }
        if (membership is null)
        {
            membership = new SchoolMembership { SchoolId = school.Id, UserId = targetUser.Id };
            database.SchoolMemberships.Add(membership);
        }
        membership.Role = desiredRole;
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict(new ProblemDetails { Title = "This membership changed. Reload and try again." });
        }
        var claims = await users.GetClaimsAsync(targetUser);
        var name = claims.FirstOrDefault(claim => claim.Type == DemoSchools.DisplayNameClaim)?.Value ?? targetUser.Email!;
        return Ok(new MemberResponse(school.Id, school.Name, targetUser.Id, targetUser.Email!, membership.Role.ToString(), name));
    }
}

public sealed record AssignMembershipRequest(
    Guid SchoolId,
    [Required, EmailAddress] string Email,
    [Required, RegularExpression("^(Student|Instructor|SchoolAdmin|SchoolManager)$")] string Role);

public sealed record MemberResponse(Guid SchoolId, string SchoolName, string UserId, string Email, string Role, string Name);
