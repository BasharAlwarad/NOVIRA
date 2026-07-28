'use client';

import type { ButtonHTMLAttributes } from 'react';

interface OptionCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onSelect'
> {
  label: string;
  description?: string;
  selected?: boolean;
}

export function OptionCard({
  label,
  description,
  selected = false,
  className = '',
  type = 'button',
  ...buttonProps
}: OptionCardProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'group relative flex min-h-20 w-full items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none',
        selected
          ? 'border-emerald-500 bg-emerald-50/90 shadow-lg shadow-emerald-100/70 ring-1 ring-emerald-500/20'
          : 'border-slate-200 bg-white shadow-sm shadow-slate-200/60 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md hover:shadow-slate-200/70',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...buttonProps}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold leading-6 text-slate-900 sm:text-lg">
          {label}
        </span>
        {description ? (
          <span className="text-sm leading-6 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
          selected
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white text-transparent group-hover:border-emerald-300 group-hover:text-emerald-500',
        ].join(' ')}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M4 10.5L8.25 14.75L16 6.25"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
