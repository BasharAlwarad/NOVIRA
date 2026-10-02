using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Novira.Backend.Data;
using Novira.Backend.Hubs;
using Novira.Backend.Models;
using Novira.Backend.Services;

namespace Novira.Backend.Endpoints;

public record AdminCvRequestResponse(
    Guid Id,
    Guid UserId,
    string UserEmail,
    Guid OpportunityId,
    string OpportunityTitle,
    string OpportunityProvider,
    CvRequestStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    bool HasDraft,
    int RevisionCount,
    bool IsReferenceExample);

public record UpdateCvRequestStatusRequest(CvRequestStatus Status);

public record CvDraftResponse(
    CvDraftContent? Cv,
    CoverLetterDraftContent? CoverLetter,
    int RevisionCount,
    DateTime? LastGeneratedAt,
    long InputTokens,
    long OutputTokens,
    decimal EstimatedCostUsd,
    string? Error);

public record ReviseCvRequest(string Feedback);
public record SetReferenceExampleRequest(bool IsReferenceExample);

// The founder-facing queue for Tier2+ CV requests (Architecture.md's "Tier 2
// services" build order, step 4 — review before delivery) plus the AI
// generation/revision pipeline (step 5, built 2026-10-01). Admin-key
// protected, same AdminAuthFilter as every other internal tool. The
// Requested/InReview/Delivered status stays a pure tracking flag — actually
// sending the finished CV/cover letter still goes through the existing
// per-user message-compose tool, not a new one built here (see the next
// phase of this build for the file-attachment delivery piece).
public static class CvRequestsAdminEndpoints
{
    // Bounds the generation prompt's size/cost regardless of how large the
    // reference pool grows later — same "cap it regardless of how long the
    // list gets" discipline UniversityResearchService's MaxFieldsPerRun uses.
    private const int MaxReferenceExamples = 3;

    public static void MapCvRequestsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/cv-requests").AddEndpointFilter<AdminAuthFilter>();

        group.MapGet("/", async (AppDbContext db) =>
        {
            var requests = await db.CvRequests.OrderByDescending(r => r.CreatedAt).ToListAsync();
            var userIds = requests.Select(r => r.UserId).Distinct().ToList();
            var emails = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Email);

            return Results.Ok(requests.Select(r => ToResponse(r, emails.GetValueOrDefault(r.UserId, "(deleted user)"))));
        });

        group.MapPatch("/{id:guid}", async (Guid id, UpdateCvRequestStatusRequest request, AppDbContext db) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null)
            {
                return Results.NotFound();
            }

            cvRequest.Status = request.Status;
            cvRequest.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(cvRequest.UserId);
            return Results.Ok(ToResponse(cvRequest, user?.Email ?? "(deleted user)"));
        });

        group.MapGet("/{id:guid}/draft", async (Guid id, AppDbContext db) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(ToDraftResponse(cvRequest, 0, 0, 0, null));
        });

        // Renders the *current* stored draft on demand — cheap and
        // deterministic (CvPdfRenderer.cs), so there's no reason to persist
        // bytes yet while the content can still be revised. That becomes
        // relevant once real file-attachment delivery is built (not yet).
        group.MapGet("/{id:guid}/pdf/cv", async (Guid id, AppDbContext db, AzureBlobStorageService storage) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null || string.IsNullOrWhiteSpace(cvRequest.CvContentJson))
            {
                return Results.Json(
                    new { message = "No CV draft exists yet — generate one first." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var (pdfBytes, cv) = await RenderCvPdfAsync(cvRequest, db, storage);
            return Results.File(pdfBytes, "application/pdf", $"CV - {cv.FullName}.pdf");
        });

        group.MapGet("/{id:guid}/pdf/cover-letter", async (Guid id, AppDbContext db) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null || string.IsNullOrWhiteSpace(cvRequest.CoverLetterContentJson))
            {
                return Results.Json(
                    new { message = "No cover letter draft exists yet — generate one first." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var pdfBytes = RenderCoverLetterPdf(cvRequest);
            return Results.File(pdfBytes, "application/pdf", $"Cover Letter - {cvRequest.OpportunityTitle}.pdf");
        });

        // The real delivery action — closes the gap found live 2026-10-02:
        // "Mark delivered" was a pure status flag with no way to actually
        // get the finished documents to the user, so the match card's "CV
        // delivered — check your messages" copy was promising something
        // that never happened. Renders both PDFs from the current draft,
        // uploads them, and sends two real Messages with attachments — then
        // marks the request Delivered as a side effect of something
        // genuinely having been delivered, not a separate manual step.
        group.MapPost("/{id:guid}/deliver", async (
            Guid id, AppDbContext db, AzureBlobStorageService storage, IHubContext<MessagesHub> hub) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null || string.IsNullOrWhiteSpace(cvRequest.CvContentJson)
                || string.IsNullOrWhiteSpace(cvRequest.CoverLetterContentJson))
            {
                return Results.Json(
                    new { message = "Generate a CV and cover letter before delivering." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var (cvPdfBytes, cv) = await RenderCvPdfAsync(cvRequest, db, storage);
            var coverLetterPdfBytes = RenderCoverLetterPdf(cvRequest);

            var cvFileName = $"CV - {cvRequest.OpportunityTitle}.pdf";
            var coverLetterFileName = $"Cover Letter - {cvRequest.OpportunityTitle}.pdf";

            string cvBlobName;
            string coverLetterBlobName;
            using (var cvStream = new MemoryStream(cvPdfBytes))
            {
                cvBlobName = await storage.UploadCvDeliverableAsync(cvRequest.UserId, cvFileName, "application/pdf", cvStream);
            }
            using (var letterStream = new MemoryStream(coverLetterPdfBytes))
            {
                coverLetterBlobName = await storage.UploadCvDeliverableAsync(cvRequest.UserId, coverLetterFileName, "application/pdf", letterStream);
            }

            await MessagesEndpoints.CreateAdminMessageAsync(
                db, hub, cvRequest.UserId,
                "Your CV is ready",
                $"Your CV for \"{cvRequest.OpportunityTitle}\" at {cvRequest.OpportunityProvider} is ready — download it below. Reply here if you'd like any changes.",
                cvBlobName, cvFileName, "application/pdf");

            await MessagesEndpoints.CreateAdminMessageAsync(
                db, hub, cvRequest.UserId,
                "Your cover letter is ready",
                $"Your cover letter for \"{cvRequest.OpportunityTitle}\" at {cvRequest.OpportunityProvider} is ready — download it below.",
                coverLetterBlobName, coverLetterFileName, "application/pdf");

            cvRequest.Status = CvRequestStatus.Delivered;
            cvRequest.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(cvRequest.UserId);
            return Results.Ok(ToResponse(cvRequest, user?.Email ?? "(deleted user)"));
        });

        group.MapPost("/{id:guid}/generate", async (Guid id, AppDbContext db, CvGenerationService generation) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null)
            {
                return Results.NotFound();
            }

            var user = await db.Users.FindAsync(cvRequest.UserId);
            if (user is null)
            {
                return Results.NotFound();
            }

            var intake = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == cvRequest.UserId);
            if (intake is null)
            {
                return Results.Json(
                    new { message = "This user hasn't filled in their CV profile (intake form) yet." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var opportunity = await db.Opportunities.FindAsync(cvRequest.OpportunityId);
            if (opportunity is null)
            {
                return Results.Json(
                    new { message = "The target opportunity no longer exists." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var houseStyle = await db.CvReferenceSettings.FindAsync(CvReferenceSettings.SingletonId);
            var referenceExamples = await db.CvRequests
                .Where(r => r.IsReferenceExample && r.CvContentJson != null && r.Id != id)
                .OrderByDescending(r => r.LastGeneratedAt)
                .Take(MaxReferenceExamples)
                .ToListAsync();

            // Full name isn't an IntakeProfile field (it never collects
            // one) — it comes from User, preferring the Level-3 Verified
            // value (promoted only from an admin-approved document) over
            // the Level-1 self-report, same "verified wins" preference
            // MatchingService already applies everywhere else.
            var fullName = user.VerifiedFullName ?? user.FullName ?? "(name not on file — ask the user to confirm)";

            var prompt = BuildGenerationPrompt(fullName, intake, opportunity, houseStyle?.GuideText, referenceExamples);
            var outcome = await generation.GenerateAsync(prompt);

            return await ApplyOutcomeAsync(db, cvRequest, outcome);
        });

        group.MapPost("/{id:guid}/revise", async (Guid id, ReviseCvRequest request, AppDbContext db, CvGenerationService generation) =>
        {
            if (string.IsNullOrWhiteSpace(request.Feedback))
            {
                return Results.BadRequest(new { message = "Describe what should change." });
            }

            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null)
            {
                return Results.NotFound();
            }

            if (string.IsNullOrWhiteSpace(cvRequest.ConversationJson))
            {
                return Results.Json(
                    new { message = "Generate a first draft before asking for changes." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var outcome = await generation.ReviseAsync(cvRequest.ConversationJson, request.Feedback.Trim());
            return await ApplyOutcomeAsync(db, cvRequest, outcome);
        });

        group.MapPatch("/{id:guid}/reference-example", async (Guid id, SetReferenceExampleRequest request, AppDbContext db) =>
        {
            var cvRequest = await db.CvRequests.FindAsync(id);
            if (cvRequest is null)
            {
                return Results.NotFound();
            }

            if (request.IsReferenceExample && string.IsNullOrWhiteSpace(cvRequest.CvContentJson))
            {
                return Results.Json(
                    new { message = "Generate a draft before marking this as a reference example." },
                    statusCode: StatusCodes.Status400BadRequest);
            }

            cvRequest.IsReferenceExample = request.IsReferenceExample;
            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(cvRequest.UserId);
            return Results.Ok(ToResponse(cvRequest, user?.Email ?? "(deleted user)"));
        });
    }

    private static async Task<IResult> ApplyOutcomeAsync(AppDbContext db, CvRequest cvRequest, CvGenerationOutcome outcome)
    {
        cvRequest.ConversationJson = outcome.ConversationJson;

        if (outcome.Result is not null)
        {
            cvRequest.CvContentJson = JsonSerializer.Serialize(outcome.Result.Cv);
            cvRequest.CoverLetterContentJson = JsonSerializer.Serialize(outcome.Result.CoverLetter);
            cvRequest.RevisionCount += 1;
            cvRequest.LastGeneratedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(ToDraftResponse(cvRequest, outcome.InputTokens, outcome.OutputTokens, outcome.EstimatedCostUsd, outcome.Error));
    }

    // Deliberately verbose and explicit (not a terse data dump) — this is
    // the only thing standing between "AI-drafted" and "sent to a real
    // person applying to a real opportunity," so the prompt says outright,
    // more than once if needed, never to invent anything beyond what's here.
    private static string BuildGenerationPrompt(
        string fullName, IntakeProfile intake, Opportunity opportunity, string? houseStyleGuide, List<CvRequest> referenceExamples)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are drafting a CV (Lebenslauf-style) and a cover letter for NOVIRA, a platform helping people from the Middle East/North Africa region find study/Ausbildung/employment pathways to Germany. A human reviewer will check your draft before it ever reaches the candidate — draft your best attempt; you may be asked to revise specific parts afterward.");
        sb.AppendLine();
        sb.AppendLine("CRITICAL: never invent work history, dates, qualifications, or any fact the candidate didn't actually provide below. If information for a section is thin, keep that section brief and honest rather than fabricating detail — a CV with a false claim is a real, serious problem for a real person's real application.");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(houseStyleGuide))
        {
            sb.AppendLine("House style guide — follow this:");
            sb.AppendLine(houseStyleGuide);
            sb.AppendLine();
        }

        if (referenceExamples.Count > 0)
        {
            sb.AppendLine("Reference examples of previously approved, good drafts (match this style and quality level — these are a different candidate and opportunity, never reuse their actual content):");
            foreach (var example in referenceExamples)
            {
                sb.AppendLine(example.CvContentJson);
            }
            sb.AppendLine();
        }

        sb.AppendLine("Candidate's own information (from their account and intake form — use only this, never add beyond it):");
        sb.AppendLine($"Full name: {fullName}");
        if (!string.IsNullOrWhiteSpace(intake.DateOfBirth)) sb.AppendLine($"Date of birth: {intake.DateOfBirth}");
        if (!string.IsNullOrWhiteSpace(intake.PhoneNumber)) sb.AppendLine($"Phone: {intake.PhoneNumber}");
        if (!string.IsNullOrWhiteSpace(intake.Address)) sb.AppendLine($"Address: {intake.Address}");
        if (!string.IsNullOrWhiteSpace(intake.Summary)) sb.AppendLine($"Self-written summary: {intake.Summary}");

        var experience = SafeDeserialize<List<IntakeExperienceEntry>>(intake.ExperienceJson) ?? [];
        if (experience.Count > 0)
        {
            sb.AppendLine("Experience:");
            foreach (var entry in experience)
            {
                sb.AppendLine($"- {entry.Title} at {entry.Employer} ({entry.StartDate ?? "?"} - {entry.EndDate ?? "present"}){(entry.Location is null ? "" : $", {entry.Location}")}");
                foreach (var bullet in entry.Bullets)
                {
                    sb.AppendLine($"  * {bullet}");
                }
            }
        }

        var education = SafeDeserialize<List<IntakeEducationEntry>>(intake.EducationJson) ?? [];
        if (education.Count > 0)
        {
            sb.AppendLine("Education:");
            foreach (var entry in education)
            {
                sb.AppendLine($"- {entry.Qualification}, {entry.Institution} ({entry.StartDate ?? "?"} - {entry.EndDate ?? "present"}){(entry.Grade is null ? "" : $", grade: {entry.Grade}")}");
            }
        }

        if (!string.IsNullOrWhiteSpace(intake.TechnicalSkills)) sb.AppendLine($"Technical/software skills: {intake.TechnicalSkills}");
        if (!string.IsNullOrWhiteSpace(intake.Certifications)) sb.AppendLine($"Certifications: {intake.Certifications}");
        if (intake.DrivingLicence) sb.AppendLine("Has a driving licence.");
        if (!string.IsNullOrWhiteSpace(intake.Hobbies)) sb.AppendLine($"Hobbies: {intake.Hobbies}");

        sb.AppendLine();
        sb.AppendLine("Target opportunity:");
        sb.AppendLine($"Title: {opportunity.Title}");
        sb.AppendLine($"Provider: {opportunity.Provider}");
        sb.AppendLine($"Path: {opportunity.Path}");
        if (!string.IsNullOrWhiteSpace(opportunity.Location)) sb.AppendLine($"Location: {opportunity.Location}");
        if (!string.IsNullOrWhiteSpace(opportunity.Description)) sb.AppendLine($"Description: {opportunity.Description}");
        if (opportunity.RequiredGermanLevel is not null) sb.AppendLine($"Required German level: {opportunity.RequiredGermanLevel}");
        if (opportunity.RequiredEnglishLevel is not null) sb.AppendLine($"Required English level: {opportunity.RequiredEnglishLevel}");
        if (opportunity.MinEducationLevel is not null) sb.AppendLine($"Minimum education: {opportunity.MinEducationLevel}");

        sb.AppendLine();
        sb.AppendLine("Write the CV in a clear, reverse-chronological Lebenslauf style with concrete, achievement-oriented bullets. Tailor the summary and bullet emphasis to this specific opportunity. Write the cover letter addressed to the provider, explaining genuine motivation and fit for this specific opportunity, referencing only real facts given above.");

        return sb.ToString();
    }

    private static T? SafeDeserialize<T>(string? json) =>
        string.IsNullOrWhiteSpace(json) ? default : JsonSerializer.Deserialize<T>(json);

    // Shared by the /pdf/cv preview endpoint and the real /deliver endpoint
    // — one place that knows how to turn a CvRequest's stored draft into
    // actual PDF bytes, including the optional intake photo.
    private static async Task<(byte[] Bytes, CvDraftContent Cv)> RenderCvPdfAsync(
        CvRequest cvRequest, AppDbContext db, AzureBlobStorageService storage)
    {
        var cv = JsonSerializer.Deserialize<CvDraftContent>(cvRequest.CvContentJson!)!;

        var intake = await db.IntakeProfiles.FirstOrDefaultAsync(p => p.UserId == cvRequest.UserId);
        byte[]? photoBytes = null;
        if (intake?.PhotoBlobName is not null)
        {
            try
            {
                photoBytes = await storage.DownloadAsync(intake.PhotoBlobName);
            }
            catch (Exception)
            {
                // A missing/unreadable photo blob shouldn't block the whole
                // CV — same "degrade, don't fail" reasoning the admin
                // document preview already uses for a bad blob.
            }
        }

        return (CvPdfRenderer.RenderCv(cv, photoBytes), cv);
    }

    private static byte[] RenderCoverLetterPdf(CvRequest cvRequest)
    {
        var coverLetter = JsonSerializer.Deserialize<CoverLetterDraftContent>(cvRequest.CoverLetterContentJson!)!;
        return CvPdfRenderer.RenderCoverLetter(coverLetter);
    }

    private static AdminCvRequestResponse ToResponse(CvRequest r, string userEmail) => new(
        r.Id, r.UserId, userEmail, r.OpportunityId, r.OpportunityTitle, r.OpportunityProvider,
        r.Status, r.CreatedAt, r.UpdatedAt,
        !string.IsNullOrWhiteSpace(r.CvContentJson), r.RevisionCount, r.IsReferenceExample);

    private static CvDraftResponse ToDraftResponse(
        CvRequest r, long inputTokens, long outputTokens, decimal estimatedCostUsd, string? error) => new(
        SafeDeserialize<CvDraftContent>(r.CvContentJson),
        SafeDeserialize<CoverLetterDraftContent>(r.CoverLetterContentJson),
        r.RevisionCount, r.LastGeneratedAt, inputTokens, outputTokens, estimatedCostUsd, error);
}
