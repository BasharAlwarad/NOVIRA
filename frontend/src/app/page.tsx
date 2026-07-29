import { Hero } from '@/components/hero';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

export default async function Home() {
  return (
    <main
      id="top"
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_40%),linear-gradient(180deg,#0f172a_0%,#111827_50%,#f8fafc_50%,#f8fafc_100%)] text-slate-900"
    >
      <SiteNav />
      <section className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Hero />

        <section
          id="services"
          className="mt-6 grid gap-4 rounded-4xl border border-slate-200 bg-white px-6 py-6 shadow-xl shadow-slate-200/60 md:grid-cols-3"
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
      </section>
      <SiteFooter />
    </main>
  );
}
