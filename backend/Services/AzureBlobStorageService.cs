using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

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
    // or reused past its expiry.
    public Uri GenerateReadSasUri(string blobName, TimeSpan? validFor = null)
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
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder);
    }
}
