namespace Novira.Backend.Models;

public enum CvRequestStatus
{
    Requested,
    InReview,
    Delivered,
}

// Tier 2's per-match "request a CV" action (Architecture.md's "Tier 2
// services" build order, step 3) — tied to a specific Opportunity, not a
// generic "make me a CV" request, since a tailored CV/cover letter needs the
// target opportunity's own requirements on top of the base intake profile
// (see IntakeProfile.cs).
//
// Status is a pure tracking flag for this first pass, not itself the
// delivery mechanism — there's no AI generation or file-attachment system
// built yet (step 5, deliberately last). The founder reviews the request,
// prepares the actual CV however they currently do that, and sends it
// through the existing admin message-compose tool on the user's own detail
// page; marking a request Delivered here just records that it happened.
public class CvRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required Guid OpportunityId { get; set; }

    // Snapshotted at request time, not joined live — a historical record of
    // what was actually requested shouldn't silently change if the
    // opportunity listing is later edited, denied, or its deadline passes
    // (same "a historical record must never change out from under you"
    // reasoning as UserDocument.SupersedesDocumentId).
    public required string OpportunityTitle { get; set; }
    public required string OpportunityProvider { get; set; }

    public CvRequestStatus Status { get; set; } = CvRequestStatus.Requested;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // AI generation state (built 2026-10-01, closing the "founder drafts by
    // hand" gap) — JSON-serialized CvDraftContent/CoverLetterDraftContent,
    // same storage convention as IntakeProfile's ExperienceJson/
    // EducationJson. Null until the admin first clicks "Generate with AI".
    public string? CvContentJson { get; set; }
    public string? CoverLetterContentJson { get; set; }

    // The raw Claude conversation (List<CvConversationTurn> JSON) — lets
    // "ask for changes" be a real conversational revision (Claude sees its
    // own prior draft plus the admin's specific feedback) rather than a
    // from-scratch regeneration that might lose what was already right.
    public string? ConversationJson { get; set; }
    public int RevisionCount { get; set; }
    public DateTime? LastGeneratedAt { get; set; }

    // Admin-curated "use this as a good example for future generations"
    // flag (see CvGenerationService) — deliberately opt-in, not every
    // approved request, so the reference pool only grows with examples the
    // founder has actually judged good, not everything that happened to get
    // approved (an automatic/self-reinforcing pool could just as easily
    // compound a mediocre early draft's style).
    public bool IsReferenceExample { get; set; }
}
