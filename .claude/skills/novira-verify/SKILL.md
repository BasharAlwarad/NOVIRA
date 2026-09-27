---
name: novira-verify
description: Use this before telling the founder that any code change, bug fix, or new feature in the NOVIRA repo actually works — the moment you're about to write "fixed," "working," "verified," or "done" about something in this codebase, stop and run this checklist first. Also use it when writing a throwaway verification script, deciding whether a real paid Claude API call is needed for a test, or checking a UI change with Playwright. Covers: real HTTP/Playwright verification against the live dev servers (never code-inspection alone), where throwaway scripts live and when to delete them, cleaning up test data and confirming the cleanup worked, when to skip expensive AI calls in a test, and a real recurring Playwright gotcha in this codebase (CSS text-transform breaking innerText() matches).
---

# NOVIRA verification discipline

This project has a real, repeated history of bugs that only got caught because something was checked against the live app instead of trusted on sight — a JSX whitespace bug that silently swallowed a space, a rate-limit fix that looked right until an actual concurrent race was fired at it, an EF migration that compiled fine but left a column un-nullable. It also has a history of *false* bugs — Playwright checks that failed because of a CSS quirk, not an app defect. Both directions are why this discipline exists: it catches real problems and prevents chasing fake ones.

Skim this before writing the sentence that says something works. It's short by design — the point is to interrupt the moment of claiming success, not to become its own research project.

## 1. Verify against the real, running app — not the code

Before saying a fix or feature works, confirm it against the actual live dev servers:
- Backend: `http://localhost:5080` (check it's up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/`)
- Frontend: `http://localhost:3000`

"The code looks right," a passing type-check, or reasoning through the logic in your head are not verification — they're the reason you have a hypothesis worth testing, not the test itself. Use a real `curl` call for an API change, or a real Playwright session for a UI change. If a paid step is involved (see §4), use real judgment about what specifically needs the real call versus what can be tested downstream of it.

## 2. Throwaway scripts: `frontend/verify/`, then gone

Ad-hoc verification scripts (Playwright sessions, one-off API sequences) go in `frontend/verify/` (gitignored). Run with `node verify/whatever.mjs`, or `npx tsx` for a script that imports TypeScript source directly (e.g. to sanity-check a `lib/` function against sample data without going through the UI).

Delete the script — and any screenshots it produced — the moment you're done with it. The folder should be empty between tasks. This isn't tidiness for its own sake: a stale script from a previous fix is easy to mistake for something still relevant, and the whole point of this pattern is that verification is disposable, not a growing parallel test suite nobody maintains.

## 3. Clean up test data, and verify the cleanup too

Any account, document, or opportunity row created purely to verify something must be deleted afterward through the real delete endpoint — not left sitting in the database as debris.

Then check that the deletion actually happened: a follow-up `GET` that now returns 404, or a direct query confirming zero rows. Don't assume a `DELETE` call succeeded just because it returned without an error — the same "verify for real" standard that applies to the fix itself applies to cleaning up after checking it.

## 4. Don't spend real money re-testing what isn't the AI's fault

If a fix is entirely downstream of an expensive step — document data already extracted by Claude, a University-research run already completed — and that expensive step isn't what changed, don't re-trigger it. Seed the database directly with realistic data shaped like what that step would have produced, and test the actual thing that changed against that.

Reserve a real, paid Claude API call for when the AI call itself is genuinely what's under test — a prompt change, a new extraction field, different model/parameters. Spending real money to re-verify logic that never touches the AI wastes the founder's Anthropic credit for zero additional confidence.

## 5. Playwright: match structure, not text — this codebase has a real recurring gotcha

`element.innerText()` reflects the browser's *rendered* text, including CSS transforms — a Tailwind `uppercase` class turns `"Work"` into `"WORK"` in what `innerText()` returns, even though the JSX literally wrote `"Work"`. This has produced false-negative "bugs" more than once in this project: the check failed, the app was actually fine.

Prefer asserting on rendered DOM elements/structure (an element exists, a specific card count, an href value) over raw case-sensitive substring matches on text content. If a text-based check fails, before concluding the app is broken, dump the actual rendered HTML/text and look at what's really there — it may be a test-script problem, not an app one.

## 6. Report only what you actually observed

State outcomes based on the real thing you saw: an actual HTTP status code, actual rendered DOM content, an actual re-queried database row. Don't round up "the request should return 200" or "this should now show the new banner" to a claim that it does. If verification wasn't possible for some reason (e.g. no Anthropic credit left, as has happened in this project), say that plainly instead of reporting confidence you don't have.
