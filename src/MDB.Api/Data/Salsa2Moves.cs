using MDB.Api.Models;

namespace MDB.Api.Data;

public static class Salsa2Moves
{
    // Tow Truck appears twice in the screenshot; Revision is not a move.
    private static readonly (string Name, string Block)[] Moves =
    [
        ("Leaders Double Left", "Common"),
        ("Leaders Right Turn Hook Turn", "Common"),
        ("Inline", "Common"),
        ("Outline", "Common"),
        ("Early Inline", "Common"),
        ("Simple Double", "A"),
        ("Titanic Double", "A"),
        ("Double Hammerlock", "A"),
        ("ATC Open", "B"),
        ("ATC Close", "B"),
        ("Tow Truck", "B"),
        ("ATW", "B"),
        ("Barrel", "B"),
        ("360 CBL/Inline", "C"),
        ("360 Wrap", "C"),
        ("360 Leaders Adv", "C"),
        ("ST Open", "D"),
        ("ST Spiral", "D"),
        ("Reverse Right", "E"),
        ("Push Turn", "E"),
        ("RT Hammerlock", "E"),
        ("Banana Flick", "F"),
        ("Flicks + Free Spin", "F"),
        ("Shadow Flick", "F")
    ];

    public static List<Move> Create(DanceSchool school)
    {
        return Moves.Select(move => new Move
        {
            Name = move.Name,
            Block = move.Block,
            Level = 2m,
            School = school,
            VideoUrl = string.Empty
        }).ToList();
    }
}
