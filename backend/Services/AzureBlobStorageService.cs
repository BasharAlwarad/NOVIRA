using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using System.Linq;

namespace Novira.Backend.Services;

// Thin wrapper around the private "users-documents" Azure Blob container.
// The frontend never talks to Azure directly (no client SDK, no exposed
// credentials) — uploads are proxied through this backend, and reads (for
// the admin document-review UI) go through short-lived read SAS URIs
// generated here, never a permanent/public link. Container access level is
// Private (no anonymous access) — see CLAUDE.md's Account signup section
// for the equivalent "backend never sets a browser cookie directly" pattern
// this mirrors: keep the credential on one side, hand the browser only a
// narrow, time-boxed capability.
public class AzureBlobStorageService
{
    private readonly BlobContainerClient _containerClient;

    public AzureBlobStorageService(IConfiguration configuration)
    {
        var connectionString = configuration["Azure:Storage:ConnectionString"];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Azure:Storage:ConnectionString is not configured. Set it via 'dotnet user-secrets set Azure:Storage:ConnectionString \"...\"' from backend/.");
        }

        var containerName = configuration["Azure:Storage:ContainerName"] ?? "users-documents";
        _containerClient = new BlobContainerClient(connectionString, containerName);
    }

    // Stores under {userId}/{documentId}{extension} — scoped per user so a
    // future "delete all of this user's data" pass can target one prefix.
    public async Task<string> UploadAsync(
        Guid userId,
        Guid documentId,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(originalFileName);
        var blobName = $"{userId}/{documentId}{extension}";
        var blobClient = _containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(
            content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);

        return blobName;
    }

    // One fixed blob name per user ({userId}/intake-photo), no extension —
    // unlike UploadAsync above (one blob per document, keyed by a fresh
    // documentId), a CV photo is a single active slot per profile, so a
    // re-upload should replace it, not accumulate orphans under whatever
    // extension the previous upload happened to have. ContentType (stored
    // separately on IntakeProfile) is what actually governs how it's
    // served, not the blob name. Delete-then-upload rather than relying on
    // an SDK overwrite flag — same DeleteBlobIfExistsAsync path used
    // elsewhere in this file, so the behavior is already proven.
    public async Task<string> UploadIntakePhotoAsync(
        Guid userId,
        string contentType,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var blobName = $"{userId}/intake-photo";
        var blobClient = _containerClient.GetBlobClient(blobName);

        await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        await blobClient.UploadAsync(
            content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);

        return blobName;
    }

    // A generated CV/cover-letter PDF being delivered to a user via a
    // Message attachment (built 2026-10-02) — unlike UploadAsync's one
    // blob per uploaded document, each delivery gets its own fresh blob
    // (a GUID-prefixed name under a distinct {userId}/cv-deliverables/
    // prefix), since a user can receive multiple real deliveries over time
    // and each is its own historical record, not a single slot to overwrite
    // the way the intake photo is.
    public async Task<string> UploadCvDeliverableAsync(
        Guid userId,
        string fileName,
        string contentType,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        // fileName is built from a real opportunity title (e.g. "CV -
        // Ausbildung zum/ zur Pflegefachmann/ - frau (w/m/d).pdf") and can
        // contain '/' — found live 2026-10-02: an unsanitized '/' here turns
        // into extra implied path segments in the blob name, which then
        // broke the generated SAS URL entirely (curl couldn't even connect).
        // Blob names allow most characters, but anything that's also a URL
        // path separator has to be kept out, not just escaped.
        var safeFileName = string.Join("-", fileName.Split(Path.GetInvalidFileNameChars().Append('/').Append('\\').ToArray()));
        var blobName = $"{userId}/cv-deliverables/{Guid.NewGuid()}-{safeFileName}";
        var blobClient = _containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(
            content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);

        return blobName;
    }

    public async Task DeleteBlobIfExistsAsync(string blobName, CancellationToken cancellationToken = default)
    {
        await _containerClient.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: cancellationToken);
    }

    public async Task<byte[]> DownloadAsync(string blobName, CancellationToken cancellationToken = default)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);
        var download = await blobClient.DownloadContentAsync(cancellationToken);
        return download.Value.Content.ToArray();
    }

    // Deletes every blob under {userId}/ — used by account deletion so a
    // removed account doesn't leave orphaned document scans behind in
    // storage. Best-effort from the caller's perspective: a failure here
    // shouldn't block the account row itself from being deleted (see
    // AccountEndpoints.cs), since an orphaned blob is a cleanup problem,
    // not a reason to refuse the user's deletion request.
    public async Task DeleteAllForUserAsync(Guid userId)
    {
        var prefix = $"{userId}/";
        await foreach (var blobItem in _containerClient.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix, default))
        {
            await _containerClient.DeleteBlobIfExistsAsync(blobItem.Name);
        }
    }

    // Short-lived (default 15 min), read-only, single-blob SAS URI — the
    // only way the admin UI ever sees the actual file, and never persisted
    // or reused past its expiry. downloadFileName, when set, forces the
    // browser to download under that real name instead of navigating to
    // view the blob inline — used for message-attachment deliveries, left
    // null for document-preview callers that want inline viewing.
    public Uri GenerateReadSasUri(string blobName, TimeSpan? validFor = null, string? downloadFileName = null)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);

        if (!blobClient.CanGenerateSasUri)
        {
            throw new InvalidOperationException(
                "Cannot generate a SAS URI for this blob client — check that the storage connection string includes an account key.");
        }

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _containerClient.Name,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor ?? TimeSpan.FromMinutes(15)),
        };
        if (downloadFileName is not null)
        {
            sasBuilder.ContentDisposition = $"attachment; filename=\"{downloadFileName}\"";
        }
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder);
    }
}
