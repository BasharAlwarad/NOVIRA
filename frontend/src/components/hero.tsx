export function Hero() {
  return (
    <div className="hero rounded-4xl border border-white/10 bg-slate-950/95 px-6 py-10 text-white shadow-2xl shadow-emerald-950/20 backdrop-blur sm:px-10 lg:px-12">
      <div className="hero-content w-full flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Study and work guidance for Germany
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
              A practical starting point for study and work decisions.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              NOVIRA helps people compare options, understand paperwork, and
              choose next steps with clear, specialist-backed guidance.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Study
              </p>
              <p className="mt-2 text-lg font-semibold">
                Pathways, documents, and timing
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Work
              </p>
              <p className="mt-2 text-lg font-semibold">
                Search support and next steps
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Guidance
              </p>
              <p className="mt-2 text-lg font-semibold">
                Expert-backed decision support
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">What NOVIRA covers</p>
              <p className="text-2xl font-bold">Study and work</p>
            </div>
            <div className="badge badge-success badge-lg border-0 text-white">
              Ready
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Focus</span>
              <span className="font-medium text-white">Germany</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Support</span>
              <span className="font-medium text-white">Specialists</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Approach</span>
              <span className="font-medium text-white">Clear next steps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
