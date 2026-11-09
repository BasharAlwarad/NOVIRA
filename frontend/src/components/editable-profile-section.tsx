'use client';

import { useEffect, useState } from 'react';
import {
  deleteMyIntakePhoto,
  fetchMyIntake,
  fetchMyIntakePhotoUrl,
  saveMyIntake,
  submitMyIntake,
  uploadMyIntakePhoto,
} from '@/lib/api/intake';
import { updateMyProfile } from '@/lib/api/account';
import { assessmentAnswersFromProfileSnapshot, buildProfileSnapshot } from '@/lib/profile-snapshot';
import {
  ASSESSMENT_QUESTION_DEFINITIONS,
  createDefaultAssessmentAnswers,
  type AssessmentAnswers,
  type AssessmentAnswerValue,
  type AssessmentQuestionDefinition,
  type AssessmentQuestionId,
} from '@/types/assessment';
import { CollapsibleSection } from '@/components/collapsible-section';
import { SearchableSelect } from '@/components/assessment/SearchableSelect';
import type { SearchableSelectOption } from '@/components/assessment/SearchableSelect';
import type { Account } from '@/lib/contracts/account';
import type { ProfileSnapshot } from '@/lib/contracts/leads';
import type {
  IntakeEducationEntry,
  IntakeExperienceEntry,
  IntakePrefill,
  IntakeStatus,
  SaveIntakeRequest,
} from '@/lib/contracts/intake';

// Round 16: absorbs everything the old standalone /account/intake page did —
// that page is now just a redirect. The founder's ask was "no navigation to
// edit, show the data and let me update it right here" — this component is
// the whole editable surface, rendered inline on /account itself, same
// self-contained/self-fetching pattern MessagesPanel and Tier3RequestCard
// already use (keeps account/page.tsx from having to own all this state).

const VERIFIABLE_QUESTION_IDS: AssessmentQuestionId[] = [
  'highestEducation',
  'occupationField',
  'germanLevel',
  'englishLevel',
  'passportStatus',
];

function sanitizeAnswers(answers: AssessmentAnswers): AssessmentAnswers {
  const sanitized = { ...answers } as Record<string, AssessmentAnswerValue>;
  for (const definition of ASSESSMENT_QUESTION_DEFINITIONS as ReadonlyArray<
    AssessmentQuestionDefinition<AssessmentQuestionId>
  >) {
    if (!definition.options) continue;
    const validValues = new Set(definition.options.map((o) => o.value));
    const current = sanitized[definition.id];
    if (definition.multiSelect && Array.isArray(current)) {
      sanitized[definition.id] = current.filter((v) => validValues.has(v));
    } else if (typeof current === 'string' && current && !validValues.has(current)) {
      sanitized[definition.id] = definition.id === 'country' ? '' : null;
    }
  }
  return sanitized as unknown as AssessmentAnswers;
}

// Whole years between a date-of-birth string and today — used only once a
// document has actually confirmed the DOB (see the "age" special-case in
// the fields grid below), never from the self-reported DOB in Contact
// details, which is no more reliable than the self-reported age range it
// would be replacing.
function computeAgeFromDob(dob: string): number | null {
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

const verifiedTagClass =
  'ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700';

function ProfileField({
  definition,
  value,
  onChange,
  verifiedInfo,
}: {
  definition: AssessmentQuestionDefinition<AssessmentQuestionId>;
  value: AssessmentAnswerValue;
  onChange: (value: AssessmentAnswerValue) => void;
  verifiedInfo?: VerifiedFieldInfo | null;
}) {
  return (
    <div>
      <label className={labelClass}>{definition.label}</label>
      {definition.searchable ? (
        <div className="mt-1">
          <SearchableSelect
            options={(definition.options ?? []) as SearchableSelectOption[]}
            value={typeof value === 'string' ? value : null}
            onChange={(v) => onChange(v)}
            placeholder={definition.placeholder}
          />
        </div>
      ) : definition.multiSelect ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {definition.options?.map((option) => {
            const selectedValues = Array.isArray(value) ? (value as string[]) : [];
            const optionValue = option.value as string;
            const selected = selectedValues.includes(optionValue);
            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => {
                  const exclusiveValue = definition.exclusiveOptionValue as string | undefined;
                  const isExclusive = optionValue === exclusiveValue;
                  let next: string[];
                  if (isExclusive) {
                    next = selected ? [] : [optionValue];
                  } else if (selected) {
                    next = selectedValues.filter((v) => v !== optionValue);
                  } else {
                    next = [...selectedValues.filter((v) => v !== exclusiveValue), optionValue];
                  }
                  onChange(next);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1 ${inputClass}`}
        >
          <option value="" disabled>
            Select…
          </option>
          {definition.options?.map((option) => (
            <option key={option.value as string} value={option.value as string}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {verifiedInfo && !verifiedInfo.diverges && (
        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
          ✓ Confirmed as {verifiedInfo.label} from a document
        </p>
      )}
      {verifiedInfo && verifiedInfo.diverges && (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          {verifiedInfo.affectsMatching && !verifiedInfo.canUpdateViaNewDocument
            ? `An approved document confirmed "${verifiedInfo.label}" — matching still uses that, not what you just entered here. If this is a deliberate change (a different path you're now pursuing), let us know via Messages so we can take a look.`
            : verifiedInfo.affectsMatching
              ? `An approved document confirmed "${verifiedInfo.label}" — matching still uses that, not what you just entered here. If you've genuinely improved since (e.g. a new certificate or a finished qualification), upload the updated document and we'll update this once it's approved.`
              : `An approved document confirmed "${verifiedInfo.label}" — this doesn't affect matching, just shown for reference. If it's changed since (e.g. a renewed passport), upload the updated document to keep this current.`}
        </p>
      )}
    </div>
  );
}

// Added 2026-11-08 alongside the divergence check below — a verified field
// used to only ever show a quiet green confirmation, even when the current
// self-report answer had since drifted away from it. That was silently
// misleading for the 4 fields MatchingService.cs actually prefers the
// verified value for (occupationField/highestEducation/germanLevel/
// englishLevel): the edit looked like it took effect, but real /matches
// results kept using the old verified value with no explanation anywhere.
// passportStatus is verifiable too but isn't read by matching at all, so
// its divergence note is informational only (affectsMatching: false).
//
// canUpdateViaNewDocument (added 2026-11-09, after thinking through where
// this app's data-verification design should and shouldn't lock a field —
// see the conversation this came out of) splits the verifiable fields into
// two different kinds: highestEducation/germanLevel/englishLevel/
// passportStatus are facts a document can legitimately supersede (someone
// finishes a degree, re-tests into a higher level, renews a passport) —
// the real fix for those is a new document, which RecomputeVerifiedData
// already picks up automatically once approved, no extra code needed.
// occupationField is different in kind: it's a declared choice of path,
// not a fact a document corrects, so a career pivot away from a verified
// degree is never "fixed" by uploading something — it just needs a human
// to notice the change was deliberate.
interface VerifiedFieldInfo {
  label: string;
  diverges: boolean;
  affectsMatching: boolean;
  canUpdateViaNewDocument: boolean;
}

// Backend enums arrive as PascalCase member names (JsonStringEnumConverter)
// — same humanizing trick already used on the admin user-detail page, kept
// as its own small local copy rather than a shared import for something
// this trivial.
function humanizeEnumValue(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100';
const labelClass = 'text-xs font-semibold text-slate-600';

function emptyExperience(): IntakeExperienceEntry {
  return { title: '', employer: '', location: null, startDate: null, endDate: null, bullets: [] };
}

function emptyEducation(): IntakeEducationEntry {
  return {
    institution: '',
    qualification: '',
    fieldOfStudy: null,
    city: null,
    startDate: null,
    endDate: null,
    grade: null,
  };
}

function formFromPrefill(prefill: IntakePrefill | null): SaveIntakeRequest {
  const education: IntakeEducationEntry[] = [];
  if (prefill && (prefill.institutionName || prefill.highestEducation || prefill.fieldOfStudy)) {
    education.push({
      ...emptyEducation(),
      institution: prefill.institutionName ?? '',
      qualification: prefill.highestEducation ? humanizeEnumValue(prefill.highestEducation) : '',
      fieldOfStudy: prefill.fieldOfStudy,
    });
  }

  return {
    phoneNumber: null,
    address: null,
    dateOfBirth: prefill?.dateOfBirth ?? null,
    summary: null,
    experience: [],
    education,
    technicalSkills: null,
    drivingLicence: false,
    certifications: null,
    hobbies: null,
  };
}

const STATUS_LABELS: Record<IntakeStatus, string> = {
  NotStarted: 'Not started',
  InProgress: 'In progress',
  Submitted: 'Submitted for review',
};

// No title/h2 here (round 22) — this now renders inside CollapsibleSection's
// own body, which already owns the title (plus an entry-count teaser as its
// description, visible even collapsed). Keeping a second h2 here read as the
// section name appearing twice.
function RepeatableSectionHeader({
  description,
  onAdd,
  addLabel,
}: {
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p className="text-xs text-slate-500">{description}</p>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        {addLabel}
      </button>
    </div>
  );
}

function ExperienceCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: IntakeExperienceEntry;
  onChange: (entry: IntakeExperienceEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={entry.title}
          onChange={(e) => onChange({ ...entry, title: e.target.value })}
          placeholder="Role / position (or internship, part-time job, school project)"
          className={inputClass}
        />
        <input
          value={entry.employer}
          onChange={(e) => onChange({ ...entry, employer: e.target.value })}
          placeholder="Employer / organization"
          className={inputClass}
        />
        <input
          value={entry.location ?? ''}
          onChange={(e) => onChange({ ...entry, location: e.target.value || null })}
          placeholder="Location (optional)"
          className={inputClass}
        />
        <div className="flex gap-2">
          <input
            value={entry.startDate ?? ''}
            onChange={(e) => onChange({ ...entry, startDate: e.target.value || null })}
            placeholder="Start (e.g. Sep 2023)"
            className={inputClass}
          />
          <input
            value={entry.endDate ?? ''}
            onChange={(e) => onChange({ ...entry, endDate: e.target.value || null })}
            placeholder="End (blank = present)"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className={labelClass}>What did you do — a few short lines</p>
        {entry.bullets.map((bullet, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={bullet}
              onChange={(e) => {
                const bullets = [...entry.bullets];
                bullets[index] = e.target.value;
                onChange({ ...entry, bullets });
              }}
              placeholder="e.g. Assisted with patient care under supervision"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange({ ...entry, bullets: entry.bullets.filter((_, i) => i !== index) })}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...entry, bullets: [...entry.bullets, ''] })}
          className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          + Add a line
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-3 text-xs font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
      >
        Remove this entry
      </button>
    </div>
  );
}

function EducationCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: IntakeEducationEntry;
  onChange: (entry: IntakeEducationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={entry.institution}
          onChange={(e) => onChange({ ...entry, institution: e.target.value })}
          placeholder="Institution (school, university, training provider)"
          className={inputClass}
        />
        <input
          value={entry.qualification}
          onChange={(e) => onChange({ ...entry, qualification: e.target.value })}
          placeholder="Qualification (e.g. Thanaweya Amma, Bachelor's)"
          className={inputClass}
        />
        <input
          value={entry.fieldOfStudy ?? ''}
          onChange={(e) => onChange({ ...entry, fieldOfStudy: e.target.value || null })}
          placeholder="Field of study (optional)"
          className={inputClass}
        />
        <input
          value={entry.city ?? ''}
          onChange={(e) => onChange({ ...entry, city: e.target.value || null })}
          placeholder="City (optional)"
          className={inputClass}
        />
        <div className="flex gap-2">
          <input
            value={entry.startDate ?? ''}
            onChange={(e) => onChange({ ...entry, startDate: e.target.value || null })}
            placeholder="Start (e.g. 2021)"
            className={inputClass}
          />
          <input
            value={entry.endDate ?? ''}
            onChange={(e) => onChange({ ...entry, endDate: e.target.value || null })}
            placeholder="End (blank = present)"
            className={inputClass}
          />
        </div>
        <input
          value={entry.grade ?? ''}
          onChange={(e) => onChange({ ...entry, grade: e.target.value || null })}
          placeholder="Grade (optional — only if it helps your case)"
          className={inputClass}
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-3 text-xs font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
      >
        Remove this entry
      </button>
    </div>
  );
}

function PhotoSection({
  photoUrl,
  hasPhoto,
  onUploaded,
  onRemoved,
}: {
  photoUrl: string | null;
  hasPhoto: boolean;
  onUploaded: () => void;
  onRemoved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadMyIntakePhoto(file);
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteMyIntakePhoto();
      onRemoved();
    } catch {
      setError('Failed to remove photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Photo</h2>
      <p className="mt-1 text-xs text-slate-500">
        Entirely optional. A photo is customary on a German CV but never required — employers
        legally can&apos;t demand one. Include it only if you&apos;re comfortable doing so.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {hasPhoto && photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived SAS URI, not a static asset Next's optimizer should cache
          <img
            src={photoUrl}
            alt="Your CV photo"
            className="h-20 w-20 rounded-2xl border border-slate-200 object-cover"
          />
        )}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950"
          />
          <button
            type="button"
            disabled={!file || busy}
            onClick={handleUpload}
            className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Working…' : hasPhoto ? 'Replace photo' : 'Upload photo'}
          </button>
          {hasPhoto && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'loaded' };

export function EditableProfileSection({ account }: { account: Account }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [profileAnswers, setProfileAnswers] = useState<AssessmentAnswers>(createDefaultAssessmentAnswers());
  const [form, setForm] = useState<SaveIntakeRequest | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus>('NotStarted');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // One consolidated save action for the whole page (round 2026-11-01,
  // replacing the earlier "Save profile" button + bottom "Save" button —
  // the founder's explicit ask: "i dont want to have many buttons saving
  // changes"). `saveStatus` drives the floating button's color/label;
  // `initialSnapshot` is the JSON snapshot taken right after load, used to
  // detect unsaved changes so the button only appears once something's
  // actually been edited. Plain state rather than a ref — this project's
  // lint config flags reading a ref's `.current` during render (it bypasses
  // React's re-render guarantees), and `isDirty` below is computed during
  // render on every keystroke anyway, so a ref bought nothing here.
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveDetail, setSaveDetail] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  // Tracked separately from initialSnapshot above (added 2026-11-08) so a
  // save can tell WHICH half actually changed, not just "something did."
  const [initialProfileAnswersJson, setInitialProfileAnswersJson] = useState<string | null>(null);
  const [initialFormJson, setInitialFormJson] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  // Generalized 2026-11-08 from a Summary-only, session-only nudge into
  // one shared banner covering the whole CV-content block (Summary,
  // Experience, Skills, Certifications) — a changed occupation/path can
  // make any of those read oddly, not just the summary paragraph.
  // Initialized from the two persisted timestamps that already exist
  // (User.ProfileUpdatedAt vs IntakeProfile.UpdatedAt) so a real reload
  // doesn't silently clear a genuine staleness.
  //
  // Found live 2026-11-08: an earlier version of this set the flag the
  // moment a "Your profile" field was *touched* (before Save), which read
  // as "this already happened" for a selection the user hadn't committed
  // yet — misleading, since nothing is actually saved until Save is
  // clicked. Now only (re)computed on a successful Save/Submit, by
  // comparing what actually changed in THAT save: true only when the
  // profile half changed but the CV-content half didn't (i.e. you updated
  // your occupation/level/etc. without also touching your summary,
  // experience, skills, or certifications in that same save) — false
  // whenever both changed together (you clearly already looked at both).
  const [cvContentStale, setCvContentStale] = useState(false);

  const reloadPhoto = () => {
    fetchMyIntakePhotoUrl()
      .then((url) => {
        setPhotoUrl(url);
        setHasPhoto(url !== null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMyIntake()
      .then((intake) => {
        const sanitizedAnswers = sanitizeAnswers({
          ...createDefaultAssessmentAnswers(),
          ...assessmentAnswersFromProfileSnapshot(account),
        } as AssessmentAnswers);
        setProfileAnswers(sanitizedAnswers);

        let resolvedForm: SaveIntakeRequest;
        if (intake.profile) {
          const p = intake.profile;
          resolvedForm = {
            phoneNumber: p.phoneNumber,
            address: p.address,
            dateOfBirth: p.dateOfBirth,
            summary: p.summary,
            experience: p.experience,
            education: p.education,
            technicalSkills: p.technicalSkills,
            drivingLicence: p.drivingLicence,
            certifications: p.certifications,
            hobbies: p.hobbies,
          };
          setIntakeStatus(p.status);
          setHasPhoto(p.hasPhoto);
          if (account.profileUpdatedAt && p.updatedAt) {
            setCvContentStale(new Date(account.profileUpdatedAt) > new Date(p.updatedAt));
          }
        } else {
          resolvedForm = formFromPrefill(intake.prefill);
        }
        setForm(resolvedForm);
        // Snapshot the just-loaded values so the floating save button can
        // tell "edited" from "untouched" — see its render below.
        setInitialSnapshot(JSON.stringify({ profileAnswers: sanitizedAnswers, form: resolvedForm }));
        setInitialProfileAnswersJson(JSON.stringify(sanitizedAnswers));
        setInitialFormJson(JSON.stringify(resolvedForm));

        setLoadState({ status: 'loaded' });
        reloadPhoto();
      })
      .catch(() => setLoadState({ status: 'error' }));
    // account is loaded once by the parent page and passed down — this
    // effect only needs to run on mount, not every time the reference
    // identity happens to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The one save action for the whole page — matching-profile fields and
  // the CV form together, triggered only from the floating button below.
  // /matches always computes fresh on every load (MatchingEndpoints.cs's
  // GET /matches re-runs MatchingService.Match() against the current
  // profile, no caching), so saving here is already enough to update
  // matches — no separate "recalculate" step exists to call.
  const handleSaveAll = async () => {
    if (!form) return;
    setSaveStatus('saving');
    setSaveDetail(null);
    try {
      const profileChangedThisSave = JSON.stringify(profileAnswers) !== initialProfileAnswersJson;
      const cvContentChangedThisSave = JSON.stringify(form) !== initialFormJson;

      await updateMyProfile(buildProfileSnapshot(profileAnswers));
      const saved = await saveMyIntake(form);
      setIntakeStatus(saved.status);
      setInitialSnapshot(JSON.stringify({ profileAnswers, form }));
      setInitialProfileAnswersJson(JSON.stringify(profileAnswers));
      setInitialFormJson(JSON.stringify(form));
      setCvContentStale(profileChangedThisSave && !cvContentChangedThisSave);
      setSaveStatus('success');
      setSaveDetail('Your matches are already up to date.');
      window.setTimeout(() => {
        setSaveStatus((current) => (current === 'success' ? 'idle' : current));
      }, 2500);
    } catch (err) {
      setSaveStatus('error');
      setSaveDetail(err instanceof Error ? err.message : 'Failed to save — try again.');
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const profileChangedThisSave = JSON.stringify(profileAnswers) !== initialProfileAnswersJson;
      const cvContentChangedThisSave = JSON.stringify(form) !== initialFormJson;

      await updateMyProfile(buildProfileSnapshot(profileAnswers));
      await saveMyIntake(form);
      const submitted = await submitMyIntake();
      setIntakeStatus(submitted.status);
      setInitialSnapshot(JSON.stringify({ profileAnswers, form }));
      setInitialProfileAnswersJson(JSON.stringify(profileAnswers));
      setInitialFormJson(JSON.stringify(form));
      setCvContentStale(profileChangedThisSave && !cvContentChangedThisSave);
      setSubmitMessage("Submitted — we'll be in touch once we've reviewed it.");
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Failed to submit — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedAnswers: Partial<AssessmentAnswers> = assessmentAnswersFromProfileSnapshot({
    country: account.country,
    age: account.age,
    highestEducation: account.verifiedHighestEducation ?? account.highestEducation,
    occupationField: account.verifiedOccupationField ?? account.occupationField,
    workExperience: account.workExperience,
    desiredPath: account.desiredPath,
    germanLevel: account.verifiedGermanLevel ?? account.germanLevel,
    englishLevel: account.verifiedEnglishLevel ?? account.englishLevel,
    languageCertificate: account.languageCertificate,
    passportStatus: account.verifiedPassportStatus ?? account.passportStatus,
    germanyConnection: account.germanyConnection,
    financialSituation: account.financialSituation,
    startTimeline: account.startTimeline,
    regionFlexibility: account.regionFlexibility,
  } satisfies ProfileSnapshot);

  function verifiedFieldInfo(questionId: AssessmentQuestionId): VerifiedFieldInfo | null {
    if (!VERIFIABLE_QUESTION_IDS.includes(questionId)) return null;
    const isVerified =
      (questionId === 'highestEducation' && account.verifiedHighestEducation !== null) ||
      (questionId === 'occupationField' && account.verifiedOccupationField !== null) ||
      (questionId === 'germanLevel' && account.verifiedGermanLevel !== null) ||
      (questionId === 'englishLevel' && account.verifiedEnglishLevel !== null) ||
      (questionId === 'passportStatus' && account.verifiedPassportStatus !== null);
    if (!isVerified) return null;

    const def = ASSESSMENT_QUESTION_DEFINITIONS.find((d) => d.id === questionId);
    const verifiedValue = verifiedAnswers[questionId];
    if (!def || typeof verifiedValue !== 'string') return null;
    const label = def.options?.find((o) => o.value === verifiedValue)?.label;
    if (!label) return null;

    const currentValue = profileAnswers[questionId];
    const diverges = typeof currentValue === 'string' && currentValue !== verifiedValue;
    // MatchingService.cs prefers the verified value over self-report for
    // these four; passportStatus is verifiable but never read by matching.
    const affectsMatching = questionId !== 'passportStatus';
    // Everything except occupationField is a fact a new document can
    // legitimately update — see this interface's own comment above.
    const canUpdateViaNewDocument = questionId !== 'occupationField';
    return { label, diverges, affectsMatching, canUpdateViaNewDocument };
  }

  if (loadState.status === 'loading') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Loading your profile…</p>
      </section>
    );
  }

  if (loadState.status === 'error' || !form) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">
          We couldn&apos;t load this right now. Please try again shortly.
        </p>
      </section>
    );
  }

  const computedAge = account.verifiedDateOfBirth ? computeAgeFromDob(account.verifiedDateOfBirth) : null;

  // Edited-since-load check (round 2026-11-01) — the floating button below
  // only renders once this is true, or a save is in flight / just
  // finished, instead of sitting on screen from the moment the page loads
  // with nothing to save yet.
  const currentSnapshot = JSON.stringify({ profileAnswers, form });
  const isDirty = initialSnapshot !== null && currentSnapshot !== initialSnapshot;
  const showSaveButton = isDirty || saveStatus !== 'idle';

  const saveButtonClass =
    saveStatus === 'success'
      ? 'bg-emerald-500 shadow-emerald-900/30 hover:bg-emerald-600'
      : saveStatus === 'error'
        ? 'bg-red-600 shadow-red-900/30 hover:bg-red-700'
        : 'bg-blue-600 shadow-blue-900/30 hover:bg-blue-700';

  const saveButtonLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'success'
        ? 'Saved successfully'
        : saveStatus === 'error'
          ? 'Failed to save'
          : 'Save changes';

  return (
    <div className="space-y-4">
      {/* Found live 2026-11-01: the "where do I save" complaint repeated
          across sections (Your profile, then Contact details) once each
          only had its own one-off Save button — the founder's explicit
          ask was one button for every update on the page, not several.
          This floating button (mirroring SiteNav's FloatingContactButton
          fixed-position pattern, opposite corner so the two never overlap)
          is now the only save action anywhere on the page besides the
          distinct "Save & submit CV for review" action at the bottom —
          hidden until something's actually been edited, then blue while
          there's something to save, green on a successful save (fading
          back to hidden after a couple seconds, since there's nothing left
          unsaved), red with the real error message if the save fails. */}
      {/* A real DaisyUI toast (not a hand-rolled fixed div — see
          novira-ui-patterns) so it survives scrolling anywhere on this
          (long) page without needing its own manual coordinates — found
          live 2026-11-08: the first version was placed inline at the top
          of "Your profile," which only helped if the user happened to
          still be scrolled there. toast-bottom/toast-center deliberately
          avoids both corners already claimed on this page (Save button at
          bottom-5 left-5, SiteNav's FloatingContactButton at bottom-5
          right-5 — see novira-ui-patterns's position map). Amber, not red
          — this is a reminder to double-check something, not a failure
          (see that skill's color-semantics table). Only ever becomes true
          as the OUTCOME of a Save (handleSaveAll/handleSubmit's
          profileChangedThisSave && !cvContentChangedThisSave), never while
          just clicking through options before committing — an earlier
          version set it on every field onChange, which read as "this
          already happened" for a selection nothing had actually saved
          yet. */}
      {cvContentStale && (
        <div className="toast toast-bottom toast-center z-40">
          <div
            role="alert"
            className="max-w-xs rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-lg"
          >
            Your profile changed — review your summary, experience, skills, and certifications below before
            relying on this CV.
          </div>
        </div>
      )}
      {showSaveButton && (
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saveStatus === 'saving' || submitting}
          title={saveStatus === 'error' ? (saveDetail ?? undefined) : undefined}
          className={`fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${saveButtonClass}`}
        >
          {saveButtonLabel}
        </button>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Your profile</h2>
            <p className="mt-1 text-xs text-slate-500">
              Used to find your matches. Editable here regardless of anything a document has
              already confirmed.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            CV status: {STATUS_LABELS[intakeStatus]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            ASSESSMENT_QUESTION_DEFINITIONS as ReadonlyArray<AssessmentQuestionDefinition<AssessmentQuestionId>>
          ).map((definition) => {
            // A verified DOB is a confirmed fact, not a self-report — once
            // one exists, Age becomes a plain computed number instead of
            // the editable range select, and isn't itself editable (fixing
            // it means fixing the underlying DOB, not this derived value).
            if (definition.id === 'age' && computedAge !== null) {
              return (
                <div key="age">
                  <label className={labelClass}>Age</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {computedAge}
                    <span className={verifiedTagClass}>✓ Verified</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Calculated from your verified date of birth.
                  </p>
                </div>
              );
            }
            return (
              <div
                key={definition.id}
                className={definition.searchable || definition.multiSelect ? 'sm:col-span-2' : undefined}
              >
                <ProfileField
                  definition={definition}
                  value={profileAnswers[definition.id]}
                  onChange={(value) => setProfileAnswers({ ...profileAnswers, [definition.id]: value })}
                  verifiedInfo={verifiedFieldInfo(definition.id)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Contact details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={form.phoneNumber ?? ''}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value || null })}
            placeholder="Phone number"
            className={inputClass}
          />
          <input
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value || null })}
            placeholder="Address / city"
            className={inputClass}
          />
          <div className="sm:col-span-2">
            <input
              value={form.dateOfBirth ?? ''}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value || null })}
              placeholder="Date of birth (optional — customary, not required)"
              className={inputClass}
            />
            {account.verifiedDateOfBirth && (
              <p className="mt-1 text-[11px] text-slate-500">
                Confirmed from a document — used for your exact age above.
              </p>
            )}
          </div>
        </div>
      </section>

      <PhotoSection
        photoUrl={photoUrl}
        hasPhoto={hasPhoto}
        onUploaded={reloadPhoto}
        onRemoved={() => {
          setHasPhoto(false);
          setPhotoUrl(null);
        }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            <p className="mt-1 text-xs text-slate-500">
              A few lines about yourself — optional, we can also draft this for you later.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="shrink-0 cursor-not-allowed rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400"
          >
            AI summary
          </button>
        </div>
        <textarea
          value={form.summary ?? ''}
          onChange={(e) => setForm({ ...form, summary: e.target.value || null })}
          rows={3}
          className={`mt-3 ${inputClass}`}
        />
      </section>

      {/* These four collapse by default now (found live 2026-11-09) — with
        the profile fields, CV form, documents, and messages all on one
        page since round 16, the fully-expanded version of this page ran
        to roughly 5000px. Each still shows a count/status teaser in its
        collapsed header so there's a reason to open it without guessing. */}
      <CollapsibleSection
        title="Experience"
        description={
          form.experience.length === 0
            ? 'Nothing added yet'
            : `${form.experience.length} ${form.experience.length === 1 ? 'entry' : 'entries'} added`
        }
        defaultOpen={false}
      >
        <RepeatableSectionHeader
          description="Internships, part-time jobs, volunteer work, or school projects count — not just formal employment."
          addLabel="+ Add experience"
          onAdd={() => setForm({ ...form, experience: [...form.experience, emptyExperience()] })}
        />
        <div className="mt-4 space-y-3">
          {form.experience.length === 0 && (
            <p className="text-sm text-slate-500">Nothing added yet.</p>
          )}
          {form.experience.map((entry, index) => (
            <ExperienceCard
              key={index}
              entry={entry}
              onChange={(updated) => {
                const experience = [...form.experience];
                experience[index] = updated;
                setForm({ ...form, experience });
              }}
              onRemove={() =>
                setForm({ ...form, experience: form.experience.filter((_, i) => i !== index) })
              }
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Education"
        description={
          form.education.length === 0
            ? 'Nothing added yet'
            : `${form.education.length} ${form.education.length === 1 ? 'entry' : 'entries'} added`
        }
        defaultOpen={false}
      >
        <RepeatableSectionHeader
          description="School, vocational training, and university — newest first is fine, we'll order it correctly."
          addLabel="+ Add education"
          onAdd={() => setForm({ ...form, education: [...form.education, emptyEducation()] })}
        />
        <div className="mt-4 space-y-3">
          {form.education.length === 0 && (
            <p className="text-sm text-slate-500">Nothing added yet.</p>
          )}
          {form.education.map((entry, index) => (
            <EducationCard
              key={index}
              entry={entry}
              onChange={(updated) => {
                const education = [...form.education];
                education[index] = updated;
                setForm({ ...form, education });
              }}
              onRemove={() =>
                setForm({ ...form, education: form.education.filter((_, i) => i !== index) })
              }
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Skills & certifications"
        description={
          form.technicalSkills || form.certifications || form.drivingLicence
            ? 'Some details added'
            : 'Nothing added yet'
        }
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Technical / software skills</label>
            <input
              value={form.technicalSkills ?? ''}
              onChange={(e) => setForm({ ...form, technicalSkills: e.target.value || null })}
              placeholder="e.g. MS Office, AutoCAD, basic first aid"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Certifications (beyond language certificates)</label>
            <input
              value={form.certifications ?? ''}
              onChange={(e) => setForm({ ...form, certifications: e.target.value || null })}
              placeholder="e.g. First aid certificate, forklift license"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.drivingLicence}
              onChange={(e) => setForm({ ...form, drivingLicence: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
            />
            I have a driving licence
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Hobbies & interests"
        description={form.hobbies ? 'Added' : 'Optional — nothing added yet'}
        defaultOpen={false}
      >
        <p className="text-xs text-slate-500">
          Entirely optional — only include something if it&apos;s genuinely relevant.
        </p>
        <textarea
          value={form.hobbies ?? ''}
          onChange={(e) => setForm({ ...form, hobbies: e.target.value || null })}
          rows={2}
          className={`mt-3 ${inputClass}`}
        />
      </CollapsibleSection>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        {/* Clarifying line added 2026-11-09 (tier-journey study) — this
          button's label only names the CV, but handleSubmit also saves
          "Your profile" above in the same action. That's correct and
          intentional (the floating Save button already does the same
          combined save, just without submitting) — the gap was purely
          that a user reading just the button label had no way to know
          their matching-profile answers were part of it too. */}
        <p className="text-xs text-slate-500">
          Submits your CV content below for a human review. Your profile answers above are saved
          in the same action, but aren&apos;t part of what gets reviewed here — they&apos;re what
          your matches are based on.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveStatus === 'saving' || submitting}
            className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Save & submit CV for review'}
          </button>
          {submitMessage && <p className="text-xs text-slate-500">{submitMessage}</p>}
        </div>
      </section>
    </div>
  );
}
