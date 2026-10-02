namespace Novira.Backend.Models;

// Case-status marker, folded into the same table rather than a separate
// initiative (see Architecture.md's "Tier 2 services" build-order note) —
// the intake form itself is the seed of real Tier 2 case tracking, not a
// second thing to build later.
public enum IntakeStatus
{
    NotStarted,
    InProgress,
    Submitted,
}

// One repeatable "experience" entry — deliberately broader than formal
// employment (title/employer/bullets works just as well for an internship,
// part-time job, or school project), since most of NOVIRA's actual users
// are first-time Ausbildung applicants with no formal work history yet (see
// the CV-builder/Lebenslauf research in Architecture.md's intake-form
// design note). Free-text dates, not DateOnly — this is CV content typed by
// the user, not matching data with a real comparison behind it. A plain
// mutable class (not a record) so System.Text.Json doesn't require every
// constructor parameter to be present on a partial/incremental save.
public class IntakeExperienceEntry
{
    public string Title { get; set; } = string.Empty;
    public string Employer { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; } // empty/null = "present"
    public List<string> Bullets { get; set; } = [];
}

public class IntakeEducationEntry
{
    public string Institution { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }
    public string? City { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Grade { get; set; }
}

// The reusable base profile behind Tier 2's CV/cover-letter generation
// (Monetization-Strategy.md §4.1 item 3) — filled once, not per
// application (see Architecture.md's "Tier 2 services" section for the
// full build-order reasoning). One row per user.
//
// Deliberately NOT gated behind Tier2+ to fill in — only the later
// "request a CV" action is (see the intake-form design note in
// Architecture.md). Any signed-up user can build this up, same "free to
// contribute, paid to act on" shape document upload/matching already use.
//
// Experience/Education are stored as JSON arrays (ExperienceJson/
// EducationJson), same convention as UserDocument.AiExtractedDataJson/
// AiFlagsJson — repeatable entries with a fixed shape that nothing in the
// app ever needs to query relationally, so a real child table would be
// schema weight with no matching payoff.
public class IntakeProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }

    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }

    // Photo — reuses AzureBlobStorageService's existing private-container/
    // SAS-URI-on-read pattern (the same one UserDocument uses), not a new
    // upload mechanism. Always optional everywhere in the UI — see
    // Architecture.md's intake design note on why (the AGG, and cultural
    // fit for this specific audience). A fixed blob name per user (see
    // AzureBlobStorageService.UploadIntakePhotoAsync), so a re-upload
    // replaces the previous photo instead of accumulating orphans.
    public string? PhotoBlobName { get; set; }
    public string? PhotoContentType { get; set; }

    public string? DateOfBirth { get; set; } // free text — pre-fillable from User.VerifiedDateOfBirth
    public string? Summary { get; set; }

    public string ExperienceJson { get; set; } = "[]";
    public string EducationJson { get; set; } = "[]";

    public string? TechnicalSkills { get; set; }
    public bool DrivingLicence { get; set; }
    public string? Certifications { get; set; }
    public string? Hobbies { get; set; }

    public IntakeStatus Status { get; set; } = IntakeStatus.NotStarted;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
