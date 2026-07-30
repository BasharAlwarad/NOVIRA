/**
 * ⚠️ MOCK DATA — for internal product-vision prototyping only.
 *
 * These numbers are NOT connected to any real data source. They exist so the
 * founder can visualize what this section will eventually look like once the
 * real opportunities database exists (Plan.md §11, Phase 2). This must be
 * replaced with real counts — and this component likely renamed — before it
 * is ever shown to a real user. Do not ship as-is.
 */
const MOCK_OPPORTUNITY_COUNTS = {
  ausbildung: 27,
  university: 9,
  jobs: 14,
};

export function PlaceholderOpportunityCounts() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Matching opportunities
        </p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">
            {MOCK_OPPORTUNITY_COUNTS.ausbildung}
          </p>
          <p className="mt-1 text-xs text-slate-500">Ausbildung positions</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">
            {MOCK_OPPORTUNITY_COUNTS.university}
          </p>
          <p className="mt-1 text-xs text-slate-500">University programs</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">
            {MOCK_OPPORTUNITY_COUNTS.jobs}
          </p>
          <p className="mt-1 text-xs text-slate-500">Job openings</p>
        </div>
      </div>
    </div>
  );
}
