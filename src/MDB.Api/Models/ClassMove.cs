namespace MDB.Api.Models;

public sealed class ClassMove
{
    public Guid SchoolId { get; set; }
    public Guid ClassId { get; set; }
    public Guid MoveId { get; set; }

    public DanceClass Class { get; set; } = null!;
    public Move Move { get; set; } = null!;
}
