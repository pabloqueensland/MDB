namespace MDB.Api.Models;

public sealed class DanceStream
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SchoolId { get; set; }
    public required string Name { get; set; }

    public DanceSchool School { get; set; } = null!;
    public ICollection<DanceClass> Classes { get; set; } = new List<DanceClass>();
}
