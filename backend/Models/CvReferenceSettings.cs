namespace Novira.Backend.Models;

// A single admin-editable "house style" guide, included in every CV/cover-
// letter generation prompt (see CvGenerationService) — the cheap, simple
// mechanism for "the AI gets better over time" the founder asked for: no
// fine-tuning, just a growing piece of guidance the founder refines by hand
// as they learn what works, same "human refines a simple curated thing"
// discipline occupation-demand.ts already uses. One row ever (singleton,
// enforced at the application layer, not a DB constraint — the row simply
// always gets upserted by its own fixed Id).
public class CvReferenceSettings
{
    // Fixed, not Guid.NewGuid() — this row is always looked up and upserted
    // by this exact value, so there's only ever one.
    public static readonly Guid SingletonId = new("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; } = SingletonId;
    public string GuideText { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
