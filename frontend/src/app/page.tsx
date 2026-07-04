import { Hero } from '@/components/hero';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

export default async function Home() {
  return (
    <main
      id="top"
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(180deg,_#0f172a_0%,_#111827_50%,_#f8fafc_50%,_#f8fafc_100%)] text-slate-900"
    >
      <SiteNav />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Hero />

        <section
          id="services"
          className="mt-6 grid gap-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-xl shadow-slate-200/60 md:grid-cols-3"
        >
          <div className="space-y-3 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Study
            </p>
            <h2 className="text-xl font-bold text-slate-900">
              Find the right study path
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              NOVIRA helps people understand study options in Germany with
              specialist guidance and clear information.
            </p>
          </div>
          <div className="space-y-3 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Work
            </p>
            <h2 className="text-xl font-bold text-slate-900">
              Discover work opportunities
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              We support job seekers with expert advice, practical next steps,
              and AI-assisted search workflows.
            </p>
          </div>
          <div className="space-y-3 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Information
            </p>
            <h2 className="text-xl font-bold text-slate-900">
              Get reliable details
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Our specialists and experts combine local knowledge in Germany
              with AI to simplify complex decisions.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-xl shadow-slate-200/60 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Step 1
            </p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Review your options
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Start with the study or work direction that matches your current
              goals.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Step 2
            </p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Get clear guidance
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use specialist-backed information to understand the next move and
              what documents matter.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Step 3
            </p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Move forward faster
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Turn clarity into action with a practical plan tailored to your
              situation.
            </p>
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
