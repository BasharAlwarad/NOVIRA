type HeroProps = {
  apiBaseUrl: string;
};

export function Hero({ apiBaseUrl }: HeroProps) {
  return (
    <div className="hero rounded-[2rem] border border-white/10 bg-slate-950/95 px-6 py-10 text-white shadow-2xl shadow-emerald-950/20 backdrop-blur sm:px-10 lg:px-12">
      <div className="hero-content w-full flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Next.js frontend connected to ASP.NET backend
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
              A clean starter for shipping full-stack product work fast.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              The homepage pulls a users list from the backend and renders it as
              a responsive dashboard. DaisyUI provides the component layer,
              Tailwind handles layout, and TypeScript keeps the data model
              tight.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Frontend
              </p>
              <p className="mt-2 text-lg font-semibold">
                Next.js + Tailwind + DaisyUI
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Backend
              </p>
              <p className="mt-2 text-lg font-semibold">ASP.NET Core API</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Data
              </p>
              <p className="mt-2 text-lg font-semibold">Live users endpoint</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">API status</p>
              <p className="text-2xl font-bold">Connected</p>
            </div>
            <div className="badge badge-success badge-lg border-0 text-white">
              Live
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Backend URL</span>
              <span className="font-medium text-white">{apiBaseUrl}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Users endpoint</span>
              <span className="font-medium text-white">/api/users</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Rendering</span>
              <span className="font-medium text-white">Server component</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
