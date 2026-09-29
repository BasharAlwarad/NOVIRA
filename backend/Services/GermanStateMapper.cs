namespace Novira.Backend.Services;

// Curated city -> Bundesland (federal state) lookup, same "curated, not
// derived, drop rather than guess" discipline as OccupationFieldMapper.cs
// and origin-country-requirements.ts. Opportunity.Location is a freeform
// string (e.g. "Heilbronn, Neckar", "Borken, Westfalen") with no state
// field of its own — built to feed the /matches state-breakdown feature
// (Monetization-Strategy.md-adjacent teaser, agreed 2026-09-29: a ranked
// "state: count" list, not a literal SVG map, after research found the
// closest same-market competitor, ausbildung.de, doesn't use a geographic
// map for this either).
//
// Every entry here was checked against the real, current set of distinct
// Location strings across Approved opportunities (verified live 2026-09-29,
// not guessed from a generic city list) — small towns whose state wasn't
// confidently known were independently verified before being added, not
// assumed from memory. A location that isn't in this dictionary is simply
// excluded from the breakdown rather than mis-attributed — the same
// "unmapped drops rather than guesses" rule OccupationFieldMapper.cs
// already follows.
public static class GermanStateMapper
{
    private static readonly Dictionary<string, string> CityToState = new(StringComparer.OrdinalIgnoreCase)
    {
        // Well-known major cities.
        ["Aachen"] = "North Rhine-Westphalia",
        ["Berlin"] = "Berlin",
        ["Bonn"] = "North Rhine-Westphalia",
        ["Bremen"] = "Bremen",
        ["Deggendorf"] = "Bavaria",
        ["Hamburg"] = "Hamburg",
        ["Kaiserslautern"] = "Rhineland-Palatinate",
        ["Mannheim"] = "Baden-Württemberg",
        ["Marburg"] = "Hesse",
        ["Munich"] = "Bavaria",
        ["München"] = "Bavaria",
        ["Passau"] = "Bavaria",
        ["Stuttgart"] = "Baden-Württemberg",
        ["Lübeck"] = "Schleswig-Holstein",
        ["Gütersloh"] = "North Rhine-Westphalia",
        ["Kleve"] = "North Rhine-Westphalia",
        ["Dinslaken"] = "North Rhine-Westphalia",
        ["Weiden"] = "Bavaria",
        ["Ulm"] = "Baden-Württemberg",
        ["Schweinfurt"] = "Bavaria",

        // Real Location strings carry a disambiguating suffix from the
        // source data (e.g. Bundesagentur distinguishes same-named towns
        // this way) — matched on the leading city name (see ResolveState),
        // but the suffix itself is what confirms the state for these.
        ["Borken"] = "North Rhine-Westphalia", // ", Westfalen"
        ["Hagen"] = "North Rhine-Westphalia", // ", Westfalen"
        ["Hamm"] = "North Rhine-Westphalia", // ", Westfalen"
        ["Heilbronn"] = "Baden-Württemberg", // ", Neckar"
        ["Ludwigsburg"] = "Baden-Württemberg", // ", Württemberg"
        ["Sinsheim"] = "Baden-Württemberg", // ", Elsenz"
        ["Villingen-Schwenningen"] = "Baden-Württemberg",
        ["Nürnberg"] = "Bavaria", // ", Mittelfranken"
        ["Langenfeld"] = "North Rhine-Westphalia", // "(Rheinland)"
        ["Rotenburg"] = "Lower Saxony", // "(Wümme)" — distinct from the Hesse Rotenburg an der Fulda
        ["Albstadt"] = "Baden-Württemberg", // ", Württemberg"

        // Smaller towns — independently verified (Wikipedia / the official
        // German municipal registry, statistikportal.de), not assumed from
        // memory, since a wrong attribution here would misinform users.
        ["Backnang"] = "Baden-Württemberg",
        ["Bessenbach"] = "Bavaria",
        ["Bruchsal"] = "Baden-Württemberg",
        ["Dülmen"] = "North Rhine-Westphalia",
        ["Eberswalde"] = "Brandenburg",
        ["Eitting"] = "Bavaria", // ", Kreis Erding"
        ["Hameln"] = "Lower Saxony",
        ["Haselünne"] = "Lower Saxony",
        ["Korbach"] = "Hesse",
        ["Leinfelden-Echterdingen"] = "Baden-Württemberg",
        ["Ottobeuren"] = "Bavaria",
        ["Putbus"] = "Mecklenburg-Vorpommern",
        ["Saaldorf-Surheim"] = "Bavaria",
        ["Seesen"] = "Lower Saxony", // ", Harz"
        ["Seevetal"] = "Lower Saxony",
        ["Sülzetal"] = "Saxony-Anhalt",
        ["Unterneukirchen"] = "Bavaria",
        ["Walsrode"] = "Lower Saxony",
        ["Wolgast"] = "Mecklenburg-Vorpommern",
        ["Woringen"] = "Bavaria",
    };

    // Location strings aren't standardized ("Heilbronn, Neckar" vs plain
    // "Bremen") — the city name is always the leading token before a comma
    // or parenthesis, so match on that rather than requiring an exact
    // full-string match.
    public static string? ResolveState(string? location)
    {
        if (string.IsNullOrWhiteSpace(location))
        {
            return null;
        }

        var primaryCity = location.Split(',', '(')[0].Trim();
        return CityToState.GetValueOrDefault(primaryCity);
    }
}
