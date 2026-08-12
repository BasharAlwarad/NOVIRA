import type { RequirementCheck, RequirementStatus } from '@/lib/eligibility-check';

const STATUS_STYLES: Record<RequirementStatus, string> = {
  met: 'bg-emerald-50 text-emerald-700',
  addressable: 'bg-amber-50 text-amber-700',
  fixed: 'bg-blue-50 text-blue-700',
};

const STATUS_LABELS: Record<RequirementStatus, string> = {
  met: 'Met',
  addressable: "You'll need this",
  fixed: 'Extra step needed',
};

interface EligibilityChecklistProps {
  checks: RequirementCheck[];
}

export function EligibilityChecklist({ checks }: EligibilityChecklistProps) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-slate-900">
        How you compare against the real requirements
      </p>
      <p className="mb-4 text-xs text-slate-500">
        Based on Germany&apos;s own official admission/visa requirements for
        this path — not a manufactured score.
      </p>
      <div className="space-y-3">
        {checks.map((check) => (
          <div
            key={check.id}
            className="rounded-3xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {check.label}
              </p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[check.status]}`}
              >
                {STATUS_LABELS[check.status]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {check.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
