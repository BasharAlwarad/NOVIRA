# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NOVIRA is a two-part app that helps people from the Middle East/North Africa region find the best pathway (university, Ausbildung, or employment) to Germany. Users complete a multi-step assessment (country, age, education, desired path, language levels, passport status, budget); the plan is to have the backend turn those answers into a recommendation.

- `frontend/` — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + DaisyUI. Owns the entire UI, including the assessment wizard, and currently persists assessment answers to `localStorage` only.
- `backend/` — ASP.NET Core (.NET 9) minimal API with EF Core + Npgsql wired to a Postgres database (Neon). Has a `User` model and `AppDbContext` but no assessment/matching endpoints yet — just the health-check route (`GET /`) plus the `Users` table. `frontend/.env.example` documents `API_BASE_URL=http://localhost:5080` for the eventual connection between the two, but no frontend code calls it yet (`src/lib/api/` and `src/lib/contracts/` are empty scaffolding for this).

The two apps are run and deployed independently — there is no shared package/workspace tooling tying them together.

**Full business/legal/product reasoning** (legal scope constraints, the two-tier user funnel, why the Tier 1 verdict is a rules engine and not an LLM call, why the UI is English-first for now) lives in `Plan.md`, not here — read it before adding features that touch matching logic, user data collection, or anything advice/eligibility-adjacent. This file only tracks the short technical version: what phase we're building right now.

## Current build phase

**Active — Phase 1: Tier 1 funnel (no signup, no documents; everything stays in `localStorage` until the email-capture step).**
- [ ] Rules-engine verdict: a client-side pure function over the saved `AssessmentAnswers` — no backend call, no LLM. Three outcomes only (strong fit / consider job search / unclear, needs a closer look), never a numeric match score. Decision thresholds must come from the founder's actual professional judgment — confirm before implementing, don't invent them.
- [ ] Visual, qualitative result screen presenting that verdict (profile-summary style, not a percentage/score).
- [ ] Email-only capture (no password, no full account) gating a "full explanation sent by email" — this is the first point real data leaves the browser.
- [ ] Short, plain-language privacy notice next to that email field once it exists.
- [ ] `Users` row created in Neon only after an email is actually captured.
- [ ] Real completion screen for the wizard — `onComplete` in `AssessmentWizard.tsx` is currently unwired, so finishing today produces no visible confirmation.

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
2. **State** — `src/context/AssessmentProvider.tsx` is a reducer-based React context (hydrate/update-answer/go-to-step/reset) providing the current step, answers, and navigation actions. Consumed via the `useAssessment()` hook (`src/hooks/useAssessment.ts`); must be used inside `<AssessmentProvider>` (wired in `src/app/page.tsx`).
3. **Persistence** — `src/lib/assessment-storage.ts` saves/loads a versioned envelope (`ASSESSMENT_STORAGE_VERSION`) to `localStorage` under `ASSESSMENT_STORAGE_KEY`, with normalization for legacy shapes (e.g. migrating an old `education` field to `highestEducation`). Bump the version and extend `normalizeAssessmentState` when the answer shape changes.
4. **Validation** — `src/lib/assessment-validation.ts` validates per-question (`validateQuestionAnswer`, dispatched by `question.kind`) and per-step (`validateStep`), driven off the same `ASSESSMENT_QUESTION_DEFINITIONS`.

`AssessmentWizard.tsx` derives its per-question render config (`WIZARD_QUESTIONS`) directly from `ASSESSMENT_STEP_DEFINITIONS`/`ASSESSMENT_QUESTION_DEFINITIONS` at module scope — there is no second copy of question text/options to keep in sync. Adding or editing a question only requires changing `types/assessment.ts` (each question needs a `prompt`, the full question text shown to the user, in addition to its short `label`).

### Frontend conventions
- Path alias `@/*` → `src/*` (see `tsconfig.json`).
- Styling is Tailwind v4 (via `@tailwindcss/postcss`) plus DaisyUI components (e.g. `hero`, `btn` classes in `hero.tsx`/`site-nav.tsx`).
- `frontend/AGENTS.md` (imported into `frontend/CLAUDE.md` via `@AGENTS.md`) flags that this Next.js version has breaking changes vs. training data — consult `node_modules/next/dist/docs/` before assuming an API's behavior.

### Backend conventions
- Single-file minimal API (`Program.cs`); no controllers yet, models live in `backend/Models/` (currently just `User.cs`).
- `backend/Data/AppDbContext.cs` is the EF Core context (`Users` DbSet). Connection string lives in **.NET user-secrets** (`ConnectionStrings:DefaultConnection`), not in `appsettings.json` — never commit it. Npgsql needs the `Host=...;Port=...;Database=...;Username=...;Password=...;SSL Mode=Require` keyword format, not the `postgresql://` URI Neon's dashboard gives you.
- EF Core packages are pinned to the 9.x line (`Npgsql.EntityFrameworkCore.PostgreSQL` 9.0.4, `Microsoft.EntityFrameworkCore.Design` 9.0.9) — the package's latest major targets net10.0 and is incompatible with this net9.0 project; don't let a bare `dotnet add package` float it forward.
- CORS is locked to `http://localhost:3000` (the frontend dev origin) — update the policy in `Program.cs` alongside any deployment/origin changes.
