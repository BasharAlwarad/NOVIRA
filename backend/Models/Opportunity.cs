namespace Novira.Backend.Models;

public enum OpportunityPath
{
    University,
    Ausbildung,
}

public enum OpportunityStatus
{
    Pending,
    Approved,
    Denied,
}

public enum OpportunitySource
{
    Manual,
    Bundesagentur,
}

// Mirrors frontend/src/types/assessment.ts LanguageLevel, corrected in two
// ways the frontend's plain string enum can't express:
// 1. Ordering — the frontend declares "Beginner" last, after C1Plus, which
//    would silently break ordinal (userLevel >= requiredLevel) comparisons
//    if copied verbatim.
// 2. Cross-scale interleaving — the frontend actually uses TWO disjoint
//    subsets of this enum for two different questions: `germanLevel` only
//    ever offers the CEFR options (None/A1/A2/B1/B2/C1/C1Plus), while
//    `englishLevel` only ever offers the casual options
//    (Beginner/Intermediate/Advanced/Fluent) — the two scales never mix on
//    the frontend. But Opportunity.RequiredEnglishLevel needs to be
//    comparable against a user's self-reported (casual-scale) English
//    level, and real opportunity data states English requirements in CEFR
//    terms (e.g. DAAD listings say "English B2"). So the casual terms are
//    interleaved near their commonly-accepted CEFR equivalent
//    (Beginner≈A1, Intermediate≈B1, Advanced≈C1) — deliberately NOT
//    aliased to the exact same integer value as a same-named approach
//    might suggest, because C# resolves an enum value back to a name using
//    whichever member was declared first for that value, so a stored
//    EnglishLevel.Beginner could round-trip out of the database as "A1"
//    instead of "Beginner" if the two shared a value. Every member here has
//    a unique value; the interleaving is an approximation for ordinal
//    comparison, not an official mapping — revisit if it proves too coarse.
//
// WARNING: Postgres stores enum columns as raw integers (RequiredGermanLevel,
// RequiredEnglishLevel on Opportunity; GermanLevel, EnglishLevel on User).
// Changing a member's underlying value here silently reinterprets every
// already-persisted row under the new numbering — there is no migration
// that fixes this automatically. If you renumber this enum, clear and
// re-sync/re-curate Opportunities (OpportunitySeeder was retired 2026-08-12
// once real data existed — see Program.cs) and re-capture or fix any User
// rows with these fields set. This bit us once
// already (2026-08-06) when Intermediate/Advanced/Fluent were added.
public enum LanguageLevel
{
    None = 0,
    A1 = 1,
    Beginner = 2,
    A2 = 3,
    B1 = 4,
    Intermediate = 5,
    B2 = 6,
    C1 = 7,
    Advanced = 8,
    C1Plus = 9,
    Fluent = 10, // near-native — top of the scale
}

// Mirrors frontend/src/types/assessment.ts EducationLevel exactly (declaration order preserved).
public enum EducationLevel
{
    HighSchool,
    TechnicalDiploma,
    Bachelors,
    Masters,
    Doctorate,
}

public class Opportunity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity / display
    public required string Title { get; set; }
    public required string Provider { get; set; }
    public required OpportunityPath Path { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }
    public string? SourceUrl { get; set; }

    // Source tracking — for real sync + dedupe later, unused by hand-curated/fake entries.
    public OpportunitySource Source { get; set; } = OpportunitySource.Manual;
    public string? SourceRef { get; set; }

    // Matching fields — same vocabulary as AssessmentAnswers so comparisons
    // are direct, not freeform text a human/LLM has to interpret.
    // Plain string matching the frontend's 110-value OccupationField string
    // enum by key (e.g. "mechatronics-technician") — deliberately NOT a
    // duplicated 110-entry C# enum, since two independently-maintained
    // 110-entry lists are guaranteed to drift apart.
    public string? OccupationField { get; set; }
    public LanguageLevel? RequiredGermanLevel { get; set; }
    public LanguageLevel? RequiredEnglishLevel { get; set; }
    public bool RequiresCertifiedLanguageProof { get; set; }
    public EducationLevel? MinEducationLevel { get; set; }
    public int? MonthlyCompensationEur { get; set; } // Ausbildung
    public int? TuitionFeeEur { get; set; } // University — 0 for tuition-free public unis
    public DateOnly? StartDate { get; set; }
    public DateOnly? ApplicationDeadline { get; set; }

    // Review
    public OpportunityStatus Status { get; set; } = OpportunityStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}
