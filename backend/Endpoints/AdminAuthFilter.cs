namespace Novira.Backend.Endpoints;

// Deliberately simple: one shared secret in a header, checked against config.
// Not a user-accounts system — this is an internal-only tool for the founder,
// not something end users ever see. Upgrade to real auth before anyone else
// needs admin access.
public class AdminAuthFilter(IConfiguration configuration) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var configuredKey = configuration["Admin:Key"];

        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            return Results.Problem("Admin access is not configured.", statusCode: 500);
        }

        var providedKey = context.HttpContext.Request.Headers["X-Admin-Key"].ToString();

        if (string.IsNullOrEmpty(providedKey) || providedKey != configuredKey)
        {
            return Results.Unauthorized();
        }

        return await next(context);
    }
}
