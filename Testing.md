# NOVIRA — Testing

Split out 2026-10-20, at the founder's own request, specifically so this doesn't get mixed into — or read every time someone touches — `Architecture.md` (shipped-feature build history) or `CLAUDE.md` (current phase status). This file is a different, ongoing concern: **test data, fixtures, and methodology**, not a feature and not a business/legal decision. Read before adding new test personas, touching the 10 fake personas already seeded in the real database, or working on the document-verification pipeline's test fixtures.

Like every doc here except `CLAUDE.md`, this is read on demand, not auto-loaded.

---

## 1. The 10 fake test personas (seeded 2026-10-20)

Ten synthetic Egyptian personas, spanning 10 different real `OccupationField` values, created to exercise matching, Tier 1–3, and (next) the document-verification pipeline against realistic, varied data instead of one single real account repeatedly.

**Connected to the founder's real inbox via Gmail `+tagging`** — `beelwarad52+<slug>@gmail.com` are all real, deliverable addresses that land in one real inbox, while still being 10 genuinely distinct accounts (`Users.Email` is unique). Sign in to any of them the normal way to test as that persona.

Each has a full Tier 1 assessment profile (age, education, language levels, passport/financial situation — varied, not copy-pasted) and a complete Tier 2 intake/CV profile (phone, address, summary, work history with bullet points, education, skills, certifications) — genuinely usable for testing CV generation, matching, and the Tier 2/3 flows, not just inert rows.

| Persona (slug) | Full name | Career / `OccupationField` | City | Path | Tier | Documents | Tier 3 case |
|---|---|---|---|---|---|---|---|
| `ahmed-nursing` | Ahmed Mostafa Hassan | Nursing | Cairo | University | **Tier 2** | Passport + Education cert, both Approved | **Requested** |
| `mariam-software` | Mariam Youssef Ibrahim | Software Development | Alexandria | University | **Tier 1** | Passport, Approved | — |
| `omar-mechanical` | Omar Khaled El-Sayed | Mechanical Engineering | Giza | University | **Free** | none (clean baseline) | — |
| `nour-finance` | Nour Ahmed Fathy | Accounting & Finance | Mansoura | University | **Tier 2** | Passport **PendingReview**, Education cert Approved | — |
| `youssef-hotel` | Youssef Tarek Aboul-Fotouh | Hotel Management | Hurghada | Ausbildung | **Tier 1** | Passport + Language cert, both Approved | — |
| `salma-electrical` | Salma Reda Abdallah | Electrical Engineering | Cairo | University | **Tier 3** | Passport + Education cert, both Approved | **ActiveSearch** |
| `karim-civil` | Karim Adel Mansour | Civil Engineering | Tanta | University | **Free** | Passport **Denied** (expired) | — |
| `hana-cybersecurity` | Hana Sherif Zaki | Data & Cybersecurity | Alexandria | University | **Tier 1** | Passport **FlaggedRed** | — |
| `mohamed-electrician` | Mohamed Ehab Gaber | Electrician | Zagazig | Ausbildung | **Tier 2** | Passport, Approved | — |
| `dina-culinary` | Dina Walid Fahmy | Culinary Arts | Luxor | Ausbildung | **Tier 3** | Passport, Approved | **Secured** |

Spread: 2 Free / 3 Tier 1 / 3 Tier 2 / 2 Tier 3, deliberately covering every `Tier3CaseStatus` stage currently reachable (`Requested`, `ActiveSearch`, `Secured`) across the two Tier 3 personas plus Ahmed's in-flight Tier 2→3 case. Hana's `FlaggedRed` document correctly set her real `FraudFlagged = true` — confirmed live, not assumed.

**How this was built**: a temporary, admin-key-gated endpoint (`TestSeedEndpoints.cs`) wrote `Purchase` and `UserDocument` rows directly — no real Stripe charge, no real paid Claude vision call — then the actual review decisions (Approve/Deny/FlagRed) and Tier 3 status changes were routed through the real admin endpoints, so the genuine promotion logic (`Verified*` field writes, fraud-flagging) ran exactly as it would for a real case. **The temporary endpoint was removed immediately after use** — `git status` confirms zero trace left in the codebase; leaving a "grant free Tier 3 / fabricate verified documents" capability sitting in the app would be a real risk once this ships, especially with `Admin:Key` still the literal `"123"` (see `CLAUDE.md`'s Pre-deployment blockers).

**A real bug found and fixed during this exact seeding pass**: the first attempt serialized the fake AI-extraction JSON with camelCase keys; the real pipeline (`DocumentsEndpoints.cs`) serializes with PascalCase (`JsonSerializer.Serialize(new { result.DocumentTypeDetected, ... })`, an anonymous object, no case conversion), and `ApplyVerifiedDataFromDocument`'s deserializer is case-sensitive with no options passed — so every `Verified*` field except the name (a separate DB column, not from this JSON) silently failed to promote. Caught by actually checking Salma's `Verified*` fields after seeding rather than trusting the 200 OK responses; fixed the casing, re-ran the batch clean. Documented here so the exact failure mode doesn't need rediscovering if this pattern gets reused.

---

## 2. Document-verification pipeline test fixtures — planned 2026-10-20, not yet built

**Goal**: a reusable folder of fake PDF/image documents (passports, education certificates, language certificates) to exercise the real upload → AI-verification → admin-review pipeline end-to-end, for manual testing before real user submissions ever open up (`CLAUDE.md`'s Deferred list — that gate is unaffected by this; these stay the founder's own synthetic documents, the existing carve-out).

### 2.1 Research grounding (not guessed)

**What the pipeline is actually designed to catch** — from `DocumentVerificationService.cs`'s own prompt and structured-output schema, the real ground truth for what's worth testing. The prompt's own example concerns, verbatim: *"name on document does not match profile," "document appears expired," "image is blurry," "possible signs of tampering," "uploaded label does not match the actual document type."* Any test case should map onto one of these five — testing for something the AI was never asked to check wouldn't produce a meaningful signal.

**Broader identity-verification research** ([arXiv survey on ID document attack/detection](https://arxiv.org/pdf/2607.01442), [Sumsub](https://sumsub.com/blog/ai-fake-id-challenge-for-kyc/), [Gridlines](https://gridlines.io/blogs/?p=5315)): most of the sophisticated failure modes in this space (AI-generated synthetic IDs, liveness-check bypass, face-swap fraud) are genuinely out of scope for NOVIRA's pipeline — it's a single vision-extraction call with mandatory human review, not a biometric/liveness system. Deliberately not designing tests against capabilities the system was never built to have.

**Real Egyptian passport format** ([PRADO](https://www.consilium.europa.eu/prado/en/EGY-AD-01001/index.html), [IRB Canada via ecoi.net](https://www.ecoi.net/en/document/2064764.html)): 52-page booklet, biodata page carries passport number/full name/DOB/place of birth/nationality/sex/issue+expiry dates/issuing office/profession, laminate with a repeated small photo, security thread, UV features, coat-of-arms watermark. **Current Egyptian passports don't separate given name from surname** — one combined full-name field, useful for making fixtures realistic.

**Real Egypt-specific document fraud patterns** ([al-bab.com](https://al-bab.com/blog/2020/09/degrees-deception-how-fake-universities-targeted-middle-east), [Gulf News](https://gulfnews.com/amp/story/world%2Fgulf%2Fkuwait%2F142-kuwaitis-found-to-be-holding-fake-university-degrees-from-egypt-1.92657914)): documented real cases of (a) forged certificates bearing the names of real, legitimate universities (e.g. Cairo University), sold by insiders, and (b) entirely fake foreign "universities" (diploma mills) issuing real-looking diplomas — including one real case issuing fake **nursing** degrees specifically. Neither is something a vision-extraction call can actually catch (it can't verify institutional legitimacy against an external registry) — which is itself the right thing to test: confirming the AI extracts data faithfully and stays in its lane (flags for human judgment) rather than overclaiming a verdict on institutional legitimacy it was never asked to make.

**German Anerkennung (credential recognition) research** ([germanworldcenter](https://germanworldcenter.learnworlds.com/common-mistakes-in-the-recognition-process-and-how-to-avoid-them)): a recurring real problem is a degree title that doesn't map cleanly to a standard category. Lines up directly with the schema's own instruction to leave `occupationField` blank rather than guess when ambiguous — worth testing the *conservative-abstention* behavior specifically, not just "does it catch problems."

### 2.2 The scenario matrix (10 personas, ~17 documents)

| Persona | Document(s) | Category tested |
|---|---|---|
| Ahmed (nursing) | Passport (clean) + Education cert (clean) | happy path |
| Mariam (software) | Passport (clean) + a document uploaded under the wrong type label | "label doesn't match actual document" |
| Omar (mechanical) | Passport with a past expiry date | "document appears expired" |
| Nour (finance) | Passport, deliberately blurry | "image is blurry" |
| Youssef (hotel) | Passport (clean) + Language cert (clean) | happy path |
| Salma (electrical) | Passport (clean) + Education cert showing a different name | "name does not match profile" |
| Karim (civil) | Passport (clean) + Education cert with an ambiguous/non-standard degree title | `occupationField` correctly left blank, not guessed |
| Hana (cybersecurity) | Passport with visual tampering cues (inconsistent fonts/mismatched lighting) | "possible signs of tampering" |
| Mohamed (electrician) | Passport (clean) + an unrelated image uploaded as a passport | `documentTypeCategory: Other` |
| Dina (culinary) | Passport (clean) + a certificate from a real-named institution citing a credential that doesn't exist | AI extracts faithfully without claiming to verify institutional legitimacy (a human call, per the diploma-mill research above) |

Roughly half clean, half deliberately broken — covers the real failure modes the pipeline is supposed to catch, not just the easy cases.

### 2.3 Folder structure

```
user_fake_documents/
  Ahmed_Mostafa_Hassan/
    passport.pdf
    education_certificate.pdf
  Mariam_Youssef_Ibrahim/
    ...
```
One folder per persona, named by full name, at the repo root. **Gitignored — never committed**, same reasoning as any other local-only test fixture (and the same discipline `frontend/verify/`'s own throwaway scripts already follow, see §3 below).

### 2.4 Generation + real-cost plan — built and verified live 2026-10-20

Fixtures generated programmatically with `pdf-lib` (Node — Python isn't available in this environment) — simple, clearly-synthetic layouts with obviously placeholder data, not sourced/scraped from anywhere, each carrying a small red "SYNTHETIC TEST DOCUMENT — NOT REAL" corner marker so nothing in that folder could be mistaken for or misused as a real document. All **17 files generated** into the exact folder structure in §2.3 (visually spot-checked after generation, not just trusted to have run without error). One real fixing step during generation: `pdf-lib`'s standard Helvetica/Times fonts can't encode Arabic glyphs (`WinAnsi cannot encode "ج"`) — the passport layout's bilingual labels ("Full Name / Arabic", "PASSPORT / Arabic") were simplified to English-only rather than embedding a custom Arabic-capable font, since the Arabic text wasn't load-bearing for what these fixtures test.

**Real-pipeline sample upload (3 of 17, real paid Claude Opus 5 vision calls) — run against an isolated backend instance on :5090 (never the founder's own :5080/:3000), via direct `curl` through the real `/auth/request-link` → `/auth/verify` → `POST /documents` flow against three of the already-seeded personas:**

- **Ahmed (happy path, clean passport)** — AI correctly extracted every field (name, DOB, nationality, passport number, 2029 expiry) and set `nameMatchesProfile: true`. Notably, it also **independently caught the fixtures' own "SYNTHETIC TEST DOCUMENT" watermark** and flagged it as a reason the document "cannot be used to verify identity," plus flagged the missing MRZ/photo/security features — real evidence the model is reading actual page content, not pattern-matching a passport-shaped layout. A good sign for the pipeline, if a mildly inconvenient one for fixture design going forward (every fixture will trigger this same flag — see note below).
- **Omar (expired passport)** — correctly triggered the targeted concern: *"Document is expired — date of expiry 2023-05-01 has passed; a renewed passport should be requested."* Confirms "document appears expired" detection works end-to-end, not just in the schema.
- **Hana (tampering-cues passport, mismatched font on the name field)** — attempted under Hana's own account first; correctly **blocked outright** with the real fraud-block error message (`"Uploads are currently unavailable for this account..."`), because Hana's persona already carries `FraudFlagged = true` from the `FlaggedRed` document seeded in §1 — an unplanned but accurate re-confirmation that the 2026-08-28 fraud-block fix (`CLAUDE.md`'s "Known issues from code review") still holds. Re-uploaded the same file under Omar's (unflagged) account to actually see the AI's read: it did **not** produce a tampering-specific flag — the generic synthetic-watermark/missing-MRZ flags dominated instead. Real finding, not a pipeline bug: a plain font-family swap on one field is too subtle a visual cue for this model to call out specifically as tampering. Worth knowing if a stronger tampering test is ever needed (e.g. visibly misaligned text, inconsistent field spacing).

**Known limitation found by this test, not a defect**: because every fixture carries the "SYNTHETIC TEST DOCUMENT" marker (a deliberate, correct safety choice — see this section's opening paragraph), every fixture will always also trigger a "not genuine, carries a synthetic watermark" flag alongside whatever specific concern it's designed to test. This doesn't prevent confirming each specific category (expiry/blur/name-mismatch/etc. still show up as their own distinct flags), but it means these fixtures can never produce a *zero-flags* "fully clean" result — there isn't a way around this that doesn't compromise the no-real-document-confusion safety property, so it's accepted as-is.

The remaining 14 files (Mariam's mislabeled upload, Nour's blurry passport, Youssef's passport+language cert, Salma's name-mismatch cert, Karim's ambiguous-field cert, Hana's own passport re-test once unflagged, Mohamed's clean passport + unrelated-image upload, Dina's passport + fictitious-institution cert) are generated and ready in `user_fake_documents/` for the founder's own on-demand manual testing — not auto-uploaded, to avoid unnecessary real API spend beyond this confirmatory sample.

---

## 3. General testing conventions (pointer, not duplicated)

The throwaway-script convention (`frontend/verify/`, gitignored, deleted after each use), the `novira-verify` skill's "verify for real" checklist, and the isolated-instance pattern (`:5090`/`:3001` sharing the real database, never touching the founder's own `:5080`/`:3000`) are already fully documented in `CLAUDE.md`'s "Browser verification" section and `.claude/skills/novira-verify/` — not restated here to avoid two copies drifting apart. This file is specifically about *persistent* test data/fixtures (the 10 personas, the document-fixture folder), which is a different thing from the *throwaway* scripts that convention covers.
