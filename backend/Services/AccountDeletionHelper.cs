using Novira.Backend.Data;
using Novira.Backend.Models;

namespace Novira.Backend.Services;

// The one place that actually removes a User row — shared by the lazy
// cooling-off sweep (AccountEndpoints.cs's /auth/verify and the admin user
// list), and the admin's own immediate DELETE /admin/users/{id}. Closes a
// real, pre-existing piece of tech debt (account-deletion logic was
// previously copy-pasted between the self-service and admin-initiated
// endpoints — see CLAUDE.md's "Known issues" list) at the same time this
// flow was built, since both now funnel through here anyway.
public static class AccountDeletionHelper
{
    public static async Task PermanentlyDeleteAsync(
        AppDbContext db, AzureBlobStorageService storage, ILogger logger, User user)
    {
        try
        {
            await storage.DeleteAllForUserAsync(user.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete blob storage files for user {UserId} during account deletion.", user.Id);
        }

        // Only a real cooling-off deletion (DeletionRequestedAt set) is a
        // genuine "why did a user choose to leave" signal worth preserving —
        // an admin's own immediate cleanup (e.g. a test account from this
        // session's own verification work) has no such reason and would
        // just be noise in a log meant to answer that one question.
        if (user.DeletionRequestedAt is not null)
        {
            db.AccountDeletionLogs.Add(new AccountDeletionLog
            {
                Email = user.Email,
                Reason = user.DeletionReason,
                RequestedAt = user.DeletionRequestedAt.Value,
            });
        }

        db.Users.Remove(user);
        await db.SaveChangesAsync();
    }
}
