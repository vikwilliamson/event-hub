# EventHub — Feature Map

**Date:** 2026-07-29 · **Branch:** `vik/refactor`
**Purpose:** Snapshot of what exists, what works, what's broken, and what's missing — the input to `docs/task-breakdown.md` for the demo-ready push.

Legend: ✅ complete · 🟡 partial / works-with-caveats · ❌ broken · ⬜ missing

---

## 1. Current architecture (as built)

- **Framework:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Data:** Firestore (`organizers/{uid}/events/{id}` + `rsvps` subcollection), accessed via Firebase Admin SDK in Server Components / Server Actions
- **Auth:** Firebase Auth (email/password) with server session cookies; middleware guards `/dashboard`
- **Email:** Resend, with a Claude-generated confirmation email (falls back to a plain template)
- **Testing:** Vitest v4 (unit + integration), Playwright (+axe) for E2E
- **Validation:** Zod schemas shared between forms and actions

> ⚠️ The demo pivot (see task breakdown) replaces Firestore + Firebase Auth with a **local file-backed store and a cookie-based demo identity**. Rows below note where that changes a feature's status.

## 2. Feature inventory

### Public / attendee

| Feature | Status | Notes |
|---|---|---|
| Home page (hero, how-it-works, CTAs) | ✅ | `src/app/(public)/page.tsx` |
| Browse events (upcoming/past split) | ✅ | `src/app/(public)/events/page.tsx`; no filtering/search of any kind |
| Event detail page | ✅ | `src/app/(public)/events/[id]/page.tsx`; looks up event across organizers |
| RSVP / cancel RSVP | 🟡 | Transactional, atomic count; **requires Firebase login** — blocks a friction-free demo |
| My RSVPs page | 🟡 | Live data via `getMyRsvps()`; requires login |
| RSVP confirmation email (AI-generated) | 🟡 | `src/lib/email/ai-confirmation.ts`; needs `ANTHROPIC_API_KEY` + `EMAIL_PROVIDER_API_KEY`; degrades gracefully |
| Event search (text) | ⬜ | Not built |
| Location / map-based discovery (meetup-style) | ⬜ | Not built; events store `location` as a free-text string only — no coordinates, no venue name |
| Event categories / tags | ⬜ | Not built |

### Organizer

| Feature | Status | Notes |
|---|---|---|
| Dashboard (my events list) | ✅ | `src/app/(organizer)/dashboard/page.tsx` |
| Create event (draft/publish, capacity) | ✅ | react-hook-form + Zod; dual-status submit |
| Edit event | ✅ | Ownership check; cancelled events blocked |
| Cancel event (+ attendee emails) | ✅ | Fire-and-forget cancellation emails |
| Publish/unpublish toggle | ✅ | `toggleEventStatus` |
| Attendee list | 🟡 | Merges RSVPs with Firebase Auth profiles — coupled to Firebase Auth admin API |
| Capacity enforcement on RSVP | ❌ | **Bug:** capacity is stored and displayed, but `rsvpEvent` never checks `rsvpCount >= capacity`. Events can oversell. |

### Auth & session

| Feature | Status | Notes |
|---|---|---|
| Register / login / session cookie | ✅ | Works, but is the main demo friction the pivot removes |
| Password reset page | 🟡 | Page exists (`(auth)/reset-password`) |
| Middleware route protection | ✅ | Cookie presence check only (no verification at the edge — verified server-side per action) |

### Platform / infrastructure

| Feature | Status | Notes |
|---|---|---|
| Env validation (`src/lib/env.ts`) | 🟡 | **Hard-requires Firebase vars outside development** — this is what kills the test suite (see §3) |
| Toast system (a11y aria-live) | ✅ | Context + reducer, `ToastRegion` |
| Loading skeletons | ✅ | All major routes |
| Error boundaries / error page / 404 | ✅ | |
| Observability (logger, analytics) | ✅ | `src/lib/observability/` |
| ESLint import boundaries | ✅ | Blocks admin SDK imports from components/hooks |
| Accessibility (reduced-motion, skip link, aria-live counts) | ✅ | TASK-29 (contrast audit) still open |
| Seed script | ❌ | `scripts/seed-standalone.ts` fails typecheck (crypto redeclare, missing fields) |

## 3. Health check (measured 2026-07-29)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ❌ 5 errors, all in `scripts/seed-standalone.ts` |
| `npm test` (Vitest) | ❌ **5/5 test files fail before running a single test** — importing any action pulls `src/lib/firebase/admin.ts` → `env.ts`, which throws without Firebase creds (NODE_ENV=test takes the throw path); `rsvp-button.a11y.test.tsx` also has a `vi.mock` hoisting bug (`mockUseRsvp` accessed before init) |
| `npm run test:e2e` | Not runnable without a configured Firebase project + emulators |

**Implication:** there is currently no working automated verification at all. Fixing the harness is a precondition for the TDD phase, and the local-store pivot removes the root cause (env/Firebase coupling at import time).

## 4. Notable code-review findings (bugs & optimization targets)

Tracked as DEMO-tasks in `docs/task-breakdown.md`:

1. **Capacity never enforced** — `rsvpEvent` increments `rsvpCount` without checking `capacity` (`src/lib/actions/rsvp.actions.ts`).
2. **Env validation crashes tests** — `env.ts` throws at import time when NODE_ENV≠development; test runs have NODE_ENV=test.
3. **`findEventById` is broken Firestore usage** — `collectionGroup("events").where("__name__", "==", eventId)` requires a full document path, not a bare ID, in a collection-group query; event detail lookups only work by accident of environment or not at all.
4. **Events list filters in memory** — `getAllPublishedEvents` fetches every event ever, then splits upcoming/past in the page; no pagination.
5. **`getUserRsvpStatus` counts cancelled RSVPs as attending** — it checks `!!rsvp` but never checks `cancelledAt`, so a user who cancelled sees "attending" state.
6. **`cancelRsvp` double-decrement risk** — no guard against cancelling an already-cancelled RSVP inside the transaction (pre-check happens outside it).
7. **Duplicate analytics modules** — `src/lib/analytics.ts` and `src/lib/observability/analytics.ts` overlap.
8. **`src/app/api/test-env/route.ts`** — debug endpoint leaking env presence; must not ship in a demo.
9. **`optimized-queries.ts`** — orphaned after the page that used it was deleted (TASK-26); dead code.
10. **Mock hoisting bug** in `rsvp-button.a11y.test.tsx`.

## 5. Gap summary vs. demo goal

The demo goal (friction-free local demo + map-based discovery) needs, in order:

1. **Local persistence, no auth** — file-backed store + auto-minted demo identity cookie (replaces Firebase at runtime; the `organizers/{uid}` nesting flattens to an `organizerId` field).
2. **Discovery** — text search, category filter, and geo search (coordinates on events, haversine radius filter, Google Maps map view with graceful no-API-key fallback).
3. **Working test suite** — decoupled from Firebase/env, then TDD coverage of all documented behavior.
4. **Seeded demo data** — realistic events with coordinates so the map/search demo lands.

AI-powered feature suggestions from this spike are documented in `docs/task-breakdown.md` §5.
