using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/enrolments")]
public sealed class EnrolmentsController(ApplicationDbContext database, SchoolAccess access) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid schoolId, [Required] string userId, CancellationToken cancellationToken)
    {
        var isSelf = User.FindFirstValue(ClaimTypes.NameIdentifier) == userId;

        if (!(isSelf && await access.IsMemberAsync(User, schoolId, cancellationToken))
            && !await access.CanManageAsync(User, schoolId, cancellationToken))
        {
            return Forbid();
        }

        var enrolments = await database.ClassEnrolments.AsNoTracking()
            .Where(x => x.SchoolId == schoolId && x.UserId == userId)
            .OrderBy(x => x.Class.Stream.Name).ThenBy(x => x.Class.Level)
            .Select(x => new EnrolmentResponse(x.StreamId, x.Class.Stream.Name, x.ClassId, x.Class.Name, x.Class.Level, x.IsActive))
            .ToListAsync(cancellationToken);

        return Ok(enrolments);
    }

    [HttpPut]
    public async Task<IActionResult> Save(SaveEnrolmentRequest request, CancellationToken cancellationToken)
    {
        if (!await access.CanManageAsync(User, request.SchoolId, cancellationToken))
        {
            return Forbid();
        }

        var membership = await database.SchoolMemberships.FindAsync([request.SchoolId, request.UserId], cancellationToken);

        if (membership is null || membership.Role != SchoolRole.Student)
        {
            return BadRequest(new ProblemDetails { Title = "The user must have a student membership in this school." });
        }

        var danceClass = await database.DanceClasses.Include(x => x.Stream)
            .SingleOrDefaultAsync(x => x.Id == request.ClassId && x.SchoolId == request.SchoolId
                && x.StreamId == request.StreamId, cancellationToken);

        if (danceClass is null)
        {
            return BadRequest(new ProblemDetails { Title = "Choose a class in the selected school and stream." });
        }

        var enrolment = await database.ClassEnrolments.FindAsync(
            [request.SchoolId, request.UserId, request.StreamId, request.ClassId], cancellationToken);

        if (enrolment is null)
        {
            enrolment = new ClassEnrolment
            {
                SchoolId = request.SchoolId, UserId = request.UserId,
                StreamId = request.StreamId, ClassId = request.ClassId
            };
            database.ClassEnrolments.Add(enrolment);
        }

        enrolment.IsActive = request.IsActive;

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict(new ProblemDetails { Title = "This enrolment changed. Reload and try again." });
        }

        return Ok(new EnrolmentResponse(danceClass.StreamId, danceClass.Stream.Name, danceClass.Id, danceClass.Name, danceClass.Level, enrolment.IsActive));
    }
}

public sealed record SaveEnrolmentRequest(Guid SchoolId, [Required] string UserId, Guid StreamId, Guid ClassId, bool IsActive);
public sealed record EnrolmentResponse(Guid StreamId, string StreamName, Guid ClassId, string ClassName, decimal Level, bool IsActive);
