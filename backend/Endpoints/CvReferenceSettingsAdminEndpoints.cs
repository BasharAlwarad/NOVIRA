using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Endpoints;

public record CvReferenceSettingsResponse(string GuideText, DateTime UpdatedAt);
public record UpdateCvReferenceSettingsRequest(string GuideText);

// The admin-editable "house style" guide included in every CV generation
// prompt (see CvGenerationService.cs's comment on CvReferenceSettings) —
// the cheap, controllable mechanism for "the AI gets better over time" the
// founder asked for, instead of fine-tuning. One singleton row.
public static class CvReferenceSettingsAdminEndpoints
{
    public static void MapCvReferenceSettingsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/cv-reference-settings").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (AppDbContext db) =>
        {
            var settings = await db.CvReferenceSettings.FindAsync(CvReferenceSettings.SingletonId);
            return Results.Ok(new CvReferenceSettingsResponse(settings?.GuideText ?? "", settings?.UpdatedAt ?? DateTime.UtcNow));
        });

        group.MapPut("/", async (UpdateCvReferenceSettingsRequest request, AppDbContext db) =>
        {
            if (request.GuideText.Length > 8000)
            {
                return Results.BadRequest(new { message = "Guide text is too long (max 8000 characters)." });
            }

            var settings = await db.CvReferenceSettings.FindAsync(CvReferenceSettings.SingletonId);
            if (settings is null)
            {
                settings = new CvReferenceSettings();
                db.CvReferenceSettings.Add(settings);
            }

            settings.GuideText = request.GuideText.Trim();
            settings.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new CvReferenceSettingsResponse(settings.GuideText, settings.UpdatedAt));
        });
    }
}
