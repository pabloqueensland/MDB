using MDB.Api.Models;

namespace MDB.Api.Data;

public static class Salsa15Moves
{
    // Repeated names and abbreviated outcomes from the curriculum are merged.
    private static readonly string[] Names =
    [
        "Cross Body Close",
        "Cross Body Closed to Open",
        "Inline",
        "Outline",
        "Enchufla",
        "Birds",
        "Titanic",
        "Titanic Wrap",
        "Hair Combs",
        "Right Turn Right Hand",
        "Right Turn Left Hand",
        "Right Turn Reverse",
        "Copa Wrap",
        "Copa Open",
        "Copa Block",
        "Copa Inlines",
        "Early Left",
        "Right Turn",
        "Pretzel Wrap",
        "Open Wrap",
        "Walk Through Exits",
        "Right Turn Exits",
        "Inline Exits",
        "Hand Throw",
        "Hand Throw + Free Spin",
        "Inline Both Hands",
        "Inline Shoulder",
        "Hammerlock",
        "Reverse Cross Body",
        "Touch and Go",
        "Push Turn",
        "Susie",
        "Mambo",
        "3-3",
        "RT-LT",
        "Hook Turn",
        "Spot Turn"
    ];

    public static List<Move> Create(DanceSchool school)
    {
        return Names.Select(name => new Move
        {
            Name = name,
            Block = GetBlock(name),
            Level = 1.5m,
            School = school,
            // No video was supplied; never substitute an unrelated clip.
            VideoUrl = string.Empty
        }).ToList();
    }

    private static string GetBlock(string name)
    {
        // Keep the pictured A–F assignments; group unblocked common moves/shines
        // into those same blocks for the development seed.
        return name switch
        {
            "Cross Body Closed to Open" or "Inline" or "Birds" or "Titanic"
                or "Titanic Wrap" or "Hair Combs" => "A",
            "Outline" or "Right Turn Right Hand" or "Right Turn Left Hand"
                or "Right Turn Reverse" or "RT-LT" => "B",
            "Enchufla" or "Copa Wrap" or "Copa Open" or "Copa Block"
                or "Copa Inlines" or "Early Left" => "C",
            "Right Turn" or "Pretzel Wrap" or "Open Wrap" or "Walk Through Exits"
                or "Right Turn Exits" or "Inline Exits" or "Hook Turn" => "D",
            "Hand Throw" or "Hand Throw + Free Spin" or "Inline Both Hands"
                or "Inline Shoulder" or "Hammerlock" or "Spot Turn" => "E",
            "Cross Body Close" or "Reverse Cross Body" or "Touch and Go"
                or "Push Turn" or "Susie" or "Mambo" or "3-3" => "F",
            _ => throw new InvalidOperationException($"Assign a seed block to {name}.")
        };
    }
}
