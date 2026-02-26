# EventHub — Product Requirements Document
**Version:** 1.0 · **Status:** Draft · **Owner:** Engineering

---

## 1. Problem Statement

Discovering local and community events is fragmented. Facebook Events has the audience but punishes non-members. Meetup is niche. Eventbrite optimizes for ticket revenue, not community. EventHub fills the gap: a fast, accessible, no-account-required discovery experience for attendees, with a clean organizer flow for people running recurring or one-off community events.

---

## 2. Target Users

### Attendees
People who want to find and RSVP to local or interest-based events without creating an account or downloading an app. They may use assistive technology, keyboard navigation, or be on a slow mobile connection.

### Organizers
Community builders, meetup hosts, educators, and local businesses who run events regularly. They need a low-friction way to publish events, collect RSVPs, and communicate with attendees — without the overhead of a full ticketing platform.

---

## 3. Jobs To Be Done (JTBD)

| User | Job | Outcome |
|------|-----|---------|
| Attendee | Find events near me or by interest | Confident I haven't missed something relevant |
| Attendee | RSVP quickly without friction | Committed with minimal steps; can cancel if plans change |
| Attendee | Know what to expect before I show up | Informed: location, time, format, who's attending |
| Organizer | Publish an event in < 5 minutes | Event is live and shareable immediately |
| Organizer | See who's coming and manage headcount | Aware of attendee count; can close RSVPs when full |
| Organizer | Send updates to registered attendees | Attendees notified of changes without leaving the platform |
| Organizer | Review and edit a past or future event | Control over event lifecycle without support tickets |

---

## 4. Primary User Stories

### Attendee
- **US-A1:** As an attendee, I can browse events by date, location, and category so I can find ones relevant to me.
- **US-A2:** As an attendee, I can RSVP to a free event using only my name and email — no account required — so there's no signup friction.
- **US-A3:** As an attendee, I receive a confirmation email with a cancel link so I can manage my attendance without logging in.
- **US-A4:** As an attendee, I can view an event detail page with all information I need (location, time, format, capacity, organizer) before committing.
- **US-A5:** As an attendee with an account, I can view all my upcoming RSVPs in a dashboard.

### Organizer
- **US-O1:** As an organizer, I can register and create an organizer profile so my events are associated with my identity.
- **US-O2:** As an organizer, I can create, edit, publish, and unpublish events with: title, description, date/time, location (address or virtual link), category, cover image, and capacity limit.
- **US-O3:** As an organizer, I can view the RSVP list for each event (name, email, timestamp) and export it as CSV.
- **US-O4:** As an organizer, I can close RSVPs manually or set a capacity cap that auto-closes when reached.
- **US-O5:** As an organizer, I can send a broadcast message to all current RSVPs for a given event.
- **US-O6:** As an organizer, I can cancel an event — which triggers cancellation emails to all RSVPs automatically.

---

## 5. MVP Scope

### In Scope
- Organizer auth (email/password + Google OAuth via Firebase Auth)
- Organizer dashboard: create, edit, publish, unpublish, cancel events
- Public event discovery page: filterable list with search (by keyword, category, date range)
- Public event detail page with RSVP form (name + email, no account needed)
- RSVP confirmation email + cancellation link (Firebase + transactional email via Resend or similar)
- Organizer RSVP management: list view, capacity enforcement, CSV export
- Broadcast email to RSVPs (plain-text, rate-limited)
- Responsive UI: mobile-first layout, tested down to 375px
- Firebase Hosting + Firestore + Storage (cover images)

### Out of Scope (v1)
- Paid or ticketed events — no payment processing
- Native mobile apps (PWA acceptable)
- Calendar integrations (Google Calendar, iCal export) — planned v2
- Social features: comments, following organizers, sharing to social
- Analytics dashboard for organizers beyond RSVP count
- Multi-organizer / team accounts
- Waitlists (capacity closes RSVPs; no queue management)
- Recurring event series — each event is standalone in v1

---

## 6. Success Metrics

| Metric | Target (90 days post-launch) |
|--------|------------------------------|
| Organizer activation rate | ≥ 60% of registered organizers publish ≥ 1 event |
| RSVP conversion | ≥ 40% of event detail page visitors RSVP |
| RSVP cancellation rate | ≤ 15% (signal of intent quality) |
| Time to first event published | ≤ 5 minutes (p75 organizer session) |
| Lighthouse Accessibility score | ≥ 95 on all primary routes |
| Core Web Vitals | LCP < 2.5s, CLS < 0.1, INP < 200ms on mid-range device / 4G |
| Error rate | < 0.5% of RSVP submissions result in an unhandled error |

---

## 7. Key Constraints

- **No paid features in v1.** Stripe and any payment surface are explicitly excluded to keep scope and compliance surface small.
- **Stateless attendee RSVP.** Attendees should not be required to create an account. RSVP identity is verified via email + a signed cancel token, not a session.
- **Email deliverability.** The platform relies on transactional email. Must use a reputable provider with SPF/DKIM configured; failed email delivery must be logged and surfaced to organizers.
- **Firebase ecosystem only.** No secondary databases, no separate backend service in v1. All business logic lives in Server Actions, Firebase Security Rules, or Cloud Functions (minimal).
- **Accessibility is not optional.** WCAG 2.1 AA is a hard constraint, not a stretch goal. Keyboard-only operation and screen reader compatibility are tested before any route ships.

---

## 8. Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| Attendee RSVPs twice with same email | Idempotent: update timestamp, do not create duplicate; show "you're already registered" message |
| Organizer sets capacity to 50; 51st person tries to RSVP | Form submission returns a clear error: "This event is now full." RSVPs remain closed until organizer reopens. |
| Organizer cancels an event with 200 RSVPs | Cancellation emails are queued and sent in batches to avoid rate limits; organizer sees a progress indicator |
| Organizer edits date/time after RSVPs exist | Event detail shows updated time; a change-notification email is sent to all current RSVPs |
| RSVP cancel link is expired or invalid | User sees a clear error page with option to contact the organizer; no silent failure |
| Event detail page loaded with no cover image | Default branded placeholder renders; no broken image `alt` violations |
| Organizer attempts to publish event with past date | Form validation blocks submission with inline error; no silent data corruption |
| User visits event URL after event is cancelled | Page renders with a "This event has been cancelled" banner; RSVP form is hidden |
| Attendee submits RSVP on slow connection (offline / timeout) | Optimistic UI shows pending state; on timeout, rolls back with a toast: "Something went wrong — please try again." |
| Organizer session expires mid-form | Form data is preserved in `sessionStorage`; user is redirected to login and returned to draft on re-auth |

---

## 9. Accessibility Requirements

These are **hard requirements** — each must pass before the corresponding feature is considered shippable.

### 9.1 Keyboard Navigation
- Every interactive element (buttons, links, inputs, toggles, date pickers) must be reachable and operable using `Tab`, `Shift+Tab`, `Enter`, `Space`, and arrow keys where appropriate.
- No keyboard traps except intentional modal focus traps (which must be escapable via `Escape`).
- A visible skip-to-main-content link must appear on `:focus` at the top of every page.

### 9.2 Focus Management
- When a modal or dialog opens, focus moves to the first focusable element inside it.
- When a modal closes, focus returns to the element that triggered it.
- After form submission (success or error), focus moves to the status message or first error field — never lost to `body`.
- Route changes in the SPA must announce the new page title to screen readers via an `aria-live` landmark.

### 9.3 Form Errors
- Inline validation errors must be associated with their input via `aria-describedby`.
- Error messages must never rely on color alone — they must include an icon or explicit text prefix ("Error:").
- On submit with validation failures, focus moves to the first invalid field; a summary can optionally precede the form.
- `aria-invalid="true"` must be set on each invalid input.

### 9.4 Color Contrast
- Normal text: minimum **4.5:1** contrast ratio against background.
- Large text (≥ 18pt or ≥ 14pt bold): minimum **3:1**.
- UI components and focus indicators: minimum **3:1**.
- Focus ring must be clearly visible in both light and dark themes.

### 9.5 Reduced Motion
- All transitions and animations must respect `prefers-reduced-motion: reduce`.
- Implementation: CSS `@media (prefers-reduced-motion: reduce)` removes or collapses all `transition` and `animation` declarations.
- Skeleton loaders replace animated spinners when reduced motion is active.

### 9.6 Semantic Structure
- One `<h1>` per page, logical heading hierarchy.
- Landmark regions: `<header>`, `<main>`, `<nav>`, `<footer>`.
- All images have meaningful `alt` text; decorative images use `alt=""`.
- Live regions (`aria-live="polite"`) for toast notifications and real-time RSVP count updates.

---