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

// Mirrors frontend/src/types/assessment.ts LanguageLevel, but with corrected
// CEFR ordering. The frontend declares "Beginner" last, after C1Plus, which
// is fine for a TS string enum but would silently break ordinal
// (userLevel >= requiredLevel) comparisons here if copied verbatim.
public enum LanguageLevel
{
    None = 0,
    Beginner = 1,
    A1 = 2,
    A2 = 3,
    B1 = 4,
    B2 = 5,
    C1 = 6,
    C1Plus = 7,
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
