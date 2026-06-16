# EventHub — Requirements

**Version:** 1.0 · **Status:** Living Document  
**Scope:** Complete MVP requirements — existing features, gaps, bugs, and the new AI confirmation email feature.

---

## 1. Authentication & Session Management

### REQ-AUTH-1: Organizer registration
**Status:** Implemented  
An organizer can create an account using email and password. The `register` server action creates the user via Firebase Admin, mints a session cookie, and sets it on the response. Client-side uses `register-form.tsx`.

**Acceptance criteria:**
- Email must be a valid address; password must be ≥ 8 characters (Zod enforced)
- On success, session cookie is set and organizer is redirected to dashboard
- On failure (email taken, weak password), inline field-level errors are shown
- Focus moves to first invalid field on submit failure

### REQ-AUTH-2: Organizer login
**Status:** Implemented  
An organizer can sign in with email and password. Client-side Firebase Auth sign-in, followed by a `createSession` server action that mints the `HttpOnly` session cookie.

**Acceptance criteria:**
- On success, session cookie is set and organizer is redirected to `/dashboard` ✓ (fixed: was redirecting to `/organizer/dashboard`)
- Firebase auth errors (wrong password, user not found) are shown as form-level errors, not exposed as raw Firebase codes

### REQ-AUTH-3: Middleware route protection
**Status:** Implemented  
All routes under `/dashboard` and nested paths are gated behind a valid session cookie. Unauthenticated users are redirected to `/login`.

**Acceptance criteria:**
- `src/middleware.ts` checks for the session cookie on all `/dashboard` routes ✓
- Missing or invalid cookie redirects to `/login?next={pathname}` ✓
- Public routes (`/events/*`, `/`, `/login`, `/register`) pass through without a cookie check ✓

### REQ-AUTH-4: Sign out
**Status:** Implemented  
`signOut` server action revokes Firebase refresh tokens and clears the session cookie, then redirects to `/login`.

### REQ-AUTH-5: Password reset
**Status:** Partial — page and form exist but flow is untested  
An organizer can request a password reset email via Firebase Auth's built-in flow.

---

## 2. Event Management (Organizer)

### REQ-EVENT-1: Create event
**Status:** Implemented  
An organizer can create an event with title, description, location, date, time, optional capacity, and save it as a draft or publish immediately.

**Acceptance criteria:**
- Title: required, max 100 characters ✓
- Description: required ✓
- Location: required free text ✓
- Date + time: required; combined into UTC ISO timestamp server-side ✓
- Capacity: optional positive integer; null = unlimited ✓ (added in TASK-9)
- Published events must have a future start date (validated server-side) ✓
- On success, redirect to `/dashboard/events/{id}` ✓
- `createEvent` reads `organizerId` from the authenticated session ✓ (fixed in TASK-3)

### REQ-EVENT-2: Edit event
**Status:** Implemented  
An organizer can edit title, description, location, date/time, and capacity of any of their own events after publishing.

**Acceptance criteria:**
- Route: `/dashboard/events/[id]/edit` ✓
- All fields editable post-publish ✓
- Cancelled events cannot be edited (blocked server-side) ✓
- Organizer can only edit their own events (ownership verified server-side) ✓
- Updated event shows changed data on public event page immediately (via `revalidatePath`) ✓

### REQ-EVENT-3: Cancel event
**Status:** Implemented (email notification pending TASK-14)  
An organizer can cancel an event.

**Acceptance criteria:**
- Sets `event.status = "cancelled"` and `cancelledAt` timestamp ✓
- Public event page shows "Cancelled" banner; RSVP form is hidden ✓
- Triggers cancellation emails to all confirmed RSVPs (queued, non-blocking) — pending TASK-14

### REQ-EVENT-4: Publish / unpublish toggle
**Status:** Implemented  
An organizer can toggle a published event back to draft and re-publish. Unpublished events return 404 to public visitors.

**Acceptance criteria:**
- `toggleEventStatus` server action switches `draft`↔`published` ✓
- Sets `publishedAt` on first publish ✓
- Unpublished events return 404 on the public event page ✓

### REQ-EVENT-5: Organizer dashboard — event list
**Status:** Implemented  
The dashboard shows the authenticated organizer's events with RSVP counts.

**Acceptance criteria:**
- Shows only the authenticated organizer's events ✓ (fixed in TASK-4)
- `getOrganizerEvents` scopes query to `organizers/{uid}/events` ✓

### REQ-EVENT-6: Per-event attendee list
**Status:** Implemented  
An organizer can view a list of confirmed RSVPs for each of their events.

**Acceptance criteria:**
- Route: `/dashboard/events/[id]/attendees` ✓
- Shows attendee display name, email, and RSVP timestamp ✓ (sourced from Firebase Auth Admin; see auth-based model)
- Only accessible by the event's organizer (ownership verified) ✓
- Read-only in v1 ✓

---

## 3. Public Event Pages

### REQ-PUBLIC-1: Browse events
**Status:** Implemented  
Public visitors can browse all published events at `/events`, grouped into upcoming and past.

### REQ-PUBLIC-2: Event detail page
**Status:** Implemented  
Public visitors can view a single event at `/events/[id]` with title, description, date/time, location, organizer name, RSVP count, and capacity indicator.

**Acceptance criteria:**
- No auth required to view
- Shows "Cancelled" banner if event is cancelled; RSVP button is hidden
- Shows remaining capacity if a capacity limit is set
- If event is not found or not published, returns 404

### REQ-PUBLIC-3: Home page
**Status:** Minimal — placeholder only  
The home page links to `/events` and `/dashboard`. It should be a proper landing page communicating the product value proposition.

---

## 4. RSVP Flow

### REQ-RSVP-1: RSVP to an event (authenticated)
**Status:** Implemented  
An authenticated user can RSVP to a published event. RSVP is stored in Firestore with a transaction that increments `rsvpCount` atomically.

**Acceptance criteria:**
- Requires authentication (redirects to `/login` if unauthenticated) ✓
- Duplicate RSVP by same user is rejected with a clear error ✓ (doc ID = userId enforces this structurally)
- `rsvpCount` on event document is incremented atomically using `FieldValue.increment(1)` ✓ (fixed in TASK-5)
- Optimistic UI update via `useRsvp` hook ✓
- **Auth-based model is formalized (see ADR-006).** Attendees must have a Firebase Auth account. RSVP doc ID = `userId`. Cancel is session-based via `/my-rsvps`.

### REQ-RSVP-2: Cancel RSVP (authenticated)
**Status:** Implemented  
An authenticated user can cancel their RSVP from `/my-rsvps`. Sets `cancelledAt` timestamp and decrements `rsvpCount` atomically using `FieldValue.increment(-1)`.

### REQ-RSVP-3: Capacity enforcement
**Status:** Implemented  
RSVP writes check `event.capacity` against `event.rsvpCount` inside the Firestore transaction. The 51st RSVP on a capacity-50 event is rejected.

**Acceptance criteria:**
- Transaction read-then-write ensures no race conditions ✓
- User receives clear "Event is at capacity" error ✓
- `rsvpCount` updated with `FieldValue.increment(1)` ✓ (fixed in TASK-5; no longer uses JS arithmetic)

### REQ-RSVP-4: My RSVPs page
**Status:** Implemented  
An authenticated attendee can view all their current RSVPs at `/my-rsvps`.

**Acceptance criteria:**
- Page renders live data from the `getMyRsvps` server action ✓ (fixed in TASK-7)
- Shows event title, date, location, RSVP date ✓
- Cancel RSVP button on each confirmed RSVP ✓
- Empty state when user has no RSVPs ✓

### REQ-RSVP-5: Confirmation email after RSVP (AI-powered)
**Status:** ❌ Not implemented  
After a successful RSVP, the attendee receives a personalized confirmation email generated by Claude. See REQ-AI-1 for full specification.

### REQ-RSVP-6: Cancel link flow (unauthenticated cancel)
**Status:** N/A — Resolved by ADR-006  
The email-only RSVP model was evaluated and the auth-based model (Option A) was chosen. Attendees cancel RSVPs via `/my-rsvps` (session-based). HMAC cancel tokens, the `/events/[id]/cancel` route, and the `cancelToken` Firestore field are not required in v1.

---

## 5. AI Feature: Smart RSVP Confirmation Emails

### REQ-AI-1: Claude-generated RSVP confirmation email
**Status:** ❌ Not implemented  
After an attendee successfully RSVPs to an event, Claude (via the Anthropic API) generates a personalized, context-aware confirmation email. The email summarizes the event details in a warm, engaging tone rather than using a boilerplate template.

**Background:** Standard transactional confirmation emails are cold and formulaic. Claude can produce a unique email for each RSVP that references the specific event details (theme, venue, date, organizer name) and addresses the attendee by their name — making the communication feel personal and increasing the chance the attendee actually reads it and remembers to attend.

**User story:** As an attendee who just RSVPed, I receive a confirmation email that feels like it was written specifically for this event and for me, not a generic template.

**Acceptance criteria:**
- Email is triggered non-blocking after a successful RSVP write — it must never block or fail the RSVP transaction
- Claude receives the following context:
  - Event title, description, date/time (formatted), location
  - Organizer display name
  - Attendee display name (from `session.displayName ?? session.email` — not a form field; auth-based model)
- The generated email:
  - Addresses the attendee by first name (from Firebase Auth `displayName`, falls back to "there" if not set)
  - Mentions the specific event name, date, and location in a natural (non-list) way
  - Warm, friendly tone — not formal or robotic
  - Includes a clear call-to-action: "Add to calendar" link (or similar); **no cancel link** (attendees cancel via `/my-rsvps`)
  - Is between 80–200 words (kept concise and readable)
  - Is plain text or simple HTML — no heavy template design required
- If Claude API fails or times out (>5 seconds), a fallback plain-text confirmation email is sent instead
- Claude API errors are logged at `warn` level but do not surface to the user
- `ANTHROPIC_API_KEY` is stored as a server-only env variable (never prefixed with `NEXT_PUBLIC_`)
- The Anthropic SDK call happens server-side only (Server Action or API route) — never from the browser

**Implementation location:**
- `lib/email/ai-confirmation.ts` — Claude API call + prompt template
- `lib/email/index.ts` — provider-agnostic send interface
- Called from `rsvp.actions.ts` → `createRsvp`, fire-and-forget with error logging

**Prompt design:**
```
You are writing a confirmation email for someone who just RSVPed to an event.

Event: {title}
Date: {formattedDate}
Location: {location}
Organizer: {organizerName}
Description: {description}
Attendee name: {attendeeName}

Write a warm, friendly confirmation email (80–200 words) that:
- Opens by addressing the attendee by first name
- Mentions the event name, date, and location naturally
- Conveys genuine enthusiasm for the event
- Ends with a clear note that they can manage their RSVP at {appUrl}/my-rsvps
- Does not use bullet points or headers — flowing prose only

Do not include a subject line. Do not include a sign-off name — that will be added separately.
```

**Model:** `claude-haiku-4-5-20251001` (fast, cost-effective for transactional email generation)

---

## 6. Accessibility

### REQ-A11Y-1: Keyboard navigation
**Status:** Mostly implemented  
All interactive elements are reachable by keyboard. Skip-to-main link is present in root layout.

**Acceptance criteria:**
- No keyboard traps
- All buttons, links, and inputs reachable via Tab
- Skip link visible on `:focus`

### REQ-A11Y-2: Form error accessibility
**Status:** Partially implemented  
Forms use `aria-invalid`, `aria-describedby`, and `FieldError` component. Focus moves to first error field on submit failure.

**Acceptance criteria:**
- `aria-invalid="true"` on each invalid input
- Error message linked via `aria-describedby`
- Errors never rely on color alone
- ⚠️ **Gap:** `Input` component accepts `error` and `errorId` props, but not all uses of `Input` in auth forms manually pass `aria-describedby` — some only pass `aria-invalid`

### REQ-A11Y-3: Color contrast
**Status:** Not verified  
Normal text ≥ 4.5:1 against background; large text ≥ 3:1; focus indicators ≥ 3:1.

### REQ-A11Y-4: Reduced motion
**Status:** Not verified  
CSS transitions must be wrapped in `@media (prefers-reduced-motion: no-preference)`.

### REQ-A11Y-5: Toast notifications
**Status:** Implemented  
Toast notifications render in an `aria-live="polite"` region via `ToastRegion`. The `useToast` hook, `ToastProvider`, `ToastRegion`, and `ToastItem` components were built in TASK-15 and wired into the root layout.

---

## 7. Observability & Logging

### REQ-OBS-1: Structured server-side logging
**Status:** Partial  
`src/lib/observability/logger.ts` exists with `info`, `warn`, `error` methods and in-memory storage. The architecture spec defines a more structured logger with JSON output to stdout for Cloud Logging.

**Acceptance criteria:**
- Every Server Action logs at `info` on entry (sanitized input — no PII)
- Every caught error logs at `error` with context
- Email send failures log at `warn`
- In production: JSON to stdout (Cloud Logging compatible)
- ⚠️ **Gap:** Logger is not called from any Server Actions currently

### REQ-OBS-2: Analytics dashboard
**Status:** Implemented  
`src/lib/observability/analytics.ts` was created in TASK-6 with all methods required by `analytics-dashboard.tsx`: `getAnalytics()`, `exportData()`, `setEnabled()`, `isEnabled()`, `track()`, `trackPageView()`, `trackUserAction()`, `trackError()`, `trackRsvp()`, `getEvents()`, `clearData()`.

---

## 8. Infrastructure & Configuration

### REQ-INFRA-1: Environment variable validation
**Status:** Implemented  
`src/lib/env.ts` validates all env vars with Zod. All Firebase variables are `z.string().min(1)`. Added in TASK-8: `CANCEL_TOKEN_SECRET`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`. Dev mode returns safe defaults; production throws on missing vars.

### REQ-INFRA-2: Cancel token infrastructure
**Status:** N/A — Resolved by ADR-006  
The auth-based RSVP model (Option A) requires no HMAC cancel tokens. Cancellation is session-based. `CANCEL_TOKEN_SECRET` remains in the env schema for potential future use but no `lib/tokens/` module, `cancelToken` field, or `/events/[id]/cancel` route is required in v1.

### REQ-INFRA-3: Email infrastructure
**Status:** ❌ Not implemented  
The provider-agnostic email interface defined in the architecture spec must be built.

**Acceptance criteria:**
- `lib/email/index.ts` exports a `sendEmail(to, subject, body)` function
- Provider is configured via env vars (Resend recommended — simple API, good Next.js docs)
- Used by: RSVP confirmation, RSVP cancellation, event cancellation notification
- Email send failures are logged at `warn` and never block the RSVP write

### REQ-INFRA-4: Test infrastructure
**Status:** ⚠️ Conflicted  
Integration tests use `@jest/globals` but the architecture specifies Vitest. Playwright is configured but testing dependencies are not in `package.json`.

**Acceptance criteria:**
- Resolve Jest vs. Vitest: adopt one and remove the other
- Add `vitest`, `@playwright/test`, `@axe-core/playwright` to `devDependencies`
- Add `test`, `test:e2e`, `test:integration` npm scripts
- Firebase Emulator used for integration tests (`firebase emulators:exec`)
- ⚠️ `jest.a11y.config.ts` should be removed or migrated to Playwright/Vitest config
