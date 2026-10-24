namespace MDB.Api.Models;

// A row exists only while this student considers the move mastered.
public sealed class StudentMove
{
    public Guid SchoolId { get; set; }
    public required string UserId { get; set; }
    public Guid MoveId { get; set; }
    public DateTimeOffset MasteredAt { get; set; } = DateTimeOffset.UtcNow;

    public SchoolMembership Student { get; set; } = null!;
    public Move Move { get; set; } = null!;
}
