using System.ComponentModel.DataAnnotations;
using MDB.Api.Models;

namespace MDB.Api.Tests;

public sealed class MoveBlockTests
{
    [Fact]
    public void Block_accepts_twenty_words_and_rejects_twenty_one()
    {
        var move = new Move { Name = "Test move", VideoUrl = "" };
        var twentyWords = string.Join(" ", Enumerable.Repeat("word", 20));
        move.Block = twentyWords;
        Assert.Equal(twentyWords, move.Block);

        Assert.Throws<ValidationException>(() => move.Block = twentyWords + " extra");
    }

    [Fact]
    public void Block_counts_whitespace_separated_words_and_trims_the_label()
    {
        var move = new Move { Name = "Test move", VideoUrl = "", Block = "  Block\tA  " };
        Assert.Equal("Block\tA", move.Block);
        move.Block = "   ";
        Assert.Null(move.Block);
    }
}
