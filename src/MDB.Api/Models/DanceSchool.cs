namespace MDB.Api.Models;

public sealed class DanceSchool
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Slug { get; set; }

    public ICollection<SchoolMembership> Memberships { get; set; } = new List<SchoolMembership>();
    public ICollection<Move> Moves { get; set; } = new List<Move>();
    public ICollection<DanceClass> Classes { get; set; } = new List<DanceClass>();
    public ICollection<DanceStream> Streams { get; set; } = new List<DanceStream>();
}
