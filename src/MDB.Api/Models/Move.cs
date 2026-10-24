using System.ComponentModel.DataAnnotations;

namespace MDB.Api.Models;

public sealed class Move
{
    private string? block;

    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public decimal Level { get; set; }
    public required string VideoUrl { get; set; }
    public Guid SchoolId { get; set; }
    public string? Description { get; set; }
    public string? Block
    {
        get => block;
        set
        {
            if (value?.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length > 20)
            {
                throw new ValidationException("A move's block must contain at most 20 words.");
            }

            block = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DanceSchool School { get; set; } = null!;
    public ICollection<DanceClass> Classes { get; set; } = new List<DanceClass>();
    public ICollection<StudentMove> StudentMoves { get; set; } = new List<StudentMove>();
}
