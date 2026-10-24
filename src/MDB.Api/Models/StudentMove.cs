namespace MDB.Api.Models;

// Personal preferences and progress for a student's move.
public sealed class StudentMove
{
    public Guid SchoolId { get; set; }
    public required string UserId { get; set; }
    public Guid MoveId { get; set; }
    public DateTimeOffset? MasteredAt { get; set; }
    public bool IsFavorite { get; set; }

    public SchoolMembership Student { get; set; } = null!;
    public Move Move { get; set; } = null!;
}
