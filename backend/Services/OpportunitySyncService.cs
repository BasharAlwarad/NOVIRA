using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Services;

/// <summary>
/// Fetches real Ausbildung listings from the Bundesagentur Jobsuche API and
/// upserts them as Pending Opportunity rows, going through the same
/// approve/deny admin review as the fake seed data — nothing synced is ever
/// auto-published. Manually triggered (POST /admin/opportunities/sync), not
/// a background job, per the "review roughly daily, no scheduler needed yet"
/// plan (CLAUDE.md/Plan.md §8).
/// </summary>
public class OpportunitySyncService(BundesagenturJobsucheClient client, AppDbContext db)
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
