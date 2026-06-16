# EventHub — Tasks

**Version:** 1.0 · **Status:** Living Document  
Tasks are organized by priority tier. Tier 1 items block basic functionality. Tier 2 items are missing MVP features. Tier 3 items are polish, optimization, and the AI feature.

---

## Tier 1 — Bugs & Broken Things (Fix First)

These tasks address things that are actively wrong or bypassed in the current codebase.

- [x] **TASK-1: Re-enable middleware route protection**
  - File: `src/middleware.ts`
  - Fix: Check for session cookie presence on all `/(organizer)/` routes; redirect to `/login` if missing

- [x] **TASK-2: Fix login redirect path**
  - File: `src/components/auth/login-form.tsx`
  - Fix: Changed to `router.push("/dashboard")`

- [x] **TASK-3: Scope `createEvent` to the authenticated organizer**
  - File: `src/lib/actions/event.actions.ts`
  - Fix: Reads `organizerId` from `getSession()` inside the action; returns auth error if no session

- [x] **TASK-4: Scope `getOrganizerEvents` to the authenticated organizer**
  - File: `src/lib/actions/event.actions.ts`
  - Fix: Reads `organizerId` from `getSession()`; queries only `organizers/{uid}/events`

- [x] **TASK-5: Fix `rsvpCount` increment to use `FieldValue.increment(1)`**
  - File: `src/lib/actions/rsvp.actions.ts`
  - Fix: Replaced with `FieldValue.increment(1)` and `FieldValue.increment(-1)` for cancel

- [x] **TASK-6: Fix `analytics-dashboard.tsx` broken import**
  - File: `src/components/analytics-dashboard.tsx`
  - Fix: Created `src/lib/observability/analytics.ts` with all required methods (`getAnalytics()`, `exportData()`, `setEnabled()`, `isEnabled()`)

- [x] **TASK-7: Connect My RSVPs page to live data**
  - File: `src/app/(public)/my-rsvps/page.tsx`
  - Fix: Converted to async Server Component calling `getMyRsvps()` server action

- [x] **TASK-8: Strengthen env var validation**
  - File: `src/lib/env.ts`
  - Fix: All Firebase variables now `z.string().min(1)`; added `CANCEL_TOKEN_SECRET`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY` to schema

---

## Tier 2 — Missing MVP Features

These items are defined in the PRD or architecture but not yet built.

- [x] **TASK-9: Add capacity field to event creation form**
  - Files: `src/components/event/event-form.tsx`, `src/lib/validations/event.schema.ts`, `src/lib/actions/event.actions.ts`
  - Done: Optional numeric capacity input added to form and schema; passed through to `createEvent` action

- [x] **TASK-10: Build edit event page**
  - New files: `src/app/(organizer)/dashboard/events/[id]/edit/page.tsx`, `src/components/event/edit-event-form.tsx`
  - Updated: `src/lib/actions/event.actions.ts` (`updateEvent` action)
  - Done: Pre-populated edit form; `updateEvent` server action with ownership check; cancelled events blocked

- [x] **TASK-11: Build attendee list page for organizers**
  - New files: `src/app/(organizer)/dashboard/events/[id]/attendees/page.tsx`, `src/components/attendee/attendee-table.tsx`
  - Updated: `src/lib/actions/rsvp.actions.ts` (`getEventAttendees` action)
  - Done: Server component reads RSVPs; batch-fetches user email/displayName from Firebase Auth Admin; ownership check

- [x] **TASK-12: Implement event cancellation**
  - Files: `src/lib/actions/event.actions.ts`, `src/app/(organizer)/dashboard/events/[id]/page.tsx`
  - Done: `cancelEvent` server action; cancel button with confirmation dialog on organizer event view

- [x] **TASK-13: ~~Build cancel token infrastructure~~ — N/A**
  - **Resolved by TASK-18 (Option A).** Auth-based RSVP model uses session-based cancel (`cancelRsvp` action), not HMAC tokens. `CANCEL_TOKEN_SECRET` remains in env schema for forward compatibility if ever needed.

- [ ] **TASK-14: Build email infrastructure**
  - New files: `src/lib/email/index.ts`, `src/lib/email/templates/rsvp-confirmation.ts`, `src/lib/email/templates/event-cancellation.ts`
  - Work: Implement provider-agnostic `sendEmail` interface; wire up Resend (recommended) or chosen provider; integrate with `rsvp.actions.ts` and `event.actions.ts`; email failures must be non-blocking and logged at `warn`
  - **Note (auth-based model):** No unauthenticated cancel link needed. Email sends the AI-generated confirmation to the user's registered email address. Event cancellation emails still required.
  - Refs: REQ-INFRA-3

- [x] **TASK-15: Build toast notification system**
  - New files: `src/hooks/use-toast.ts`, `src/components/ui/toast.tsx`, `src/components/ui/toast-region.tsx`
  - Updated: `src/app/layout.tsx`
  - Done: React Context + reducer; `ToastProvider` in root layout; `ToastRegion` with `aria-live="polite"`

- [x] **TASK-16: Add loading skeletons**
  - New files: `src/app/(organizer)/dashboard/loading.tsx`, `src/app/(public)/events/[id]/loading.tsx`, `src/app/(public)/events/loading.tsx`
  - Done: Skeleton components for each route; Next.js wraps them in Suspense automatically

- [x] **TASK-17: Implement publish/unpublish toggle**
  - Files: `src/lib/actions/event.actions.ts`, `src/app/(organizer)/dashboard/events/[id]/page.tsx`
  - Done: `toggleEventStatus` server action; publish/unpublish button on organizer event view

- [x] **TASK-18: Resolve RSVP model decision (email-only vs. auth-based)**
  - **Resolved: Option A — auth-based model accepted.**
  - Attendees must have a Firebase Auth account to RSVP. This enables the My RSVPs dashboard and simplifies the cancel flow (session-based, no tokens). Unauthenticated users are redirected to `/login` from the RSVP action.
  - Impact: TASK-13 (cancel tokens) is N/A. TASK-14 (email) no longer needs cancel link templates. TASK-20 sources attendee name from Firebase Auth `displayName` rather than a form field.

---

## Tier 3 — AI Feature & Polish

- [ ] **TASK-19: Add Anthropic SDK dependency**
  - File: `package.json`
  - Work: `npm install @anthropic-ai/sdk`; `ANTHROPIC_API_KEY` already added to `.env.example` and `src/lib/env.ts`

- [ ] **TASK-20: Build Claude-powered RSVP confirmation email generator**
  - New file: `src/lib/email/ai-confirmation.ts`
  - Work:
    1. Import `Anthropic` from `@anthropic-ai/sdk`
    2. Implement `generateRsvpConfirmationEmail(event: Event, attendeeDisplayName: string): Promise<{ body: string; generatedByAI: boolean }>` function
    3. Build prompt using event context (title, description, formatted date/time, location, organizer name) and attendee's display name (from Firebase Auth profile, falls back to "there" if not set)
    4. Call `claude-haiku-4-5-20251001` with `max_tokens: 400`
    5. Return generated email body string
    6. Implement fallback plain-text template for when Claude fails or times out
    7. Add a 5-second timeout on the API call
  - **Note (auth-based):** `attendeeName` is sourced from `session.displayName ?? session.email` — not a form input. Email is sent to the user's registered email address.
  - Dependency: TASK-19, TASK-14
  - Refs: REQ-AI-1

- [ ] **TASK-21: Integrate AI email into RSVP confirmation flow**
  - File: `src/lib/actions/rsvp.actions.ts`
  - Work: After successful RSVP transaction, call `generateRsvpConfirmationEmail()` then `sendEmail()` in a fire-and-forget pattern (non-blocking, errors logged at `warn`)
  - Dependency: TASK-14 (email infrastructure), TASK-20
  - Refs: REQ-AI-1, REQ-RSVP-5

- [ ] **TASK-22: Resolve test framework conflict (Jest vs. Vitest)**
  - Files: `package.json`, `src/test/integration/*.test.ts`, `jest.a11y.config.ts`
  - Current: Integration tests use `@jest/globals`; ADR-005 specifies Vitest
  - Work: Migrate integration tests to Vitest; remove Jest config; add `vitest`, `@playwright/test`, `@axe-core/playwright` to `devDependencies`; add test scripts to `package.json`
  - Refs: REQ-INFRA-4

- [ ] **TASK-23: Add `react-hook-form` to forms**
  - Files: `src/components/event/event-form.tsx`, `src/components/event/edit-event-form.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`
  - Current: Manual `useState` per field; ADR-004 specifies `react-hook-form` + Zod resolver
  - Work: Install `react-hook-form` and `@hookform/resolvers`; refactor forms to use `useForm` + `zodResolver`
  - Note: Lower priority — current forms work; this is a maintainability improvement

- [ ] **TASK-24: Improve home page**
  - File: `src/app/(public)/page.tsx`
  - Current: Minimal placeholder with two links
  - Work: Add value proposition copy, brief "how it works" steps, CTAs for organizers (sign up) and attendees (browse events / sign in to RSVP)

- [ ] **TASK-25: Add `loading.tsx` and Suspense skeletons to organizer pages**
  - Work: Build skeleton UI for event detail, edit, and attendee list routes using a `Skeleton` UI primitive
  - Dependency: TASK-16 skeleton primitives (done)

- [ ] **TASK-26: Investigate and remove or integrate `optimized-events-page.tsx`**
  - File: `src/components/event/optimized-events-page.tsx`
  - Current: Exists in the component tree but is not imported by any route
  - Work: Determine if this was an experimental component; either integrate it into `/events/page.tsx` or delete it

- [ ] **TASK-27: Add ESLint rules for Firebase import boundaries**
  - Work: Configure ESLint to prevent importing `lib/firebase/admin.ts` or `lib/firebase/auth.server.ts` from client components; add no-barrel-files rule
  - Refs: architecture spec §3.5

- [ ] **TASK-28: Add `aria-live` region for RSVP count updates**
  - File: `src/app/(public)/events/[id]/page.tsx`
  - Work: Wrap the RSVP count display in an `aria-live="polite"` region so screen readers announce count changes after RSVP actions

- [ ] **TASK-29: Verify and fix color contrast across all routes**
  - Work: Run Lighthouse and `axe-core` on `/events`, `/events/[id]`, `/login`, `/register`, `/dashboard`; fix any contrast failures; document results in `docs/accessibility-testing-checklist.md`
  - Refs: REQ-A11Y-3

- [ ] **TASK-30: Add `@media (prefers-reduced-motion)` to all transitions**
  - File: `src/app/globals.css`, component Tailwind classes
  - Work: Audit all CSS transitions and animations; wrap in `@media (prefers-reduced-motion: no-preference)`
  - Refs: REQ-A11Y-4

---

## Dependency Map

```
TASK-19 → TASK-20 → TASK-21  (Anthropic SDK → AI email → wire up)
TASK-14 → TASK-20 → TASK-21  (email infra → AI email → wire up)
TASK-15 → used by most UI tasks (done)
TASK-22 → test infrastructure must be resolved before writing new tests
```

**Resolved dependencies:**
- TASK-1 → TASK-3 → TASK-4 (all done)
- TASK-18 → TASK-13 (TASK-13 N/A; TASK-18 resolved as Option A)

---

## Quick Win Order (Remaining)

For the fastest path to a shippable Tier 3 MVP:

1. TASK-22 (resolve test framework — 45 minutes)
2. TASK-19 (add Anthropic SDK — 5 minutes)
3. TASK-14 (email infrastructure — 2 hours)
4. TASK-20 (Claude email generator — 1 hour)
5. TASK-21 (wire into RSVP flow — 30 minutes)
6. TASK-24 (improve home page — 45 minutes)
7. TASK-26 (clean up optimized-events-page — 20 minutes)
