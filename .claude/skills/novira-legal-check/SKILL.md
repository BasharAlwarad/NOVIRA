---
name: novira-legal-check
description: Use this before shipping or proposing anything in the NOVIRA repo that touches user data collection, consent, wording shown to users about their eligibility/outcomes, a new paid tier or pricing mechanic, or anything resembling applying/acting on a user's behalf. Also use it before writing marketing/product copy that describes what NOVIRA does for a user, and before adding a new document type, consent flow, or cross-border data step. This is a deliberately skeptical, separate pass — like a code review, but for legal scope — not a substitute for `Legal.md` itself, which has the full reasoning; this skill is the checklist that makes sure that reasoning actually gets applied at the moment a change is being made, not just filed away.
---

# NOVIRA legal-scope check

This project sits right next to a real regulatory line (Germany's RDG, restricting immigration/legal advice to licensed practitioners) and handles data across two data-protection regimes (GDPR, Egypt's PDPL) — see `Legal.md` for the full reasoning. None of that is exotic or hypothetical: `Plan.md` documents real scam operations in this exact space, and the founder has already made one deliberate, mitigated exception to the usual "wait for the company" rule (Tier 3). The risk here isn't abstract — it's that a feature or a sentence of copy quietly drifts across a line that was carefully drawn, because the person writing it in the moment was focused on shipping, not on re-deriving `Legal.md` from memory.

This skill exists to be the moment that catches that drift — read it, run the checklist, then keep building. It should take a minute, not become its own research project.

## The core distinction to check every time

**Substance, not labeling** (`Legal.md` §1) — the test is never whether something is *called* advice, it's whether it functions as an individual assessment of someone's legal/immigration status.

- ✅ Safe: matching people to programs, explaining what a program's own published requirements are, helping someone prepare and submit an application, general information that's the same for everyone in a given situation.
- ❌ Not safe: telling a *specific* user they qualify for a visa, interpreting residence-permit conditions for them, any individualized "your chance of X" framing — even softened, even hedged, even if the underlying reasoning is sound.

## Checklist

1. **Does this feature or copy make an individualized eligibility/outcome claim?** If new UI text says anything like "you qualify," "your chances," or implies a residence-permit/visa judgment about *this specific user*, stop — reframe it as program-fit language ("how your profile compares to this program's stated requirements") before shipping, per `Legal.md` §1's wording discipline.
2. **Does this introduce a new numeric-feeling score shown to the user?** A percentage or point total reads as a precision/outcome claim even when the label says otherwise. If a new feature is tempted to show one, keep it qualitative (buckets, labels) instead — same reasoning as the existing Tier 1 verdict and matching system.
3. **Does this collect new personal data, or send existing data somewhere new?** New document types, new fields, a new integration, a new place data leaves the browser — check whether it needs its own consent language (`Legal.md` §2) rather than assuming the existing privacy notice already covers it. Specifically: does this cross a border (Egypt → Germany, or anywhere else) in a way the current consent wording doesn't already name?
4. **Does this drift toward acting *for* the user rather than helping *them* act?** The line between "we prepare you, you submit it" and "we submit it for you" is the Vollmacht line (`Legal.md` §3). Anything outside the already-decided Tier 3 scope that starts to resemble submitting something on a user's behalf, signing anything for them, or representing them to a third party needs to go through the same explicit, documented decision Tier 3 went through — not happen incidentally as a side effect of a feature framed as something else.
5. **If this is Tier 3-adjacent work, is the wording discipline from `Legal.md` §3 actually being followed?** "Help you apply" / "help you complete and submit your application" — never "apply on your behalf" or "assess your visa eligibility," anywhere this tier is described (UI copy, messages to users, marketing).
6. **Does new copy make an outcome promise or imply a guarantee?** No "we'll get you approved," no vague success-rate claims, nothing that reads like the fake-precision fine print `Plan.md` documents actual scam operations using. If a refund or money-back framing is involved, check it's scoped the way `Legal.md` §3 already decided (Tier 3 only, not a general policy invented ad hoc).
7. **Did a user's question or a feature's own logic drift into genuine visa/residence-permit interpretation territory?** If so, that's a hard stop, not a "let's answer carefully" — the existing rule is refer to a licensed immigration lawyer, don't attempt an in-house answer no matter how confident the reasoning feels.

## What to do when something doesn't pass

Don't try to quietly patch around it by softening the wording alone if the underlying *function* is the problem (see the substance-not-labeling test above) — flag it plainly to the founder, the same way the original Tier 3 decision was flagged once, clearly, before being made. If it's a real gray area, say so and point at the specific `Legal.md` section it's closest to, rather than picking a side unilaterally. This mirrors how `novira-verify` treats an unverifiable claim: state what's actually uncertain instead of rounding up to confidence you don't have.
