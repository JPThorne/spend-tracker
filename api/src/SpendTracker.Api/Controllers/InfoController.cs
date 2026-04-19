using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace SpendTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InfoController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var version = Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "unknown";
        return Ok(new { version });
    }
}
