'use client';

import type { ReactNode } from 'react';

interface NavigationButtonsProps {
  canGoBack: boolean;
  canGoNext: boolean;
  isFinalStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: ReactNode;
}

export function NavigationButtons({
  canGoBack,
  canGoNext,
  isFinalStep,
  onPrevious,
  onNext,
  nextLabel = 'Next',
  nextIcon,
}: NavigationButtonsProps) {
  const nextButtonLabel = isFinalStep ? 'Continue' : nextLabel;

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoBack}
        className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        Previous
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0"
      >
        <span>{nextButtonLabel}</span>
        {nextIcon ? <span aria-hidden="true">{nextIcon}</span> : null}
      </button>
    </div>
  );
}
