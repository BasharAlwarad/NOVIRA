using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace Novira.Backend.Services;

// Shared by MagicLinkToken and Session — both are "generate a random bearer
// secret, hand the raw value to the client, store only its hash" flows, so
// the generation/hashing logic lives in one place rather than duplicated
// per-endpoint. See Matching-Algorithm-Study.md / CLAUDE.md's auth section
// for why: OWASP requires CSPRNG generation, hashed-at-rest storage, and
// single-use/expiry enforcement for any token delivered via an email link.
public static class TokenGenerator
{
    // 32 bytes = 256 bits of entropy — comfortably above any commonly cited
    // minimum (128 bits) for a bearer token. Base64Url-encoded (not plain
    // Base64) so the raw value is safe to drop straight into a query string
    // without percent-encoding surprises around '+', '/', '='.
    public static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return WebEncoders.Base64UrlEncode(bytes);
    }

    // SHA-256 of the raw token — deliberately one-way. The DB only ever
    // stores this; the raw value exists only in the email link and, briefly,
    // in the verifying request. A DB read alone can't be turned back into a
    // working token/session.
    public static string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}
