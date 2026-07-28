'use client';

interface EstimatedTimeProps {
  currentStep: number;
  totalSteps: number;
  minutesPerQuestion?: number;
}

export function EstimatedTime({
  currentStep,
  totalSteps,
  minutesPerQuestion = 1.5,
}: EstimatedTimeProps) {
  const remainingQuestions = Math.max(totalSteps - currentStep, 0);
  const estimatedMinutes = Math.max(
    Math.ceil(remainingQuestions * minutesPerQuestion),
    1
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm shadow-emerald-100/60">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full bg-emerald-500"
      />
      <span>Estimated remaining time</span>
      <span className="font-semibold text-emerald-900">
        {estimatedMinutes} min
      </span>
    </div>
  );
}
