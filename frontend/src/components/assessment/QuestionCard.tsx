'use client';

import type { ReactNode } from 'react';

interface QuestionCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function QuestionCard({
  eyebrow,
  title,
  description,
  footer,
  children,
}: QuestionCardProps) {
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-6 sm:mt-8">{children}</div>

      {footer ? (
        <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div>
      ) : null}
    </section>
  );
}
