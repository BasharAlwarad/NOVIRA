import type { EvaluablePath } from '@/lib/assessment-verdict';
import { DesiredPath } from '@/types/assessment';

/**
 * General, publicly-sourced information about typical document requirements
 * per path (see Matching-Algorithm-Study.md §2 for the underlying research) —
 * deliberately NOT personalized guidance. Keeping this generic (not "here is
 * your checklist") is the wording-discipline line from Plan.md §3: informing
 * is fine, individualized legal/immigration advice is not.
 */
const CHECKLISTS: Record<EvaluablePath, ReadonlyArray<string>> = {
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

const GENERAL_CHECKLIST: ReadonlyArray<string> = [
  'Valid passport',
  'Educational certificates, officially translated into German or English',
  'Certificate pre-authentication from the Egyptian Ministry of Foreign Affairs',
];

interface DocumentChecklistProps {
  highlightedPath: EvaluablePath | null;
}

export function DocumentChecklist({ highlightedPath }: DocumentChecklistProps) {
  const items = highlightedPath ? CHECKLISTS[highlightedPath] : GENERAL_CHECKLIST;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">
        Documents you&apos;ll likely need
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm text-slate-600"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        General information based on typical requirements, not personalized
        legal or immigration advice. A licensed advisor can confirm exactly
        what applies to your situation.
      </p>
    </div>
  );
}
