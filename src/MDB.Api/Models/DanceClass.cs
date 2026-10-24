namespace MDB.Api.Models;

public sealed class DanceClass
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public decimal Level { get; set; }
    public Guid SchoolId { get; set; }
    public Guid StreamId { get; set; }

    public DanceSchool School { get; set; } = null!;
    public DanceStream Stream { get; set; } = null!;
    public ICollection<Move> Moves { get; set; } = new List<Move>();
    public ICollection<ClassEnrolment> Enrolments { get; set; } = new List<ClassEnrolment>();
}
