# EventHub — Demo Push Task Breakdown

**Date:** 2026-07-29 · **Status:** Living document — check items off as they land.
**Input:** `docs/feature-map.md` · **Goal:** a demo-ready event discovery app: local persistence (no auth), meetup-style map/location search, all documented behavior covered by tests (TDD: tests first, then code to green).

---

## 1. Guiding decisions

1. **Local persistence (DEC-1).** Firestore + Firebase Auth are replaced at runtime by a JSON-file-backed store (`data/eventhub-db.json`, gitignored) behind a small repository interface in `src/lib/store/`. Server Actions keep their signatures and result shapes; only the data layer underneath changes. Tests run the same store in-memory (or against a temp file). The `src/lib/firebase/` directory stays in the tree but nothing imports it at runtime — restoring Firebase later is a data-layer swap, not a rewrite.
2. **Identity without auth (DEC-2).** Middleware mints an `eh_uid` cookie (UUID) on first visit. `getDemoSession()` reads it — every visitor is implicitly "logged in" as a local demo user and can both organize events and RSVP. The `(auth)` routes (login/register/reset) are removed from the demo flow; `/dashboard` no longer redirects.
3. **Flat data model (DEC-3).** `organizers/{uid}/events/{id}` flattens to one `events` collection with an `organizerId` field; RSVPs to one `rsvps` collection keyed `${eventId}_${userId}`. Actions that took `(eventId, organizerId)` keep working (organizerId becomes advisory/ignored for lookup).
4. **Maps degrade gracefully (DEC-4).** All geo logic (distance, radius filter, sorting) is pure TypeScript and fully testable without any API key. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` only unlocks the visual map + geocoding autocomplete; without it, the demo still does location search via seeded city coordinates.
5. **Email/AI remain optional (DEC-5).** Email sending and the AI confirmation already degrade without keys; the demo user has no real email, so email calls are skipped when the session has no email address.

## 2. Phase A — Repair the foundation

- [x] **DEMO-1: Fix env validation for keyless/test runs.** `src/lib/env.ts`: make Firebase vars optional (runtime no longer needs them), stop throwing at import time in test; keep warnings. *(Root cause of the all-red test suite.)*
- [x] **DEMO-2: Fix typecheck.** `scripts/seed-standalone.ts` errors (crypto redeclare, missing `cancelledAt`/`publishedAt`). Superseded by the new seed script in DEMO-12 — delete the old script.
- [x] **DEMO-3: Fix `vi.mock` hoisting bug** in `src/test/unit/rsvp-button.a11y.test.tsx` (`mockUseRsvp` accessed before initialization).
- [x] **DEMO-4: Remove dead/debug code.** `src/lib/firebase/optimized-queries.ts` (orphaned), `src/lib/analytics.ts` (duplicate of `observability/analytics.ts` — keep whichever `analytics-dashboard.tsx` imports), `src/app/api/test-env/route.ts` (env-leaking debug endpoint).

## 3. Phase B — Local persistence, no auth (DEC-1/2/3)

- [x] **DEMO-5: Store module** `src/lib/store/`:
  - `types.ts` — reuse domain `Event`/`Rsvp` (moved out of `firebase/types.ts` into `src/lib/types.ts`), plus `User { id, displayName }`; `Event` gains `venueName?`, `lat?`, `lng?`, `category?`.
  - `store.ts` — `JsonFileStore`: load-on-first-use, atomic write (temp file + rename), serialized mutations via an in-process queue; `MemoryStore` for tests; both behind a `Store` interface (`getEvent`, `listEvents`, `saveEvent`, `getRsvp`, `listRsvpsByUser`, `listRsvpsByEvent`, `saveRsvp`, `getUser`, `saveUser`, `transaction`-style `mutate()`).
  - Path from `EVENTHUB_DATA_FILE` env (tests point it at a temp file; defaults to `data/eventhub-db.json`).
- [x] **DEMO-6: Demo session** `src/lib/session.ts`: `getDemoSession()` reads `eh_uid` cookie; middleware mints the cookie + creates the user record lazily; display-name defaults to "Demo Organizer"-style generated name, editable later if time allows.
- [x] **DEMO-7: Port server actions to the store**, preserving result shapes:
  - `event.actions.ts`: create/update/cancel/toggle/getOrganizerEvents — plus **fix**: publish transitions set `publishedAt` once (existing behavior preserved).
  - `rsvp.actions.ts`: rsvp/cancel/myRsvps/attendees/status — plus **bug fixes** from the feature map: **capacity enforced** (reject when `rsvpCount >= capacity`), **cancelled RSVPs don't count as attending** (`getUserRsvpStatus` checks `cancelledAt`), **no double-decrement** (cancel of already-cancelled RSVP rejected atomically), **re-RSVP after cancel works** (reactivates record, increments count).
  - `public` reads: `getAllPublishedEvents` / `findEventById` move to the store (fixes the broken `__name__` collection-group query).
  - Attendee names come from the local `users` collection instead of Firebase Auth admin.
- [x] **DEMO-8: UI/auth cleanup.** Middleware mints identity instead of guarding; header/nav drops Sign in/Sign up for a demo-identity badge; `(auth)` pages removed from nav (routes can 404 or redirect to `/events`); dashboard reachable directly.

## 4. Phase C — Discovery: search, location, maps (DEC-4)

- [x] **DEMO-9: Geo/search core** `src/lib/geo.ts` + `src/lib/search.ts` (pure, fully unit-tested):
  - `haversineKm(a, b)`; `filterByRadius(events, center, radiusKm)`;
  - `searchEvents(events, { text?, category?, near?, radiusKm?, when? })` — text matches title/description/venue/location (case-insensitive), category exact, radius filter when center given, sorted by soonest start (or by distance when a center is given).
- [x] **DEMO-10: Search UI on `/events`.** Search box + category select + location select (seeded city list) + radius select, driven by URL search params (server-rendered filtering, shareable URLs). Distance badges on cards when a center is active.
- [x] **DEMO-11: Map view.** `EventsMap` client component: Google Maps JS API when key present (markers per event, click → detail); without key, renders the list-only fallback with a notice. Event form gains optional venue/lat/lng/category fields.
- [x] **DEMO-12: Seed script** `scripts/seed.ts` (`npm run seed`): 12 realistic events across 7 cities with real coordinates, mixed categories/dates/capacities, written through the store (via `tsx`). Idempotent: re-running refreshes seed events without touching user-created data. Legacy Firebase seed scripts deleted.

## 5. AI feature suggestions (spike output)

Already built: Claude-generated RSVP confirmation email (`src/lib/email/ai-confirmation.ts`).

| # | Suggestion | Value | Effort | Recommendation |
|---|---|---|---|---|
| AI-1 | **Event description writer** — organizer types a title + bullet points, Claude drafts the description in the create form | High demo wow, low risk | S | **Recommended next** (post-demo or stretch) |
| AI-2 | **Natural-language search** — "free tech events near Denver this weekend" → Claude extracts `{text, category, near, radiusKm, when}` and feeds the existing `searchEvents` | Strong fit: reuses DEMO-9 as the deterministic backend | M | **Recommended** stretch |
| AI-3 | **Personalized recommendations** — rank upcoming events from the user's RSVP history (categories/locations) | Needs usage data; weak in a fresh demo | M | Later |
| AI-4 | **Auto-categorization/tagging** on event create | Small quality-of-life | S | Later |
| AI-5 | **Event concierge chat** — Q&A over event details ("is there parking?") | Needs richer event data | L | Later |

Decision: demo ships with AI-0 (existing email, key-gated). AI-1/AI-2 are stretch goals, only after all tests are green.

**Built (2026-08-03):**
- **AI-1 shipped** — `src/lib/ai/describe-event.ts` + `draftEventDescription` server action; "Draft with AI" button on the create form (title + existing description text as notes → drafted description fills the field). Key-gated: button renders only when `ANTHROPIC_API_KEY` is set.
- **AI-2 shipped** — `src/lib/ai/nl-search.ts` + `nlSearch` server action; "Ask in plain English" box on `/events`. Claude (`claude-opus-4-8`, structured outputs) extracts `{text, category, city, radiusKm}`, which redirects to the same shareable `/events?q=&category=&near=&radius=` URLs the filter form produces — `searchEvents` stays the deterministic backend. Every failure mode (no key, timeout, refusal, malformed output, unknown city/category) falls back to a plain text search.
- Tests: 13 unit tests (`src/test/unit/ai.test.ts`) with a mocked SDK — extraction mapping, clamping, field-level dropping, all fallback paths, plus two schema-shape guards (see below). **Live-API behavior verified 2026-08-03** against a real `ANTHROPIC_API_KEY`: AI-1 drafts 40–90-word prose (with and without notes; empty-title guard fires); AI-2 extracts correct filters ("free tech events near Denver" → `category=tech&near=denver`, "stuff to do outdoors in austin" → `category=outdoors&near=austin`) and falls back gracefully on gibberish/empty input.
- **Fixed during live verification:** the structured-output JSON schema declared nullable enums as `type: ["string","null"]` + `enum`, which the API's schema validator rejects (`Enum value 'tech' does not match declared type`). AI-2 had silently fallen back to text search on *every* query. Rewrote the nullable enum/number fields to the documented `anyOf: [{type,enum},{type:"null"}]` form; added two tests asserting the exported `EXTRACTION_JSON_SCHEMA` never combines array-form `type` with `enum` and keeps every field nullable.

## 6. Test plan (write first — red, then implement to green)

Unit (`src/test/unit/`):
- `geo.test.ts` — haversine known distances (±1%), zero distance, radius edge (exactly at boundary included).
- `search.test.ts` — text matching fields + case, category filter, radius filter, combined filters, sort by date vs distance, empty query returns all published.
- `store.test.ts` — CRUD round-trips, persistence across instances (file), atomic `mutate` serialization (concurrent RSVPs don't lose updates), missing-file bootstrap.
- `event-schema.test.ts` — validation: required fields, capacity coercion, lat/lng bounds, category optional.
- `rsvp-button.a11y.test.tsx` — existing, repaired (DEMO-3).

Integration (`src/test/integration/`, actions against `MemoryStore` + stubbed session):
- `create-event.test.ts` — create draft/published, publishedAt set once, validation errors surface fieldErrors, unauthenticated (no cookie) rejected.
- `edit-event.test.ts` — update, ownership enforced (other user's event → not found), cancelled events uneditable.
- `cancel-event.test.ts` — cancel sets status/cancelledAt; double-cancel rejected.
- `rsvp-flow.test.ts` — rsvp increments count; duplicate rsvp rejected; **capacity full → rejected**; cancel decrements once, double-cancel rejected; re-RSVP after cancel works; `getUserRsvpStatus` false after cancel; my-rsvps lists only mine; attendees lists confirmed only, organizer-scoped.
- `public-reads.test.ts` — only published events listed; `findEventById` finds published, hides drafts.
- `session.test.ts` — cookie minting/reading, stable identity across requests.

E2E (Playwright, demo smoke, no external services): browse → search with filters → open detail → RSVP → my-rsvps → create event → see it on /events. Accessibility spec retained. **Done 2026-08-03** — `src/test/e2e/demo-smoke.spec.ts` (browse+filter with distance badges; create→list→RSVP→my-rsvps, self-isolating via a uniquely-titled event) and a rewritten `accessibility.spec.ts` (axe scans of `/`, `/events`, event detail, `/dashboard`, `/dashboard/events/new`). Legacy auth-based `rsvp-flow.spec.ts` deleted. Server runs on a throwaway `EVENTHUB_DATA_FILE` on port 3100 (never touches the user's data/dev server). 9/9 green.

## 7. Demo-ready checklist

- [x] `npm test` green (84 tests); `npx tsc --noEmit` clean; `npm run lint` clean; `next build` green
- [x] `npm run seed && npm run dev` works with an empty `.env.local`
- [x] Browse, search (text/category/location+radius), map fallback, event detail, RSVP/cancel, my RSVPs, create/edit/cancel/publish event — all functional with zero sign-in (smoke-tested against the production build + integration suite)
- [x] Map renders markers when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set — verified in Chrome with a real key: base tiles, one marker per mappable event, click-through to detail, centered view on city search
- [x] README updated: demo quickstart + env table (all keys optional)

## 8. Progress log

- 2026-07-29 — Doc created; feature map (`docs/feature-map.md`) complete; harness confirmed all-red (env coupling), typecheck failing in old seed script.
- 2026-08-02 — **Phases B & C complete; demo-ready.** Phase B had landed in the working tree (store, session, ported actions, auth cleanup, geo/search core — all TDD'd, 76 tests). This session finished Phase C: `parseEventSearchParams` (URL → search query, tests first), `/events` ported off Firebase onto the store with server-rendered search UI (text/category/city/radius, shareable URLs, distance badges), `EventsMap` (Google Maps when keyed, fallback notice otherwise), venue/category/lat/lng fields on create+edit forms, `scripts/seed.ts` + `npm run seed` (tsx; legacy Firebase seed scripts deleted), `data/` gitignored, README rewritten for the keyless demo. Verified: 84 tests green, tsc clean, lint clean, `next build` green, prod-server smoke test of seeded browse + filtered search passed. Remaining: verify map markers with a real Maps key; AI-1/AI-2 stretch goals.
- 2026-08-02 (later) — **Map verified with a real key; demo checklist fully closed.** Work committed in 7 phase-shaped commits on `vik/refactor`. Env key renamed to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (must be `NEXT_PUBLIC_` to reach the client). Fixed `EventsMap` loader: with `loading=async` the script's `load` event fires before `google.maps` is fully populated, so the loader now uses the documented `callback=` param plus a module-cached promise (also removes the StrictMode double-mount race); markers migrated to `AdvancedMarkerElement` via `importLibrary`. Verified in Chrome: base map + markers for all metros, marker click → event detail, Denver search centers the map and filters/sorts the list with distance badges. 84 tests, tsc, lint, build all green. Remaining: AI-1/AI-2 stretch goals.
- 2026-08-06 (later) — **AI-2 zero-result safety net + full a11y audit.** Added a deterministic guardrail for the NL search: `widenSearchParamsIfEmpty` (in `nl-search.ts`, unit-tested) — when the extracted params combine a `q` term with a category/city but return no results, it retries once without `q` and prefers the widened params if they match (a bare `q` with no other filter is left alone as a legitimate empty result). Wired into the `nlSearch` action after extraction. Separately, ran a full `@axe-core/playwright` audit (WCAG 2.0/2.1 A & AA + best-practice + color-contrast) across `/`, `/events`, event detail, `/my-rsvps`, `/dashboard`, `/dashboard/events/new`, and the create form's error state — **0 violations**. Fixed a heading-order skip on `/my-rsvps` (sr-only h2, same as the earlier dashboard fix) found by the audit, and added `/my-rsvps` to the permanent accessibility E2E scans. 102 unit tests, 9/9 E2E, tsc, lint, build all green.
- 2026-08-06 — **AI-2 fix: qualifier words no longer zero out results.** Reported bug: natural-language searches like "free tech events near Denver" returned no results. Root cause: Claude put non-content qualifier words ("free") into the `text`/`q` field, which `searchEvents` applies as a literal substring match AND-ed with category/city — and no seeded event contains "free", so the otherwise-matching `category=tech&near=denver` results were filtered to zero (the app has no price concept, so "free" had nowhere valid to go). Fix is in the extraction guidance only (deterministic backend and shareable-URL contract unchanged): strengthened the `parseNaturalSearch` system prompt and the `text` field's schema description to explain the literal-substring/AND semantics and to instruct Claude to reserve `text` for distinctive content words and drop generic qualifiers (free/cheap/fun/best/things to do/this weekend/…). Live-verified: "free tech events near Denver" now returns the tech meetup; "cheap fun things to do in Austin" returns Austin events; distinctive keywords (kayak, jazz, pitch, salsa) are still extracted. 97 unit tests, tsc, lint green.
- 2026-08-03 (later still) — **TASK-29 color-contrast audit complete — PASS, no fixes needed.** Ran an `axe-core` color-contrast scan across `/`, `/events`, event detail, `/dashboard`, `/dashboard/events/new` (0 violations) and computed WCAG ratios for the transient amber/red/green status colors axe can't see in a static scan — all meet AA. Only `green-600` stat numbers are borderline (3.30:1), passing as large text (`text-3xl` bold). Documented the full results table in `docs/accessibility-testing-checklist.md` and checked TASK-29 off in `.kiro/specs/event-hub-spec/tasks.md` (its last open item). `/login`/`/register` from the original TASK-29 scope no longer exist post-refactor.
- 2026-08-03 (later) — **Playwright E2E suite replaced; two real a11y bugs fixed.** Deleted the legacy auth-based `rsvp-flow.spec.ts` (navigated a removed `/login` flow) and rewrote the E2E to the demo smoke: `demo-smoke.spec.ts` (browse+filter+distance badges; create→publish→appears-on-/events→RSVP→count increments→my-rsvps, isolated via a uniquely-titled event so it's deterministic under parallel workers) and a rewritten `accessibility.spec.ts` (axe scans of `/`, `/events`, event detail, `/dashboard`, `/dashboard/events/new` — no more `/login`). `playwright.config.ts` now seeds and serves a throwaway `EVENTHUB_DATA_FILE` on port 3100 (chromium only), so the suite never touches the user's live store or :3000 dev server. The axe scans (never run against the demo before) surfaced two genuine violations, both fixed: the toast region (`toast-region.tsx`) had `aria-label` on a role-less div (added `role="status"`), and the dashboard jumped h1→h3 (added an sr-only h2 "Overview"). 9/9 E2E green; 97 unit tests, tsc, lint, build all green.
- 2026-08-03 — **AI-1/AI-2 live-verified against the real Anthropic API; AI-2 schema bug fixed.** Exercised both modules directly against a real `ANTHROPIC_API_KEY`. AI-1 (description drafting) worked as-is. AI-2 (NL search) was silently falling back to plain text search for every query: the structured-output schema combined `type: ["string","null"]` with `enum`, which the API rejects with a 400 (`Enum value 'tech' does not match declared type`). Fixed by moving nullable fields to `anyOf` form (`src/lib/ai/nl-search.ts`); exported `EXTRACTION_JSON_SCHEMA` and added two schema-shape guard tests (mocked SDK can't catch API-side schema validation). Both features confirmed rendering (key-gated) via the running dev server. 97 tests, tsc, lint all green.
- 2026-07-30 — **Phase A complete.** Env made key-optional (throws only in production); Firebase admin guards missing creds at call time; dead code deleted (`seed-standalone.ts`, `optimized-queries.ts`, `lib/analytics.ts`, `api/test-env`); `vi.mock` hoisting fixed via `vi.hoisted`; Playwright specs excluded from Vitest; lint errors fixed (`logger.ts`/`analytics-dashboard.tsx` `any`s, `error-boundary.tsx` entity). Status: `tsc` clean, `next build` green, unit tests 8/8 passing. Remaining 12 failures are the legacy Firestore-emulator integration tests (`create-event.test.ts`, `rsvp-flow.test.ts`) — they require live Firebase and are replaced by store-backed tests in Phase B/TDD.
