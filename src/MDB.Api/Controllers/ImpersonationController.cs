using System.Security.Claims;
using MDB.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/impersonation")]
public sealed class ImpersonationController(ApplicationDbContext database, TimeProvider clock) : ControllerBase
{
    [HttpPost("stop")]
    public async Task<IActionResult> Stop(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(PlatformUsersController.SessionClaim), out var id))
        {
            return BadRequest();
        }
        var session = await database.ImpersonationSessions.SingleAsync(x => x.Id == id, cancellationToken);
        session.EndedAt = clock.GetUtcNow();
        await database.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
