namespace Novira.Backend.Models;

// A durable record of *why* someone left, surviving the account's own
// deletion — written at the moment the real, permanent deletion executes
// (the end of the 7-day cooling-off window), not at request time. Without
// this, asking a user "why are you leaving" would be pointless: the answer
// would be destroyed along with everything else days later, and the
// founder would never see it. No FK to User — deliberately outlives it, a
// one-way export of exactly the two facts worth keeping (who, why), not a
// shadow copy of the account.
public class AccountDeletionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Email { get; set; }
    public string? Reason { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
}
