'use client';

import { useEffect, useRef } from 'react';

interface StepIndicatorProps {
  currentStepIndex: number;
  steps: ReadonlyArray<{ title: string }>;
  onStepSelect: (stepIndex: number) => void;
}

export function StepIndicator({
  currentStepIndex,
  steps,
  onStepSelect,
}: StepIndicatorProps) {
  const activeTileRef = useRef<HTMLLIElement | null>(null);

  // Re-centers on the active tile whenever the current step changes — via
  // Next/Previous, a direct tile tap, or the step-jump navigation — so the
  // carousel only ever moves in response to actual step changes.
  useEffect(() => {
    activeTileRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentStepIndex]);

  return (
    <nav aria-label="Assessment steps" className="w-full">
      <ol className="scrollbar-none flex gap-2 overflow-x-auto scroll-smooth pb-1">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <li
              key={step.title}
              ref={isActive ? activeTileRef : undefined}
              className="w-36 shrink-0 sm:w-40"
            >
              <button
                type="button"
                onClick={() => onStepSelect(index)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${index + 1}. ${step.title}. ${isActive ? 'Current step' : 'Go to step'}`}
                className={[
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 motion-reduce:transition-none',
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm shadow-emerald-100/80'
                    : isCompleted
                      ? 'border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40',
                  'hover:-translate-y-0.5',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium sm:text-[15px]">
                    {step.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
