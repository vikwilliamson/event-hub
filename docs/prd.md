# EventHub — Product Requirements Document

**Version:** 1.2 · **Status:** Draft · **Owner:** Engineering
**Changes from v1.1:** RSVP model updated to auth-based (Option A). Attendees must have a Firebase Auth account to RSVP. Cancel flow is session-based via /my-rsvps. See §5 RSVP Flow and ADR-006.

---

## 1. Problem Statement

Discovering and attending local or community events is fragmented. Eventbrite optimizes for ticket revenue; Facebook Events locks content behind accounts. EventHub validates a simpler thesis first: **will organizers publish events if the tool is fast, and will attendees sign up and RSVP if the experience is compelling and the value is clear?** The MVP proves or disproves that loop before investing in discovery, search, or social features.

---

## 2. Target Users

### Attendees

People who discover an event via a direct link — shared via message, email, or social post — and want to RSVP. Attendees must have a Firebase Auth account to RSVP; account creation is streamlined and takes under 60 seconds. Once registered, attendees can manage all their RSVPs from a personal dashboard (`/my-rsvps`) without needing email cancel links. They must be able to complete the RSVP flow (sign up if needed + RSVP) in under 90 seconds.

### Organizers

Community builders, meetup hosts, and educators who need to publish an event and share a link, fast. They are not running paid events. They want to see who's coming. They do not need a CRM.

---

## 3. Jobs To Be Done (JTBD)

| User      | Job                                       | Outcome                                                            |
| --------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Attendee  | RSVP to an event I was sent a link to     | Confirmed with a receipt; able to cancel if plans change           |
| Attendee  | Know what to expect before committing     | Informed: title, date/time, location, description, remaining spots |
| Organizer | Publish an event and get a shareable link | Live and ready to distribute in < 5 minutes                        |
| Organizer | Know how many people are coming           | Accurate RSVP count, updated in real time                          |
| Organizer | Close RSVPs when the event is full        | Capacity enforced automatically; no manual intervention needed     |

---

## 4. Primary User Stories

### Attendee

- **US-A1:** As an attendee, I can view an event detail page with title, description, date/time, location, and remaining capacity so I have everything I need to decide.
- **US-A2:** As an authenticated attendee, I can RSVP to an event with a single click and receive a personalized confirmation email immediately.
- **US-A3:** As an authenticated attendee, I can cancel my RSVP from my RSVPs dashboard (`/my-rsvps`) without needing a cancel link in my email.
- **US-A4:** As an attendee who tries to RSVP to a full event, I see a clear message that the event is at capacity — no form is shown.

### Organizer

- **US-O1:** As an organizer, I can register and log in with email and password.
- **US-O2:** As an organizer, I can create an event with: title, description, date/time, location (free text), and an optional capacity limit — and receive a shareable public URL immediately on publish.
- **US-O3:** As an organizer, I can edit or cancel an event after publishing.
- **US-O4:** As an organizer, I can see the current RSVP count and a list of attendee names and emails for each of my events.
- **US-O5:** As an organizer, I can manually close RSVPs for an event regardless of capacity.

---

## 5. MVP Scope

### Core Loop Being Validated

```
Organizer creates event → shares link → Attendee RSVPs → Attendee cancels if needed
```

Every feature decision is evaluated against whether it is **required to complete this loop**.

### In Scope

**Auth**

- Email/password registration and login (Firebase Auth)
- Password reset via email
- No Google OAuth in v1 — reduces surface area, validates if email-only is enough

**Event Management (Organizer)**

- Create event: title (required), description (required), date/time (required), location as free text (required), capacity (optional integer)
- Edit event: all fields editable post-publish
- Cancel event: soft-delete with status flag; triggers cancellation emails to all RSVPs
- Publish/unpublish toggle: unpublished events are not publicly accessible

**Public Event Page**

- Accessible via direct link (`/events/[id]`) — no browse or search surface
- Displays all event fields; shows remaining spots if capacity is set
- Shows a clear "This event is full" or "This event has been cancelled" state when applicable
- No login required to view

**RSVP Flow**

- Requires authentication: unauthenticated visitors are redirected to `/login` when they attempt to RSVP
- One-click RSVP: no form fields — attendee identity comes from the Firebase Auth session
- Idempotent: a second RSVP attempt by the same user returns "you're already registered"
- Confirmation email sent on RSVP: AI-generated, personalized using attendee's display name and event details; no cancel link required
- Cancel: attendees cancel from their RSVPs dashboard (`/my-rsvps`); session-based, no email link needed
- Race-condition protection on capacity: Firestore transaction checks `rsvpCount` against `capacity` before writing

**Organizer Event View**

- List of organizer's own events with status and RSVP count
- Per-event attendee list: display name, email, RSVP timestamp — sourced from Firebase Auth; read-only in v1
- No filters, no search, no sorting beyond creation order

**Attendee Dashboard**

- Authenticated attendees can view all their RSVPs at `/my-rsvps`
- Shows event title, date, location for each RSVP
- Cancel RSVP button per confirmed RSVP

### Explicitly Out of Scope (v1)

These are removed from v1.0 scope and documented here to prevent scope creep:

| Feature                                    | Rationale for deferral                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Event discovery / search / categories      | Validates link-sharing as the distribution model first                  |
| Google OAuth                               | Reduces auth surface; revisit if email sign-up shows drop-off           |
| Cancel token / email-based RSVP cancel     | Auth-based session cancel supersedes this (see ADR-006)                 |
| CSV export                                 | RSVP list view is sufficient for MVP organizer needs                    |
| Broadcast email to RSVPs                   | Out of scope until deliverability infra is hardened                     |
| Email delivery dashboard / bounce tracking | Deferred with broadcast messaging                                       |
| Calendar export (iCal, Google)             | Nice-to-have; doesn't affect core loop                                  |
| Cover images / media uploads               | Adds Storage complexity; text-only events sufficient for v1             |
| Waitlists                                  | Capacity closes the form; no queue in v1                                |
| Recurring events                           | Each event is standalone                                                |
| Multi-organizer / team accounts            | Single-organizer model for v1                                           |
| Advanced SPA focus orchestration           | Baseline semantic + keyboard standards; full a11y audit post-validation |

---

## 6. Success Metrics

The MVP is validated when the following are true at 60 days post-launch:

| Metric                        | Target                                            | What it validates                                  |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Organizer activation          | ≥ 50% of registered organizers publish ≥ 1 event  | Tool is usable enough to complete the create flow  |
| RSVP conversion               | ≥ 25% of event page visitors complete an RSVP     | Auth-gated flow is not too high-friction           |
| Attendee account creation     | ≥ 60% of RSVP-intent visitors complete sign-up    | Sign-up friction is acceptable                     |
| Time to first event published | ≤ 5 min at p75                                    | Event creation form is not too complex             |
| My RSVPs engagement           | ≥ 30% of RSVPs are viewed in /my-rsvps dashboard  | Auth model drives session return                   |
| Unhandled RSVP errors         | < 1% of submissions                               | Core submission path is stable                     |
| Lighthouse Accessibility      | ≥ 90 on event detail and RSVP routes              | Baseline a11y bar is met                           |

---

## 7. Key Constraints

- **No payment processing.** Stripe and any financial surface are out of scope permanently until a separate compliance review.
- **Auth-based attendee RSVP.** Attendees must have a Firebase Auth account to RSVP. Cancel operations are session-based via `/my-rsvps` — no HMAC tokens, no cancel links in email. See ADR-006 for the rationale.
- **Race-condition safety on capacity.** RSVP writes must use a Firestore transaction to read-then-write RSVP count atomically. Optimistic client UI is acceptable; the server is the source of truth.
- **Firebase ecosystem only.** No secondary databases, no external backend service. Business logic lives in Next.js Server Actions and Firebase Security Rules.
- **Transactional email is a hard dependency.** Confirmation and cancellation emails are not optional. If the email provider fails, the RSVP write should still succeed but the failure must be logged.
- **Accessibility is a baseline requirement.** Semantic HTML, keyboard operability, and WCAG color contrast are required for all shipped routes. Advanced focus orchestration (e.g., SPA route-change announcements) is deferred but not abandoned.

---

## 8. Edge Cases

| Scenario                                          | Expected Behaviour                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Attendee RSVPs twice (same account)               | Idempotent: second attempt returns "you're already registered" — doc ID is `userId`, no duplicate record created                               |
| 51st RSVP on a capacity-50 event                  | Firestore transaction rejects write; form returns "This event is now full" error                                                               |
| Two simultaneous RSVPs hit the last spot          | Transaction ensures exactly one succeeds; the other receives the full-event error                                                              |
| Attendee tries to cancel already-cancelled RSVP   | Clear message: "Your RSVP has already been cancelled." No duplicate decrement.                                                                 |
| Organizer cancels event with existing RSVPs       | Cancellation emails queued to all RSVPs (sent to their registered email); event page shows cancelled banner; RSVP form hidden                  |
| Organizer edits date/time post-RSVP               | Updated info shown on event page; **no automated notification in v1** — organizer must re-share link                                           |
| Event page visited after unpublish                | Returns 404 — not a "private" holding page, simply not found                                                                                   |
| Unauthenticated user clicks RSVP                  | Redirected to `/login?next=/events/[id]`; after login, returned to event page                                                                  |
| Attendee submits RSVP on slow/dropped connection  | Optimistic UI shows pending; on timeout, rolls back with toast: "Something went wrong — please try again."                                     |
| Organizer session expires mid-form                | Form data preserved in `sessionStorage`; redirect to login; return to draft on re-auth                                                         |
| Organizer tries to publish event with a past date | Inline validation error blocks submission: "Event date must be in the future."                                                                 |
| RSVP confirmation email fails to send             | RSVP record is written; failure is logged to server console + Firestore error log; user sees success (email failure is async and non-blocking) |

---

## 9. Accessibility Requirements

Advanced SPA orchestration is deferred (see §5), but the following are **hard requirements** for every shipped route.

### 9.1 Keyboard Navigation

- All interactive elements — buttons, links, inputs, the RSVP form — are reachable and operable by keyboard alone.
- No keyboard traps. Modals (if any are introduced) must be escapable via `Escape`.
- A visible skip-to-main-content link appears on `:focus` at the top of every page.

### 9.2 Focus Management — Baseline

- After RSVP form submission (success or error), focus must not be lost. On success, focus moves to the confirmation message. On error, focus moves to the first invalid field.
- `aria-invalid="true"` set on each invalid input. Error messages linked via `aria-describedby`.

### 9.3 Form Errors

- Errors never rely on color alone — icon or explicit "Error:" text prefix required.
- On submit with validation failures, focus moves to the first invalid field.
- Inline errors appear adjacent to their input, not in a remote summary only.

### 9.4 Color Contrast

- Normal text: ≥ **4.5:1** against background.
- Large text (≥ 18pt / 14pt bold): ≥ **3:1**.
- Focus indicators: ≥ **3:1** against adjacent colors; clearly visible in both light and any future dark theme.

### 9.5 Reduced Motion

- All CSS transitions and animations wrapped in `@media (prefers-reduced-motion: no-preference)` — motion is opt-in, not opt-out.
- Loading states use non-animated skeletons when reduced motion is active.

### 9.6 Semantic Structure

- One `<h1>` per page; logical heading hierarchy throughout.
- Landmark regions present: `<header>`, `<main>`, `<nav>`, `<footer>`.
- All non-decorative images have meaningful `alt` text.
- Toast notifications rendered in an `aria-live="polite"` region.

---

## 10. Open Questions

| #    | Question                                                             | Owner           | Target                            |
| ---- | -------------------------------------------------------------------- | --------------- | --------------------------------- |
| OQ-1 | Which transactional email provider? (Resend vs SendGrid vs Postmark)  | Eng             | Before email implementation sprint |
| OQ-2 | ~~Cancel token TTL?~~ — **Resolved N/A.** Auth-based RSVP model uses session-based cancel; no cancel tokens. See ADR-006. | — | Resolved |
| OQ-3 | Should organizer event list show cancelled events or hide them?       | Product         | Before organizer dashboard sprint  |
| OQ-4 | What happens to RSVPs if an organizer deletes their account?          | Product + Legal | Post-MVP                           |
| OQ-5 | Should unauthenticated event page visitors see a "Sign in to RSVP" prompt or a full sign-in inline widget? | Product + UX | Before RSVP flow polish sprint |

---
