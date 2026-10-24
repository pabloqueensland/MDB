namespace MDB.Api.Models;

public sealed class ClassEnrolment
{
    public Guid SchoolId { get; set; }
    public required string UserId { get; set; }
    public Guid StreamId { get; set; }
    public Guid ClassId { get; set; }
    public bool IsActive { get; set; } = true;

    public SchoolMembership Membership { get; set; } = null!;
    public DanceClass Class { get; set; } = null!;
}
