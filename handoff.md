# EventHub — Handoff: Remaining Work

**Audience:** an LLM agent (or human) picking this project up after `ANTHROPIC_API_KEY` has been added to `.env.local`.
**Branch:** `vik/refactor` (pushed to origin). **Working tree should be clean when you start** — run `git status` first; if it isn't, stop and ask.
**State as of 2026-08-03:** the demo app is feature-complete and verified except for the items below. 95 Vitest tests, `tsc --noEmit`, `npm run lint`, and `next build` are all green. `docs/task-breakdown.md` is the living checklist — update its progress log when you finish.

There are three work items, in priority order:

1. **[Required] Live-verify the two AI features** (blocked until now on the API key)
2. **[Required] Replace the legacy Playwright E2E suite** (references the deleted auth flow; currently cannot pass)
3. **[Optional] Color-contrast audit** (TASK-29, carried over from the pre-demo task list)

---

## 0. Prerequisites & baseline (do this first)

1. Confirm the key is present (check the name only, never print the value):
   ```sh
   grep -c "^ANTHROPIC_API_KEY=." .env.local   # must print 1
   ```
   If it prints 0, stop and tell the user the key is missing or empty.
2. Run the key-independent baseline — all of these must pass before you change anything, so you know any later failure is yours:
   ```sh
   npm test              # expect: 11 files, 95 tests, all green
   npx tsc --noEmit      # expect: no output
   npm run lint          # expect: no warnings or errors
   ```
3. Seed demo data and start the dev server (env vars are read at server start — if a server is already running from before the key was added, kill it and start fresh):
   ```sh
   npm run seed          # idempotent; safe to re-run
   npm run dev
   ```
   Note the port it prints. It uses 3000 unless something is holding it (earlier sessions ran on 3001). Use whatever port it reports in all URLs below.

---

## 1. [Required] Live-verify AI-1 and AI-2

Both features are fully unit-tested against a **mocked** Anthropic SDK (`src/test/unit/ai.test.ts`) but have never run against the real API. The UI for both is key-gated: it only renders when `ANTHROPIC_API_KEY` is set, so the features appearing at all is the first check.

Implementation, if you need to read it: `src/lib/ai/nl-search.ts`, `src/lib/ai/describe-event.ts`, `src/lib/actions/ai.actions.ts`, `src/components/event/nl-search-form.tsx`, and the `aiEnabled` prop in `src/components/event/event-form.tsx`. Model is `claude-opus-4-8`; NL search uses structured outputs (`output_config.format` with a JSON schema).

### 1a. AI-2 — natural-language search (`/events`)

1. Open `/events`. **Expect:** a box labeled "Ask for events in plain English (AI-powered)" above the regular filter form. If it's absent, the server didn't pick up the key — restart the dev server.
2. Submit: `free tech events near Denver`.
   **Expect:** redirect to `/events?...` where the query string contains `near=denver` and `category=tech` (a `q=` and `radius=` may or may not be present — Claude decides; both are acceptable). The result list should show only Denver-area events (seeded data: "Denver TypeScript Meetup" should appear; Austin/Seattle events should not), with "km away" distance badges and the map centered on Denver.
3. Submit: `stuff to do outdoors in austin`.
   **Expect:** `near=austin` and `category=outdoors` in the URL; "Lady Bird Lake Kayak Social" in the results.
4. Fallback path — submit gibberish: `zzqx blorf`.
   **Expect:** graceful degradation, **never an error page**: redirect to `/events?q=zzqx+blorf` (plain text search, "No events found" with the widen-your-search message) — or, if Claude nulls everything out, `/events` with all events. Either is correct.
5. Empty input + submit. **Expect:** redirect to plain `/events`.
6. Watch the dev-server terminal output during these steps. **Expect:** no stack traces. (An occasional slow response is fine; the code has an 8s timeout that falls back to text search.)

### 1b. AI-1 — description drafting (create-event form)

1. Open `/dashboard/events/new`. **Expect:** a "Draft with AI" button to the right of the "Description" label. If absent, restart the dev server.
2. Click "Draft with AI" with the **title empty**. **Expect:** inline message "Add a title first, then draft a description." — no API call, no crash.
3. Enter title `Rooftop Salsa Night`, leave description empty, click "Draft with AI".
   **Expect:** the button shows a loading state, then the description textarea fills with ~40–90 words of flowing prose (no bullet points, no headers, no invented prices/times/names).
4. Now type rough notes **into the description field**: `live band, beginners welcome, drinks for purchase`, and click "Draft with AI" again.
   **Expect:** the draft is rewritten and incorporates the notes (band / beginner-friendly / drinks).
5. Finish the form (location, a future date/time) and click "Publish event".
   **Expect:** redirect to the organizer event page showing the AI-drafted description; the event also appears on `/events`.
6. Clean up if desired: on the organizer event page, use "Cancel event", or delete `data/eventhub-db.json` and re-run `npm run seed` for a pristine store.

### 1c. Record the result

- If everything passed: check off the remaining items in `docs/task-breakdown.md` §5 (edit the AI-1/AI-2 "Built" notes to remove the "*Live-API behavior not yet verified*" caveat) and append a dated line to the §8 progress log.
- If something failed: fix it in the `src/lib/ai/` modules (keep the fallback-on-any-failure contract intact — the demo must never break when the API misbehaves), re-run `npm test`, and only then update the docs.

### What NOT to try to verify

**AI-0 (the Claude-generated RSVP confirmation email)** cannot be exercised in demo mode even with the key: demo identities have no email address, so the email send is skipped by design (DEC-5), and sending would additionally require `EMAIL_PROVIDER_API_KEY` + `EMAIL_FROM_ADDRESS`. Leave it alone.

---

## 2. [Required] Replace the legacy Playwright E2E suite

`src/test/e2e/rsvp-flow.spec.ts` and parts of `src/test/e2e/accessibility.spec.ts` predate the demo refactor: they navigate to `/login`, fill email/password fields, and assert on "Sign in to RSVP" — all of which was removed (auth is gone; `/login` now redirects to `/events`). **These specs cannot pass and have never been run against the demo app.** `npm test` (Vitest) excludes them, which is why the suite is green anyway.

Rewrite them to the demo smoke defined in `docs/task-breakdown.md` §6:

1. Delete the login `beforeEach` blocks and every auth-dependent test/assertion. Identity in the demo is automatic — the middleware mints an `eh_uid` cookie on first request; Playwright's default per-test context gets one for free, and the same browser context is "the same user" across pages.
2. Cover this flow (one spec file is fine): browse `/events` → use the filter form (text + city + radius) and assert the filtered list + distance badges → open an event detail page → RSVP (button flips to Going, count increments) → `/my-rsvps` lists it → create an event via `/dashboard/events/new` (future date, publish) → the new event appears on `/events`.
3. In `accessibility.spec.ts`, drop the `/login` checks and keep/extend the axe scans for: `/`, `/events`, an event detail page, `/dashboard`, and `/dashboard/events/new`.
4. Tests must not depend on the user's live data file. Point the app at a throwaway store and seed it, e.g. run the dev/prod server for the test with `EVENTHUB_DATA_FILE=/tmp/e2e-db.json npm run seed && EVENTHUB_DATA_FILE=/tmp/e2e-db.json npm run dev` (check `playwright.config.ts` — if it has a `webServer` block, put the env var there).
5. Run them:
   ```sh
   npx playwright install --with-deps chromium   # first time only
   npm run test:e2e
   ```
6. Green E2E closes the last unchecked test-plan item in `docs/task-breakdown.md` §6 — note it in the progress log.

Skip testing the AI features in E2E (they cost real API calls per run); the map with a real key was already verified manually.

---

## 3. [Optional] TASK-29 — color-contrast audit

Carried over from the pre-demo task list (`.kiro/specs/event-hub-spec/tasks.md`, the only unchecked item there). If the user wants it:

1. Run Lighthouse (accessibility category) and/or axe against: `/`, `/events`, an event detail page, `/dashboard`, `/dashboard/events/new`.
2. Fix any contrast failures (the palette is Tailwind `neutral-*`; the likeliest offenders are `text-neutral-500`/`text-neutral-600` on tinted backgrounds and the amber/red status text).
3. Document results in `docs/accessibility-testing-checklist.md` and check TASK-29 off in `tasks.md`.

---

## 4. Finishing up

1. Full verification sweep — all must be green:
   ```sh
   npm test && npx tsc --noEmit && npm run lint && npm run build
   ```
2. Update `docs/task-breakdown.md` (checkboxes + a dated progress-log entry describing what you verified/changed).
3. Delete this `handoff.md` once every **[Required]** item above is done — it's a work order, not documentation.
4. Commit in logical groups with descriptive messages and push to `origin/vik/refactor`. Do not force-push; do not merge to `main` without asking the user.

## Reference: project conventions

- **Workflow is TDD** — for any code change beyond the verification above, write the failing test first (Vitest; integration tests use `MemoryStore` via `setStore()` from `@/lib/store` — see `src/test/integration/*.test.ts` for the pattern).
- **Graceful degradation is a hard requirement (DEC-5):** every external key (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, email keys) must be optional; keyless runs hide the feature, runtime failures fall back silently. Never let an AI/API failure surface as a broken page.
- **Data layer:** local JSON store (`data/eventhub-db.json`, gitignored) behind `src/lib/store/`; `src/lib/firebase/` is intentionally kept in-tree but unused at runtime — don't delete it, don't import it.
- **Docs:** `docs/task-breakdown.md` is the tracking doc; `docs/feature-map.md` is background; `.kiro/specs/event-hub-spec/tasks.md` is the older pre-demo list (done except TASK-29).
