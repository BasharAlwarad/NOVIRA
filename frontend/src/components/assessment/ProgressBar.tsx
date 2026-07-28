'use client';

interface ProgressBarProps {
  answeredCount: number;
  totalQuestions: number;
}

export function ProgressBar({
  answeredCount,
  totalQuestions,
}: ProgressBarProps) {
  const safeTotalQuestions = Math.max(totalQuestions, 1);
  const safeAnsweredCount = Math.min(
    Math.max(answeredCount, 0),
    safeTotalQuestions
  );
  const percentage = Math.round((safeAnsweredCount / safeTotalQuestions) * 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p className="font-medium text-slate-700">
          Answered {safeAnsweredCount} of {safeTotalQuestions}
        </p>
        <p className="font-semibold text-emerald-600">{percentage}%</p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundImage:
              'linear-gradient(90deg, rgb(16 185 129) 0%, rgb(52 211 153) 55%, rgb(45 212 191) 100%)',
          }}
        />
      </div>
    </div>
  );
}
