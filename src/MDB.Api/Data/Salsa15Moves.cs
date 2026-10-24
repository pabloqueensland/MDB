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
            Level = 1.5m,
            School = school,
            // No video was supplied; never substitute an unrelated clip.
            VideoUrl = string.Empty
        }).ToList();
    }
}
