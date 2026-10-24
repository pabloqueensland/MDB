namespace MDB.Api.Models;

public sealed class Move
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public decimal Level { get; set; }
    public required string VideoUrl { get; set; }
    public Guid SchoolId { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DanceSchool School { get; set; } = null!;
    public ICollection<DanceClass> Classes { get; set; } = new List<DanceClass>();
}
