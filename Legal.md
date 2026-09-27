# NOVIRA — Legal & Compliance

Consolidated 2026-09-26 out of `Plan.md` §3/§12 and `Monetization-Strategy.md` §4.2, which had grown into overlapping copies of the same reasoning. This is now the one place to check before anything touches legal scope, consent, data transfer, or the apply-on-behalf feature — `Plan.md` and `Monetization-Strategy.md` point here instead of restating it.

Legal/compliance **work** (Phase 0 — company formation, lawyer consultation) is still deliberately paused per the founder's own earlier instruction — this file exists to track the *reasoning* and *decisions already made*, not to push that work forward. Don't read this file's existence as license to proactively raise Phase 0 as a to-do.

---

## 1. RDG — the single biggest structural risk

Germany's *Rechtsdienstleistungsgesetz* (RDG) restricts who may give legal advice on immigration matters (visas, residence permits, entry/work authorization) to licensed lawyers and specific chambers. Violations carry fines up to €50,000 (enforcement tightened as of 2025).

**The line is substance, not labeling** — calling something "advice" instead of "legal advice" changes nothing.

- ✅ **In scope, not legal advice:** matching people to study/Ausbildung programs, helping them prepare and submit applications, explaining a program's stated requirements. This is the normal, established "education agent" business model.
- ❌ **Out of scope, is legal advice:** telling someone they qualify for a visa, explaining residence-permit conditions, any assessment of individual immigration/legal status.
- Any user question that drifts into visa/residence-permit territory gets a hard stop + referral to a licensed immigration lawyer. Get a lawyer relationship (referral partner or one-off consult) in place **before launch**, not after.

**Wording discipline for every automated verdict/offer**: frame every output as *program/opportunity fit* ("how your profile compares to typical requirements"), never as an *immigration outcome* ("your chance to travel to / enter Germany"). Keep results **qualitative** (e.g. three outcome buckets), not a manufactured numeric "match score" — a fake-precision percentage reads as an outcome claim you can't actually guarantee. This same discipline extends to Tier 3's copy (§3 below): "help you apply" / "help you complete and submit your application" — never "apply on your behalf" or "assess your visa eligibility."

**Terms of Service — don't self-draft a blanket liability shield.** German consumer-protection law (§309 BGB) voids broad liability exclusions against private consumers in standard terms — a DIY "not responsible for anything" clause is partly unenforceable *and* reads exactly like the fine-print scam agencies use. The version that actually protects you is **narrow scope language**: informational program-matching only, not legal/immigration advice, no outcome guaranteed. More defensible and more trust-building than a blanket disclaimer. Draft this with the lawyer from Phase 0, not solo.

---

## 2. Two overlapping data-protection regimes — not just German law

**GDPR applies because of where *you* are established, not where your users are.** Its territorial scope (Article 3(1)) covers all processing "in the context of the activities of an establishment... in the Union, regardless of whether the processing itself takes place in the Union or not." Since the company is German, GDPR applies to all your processing — this is *not* affected by your users being Egyptian, non-EU, or physically outside Europe. Their nationality/location isn't part of the test that governs you.

**Separately — and specifically because your users are Egyptian — Egypt has its own data protection law.** The *Personal Data Protection Law* (Law 151/2020), with Executive Regulations now finalized and a Personal Data Protection Center (PDPC) enforcing it, regulates transferring an Egyptian data subject's personal data **outside Egypt**: it requires either a PDPC license, or an accepted basis (destination-country adequacy, **specific consent to the transfer**, or contractual necessity). Full enforcement is expected **31 October 2026**. Penalties: EGP 100,000–5,000,000 fines, criminal imprisonment for unlicensed transfers.

This is triggered by the product's basic mechanics (an Egyptian user's email/documents leaving their browser and landing on a German server), not an edge case — and it can't be solved by hosting choice alone (`Plan.md` §7 has the hosting-region discussion; also see `CLAUDE.md`'s Pre-deployment blockers for the current West-US-not-EU database gap, a related but distinct problem). The likely fix is the same instinct already planned for GDPR: **specific, explicit consent that names the international transfer**, not a generic ToS checkbox — but this needs confirmation from someone who actually knows Egyptian law, not an assumption. **Egypt's PDPL needs to be an explicit line item in the Phase 0 legal consultation**, alongside German RDG/GDPR, given the imminent enforcement date and criminal exposure.

---

## 3. Tier 3 (applying on the user's behalf) — the Vollmacht decision

**Applying on a user's behalf** is normal for education agents but makes you a legal agent under a power of attorney (Vollmacht) — you become liable for errors (missed deadlines, wrong documents). Needs clear contracts, liability caps in your Terms of Service, and is part of why the company should eventually be a liability-limited entity (`Plan.md` §6).

**Decision, 2026-09-26: proceeding with this before the company exists, as a deliberate, accepted MVP risk.** No funding yet to form the UG; the plan is to validate real demand first (real users actually paying for Tier 3) and use that as evidence to raise the funding a company formation needs, rather than wait for money that has no case for existing yet. This was flagged clearly, once, before the decision was made — it's a legitimate, considered trade-off, not an oversight, adopted with concrete mitigations rather than accepted as bare risk:

- **Strict wording discipline, everywhere this tier is described** — see §1 above. Important honest limit: this reduces the risk of *drifting* into actual RDG-restricted immigration advice, and is good practice regardless — it does **not** change the underlying substance of what Tier 3 actually does (submit an application under signed authorization), which is a "what you do," not "what you call it" question. Wording discipline and the mitigations below are complementary, not substitutes for each other.
- **A Gewerbeanmeldung (sole-trader business registration)** — researched 2026-09-26: German law classifies "Vermittlung" (mediation/placement services, which this tier functionally resembles) as commercial activity, not freelance work, which likely requires this registration independent of the UG question. Genuinely good news given the funding constraint: **nothing like forming a UG** — no notary, no share capital, typically €20–60 and done in a day at the local trade office. Does **not** provide liability protection (still personally liable either way) — it closes a separate compliance gap (operating as a properly registered business), not the Vollmacht question.
- **A Vermögensschadenhaftpflichtversicherung (professional/pecuniary-loss liability insurance)** — researched 2026-09-26: available to freelancers/sole traders without a company (no Gewerbeanmeldung prerequisite found either, though the two make sense to get together), real market cost **~€135–330/year** for advisory/small-consultant work (some providers as low as ~€120/year for basic freelancer cover) — genuinely cheap relative to a single Tier 3 sale. Covers **client financial-loss claims from negligent advice or error** (e.g. a missed deadline, a wrong document costing someone their spot) — this is the real financial backstop for the Vollmacht side of the risk. Important honest limit: it does **not** cover an RDG regulatory fine (a different risk category — a penalty for unauthorized practice, not a client's financial-loss claim), which is what the wording discipline above continues to guard against. Two real German providers came up in research (Hiscox, exali.de) specializing in exactly this for freelancers/consultants — worth requesting an actual quote before the first Tier 3 sale.
- **"Our team" everywhere in the product/marketing voice; the founder's real legal name/identity only in the actual signed Tier 3 agreement.** Not a contradiction — brand voice and legal accountability are different things, and the one document that needs to be enforceable and honest about who's actually responsible (currently an individual, not a company) is the signed agreement itself, not the app's copy.
- **The founder personally handles every case in this cohort** (labeled internally as "our team, pre-UG" — purely an internal tag, not user-facing) until the UG exists — direct oversight as the primary risk-reduction lever alongside the above.
- **A refund guarantee scoped to Tier 3 only** (not Tier 1/2, where the founder judges there's no comparable legal exposure to mitigate) — see `Monetization-Strategy.md` §4.1 for the pricing/refund mechanics themselves. One open, unresolved note: whether EU/German consumer withdrawal-right rules apply to a customer in Egypt is genuinely uncertain and worth a real lawyer question eventually.

**None of this is being treated as legal advice or a substitute for one** — it's the founder's own considered risk decision, made with real information rather than in the dark, and documented here so it's an explicit, trackable choice rather than something that quietly happened.

---

## 4. Where this fits in the bigger picture

- `Plan.md` §12 (Key risks recap) items 1, 2, and 5 restate the RDG/PDPL/GDPR-hosting risks above in the context of the full risk list (trust deficit, AI reliability, solo-founder capacity, etc.) — read there for how these sit alongside the non-legal risks, not duplicated here.
- `Plan.md` §6 (Company structure) — the UG/Musterprotokoll plan this file's Tier 3 section treats as "not yet, but the eventual fix."
- `Plan.md` §11 (Phased roadmap), Phase 0 — the paused company-formation/lawyer-consultation work itself.
- `CLAUDE.md`'s Pre-deployment blockers — the database-region (West US, not EU) gap, related to but distinct from the PDPL/GDPR reasoning above.

Sources for the 2026-09-26 Gewerbeanmeldung/insurance research: [exali.de — Vermögensschadenhaftpflicht for consultants](https://www.exali.de/consult/Vermoegensschadenhaftpflicht,5465.php), [Hiscox — Vermögensschadenhaftpflichtversicherung](https://www.hiscox.de/geschaeftskunden/vermoegensschadenhaftpflichtversicherung/), [gewerbeanmeldung.de — Gewerbeanmeldung requirements for Bildungsdienstleister](https://www.gewerbeanmeldung.de/muessen-freiberufler-gewerbe-anmelden). Re-verify before treating as final — none of this is a substitute for an actual lawyer's review.
