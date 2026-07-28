'use client';

interface AssessmentHeaderProps {
  title?: string;
  description?: string;
}

export function AssessmentHeader({
  title = 'Find the best pathway to Germany',
  description = 'Answer one question at a time. The assessment stays on your device until you decide to continue.',
}: AssessmentHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 shadow-sm shadow-emerald-100/60">
        <span
          className="h-2 w-2 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
        NOVIRA Assessment
      </div>
      <div className="space-y-3">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}
