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

Expand to Syria/Jordan/Iraq/Lebanon only after the credential-parsing and matching pipeline is proven on Egypt's cleaner data.

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

### Tier 1 — No signup, no documents

1. Wizard answers are saved to **`localStorage` only**. Nothing leaves the browser at this stage — no server processing occurs, so neither GDPR nor Egypt's PDPL cross-border rules are triggered yet. This is also the reason it's safe to defer Phase 0's legal/company-formation work while building and demoing this specific piece (see §11) — that changes the moment real personal data starts leaving the browser, at step 3 below.
2. A **rules-engine algorithm** (not AI — see §8) reads the saved answers and produces a quick result, shown visually (a simple profile-summary chart, not a manufactured numeric "match score"), at `/assessment/result`. **Implemented and wired up** (`frontend/src/lib/assessment-verdict.ts`, design/research in `Matching-Algorithm-Study.md`). It scores the profile against all three paths (University/Ausbildung/Employment) and compares against the user's stated choice, producing one of:
   - Confirmation that the stated path is a strong fit.
   - A different, specific path suggested instead, when the profile is clearly stronger there.
   - **Unclear — worth a closer personal look.** (Absorbs ambiguous cases instead of forcing a premature "no" from thin, self-reported data — a wrong confident negative here is a real reputational risk.)
   - Wording stays in "program fit" territory per §3, never "chance to travel/enter Germany."
   The result page also shows real, algorithm-derived advice on the single weakest part of the profile, a general (not personalized) document checklist, and — clearly marked as a mock preview, not real data — a placeholder count of matching opportunities, standing in for the real Phase 2 opportunities database.
3. To receive the **full explanation by email**, the user provides an email address. Keep this **email-only** — no password, no full account system. This is the first point real personal data leaves the browser, and the natural point at which a minimal backend capture becomes necessary (a bare `localStorage`-only version can't actually deliver this).
4. Once the user provides their email, create the Neon record with **minimal data** — just the email (plus maybe the Tier 1 answers for continuity). This reduces risk and the scope of what needs disclosing, but doesn't eliminate legal obligations outright: an email address is still personal data. At this exact point, add a short, honest **privacy notice** next to the field (what's collected, why, how long it's kept, that deletion can be requested) — light enough not to need the Phase 0 lawyer for this specific piece, but it should exist before this ships to real users.

### Tier 2 — Signup + credible documentation

1. User submits certificates/paperwork for deeper analysis. **Consent must be specific, not folded into a generic ToS checkbox** — and per §3, it should explicitly name the *international transfer* of the data (covers both the GDPR and Egypt PDPL consent bases at once, pending lawyer/Egypt-law confirmation of wording).
2. All case data (documents, extracted profile) stored in the database (Frankfurt/EU — see §7).
3. AI studies the case and produces a **summary for you to review** — not sent directly to the user.
4. **You give the user the final answer**, combining the AI's analysis and your own judgment — this human sign-off is the trust differentiator versus AI-only competitors (GoAusbildung, TalentSure); make it visible in the product copy ("a real person reviews every case"), not just an internal process.
5. **Monetization checkpoint:** ask directly whether the user would pay for more professional help. No payment system needed yet — the ask alone is the demand signal.
6. **If they decline:** delete their case data (documents, AI summary) but keep the account, and tell them. Genuinely good practice — deleting sensitive data once its purpose has concluded matches GDPR's data-minimization principle, and it's a strong, honest trust signal worth stating as policy. Frame it to the user as a **proactive privacy commitment** ("we don't hold onto documents once a case is closed"), not defensive "for our legal protection" language — same action, better trust framing. Longer-term (not blocking now): also offer a general delete-on-request path, since this right shouldn't only be available when someone declines to pay.
7. **If they agree to pay:** move to Phase 3 (still under study — not scoped yet).

---

## 5. Business model

Avoid the failure mode of "recurring subscription with a vague eventual payoff charged to cash-constrained users" — structurally identical to how the scam agencies in this space already operate, and your target users have been burned by exactly that pattern (real cases found: €1,500–9,000 fake job-contract fees, €6,000 fake exam-result schemes, a Syrian document-fraud ring raided across 50+ sites). Radical transparency and fair pricing are your actual differentiation.

**Phased revenue model:**
1. **Tier 1 + Tier 2, free** — builds trust, builds your candidate/data pipeline, generates case studies, validates match quality (Phase 1 of the roadmap, §11).
2. **Paid application support** — a one-time fee tied to real work delivered (not an open-ended monthly charge), only introduced once the willingness-to-pay checkpoint (§4) and free-tier match quality both look good. Price-test around the ~$20 range discussed, as a bounded package, not an indefinite subscription.
3. **B2B verified-candidate placements (the real long-term engine)** — German employers/training providers pay for a pre-vetted, tested candidate pipeline. This is how comparable platforms actually make money, and it avoids charging the people least able to pay. Test manually (§11 Phase 2) well before building automated tooling for it.

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
2. **Opportunities database** — curated, not scraped. Seed from the Bundesagentur für Arbeit's (unofficial but documented) Ausbildungssuche/Jobsuche API plus manual curation — 20–50 real, verified opportunities is enough to start. Treat as a data-maintenance problem.
3. **Matching/ranking** — starts rule-based (language level, credential-recognition status, budget) with an LLM only for fuzzy explanation/summarization. Every claim the AI makes should trace back to a real source (an actual posting, an actual university's stated requirement) — never a free-floating LLM claim, given the stakes for users.
4. **Human-in-the-loop** — every AI-generated match or application gets human sign-off before reaching a user or employer, at least until there's a track record to trust the automation's error rate.

**Current build status vs. the funnel (§4):**
- Tier 1 intake ≈ already built (assessment wizard: `frontend/src/components/assessment/`, schema in `frontend/src/types/assessment.ts`, now 14 questions including a searchable 110-occupation field and a multi-select Germany-connection question).
- Tier 1 verdict **built, tested, and wired up end to end** — completing the wizard now lands on a real result page (`frontend/src/app/assessment/result/`) showing the verdict, a fit-comparison chart, improvement advice, and a document checklist. See `Matching-Algorithm-Study.md`.
- Missing for Tier 1: email-only capture + privacy notice, and the real (non-mock) opportunities data behind the placeholder counts on the result page.
- Missing for Tier 2 entirely: signup/auth, specific document-consent flow (naming the international transfer), document upload + extraction, the curated opportunities database, matching logic.
- Backend: bare ASP.NET skeleton plus a `User` model and Postgres (Neon, **Frankfurt/EU region**) connection in place (`backend/Models/User.cs`, `backend/Data/AppDbContext.cs`) — no assessment/matching endpoints yet.

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

### Phase 1 — Tier 1 funnel
- [x] Wizard answers saved to `localStorage` only (already built)
- [x] Build the rules-engine verdict algorithm (client-side, program-fit wording only) — `frontend/src/lib/assessment-verdict.ts`, weights approved for now per `Matching-Algorithm-Study.md`, tested against synthetic profiles
- [x] Wire `computeVerdict()` into the wizard and build the visual/qualitative result screen — `/assessment/result`, doubling as the wizard's completion screen (profile-summary style, no numeric match score)
- [ ] Add email-only capture (no password/account) gating the full explanation, sent by email
- [ ] Add a short privacy notice at the email-capture point
- [ ] Create the Neon record (Frankfurt/EU) only once a user provides their email
- [ ] Begin Facebook-group presence (§9) — answering for free, no pitch yet
- [ ] Stay free — goal is validating match quality and collecting real outcome data, not revenue
- [ ] Localize UI to Arabic before Phase 2's marketing push starts sending traffic to the product (built English-first for faster iteration during development)

### Phase 2 — Documents, AI review, monetization checkpoint
- [ ] Build document upload + specific consent flow (separate from general ToS, explicitly naming the international transfer)
- [ ] Store opportunities data + case data in the database; seed opportunities from Bundesagentur Ausbildungssuche/Jobsuche API + manual curation (20–50 real entries, Egypt, drawing on whichever occupation categories real Tier 1 submissions cluster around — see §2)
- [ ] Build document extraction (AI reads certificates) and produce a case summary **for your review**, not sent directly to the user
- [ ] You give the user the final answer, combining AI + your judgment
- [ ] Add the in-product willingness-to-pay question — no payment system yet, just the ask
- [ ] If declined: delete case data, keep the account, inform the user (framed as a proactive privacy commitment)
- [ ] If accepted: move to Phase 3 (still under study)
- [ ] Start short-form video content (§9) using real (anonymized/consented) case studies from Phase 1
- [ ] Manually pitch 2–3 German employers/training providers — vet and personally introduce 2–3 candidates by hand, no product automation yet
- [ ] Approach GUC/Goethe-Institut communities with a free workshop

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
5. **Data sensitivity/GDPR** — mitigated by EU hosting (now corrected to Frankfurt) and a distinct, explicit consent flow specifically for Tier 2 document uploads and Tier 1 email capture.
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
