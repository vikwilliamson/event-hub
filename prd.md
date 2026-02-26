# EventHub — Product Requirements Document

**Version:** 1.1 · **Status:** Draft · **Owner:** Engineering
**Changes from v1.0:** MVP scope significantly tightened to validate core loop only. See §5 for full diff.

---

## 1. Problem Statement

Discovering and attending local or community events is fragmented. Eventbrite optimizes for ticket revenue; Facebook Events locks content behind accounts. EventHub validates a simpler thesis first: **will organizers publish events if the tool is fast, and will attendees RSVP if there's no signup friction?** The MVP proves or disproves that loop before investing in discovery, search, or social features.

---

## 2. Target Users

### Attendees

People who receive a direct event link — via message, email, or social post — and want to RSVP immediately without creating an account. Friction at this step kills conversion. They must be able to complete the RSVP form and receive confirmation in under 60 seconds.

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
- **US-A2:** As an attendee, I can RSVP using only my name and email — no account required — and receive a confirmation email immediately.
- **US-A3:** As an attendee, I can cancel my RSVP via a link in my confirmation email without logging in.
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

- Form fields: name, email — nothing else
- Idempotent: submitting the same email again updates timestamp, shows "you're already registered"
- Confirmation email sent on RSVP: includes event details + a signed, expiring cancel link
- Cancel link: validates token, removes RSVP, sends cancellation confirmation email
- Race-condition protection on capacity: Firestore transaction checks current count before writing

**Organizer Event View**

- List of organizer's own events with status and RSVP count
- Per-event RSVP list: name, email, timestamp — read-only in v1
- No filters, no search, no sorting beyond creation order

### Explicitly Out of Scope (v1)

These are removed from v1.0 scope and documented here to prevent scope creep:

| Feature                                    | Rationale for deferral                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Event discovery / search / categories      | Validates link-sharing as the distribution model first                  |
| Google OAuth                               | Reduces auth surface; revisit if email-only shows drop-off              |
| Attendee accounts / RSVP dashboard         | No account required is a core hypothesis to validate                    |
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

| Metric                        | Target                                           | What it validates                                 |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Organizer activation          | ≥ 50% of registered organizers publish ≥ 1 event | Tool is usable enough to complete the create flow |
| RSVP conversion               | ≥ 35% of event page visitors submit an RSVP      | No-account flow is low-friction enough            |
| Time to first event published | ≤ 5 min at p75                                   | Event creation form is not too complex            |
| RSVP cancel link success rate | ≥ 95% of cancel link clicks succeed              | Token/email infrastructure is reliable            |
| Unhandled RSVP errors         | < 1% of submissions                              | Core submission path is stable                    |
| Lighthouse Accessibility      | ≥ 90 on event detail and RSVP form routes        | Baseline a11y bar is met                          |

---

## 7. Key Constraints

- **No payment processing.** Stripe and any financial surface are out of scope permanently until a separate compliance review.
- **Stateless attendee RSVP.** Attendees must never be required to create an account. Cancel identity is verified via a signed, time-limited token — not a session cookie.
- **Race-condition safety on capacity.** RSVP writes must use a Firestore transaction to read-then-write RSVP count atomically. Optimistic client UI is acceptable; the server is the source of truth.
- **Firebase ecosystem only.** No secondary databases, no external backend service. Business logic lives in Next.js Server Actions and Firebase Security Rules.
- **Transactional email is a hard dependency.** Confirmation and cancellation emails are not optional. If the email provider fails, the RSVP write should still succeed but the failure must be logged.
- **Accessibility is a baseline requirement.** Semantic HTML, keyboard operability, and WCAG color contrast are required for all shipped routes. Advanced focus orchestration (e.g., SPA route-change announcements) is deferred but not abandoned.

---

## 8. Edge Cases

| Scenario                                          | Expected Behaviour                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Attendee RSVPs twice with same email              | Idempotent update; responds with "you're already registered" — no duplicate record                                                             |
| 51st RSVP on a capacity-50 event                  | Firestore transaction rejects write; form returns "This event is now full" error                                                               |
| Two simultaneous RSVPs hit the last spot          | Transaction ensures exactly one succeeds; the other receives the full-event error                                                              |
| Cancel link is expired or tampered                | Error page: "This link is invalid or has expired." No silent failure; organizer contact info shown                                             |
| Organizer cancels event with existing RSVPs       | Cancellation emails queued to all RSVPs; event page shows cancelled banner; RSVP form hidden                                                   |
| Organizer edits date/time post-RSVP               | Updated info shown on event page; **no automated notification in v1** — organizer must re-share link                                           |
| Event page visited after unpublish                | Returns 404 — not a "private" holding page, simply not found                                                                                   |
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
| OQ-1 | Which transactional email provider? (Resend vs SendGrid vs Postmark) | Eng             | Before implementation sprint      |
| OQ-2 | What is the cancel token TTL? (72h? 30 days? Event date?)            | Product         | Before RSVP implementation        |
| OQ-3 | Should organizer event list show cancelled events or hide them?      | Product         | Before organizer dashboard sprint |
| OQ-4 | What happens to RSVPs if an organizer deletes their account?         | Product + Legal | Post-MVP                          |

---
