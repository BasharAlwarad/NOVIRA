/**
 * Origin-country-specific procedural document requirements — kept
 * deliberately separate from result-display.ts's per-path checklists
 * (Matching-Algorithm-Study.md §8's data architecture rule). The per-path
 * checklists in result-display.ts describe German-side demand (the same
 * requirement regardless of which country a user comes from); this file
 * describes the opposite axis — facts about the *applicant's home country's*
 * legalization/certification process, which varies per origin country and
 * has nothing to do with the German path itself. Mixing the two means "add
 * a country" would require hunting down hardcoded strings across otherwise
 * generic per-path data, exactly what §8 warns against.
 *
 * Same deliberate separation as occupation-demand.ts: a small, curated,
 * independently-swappable lookup, not part of the core questionnaire schema.
 *
 * Keyed by the `country` question's option values (types/assessment.ts).
 * Only Egypt is researched/populated so far — Plan.md §2's current market.
 * Adding a country here should never require touching result-display.ts.
 */
export const ORIGIN_COUNTRY_DOCUMENT_REQUIREMENTS: Record<string, ReadonlyArray<string>> = {
  egypt: ['Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs'],
};

export function getOriginCountryDocumentRequirements(
  country: string | null
): ReadonlyArray<string> {
  if (!country) {
    return [];
  }

  return ORIGIN_COUNTRY_DOCUMENT_REQUIREMENTS[country] ?? [];
}
