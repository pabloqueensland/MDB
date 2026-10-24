using System.Security.Claims;
using MDB.Api.Data;
using MDB.Api.Models;

namespace MDB.Api;

public sealed class MoveAccess(ApplicationDbContext database)
{
    public IQueryable<DanceClass> StudentClasses(ClaimsPrincipal user)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var enrolments = database.ClassEnrolments.Where(x => x.UserId == userId && x.IsActive
            && x.Membership.Role == SchoolRole.Student);

        return database.DanceClasses.Where(danceClass => enrolments.Any(enrolment =>
            enrolment.SchoolId == danceClass.SchoolId && enrolment.StreamId == danceClass.StreamId
            && enrolment.Class.Level >= danceClass.Level));
    }

    public IQueryable<Move> StudentMoves(ClaimsPrincipal user)
    {
        var classes = StudentClasses(user).Select(x => x.Id);

        return database.Moves.Where(move => move.Classes.Any(danceClass => classes.Contains(danceClass.Id)));
    }

    public IQueryable<DanceClass> VisibleClasses(ClaimsPrincipal user)
    {
        if (user.IsInRole(PlatformRoles.Admin))
        {
            return database.DanceClasses;
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffSchools = database.SchoolMemberships.Where(x => x.UserId == userId && x.Role != SchoolRole.Student)
            .Select(x => x.SchoolId);
        var studentClasses = StudentClasses(user).Select(x => x.Id);

        return database.DanceClasses.Where(x => staffSchools.Contains(x.SchoolId) || studentClasses.Contains(x.Id));
    }

    public IQueryable<Move> VisibleMoves(ClaimsPrincipal user)
    {
        if (user.IsInRole(PlatformRoles.Admin))
        {
            return database.Moves;
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffSchools = database.SchoolMemberships.Where(x => x.UserId == userId && x.Role != SchoolRole.Student)
            .Select(x => x.SchoolId);
        var studentMoves = StudentMoves(user).Select(x => x.Id);

        return database.Moves.Where(x => staffSchools.Contains(x.SchoolId) || studentMoves.Contains(x.Id));
    }
}
