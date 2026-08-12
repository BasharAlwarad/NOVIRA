namespace Novira.Backend.Models;

// Mirrors frontend/src/types/assessment.ts's WorkExperience exactly.
public enum WorkExperience
{
    None,
    LessThanTwoYears,
    TwoToFiveYears,
    MoreThanFiveYears,
}

// Mirrors frontend/src/types/assessment.ts's DesiredPath exactly. Note this
// is a different, larger set than Models/Opportunity.cs's OpportunityPath
// (University/Ausbildung only) — a user can want Employment or be Unsure,
// an opportunity can't.
public enum DesiredPath
{
    University,
    Ausbildung,
    Employment,
    Unsure,
}

// Mirrors frontend/src/types/assessment.ts's LanguageCertificateStatus exactly.
public enum LanguageCertificateStatus
{
    None,
    CertifiedGerman,
    CertifiedEnglish,
    CertifiedBoth,
}

// Mirrors frontend/src/types/assessment.ts's PassportStatus exactly.
public enum PassportStatus
{
    Yes,
    No,
    Expired,
}

// Mirrors frontend/src/types/assessment.ts's GermanyConnection exactly —
// a multi-select on the frontend, stored here as a native Postgres array.
public enum GermanyConnection
{
    None,
    VisitedBefore,
    LivedStudiedTrainedBefore,
    FamilyInGermany,
    FriendsInGermany,
    AttendedGermanSchoolOrInstitute,
    PriorApplicationOrContact,
    GermanHeritage,
}

// Mirrors frontend/src/types/assessment.ts's FinancialSituation exactly.
public enum FinancialSituation
{
    LessThan5000,
    Between5000And12000,
    MoreThan12000,
    Unsure,
}

// Mirrors frontend/src/types/assessment.ts's StartTimeline exactly.
public enum StartTimeline
{
    AsSoonAsPossible,
    SixToTwelveMonths,
    MoreThanAYear,
    StillExploring,
}

// Mirrors frontend/src/types/assessment.ts's RegionFlexibility exactly.
public enum RegionFlexibility
{
    MajorCitiesOnly,
    OpenToAnyRegion,
    NotSureYet,
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Email { get; set; }
    public string? FullName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Tier 1 profile snapshot — captured (and overwritten) at email-capture
    // time. Self-reported, no verification of any kind yet: this is Level 1
    // of the eventual user-data model (self-report -> document verification
    // -> human verification -> future AI/human interview), and deliberately
    // stops there for now. All nullable since the profile may be partial or
    // not yet captured for a given row.
    public string? Country { get; set; }
    public string? Age { get; set; }
    public EducationLevel? HighestEducation { get; set; }
    public string? OccupationField { get; set; }
    public WorkExperience? WorkExperience { get; set; }
    public DesiredPath? DesiredPath { get; set; }
    public LanguageLevel? GermanLevel { get; set; }
    public LanguageLevel? EnglishLevel { get; set; }
    public LanguageCertificateStatus? LanguageCertificate { get; set; }
    public PassportStatus? PassportStatus { get; set; }
    public List<GermanyConnection>? GermanyConnection { get; set; }
    public FinancialSituation? FinancialSituation { get; set; }
    public StartTimeline? StartTimeline { get; set; }
    public RegionFlexibility? RegionFlexibility { get; set; }
    public DateTime? ProfileUpdatedAt { get; set; }
}
