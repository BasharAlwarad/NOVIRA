'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMyAccount, NotSignedInError as NoAccountSession } from '@/lib/api/account';
import {
  deleteMyIntakePhoto,
  fetchMyIntake,
  fetchMyIntakePhotoUrl,
  NotSignedInError,
  saveMyIntake,
  submitMyIntake,
  uploadMyIntakePhoto,
} from '@/lib/api/intake';
import type { Account } from '@/lib/contracts/account';
import type {
  IntakeEducationEntry,
  IntakeExperienceEntry,
  IntakePrefill,
  IntakeStatus,
  SaveIntakeRequest,
} from '@/lib/contracts/intake';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

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

// Only ever used once, on a genuinely blank form (see the backend's own
// comment on IntakePrefillResponse) — a saved profile is always the sole
// source of truth afterward, this is never re-applied over top of it.
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

function RepeatableSectionHeader({
  title,
  description,
  onAdd,
  addLabel,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
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

type PageState =
  | { status: 'loading' }
  | { status: 'not-signed-in' }
  | { status: 'error' }
  | { status: 'loaded' };

export default function IntakePage() {
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [account, setAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<SaveIntakeRequest | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus>('NotStarted');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reloadPhoto = () => {
    fetchMyIntakePhotoUrl()
      .then((url) => {
        setPhotoUrl(url);
        setHasPhoto(url !== null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    Promise.all([fetchMyIntake(), fetchMyAccount()])
      .then(([intake, acct]) => {
        setAccount(acct);
        if (intake.profile) {
          const p = intake.profile;
          setForm({
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
          });
          setIntakeStatus(p.status);
          setHasPhoto(p.hasPhoto);
        } else {
          setForm(formFromPrefill(intake.prefill));
        }
        setPageState({ status: 'loaded' });
        reloadPhoto();
      })
      .catch((err) => {
        setPageState({ status: err instanceof NotSignedInError || err instanceof NoAccountSession ? 'not-signed-in' : 'error' });
      });
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveMyIntake(form);
      setIntakeStatus(saved.status);
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save — try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await saveMyIntake(form);
      const submitted = await submitMyIntake();
      setIntakeStatus(submitted.status);
      setMessage("Submitted — we'll be in touch once we've reviewed it.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to submit — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const germanLevel = account?.verifiedGermanLevel ?? account?.germanLevel ?? null;
  const englishLevel = account?.verifiedEnglishLevel ?? account?.englishLevel ?? null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
          Application profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          Your CV details
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Filled in once — this is what a CV or cover letter gets built from when you request one
          for a specific match. Anything already confirmed from your approved documents is
          pre-filled below; everything stays editable.
        </p>

        {pageState.status === 'loaded' && (
          <p className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Status: {STATUS_LABELS[intakeStatus]}
          </p>
        )}

        <div className="mt-8 space-y-6">
          {pageState.status === 'loading' && <p className="text-sm text-slate-500">Loading…</p>}

          {pageState.status === 'not-signed-in' && (
            <div className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm text-slate-600">
                You&apos;re not signed in, or your sign-in link has expired.
              </p>
              <Link
                href="/signin"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </div>
          )}

          {pageState.status === 'error' && (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              We couldn&apos;t load this right now. Please try again shortly.
            </p>
          )}

          {pageState.status === 'loaded' && form && (
            <>
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
                  <input
                    value={form.dateOfBirth ?? ''}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value || null })}
                    placeholder="Date of birth (optional — customary, not required)"
                    className={`${inputClass} sm:col-span-2`}
                  />
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
                <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
                <p className="mt-1 text-xs text-slate-500">
                  A few lines about yourself — optional, we can also draft this for you later.
                </p>
                <textarea
                  value={form.summary ?? ''}
                  onChange={(e) => setForm({ ...form, summary: e.target.value || null })}
                  rows={3}
                  className={`mt-3 ${inputClass}`}
                />
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Languages</h2>
                <p className="mt-1 text-xs text-slate-500">
                  From your profile — edit your assessment if this needs to change.
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="inline font-semibold">German: </dt>
                    <dd className="inline">{germanLevel ? humanizeEnumValue(germanLevel) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">English: </dt>
                    <dd className="inline">{englishLevel ? humanizeEnumValue(englishLevel) : '—'}</dd>
                  </div>
                  {account?.verifiedHasCertifiedLanguageProof && (
                    <div className="sm:col-span-2">
                      <dt className="inline font-semibold">Certified proof: </dt>
                      <dd className="inline">Confirmed from an approved document</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <RepeatableSectionHeader
                  title="Experience"
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
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <RepeatableSectionHeader
                  title="Education"
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
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Skills &amp; certifications</h2>
                <div className="mt-3 space-y-3">
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
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Hobbies &amp; interests</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Entirely optional — only include something if it&apos;s genuinely relevant.
                </p>
                <textarea
                  value={form.hobbies ?? ''}
                  onChange={(e) => setForm({ ...form, hobbies: e.target.value || null })}
                  rows={2}
                  className={`mt-3 ${inputClass}`}
                />
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || submitting}
                  className="rounded-full bg-white border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || submitting}
                  className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Save & submit for review'}
                </button>
                {message && <p className="text-xs text-slate-500">{message}</p>}
              </div>

              <div className="pt-2">
                <Link href="/account" className="text-sm text-emerald-700 underline underline-offset-2">
                  ← Back to your account
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
