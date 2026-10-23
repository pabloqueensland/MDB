namespace MDB.Api.Models;

public sealed class ImpersonationSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string AdminUserId { get; set; }
    public required string TargetUserId { get; set; }
    public required string AdminSecurityStamp { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
}
