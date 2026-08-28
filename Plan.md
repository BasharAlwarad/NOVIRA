# NOVIRA — Business Plan

Study document assembled from planning discussion. Reorganized to reflect the current shape of the plan. Not implementation docs (see root `CLAUDE.md` for that) — this is the business/legal/product/go-to-market plan. The matching algorithm's own research and design lives separately in `Matching-Algorithm-Study.md`.

---

## 1. Vision

Help people from Egypt (starting market) find and successfully apply to study programs and Ausbildung (vocational training) positions in Germany, using AI to analyze their profile and match them against real, verified German opportunities — with a human (initially: you) reviewing everything before it reaches a user or an employer.

Long-term direction: become a verified-candidate pipeline for German employers/training providers (B2B recruiting model), not just a consumer tool.

---

## 2. Target market & sequencing

**Start with Egypt only, not the whole Middle East.** Reasons:
- Egyptian degrees/certificates are well-documented in Germany's credential-recognition system (anabin database) — lower verification complexity than a country with disrupted institutions.
- Stable, functioning education system — cleaner source data for the AI pipeline.
- Existing migration corridor already (Egyptian doctors, nurses, engineers already move to Germany).
- Large population, strong existing intent (many already study German locally — see §9 Marketing).
- Notably **lower fraud/verification risk than Syria**, where document fraud rings and war-disrupted institutions make credential verification genuinely harder — counterintuitively, Egypt is an easier and safer starting point than your own community.

Expand to Syria/Jordan/Iraq/Lebanon/Tunisia/Morocco (and more MENA countries over time) only after the credential-parsing and matching pipeline is proven on Egypt's cleaner data — see `Matching-Algorithm-Study.md` §8 for why the opportunity-data schema is being kept source- and country-agnostic from the start specifically so this expansion doesn't require reworking the core matching schema later.

**Sector focus: superseded by broader occupation research.** The original plan was to narrow the MVP to 1–2 sectors (e.g. healthcare and IT). After the market-research pass, the assessment's occupation field instead covers 110 real occupations across 17 categories — deliberately **not** led by IT or medicine, per direct instruction — including skilled trades, hospitality, logistics, construction, and education, which the research showed have equal or greater real demand. Shortage-occupation status is now tracked per-occupation (`frontend/src/lib/occupation-demand.ts`) rather than by picking 1–2 sectors upfront.

---

## 3. Legal scope — where the line is

Germany's *Rechtsdienstleistungsgesetz* (RDG) restricts who may give legal advice on immigration matters (visas, residence permits, entry/work authorization) to licensed lawyers and specific chambers. Violations carry fines up to €50,000 (enforcement tightened as of 2025).

**The line is substance, not labeling** — calling something "advice" instead of "legal advice" changes nothing.

- ✅ **In scope, not legal advice:** matching people to study/Ausbildung programs, helping them prepare and submit applications, explaining a program's stated requirements. This is the normal, established "education agent" business model.
- ❌ **Out of scope, is legal advice:** telling someone they qualify for a visa, explaining residence-permit conditions, any assessment of individual immigration/legal status.
- Any user question that drifts into visa/residence-permit territory gets a hard stop + referral to a licensed immigration lawyer. Get a lawyer relationship (referral partner or one-off consult) in place **before launch**, not after.

**Wording discipline for the automated verdict (§4) matters specifically:** frame every output as *program/opportunity fit* ("how your profile compares to typical requirements"), never as an *immigration outcome* ("your chance to travel to / enter Germany"). Keep results **qualitative** (e.g. three outcome buckets), not a manufactured numeric "match score" — a fake-precision percentage reads as an outcome claim you can't actually guarantee.

**Applying on a user's behalf** (once the product gets there) is normal for education agents but makes you a legal agent under a power of attorney (Vollmacht) — you become liable for errors (missed deadlines, wrong documents). Needs clear contracts, liability caps in your Terms of Service, and is part of why the company should be a liability-limited entity (see §6).

**Terms of Service — don't self-draft a blanket liability shield.** German consumer-protection law (§309 BGB) voids broad liability exclusions against private consumers in standard terms — a DIY "not responsible for anything" clause is partly unenforceable *and* reads exactly like the fine-print scam agencies use. The version that actually protects you is **narrow scope language**: informational program-matching only, not legal/immigration advice, no outcome guaranteed. More defensible and more trust-building than a blanket disclaimer. Draft this with the lawyer from Phase 0, not solo.

### Two overlapping legal regimes — not just German law

**GDPR applies because of where *you* are established, not where your users are.** Its territorial scope (Article 3(1)) covers all processing "in the context of the activities of an establishment... in the Union, regardless of whether the processing itself takes place in the Union or not." Since the company is German, GDPR applies to all your processing — this is *not* affected by your users being Egyptian, non-EU, or physically outside Europe. Their nationality/location isn't part of the test that governs you.

**Separately — and specifically because your users are Egyptian — Egypt has its own data protection law.** The *Personal Data Protection Law* (Law 151/2020), with Executive Regulations now finalized and a Personal Data Protection Center (PDPC) enforcing it, regulates transferring an Egyptian data subject's personal data **outside Egypt**: it requires either a PDPC license, or an accepted basis (destination-country adequacy, **specific consent to the transfer**, or contractual necessity). Full enforcement is expected **31 October 2026**. Penalties: EGP 100,000–5,000,000 fines, criminal imprisonment for unlicensed transfers.

This is triggered by the product's basic mechanics (an Egyptian user's email/documents leaving their browser and landing on a German server), not an edge case — and it can't be solved by hosting choice alone (see §7). The likely fix is the same instinct already planned for GDPR: **specific, explicit consent that names the international transfer**, not a generic ToS checkbox — but this needs confirmation from someone who actually knows Egyptian law, not an assumption. **Egypt's PDPL needs to be an explicit line item in the Phase 0 legal consultation**, alongside German RDG/GDPR, given the imminent enforcement date and criminal exposure.

---

## 4. The user funnel — two tiers of trust

Core design principle: most users will "dip a foot in the water" before committing anything sensitive. Don't ask for signup or documents until they've already received free value. This also happens to be the opposite of how the scam agencies in this space operate (upfront fees/documents from strangers), which is itself the differentiator.

**Revised 2026-08-06** to add a requirements-based eligibility check (grounded in real official German admission/visa criteria, not just internal scoring — see `Matching-Algorithm-Study.md` §7) and a staged reveal of real opportunity matches, sitting between the existing Tier 1 verdict and the Tier 2 document-verification step. Still framed as "no signup, no documents" through the eligibility check and count reveal — signup is the new boundary, introduced one step later than before, not at the very start.

### Tier 1 — No signup, no documents

1. Wizard answers are saved to **`localStorage` only**. Nothing leaves the browser at this stage — no server processing occurs, so neither GDPR nor Egypt's PDPL cross-border rules are triggered yet. This is also the reason it's safe to defer Phase 0's legal/company-formation work while building and demoing this specific piece (see §11) — that changes the moment real personal data starts leaving the browser, at step 4 below.
2. A **rules-engine algorithm** (not AI — see §8) reads the saved answers and produces a quick result, shown visually (a simple profile-summary chart, not a manufactured numeric "match score"), at `/assessment/result`. **Implemented and wired up** (`frontend/src/lib/assessment-verdict.ts`, design/research in `Matching-Algorithm-Study.md`). It scores the profile against all three paths (University/Ausbildung/Employment) and compares against the user's stated choice, producing one of:
   - Confirmation that the stated path is a strong fit.
   - A different, specific path suggested instead, when the profile is clearly stronger there.
   - **Unclear — worth a closer personal look.** (Absorbs ambiguous cases instead of forcing a premature "no" from thin, self-reported data — a wrong confident negative here is a real reputational risk.)
   - Wording stays in "program fit" territory per §3, never "chance to travel/enter Germany."
   The result page also shows real, algorithm-derived advice on the single weakest part of the profile, and a general (not personalized) document checklist.
3. **Requirements-based eligibility check** (built 2026-08-06, `frontend/src/lib/eligibility-check.ts` + `EligibilityChecklist.tsx`, design in `Matching-Algorithm-Study.md` §7): alongside the fit score, check the same self-reported answers against the *real* official requirements researched there (education pathway, language level, financial proof) for the user's likely path. Every requirement is classified as either **fixed** (e.g. University needs Studienkolleg or prior university study for a Thanaweya-Amma-only profile — a real extra step, not a quick fix) or **addressable** (e.g. language level, financial proof, or — for Ausbildung — an employer offer itself, all closeable on a realistic timeline). A missing *addressable* requirement is shown as a concrete to-do, never a rejection; a missing *fixed* one is explained as an extra step, still not a flat "no." This directly replaces a blanket "any missing requirement = ineligible" rule, which would incorrectly turn away the platform's most common real user (high-school-only, weak/no German, modest savings — see `Matching-Algorithm-Study.md` §7 for why).
4. **Real opportunity count, no details — built 2026-08-10.** A live **count** of matching `Opportunity` rows from the Phase 2 database (`backend/Models/Opportunity.cs`) — no names, no institutions, no details. `POST /opportunity-counts` (public, rate-limited, no admin key) runs `MatchingService.Match()` against `Approved` opportunities using the same `ProfileSnapshot` already captured for email; `OpportunityCounts.tsx` on the result page replaced the old placeholder mock (`PlaceholderOpportunityCounts.tsx`, deleted). Carries the "self-reported, not yet verified" disclaimer called for below.
5. To receive the **full explanation by email**, the user provides an email address. Keep this **email-only** — no password, no full account system. This is the first point real personal data leaves the browser, and the natural point at which a minimal backend capture becomes necessary (a bare `localStorage`-only version can't actually deliver this).
6. Once the user provides their email, create the `Users` record with **minimal data** — just the email, plus the Tier 1 answers for continuity (**built** — see `CLAUDE.md`). This reduces risk and the scope of what needs disclosing, but doesn't eliminate legal obligations outright: an email address is still personal data. At this exact point, add a short, honest **privacy notice** next to the field (what's collected, why, how long it's kept, that deletion can be requested) — light enough not to need the Phase 0 lawyer for this specific piece, but it should exist before this ships to real users.

### The signup boundary — see real matches, still free

**Built 2026-08-12** (`frontend/src/components/assessment/SignupPrompt.tsx`, `/auth/verify`, `/matches`, full backend in `CLAUDE.md`'s "Account signup" section). To see the *actual* matched opportunities (not just the count from step 4), the user creates a real free account — email-only, magic-link, no password. Still free, still no documents. Of the two things this section called for shipping together:
- **The disclaimer — done.** `/matches` shows an explicit "matched against your self-reported answers — not yet verified by us" line next to the match list, same wording discipline as §3.
- **The willingness-to-pay ask for the next tier (§5) — still not built.** This section originally called for both to ship together; only the disclaimer did. Worth returning to as its own next step, not silently dropped.

### Tier 2 — Document verification (paid)

1. User submits certificates/paperwork for deeper analysis — **framed as a paid service** (revised 2026-08-06; previously scoped as a free review followed by a willingness-to-pay question). Build order stays as originally planned regardless: ship the paid *offer*/interest-capture first, build real payment processing only once that signal is real (§5) — the "paid" framing is a product decision now, not yet a payment-infrastructure build item.
2. **Consent must be specific, not folded into a generic ToS checkbox** — and per §3, it should explicitly name the *international transfer* of the data (covers both the GDPR and Egypt PDPL consent bases at once, pending lawyer/Egypt-law confirmation of wording).
3. All case data (documents, extracted profile) stored in the database (Frankfurt/EU — see §7).
4. AI studies the case and produces a **summary for you to review** — not sent directly to the user.
5. **You give the user the final answer**, combining the AI's analysis and your own judgment — this human sign-off is the trust differentiator versus AI-only competitors (GoAusbildung, TalentSure); make it visible in the product copy ("a real person reviews every case"), not just an internal process. This produces a materially more accurate verdict than the self-report-only match list from the signup step above — worth stating to the user as the actual value of paying for this tier.
6. **If they decline:** delete their case data (documents, AI summary) but keep the account, and tell them. Genuinely good practice — deleting sensitive data once its purpose has concluded matches GDPR's data-minimization principle, and it's a strong, honest trust signal worth stating as policy. Frame it to the user as a **proactive privacy commitment** ("we don't hold onto documents once a case is closed"), not defensive "for our legal protection" language — same action, better trust framing. Longer-term (not blocking now): also offer a general delete-on-request path, since this right shouldn't only be available when someone declines to pay.
7. **If they want to move forward: applying on their behalf is a separate, later, paid tier — still deferred until company formation (Phase 0) is real**, unchanged from the existing decision (§3, §11) — acting on someone's behalf creates real Vollmacht liability. This plan describes it as the eventual next step in the pipeline, not something to build now.

---

## 5. Business model

Avoid the failure mode of "recurring subscription with a vague eventual payoff charged to cash-constrained users" — structurally identical to how the scam agencies in this space already operate, and your target users have been burned by exactly that pattern (real cases found: €1,500–9,000 fake job-contract fees, €6,000 fake exam-result schemes, a Syrian document-fraud ring raided across 50+ sites). Radical transparency and fair pricing are your actual differentiation.

**Phased revenue model** (revised 2026-08-06 — Tier 2 is now planned as paid from the start, not free-then-ask; see §4):
1. **Free through the signup step** — assessment, eligibility check, real opportunity *count* (no details), and the account itself all stay free. Builds trust, builds your candidate/data pipeline, generates case studies, validates match quality (Phase 1 of the roadmap, §11) before anyone is asked to pay.
2. **Paid Tier 2 — document verification.** A one-time fee tied to real work delivered (not an open-ended monthly charge) for AI + human review of submitted documents, producing a materially more accurate match verdict than the self-report-only version. Build order: ship the offer/interest-capture first (no real payment processing) to validate willingness-to-pay before building actual billing — the ask itself is the demand signal, same principle as before, now attached to a concrete tier instead of a vague "would you pay for more help" question. Price-test around the ~$20 range discussed, as a bounded package, not an indefinite subscription.
3. **Paid Tier 3 — applying on the user's behalf.** A separate, later paid service once Tier 2 validates — still gated on Phase 0 (company formation), unchanged from the existing decision (§3, §4, §11), since acting on someone's behalf creates real Vollmacht liability.
4. **B2B verified-candidate placements (the real long-term engine)** — German employers/training providers pay for a pre-vetted, tested candidate pipeline. This is how comparable platforms actually make money, and it avoids charging the people least able to pay. Test manually (§11 Phase 2) well before building automated tooling for it.

---

## 6. Company structure

- **UG (haftungsbeschränkt)**, not GmbH — GmbH needs €25,000 share capital, off the table at this budget.
- Use the **Musterprotokoll** (standard articles), not custom articles — much cheaper notary fee.
- Formation cost: realistically **€500–1,500** total (notary + €225 commercial register fee + share capital deposit, recommend depositing €500–2,000 rather than the symbolic €1 minimum).
- Ongoing fixed cost: **€1,250–2,000/year** (~€100–170/month) for basic accounting, tax filing, IHK membership — permanent line item in the monthly budget.
- Liability-limited structure matters specifically because of the "applying on behalf of users" risk in §3.

---

## 7. Data & hosting

- **Host in the EU.** GDPR's territorial scope (Article 3(1)) applies based on where the company is *established*, not where servers are — since the company is German, GDPR applies to all processing regardless of hosting location.
- **Fixed:** the project's Neon Postgres database was initially created in AWS `us-east-1` (Virginia, USA) by mistake — corrected to the **Frankfurt region (`eu-central-1`)**. Only a placeholder table existed at the time, so nothing needed migrating.
- **Hosting Egyptian users' data only in Egypt does not solve the cross-border problem either — it moves it.** It might satisfy Egypt's PDPL preference for keeping data in-country, but it does *not* reduce GDPR obligations at all (still fully bound as the EU-established controller), and it likely creates the mirror-image GDPR problem instead (Egypt has no EU adequacy decision, so hosting EU-controlled data there would itself need Standard Contractual Clauses + a transfer impact assessment). The cross-border relationship is **structural** — the controller is in Germany, the users are in Egypt — not something a server location can route around. On top of that, the AI-analysis step (sending certificate data to an LLM API) and the founder's own case review are themselves cross-border data flows regardless of where the primary database sits. The actual lever is the **legal basis for the transfer** (specific, explicit consent naming the international transfer, per §3/§4), not geography.
- **Tier 2 document uploads specifically need their own GDPR + Egypt PDPL consent flow** (§4) — this is where the sensitivity is concentrated, not the Tier 1 self-reported answers or the Tier 1 email capture (which needs a lighter privacy notice, not a full consent flow).
- Practical hosting choice: cheap EU hosting (e.g. Hetzner) is fine at this stage — no need for enterprise infrastructure.

---

## 8. Product architecture (technical recap)

Full technical/architecture notes live in the repo's `CLAUDE.md`. Summary for planning purposes — this is one pipeline, not three separate "AIs":

1. **Document extraction** (Tier 2) — LLM-vision/OCR turns certificates/CVs into a structured profile. Hard part is multilingual, inconsistent source documents, not the AI itself.
2. **Opportunities database** — curated, not scraped, and **University/Ausbildung only for now** — employment/job matching is explicitly excluded (real-time job-posting data is a harder, less stable data problem than semester-based program data; revisit later). **Schema and admin review flow are built** (`backend/Models/Opportunity.cs`, `/admin/opportunities`, see `CLAUDE.md`), seeded with 10 obviously-fake entries for the blueprint pass — reverted from `Approved` to `Denied` on 2026-08-10 once `/opportunity-counts` went live to real visitors, so no fake row is ever counted. Data sources:
   - **Ausbildung — real sync built and verified live (2026-08-09).** The Bundesagentur für Arbeit's "Jobsuche" API, filtered to `angebotsart=4` (apprenticeships/dual study) — there is no separate "Ausbildungssuche" API, it's the same endpoint. **Correction to the 2026-07-31 research below: the working search endpoint is `pc/v6/jobs`, not `v4`** — confirmed live, v4 search now 403s. This is **not an official/published API** — the Bundesagentur has not released one; this is a community-documented interface to the same backend the public Jobbörse site uses (see `bundesAPI/jobsuche-api` on GitHub), with no formal ToS or rate limits stated. Free and usable now, but treat as prototype-grade — reliability/legal footing should be revisited before depending on it at real production scale. `backend/Services/OpportunitySyncService.cs`, manually triggered (`POST /admin/opportunities/sync-ausbildung`), deduped on the API's own reference number, synced rows land `Pending` and go through the same admin review as everything else. The API's own occupation field is free-text German, not NOVIRA's taxonomy — `OccupationFieldMapper.cs` does best-effort keyword matching (25/25 mapped on the live test batch after two real gaps were found and fixed against actual API responses), leaving `OccupationField` null on a genuine miss rather than guessing, since `MatchingService`'s hard filter treats null as "not specified" rather than silently wrong.
   - **University — first real batch hand-curated (2026-08-12).** No self-serve API exists. Hochschulkompass (HRK's official database, ~19,000 programs, university-authorised data) only offers data access by becoming a "collaborative partner" — requires direct outreach to HRK, cost/format/timeline unconfirmed, still a business action item not started. DAAD's "International Programmes in Germany" database also has no public API. The interim hand-curation plan needed a real mechanism first — `POST /admin/opportunities` (generic create endpoint, `Source`/`Status` forced server-side to `Manual`/`Pending`) plus a real "+ Add opportunity manually" admin form, both built alongside this batch, see `CLAUDE.md`. **6 real programs entered**, each sourced from the institution's own official page: nursing (Deggendorf Institute of Technology, Protestant University of Applied Sciences Berlin), computer science (RWTH Aachen B.Sc., University of Passau M.Sc.), mechanical engineering (TU Hamburg/TUHH), international business (OTH Amberg-Weiden) — fields chosen to match what's already dominant in the real Ausbildung data. Landed `Pending`, not pre-approved — same review gate as everything else, verified working end to end (real fit factors, correct "Strong fit" label) then reverted before handoff so the founder makes the actual call.
   - Target: 20–50 real, verified opportunities is enough to start (Ausbildung side already there and growing with each sync/review pass; University now has its first 6, pending founder review). Data gathering + human review cadence: roughly once a day or less — program-level data doesn't change often, so the actual effort is building an accurate first dataset, not the refresh frequency.
3. **Matching/ranking — built (2026-08-06), ahead of both real data sourcing and document upload as planned; now also user-facing (2026-08-10) via the real opportunity count above.** `backend/Services/MatchingService.cs`, rule-based (hard filters: occupation, education minimum, expired deadlines; soft-scored: language level via the cross-scale ordinal, certified proof, compensation/tuition vs `financialSituation`) — no LLM yet, that's still the plan for fuzzy explanation/summarization once this rule-based shape is proven further. Every factor traces back to a real `Opportunity` field, never a free-floating claim, same anti-fabrication discipline as `OpportunityCounts.tsx` and `occupation-demand.ts`. Proven against the existing fake `Opportunity` data and 3 synthetic `Users` profiles before any real data sourcing started — confirmed the schema (§8 above) is sufficient, and surfaced one real bug in the process (the seeder's hardcoded dates going stale relative to "now" — fixed).
4. **Human-in-the-loop on individual cases** — deferred, not immediate. Given solo-founder capacity, the near-term build is AI-heavy with no per-case human review; human sign-off on individual matches/case summaries gets added **closer to actual production**, not now. This is a resourcing decision, tracked here so it isn't confused with the opportunities-database curation above (which does need a human on a daily-ish cadence — that's data maintenance, not case review).

**User-data model: four levels, built one at a time, not designed upfront (decided 2026-07-31).** The long-term vision is (1) Tier 1 self-report, no verification — built; (2) user registers and submits documents (certificates, passport, photo), AI studies/verifies them; (3) a human reviews the documents + AI analysis and gives final judgment; (4) further out, an AI interview then human interview, replacing or supplementing the document flow. Deliberate choice **not** to design the schema for levels 2–4 now, even though the shape is already known in outline:
- Levels 2 and 3's actual data shape depends on decisions not yet made (what AI document verification technically outputs — a score? per-field confidence? pass/fail? — and what a human reviewer needs to see, which follows from that). Designing the schema before building the thing that would answer these questions is exactly the mistake almost made with `Opportunity.CostNotes` (see the matching-fields entry above) — caught and fixed once at small scale in that case; guessing wrong across three unbuilt levels would be the same mistake at much larger cost.
- Level 4 (AI interview) is an entirely different interaction pattern (conversational, not form/document-based) — "way in the future" by design, essentially certain that anything modeled today would be discarded.
- Migrations are cheap right now (a handful of fake/test rows, EF Core, no production data) — the cost of "design it when you build it" is close to zero today and rises sharply once real user data exists, which is itself an argument for designing well *then*, not guessing broadly *now*.
- One piece of free, cheap forward-compatibility taken now regardless: when Level 2 arrives, documents should be modeled as their own table (`UserDocuments`, one user → many documents, each with its own type/status) rather than columns bolted onto `Users` — costs nothing today, keeps Level 2 from requiring a `Users` rework. **Built exactly this way, 2026-08-15** — see CLAUDE.md's "Document verification pipeline" section. Levels 2 and 3 both actually got built in that pass (AI verification + human review UI), not designed-then-shelved — but scoped strictly to synthetic/the founder's own test documents, per §11's still-standing Phase 0 gate on real user submissions.

**Current build status vs. the funnel (§4):**
- Tier 1 intake ≈ already built (assessment wizard: `frontend/src/components/assessment/`, schema in `frontend/src/types/assessment.ts`, now 14 questions including a searchable 110-occupation field and a multi-select Germany-connection question).
- Tier 1 verdict **built, tested, and wired up end to end** — completing the wizard now lands on a real result page (`frontend/src/app/assessment/result/`) showing the verdict, a fit-comparison chart, improvement advice, and a document checklist. See `Matching-Algorithm-Study.md`.
- Tier 1 **fully complete**: email capture (`SaveResultPrompt.tsx` → `POST /leads`, branded Resend email), privacy notice, and `Users` row creation are all built and verified end to end — the `Users` row also now carries the Tier 1 profile snapshot (Level 1 of the user-data model above), self-reported and unverified.
- Requirements-based eligibility check **built** (`frontend/src/lib/eligibility-check.ts`, `EligibilityChecklist.tsx`) — see §4 step 3 and `Matching-Algorithm-Study.md` §7.
- Phase 2 opportunities database + admin review, and matching/ranking logic, both **built and proven against fake seed data + synthetic profiles** (item 3 above), and **now wired into the user-facing result page** as both the real opportunity count (§4 step 4 above) and, since signup exists, full real match details behind it (`GET /matches`) — `/admin/match-preview` remains the separate internal admin-key-protected test harness. Real data sourcing (Ausbildung API done, hand-curated university list still pending) is the next unblocked step.
- **Free account signup — built 2026-08-12**, closing the gap this section used to call "missing for Tier 2." Email-only magic-link auth (no password), see CLAUDE.md's "Account signup" section for the full design. This specifically unblocks the "see real matches" boundary above — it does *not* touch document upload/consent, which is still correctly out of scope pending Phase 0 (see §11 Phase 2).
- **Document upload + AI extraction — built and verified end-to-end 2026-08-15** (`backend/Services/DocumentVerificationService.cs`, `backend/Endpoints/DocumentsEndpoints.cs`/`DocumentsAdminEndpoints.cs`, `/documents` + `/admin/users/profiles`), against synthetic/the founder's own documents only — see CLAUDE.md's "Document verification pipeline" section for the full design and the real test results (it correctly caught a document-type mismatch and, on a real passport, expiry + a likely internet-sourced watermark). The human-review half (Approve/Deny/FlagRed) is built but not yet exercised live. Still genuinely missing for Tier 2, unchanged: the specific document-consent flow (naming the international transfer) needed before this opens to real user submissions — see §11 Phase 2.
- Backend: ASP.NET with `User`/`Opportunity`/`MagicLinkToken`/`Session`/`UserDocument` models, `Services/MatchingService.cs`/`TokenGenerator.cs`/`AzureBlobStorageService.cs`/`DocumentVerificationService.cs`/`ResendEmailService.cs`, Postgres (**Azure Database for PostgreSQL, migrated from Neon 2026-08-15 — currently West US, not EU**, see CLAUDE.md's Pre-deployment blockers for why and the fix path; this also revises risk #5 below) — `POST /leads`, `/admin/opportunities` (GET/PATCH), `/admin/match-preview` (POST), `POST /opportunity-counts` (public, rate-limited), the `/auth/*` + `GET /matches` endpoints (magic-link auth), and `GET/POST /documents` + the `/admin/users*` review endpoints (document pipeline) are real, working endpoints (`backend/Program.cs`, `backend/Endpoints/`, `backend/Services/`).

**Tier 1 verdict: rules engine, not AI.** The verdict is a deterministic rules/scoring engine, not an LLM call — see `Matching-Algorithm-Study.md` for the full research and design (real German university/Ausbildung/employment admission criteria, the draft scoring weights, and open tuning questions like the known overqualification-scoring gap). Recap of why this matters:
- Zero marginal cost, no latency, no API dependency.
- Fully explainable — you can point to exactly why a verdict was given, which is *safer* than an LLM output here, not just cheaper — no hallucination risk on a legally-sensitive verdict.
- The free-text "additional notes" question is **deferred to Tier 2 intake**, not collected in the Tier 1 wizard — keeps the free assessment strictly closed-set/quick, and avoids storing open-ended text before there's a human reviewer (Tier 2) on the other end to actually read it. When Tier 2 intake is built, capture it there, don't feed it into the automated verdict, and surface it only to the human reviewer. Add a light LLM pass on it later only if real data shows the rules-engine verdict is missing signal the free text would have caught — at this volume such a pass would be trivially cheap (fractions of a cent per submission) if/when it's needed, so the reason to defer it is lack of evidence of need, not cost.
- This entire step runs **client-side** (a pure function reading the `localStorage`-saved answers) — no backend call needed for Tier 1's algorithm itself, only for the email-capture step that follows it.

**Frontend rendering & hosting.** Keep the current hybrid: Server Components statically generated (SSG) for marketing/content pages, client components (`'use client'`) for the stateful, interactive assessment wizard — already the architecture in place, no change needed.
- Don't move to a fully static export / pure-CSR site — would lose Next.js's per-page Metadata API (server-rendered Open Graph tags), which the SEO and Facebook-sharing marketing channels in §9 depend on for link previews and indexing.
- The actual cost lever is hosting choice, not the SSR/CSR split: deploy the frontend on Vercel's free hobby tier rather than a paid VPS.

---

## 9. Marketing & user acquisition plan

**Key constraint to plan around:** you have no existing audience in Egypt. Your current trust and network (WBS coding school students) are software-engineering learners already living in Germany — a different population from the target users. In Egypt, you are starting from zero, and paid marketing budget is effectively zero too. The plan has to be organic, public, and patient — sweat equity, not ad spend.

**The reframe:** being unknown is not purely a disadvantage. The scam agencies in this space hide behind vague branding and anonymity. Showing up consistently, in public, under your real name, answering real questions for free with no pitch — as a real, findable software engineering teacher based in Germany — is itself the trust signal that differentiates you. It just has to be earned over months, not bought.

### Channels, in priority order

1. **Facebook groups (primary channel).** Large, active groups already exist around "studying/Ausbildung in Germany" in Egypt. Join as a genuine expert, answer real questions for free with zero self-promotion for the first weeks/months. Only mention the product once you have a visible track record of helpful, non-spammy answers. Consider starting your own group/page later, positioned as a free community resource first.

2. **Short-form video in Arabic (TikTok / Instagram Reels / YouTube Shorts).** Uses a skill you already have (explaining things clearly as a teacher) for a new subject. Content ideas: "3 signs a Germany job agency is scamming you," "Is your Egyptian certificate actually recognized in Germany?", "What Ausbildung is really like," myth-busting — educational, not promotional.

3. **Target high-intent micro-communities directly**, rather than the broad public:
   - **German University in Cairo (GUC)** students — already self-selected as Germany-track.
   - **Goethe-Institut Cairo/Alexandria** German-language learners — actively signaling intent to go to Germany.
   - German-language departments at Ain Shams University, Cairo University, Al-Azhar.
   - Approach: offer a free workshop/webinar rather than an ad — uses your teaching skill directly, and these audiences convert far better than a cold general audience.

4. **SEO / Arabic-language content.** Direct, specific answers to the exact long-tail questions people already search. Slow and compounding, but free and durable.

5. **First-cohort flywheel.** Free Tier 1/Tier 2 users from Phase 1 (§11) become your first real case studies. Real, named success stories shared back into the Facebook groups and short-form video are far stronger proof than any claim you could make about yourself.

6. **Small paid test budget only after organic validates the message** — not on day one.

**Language decision:** build the product in English through development (faster iteration, no localization overhead while the funnel/schema/architecture are still changing week to week), then localize the UI to Arabic before actively directing marketing traffic to it. The Arabic-first content channels above (Facebook groups, short-form video) can start earlier than that, since early-stage community presence is you personally engaging, not the product itself — localization needs to land before Phase 2's marketing push actually sends people to the product (see §11).

### What to explicitly not do
- No broad paid ad campaigns on a near-zero budget — inefficient without proven messaging first.
- No buying "influencer" shoutouts from unverified pages in this space — an association with the wrong page damages trust instantly.
- No mass cold outreach/spam in Facebook groups — the fastest way to be lumped in with the agencies you're differentiating from.

---

## 10. Budget plan ($5,000 upfront + $500/month)

### Upfront $5,000
| Item | Estimate |
|---|---|
| UG formation (notary, register, share capital deposit) | $1,200–1,500 |
| Lawyer consultation (RDG scope, ToS, liability, Vollmacht question, Egypt PDPL) | $800–1,500 |
| Domain, minimal branding | $100–200 |
| LLM API testing/dev buffer | $300–500 |
| Contingency | remainder |

### Monthly $500
| Item | Estimate |
|---|---|
| UG ongoing compliance (accounting, tax, IHK) | ~$120–170 |
| EU hosting (lean, e.g. Hetzner) | ~$20–50 |
| LLM API usage (low volume) | ~$100–200 |
| Misc tools/SaaS | ~$20–30 |
| Buffer/contingency | remainder |

**No line item for paid marketing or salaries at this budget** — see §9 for the zero-budget marketing plan and §11 for why hiring waits.

---

## 11. Phased roadmap

### Phase 0 — Legal foundation (deferred until after the Tier 1 MVP exists — see note below)
- [ ] Register UG (Musterprotokoll)
- [ ] Lawyer consultation: lock down RDG-safe scope in writing (including verdict wording, §3), draft ToS/liability disclaimers with narrow-scope language, get a clear answer on the "applying on behalf of users" risk
- [ ] **Include Egypt's PDPL explicitly in scope** — cross-border transfer requirements, whether a PDPC license or consent-only basis is sufficient at your scale, given enforcement expected 31 October 2026 (§3)
- [ ] Domain + minimal branding
- [ ] Identify/secure a referral relationship with a licensed immigration lawyer for out-of-scope questions

*Note on sequencing:* building and demoing the `localStorage`-only Tier 1 flow (below) doesn't require any of this first — no server-side processing occurs, so there's no real legal exposure yet. The plan is to build that MVP first, use it to get concrete lawyer feedback (a working prototype beats a description), and complete Phase 0 before the email-capture step (Phase 1, item 3 below) ships to real users — that's the actual trigger point, not an arbitrary date.

**Status (2026-07-29): explicitly paused.** Still a mockup/prototype, not going to production — this phase's items stay tracked here as reminders but are not active work. Do not raise or push on this unprompted; resume once real launch is actually approaching.

### Phase 1 — Tier 1 funnel
- [x] Wizard answers saved to `localStorage` only (already built)
- [x] Build the rules-engine verdict algorithm (client-side, program-fit wording only) — `frontend/src/lib/assessment-verdict.ts`, weights approved for now per `Matching-Algorithm-Study.md`, tested against synthetic profiles
- [x] Wire `computeVerdict()` into the wizard and build the visual/qualitative result screen — `/assessment/result`, doubling as the wizard's completion screen (profile-summary style, no numeric match score)
- [x] Add email-only capture (no password/account) — built as a soft, skippable opt-in prompt (`SaveResultPrompt.tsx`), not a hard gate on the explanation; sends an actual branded result email via Resend
- [x] Add a short privacy notice at the email-capture point
- [x] Create the `Users` record only once a user provides their email — `POST /leads`, idempotent on normalized email. (Originally hosted on Neon in Frankfurt/EU; the database moved to Azure on 2026-08-15 and currently sits in West US, not the EU — see risk #5 under §12 and CLAUDE.md's Pre-deployment blockers.)
- [x] **Requirements-based eligibility check (built 2026-08-06)** — fixed-vs-addressable classification against real official requirements, design in `Matching-Algorithm-Study.md` §7.
- [x] **Real opportunity count, no details (built 2026-08-10)** — replaces the old `PlaceholderOpportunityCounts.tsx` mock number; `POST /opportunity-counts` → `MatchingService`, see §4 step 4 above.
- [x] **Signup/auth (built 2026-08-12)** — the boundary to see real match *details* (not just the count). Free, email-only magic-link auth, no password — see CLAUDE.md's "Account signup" section. Ships with the explicit "self-reported, unverified" disclaimer next to the match list. The willingness-to-pay ask this section originally paired with signup is still not built — see the funnel section above.
- [ ] Begin Facebook-group presence (§9) — answering for free, no pitch yet
- [ ] Stay free — goal is validating match quality and collecting real outcome data, not revenue
- [ ] Localize UI to Arabic before Phase 2's marketing push starts sending traffic to the product (built English-first for faster iteration during development)

### Phase 2 — Documents, AI review, monetization checkpoint

**Resequenced (2026-07-31): split into a part that doesn't touch real user data (safe to build now, not gated on Phase 0) and a part that does (stays gated).** The opportunities database involves no personal data at all — it's public information about German institutions/programs — so building it doesn't trigger the GDPR/PDPL exposure described in §3/§7. Document upload from actual users is where that exposure starts, so that part still waits.

**Active now — opportunities data + matching pipeline (no real user data involved):**
- [x] `Opportunity` schema + admin approve/deny review flow built, seeded with 10 obviously-fake entries (`[FAKE]`-prefixed) to validate the flow before real data sourcing — see `CLAUDE.md` for the endpoint/file details.
- [x] **Matching/ranking layer built and proven against the fake data + 3 synthetic user profiles** (rule-based, no LLM explanation yet — §8) — schema confirmed sufficient before real data sourcing started, per the original sequencing plan.
- [x] **Real Ausbildung data — built and verified live (2026-08-09)**, see §8 for the endpoint correction (v6, not v4) and the occupation-mapping approach.
- [ ] **Next:** university data — hand-curate a starter set, see §8. Jobs/employment stays explicitly excluded.
- [ ] Deliverable for this phase: a more in-depth case study than Tier 1's rules-engine verdict, plus a short list of real, specific matching organizations (Ausbildung providers/universities) in Germany for that case — not just a qualitative fit bucket.
- [ ] AI-heavy, no per-case human review yet (§8) — human-in-the-loop on individual cases is a later addition, closer to production, not a blocker for building this now.

**Still gated on Phase 0 (real user documents, real consent, real liability):**
- [~] Document upload + AI extraction + human review pipeline **built 2026-08-15** and being tested against synthetic/the founder's own documents (see the item under "Current build status vs. the funnel" above and CLAUDE.md's "Document verification pipeline" section) — this is exactly the "build/test against synthetic data in the meantime" carve-out this bullet always allowed, not a change to the gate itself. Still unchecked because the actual gated deliverable — the specific consent flow (separate from general ToS, explicitly naming the international transfer) required before **real user** submissions can be accepted — doesn't exist yet.
- [ ] Document set to request, once this opens: passport copy, language certificate/level, CV, rough proof of financial situation, plus path-specific: prior degree/transcripts + translation (university), secondary certificate + translation (Ausbildung). Deliberately scoped to what a case-assessment step needs, not a full visa-application dossier (which includes things like a signed training contract or job offer that only exist *after* a match is made) — see the document-requirements research this decision is based on (Ausbildung visa checklist, uni-assist/DAAD, skilled-worker visa checklist).
- [ ] Build document extraction (AI reads certificates) and produce a case summary **for your review**, not sent directly to the user — once human-in-the-loop is actually staffed (see §8).
- [ ] You give the user the final answer, combining AI + your judgment.
- [ ] Applying on a user's behalf (Tier 3), and generating resumes/cover letters — explicitly deferred until the company (Phase 0) is real; acting on someone's behalf creates Vollmacht liability (§3), so this isn't a "build it, gate it in the UI" situation like the rest of this list.
- [ ] **Revised (2026-08-06): document verification is now planned as paid from the start** (§4/§5), not free-then-ask — but build the paid *offer*/interest-capture first, real payment processing only once that signal is real. No payment system yet, just the ask.
- [ ] If declined: delete case data, keep the account, inform the user (framed as a proactive privacy commitment).
- [ ] If accepted and paid: proceed with the AI + human review described above.
- [ ] Start short-form video content (§9) using real (anonymized/consented) case studies from Phase 1.
- [ ] Manually pitch 2–3 German employers/training providers — vet and personally introduce 2–3 candidates by hand, no product automation yet.
- [ ] Approach GUC/Goethe-Institut communities with a free workshop.

### Phase 3 — Still under study
Paid professional-help path once a user agrees to pay. Not yet scoped — revisit once Phase 2 produces real signal.

### Phase 4 — Scale only once revenue funds it
- [ ] If subscription/application fees + first B2B placement fee cover run rate: consider a second country or sector
- [ ] Consider a part-time contractor to share human-in-the-loop review load (still not a full hire until justified)
- [ ] Begin semi-automating the opportunity-curation pipeline
- [ ] Only then consider building automated application-submission workflows — after the manual version has proven demand and the liability/insurance structure from Phase 0 is actually in place

---

## 12. Key risks recap

1. **Legal (RDG)** — the single biggest risk; mitigated by strict scope discipline, program-fit-only verdict wording, lawyer-drafted narrow-scope ToS, and a referral relationship for out-of-scope questions.
2. **Egypt's own data protection law (PDPL)** — a separate regime from GDPR, triggered by transferring Egyptian users' data outside Egypt, which the AI-analysis step and the founder's own remote case review both do regardless of hosting region; mitigated by including it explicitly in the Phase 0 legal consultation and by consent language that names the international transfer, ahead of the 31 October 2026 enforcement deadline.
3. **Trust deficit** — target users are an active fraud target in this exact space; mitigated by free-first Tier 1, transparent pricing, visible human review, real identity.
4. **AI reliability** — hallucinated matches or overconfident negative verdicts on high-stakes decisions; mitigated by the three-outcome verdict framing (no hard "no"), human-in-the-loop sign-off, and requiring every AI claim to trace to a real source.
5. **Data sensitivity/GDPR** — the intended mitigation is EU hosting plus a distinct, explicit consent flow specifically for Tier 2 document uploads and Tier 1 email capture; **the hosting half is currently NOT true** — the Postgres database moved to Azure on 2026-08-15 and landed in West US, not the EU, because every EU region rejected provisioning on the free-trial subscription used (see CLAUDE.md's Pre-deployment blockers). Acceptable while every real row in it is still synthetic/founder's-own test data, but this must move to an EU/EEA region before real user data — profiles or documents — lands in it, tracked as a pre-deployment blocker, not assumed fixed.
6. **Solo-founder capacity** — mitigated by deliberately narrow scope (one country, one-two sectors, no automation of the hardest pieces) until revenue justifies expansion.
7. **No existing audience in the target market** — mitigated by the organic, patient marketing plan in §9, leaning on teaching skills rather than budget.
8. **Lead loss at Tier 1** — mitigated by gating the full explanation behind an email address rather than relying on `localStorage` alone.

---

## 13. Open decisions for later

- Exact pricing for the paid application-support package once Phase 1/2 data exists.
- Which specific lawyer/firm for the Phase 0 consultation — ideally one who can also speak to (or refer for) Egypt's PDPL, not just German law.
- Whether a formal Egyptian PDPC license is actually required at your expected scale, or whether specific consent is a sufficient basis on its own.
- Timing and terms for the first manual B2B employer pilot in Phase 2.
- Ausbildung scoring doesn't yet discount overqualified profiles (someone with a degree and 5+ years' experience can still score "strong" for Ausbildung) — flagged as a tuning candidate in `Matching-Algorithm-Study.md`, not urgent for MVP.
- Whether to eventually replace the static shortage-occupation tagging (`frontend/src/lib/occupation-demand.ts`) with the planned AI-assisted pipeline that checks official sources on a rolling basis — deliberately deferred, not scoped yet.
- Whether to actually pursue Hochschulkompass/HRK "collaborative partner" status for official university program data (§8) — outreach not yet started; until/unless it happens, university data stays hand-curated.
- The Bundesagentur für Arbeit "Jobsuche" API used for Ausbildung data (§8) is unofficial/community-documented, not government-published — worth a periodic gut-check that it still works and hasn't been superseded by something official, especially before leaning on it at real scale.
