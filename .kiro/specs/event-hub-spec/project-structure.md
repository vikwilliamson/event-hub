# EventHub — Project Structure

**Version:** 1.0 · **Status:** Living Document

---

## Directory Tree (Actual, as of v0.1)

```
event-hub/
├── .env.example                         # Env var template (committed)
├── .env.local                           # Local secrets (gitignored)
├── .firebaserc                          # Firebase project aliases
├── firebase.json                        # Hosting + emulator config
├── firestore.rules                      # Security rules
├── firestore.indexes.json               # Composite index definitions
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts                   # ⚠️ Referenced but not in file tree (check exists)
├── jest.a11y.config.ts                  # ⚠️ Uses Jest; conflicts with Vitest decision
├── playwright.a11y.config.ts            # Playwright config for a11y tests
│
├── docs/                                # Design + architecture documentation
│   ├── prd.md                           # Product requirements
│   ├── project-arch.md                  # Architecture and conventions
│   ├── data-model.md                    # Firestore data model
│   ├── adr.md                           # Architecture decision records
│   ├── interaction-spec.md              # UX interaction spec
│   ├── info-arch.md                     # Information architecture
│   ├── security-rules.md                # Firestore security rules spec
│   ├── rsvp-security-update.md          # RSVP security notes
│   ├── observability-implementation.md  # Logging/analytics design
│   ├── accessibility-testing-checklist.md
│   ├── rules-test-plan.md
│   └── scaffolding-plan.md
│
├── scripts/                             # One-off database seed scripts
│   ├── seed-events.ts
│   ├── seed-final.ts
│   ├── seed-rsvps.ts
│   ├── seed-simple.ts
│   ├── seed-standalone.ts
│   └── test-env.ts
│
└── src/
    ├── middleware.ts                     # ⚠️ DISABLED — passes all requests through
    │
    ├── app/                             # Next.js App Router — routes only
    │   ├── layout.tsx                   # Root layout: Inter font, SkipLink, globals
    │   ├── error.tsx                    # Global error boundary
    │   ├── not-found.tsx                # Global 404
    │   ├── globals.css                  # Tailwind base styles
    │   │
    │   ├── (public)/                    # Public routes — minimal header/footer
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                 # Home page / landing
    │   │   ├── events/
    │   │   │   ├── page.tsx             # Browse all published events
    │   │   │   └── [id]/
    │   │   │       └── page.tsx         # Event detail + RSVP button
    │   │   └── my-rsvps/
    │   │       └── page.tsx             # ⚠️ HARDCODED sample data — not connected to DB
    │   │
    │   ├── (auth)/                      # Auth routes — centered card layout
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   └── reset-password/page.tsx
    │   │
    │   ├── (organizer)/                 # Protected organizer routes
    │   │   ├── layout.tsx               # ⚠️ No auth guard in layout
    │   │   └── dashboard/
    │   │       ├── page.tsx             # ⚠️ No auth — shows all events from all organizers
    │   │       └── events/
    │   │           ├── new/page.tsx     # Create event (has session check)
    │   │           └── [id]/page.tsx    # View event after create (has session check)
    │   │
    │   └── api/
    │       └── test-env/route.ts        # Dev utility: test env var connectivity
    │
    ├── components/
    │   ├── analytics-dashboard.tsx      # ⚠️ BROKEN — imports missing analytics module
    │   ├── error-boundary.tsx
    │   │
    │   ├── auth/
    │   │   ├── login-form.tsx           # Client component; Firebase sign-in + session create
    │   │   └── register-form.tsx        # Client component; Firebase register + session create
    │   │
    │   ├── event/
    │   │   ├── event-card.tsx           # Event summary card with RSVP button
    │   │   ├── event-form.tsx           # Create event form (client component)
    │   │   ├── rsvp-button.tsx          # RSVP / Cancel toggle button
    │   │   └── optimized-events-page.tsx # ⚠️ Unknown status — not referenced by routes
    │   │
    │   ├── layout/
    │   │   ├── organizer-topbar.tsx     # Organizer nav with sign-out
    │   │   ├── public-header.tsx        # Public nav
    │   │   └── skip-link.tsx            # Accessibility skip-to-main link
    │   │
    │   └── ui/                          # Domain-agnostic primitives
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── textarea.tsx
    │       ├── field-error.tsx
    │       └── spinner.tsx
    │
    ├── hooks/
    │   └── use-rsvp.ts                  # RSVP state + actions hook with in-memory cache
    │
    ├── lib/
    │   ├── env.ts                       # Zod env validation (⚠️ all vars marked optional)
    │   ├── analytics.ts                 # Simple in-memory analytics tracker
    │   │
    │   ├── actions/                     # Next.js Server Actions (mutation layer)
    │   │   ├── auth.actions.ts          # register, createSession, signOut
    │   │   ├── event.actions.ts         # createEvent, getOrganizerEvents (⚠️ no auth on getOrganizerEvents)
    │   │   └── rsvp.actions.ts          # rsvpEvent, cancelRsvp, getMyRsvps, getUserRsvpStatus
    │   │
    │   ├── firebase/
    │   │   ├── admin.ts                 # Firebase Admin SDK singleton
    │   │   ├── client.ts                # Firebase client SDK singleton
    │   │   ├── auth.client.ts           # signIn, signUp, sendResetPasswordEmail, getIdToken
    │   │   ├── auth.server.ts           # getSession, getSessionCookieOptions
    │   │   ├── converters.ts            # Firestore data converters (Event, Rsvp, LegacyRsvp)
    │   │   ├── db.ts                    # getEventsRef, getEventRef, getEvent, getOrganizerDisplayName
    │   │   ├── public-db.ts             # getAllPublishedEvents, getPublishedEvent, findEventById
    │   │   ├── rsvp-db.ts               # getRsvpRef, getUserRsvp, getUserRsvps, getEventRsvps
    │   │   ├── types.ts                 # Event, Rsvp, LegacyRsvp domain types
    │   │   └── optimized-queries.ts     # ⚠️ Unknown — not yet reviewed; possibly unused
    │   │
    │   ├── observability/
    │   │   └── logger.ts                # In-memory logger (no external sink)
    │   │
    │   ├── utils/
    │   │   ├── cn.ts                    # clsx + tailwind-merge utility
    │   │   └── errors.ts                # AppError class, normalizeError
    │   │
    │   └── validations/
    │       ├── auth.schema.ts           # Auth form Zod schemas
    │       └── event.schema.ts          # Event form + action Zod schemas
    │
    └── test/
        ├── e2e/
        │   ├── accessibility.spec.ts    # Playwright a11y specs
        │   └── rsvp-flow.spec.ts        # Playwright RSVP flow specs
        ├── factories/
        │   └── test-data.factory.ts     # Test data seeding helpers
        ├── integration/
        │   ├── create-event.test.ts     # ⚠️ Uses @jest/globals (conflicts with Vitest)
        │   └── rsvp-flow.test.ts        # ⚠️ Uses @jest/globals (conflicts with Vitest)
        └── unit/
            └── rsvp-button.a11y.test.tsx # Accessibility unit test
```

---

## Layer Rules (Enforced by Convention)

```
Routes (app/)
  ↓ imports
Components (components/)
  ↓ imports
Logic (lib/)
```

- Components do not call Firebase directly
- Components do not import from `lib/actions/` directly (actions are passed as props or called via hooks)
- `lib/firebase/admin.ts` and `lib/firebase/auth.server.ts` are server-only; never imported from client components
- All imports use the `@/` alias — no relative `../../` paths
- No barrel `index.ts` files

---

## Architecture Gaps (Spec vs. Reality)

These items exist in the architecture spec but are absent from the current codebase:

| Planned | Status |
|---|---|
| `app/(public)/events/[id]/cancel/page.tsx` | ❌ Missing — cancel token flow not built |
| `app/(organizer)/dashboard/events/[id]/edit/page.tsx` | ❌ Missing — edit event not built |
| `app/(organizer)/dashboard/events/[id]/attendees/page.tsx` | ❌ Missing — attendee list for organizer not built |
| `app/(organizer)/dashboard/loading.tsx` | ❌ Missing — no skeleton/loading state |
| `lib/email/` directory | ❌ Missing — no email infrastructure |
| `lib/tokens/cancel-token.ts` | ❌ Missing — no cancel token generation/verification |
| `components/rsvp/` directory | ❌ Missing — rsvp-form, rsvp-success-banner, cancel-confirmation |
| `components/attendee/attendee-table.tsx` | ❌ Missing |
| `hooks/use-toast.ts` | ❌ Missing |
| `hooks/use-form-recovery.ts` | ❌ Missing |
| `hooks/use-focus-trap.ts` | ❌ Missing |
| `hooks/use-copy-to-clipboard.ts` | ❌ Missing |
| `components/ui/toast.tsx` / `toast-region.tsx` | ❌ Missing |
| `components/ui/dialog.tsx` | ❌ Missing |
| `components/ui/badge.tsx` | ❌ Missing |
| `components/ui/skeleton.tsx` | ❌ Missing |
| `lib/validations/rsvp.schema.ts` | ❌ Missing |
| `src/types/` directory | ❌ Types live in `lib/firebase/types.ts` instead |

---

## Firestore Data Hierarchy

```
/organizers/{userId}
/organizers/{userId}/events/{eventId}
/organizers/{userId}/events/{eventId}/rsvps/{rsvpId}
```

RSVPs use the authenticated user's UID as the document ID (not email hash as documented in the data model spec — this is a divergence).
