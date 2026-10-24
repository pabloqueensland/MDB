using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/moves")]
public sealed class MovesController(ApplicationDbContext database, MoveAccess access, SchoolAccess schools) : ControllerBase
{
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateMoveRequest request, CancellationToken cancellationToken)
    {
        var move = await database.Moves.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (move is null)
        {
            return NotFound();
        }

        if (!await schools.CanManageAsync(User, move.SchoolId, cancellationToken))
        {
            return Forbid();
        }

        var videoUrl = request.VideoUrl?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(request.Name) || request.Level < 0 || request.Level > 9999.99m
            || decimal.Round(request.Level, 2) != request.Level
            || request.Block?.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length > 20
            || (videoUrl.Length > 0 && (!Uri.TryCreate(videoUrl, UriKind.Absolute, out var uri)
                || (uri.Scheme != "http" && uri.Scheme != "https"))))
        {
            return BadRequest(new ProblemDetails { Title = "Provide a name, a non-negative level with at most two decimals, an HTTP(S) video URL or leave it blank, and a block of at most 20 words." });
        }

        move.Name = request.Name.Trim();
        move.Level = request.Level;
        move.VideoUrl = videoUrl;
        move.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        move.Block = request.Block;
        move.UpdatedAt = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<List<MoveResponse>>> List(Guid? schoolId, Guid? streamId, Guid? classId, CancellationToken cancellationToken)
    {
        var query = access.VisibleMoves(User).AsNoTracking();
        var accessibleClasses = access.VisibleClasses(User);
        var studentMoves = access.StudentMoves(User).Select(x => x.Id);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!User.IsInRole(PlatformRoles.Admin))
        {
            var schoolIds = database.SchoolMemberships.Where(x => x.UserId == userId).Select(x => x.SchoolId);

            if (schoolId.HasValue && !await schoolIds.ContainsAsync(schoolId.Value, cancellationToken))
            {
                return Forbid();
            }

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
            .Select(x => new MoveResponse(x.Id, x.Name, x.Level, x.VideoUrl, x.Description, x.Block,
                x.SchoolId, x.School.Name,
                x.Classes.Where(danceClass => accessibleClasses.Select(c => c.Id).Contains(danceClass.Id))
                    .OrderBy(danceClass => danceClass.Level).ThenBy(danceClass => danceClass.Name)
                    .Select(danceClass => new MoveClassResponse(danceClass.Id, danceClass.Name, danceClass.Level,
                        danceClass.StreamId, danceClass.Stream.Name)).ToList(),
                database.StudentMoves.Any(mastery => mastery.MoveId == x.Id && mastery.UserId == userId),
                studentMoves.Contains(x.Id)))
            .ToListAsync(cancellationToken);

        return Ok(moves);
    }

    [HttpPut("{id:guid}/mastery")]
    public async Task<ActionResult<MasteryResponse>> SetMastery(Guid id, MasteryRequest request, CancellationToken cancellationToken)
    {
        // The student identity comes only from the authenticated principal,
        // including when a platform admin is impersonating that student.
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var move = await access.StudentMoves(User).AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (move is null || userId is null)
        {
            return Forbid();
        }

        if (!request.IsMastered)
        {
            await database.StudentMoves.Where(x => x.SchoolId == move.SchoolId && x.UserId == userId && x.MoveId == id)
                .ExecuteDeleteAsync(cancellationToken);

            return Ok(new MasteryResponse(id, false));
        }

        var exists = await database.StudentMoves.AnyAsync(x => x.SchoolId == move.SchoolId && x.UserId == userId && x.MoveId == id, cancellationToken);

        if (!exists)
        {
            database.StudentMoves.Add(new StudentMove { SchoolId = move.SchoolId, UserId = userId, MoveId = id });

            try
            {
                await database.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
            {
                // Another request already created the same student's mastery link.
            }
        }

        return Ok(new MasteryResponse(id, true));
    }
}

public sealed record MoveClassResponse(Guid Id, string Name, decimal Level, Guid StreamId, string StreamName);
public sealed record MoveResponse(Guid Id, string Name, decimal Level, string VideoUrl, string? Description, string? Block,
    Guid SchoolId, string SchoolName, List<MoveClassResponse> Classes, bool IsMastered, bool CanMarkMastered);
public sealed record MasteryRequest(bool IsMastered);
public sealed record MasteryResponse(Guid MoveId, bool IsMastered);
public sealed record UpdateMoveRequest([Required, StringLength(200)] string Name, decimal Level,
    [StringLength(2048)] string? VideoUrl, [StringLength(4000)] string? Description, string? Block);
