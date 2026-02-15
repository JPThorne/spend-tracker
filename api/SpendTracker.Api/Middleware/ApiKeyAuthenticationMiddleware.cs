namespace SpendTracker.Api.Middleware;

public class ApiKeyAuthenticationMiddleware(
    RequestDelegate next,
    IConfiguration configuration,
    ILogger<ApiKeyAuthenticationMiddleware> logger)
{
    private const string ApiKeyHeader = "x-api-key";

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for certain paths (e.g., health checks, swagger)
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.Contains("/health") || path.Contains("/swagger"))
        {
            await next(context);
            return;
        }

        // Get API key from header
        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var extractedApiKey))
        {
            logger.LogWarning("API key missing from request to {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "API key is missing" });
            return;
        }

        // Validate API key
        var configuredApiKey = configuration["ApiKey"];
        if (string.IsNullOrEmpty(configuredApiKey))
        {
            logger.LogError("API key is not configured in appsettings.json");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { error = "API key configuration error" });
            return;
        }

        if (!configuredApiKey.Equals(extractedApiKey.ToString()))
        {
            logger.LogWarning("Invalid API key provided for {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }

        // API key is valid, continue to next middleware
        await next(context);
    }
}

// Extension method for easy registration
public static class ApiKeyAuthenticationMiddlewareExtensions
{
    public static IApplicationBuilder UseApiKeyAuthentication(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ApiKeyAuthenticationMiddleware>();
    }
}
