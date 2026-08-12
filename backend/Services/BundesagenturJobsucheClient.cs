using System.Text.Json;
using System.Text.Json.Serialization;

namespace Novira.Backend.Services;

public record JobsucheSearchResponse([property: JsonPropertyName("ergebnisliste")] List<JobsucheListing>? Ergebnisliste);

public record JobsucheListing(
    [property: JsonPropertyName("referenznummer")] string? Referenznummer,
    [property: JsonPropertyName("stellenangebotsTitel")] string? StellenangebotsTitel,
    [property: JsonPropertyName("firma")] string? Firma,
    [property: JsonPropertyName("hauptberuf")] string? Hauptberuf,
    [property: JsonPropertyName("eintrittszeitraum")] JobsucheZeitraum? Eintrittszeitraum,
    [property: JsonPropertyName("stellenlokationen")] List<JobsucheLokation>? Stellenlokationen,
    [property: JsonPropertyName("externeURL")] string? ExterneUrl);

public record JobsucheZeitraum([property: JsonPropertyName("von")] string? Von);

public record JobsucheLokation([property: JsonPropertyName("adresse")] JobsucheAdresse? Adresse);

public record JobsucheAdresse([property: JsonPropertyName("ort")] string? Ort);

/// <summary>
/// Thin wrapper around the Bundesagentur für Arbeit "Jobsuche" API —
/// unofficial/community-documented (bundesAPI/jobsuche-api on GitHub), not a
/// published government API. Verified live 2026-08-09: the search endpoint
/// is v6 (`pc/v6/jobs`), NOT v4 as several secondary sources (including
/// earlier research this session) claimed — v4 search now returns 403.
/// v4 still works for the jobdetails endpoint, if that's ever added.
/// No formal ToS/rate limit stated; treat as prototype-grade per
/// CLAUDE.md/Plan.md §8 — revisit before depending on it at real scale.
/// </summary>
public class BundesagenturJobsucheClient(HttpClient httpClient)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    // angebotsart=4 = Ausbildung/duales Studium (confirmed live, returns
    // stellenangebotsart: "AUSBILDUNG"). Nationwide search (no "wo" param)
    // confirmed working — the API just returns its largest, most recent page.
    public async Task<List<JobsucheListing>> SearchAusbildungAsync(
        int size = 25,
        CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync(
            $"jobboerse/jobsuche-service/pc/v6/jobs?angebotsart=4&page=1&size={size}",
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsed = JsonSerializer.Deserialize<JobsucheSearchResponse>(body, JsonOptions);

        return parsed?.Ergebnisliste ?? [];
    }
}
