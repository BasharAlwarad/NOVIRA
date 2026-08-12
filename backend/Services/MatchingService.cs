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
    List<MatchFactor> Factors);

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
                r.Factors))
            .ToList();
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
        // trust, so this excludes rather than down-ranks.
        if (opportunity.OccupationField is not null
            && !string.Equals(opportunity.OccupationField, profile.OccupationField, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Education minimum — not closeable on any realistic timeline,
        // unlike the soft factors below.
        if (opportunity.MinEducationLevel is { } minEducation
            && (profile.HighestEducation is not { } userEducation || userEducation < minEducation))
        {
            return false;
        }

        return true;
    }

    private static (int Score, List<MatchFactor> Factors) ScoreSoftFactors(User profile, Opportunity opportunity)
    {
        var score = 0;
        var factors = new List<MatchFactor>();

        if (opportunity.RequiredGermanLevel is { } requiredGerman)
        {
            if (profile.GermanLevel is { } userGerman && userGerman >= requiredGerman)
            {
                score += 2;
                factors.Add(new MatchFactor($"Meets the required German level ({requiredGerman})", true));
            }
            else
            {
                score -= 1;
                factors.Add(new MatchFactor(
                    $"German level is below what's typically required ({requiredGerman}) — closeable with study", false));
            }
        }

        if (opportunity.RequiredEnglishLevel is { } requiredEnglish)
        {
            if (profile.EnglishLevel is { } userEnglish && userEnglish >= requiredEnglish)
            {
                score += 2;
                factors.Add(new MatchFactor($"Meets the required English level ({requiredEnglish})", true));
            }
            else
            {
                score -= 1;
                factors.Add(new MatchFactor(
                    $"English level is below what's typically required ({requiredEnglish}) — closeable with study", false));
            }
        }

        if (opportunity.RequiresCertifiedLanguageProof)
        {
            var hasCertificate = profile.LanguageCertificate
                is LanguageCertificateStatus.CertifiedGerman
                or LanguageCertificateStatus.CertifiedEnglish
                or LanguageCertificateStatus.CertifiedBoth;

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

        return (score, factors);
    }

    private static string BucketLabel(int score) => score switch
    {
        >= 3 => "Strong fit",
        >= 0 => "Possible fit",
        _ => "Limited fit",
    };
}
