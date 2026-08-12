'use client';

import { useState } from 'react';
import { RateLimitedError, saveResult } from '@/lib/api/leads';
import type {
  EligibilityCheckStatus,
  PathFitEntry,
  ProfileSnapshot,
} from '@/lib/contracts/leads';
import type { RequirementCheck, RequirementStatus } from '@/lib/eligibility-check';

const ELIGIBILITY_STATUS_MAP: Record<RequirementStatus, EligibilityCheckStatus> = {
  met: 'Met',
  addressable: 'Addressable',
  fixed: 'Fixed',
};

interface SaveResultPromptProps {
  verdictHeading: string;
  verdictBody: string;
  adviceFactorLabel: string | null;
  adviceText: string | null;
  pathFit: PathFitEntry[];
  documentChecklist: string[];
  profile: ProfileSnapshot;
  eligibilityChecks: RequirementCheck[];
}

type PromptState =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error'
  | 'rate-limited'
  | 'dismissed';

export function SaveResultPrompt({
  verdictHeading,
  verdictBody,
  adviceFactorLabel,
  adviceText,
  pathFit,
  documentChecklist,
  profile,
  eligibilityChecks,
}: SaveResultPromptProps) {
  const [state, setState] = useState<PromptState>('idle');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  if (state === 'dismissed') {
    return null;
  }

  if (state === 'success') {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
        <p className="text-sm font-semibold text-emerald-900">
          {emailSent
            ? 'Saved — check your inbox for the full breakdown.'
            : "Saved. We couldn't send the email right now, but your result is on file."}
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('submitting');

    try {
      const response = await saveResult({
        email,
        verdictHeading,
        verdictBody,
        adviceFactorLabel,
        adviceText,
        pathFit,
        documentChecklist,
        continueUrl: `${window.location.origin}/assessment/result`,
        profile,
        eligibilityChecks: eligibilityChecks.map((check) => ({
          label: check.label,
          status: ELIGIBILITY_STATUS_MAP[check.status],
          explanation: check.explanation,
        })),
      });
      setEmailSent(response.emailSent);
      setState('success');
    } catch (error) {
      setState(error instanceof RateLimitedError ? 'rate-limited' : 'error');
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">
        Want to save this result?
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Leave your email and we&apos;ll send you the full breakdown.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-base text-slate-900 shadow-sm shadow-slate-200/50 transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </label>
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'submitting' ? 'Saving…' : 'Save & email me'}
        </button>
      </form>

      {state === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          Something went wrong — please try again.
        </p>
      )}

      {state === 'rate-limited' && (
        <p className="mt-2 text-sm text-red-600">
          Too many attempts — please wait a few minutes and try again.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-400">
        We&apos;ll only use this to send your result — no spam, no sharing
        with third parties.
      </p>

      <button
        type="button"
        onClick={() => setState('dismissed')}
        className="mt-2 text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
      >
        No thanks
      </button>
    </div>
  );
}
