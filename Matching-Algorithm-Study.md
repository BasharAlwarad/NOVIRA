# NOVIRA — Matching Algorithm Study

Research and design document for the Tier 1 verdict algorithm (Plan.md §4/§8, CLAUDE.md "Current build phase"). Purpose: understand the real logic German institutions use to evaluate applicants *before* writing any code.

**Status: implemented and tested.** The draft design in §5 was approved and built — `frontend/src/lib/assessment-verdict.ts` (scoring engine) and `frontend/src/lib/occupation-demand.ts` (shortage-occupation tagging). Verified against synthetic profiles covering all four outcome kinds; see §6 for what's resolved, what's deliberately deferred, and one real limitation found during testing that still needs tuning.

**Guardrails carried over from Plan.md, non-negotiable:**
- This is a **rules engine, not AI** — deterministic, explainable, zero LLM calls.
- Output stays **qualitative** (three outcome buckets), never a numeric score or percentage shown to the user.
- Output frames everything as **program/opportunity fit**, never as an *immigration or visa outcome*. Facts like "you need a valid passport to travel" are fine (practical, not legal advice); anything like "you would/wouldn't get a visa" is not.
- Any internal scoring described below is **implementation detail only** — never exposed to the user as "your points" or similar, even loosely. That framing is reserved for Germany's own official systems (see §3), and presenting our own tally the same way would blur into the exact legal-advice line Plan.md §3 warns about.

---

## 1. Why this needs real research, not guesswork

The three pathways NOVIRA covers — university study, Ausbildung, and direct employment — are evaluated by completely different criteria in the real German system. A rules engine that treats them the same will give bad answers. Sections 2–3 cover what actually gates entry to each path; §4 covers the questions we already collect and what to add; §5 proposes draft decision logic; §6 lists what still needs your judgment before this becomes code.

---

## 2. Real-world criteria, per pathway

### 2.1 University / Studienkolleg path

- **Egypt's Thanaweya Amma (secondary school certificate) is only *partially* equivalent to the German Abitur** — it does not grant direct university entrance on its own. The standard route is either (a) one year of study at an accredited Egyptian university *plus* a Studienkolleg (a German foundation/prep-year program for international students), or (b) two full years at an Egyptian university, which can sometimes qualify for direct bachelor's admission.
- **Studienkolleg itself requires German at B1** to start, and tracks students into one of five course types matched to their intended field (T-Kurs: technical/science, W-Kurs: business/economics, M-Kurs: medicine/biology, G-Kurs: humanities, S-Kurs: languages) — ending in a *Feststellungsprüfung* (qualifying exam) that then grants university entry.
- **Egyptian applicants do not need an APS certificate** (the additional credential-verification step required for applicants from India, China, and Vietnam) — one less hurdle than those countries face.
- **uni-assist** evaluates foreign certificates and converts grades to the German 1.0–4.0 scale for admission purposes (already covered generally in Plan.md §2).
- Someone who **already holds a Bachelor's degree** applying for a Master's is a fundamentally easier case than a high-school-only applicant targeting a Bachelor's — the Studienkolleg detour mostly applies to the latter.
- **Financial proof**: the blocked-account requirement (~€11,904/year, already reflected in our `financialSituation` question) applies here specifically — this is a student-visa figure, not the same number that applies to skilled-worker routes (see 2.3).
- German-taught programs typically want DSH-2, TestDaF 4, or Goethe C1; English-taught master's programs want IELTS/TOEFL-equivalent English instead of German.

### 2.2 Ausbildung path

- **No fixed academic prerequisite** — individual employers set their own bar, typically at least a basic school-leaving certificate. This is *categorically more accessible* than the university path for someone with only high-school-level education; unlike §2.1, a `highestEducation` of "High School" is not a gap here.
- **German language is the single biggest real barrier**, not academic credentials. Realistic bands from current sources: B2 is comfortable for German-taught vocational school; B1 is workable but described as "tough" for the first semester; A2 is possible for some technical tracks only where the employer provides support, and is a real risk otherwise.
- **Age**: no strict legal cap, but the practical target range is roughly 18–35, with healthcare/nursing-adjacent Ausbildung programs sometimes accepting up to 40. This is a soft signal, not a hard rule.
- Some employers now run structured international-hiring pathways specifically because advanced German at entry would lock out otherwise-strong candidates — several offer paid language classes during the Ausbildung itself.

### 2.3 Employment / skilled-worker path

- **EU Blue Card (2026 thresholds)**: €50,700/year gross minimum salary for standard occupations; a **lower threshold of €45,934.20/year** applies to recognized shortage occupations, recent graduates (within 3 years), and qualified IT specialists without a formal degree. Shortage occupations per this route include IT, engineering, natural sciences, mathematics, medicine/pharmacy, and certain skilled trades.
- **Opportunity Card (Chancenkarte)** — Germany's own points-based system for job-seekers *without* a pre-arranged offer. Structurally, this is the closest real-world analogue to what we're building, and worth using as a design reference (not a system we replicate or claim to calculate):
  - **Minimum requirements (gate, not scored)**: a recognized degree or vocational qualification, basic German (A1) or English (B2), and financial proof of **~€13,092/year** (note: a *different, higher* figure than the €11,904 student blocked-account number in §2.1 — these are two distinct programs, don't conflate them in the algorithm).
  - **Points (need 6 of 14)**: German A2=1/B1=2/B2+=3pts, +1 for English C1+/native; 2yrs experience in last 5=2pts or 3yrs in last 7=3pts; age ≤35=2pts, 35–40=1pt; prior 6-month+ stay in Germany=1pt; joint application with spouse=1pt.
- A university degree isn't the only route — a **recognized vocational qualification** (via IHK/HWK chamber recognition) also qualifies under the Skilled Immigration Act for non-academic occupations.

---

## 3. Cross-cutting factors (apply to every path)

- **Passport validity is collected but deliberately excluded from scoring** (revised after initial build — see §6). Getting a passport issued or renewed is a solvable administrative step, not a fit gap, and users exploring the app for information/education purposes shouldn't be scored down for a temporary status they can resolve. `passportStatus` stays in the assessment for Tier 2/future use, but none of the three path-scoring functions reference it.
- **A certified language exam result is a confidence multiplier, not a separate gate** — someone who self-rates B1 *and* holds a Goethe/telc/TestDaF certificate is a more reliable "B1" than someone who only self-rates it.
- **Germany connection, timeline, and region flexibility are modifiers, not primary drivers** — they're useful color for the human-reviewed explanation in Tier 2, and reasonable tie-breakers on borderline cases, but none of them should single-handedly turn a genuinely weak profile into a "strong fit," or a strong one into a weak one.

---

## 4. What our 14 questions map to — and one real gap

| Assessment field | Feeds into |
|---|---|
| `country`, `age` | Baseline demographics; `age` feeds the Ausbildung age band and the Opportunity Card–style age band for Employment |
| `highestEducation` | University-path gate (§2.1), Ausbildung is largely indifferent to this, Employment-path weight |
| `occupationField` | Mainly Employment fit — tagged against shortage-occupation status via `occupation-demand.ts` (§2.3, §6) |
| `workExperience` | Employment-path weight (heavy), Ausbildung (light), University (near-irrelevant) |
| `desiredPath` | The path the algorithm should evaluate *first* and compare against (see §5) |
| `germanLevel`, `englishLevel`, `languageCertificate` | Gates/weights across all three paths, per the real bands in §2 |
| `passportStatus` | Collected, **not scored** (§3, §6) — practical prerequisite, not a fit signal |
| `germanyConnection` | Minor bonus modifier across all paths |
| `financialSituation` | Heavy weight for University (blocked account), light for Ausbildung (paid training), moderate for Employment *only if* pursuing the job-seeker route without a pre-arranged offer |
| `startTimeline`, `regionFlexibility` | Explanatory color, not scoring drivers |

**Note**: no field asks whether the person already has a job offer in Germany. Considered and deliberately rejected — see §6 — since someone with an offer wouldn't be using the app in the first place.

---

## 5. Proposed algorithm design (draft — needs your review before implementation)

### 5.1 Structural idea: score all three paths, not just one

Rather than a single generic "fit" bucket, compute an internal fit signal **separately for University, Ausbildung, and Employment**, using the weighted factors in §5.2. Then compare against what the user actually said they want (`desiredPath`):

- **Stated path scores strong** → outcome: *"Strong fit for [their chosen path]."*
- **Stated path scores weak/borderline, but a different path scores strong** → outcome: *"[Alternative path] may be a better fit for your profile"* — naming the specific alternative, not a generic "consider a job search."
- **`desiredPath` is "Unsure," or nothing scores clearly strong** → outcome: *"Unclear — worth a closer look"* (the existing third bucket from Plan.md §4).

This keeps the three-outcome structure Plan.md already committed to, but makes it personalized to what the user actually asked for, and gives you (the Tier 2 human reviewer) all three underlying path signals to work from instead of just one flattened verdict.

### 5.2 Draft internal weights (illustrative — thresholds are placeholders, not final)

**University** (max 11 points):
- `highestEducation`: High School = 0, Technical Diploma = 1, Bachelor/Master/Doctorate = 3 (already past the Studienkolleg hurdle)
- Language: take the *better* of German-derived points (None/A1=0, A2=1, B1=2, B2=3, C1/C1+=4) or English-derived points (Beginner=0, Intermediate=1, Advanced=2, Fluent=3) — either can lead to a valid track
- Certified language exam: +1
- `financialSituation`: <€5,000=0, €5,000–12,000=1, >€12,000=2, Unsure=1
- `germanyConnection` (any real tie selected): +1
- `passportStatus`: **not scored** — see §3/§6

**Ausbildung** (max 13 points):
- `highestEducation`: any level = 2–3 (indifferent, unlike University)
- `germanLevel`: None/A1=0, A2=1, B1=3, B2/C1+=4
- Certified German exam: +1
- `age`: 18–30=3, 31–40=2, 40+=1, under-18=1
- `workExperience`: None=0, <2yr=1, 2yr+=2
- `financialSituation`: minimal weight (training is paid) — not currently scored at all
- `passportStatus`: **not scored** — see §3/§6

**Employment** (max 21 points):
- `highestEducation`: Bachelor+=3, Technical Diploma=2, High School=1
- `occupationField`: bonus if tagged as a shortage occupation (`occupation-demand.ts`, done — see §6)
- `workExperience`: None=0, <2yr=1, 2–5yr=3, 5+=4 (heaviest weight of any path)
- Language: both German and English contribute equally — deliberately *not* weighting English higher for IT/engineering-coded fields yet, a known MVP simplification
- `age`: ≤35=strong, 35–40=medium, 40+=lower (mirrors Opportunity Card bands, not a hard cutoff)
- `germanyConnection`: +1
- `passportStatus`: **not scored** — see §3/§6

### 5.3 What stays purely qualitative

Whatever the internal numbers land on, the **only** things that ever reach the user are: which of the three outcomes applies, which path (if any) is named as a stronger alternative, and a plain-language explanation — never a score, percentage, or point count.

---

## 6. Decisions made, and what's still open

**Resolved:**
1. **Draft weights/thresholds in §5.2** — approved as good enough to build the MVP with, expected to need tuning once real submissions come in rather than being perfected up front. Implemented as normalized ratio bands (≥70% of a path's max points = strong, 40–69% = borderline, <40% = weak) in `assessment-verdict.ts`.
2. **"Do you already have a job offer/employer contact?" question — rejected.** Correct product logic: by definition, someone who already has a job offer wouldn't be using the app in the first place. Not adding this question; the Employment-path scoring doesn't attempt to distinguish the Blue Card (has an offer) from Opportunity Card (job-seeker) routes.
3. **Shortage-occupation tagging — done, but *not* in the questionnaire.** Implemented as a separate internal-only lookup (`frontend/src/lib/occupation-demand.ts`), invisible to the user and not part of `types/assessment.ts`. This is deliberately a static, manually-curated snapshot for the MVP — the plan is to eventually replace it with an AI-assisted pipeline that checks official sources on a rolling basis and regenerates the data, and to surface any user-facing "high demand" indication elsewhere in the app (not the intake form) once that system exists. Not scoped yet.
4. **Threshold values** — picked concrete numbers (per-path point totals, normalized to the 70%/40% ratio bands above) and validated them against seven synthetic profiles spanning all four outcome kinds (confirmed / alternative / suggested / unclear). All behaved sensibly — see git history for the specific test cases and outputs.
5. **Passport status removed from scoring entirely.** Originally worth +1 point per path; removed after feedback that some users are exploring the app for education/information purposes and don't yet have a valid passport, and that getting one issued is a solvable administrative step, not a genuine fit gap — scoring it risked discouraging otherwise-strong, optimistic profiles over something easily fixed. `passportStatus` is still collected (useful for Tier 2/practical guidance) but no longer read by any of the three scoring functions. Verified: an identical profile scores identically regardless of passport status.
6. **Point system confirmed as the right architecture, not a lookup table or a funnel.** The 14 questions produce ~549 billion raw answer combinations (dominated almost entirely by the 110-option occupation field) — far too many to enumerate as cases. A point system sidesteps this: complexity scales with the *number of questions* (14 lookups + a sum), not the number of combinations, and its actual internal reasoning space is bounded by each path's max score (13 × 15 × 23 = 4,485 possible score triples for the three paths) — about 122 million times smaller than the raw input space. A funnel (sequential hard gates) was considered and rejected as the primary architecture, since it forces an artificial priority order onto factors that should trade off against each other (e.g. strong language but thin savings); it remains a reasonable *supplement* for genuine hard blockers if one is ever identified, which is part of why passport (§3, above) was evaluated as a gate candidate and then excluded instead.
7. **Per-factor score breakdown and improvement advice, built.** `PathScore` now carries a `factors: ScoreFactor[]` array (each factor's own points/max, and whether it's realistically actionable). `getImprovementAdvice()` picks the single weakest *advisable* factor (excluding things like age or occupation demand that aren't something to "advise" on) and returns real advice text, or `null` once every advisable factor is already at ≥75% of its own max — so the advice is always grounded in the actual computed weak point, never generic filler. Shown on the result page via `ProfileImprovementAdvice.tsx`.

**Still open — found during testing, not yet fixed:**
8. **Ausbildung scoring doesn't penalize overqualification.** A synthetic profile of a senior software engineer (Bachelor's, 5+ years' experience, B2 German) scored "strong" for Ausbildung as well as the correct "confirmed" Employment result — in reality, someone that experienced would rarely want to restart as an entry-level apprentice. Didn't affect that specific test's final output (Employment was still correctly confirmed), but it would matter for someone with that profile who stated "Ausbildung" outright or selected "Unsure." Candidate fix: a downward adjustment to the Ausbildung score when both `highestEducation` and `workExperience` are high, rather than the current flat treatment. Not urgent for MVP — noted per the same "tune once we have real data" philosophy as the rest of §5.2.

---

## Sources

- [Studienkolleg for Egyptian Students: Complete Guide (2026)](https://www.studienkolleg.org/en/blog/studienkolleg-guide-egyptian-students-complete/)
- [Admission of Egyptian students to German universities](https://grokipedia.com/page/Admission_of_Egyptian_students_to_German_universities)
- [requirements for admission - Studienkolleg Germany](https://studienkolleg-germany.com/requirement)
- [Ausbildung in Germany 2026: German Language Requirements & Step-by-Step Guide](https://www.sprachschule.org/en/blog/ausbildung-german-language-requirements-guide/)
- [Ausbildung Requirements 2026: Age, Education & German Level | GoAusbildung](https://goausbildung.com/requirements)
- [English-Taught Ausbildung Germany 2026: Non-EU Guide](https://www.migrationvisportal.com/2026/05/english-taught-ausbildung-germany-2026.html)
- [EU Blue Card Germany 2026: Salary €50,700 & Requirements Guide](https://www.findenglish.de/blog/eu-blue-card-germany-2026-requirements-salary-threshold-how-to-apply)
- [Minimum salary for the EU Blue Card in 2026 | RT & Partner](https://www.rtpartner.de/en/immigration/blaue-karte-eu-mindestgehalt-2026/)
- [Germany's Opportunity Card Points System (2026)](https://www.mygermanuniversity.com/articles/opportunity-card-points-system) *(previously cited in Plan.md §5)*
- [German Blocked Account 2026: €11,904 Requirement & Guide](https://visatocampus.com/german-blocked-account-guide/) *(previously cited in Plan.md §5)*
