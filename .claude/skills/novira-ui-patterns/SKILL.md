---
name: novira-ui-patterns
description: Use this before adding or moving any floating/fixed-position UI (toasts, notices, badges, floating action buttons), before picking colors for new UI, or before any other non-trivial layout/UX decision in the NOVIRA frontend. Covers the existing map of fixed-position elements (so a new one doesn't collide with one already there), the app's real color conventions, and the DaisyUI component primitives this app already depends on but under-uses.
---

# NOVIRA UI/UX patterns

Found live 2026-11-08/09: a staleness note was hand-placed at `fixed bottom-20 left-5`, directly stacked above an existing floating Save button at `fixed bottom-5 left-5`, with no check first for what else already lived in that corner or whether the project had a component built for exactly this. The project depends on `daisyui` (`^5.6.3`, plain `@plugin "daisyui"` in `globals.css`, no theme customization) but nothing in the codebase actually uses its `toast`/`alert` components — every floating element in the app, including that one, is a one-off `fixed` div with hand-picked coordinates. That's the actual root cause of repeated placement misses: no shared system, not a missing capability. This skill is that system.

## 1. The current map of fixed-position elements (check before adding a new one)

Re-grepped and refreshed 2026-11-09 — was stale (missing the toast row below).

| Element | Position | File |
|---|---|---|
| `FloatingContactButton` | `bottom-5 right-5` (hidden on `/account/messages` — that page already *is* the same `MessagesPanel` the drawer opens) | `site-nav.tsx` |
| Its slide-up drawer | `inset-0` (full overlay) | `site-nav.tsx` |
| Profile page floating Save button | `bottom-5 left-5` | `editable-profile-section.tsx` |
| CV-content staleness notice | `toast toast-bottom toast-center` (the real DaisyUI toast §2 describes — not a hand-rolled `fixed` div) | `editable-profile-section.tsx` |
| Sticky nav header | `sticky top-0 z-50` | `site-nav.tsx` |

Both bottom corners are claimed. A new floating notice belongs at `toast-bottom toast-center` (see §2) or, if it must be a corner, check this table is still current first — it will drift as the app grows, so re-grep before trusting it stale:
```
grep -rn "fixed bottom\|fixed top\|z-40\|z-50" src --include="*.tsx"
```

`z-40` is the house z-index for floating chrome; `z-50` is reserved for the sticky nav itself (see `germany-matches-map.tsx`'s own comment on why — Leaflet's internal z-index values once painted over the nav until `isolate` contained them). Anything floating should stay at `z-40` or below unless it has a specific, documented reason to sit above the nav.

## 2. Use DaisyUI's actual components, not a hand-rolled `fixed` div

DaisyUI ships purpose-built primitives for exactly the "floating notice" pattern this app keeps reinventing. Use the real ones:

- **Toast container** (positions and stacks multiple notices automatically — no manual `fixed`/coordinates needed): `<div class="toast toast-{top|middle|bottom} toast-{start|center|end}">`. Verified against the live docs (daisyui.com/components/toast, v5.7.50) — exact classes: `toast-top`/`toast-middle`/`toast-bottom` (vertical), `toast-start`/`toast-center`/`toast-end` (horizontal). `toast-end`/`toast-bottom` are the defaults if omitted.
- **Alert content** (the thing inside a toast, or a standalone inline notice): `<div role="alert" class="alert alert-{info|success|warning|error}">`. Also supports `alert-soft`/`alert-outline`/`alert-dash` style variants.

**Known gap in this app: the DaisyUI theme is unthemed** (no custom theme block in `globals.css`), so `alert-warning`/`alert-error`'s stock DaisyUI colors won't visually match the app's own established palette (§3). Use DaisyUI's *structural* classes (`toast`, `alert`, `role="alert"`) for positioning/stacking/semantics, but keep the app's own Tailwind color utilities on top for the actual look — don't let an unthemed DaisyUI default suddenly look like a different app. (The real fix — giving DaisyUI a custom theme matching the emerald/red/amber palette below, so `alert-*`/`btn-*` just work — is a bigger, separate project-wide decision; don't do it as a side effect of one small fix.)

## 3. Established color semantics (from a real grep of actual usage, not guessed)

| Color | Meaning | Real usage count |
|---|---|---|
| `emerald` (50/300/400/500) | Brand/primary, success, CTAs | ~230 uses — the dominant color |
| `slate` | Neutral — backgrounds, borders, body text | ~180 uses |
| `red` (50/500/600) | Error, destructive, hard-stop | ~20 uses |
| `amber` (50/100) | Caution, review-this, non-blocking warning | ~15 uses |
| `sky` | Occasional info accent | rare |

A "you should double-check this" notice (non-blocking, nothing failed) is `amber`, not `red` — `red` reads as "something broke," which overstates a reminder. Re-grep before trusting these counts stale: `grep -rohE "bg-(emerald|red|amber|slate|sky|blue|indigo|yellow)-[0-9]+" src --include="*.tsx" | sort | uniq -c | sort -rn`.

**Deliberate exceptions found live 2026-11-09** (don't "fix" these back to the five above without re-reading why first — each has its own reasoning in a comment at the cited line):
- `yellow` (`tier3-request.tsx` ~line 233) — the Tier 3 request card on `/account`, tying it visually to the Gold/Tier3 medallion banner above it. Gold-tier branding, not a caution/warning use of yellow.
- `blue` (`editable-profile-section.tsx` ~line 782) — the floating Save button's idle/ready-to-save state, kept visually distinct from its own `emerald` (just saved) and `red` (save failed) states. Reusing `emerald` for both "ready" and "just succeeded" would blur that feedback.
- `indigo` (`admin/tier3-cases.tsx` `STATUS_STYLES`) — the Tier 3 case pipeline has 8 distinct stages; the 5-color core palette doesn't have enough non-conflicting hues to keep all 8 visually distinct on this admin-only (not customer-facing) status board.

One real fix came out of the same pass: `EligibilityChecklist.tsx`'s `fixed` status was `blue` with no stated reason — switched to `sky` (the existing "info accent" color already covers "distinct from met/addressable, not an error").

## 4. Research before placing, every time — not just for big redesigns

The navbar mobile-overflow fix (2026-11-07) got this right: real research into hamburger-vs-scroll-strip tradeoffs before writing code, presented as a recommendation before implementing. The staleness-note placement skipped that step because it felt too small to deserve it — that was the mistake, not a one-off. Any new floating/toast/alert element, however small, gets the same two-step treatment: check §1's map for collisions, then confirm the DaisyUI (or other established pattern) class names against the real docs (WebFetch/the `web-fetch` agent) before writing them — never guess a class name and hope it's right, the way `toast-bottom`'s existence genuinely needed checking rather than assuming.
