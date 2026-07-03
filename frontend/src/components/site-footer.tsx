export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="mt-10 border-t border-slate-200 bg-white/90"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
            NOVIRA
          </p>
          <p className="text-sm leading-6 text-slate-600">
            NOVIRA helps people in Germany find study and work opportunities
            with the support of specialists, experts, and AI-assisted guidance.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">What we do</p>
          <p>
            Study guidance, work search support, document and information
            support, and personalized advice.
          </p>
          <p>
            We combine expert knowledge with AI to help people move faster and
            make better decisions.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Why NOVIRA</p>
          <p>
            Clear information, human specialists, local expertise in Germany,
            and practical next steps.
          </p>
          <p className="text-slate-500">
            Built with Next.js, Tailwind CSS, DaisyUI, and ASP.NET Core.
          </p>
        </div>
      </div>
    </footer>
  );
}
