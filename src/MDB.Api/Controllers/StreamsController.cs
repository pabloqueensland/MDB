using System.ComponentModel.DataAnnotations;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/schools/{schoolId:guid}/streams")]
public sealed class StreamsController(ApplicationDbContext database, SchoolAccess access) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid schoolId, CancellationToken cancellationToken)
    {
        if (!await access.IsMemberAsync(User, schoolId, cancellationToken))
        {
            return Forbid();
        }

        var streams = await database.DanceStreams.AsNoTracking().Where(x => x.SchoolId == schoolId)
            .OrderBy(x => x.Name)
            .Select(x => new StreamResponse(x.Id, x.Name, x.Classes.OrderBy(c => c.Level).ThenBy(c => c.Name)
                .Select(c => new StreamClassResponse(c.Id, c.Name, c.Level)).ToList()))
            .ToListAsync(cancellationToken);

        return Ok(streams);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid schoolId, CreateStreamRequest request, CancellationToken cancellationToken)
    {
        if (!await access.CanManageAsync(User, schoolId, cancellationToken))
        {
            return Forbid();
        }

        if (!await database.DanceSchools.AnyAsync(x => x.Id == schoolId, cancellationToken))
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new ProblemDetails { Title = "Stream name is required." });
        }

        var stream = new DanceStream { SchoolId = schoolId, Name = request.Name.Trim() };
        database.DanceStreams.Add(stream);

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict(new ProblemDetails { Title = "A stream with this name already exists in this school." });
        }

        return StatusCode(201, new StreamResponse(stream.Id, stream.Name, []));
    }

    [HttpPost("{streamId:guid}/classes")]
    public async Task<IActionResult> CreateClass(Guid schoolId, Guid streamId, CreateClassRequest request, CancellationToken cancellationToken)
    {
        if (!await access.CanManageAsync(User, schoolId, cancellationToken))
        {
            return Forbid();
        }

        if (!await database.DanceStreams.AnyAsync(x => x.Id == streamId && x.SchoolId == schoolId, cancellationToken))
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name) || request.Level < 0 || request.Level > 9999.99m
            || decimal.Round(request.Level, 2) != request.Level)
        {
            return BadRequest(new ProblemDetails { Title = "Provide a class name and a non-negative level with at most two decimal places." });
        }

        var danceClass = new DanceClass { Name = request.Name.Trim(), Level = request.Level, SchoolId = schoolId, StreamId = streamId };
        database.DanceClasses.Add(danceClass);
        await database.SaveChangesAsync(cancellationToken);

        return StatusCode(201, new StreamClassResponse(danceClass.Id, danceClass.Name, danceClass.Level));
    }
}

public sealed record CreateStreamRequest([Required, StringLength(100)] string Name);
public sealed record CreateClassRequest([Required, StringLength(200)] string Name, decimal Level);
public sealed record StreamClassResponse(Guid Id, string Name, decimal Level);
public sealed record StreamResponse(Guid Id, string Name, List<StreamClassResponse> Classes);
