using Novira.Backend.Models;

namespace Novira.Backend.Services;

public record MatchFactor(string Label, bool Positive);

public record MatchResult(
    Guid OpportunityId,
    string Title,
    string Provider,
    string? Location,
    OpportunityPath Path,
    string FitLabel,
    List<MatchFactor> Factors,
    // Real Opportunity fields that already existed but weren't exposed here
    // — added 2026-09-29 so the one free (unblurred) match on /matches can
    // show enough concrete detail to actually be worth unlocking the rest
    // for, not just a title/provider/fit label. No new data, no incremental
    // leak risk: this one match is already fully de-anonymized by its
    // title+provider, so surfacing its other already-real fields doesn't
    // change what a Free-tier user could already piece together.
    string? Description,
    string? SourceUrl,
    int? MonthlyCompensationEur,
    int? TuitionFeeEur,
    DateOnly? StartDate,
    DateOnly? ApplicationDeadline);

/// <summary>
/// Rule-based matching against real, verified (Approved-only) Opportunity
/// data — no LLM in this pass, per Plan.md §8 ("starts rule-based... LLM
/// only for fuzzy explanation/summarization" comes later, once this shape
/// is proven). Every claim in the output factors is traceable to a real
/// Opportunity field, never free-generated.
///
/// Two kinds of gate, deliberately not conflated (same principle as the
/// requirements-based eligibility check in eligibility-check.ts /
/// Matching-Algorithm-Study.md §7):
/// - Hard filters exclude an opportunity entirely — reserved for things
///   that are either genuinely non-negotiable (wrong occupation field,
///   education below the minimum) or simply stale (an expired application
///   deadline). Excluding, not down-ranking, is correct here because
///   recommending these would be actively wrong, not just a weaker fit.
/// - Soft factors score and explain what survives the filters — language
///   level, certified proof, financial fit — because these are realistically
///   closeable gaps, not permanent disqualifiers. Never used to exclude.
/// </summary>
public static class MatchingService
{
    public static List<MatchResult> Match(User profile, IEnumerable<Opportunity> approvedOpportunities)
    {
        var results = new List<(Opportunity Opportunity, int Score, List<MatchFactor> Factors)>();

        foreach (var opportunity in approvedOpportunities)
        {
            if (!PassesHardFilters(profile, opportunity))
            {
                continue;
            }

            var (score, factors) = ScoreSoftFactors(profile, opportunity);
            results.Add((opportunity, score, factors));
        }

        return results
            .OrderByDescending(r => r.Score)
            .Select(r => new MatchResult(
                r.Opportunity.Id,
                r.Opportunity.Title,
                r.Opportunity.Provider,
                r.Opportunity.Location,
                r.Opportunity.Path,
                BucketLabel(r.Score),
                r.Factors,
                r.Opportunity.Description,
                ResolveSourceUrl(r.Opportunity),
                r.Opportunity.MonthlyCompensationEur,
                r.Opportunity.TuitionFeeEur,
                r.Opportunity.StartDate,
                r.Opportunity.ApplicationDeadline))
            .ToList();
    }

    // Bundesagentur's search API doesn't reliably populate externeURL —
    // confirmed live 2026-09-29 against real data: 0 of 54 synced Approved
    // Ausbildung rows had a SourceUrl, despite OpportunitySyncService
    // correctly mapping it when the API does provide one. Rather than leave
    // every synced listing without a link, fall back to Bundesagentur's own
    // public job-detail page, which resolves from the SourceRef
    // (referenznummer) every synced row already has — a real, confirmed URL
    // pattern (github.com/bundesAPI/jobsuche-api), not a guess.
    private static string? ResolveSourceUrl(Opportunity opportunity)
    {
        if (!string.IsNullOrWhiteSpace(opportunity.SourceUrl))
        {
            return opportunity.SourceUrl;
        }

        if (opportunity.Source == OpportunitySource.Bundesagentur && !string.IsNullOrWhiteSpace(opportunity.SourceRef))
        {
            return $"https://www.arbeitsagentur.de/jobsuche/jobdetail/{Uri.EscapeDataString(opportunity.SourceRef)}";
        }

        return null;
    }

    private static bool PassesHardFilters(User profile, Opportunity opportunity)
    {
        // Stale — recommending an opportunity whose deadline already passed
        // would be actively wrong, not just a weaker fit.
        if (opportunity.ApplicationDeadline is { } deadline
            && deadline < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return false;
        }

        // Occupation relevance — recommending an unrelated field undermines
        // trust, so this excludes rather than down-ranks. Prefers the
        // Level-3 verified value (set only once an admin approves an
        // education certificate whose field of study the AI could
        // confidently map to one of the 110 canonical categories) over the
        // Level-1 self-report when both exist — added 2026-09-11, closing a
        // real gap: every other hard/soft factor already preferred verified
        // data when present, but this one (the single most consequential
        // filter here) had no verified counterpart at all until now — see
        // User.VerifiedOccupationField's own comment.
        var occupationField = profile.VerifiedOccupationField ?? profile.OccupationField;
        if (opportunity.OccupationField is not null
            && !string.Equals(opportunity.OccupationField, occupationField, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Education minimum — not closeable on any realistic timeline,
        // unlike the soft factors below. Prefers the Level-3 verified value
        // (set only once an admin approves an education certificate) over
        // the Level-1 self-report when both exist — see User.cs.
        var highestEducation = profile.VerifiedHighestEducation ?? profile.HighestEducation;
        if (opportunity.MinEducationLevel is { } minEducation
            && (highestEducation is not { } userEducation || userEducation < minEducation))
        {
            return false;
        }

        return true;
    }

    private static (int Score, List<MatchFactor> Factors) ScoreSoftFactors(User profile, Opportunity opportunity)
    {
        var score = 0;
        var factors = new List<MatchFactor>();

        // Same verified-over-self-reported preference as the education
        // filter above — set only once an admin approves a language
        // certificate.
        var germanLevel = profile.VerifiedGermanLevel ?? profile.GermanLevel;
        var isGermanVerified = profile.VerifiedGermanLevel is not null;
        var englishLevel = profile.VerifiedEnglishLevel ?? profile.EnglishLevel;
        var isEnglishVerified = profile.VerifiedEnglishLevel is not null;

        if (opportunity.RequiredGermanLevel is { } requiredGerman)
        {
            var verifiedSuffix = isGermanVerified ? " — verified" : "";
            if (germanLevel is { } userGerman && userGerman >= requiredGerman)
            {
                score += 2;
                factors.Add(new MatchFactor($"Meets the required German level ({requiredGerman}){verifiedSuffix}", true));
            }
            else
            {
                score -= 1;
                factors.Add(new MatchFactor(
                    $"German level is below what's typically required ({requiredGerman}) — closeable with study{verifiedSuffix}", false));
            }
        }

        if (opportunity.RequiredEnglishLevel is { } requiredEnglish)
        {
            var verifiedSuffix = isEnglishVerified ? " — verified" : "";
            if (englishLevel is { } userEnglish && userEnglish >= requiredEnglish)
            {
                score += 2;
                factors.Add(new MatchFactor($"Meets the required English level ({requiredEnglish}){verifiedSuffix}", true));
            }
            else
            {
                score -= 1;
                factors.Add(new MatchFactor(
                    $"English level is below what's typically required ({requiredEnglish}) — closeable with study{verifiedSuffix}", false));
            }
        }

        if (opportunity.RequiresCertifiedLanguageProof)
        {
            // Additive with the self-report, not a replacement (added
            // 2026-09-11) — an approved LanguageCertificate document is
            // direct, unambiguous proof of exactly this, but a verified
            // "yes" should only ever add confidence, never make a
            // self-reported "yes" go away if a document somehow wasn't
            // (yet) uploaded for it.
            var hasCertificate = profile.LanguageCertificate
                is LanguageCertificateStatus.CertifiedGerman
                or LanguageCertificateStatus.CertifiedEnglish
                or LanguageCertificateStatus.CertifiedBoth
                || profile.VerifiedHasCertifiedLanguageProof;

            if (hasCertificate)
            {
                score += 1;
                factors.Add(new MatchFactor("Already holds a certified language exam result", true));
            }
            else
            {
                score -= 1;
                factors.Add(new MatchFactor("A certified language exam result will be needed before applying", false));
            }
        }

        // Overqualification adjustment (added 2026-09-11) — a real gap
        // identified in Matching-Algorithm-Study.md §6's own research: a
        // synthetic senior-professional profile (Bachelor's+, 5+ years'
        // experience) scored "Strong fit" for Ausbildung in testing, when
        // in reality someone that experienced would rarely want to restart
        // as an entry-level apprentice. That finding was specifically about
        // the separate Tier 1 verdict engine (assessment-verdict.ts,
        // pre-signup, no real opportunity involved); this closes the same
        // conceptual gap here, where it actually matters more — a real
        // "Strong fit" label on a real opportunity. A soft down-rank, not a
        // hard exclusion: Ausbildung isn't wrong for an overqualified
        // profile, just usually not their best fit, so the listing still
        // surfaces with an honest explanation rather than being hidden.
        // Same Verified-over-self-report preference as every other factor
        // here (education filter above, language levels below).
        if (opportunity.Path == OpportunityPath.Ausbildung)
        {
            var highestEducation = profile.VerifiedHighestEducation ?? profile.HighestEducation;
            var isHighlyEducated = highestEducation is { } education && education >= EducationLevel.Bachelors;
            var isExperienced = profile.WorkExperience is WorkExperience.TwoToFiveYears or WorkExperience.MoreThanFiveYears;

            if (isHighlyEducated && isExperienced)
            {
                score -= 3;
                factors.Add(new MatchFactor(
                    "Your education and work experience level typically fit University or direct employment better than an entry-level Ausbildung", false));
            }
        }

        if (opportunity.Path == OpportunityPath.Ausbildung && opportunity.MonthlyCompensationEur is { } compensation)
        {
            var tightFinances = profile.FinancialSituation
                is FinancialSituation.LessThan5000
                or FinancialSituation.Unsure;

            if (tightFinances && compensation >= 900)
            {
                score += 1;
                factors.Add(new MatchFactor($"Pays €{compensation}/month, which helps close the financial gap", true));
            }
        }
        else if (opportunity.Path == OpportunityPath.University && opportunity.TuitionFeeEur == 0)
        {
            score += 1;
            factors.Add(new MatchFactor("Tuition-free", true));
        }

        // Start timeline (added 2026-09-11) — a real gap: StartTimeline was
        // collected in the assessment and StartDate exists on Opportunity
        // (populated for many synced Ausbildung listings), but neither was
        // ever compared against the other anywhere in matching. Skipped
        // entirely when either side has nothing to compare (no StartDate on
        // this listing, or the user selected "still exploring" — genuinely
        // undecided, not a preference to score against). Deliberately
        // additive-only, no penalty for a mismatch: unlike the education/
        // language/overqualification factors above (real capability or
        // suitability gaps), a start date that doesn't line up with a
        // stated preference is a scheduling detail, not a fit problem —
        // penalizing it would unfairly tank an otherwise strong match over
        // something this soft. Same "approximate windows, not exact-day
        // math" precision as everywhere else timelines get compared in
        // this app.
        if (opportunity.StartDate is { } startDate && profile.StartTimeline is { } timeline
            && timeline != StartTimeline.StillExploring)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var matchesTimeline = timeline switch
            {
                StartTimeline.AsSoonAsPossible => startDate <= today.AddMonths(6),
                StartTimeline.SixToTwelveMonths => startDate > today.AddMonths(5) && startDate <= today.AddMonths(13),
                StartTimeline.MoreThanAYear => startDate > today.AddMonths(12),
                _ => false,
            };

            if (matchesTimeline)
            {
                score += 1;
                factors.Add(new MatchFactor($"Starts {startDate:MMM yyyy}, matching your preferred timeline", true));
            }
        }

        // Region flexibility (added 2026-09-11, same session) — a third
        // real gap: RegionFlexibility was collected but never compared
        // against anything. Only the MajorCitiesOnly case has anything
        // meaningful to check — OpenToAnyRegion/NotSureYet mean every
        // location already fits that preference, so there's nothing a
        // per-opportunity factor could usefully say (same reasoning
        // StillExploring is skipped for StartTimeline above). Opportunity
        // has no structured region/city-tier field, only a free-text
        // Location, so this leans on a small curated city list
        // (MajorGermanCities.cs) rather than guessing.
        //
        // Deliberately additive-only, same reasoning as StartTimeline above
        // but doubly so here: MajorGermanCities is explicitly non-
        // exhaustive, so a "miss" could just as easily be an undetected
        // real major city as a genuine mismatch — penalizing on a signal
        // this unreliable would tank real good matches over a curated
        // list's own incompleteness, not the opportunity's actual fit.
        if (profile.RegionFlexibility == RegionFlexibility.MajorCitiesOnly
            && opportunity.Location is { } location
            && MajorGermanCities.All.Any(city => location.Contains(city, StringComparison.OrdinalIgnoreCase)))
        {
            score += 1;
            factors.Add(new MatchFactor($"Located in {location}, a major city — matches your location preference", true));
        }

        return (score, factors);
    }

    private static string BucketLabel(int score) => score switch
    {
        >= 3 => "Strong fit",
        >= 0 => "Possible fit",
        _ => "Limited fit",
    };
}
