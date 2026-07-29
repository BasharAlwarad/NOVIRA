import Link from 'next/link';

export function Hero() {
  return (
    <div className="hero rounded-4xl border border-white/10 bg-slate-950/95 px-6 py-10 text-white shadow-2xl shadow-emerald-950/20 backdrop-blur sm:px-10 lg:px-12">
      <div className="hero-content w-full flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Find the best pathway to Germany in a few questions.
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/assessment"
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Start questionnaire
            </Link>
            <a
              href="#services"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              See services
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
