# EventHub — Architecture Decision Records

**Version:** 1.0 · **Depends on:** Architecture v1.0 · **Status:** Accepted

> ADRs are immutable once accepted. If a decision changes, a new ADR supersedes it — the old one is marked Superseded, not deleted. This preserves the reasoning trail.

---

## ADR-001 — Use Next.js App Router with Server Components and Server Actions as the primary rendering and mutation model

**Date:** 2025-01  
**Status:** Accepted

### Context

EventHub has two rendering concerns that pull in opposite directions. The public event detail page needs fast time-to-content and good SEO — a real person following a shared link should see event information immediately, without waiting for client-side JavaScript to fetch and render it. The organizer dashboard is an authenticated, interactive surface where form validation feedback, optimistic updates, and error states matter more than first-paint speed.

We evaluated three approaches:

1. **Pages Router + API Routes** — the prior-generation Next.js model. Stable, well-documented, but RSC is not available. All data fetching on the server side requires `getServerSideProps`, which is page-level only and can't be colocated with components.

2. **App Router with Server Components + Server Actions** — the current Next.js model. Server Components render on the server with direct data access. Server Actions handle mutations without a separate API layer. Client Components opt in explicitly.

3. **App Router as a thin shell over a separate REST API** — use Next.js for routing and rendering only; keep all business logic in an Express or Hono API that the client fetches from. Maximally portable logic, but doubles the infrastructure surface and removes the RSC streaming benefits.

The specific tradeoffs for App Router:

**Benefits:**

- Public event pages are server-rendered HTML — LCP is fast, content is indexable, no hydration required for static sections
- Server Actions eliminate the boilerplate of `fetch` + error handling + type casting for mutations
- `useOptimistic` and `useTransition` are purpose-built for the RSVP optimistic update pattern
- Route-level `loading.tsx` + Suspense streaming means the layout renders instantly while data fetches
- Server-only Firebase Admin SDK access is natural — no risk of leaking service account credentials to the browser bundle

**Costs:**

- App Router is newer; some ecosystem libraries (e.g., older Firebase UI packages) don't support RSC
- The mental model of "which components run where" requires discipline — `"use client"` boundaries are easy to misplace
- Debugging is harder than Pages Router: two execution environments, two error boundaries, partial hydration edge cases
- `error.tsx` and `loading.tsx` conventions must be understood by every contributor

**Why not option 3 (separate API)?** EventHub's mutation surface is small: create event, update event, cancel event, create RSVP, cancel RSVP, sign out. A separate API service introduces network latency, a second deployment unit, and cross-service auth complexity for no tangible benefit at this scale. Server Actions give us type-safe RPC with zero additional infrastructure.

### Decision

Use Next.js App Router with Server Components as the default for all routes. Use Server Actions exclusively for mutations. Client Components are used only where interactivity requires it, pushed as deep into the component tree as possible to minimize client bundle size. Route groups (`(public)`, `(auth)`, `(organizer)`) isolate layout concerns. `"use client"` directives require a comment explaining the reason.

### Consequences

**Positive:**

- Public event pages are statically renderable and fast by default
- Mutations have consistent, type-safe error handling via `ActionResult<T>`
- No separate API service to deploy, monitor, or auth-gate
- Firebase Admin SDK runs exclusively on the server — no service account key in the browser

**Negative:**

- Contributors must understand the RSC execution model before touching the codebase — there is an onboarding cost
- Some UI libraries require `"use client"` wrappers, adding small amounts of boilerplate
- Testing Server Actions requires the Firebase emulator; there is no lightweight stub

**Watch:** If EventHub ever needs a native mobile app or a third-party integration that calls our backend, Server Actions cannot serve those callers. At that point, extracting a thin API Route layer (or a dedicated service) is the right move. The architecture doesn't prevent this — `lib/actions/` contains the business logic; wrapping it in an API Route handler is mechanical work.

---

## ADR-002 — Use Firebase session cookies (server-side) for organizer auth, not the Firebase client SDK token alone

**Date:** 2025-01  
**Status:** Accepted

### Context

Firebase Auth provides two ways to establish an authenticated server-side session:

**Option A — Client SDK token, verified per-request:**  
The Firebase client SDK signs the user in and returns an ID token (a short-lived JWT, ~1 hour). The client sends this token in an `Authorization: Bearer` header with every request. The server verifies it using the Admin SDK on each request.

**Option B — Firebase session cookies:**  
After the client SDK signs the user in, the client sends the ID token to a server endpoint once. The server mints a long-lived session cookie (up to 14 days) using `adminAuth.createSessionCookie()`, sets it as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, and returns it. Subsequent requests carry the cookie automatically; the server verifies it with `adminAuth.verifySessionCookie()`.

The decision matters for Next.js App Router specifically because:

- Middleware runs at the Edge and needs to read auth state to decide redirects
- Server Components need auth context to fetch user-specific data
- Server Actions need to verify the caller's identity before mutating data

With Option A, the client must attach a token to every Server Action call — which requires extra client-side code, the token must be refreshed before expiry, and passing it through Server Action arguments is awkward (they accept `FormData` or typed arguments, not headers).

With Option B, the cookie is sent automatically with every request — including Server Actions — and Edge Middleware can read it directly from `request.cookies` without any client-side involvement.

**Security comparison:**

| Concern               | Option A (ID token)                                           | Option B (session cookie)                                            |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Token lifetime        | ~1 hour (auto-refreshed by client SDK)                        | Up to 14 days (configurable)                                         |
| Storage               | Client SDK manages in memory / IndexedDB                      | `HttpOnly` cookie — inaccessible to JS                               |
| XSS exposure          | ID token readable by JS if storage is accessible              | Cookie is `HttpOnly` — XSS cannot read it                            |
| CSRF exposure         | Bearer token not sent automatically — CSRF-safe               | Cookie sent automatically — requires `SameSite=Strict`               |
| Revocation            | Firebase Admin can revoke; client SDK detects at next refresh | `adminAuth.verifySessionCookie(true)` checks revocation in real-time |
| Server Actions compat | Must pass token explicitly through action args                | Cookie included automatically in request                             |

### Decision

Use Firebase session cookies (Option B). On sign-in, the client SDK authenticates, then immediately calls a Server Action (or a thin `POST /api/session` route) that mints the session cookie. The cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, with a 7-day expiry. Middleware reads and verifies it on every protected route. Server Actions call `verifySessionCookie(true)` — the `true` flag checks for revocation against Firebase, not just JWT validity.

```ts
// lib/firebase/auth.server.ts
export async function getVerifiedSession(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  try {
    return await adminAuth.verifySessionCookie(cookieHeader, true);
  } catch {
    return null; // Expired, revoked, or invalid
  }
}
```

Sign-out calls `adminAuth.revokeRefreshTokens(uid)` and clears the cookie. This ensures a revoked session is rejected on the _next_ request, not after the next Firebase sync cycle.

### Consequences

**Positive:**

- Session cookie is `HttpOnly` — immune to XSS token theft
- Works transparently with Server Actions — no manual token passing
- Revocation is synchronous from the server's perspective
- Middleware can gate routes at the Edge without an additional client round-trip

**Negative:**

- Requires a server endpoint (or Server Action) on initial sign-in — one extra step vs pure client SDK flow
- Session cookie expiry (7 days) means users are logged out if inactive — may require a "remember me" extension in v2
- `verifySessionCookie(true)` makes a network call to Firebase on every protected request — adds ~20–50ms latency. Mitigation: cache the verification result in a request-scoped store for the duration of a single request

**Watch:** The `verifySessionCookie(true)` revocation check is a network call. Under high traffic, this adds load to Firebase Auth. Acceptable for MVP; if latency becomes visible, move to periodic revocation checks (e.g., every 5 minutes via a cache) rather than per-request.

---

## ADR-003 — Model RSVPs as a Firestore subcollection with a transaction-based capacity check, not a counter field

**Date:** 2025-01  
**Status:** Accepted

### Context

Two data modeling choices interact to define the RSVP write path:

**1. Where to store RSVPs:**

- **Option A — Flat collection:** `rsvps/{rsvpId}` with `eventId` as a field. Simple structure, but requires a collection-group query to list RSVPs for an event. Security rules on a flat collection can't use document hierarchy to scope access.

- **Option B — Subcollection:** `events/{eventId}/rsvps/{rsvpId}`. RSVPs are naturally scoped to an event. Security rules can grant organizer access based on the parent event document. Querying all RSVPs for an event is a direct collection read, not a cross-collection query.

**Option B is clearly superior for this domain.** RSVPs have no meaning outside an event — there is no use case that requires querying RSVPs across events (e.g., "all RSVPs by email address globally") in v1. The subcollection models the domain correctly and makes security rules simpler.

**2. How to enforce capacity:**

The harder problem. Two approaches:

- **Option A — Counter field:** Store `rsvpCount` on the event document. Increment it on each RSVP. Read it before writing to check capacity. Problem: Firestore document writes are not atomic with reads in separate operations. Two simultaneous RSVPs can both read `rsvpCount = 49` on a capacity-50 event, both conclude there is space, and both write — resulting in 51 RSVPs. This is a classic TOCTOU (time-of-check to time-of-use) race condition.

- **Option B — Transaction with live count:** Use a Firestore transaction. The transaction reads the current RSVP subcollection count and the event capacity atomically, checks the constraint, and writes the RSVP document in the same transaction. Firestore transactions are serializable — if two transactions conflict on the same documents, one retries. The 51st RSVP is guaranteed to fail.

The cost of Option B: counting the subcollection inside a transaction requires either:

- A `count()` aggregation query (available in Firebase SDK v9.13+, supported in transactions)
- Or maintaining a `rsvpCount` field on the event doc and updating it _within the same transaction_ as the RSVP write

We use the counter field approach _inside the transaction_, not outside it. The field is updated as part of the same atomic write — removing the race condition entirely.

```ts
// lib/actions/rsvp.actions.ts (simplified)
await db.runTransaction(async (tx) => {
  const eventRef = db.doc(`events/${eventId}`);
  const eventSnap = await tx.get(eventRef);
  const event = eventSnap.data();

  if (event.capacity !== null && event.rsvpCount >= event.capacity) {
    throw new AppError("Event is at capacity", "CAPACITY_EXCEEDED", 409);
  }

  const rsvpRef = db.doc(`events/${eventId}/rsvps/${rsvpId}`);
  tx.set(rsvpRef, rsvpData);
  tx.update(eventRef, { rsvpCount: FieldValue.increment(1) });
});
```

**Idempotency:** The same email RSVPing twice is handled by using a deterministic `rsvpId` derived from `eventId + email` (hashed). The transaction `tx.set()` with this ID is idempotent — it overwrites the same document rather than creating a duplicate.

### Decision

RSVPs are stored as a subcollection: `events/{eventId}/rsvps/{rsvpId}`. Capacity is enforced via a Firestore transaction that reads `event.rsvpCount`, checks against `event.capacity`, writes the RSVP document, and increments `rsvpCount` atomically. Idempotency is enforced by a deterministic document ID.

### Consequences

**Positive:**

- Zero race conditions on capacity enforcement — Firestore's transaction serialization guarantees it
- Security rules can scope RSVP reads to the event organizer using the parent document hierarchy
- Idempotent writes are safe to retry on network failure
- `rsvpCount` on the event document is a cheap read for display purposes (no aggregation query needed)

**Negative:**

- Firestore transactions have a 60-second timeout and a limit on documents read/written per transaction — not a concern for single-RSVP writes
- If `rsvpCount` on the event document ever drifts (e.g., a failed partial write), it becomes inconsistent with the actual subcollection count. Mitigation: a scheduled Cloud Function that reconciles the counter nightly, or on-demand via an admin action
- Subcollection structure means deleting an event requires deleting all subcollection documents first — Firestore does not cascade deletes. Must be handled in the `cancelEvent` action (or a Cloud Function triggered on event cancellation)

**Watch:** Firestore's `count()` aggregation is now available and could replace the counter field entirely, eliminating the drift risk. The tradeoff is that `count()` in a transaction has slightly different semantics. Re-evaluate in v2.

---

## ADR-004 — Use `react-hook-form` + Zod for all forms, with a single schema shared between client validation and Server Action validation

**Date:** 2025-01  
**Status:** Accepted

### Context

EventHub has four non-trivial forms: RSVP, Create Event, Edit Event, and Register. Each form needs:

1. Real-time field-level validation feedback (client-side)
2. Server-side validation before writing to Firestore (authoritative)
3. Accessible error states: `aria-invalid`, `aria-describedby`, focus management on submit
4. Typed form values that TypeScript can verify end-to-end

We evaluated three approaches:

**Option A — Uncontrolled form + Server Action only:**  
Use a plain `<form action={serverAction}>` with no client-side validation library. The Server Action validates with Zod and returns errors. The component re-renders with errors via `useFormState`.

_Pro:_ Minimal JavaScript, works without JS enabled, simpler architecture.  
_Con:_ No real-time feedback — the user must submit to see any errors. For a multi-field form like Create Event, this is a poor UX. Also, `useFormState` re-renders the entire form on every state change, which is coarse.

**Option B — `react-hook-form` + Zod resolver:**  
`react-hook-form` manages field registration, dirty/touched state, and submit handling. A `zodResolver` runs Zod validation client-side on submit (and optionally on blur/change). The same Zod schema is imported by the Server Action for authoritative server-side validation.

_Pro:_ Real-time feedback on submit, typed field values, minimal re-renders (RHF uses uncontrolled inputs internally), excellent `aria-invalid` integration, battle-tested.  
_Con:_ Adds two dependencies (`react-hook-form` + `@hookform/resolvers`). Forces `"use client"` on form components.

**Option C — Custom form hook:**  
Build a lightweight controlled form hook with `useState` + manual Zod validation.

_Pro:_ Zero additional dependencies beyond Zod (which we already use).  
_Con:_ Rebuilding what `react-hook-form` already does well. Dirty tracking, touched state, field registration, and submit handling are non-trivial to implement correctly — especially with nested fields. A custom hook written for this project will be inferior to a library that has handled thousands of edge cases.

The key insight: **Zod is already in the stack** for Server Action validation and env config. Adding `react-hook-form` with its Zod resolver is additive, not a new conceptual layer. The schema is the single source of truth and runs on both sides of the network boundary.

```ts
// lib/validations/event.schema.ts — imported by BOTH client and server
export const EventFormSchema = z
  .object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(5000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    location: z.string().min(3).max(200),
    capacity: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => isDateTimeInFuture(data.date, data.time), {
    message: "Event date and time must be in the future",
    path: ["date"],
  });

export type EventFormInput = z.infer<typeof EventFormSchema>;
```

### Decision

Use `react-hook-form` with `zodResolver` for all forms. Validation schemas live in `lib/validations/` and are imported by both the form component (client) and the Server Action (server). Server Actions re-validate regardless of client result — the client-side validation is a UX convenience, not a security gate. Error messages from `fieldErrors` in the `ActionResult` are merged into RHF's error state via `setError()`.

### Consequences

**Positive:**

- One schema, two validation contexts — no duplicated validation logic
- `react-hook-form` handles dirty/touched/submitted state, uncontrolled inputs, and field registration — none of this needs to be hand-rolled
- `aria-invalid` integration is straightforward: `aria-invalid={!!errors.title}` directly from RHF's `formState.errors`
- Server validation errors surface in the same UI pattern as client errors — users see a consistent experience

**Negative:**

- `react-hook-form` + `@hookform/resolvers` add ~13kB gzipped to the client bundle for pages with forms
- Form components must be `"use client"` — they cannot be Server Components
- The `zodResolver` runs Zod in the browser — Zod is included in the client bundle. Acceptable: Zod is ~14kB gzipped and is already a project dependency; it won't be introduced solely for this purpose

**Watch:** Next.js's evolving `useFormState` + `useFormStatus` pattern (now `useActionState` in React 19) may reduce the need for `react-hook-form` for simpler forms. Re-evaluate for the RSVP form specifically — it has only two fields and may not justify a full RHF instance.

---

## ADR-006 — Auth-based RSVP model: attendees must have a Firebase Auth account to RSVP

**Date:** 2026-06  
**Status:** Accepted  
**Supersedes:** The email-only RSVP model described in PRD v1.1 (§2, §4 US-A2/A3, §7) and data-model.md v1.0 (§3.4)

### Context

The original PRD specified a stateless, email-only RSVP model: attendees submit a name and email, receive a signed cancel link in their confirmation email, and cancel via that link — no account required. This was a deliberate product hypothesis: "will conversion be higher if we remove the signup step?"

The initial implementation diverged from this spec. The `rsvpEvent` and `cancelRsvp` server actions were built using Firebase Auth session cookies — attendees are identified by `session.uid`, not by email. The `Rsvp` type in the codebase has `userId`, not `attendeeName`/`attendeeEmail`/`cancelToken`.

Two options were evaluated:

**Option A — Accept and formalize the auth-based model.**

- Attendees must have a Firebase Auth account to RSVP
- RSVP doc ID = `userId` (structural idempotency, no hash function)
- Cancel: attendee navigates to `/my-rsvps` and clicks cancel (session-based, no token)
- Confirmation email sent to the attendee's registered email; no cancel link in the email
- Cancel token infrastructure (HMAC, expiry, `/events/[id]/cancel` route) is not needed
- Enables a My RSVPs dashboard without additional infrastructure

**Option B — Revert to the email-only model per the original PRD.**

- Rip out the existing auth-based RSVP implementation
- Build: HMAC cancel token generation + verification, `/events/[id]/cancel` page, `cancelToken`/`cancelTokenExpiresAt` on RSVP doc, Firestore index on `cancelToken`, `attendeeName`/`attendeeEmail` form fields, email idempotency via sha256(email) as doc ID
- Attendees still cannot access a My RSVPs dashboard without adding accounts later

**Trade-offs:**

| Concern | Option A (auth-based) | Option B (email-only) |
|---|---|---|
| Conversion friction | Higher (sign-up required) | Lower (name + email only) |
| Cancel UX | Dashboard-based; persistent | Email link; one-time, expiring |
| PII stored in Firestore | None (names/emails stay in Auth) | `attendeeEmail` in RSVP doc |
| Cancel token infra | Not needed | HMAC + index + cancel page |
| My RSVPs dashboard | Supported natively | Requires v2 account feature |
| Implementation status | Already built and tested | Requires full rebuild of RSVP layer |
| Long-term account model | Unified (organizers + attendees both have accounts) | Split (organizers have accounts, attendees don't) |

**Additional context:** The conversion hypothesis ("no account = better conversion") is valid but untested. The auth-based model allows us to test a counter-hypothesis: "a good RSVP dashboard experience drives account creation." Auth accounts also eliminate cancel token expiry complexity, reduce PII surface area in Firestore, and unify the auth model so future attendee features (notifications, waitlists, RSVP history) don't require a schema migration.

### Decision

Accept Option A. The auth-based RSVP model is formalized as the v1 design. Attendees must have a Firebase Auth account to RSVP. The RSVP document ID is `userId`. Cancellation is session-based via `/my-rsvps`. Cancel token infrastructure is not built in v1.

The conversion trade-off is accepted as a deliberate product bet, not an oversight. If conversion data shows that the sign-up step is a material drop-off point, the correct response is to optimize the sign-up flow (OAuth, magic link), not to build a parallel unauthenticated RSVP path.

### Consequences

**Positive:**

- No HMAC token infrastructure — eliminates `lib/tokens/`, the `/events/[id]/cancel` route, and the `cancelToken` Firestore index
- Attendee PII (name, email) stays in Firebase Auth — not duplicated into RSVP documents
- My RSVPs dashboard is a first-class feature with no extra schema work
- Unified auth model: all users (organizers and attendees) are Firebase Auth accounts
- RSVP idempotency is structural (doc ID = userId) rather than hash-based

**Negative:**

- Attendees must create an account before RSVPing — higher friction than name + email
- RSVP conversion rate may be lower; this is a known trade-off and will be measured (see PRD §6)
- Existing tests or integration specs that assumed the email-only model need updating

**Watch:** If Lighthouse or real-user conversion data shows significant drop-off at the sign-in gate, evaluate adding Google OAuth (ADR scope: REQ-AUTH-1 currently email/password only) before revisiting the no-account model. OAuth reduces the auth step to ~2 clicks and may close the conversion gap.

---

## ADR-005 — Use Vitest for unit tests, Playwright for E2E, and the Firebase Emulator Suite for integration tests; no React Testing Library component rendering tests

**Date:** 2025-01  
**Status:** Accepted

### Context

We need a testing strategy that provides high confidence in the things most likely to break: Server Action logic (capacity enforcement, token validation, input sanitization), the RSVP flow end-to-end, and accessibility on key routes.

The options for each layer:

**Unit tests:**

- **Jest** — standard in the React ecosystem, but requires additional configuration for ESM, doesn't support Vite's module resolution natively, and is slower than alternatives
- **Vitest** — built for Vite/ESM projects, Jest-compatible API, significantly faster, native TypeScript support. Next.js App Router projects using Vitest require a small config bridge but it's well-documented

**Component tests:**

- **React Testing Library (RTL)** — renders components in a jsdom environment and asserts on DOM output. Common choice.
- **No RTL for this project** — the primary interactive components (forms, dialogs) are Client Components that delegate business logic to Server Actions. Testing a form component with RTL means mocking the Server Action, then asserting that the form renders error states — which tests the glue between RHF and the DOM, not anything domain-critical. The cost (jsdom setup, mock complexity, brittle snapshot tests) exceeds the value for EventHub's component surface.
- Instead: test the Zod schemas (pure functions, trivial to test), test the Server Actions against the emulator (tests real behavior), and test the full flow in Playwright (tests what the user actually experiences including DOM interaction).

**Integration tests:**

- **Firebase Emulator Suite** — runs Firestore, Auth, and Functions locally with the same rules and behavior as production. Allows testing Server Actions with a real (local) database. This is the highest-value test layer for EventHub: it catches rule mismatches, transaction edge cases, and schema drift that unit tests cannot.

**E2E tests:**

- **Cypress** — mature, large ecosystem, but slower test runner and requires a separate server process
- **Playwright** — faster, better parallel execution, first-class TypeScript support, built-in accessibility testing via `axe-core` integration, excellent trace/debugging tooling. The Page Object Model pattern maps directly to our screen-per-route structure

**Accessibility tests:**

- `axe-core` via `@axe-core/playwright` — runs automated WCAG checks in the browser context as part of E2E tests. Catches ~35% of WCAG failures automatically (color contrast, missing labels, landmark structure)
- Manual tests for the remaining 65% (keyboard flow, focus management, screen reader behavior) — documented as a checklist in the test plan and run before each release

### Decision

- **Vitest** for unit tests: Zod schemas, utility functions (`dates.ts`, `tokens.ts`, `errors.ts`), logger
- **Firebase Emulator + Vitest** for integration tests: Server Actions tested against a real local Firestore instance with Security Rules applied
- **Playwright** for E2E tests: full user flows (organizer creates event → attendee RSVPs → attendee cancels) plus `axe-core` accessibility assertions on each primary route
- **No React Testing Library** — component behavior is covered by E2E; Zod schema behavior is covered by unit tests; there is no valuable middle layer for this project's component surface

### Consequences

**Positive:**

- Integration tests against the emulator test Security Rules, transactions, and email dispatch stubs — the highest-risk logic in the app
- Playwright E2E tests cover accessibility automatically on every CI run — no separate a11y CI step needed
- Vitest's watch mode is fast enough for TDD on Server Action logic
- Skipping RTL removes a significant source of test maintenance burden: no more "update snapshots because a className changed"

**Negative:**

- Firebase Emulator adds complexity to CI: the emulator must start before tests run. Mitigation: `firebase emulators:exec` wraps the test command and handles lifecycle automatically
- No component-level tests means a broken form component might not be caught until E2E. Mitigation: E2E tests cover the critical form flows; component bugs surface quickly in development with hot reload
- Playwright tests are slower than unit tests — a full E2E suite run takes 2–5 minutes. Mitigation: run unit + integration tests on every commit, E2E only on PRs and main branch merges

**Watch:** If the component surface grows significantly (e.g., a rich text editor, a complex date picker, a drag-and-drop board), RTL component tests become worthwhile for that specific subset. The decision is "no RTL for current components," not "never RTL."

---
