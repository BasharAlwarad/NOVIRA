using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Services;

// Real cost/scope visibility for one Generate University run (added
// 2026-08-30, see OpportunitySyncService's cost-control comments below) —
// surfaced up to the admin UI so a run's actual spend is never a guess.
public record UniversityGenerationResult(
    int Added, int FieldsResearched, int FieldsSkipped, long InputTokens, long OutputTokens, decimal EstimatedCostUsd);

/// <summary>
/// Fetches real Ausbildung listings from the Bundesagentur Jobsuche API and
/// upserts them as Pending Opportunity rows, going through the same
/// approve/deny admin review as the fake seed data — nothing synced is ever
/// auto-published. Manually triggered (POST /admin/opportunities/sync), not
/// a background job, per the "review roughly daily, no scheduler needed yet"
/// plan (CLAUDE.md/Plan.md §8).
///
/// Also owns University generation (GenerateUniversityAsync below, added
/// 2026-08-29) — same "one orchestrator that knows how to add Opportunity
/// rows to the DB" role, just backed by UniversityResearchService's AI
/// research instead of a government API.
/// </summary>
public class OpportunitySyncService(
    BundesagenturJobsucheClient client,
    UniversityResearchService universityResearch,
    AppDbContext db,
    ILogger<OpportunitySyncService> logger)
{
    public async Task<int> SyncAusbildungAsync(int size = 25, CancellationToken cancellationToken = default)
    {
        var listings = await client.SearchAusbildungAsync(size, cancellationToken);
        var added = 0;

        foreach (var listing in listings)
        {
            if (string.IsNullOrWhiteSpace(listing.Referenznummer))
            {
                continue; // Can't dedupe without a stable reference — skip rather than risk duplicates.
            }

            var alreadyExists = await db.Opportunities.AnyAsync(
                o => o.Source == OpportunitySource.Bundesagentur && o.SourceRef == listing.Referenznummer,
                cancellationToken);

            if (alreadyExists)
            {
                continue;
            }

            db.Opportunities.Add(new Opportunity
            {
                Title = listing.StellenangebotsTitel ?? "Ausbildung position",
                Provider = listing.Firma ?? "Unknown employer",
                Path = OpportunityPath.Ausbildung,
                Location = listing.Stellenlokationen?.FirstOrDefault()?.Adresse?.Ort,
                Description = BuildDescription(listing),
                SourceUrl = listing.ExterneUrl,
                Source = OpportunitySource.Bundesagentur,
                SourceRef = listing.Referenznummer,
                OccupationField = OccupationFieldMapper.Map(listing.Hauptberuf),
                // Per Matching-Algorithm-Study.md §2.2: Ausbildung has no
                // fixed academic prerequisite beyond a basic school-leaving
                // certificate. This is a well-sourced general default, not a
                // guess about this specific listing — the API's own
                // education-requirement field is inconsistently populated
                // and we don't fabricate a per-listing figure it doesn't
                // actually state.
                MinEducationLevel = EducationLevel.HighSchool,
                // RequiredGermanLevel/RequiredEnglishLevel/MonthlyCompensationEur/
                // ApplicationDeadline are deliberately left null — the live
                // API rarely states these (confirmed 2026-08-09: most
                // listings return "KEINE_ANGABEN" for pay, no deadline
                // field at all). Leaving them null is honest; guessing a
                // plausible-sounding figure would not be.
                StartDate = ParseDate(listing.Eintrittszeitraum?.Von),
                Status = OpportunityStatus.Pending,
            });

            added++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return added;
    }

    // Priority occupation fields — originally the 4 CLAUDE.md's "Real
    // university data" entry says the hand-curated batch already targeted
    // (nursing, IT, engineering, finance), since those were already
    // dominant in the real Ausbildung data (Matching-Algorithm-Study.md
    // §8's field-prioritization note). Widened 2026-08-30 after a real
    // account with occupationField "hotel-management" got 0 University
    // matches despite 15 Approved rows existing — none of them covered a
    // field that account's profile actually had, a genuine gap in
    // coverage, not a matching-logic bug (see CLAUDE.md for the full
    // diagnosis). Added 4 more fields with real, common German university-
    // degree equivalents: hotel-management (International Hotel/Hospitality
    // Management is a real Bachelor's offered at several German
    // universities), electrical-engineering/civil-engineering (Elektro-
    // technik/Bauingenieurwesen, as common as mechanical engineering), and
    // data-cybersecurity (a real, growing Master's-level field). One
    // research call per field — see UniversityResearchService.ResearchAsync's
    // own comment for why occupationField is set here, server-side, never
    // trusted from the model's own output.
    private static readonly (string Key, string Description)[] PriorityUniversityFields =
    [
        ("nursing", "nursing / healthcare"),
        ("software-development", "computer science / software development"),
        ("mechanical-engineering", "mechanical engineering"),
        ("accounting-finance", "business administration / accounting / finance"),
        ("hotel-management", "hotel management / hospitality management"),
        ("electrical-engineering", "electrical engineering"),
        ("civil-engineering", "civil engineering"),
        ("data-cybersecurity", "data science / cybersecurity"),
    ];

    // Below this many Approved rows, a field is still worth spending on;
    // at or above it, skip — re-researching an already-well-covered field
    // wastes real money for no real gain. Found necessary live 2026-08-30:
    // a full 8-field run re-searched "nursing" (already 5 Approved) at the
    // same cost as a genuinely uncovered field.
    private const int CoverageThreshold = 3;

    // Hard cap on how many fields one click ever researches — bounds the
    // worst case per click regardless of how long PriorityUniversityFields
    // grows in the future (found necessary the same day: widening 4→8
    // fields directly doubled a single click's cost with no ceiling).
    // Uncovered fields are prioritized: this always spends on whatever
    // needs it most, never running out of budget on fields near the end of
    // the list just because of declaration order.
    private const int MaxFieldsPerRun = 3;

    public async Task<UniversityGenerationResult> GenerateUniversityAsync(CancellationToken cancellationToken = default)
    {
        var approvedCounts = await db.Opportunities
            .Where(o => o.Path == OpportunityPath.University && o.Status == OpportunityStatus.Approved && o.OccupationField != null)
            .GroupBy(o => o.OccupationField!)
            .Select(g => new { Field = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Field, x => x.Count, cancellationToken);

        var fieldsToResearch = PriorityUniversityFields
            .Where(f => approvedCounts.GetValueOrDefault(f.Key, 0) < CoverageThreshold)
            .Take(MaxFieldsPerRun)
            .ToList();
        var fieldsSkipped = PriorityUniversityFields.Length - fieldsToResearch.Count;

        var added = 0;
        long totalInputTokens = 0;
        long totalOutputTokens = 0;
        decimal totalEstimatedCostUsd = 0;

        foreach (var (key, description) in fieldsToResearch)
        {
            ResearchOutcome outcome;
            try
            {
                outcome = await universityResearch.ResearchAsync(key, description, cancellationToken);
            }
            catch (Exception ex)
            {
                // One field failing (a transient API error, a malformed
                // response) must not lose the fields that already
                // succeeded — same "don't let one bad item sink the whole
                // run" discipline as SyncAusbildungAsync's per-listing
                // dedupe-skip above.
                logger.LogError(ex, "University research failed for occupation field {Field}.", key);
                continue;
            }

            totalInputTokens += outcome.InputTokens;
            totalOutputTokens += outcome.OutputTokens;
            totalEstimatedCostUsd += outcome.EstimatedCostUsd;

            foreach (var candidate in outcome.Candidates)
            {
                var normalizedProvider = candidate.Provider.Trim().ToLowerInvariant();
                var normalizedTitle = candidate.Title.Trim().ToLowerInvariant();

                // No stable external ID like Bundesagentur's Referenznummer
                // exists for AI-researched candidates, so dedup is on
                // normalized (Provider, Title) instead — across ANY status,
                // not just Pending, so a program already Approved or Denied
                // in a prior run is never re-inserted either.
                var alreadyExists = await db.Opportunities.AnyAsync(o =>
                    o.Path == OpportunityPath.University
                    && o.Provider.ToLower() == normalizedProvider
                    && o.Title.ToLower() == normalizedTitle,
                    cancellationToken);

                if (alreadyExists)
                {
                    continue;
                }

                LanguageLevel? germanLevel = candidate.RequiredGermanLevel is not null
                    && Enum.TryParse<LanguageLevel>(candidate.RequiredGermanLevel, out var parsedGerman)
                    ? parsedGerman
                    : null;
                LanguageLevel? englishLevel = candidate.RequiredEnglishLevel is not null
                    && Enum.TryParse<LanguageLevel>(candidate.RequiredEnglishLevel, out var parsedEnglish)
                    ? parsedEnglish
                    : null;
                EducationLevel? minEducation = candidate.MinEducationLevel is not null
                    && Enum.TryParse<EducationLevel>(candidate.MinEducationLevel, out var parsedEducation)
                    ? parsedEducation
                    : null;
                int? tuitionFee = candidate.TuitionFeeEurText is not null
                    && int.TryParse(candidate.TuitionFeeEurText, out var parsedTuition)
                    ? parsedTuition
                    : null;
                // TryParseExact against the exact ISO format the extraction
                // prompt requests, with InvariantCulture — same ambient-
                // culture fix applied to passport-expiry parsing elsewhere
                // in this app (found in code review 2026-08-28).
                DateOnly? deadline = candidate.ApplicationDeadlineIso is not null
                    && DateOnly.TryParseExact(candidate.ApplicationDeadlineIso, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDeadline)
                    ? parsedDeadline
                    : null;

                db.Opportunities.Add(new Opportunity
                {
                    Title = candidate.Title,
                    Provider = candidate.Provider,
                    Path = OpportunityPath.University,
                    Location = candidate.Location,
                    Description = candidate.Description,
                    SourceUrl = candidate.SourceUrl,
                    Source = OpportunitySource.AiResearch,
                    OccupationField = key,
                    RequiredGermanLevel = germanLevel,
                    RequiredEnglishLevel = englishLevel,
                    RequiresCertifiedLanguageProof = candidate.RequiresCertifiedLanguageProof,
                    MinEducationLevel = minEducation,
                    TuitionFeeEur = tuitionFee,
                    ApplicationDeadline = deadline,
                    Status = OpportunityStatus.Pending,
                });

                added++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Generate University run: {FieldsResearched} researched, {FieldsSkipped} skipped (already covered), {Added} added, ~${EstimatedCostUsd} total.",
            fieldsToResearch.Count, fieldsSkipped, added, totalEstimatedCostUsd);

        return new UniversityGenerationResult(
            added, fieldsToResearch.Count, fieldsSkipped, totalInputTokens, totalOutputTokens, totalEstimatedCostUsd);
    }

    private static string BuildDescription(JobsucheListing listing)
    {
        var role = listing.Hauptberuf ?? listing.StellenangebotsTitel ?? "this position";
        var employer = listing.Firma ?? "the employer";
        var location = listing.Stellenlokationen?.FirstOrDefault()?.Adresse?.Ort;

        return location is null
            ? $"Ausbildung as {role} at {employer}. Sourced from the Bundesagentur für Arbeit Jobsuche API."
            : $"Ausbildung as {role} at {employer} in {location}. Sourced from the Bundesagentur für Arbeit Jobsuche API.";
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var date) ? date : null;
}
