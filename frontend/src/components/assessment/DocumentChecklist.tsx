import type { EvaluablePath } from '@/lib/assessment-verdict';
import { getDocumentChecklistItems } from '@/lib/result-display';

interface DocumentChecklistProps {
  highlightedPath: EvaluablePath | null;
}

export function DocumentChecklist({ highlightedPath }: DocumentChecklistProps) {
  const items = getDocumentChecklistItems(highlightedPath);

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
