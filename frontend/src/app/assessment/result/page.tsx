'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import {
  computeVerdict,
  type EvaluablePath,
  type VerdictOutcome,
} from '@/lib/assessment-verdict';
import { loadAssessment } from '@/lib/assessment-storage';
import { DesiredPath, type AssessmentAnswers } from '@/types/assessment';

const PATH_LABELS: Record<EvaluablePath, string> = {
  [DesiredPath.University]: 'studying at a university',
  [DesiredPath.Ausbildung]: 'an Ausbildung (vocational training)',
  [DesiredPath.Employment]: 'direct employment',
};

function describeVerdict(verdict: VerdictOutcome): {
  heading: string;
  body: string;
} {
  switch (verdict.kind) {
    case 'confirmed':
      return {
        heading: 'Good sign — your chosen path looks like a strong fit',
        body: `Based on your answers, ${PATH_LABELS[verdict.path]} looks like a strong fit for your profile.`,
      };
    case 'suggested':
      return {
        heading: 'Here is what stands out in your profile',
        body: `You weren't sure which path to choose — based on your answers, ${PATH_LABELS[verdict.suggestedPath]} looks like the strongest fit for your profile right now.`,
      };
    case 'alternative':
      return {
        heading: 'Worth considering a different path',
        body: `You're interested in ${PATH_LABELS[verdict.statedPath]}, but based on your answers, ${PATH_LABELS[verdict.suggestedPath]} may actually be a better fit for your profile right now.`,
      };
    case 'unclear':
    default:
      return {
        heading: "It's not clear yet — and that's okay",
        body: "Your answers don't clearly point to one path yet. That's common, and it just means your case is worth a closer, personal look.",
      };
  }
}

interface LoadedAnswers {
  answers: AssessmentAnswers | null;
}

export default function AssessmentResultPage() {
  const [loaded, setLoaded] = useState<LoadedAnswers | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external, client-only source) on
    // mount — required to avoid an SSR/client hydration mismatch, since
    // `window` isn't available during the server render.
    const stored = loadAssessment();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded({ answers: stored?.answers ?? null });
  }, []);

  if (!loaded) {
    return null;
  }

  const { answers } = loaded;

  if (!answers) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <SiteNav />
        <section className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-950">
            We couldn&apos;t find a saved assessment
          </h1>
          <p className="mt-3 text-slate-600">
            Looks like you haven&apos;t completed the assessment yet, or your
            answers aren&apos;t saved on this device.
          </p>
          <Link
            href="/assessment"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Start the assessment
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const verdict = computeVerdict(answers);
  const { heading, body } = describeVerdict(verdict);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            Your result
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
            {heading}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
