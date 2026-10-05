namespace Novira.Backend.Models;

// A user's own "I applied to this" marker for one of their matches — the
// first time a /matches result becomes a persisted, trackable thing rather
// than a value computed fresh on every request (see MatchingService.Match(),
// which never touches the database). Lazily created only when the user
// marks a match applied; un-marking deletes the row entirely rather than
// storing a boolean flag, so this table only ever holds genuinely-applied
// matches, not a row per match ever shown. Deliberately not tied to
// CvRequest — most real applications (University, most Ausbildung) don't
// need NOVIRA's CV-generation help at all, so this has to work for any
// match, not just ones that went through that flow.
public class MatchActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required Guid UserId { get; set; }
    public required Guid OpportunityId { get; set; }
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
}
