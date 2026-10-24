using Microsoft.AspNetCore.Identity;

namespace MDB.Api.Models;

public sealed class SchoolMembership
{
    public Guid SchoolId { get; set; }
    public required string UserId { get; set; }
    public SchoolRole Role { get; set; } = SchoolRole.Student;

    public DanceSchool School { get; set; } = null!;
    public IdentityUser User { get; set; } = null!;
    public ICollection<ClassEnrolment> Enrolments { get; set; } = new List<ClassEnrolment>();
    public ICollection<StudentMove> StudentMoves { get; set; } = new List<StudentMove>();
}
