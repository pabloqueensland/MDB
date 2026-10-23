using System.ComponentModel.DataAnnotations;
using MDB.Api.Data;
using MDB.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Route("api/schools")]
[Authorize(Roles = PlatformRoles.Admin)]
public sealed class SchoolsController(ApplicationDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<SchoolResponse>>> List(CancellationToken cancellationToken)
    {
        var schools = await database.DanceSchools.AsNoTracking()
            .OrderBy(x => x.Name).ThenBy(x => x.Id)
            .Select(x => new SchoolResponse(x.Id, x.Name, x.Slug))
            .ToListAsync(cancellationToken);
        return Ok(schools);
    }

    [HttpPost]
    public async Task<ActionResult<SchoolResponse>> Create(CreateSchoolRequest request, CancellationToken cancellationToken)
    {
        var school = new DanceSchool
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant()
        };

        if (string.IsNullOrWhiteSpace(school.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "School name is required.");
            return ValidationProblem(ModelState);
        }

        if (await database.DanceSchools.AnyAsync(x => x.Slug == school.Slug, cancellationToken))
        {
            return Conflict(new ProblemDetails { Title = "A school with this slug already exists.", Status = 409 });
        }

        database.DanceSchools.Add(school);
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict(new ProblemDetails { Title = "A school with this slug already exists.", Status = 409 });
        }

        return CreatedAtAction(nameof(GetById), new { id = school.Id },
            new SchoolResponse(school.Id, school.Name, school.Slug));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SchoolResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var school = await database.DanceSchools.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new SchoolResponse(x.Id, x.Name, x.Slug))
            .SingleOrDefaultAsync(cancellationToken);

        if (school is null)
        {
            return NotFound();
        }

        return Ok(school);
    }
}

public sealed record CreateSchoolRequest(
    [Required, StringLength(200)] string Name,
    [Required, StringLength(100), RegularExpression(@"^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$",
        ErrorMessage = "Use letters, numbers, and single hyphens between words.")] string Slug);

public sealed record SchoolResponse(Guid Id, string Name, string Slug);
