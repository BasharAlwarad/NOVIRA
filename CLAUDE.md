# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NOVIRA is a two-part app that helps people from the Middle East/North Africa region find the best pathway (university, Ausbildung, or employment) to Germany. Users complete a 14-step assessment (country, age, education, occupation field, work experience, desired path, language levels + certification, passport status, prior Germany connection, financial situation, timeline, region flexibility) modeled on real German labor-market demand and Egypt-specific factors, not just generic profile fields. The Tier 1 verdict is computed entirely client-side by a rules engine (`frontend/src/lib/assessment-verdict.ts`, see "Matching algorithm" below) — the backend is not involved in this step at all.

- `frontend/` — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + DaisyUI. Owns the entire UI, including the assessment wizard, and currently persists assessment answers to `localStorage` only.
- `backend/` — ASP.NET Core (.NET 9) minimal API with EF Core + Npgsql wired to a Postgres database (Neon). Has a `User` model, `AppDbContext`, the health-check route (`GET /`), and one real endpoint: `POST /leads` (email capture + result email, see "Email capture" below). `frontend/.env.example` documents `API_BASE_URL=http://localhost:5080`, read server-side only by `frontend/src/app/api/leads/route.ts` (a Route Handler proxy — the browser never talks to the backend directly); `src/lib/api/` and `src/lib/contracts/` hold the client-side fetch wrapper and shared request/response types for this.

The two apps are run and deployed independently — there is no shared package/workspace tooling tying them together.

**Full business/legal/product reasoning** (legal scope constraints, the two-tier user funnel, why the Tier 1 verdict is a rules engine and not an LLM call, why the UI is English-first for now) lives in `Plan.md`, not here — read it before adding features that touch matching logic, user data collection, or anything advice/eligibility-adjacent. **The matching algorithm's own research and design** (real German university/Ausbildung/employment criteria, the draft scoring weights, open tuning questions) lives in `Matching-Algorithm-Study.md` — read it before changing anything in `lib/assessment-verdict.ts` or `lib/occupation-demand.ts`. This file only tracks the short technical version: what phase we're building right now.

## Current build phase

**Priority note (as of 2026-07-29):** this is a mockup/prototype, not going to production yet. Legal/compliance work (Phase 0 below) is deliberately paused — don't proactively raise or push it; keep it tracked, not actioned, until told otherwise. Focus is on building product features.

**Active — Phase 1: Tier 1 funnel (no signup, no documents; everything stays in `localStorage` until the email-capture step).**
- [x] Rules-engine verdict: a client-side pure function over the saved `AssessmentAnswers` — no backend call, no LLM. See "Matching algorithm" below. Weights are approved-for-now per `Matching-Algorithm-Study.md` §6, expected to be tuned once real submissions come in — a known limitation (Ausbildung scoring doesn't yet penalize overqualification) is tracked there, not fixed yet.
- [x] Visual, qualitative result screen at `/assessment/result` — wired up end to end (wizard's final step navigates there on completion; this also serves as the wizard's completion screen, no separate one needed).
- [x] Email capture on the result page (no password, no full account) — a soft, skippable opt-in prompt (`SaveResultPrompt.tsx`), not a hard gate: "want to save this / get it emailed to you?" rather than blocking content behind email entry. This is the first point real data leaves the browser. Sends an actual branded result email via Resend (`backend/Program.cs`'s `BuildResultEmailHtml`), not just a capture-only stub.
- [x] Plain-language privacy notice next to the email field, in `SaveResultPrompt.tsx`.
- [x] `Users` row created in Neon only after an email is actually captured — `POST /leads` upserts on normalized (trimmed, lowercased) email, idempotent on resubmit.

**Deferred — do not build unless specifically asked:**
- Tier 2: document upload, real auth, AI document analysis, opportunities database, matching engine (Phase 2 — gated on the Phase 0 legal review of consent wording, see `Plan.md` §3/§4).
- Payment/subscription handling (Phase 2/3) — not until the in-product willingness-to-pay question shows real signal.
- Arabic localization — English-first through development; lands right before Phase 2's marketing push starts, not before.
- Company formation / lawyer consultation (Phase 0) — deliberately running in parallel with or after the Tier 1 MVP build, not a blocker for the items above.

Full phase-by-phase breakdown and rationale: `Plan.md` §11.

## Commands

### Frontend (run from `frontend/`)
```
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
```
No test runner is configured yet.

### Browser verification (not a test suite)
`playwright` and `tsx` are devDependencies specifically for ad-hoc visual/behavioral verification after a UI change — not a formal E2E suite (none exists). Write a throwaway script into `frontend/verify/` (gitignored, never committed), run it with `node verify/whatever.mjs` (or `npx tsx` for scripts that import TS source directly, e.g. to sanity-check `lib/` logic against sample data), and **delete the script and any screenshots when done** — the folder should be empty between sessions. Plain `import { chromium } from 'playwright'` resolves normally now; no npx cache tricks needed.

### Backend (run from `backend/`)
```
dotnet run                     # start API at http://localhost:5080 (see Properties/launchSettings.json)
dotnet build                   # build
dotnet watch run               # run with hot reload
```
No test project exists yet.

## Architecture

### Assessment wizard (the core frontend feature)
The wizard's data model, state, validation, and rendering are split across four layers — when changing a question, all of them may need updates:

1. **Schema** — `src/types/assessment.ts` defines the canonical question/step schema (`ASSESSMENT_QUESTION_DEFINITIONS`, `ASSESSMENT_STEP_DEFINITIONS`), enums (e.g. `EducationLevel`, `DesiredPath`, `LanguageLevel`), and the `AssessmentState`/`AssessmentAnswers` shape.
2. **State** — `src/context/AssessmentProvider.tsx` is a reducer-based React context (hydrate/update-answer/go-to-step/reset) providing the current step, answers, and navigation actions. Consumed via the `useAssessment()` hook (`src/hooks/useAssessment.ts`); must be used inside `<AssessmentProvider>` (wired in `src/app/assessment/page.tsx`, its own route — not embedded on the homepage, to keep the marketing page from competing with a 14-step form for attention).
3. **Persistence** — `src/lib/assessment-storage.ts` saves/loads a versioned envelope (`ASSESSMENT_STORAGE_VERSION`) to `localStorage` under `ASSESSMENT_STORAGE_KEY`, with normalization for legacy shapes (e.g. migrating an old `education` field to `highestEducation`). Bump the version and extend `normalizeAssessmentState` when the answer shape changes.
4. **Validation** — `src/lib/assessment-validation.ts` validates per-question (`validateQuestionAnswer`, dispatched by `question.kind`) and per-step (`validateStep`), driven off the same `ASSESSMENT_QUESTION_DEFINITIONS`.

`AssessmentWizard.tsx` derives its per-question render config (`WIZARD_QUESTIONS`) directly from `ASSESSMENT_STEP_DEFINITIONS`/`ASSESSMENT_QUESTION_DEFINITIONS` at module scope — there is no second copy of question text/options to keep in sync. Adding or editing a question only requires changing `types/assessment.ts` (each question needs a `prompt`, the full question text shown to the user, in addition to its short `label`).

Two question-rendering variants beyond the plain option-card grid, both driven by flags on the question definition (`AssessmentStep.tsx` branches on them):
- **`searchable: true`** — renders `SearchableSelect.tsx` instead of a card grid: an always-visible, in-flow filterable list (not a floating overlay — that caused a stacking-context bug with the nav buttons, see git history) with category group-headers shown once per group, not repeated per row. Used for `occupationField` (110 options across 17 categories).
- **`multiSelect: true`** — `AssessmentStep.tsx` toggles values in/out of an array instead of overwriting, uses `role="group"` instead of `radiogroup`. The answer type for that field must be an array (e.g. `germanyConnection: GermanyConnection[]`), and `AssessmentWizard.tsx`'s `answeredCount` must treat an empty array as unanswered, not answered — both already handled, but a trap if a new multi-select field is added without checking.

`StepIndicator.tsx` is a horizontally-scrolling carousel (not a wrapping grid) that re-centers on the active step via `scrollIntoView` whenever `currentStepIndex` changes — it does not have its own prev/next controls, it only follows the wizard's own navigation.

The assessment lives at its own route, `frontend/src/app/assessment/page.tsx` — not embedded on the homepage — specifically so a 14-question form doesn't compete with marketing/trust content for attention.

### Matching algorithm
- `frontend/src/lib/assessment-verdict.ts` — `computeVerdict(answers)` is the Tier 1 rules engine. It scores the profile against all three paths (University/Ausbildung/Employment) independently, then compares against the user's stated `desiredPath` to produce one of four outcomes (`confirmed` / `alternative` / `suggested` / `unclear`) — see `Matching-Algorithm-Study.md` §5.1 for why it's structured this way rather than a single flat verdict. Each `PathScore` also carries a `factors: ScoreFactor[]` breakdown (per-question point contributions), which `getImprovementAdvice()` uses to find the single weakest *actionable* factor for a path and return real, non-fabricated advice text (or `null` when nothing meaningful stands out). All scoring is internal; only the qualitative outcome and advice text may ever reach the UI.
- `frontend/src/lib/occupation-demand.ts` — a static, manually-curated lookup tagging which of the 110 `OccupationField` values are official German shortage occupations. Deliberately kept separate from `types/assessment.ts` (not part of the questionnaire schema, never shown to the user) so it's a clean swap-out point for the planned Phase 2 system: an AI-assisted pipeline that checks official sources periodically and regenerates this data.
- Wired into the UI at `frontend/src/app/assessment/result/page.tsx`, which loads the saved answers from `localStorage`, calls `computeVerdict()`, and renders, in order: the verdict text, `PathFitChart.tsx` (an "emphasis" bar chart — recommended path in the brand accent, the other two gray, no numeric labels anywhere per the qualitative-only rule), `ProfileImprovementAdvice.tsx` (real data from `getImprovementAdvice()`), `DocumentChecklist.tsx` (general, path-specific, publicly-sourced document info — not personalized advice, see the disclaimer in the component), and `PlaceholderOpportunityCounts.tsx`.
- **`PlaceholderOpportunityCounts.tsx` is mock data** — hardcoded numbers for the founder's own product-vision prototyping, not connected to anything real. It's loudly commented and named to make that unmistakable; if you're touching this component, do not make the numbers look "wired up" without actually wiring them up. Must be replaced (or gated off) before any real user sees this page.

### Email capture & result email
- `SaveResultPrompt.tsx` (rendered on `/assessment/result`, after the document checklist) posts to `src/lib/api/leads.ts` → `src/app/api/leads/route.ts` (server-side proxy, keeps `API_BASE_URL` off the client) → backend `POST /leads`.
- The backend does **not** recompute anything — it trusts the frontend's already-computed, already-qualitative display data (verdict heading/body, `getImprovementAdvice()` output, the fixed-band path-fit bars from `src/lib/result-display.ts`, the static per-path document checklist) and just relays it into a branded HTML email (`BuildResultEmailHtml` in `backend/Program.cs`). This keeps the "no scoring server-side" rule from the Matching algorithm section intact — see the security note below for the trade-off this creates.
- `src/lib/result-display.ts` is the single source of truth for path-fit labels/bar widths and the per-path document checklists — both `PathFitChart.tsx`/`DocumentChecklist.tsx` (on-page) and `result/page.tsx`'s email payload read from it, so there's no second copy to drift.
- The email template is table-based with inline styles throughout (not Tailwind classes, not flexbox/grid) because desktop Outlook renders with Word's engine and ignores both — see the comment above `BuildResultEmailHtml`.
- Email sending uses [Resend](https://resend.com) (`Resend:ApiKey` / `Resend:FromAddress` in backend user-secrets, never committed). Without a verified sending domain on Resend, `onboarding@resend.dev` can only deliver to the email on the Resend account itself — fine for dev, not for real users. Domain verification is a prerequisite before this reaches anyone outside the founder.
- If `Resend:ApiKey` is unset (or the Resend call fails), `POST /leads` still saves the `Users` row and returns `{ saved: true, emailSent: false }` — a flaky/unconfigured email provider must never mask a successful capture.

#### Known security limitations (tracked, not all fixed)
As of 2026-07-30, `/leads` has: per-IP rate limiting at **both** layers (Next.js route handler, `src/lib/rate-limit.ts` — in-memory, sees the real visitor IP; and backend, `Program.cs`'s `AddRateLimiter` — coarser, since it only ever sees the frontend proxy's IP for browser traffic), email normalization before the uniqueness check, request field/array-size caps (`IsWithinSizeLimits`), the branded CTA button restricted to the configured frontend origin only (`IsAllowedContinueUrl`, prevents it being turned into an open phishing-link redirector), an HTTP timeout on the outbound Resend call, and a catch-all around the handler so internal exceptions never reach the client. Still open, deliberately deferred:
- **No auth on `/leads`, by design** (Tier 1 is explicitly no-signup) — this means rate limiting + input caps are the *only* real defense, not identity. Acceptable while this stays local/prototype-only; revisit before any public deployment.
- **The backend still trusts client-supplied email content.** `verdictHeading`/`verdictBody`/`adviceText`/checklist items are attacker-controllable free text (length-capped, HTML-encoded so no injection) that gets embedded in a NOVIRA-branded email sent from the shared Resend account to *any* address the caller supplies. Rate limiting bounds how many such emails one IP can trigger, but doesn't eliminate the "our infrastructure could be used to send a handful of branded messages to an arbitrary inbox" risk. A full fix means the backend stops trusting client-supplied display text entirely (e.g. only accepting a `userId`/answer-hash and regenerating everything server-side) — a bigger architecture change, not done here.
- **`ASPNETCORE_ENVIRONMENT=Development`** in `launchSettings.json` — must become `Production` before any real deployment (Development mode's default diagnostics can be more verbose on unhandled errors).
- The in-memory frontend rate limiter (`src/lib/rate-limit.ts`) is process-local: resets on redeploy and won't be shared across instances if this ever runs on multiple servers or serverless — fine for the current single-process dev/prod setup, not for a scaled deployment.

### Frontend conventions
- Path alias `@/*` → `src/*` (see `tsconfig.json`).
- Styling is Tailwind v4 (via `@tailwindcss/postcss`) plus DaisyUI components (e.g. `hero`, `btn` classes in `hero.tsx`/`site-nav.tsx`).
- `frontend/AGENTS.md` (imported into `frontend/CLAUDE.md` via `@AGENTS.md`) flags that this Next.js version has breaking changes vs. training data — consult `node_modules/next/dist/docs/` before assuming an API's behavior.

### Backend conventions
- Single-file minimal API (`Program.cs`); no controllers yet, models live in `backend/Models/` (currently just `User.cs`).
- `backend/Data/AppDbContext.cs` is the EF Core context (`Users` DbSet). Connection string lives in **.NET user-secrets** (`ConnectionStrings:DefaultConnection`), not in `appsettings.json` — never commit it. Npgsql needs the `Host=...;Port=...;Database=...;Username=...;Password=...;SSL Mode=Require` keyword format, not the `postgresql://` URI Neon's dashboard gives you.
- Also in user-secrets: `Resend:ApiKey`, `Resend:FromAddress` (email sending, see "Email capture & result email" above). `Frontend:BaseUrl` is a plain (non-secret) config value read from `IConfiguration`, defaulting to `http://localhost:3000` if unset — update it alongside the CORS origin below when a production frontend domain exists.
- EF Core packages are pinned to the 9.x line (`Npgsql.EntityFrameworkCore.PostgreSQL` 9.0.4, `Microsoft.EntityFrameworkCore.Design` 9.0.9) — the package's latest major targets net10.0 and is incompatible with this net9.0 project; don't let a bare `dotnet add package` float it forward.
- CORS is locked to `http://localhost:3000` (the frontend dev origin) — update the policy in `Program.cs` alongside any deployment/origin changes.
