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

**Never start or stop the backend on port 5080 yourself** — found live 2026-09-29: the founder runs their own backend in their own terminal and leaves it running across a whole working session, and starting/stopping an instance there on their behalf either silently kills theirs or leaves port 5080 down when they next expect it up, forcing them to notice and restart it by hand every time. Port 5080 is the founder's; treat whatever is bound there as off-limits regardless of whether you recognize it as "yours."

For backend-only verification (a `curl` check against an endpoint), run your own throwaway instance on a separate port instead, against the same database — this is safe, since verification only ever adds/removes real rows through real endpoints and cleans them up (§3). **`dotnet run --urls http://localhost:5090` does NOT work for this** — it still builds to the default `bin/Debug/net9.0` output first, colliding with the founder's locked binary exactly like a plain `dotnet build` does. Use the two-step form instead (confirmed working live 2026-09-29):
```
dotnet build -o bin/verify-build
ASPNETCORE_ENVIRONMENT=Development dotnet bin/verify-build/Novira.Backend.dll --urls http://localhost:5090
```
The `ASPNETCORE_ENVIRONMENT=Development` is required — running the built DLL directly (unlike `dotnet run`) skips `Properties/launchSettings.json`, which is what normally sets it, and without it user-secrets (Admin key, Stripe key, etc.) silently fail to load. Track the exact PID this reports (e.g. via `Get-NetTCPConnection -LocalPort 5090`) and only ever stop that PID — never "whatever process is holding a port." Delete `bin/verify-build` when done, same disposability discipline as §2.

For a Playwright check that only needs the founder's already-current frontend+backend, don't spin up your own — the frontend's `API_BASE_URL` (`frontend/.env.local`) is fixed to `http://localhost:5080`, so a Playwright session against `localhost:3000` always exercises whatever is already running there. Ask the founder to confirm their backend is up first, rather than starting one yourself on their port.

**When the feature under test needs backend code the founder hasn't restarted into yet**, a fully isolated frontend+backend pair works (confirmed live 2026-09-29) — but `next dev` refuses a second instance outright (`Another next dev server is already running`, a project-directory-keyed lock, not port-keyed, so `-p 3001` doesn't help). Use a **production** server on the second port instead, which has no such lock:
```
npm run build   # only if there are frontend changes since the last build
API_BASE_URL=http://localhost:5090 npm run start -- -p 3001
```
paired with your own isolated backend on 5090 (see above). This gives a fully separate stack end to end — never touches the founder's port 3000 or 5080 — for exercising a real signed-in session (magic link + cookie) through actual rendered UI.

**`dotnet build` also collides with the founder's running instance** — found live 2026-09-29: their running `Novira.Backend.exe` holds a file lock on `bin/Debug/net9.0/Novira.Backend.exe`, so a plain `dotnet build` while they're running fails with `MSB3027`/`MSB3021` ("file is locked by..."). This isn't the file-lock-from-a-stale-process case this skill used to just `Stop-Process` through — that PID is now off-limits. Build to a separate output folder instead, which sidesteps the lock entirely: `dotnet build -o bin/verify-build`. Delete that folder when done, same disposability discipline as §2's verify scripts.

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
