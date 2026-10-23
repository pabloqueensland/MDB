using Microsoft.AspNetCore.Mvc;

namespace MDB.Api.Controllers;

[ApiController]
public sealed class HomeController : ControllerBase
{
    [HttpGet("/")]
    public IActionResult Get() => Content("Hello World!");
}
