'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentProvider } from '@/context/AssessmentProvider';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { fetchMyAccount, updateMyProfile } from '@/lib/api/account';
import { getCurrentUser } from '@/lib/api/auth';
import { saveAssessment } from '@/lib/assessment-storage';
import { assessmentAnswersFromProfileSnapshot, buildProfileSnapshot } from '@/lib/profile-snapshot';
import {
  createDefaultAssessmentAnswers,
  createDefaultAssessmentState,
  type AssessmentAnswers,
  type AssessmentSnapshot,
} from '@/types/assessment';

type PageState = 'checking-session' | 'loading-profile' | 'ready' | 'error';

// Self-service profile editing (built 2026-08-30) — reuses the exact same
// AssessmentWizard/AssessmentProvider machinery the normal funnel already
// uses, rather than a second parallel edit form. The only two things this
// page does that /assessment/page.tsx doesn't: (1) pre-fill the wizard's
// localStorage-backed state from the *account's* current profile before
// AssessmentProvider ever mounts (so its one-time hydrate-on-mount effect
// picks it up naturally — no new hydrate path needed), and (2) redirect to
// /account instead of /assessment/result on completion, syncing straight to
// POST /account/profile instead of going through the marketing/signup
// funnel content an existing signed-in user has no reason to see again.
//
// Deliberately overwrites any different, unrelated draft that happened to
// be sitting in local storage — the account is the authoritative source of
// truth for someone who specifically chose to edit their saved profile, not
// whatever stale/incomplete answers happen to be in this browser.
export default function AssessmentEditPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>('checking-session');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getCurrentUser().catch(() => null);
      if (cancelled) return;

      if (!user) {
        router.replace('/signin');
        return;
      }

      setState('loading-profile');

      try {
        const account = await fetchMyAccount();
        if (cancelled) return;

        // Cast needed because AssessmentAnswers' own [key: string] index
        // signature makes a plain spread of the Partial widen to allow
        // `undefined` — every field actually assigned here is a concrete
        // value or null, never undefined (assessmentAnswersFromProfileSnapshot
        // always returns one or the other for every key it sets).
        const mergedAnswers = {
          ...createDefaultAssessmentAnswers(),
          ...assessmentAnswersFromProfileSnapshot(account),
        } as AssessmentAnswers;
        saveAssessment({ ...createDefaultAssessmentState(), answers: mergedAnswers });

        setState('ready');
      } catch {
        if (!cancelled) {
          setState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleComplete = async (assessment: AssessmentSnapshot) => {
    await updateMyProfile(buildProfileSnapshot(assessment.answers));
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {(state === 'checking-session' || state === 'loading-profile') && (
          <p className="py-16 text-center text-sm text-slate-500">Loading your profile…</p>
        )}

        {state === 'error' && (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-lg font-semibold text-slate-950">
              Couldn&apos;t load your profile
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Something went wrong loading your account. Please try again.
            </p>
          </div>
        )}

        {state === 'ready' && (
          <AssessmentProvider>
            <AssessmentWizard
              redirectTo="/account?updated=1"
              finalStepLabel="Save changes"
              onComplete={handleComplete}
            />
          </AssessmentProvider>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
