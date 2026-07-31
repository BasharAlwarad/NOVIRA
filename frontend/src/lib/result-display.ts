import type { EvaluablePath, PathFit } from '@/lib/assessment-verdict';
import { DesiredPath } from '@/types/assessment';

export const PATH_NAMES: Record<EvaluablePath, string> = {
  [DesiredPath.University]: 'University',
  [DesiredPath.Ausbildung]: 'Ausbildung',
  [DesiredPath.Employment]: 'Employment',
};

// Deliberately words, not numbers — this chart must never imply a precision
// we don't claim (Plan.md §3 / Matching-Algorithm-Study.md guardrails).
export const FIT_LABELS: Record<PathFit, string> = {
  strong: 'Strong fit',
  borderline: 'Possible fit',
  weak: 'Limited fit',
};

// Fixed representative widths per qualitative band — not the exact computed
// ratio. The bar communicates "strong vs. possible vs. limited," never a score.
export const FIT_WIDTH: Record<PathFit, number> = {
  strong: 90,
  borderline: 58,
  weak: 28,
};

/**
 * General, publicly-sourced information about typical document requirements
 * per path (see Matching-Algorithm-Study.md §2 for the underlying research) —
 * deliberately NOT personalized guidance. Keeping this generic (not "here is
 * your checklist") is the wording-discipline line from Plan.md §3: informing
 * is fine, individualized legal/immigration advice is not.
 */
export const DOCUMENT_CHECKLISTS: Record<EvaluablePath, ReadonlyArray<string>> = {
  [DesiredPath.University]: [
    'Secondary school certificate or university transcripts, officially translated',
    'Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs',
    'uni-assist application and document evaluation',
    'Certified German or English language exam result',
    'Proof of funds for a blocked account (currently around €11,904/year)',
    'Valid passport',
  ],
  [DesiredPath.Ausbildung]: [
    'Secondary school certificate, officially translated',
    'A signed Ausbildung training contract from a German employer',
    'Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs',
    'Certified German language exam result, or proof of your current level',
    'Valid passport',
  ],
  [DesiredPath.Employment]: [
    'Degree or vocational qualification certificate, officially translated',
    'Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs',
    'Recognition of your qualification (Anerkennung), if applicable',
    'CV and employment contract or job offer',
    'Valid passport',
  ],
};

export const GENERAL_DOCUMENT_CHECKLIST: ReadonlyArray<string> = [
  'Valid passport',
  'Educational certificates, officially translated into German or English',
  'Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs',
];

export function getDocumentChecklistItems(
  highlightedPath: EvaluablePath | null
): ReadonlyArray<string> {
  return highlightedPath
    ? DOCUMENT_CHECKLISTS[highlightedPath]
    : GENERAL_DOCUMENT_CHECKLIST;
}
