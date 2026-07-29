import type { EvaluablePath, PathFit, PathScore } from '@/lib/assessment-verdict';
import { DesiredPath } from '@/types/assessment';

interface PathFitChartProps {
  scores: ReadonlyArray<PathScore>;
  highlightedPath?: EvaluablePath | null;
}

const PATH_NAMES: Record<EvaluablePath, string> = {
  [DesiredPath.University]: 'University',
  [DesiredPath.Ausbildung]: 'Ausbildung',
  [DesiredPath.Employment]: 'Employment',
};

// Deliberately words, not numbers — this chart must never imply a precision
// we don't claim (Plan.md §3 / Matching-Algorithm-Study.md guardrails).
const FIT_LABELS: Record<PathFit, string> = {
  strong: 'Strong fit',
  borderline: 'Possible fit',
  weak: 'Limited fit',
};

// Fixed representative widths per qualitative band — not the exact computed
// ratio. The bar communicates "strong vs. possible vs. limited," never a score.
const FIT_WIDTH: Record<PathFit, number> = {
  strong: 90,
  borderline: 58,
  weak: 28,
};

export function PathFitChart({ scores, highlightedPath }: PathFitChartProps) {
  const sortedScores = [...scores].sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="space-y-4">
      {sortedScores.map((score) => {
        const isHighlighted = score.path === highlightedPath;

        return (
          <div key={score.path}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">
                {PATH_NAMES[score.path]}
              </span>
              <span
                className={[
                  'text-xs font-medium',
                  isHighlighted ? 'text-emerald-700' : 'text-slate-500',
                ].join(' ')}
              >
                {FIT_LABELS[score.fit]}
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
              aria-hidden="true"
            >
              <div
                className={[
                  'h-full rounded-full transition-[width] duration-500 ease-out',
                  isHighlighted ? 'bg-emerald-500' : 'bg-slate-300',
                ].join(' ')}
                style={{ width: `${FIT_WIDTH[score.fit]}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
