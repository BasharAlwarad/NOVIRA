import Link from 'next/link';

const navLinks = [
  { label: 'Assessment', href: '/assessment' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-lg font-black text-emerald-300 ring-1 ring-emerald-400/30 transition group-hover:bg-emerald-400/25">
            N
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              NOVIRA
            </p>
            <p className="text-xs text-slate-400">
              Study and work guidance in Germany
            </p>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile-only: the "Assessment" link above is hidden below `md`, so this
            keeps one assessment entry point visible on small screens without
            duplicating it on desktop. This slot is reserved for account/login
            controls once auth exists. */}
        <Link
          href="/assessment"
          className="btn btn-sm rounded-full border-0 bg-emerald-400 text-slate-950 hover:bg-emerald-300 md:hidden"
        >
          Start questionnaire
        </Link>
      </div>
    </header>
  );
}
