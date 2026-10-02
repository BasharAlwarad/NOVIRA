using Microsoft.EntityFrameworkCore;
using Novira.Backend.Models;

namespace Novira.Backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Opportunity> Opportunities => Set<Opportunity>();
    public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<UserDocument> UserDocuments => Set<UserDocument>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<IntakeProfile> IntakeProfiles => Set<IntakeProfile>();
    public DbSet<CvRequest> CvRequests => Set<CvRequest>();
    public DbSet<CvReferenceSettings> CvReferenceSettings => Set<CvReferenceSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        // Deliberately no navigation properties on User for either of these
        // (kept minimal, same as Opportunity/User having no nav properties
        // between them today) — a real FK constraint via Fluent API is still
        // configured for referential integrity, just without traversal.
        modelBuilder.Entity<MagicLinkToken>(entity =>
        {
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasIndex(s => s.TokenHash).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserDocument>(entity =>
        {
            entity.HasIndex(d => d.UserId);
            entity.HasOne<User>().WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
            // Self-referencing, optional — Restrict (not Cascade/SetNull):
            // a superseded document is a historical record and must never
            // silently disappear or get unlinked as a side effect of
            // something else changing. No document-delete endpoint exists
            // today anyway, so this is a safety default more than a path
            // that's actually exercised yet.
            entity.HasOne<UserDocument>().WithMany().HasForeignKey(d => d.SupersedesDocumentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasIndex(m => m.UserId);
            entity.HasOne<User>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasIndex(p => p.UserId);
            entity.HasIndex(p => p.StripeSessionId).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // One row per user — enforced by a unique index, not just app-level
        // convention, since GET/PUT /intake both assume FirstOrDefault finds
        // at most one.
        modelBuilder.Entity<IntakeProfile>(entity =>
        {
            entity.HasIndex(p => p.UserId).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CvRequest>(entity =>
        {
            entity.HasIndex(r => r.UserId);
            entity.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            // Restrict, not Cascade — there's no delete endpoint for
            // Opportunity today, but a CvRequest is a historical record of
            // what was asked for and should never be silently removed as a
            // side effect of something else.
            entity.HasOne<Opportunity>().WithMany().HasForeignKey(r => r.OpportunityId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
