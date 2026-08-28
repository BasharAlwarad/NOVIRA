using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

// The user-facing counterpart to AdminAuthFilter — but a real per-user
// session instead of one shared secret. Validates the bearer session token
// sent as X-Session-Token (set by the frontend from its own HttpOnly
// cookie — the backend never sees or sets a browser cookie directly, see
// CLAUDE.md's auth section for why), hashes it, and looks it up against the
// Sessions table created at /auth/verify time. On success, stashes the
// resolved User on HttpContext.Items so downstream handlers (e.g. GET
// /matches) don't need to repeat the lookup.
public class SessionAuthFilter(AppDbContext db) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var rawToken = context.HttpContext.Request.Headers["X-Session-Token"].ToString();

        if (string.IsNullOrEmpty(rawToken))
        {
            return Results.Unauthorized();
        }

        var tokenHash = TokenGenerator.Hash(rawToken);
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash);

        if (session is null || session.ExpiresAt < DateTime.UtcNow)
        {
            return Results.Unauthorized();
        }

        var user = await db.Users.FindAsync(session.UserId);
        if (user is null)
        {
            // Shouldn't happen given the FK cascade delete, but guard anyway
            // rather than let a null reference surface downstream.
            return Results.Unauthorized();
        }

        context.HttpContext.Items["CurrentUser"] = user;
        return await next(context);
    }
}
