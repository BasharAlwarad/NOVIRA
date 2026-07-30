import { getImprovementAdvice, type PathScore } from '@/lib/assessment-verdict';

interface ProfileImprovementAdviceProps {
  score: PathScore;
}

export function ProfileImprovementAdvice({ score }: ProfileImprovementAdviceProps) {
  const advice = getImprovementAdvice(score);

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">
        How to strengthen your profile
      </p>
      {advice ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {advice.factorLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            {advice.advice}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-slate-600">
          Your profile already looks strong across the factors we can offer
          quick advice on — the biggest next step from here is a closer,
          personal review.
        </p>
      )}
    </div>
  );
}
