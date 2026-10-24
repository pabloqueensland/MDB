using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/moves")]
public sealed class MovesController(ApplicationDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<MoveResponse>>> List(Guid? schoolId, Guid? streamId, Guid? classId, CancellationToken cancellationToken)
    {
        var query = database.Moves.AsNoTracking();
        var accessibleClasses = database.DanceClasses.AsNoTracking();

        if (!User.IsInRole(PlatformRoles.Admin))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var schoolIds = database.SchoolMemberships.Where(x => x.UserId == userId).Select(x => x.SchoolId);

            if (schoolId.HasValue && !await schoolIds.ContainsAsync(schoolId.Value, cancellationToken))
            {
                return Forbid();
            }

            query = query.Where(x => schoolIds.Contains(x.SchoolId));
            var staffSchools = database.SchoolMemberships.Where(x => x.UserId == userId && x.Role != SchoolRole.Student)
                .Select(x => x.SchoolId);
            var enrolments = database.ClassEnrolments.Where(x => x.UserId == userId && x.IsActive
                && x.Membership.Role == SchoolRole.Student);
            accessibleClasses = accessibleClasses.Where(danceClass => staffSchools.Contains(danceClass.SchoolId)
                || enrolments.Any(enrolment => enrolment.SchoolId == danceClass.SchoolId
                    && enrolment.StreamId == danceClass.StreamId && enrolment.Class.Level >= danceClass.Level));
            query = query.Where(move => staffSchools.Contains(move.SchoolId)
                || move.Classes.Any(danceClass => accessibleClasses.Select(x => x.Id).Contains(danceClass.Id)));
        }

        if (schoolId.HasValue)
        {
            query = query.Where(x => x.SchoolId == schoolId.Value);
        }

        if (classId.HasValue)
        {
            query = query.Where(x => x.Classes.Any(danceClass => danceClass.Id == classId.Value
                && accessibleClasses.Select(c => c.Id).Contains(danceClass.Id)));
        }

        if (streamId.HasValue)
        {
            query = query.Where(x => x.Classes.Any(danceClass => danceClass.StreamId == streamId.Value
                && accessibleClasses.Select(c => c.Id).Contains(danceClass.Id)));
        }

        var moves = await query.OrderBy(x => x.School.Name).ThenBy(x => x.Level).ThenBy(x => x.Name)
            .Select(x => new MoveResponse(x.Id, x.Name, x.Level, x.VideoUrl, x.Description,
                x.SchoolId, x.School.Name,
                x.Classes.Where(danceClass => accessibleClasses.Select(c => c.Id).Contains(danceClass.Id))
                    .OrderBy(danceClass => danceClass.Level).ThenBy(danceClass => danceClass.Name)
                    .Select(danceClass => new MoveClassResponse(danceClass.Id, danceClass.Name, danceClass.Level,
                        danceClass.StreamId, danceClass.Stream.Name)).ToList()))
            .ToListAsync(cancellationToken);

        return Ok(moves);
    }
}

public sealed record MoveClassResponse(Guid Id, string Name, decimal Level, Guid StreamId, string StreamName);
public sealed record MoveResponse(Guid Id, string Name, decimal Level, string VideoUrl, string? Description,
    Guid SchoolId, string SchoolName, List<MoveClassResponse> Classes);
