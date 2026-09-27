namespace Novira.Backend.Services;

// A small, static, manually-curated list of Germany's major cities — same
// "curated snapshot, not guessed" discipline as occupation-demand.ts on the
// frontend (and OccupationFields.cs's own comment). Exists specifically to
// check RegionFlexibility.MajorCitiesOnly against Opportunity.Location in
// MatchingService.cs, since Location is free text (e.g. "Schweinfurt",
// "Nürnberg, Mittelfranken") with no structured city-tier/region field —
// there's nothing else to compare against. Includes both English and
// German spellings where they differ, since real Location data comes from
// both a German-language source (Bundesagentur's Ausbildung sync) and
// hand-curated/AI-researched University data that may use either.
//
// Deliberately not exhaustive — Germany has more genuinely large cities
// than this. A city missing from this list just means a real major-city
// match goes undetected (no factor shown), never a false positive; see
// MatchingService.cs's own comment on why this stays additive-only for
// exactly that reason.
public static class MajorGermanCities
{
    public static readonly string[] All =
    [
        "Berlin", "Hamburg",
        "Munich", "München", "Muenchen",
        "Cologne", "Köln", "Koeln",
        "Frankfurt", "Stuttgart",
        "Düsseldorf", "Duesseldorf",
        "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
        "Hannover", "Hanover",
        "Nuremberg", "Nürnberg", "Nuernberg",
        "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn",
        "Münster", "Muenster",
    ];
}
