# EventHub — Product Overview

**Version:** 1.0 · **Status:** Living Document

---

## What Is EventHub?

EventHub is a lightweight event discovery and RSVP platform built for community organizers. The core value proposition is speed and zero friction: an organizer can publish an event in under 5 minutes and share a direct link; an attendee can RSVP using only their name and email with no account required.

It deliberately avoids the complexity of Eventbrite (paid ticketing, heavy UI) and Facebook Events (account walls, algorithmic feeds). The thesis is: **link-sharing is sufficient distribution for community events, and friction kills RSVP conversion.**

---

## Who Is It For?

**Organizers** — Community builders, meetup hosts, educators, and anyone who needs to announce an event, share a link, and track who's coming. They are not running paid events. They don't need a CRM. They want to know who shows up.

**Attendees** — People who receive a shared event link and want to RSVP immediately. They should never be required to create an account to confirm attendance.

---

## Core User Loop

```
Organizer creates event → shares link → Attendee RSVPs → Attendee can cancel if needed
```

Every feature decision in the MVP is evaluated against whether it is required to complete this loop.

---

## Current State (v0.1)

The project is in active scaffolding. The architecture, data model, and auth patterns are well-designed and documented, but a significant portion of the intended functionality is either stubbed, bypassed, or incomplete. Specifically:

- **Auth is partially bypassed.** Middleware is disabled (allows all routes). The organizer dashboard has no real auth gate. `createEvent` uses a hardcoded test organizer ID.
- **RSVP system has a model mismatch.** The PRD describes an email-based, no-account RSVP flow. The implementation uses Firebase Auth (account-based) RSVPs. The `LegacyRsvp` type in the codebase reflects this conflict.
- **Email is not implemented.** No transactional email provider is wired up. Confirmation and cancellation emails — a hard requirement in the PRD — are missing entirely.
- **Cancel token flow is not implemented.** No cancel link generation, no token verification endpoint, no cancellation page.
- **My RSVPs page is hardcoded.** It renders static sample data instead of live Firestore data.
- **Analytics references a missing module.** `analytics-dashboard.tsx` imports from `@/lib/observability/analytics` which does not exist; `analytics.ts` is a different, simpler module.
- **Several routes from the architecture spec are absent.** No `loading.tsx` skeletons, no edit event page, no attendee list page for organizers.

---

## Key Design Decisions (Already Made)

- **Next.js App Router** with Server Components as the default; `"use client"` only where interactivity requires it.
- **Firebase** for auth (session cookies), Firestore for the database, no secondary databases.
- **No payment processing.** Permanently out of scope.
- **Firestore transaction** for RSVP capacity enforcement — eliminates race conditions.
- **Zod** for validation on both client and server — single schema, two contexts.
- **No Zustand.** All state is local or passed as props. Toast notifications use a custom context hook.
- **Three-layer architecture:** Routes → Components → Logic. No Firebase calls from components or route files directly.
- **Session cookies** (not ID token headers) for organizer auth — `HttpOnly`, `Secure`, `SameSite=Strict`.

---

## MVP Success Metrics

| Metric | Target |
|---|---|
| Organizer activation | ≥ 50% of registered organizers publish ≥ 1 event |
| RSVP conversion | ≥ 35% of event page visitors submit an RSVP |
| Time to first event published | ≤ 5 min at p75 |
| RSVP cancel link success rate | ≥ 95% |
| Unhandled RSVP errors | < 1% of submissions |
| Lighthouse Accessibility | ≥ 90 on event detail and RSVP form routes |
