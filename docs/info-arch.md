# EventHub — Information Architecture & Screen Specifications
**Version:** 1.0 · **Depends on:** PRD v1.1 · **Status:** Draft

---

## 1. Information Architecture Overview

EventHub has two distinct user contexts with no overlap in navigation:

```
EventHub
│
├── PUBLIC (no auth required)
│   ├── /events/[id]              Event detail + RSVP form
│   └── /events/[id]/cancel       Cancel RSVP (token-gated, no login)
│
├── AUTH (unauthenticated organizers)
│   ├── /login                    Organizer sign-in
│   ├── /register                 Organizer sign-up
│   └── /reset-password           Password reset request + confirmation
│
└── ORGANIZER (authenticated, protected)
    └── /dashboard
        ├── /                     Event list (organizer home)
        ├── /events/new           Create event form
        └── /events/[id]
            ├── /edit             Edit event form
            └── /attendees        RSVP list for one event
```

**Design principle:** Public and organizer surfaces are intentionally separate. There is no combined nav shell. An attendee visiting `/events/[id]` should never see organizer UI chrome.

---

## 2. Route Groups in Next.js App Router

```
app/
├── (public)/                     Layout: minimal header + footer only
│   └── events/
│       └── [id]/
│           ├── page.tsx
│           ├── loading.tsx
│           ├── error.tsx
│           └── cancel/
│               ├── page.tsx
│               └── error.tsx
│
├── (auth)/                       Layout: centered card, no nav
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── reset-password/page.tsx
│
└── (organizer)/                  Layout: sidebar nav + top bar
    └── dashboard/
        ├── page.tsx
        ├── loading.tsx
        ├── events/
        │   └── new/
        │       └── page.tsx
        └── events/
            └── [id]/
                ├── edit/page.tsx
                └── attendees/page.tsx
```

---

## 3. Screen Specifications

---

### SCREEN 1 — Event Detail + RSVP
**Route:** `/events/[id]`
**Auth required:** No
**Route group:** `(public)`

#### Purpose
The single public-facing surface. An attendee lands here from a shared link and decides whether to RSVP. This is the most conversion-critical screen in the product.

#### Primary Actions
- Submit RSVP (name + email)
- View event details (passive)

#### Key Components
| Component | Notes |
|-----------|-------|
| `EventHeader` | Title, date/time (formatted), location string |
| `EventDescription` | Rendered from plain text (pre-wrap); no markdown in v1 |
| `CapacityIndicator` | "12 of 50 spots remaining" — hidden if no cap set |
| `RsvpForm` | Name + email inputs, submit button, inline validation |
| `RsvpSuccessBanner` | Shown after successful submission; includes "check your email" |
| `EventStatusBanner` | Conditionally rendered: "This event is full" / "This event has been cancelled" / "This event is in the past" |
| `OrganizerAttribution` | Organizer display name only — no profile link in v1 |

#### States

**Loading**
- Skeleton: block for title (h1), two lines for meta, paragraph block for description, form shape
- No spinner; skeleton respects `prefers-reduced-motion`

**Empty / Not Found**
- Route returns 404; Next.js `not-found.tsx` renders a branded "Event not found" page
- Suggests checking the link is correct; no search or browse CTA (those don't exist in v1)

**Error (unexpected)**
- `error.tsx` boundary catches thrown errors
- Generic message: "Something went wrong loading this event." with a retry button
- Error logged server-side; no raw error detail exposed to user

**Event Full**
- `EventStatusBanner` variant: "This event has reached capacity."
- `RsvpForm` is not rendered — not hidden behind `display:none`, conditionally absent from DOM
- Heading hierarchy intact; page is still fully readable

**Event Cancelled**
- `EventStatusBanner` variant: "This event has been cancelled by the organizer."
- `RsvpForm` absent
- All event detail still readable

**Event in the Past**
- `EventStatusBanner` variant: "This event has already taken place."
- `RsvpForm` absent

**RSVP Success**
- Form replaced by `RsvpSuccessBanner`: "You're registered! Check your email for confirmation and your cancel link."
- Focus moves to the banner on mount (`autoFocus` on the heading inside the banner)

**Already Registered (idempotent)**
- Same as RSVP Success but message: "You're already registered for this event. Check your email for your confirmation."

**Submission Error**
- Inline error above submit button within the form landmark
- Toast notification in `aria-live` region
- Form inputs retain their values; user can retry

#### Accessibility Notes
- `<h1>` is the event title
- Date/time uses `<time datetime="ISO-8601-string">` 
- `RsvpForm` wrapped in `<section aria-labelledby="rsvp-heading">`
- Capacity text in an `aria-live="polite"` span — updates if another RSVP comes in during the session (real-time listener)

---

### SCREEN 2 — Cancel RSVP
**Route:** `/events/[id]/cancel?token=[token]`
**Auth required:** No
**Route group:** `(public)`

#### Purpose
Allows an attendee to cancel their RSVP without a login. Token is validated server-side. This is a single-action confirmation screen, not a form.

#### Primary Actions
- Confirm cancellation
- (Implicit) Abandon — navigate away without confirming

#### Key Components
| Component | Notes |
|-----------|-------|
| `EventSummaryCard` | Event title, date — read-only context so user knows what they're cancelling |
| `CancelConfirmation` | "Are you sure?" message + Confirm button + Keep my spot button |
| `CancelSuccessBanner` | Shown after confirmed cancellation |
| `CancelErrorBanner` | Shown for invalid/expired/already-used token |

#### States

**Loading**
- Skeleton for event summary card + two buttons

**Valid Token — Confirmation Prompt**
- Default state when token is valid
- Two buttons: "Cancel my RSVP" (destructive, outlined) and "Keep my spot" (primary)
- Focus lands on the confirmation heading on mount

**Cancellation Success**
- Banner: "Your RSVP has been cancelled. We hope to see you at a future event."
- Both buttons removed from DOM
- Focus moves to success banner heading

**Invalid / Expired Token**
- `CancelErrorBanner`: "This cancel link is invalid or has already been used."
- Organizer email shown if available: "If you need help, contact [organizer email]"
- No retry action — link-based flow has no recovery path client-side

**Already Cancelled**
- Treated identically to invalid token — same banner, no distinction exposed to prevent probing

#### Accessibility Notes
- Single `<h1>`: "Cancel your RSVP for [Event Title]"
- Destructive action button uses `aria-describedby` pointing to warning text
- "Keep my spot" is the safer default — it appears second in DOM but is styled as primary to bias toward retention

---

### SCREEN 3 — Register
**Route:** `/register`
**Auth required:** No (redirect to dashboard if already authenticated)
**Route group:** `(auth)`

#### Purpose
Organizer account creation. Email + password only in v1.

#### Primary Actions
- Submit registration form
- Navigate to login (already have an account)

#### Key Components
| Component | Notes |
|-----------|-------|
| `AuthCard` | Centered layout container, shared with login and reset |
| `RegisterForm` | Email, password, confirm password; full Zod validation |
| `PasswordStrengthHint` | Static hint text, not a dynamic meter (reduces complexity) |
| `AuthLink` | "Already have an account? Sign in" |

#### States

**Default**
- Empty form; no pre-filled values (no autofill hints except `autocomplete` attributes)

**Validation Errors (client-side)**
- Inline per-field: "Email is required", "Password must be at least 8 characters", "Passwords do not match"
- `aria-invalid` + `aria-describedby` on each field
- Focus moves to first invalid field on submit attempt

**Server Error**
- Firebase returns auth error (e.g., email already in use)
- Form-level error above submit button: "An account with this email already exists."
- Field values preserved

**Success**
- Redirect to `/dashboard` (new account has no events yet — see dashboard empty state)

**Loading**
- Submit button shows "Creating account…" text; `aria-disabled="true"` and `disabled` set; no spinner in reduced-motion mode

#### Accessibility Notes
- `autocomplete="email"` and `autocomplete="new-password"` on respective fields
- Password field has a show/hide toggle: `aria-label` updates between "Show password" and "Hide password"
- `<form>` has `aria-label="Create your organizer account"`

---

### SCREEN 4 — Login
**Route:** `/login`
**Auth required:** No (redirect to dashboard if already authenticated)
**Route group:** `(auth)`

#### Purpose
Returning organizer authentication.

#### Primary Actions
- Sign in with email + password
- Navigate to register
- Navigate to reset password

#### Key Components
| Component | Notes |
|-----------|-------|
| `AuthCard` | Shared layout container |
| `LoginForm` | Email + password fields |
| `AuthLink` × 2 | "Create an account" + "Forgot your password?" |

#### States

**Default**
- Empty form with `autocomplete="email"` and `autocomplete="current-password"`

**Validation Errors (client-side)**
- Both fields required; shown on submit attempt only — no eager validation on login (avoids false-positive UX)

**Invalid Credentials**
- Form-level error: "Incorrect email or password." — deliberately vague; do not confirm whether email exists
- Both fields retain values (email only — clear password for security)

**Too Many Attempts (Firebase rate-limit)**
- Form-level error: "Too many sign-in attempts. Please try again later or reset your password."

**Success**
- Redirect to `/dashboard`

**Loading**
- Submit button: "Signing in…" + disabled

---

### SCREEN 5 — Reset Password
**Route:** `/reset-password`
**Auth required:** No
**Route group:** `(auth)`

#### Purpose
Two-step: (1) request reset email, (2) confirmation that email was sent. Firebase handles the actual reset link.

#### Primary Actions
- Submit email to request reset
- Return to login

#### Key Components
| Component | Notes |
|-----------|-------|
| `AuthCard` | Shared layout |
| `ResetRequestForm` | Single email field |
| `ResetSuccessBanner` | Shown after submit; always shown regardless of whether email exists (prevents enumeration) |

#### States

**Default**
- Single email field + submit button

**Success (always shown on valid form submit)**
- Banner replaces form: "If an account exists for that email, you'll receive a reset link shortly."
- Link back to login
- Note: shown even if email doesn't exist — prevents account enumeration

**Validation Error**
- Email field required + valid format

**Loading**
- Submit button disabled while Firebase request in flight

---

### SCREEN 6 — Organizer Dashboard (Event List)
**Route:** `/dashboard`
**Auth required:** Yes — redirect to `/login` if unauthenticated
**Route group:** `(organizer)`

#### Purpose
The organizer's home screen. Lists all their events. The entry point to all organizer actions.

#### Primary Actions
- Create a new event
- Navigate to edit an event
- Navigate to view attendees for an event
- Cancel an event (inline action)

#### Key Components
| Component | Notes |
|-----------|-------|
| `OrganizerNav` | Top bar with app name + sign-out link; no sidebar in v1 (single-level nav) |
| `EventListItem` | Title, date, status badge (Published/Unpublished/Cancelled), RSVP count, action links |
| `EmptyState` | First-time or zero-event prompt |
| `CreateEventButton` | Primary CTA; always visible at top of list |
| `CancelEventDialog` | Confirmation modal triggered inline; focus-trapped |

#### States

**Loading**
- Three `EventListItem` skeletons with animated shimmer (static in reduced-motion)

**Empty (no events yet)**
- Illustration (SVG, decorative `aria-hidden`) + heading: "You haven't created any events yet."
- Primary button: "Create your first event"
- No other UI — clean, directed

**Populated**
- Events in reverse-chronological order (newest first)
- Status badge colors must meet 3:1 contrast on badge background
- RSVP count shown as: "14 RSVPs" — links to `/dashboard/events/[id]/attendees`

**Cancel Confirmation Dialog**
- Triggered by "Cancel event" action on an `EventListItem`
- Focus trapped inside dialog
- "Cancel event" (destructive) + "Keep event" buttons
- On confirm: optimistic update sets status to Cancelled, then Server Action fires
- On error: rollback + toast "Failed to cancel event — please try again"
- On close (Escape or "Keep event"): focus returns to the trigger button

**Error (load failure)**
- `error.tsx`: "We couldn't load your events." + retry button

---

### SCREEN 7 — Create Event
**Route:** `/dashboard/events/new`
**Auth required:** Yes
**Route group:** `(organizer)`

#### Purpose
Multi-field form to create and publish a new event. On save, the event is immediately live and a shareable URL is presented.

#### Primary Actions
- Submit form to publish event
- Save as draft (unpublished) — optional secondary action
- Cancel (return to dashboard without saving)

#### Key Components
| Component | Notes |
|-----------|-------|
| `EventForm` | Controlled form with Zod schema; shared with Edit screen |
| `FormField` × n | Title, description (textarea), date, time, location, capacity |
| `DateTimePicker` | Native `<input type="date">` + `<input type="time">` — avoids custom picker complexity; fully accessible |
| `FormActions` | "Publish event" (primary) + "Save draft" (secondary) + "Cancel" (tertiary, navigates away) |
| `ShareableLinkModal` | Post-publish modal showing the event URL with a copy button |

#### Field Specs
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Title | text input | Yes | 3–100 chars |
| Description | textarea | Yes | 10–5000 chars |
| Date | date input | Yes | Must be future date |
| Time | time input | Yes | Required if date is set |
| Location | text input | Yes | 3–200 chars |
| Capacity | number input | No | Integer ≥ 1 if provided; no upper cap in v1 |

#### States

**Default**
- All fields empty; no pre-filled values

**Validation Errors**
- Inline per-field on submit attempt
- Focus moves to first invalid field
- Fields retain values

**Loading (submitting)**
- Submit button disabled + "Publishing…" label
- `sessionStorage` backup of form values (for session expiry recovery)

**Success**
- `ShareableLinkModal` opens with the new event's public URL
- "Copy link" button uses `navigator.clipboard.writeText()`; fallback to `<input>` + select for non-secure contexts
- Modal can be dismissed; user is then on the dashboard with new event in list

**Session Expired Mid-Form**
- `sessionStorage` preserves form values
- User is redirected to `/login?returnTo=/dashboard/events/new`
- On re-auth, values are restored from `sessionStorage` and form is pre-filled

#### Accessibility Notes
- `<form>` has `aria-label="Create a new event"`
- Capacity field has `aria-describedby` pointing to helper text: "Leave blank for unlimited attendance"
- `ShareableLinkModal` is a `role="dialog"` with `aria-labelledby` and `aria-modal="true"`
- Copy button updates its label: "Copy link" → "Copied!" for 2 seconds, then reverts

---

### SCREEN 8 — Edit Event
**Route:** `/dashboard/events/[id]/edit`
**Auth required:** Yes + ownership check (organizer owns this event)
**Route group:** `(organizer)`

#### Purpose
Edit any field of an existing event. Identical form to Create but pre-populated. Ownership is enforced by Firebase Security Rules — not just client-side routing.

#### Primary Actions
- Save changes
- Discard changes (return to dashboard)

#### Key Components
- `EventForm` — same component as Create, receives `defaultValues` prop
- `FormActions` — "Save changes" (primary) + "Discard" (navigates to dashboard)
- No shareable link modal on edit — link hasn't changed

#### States
All states are equivalent to Create Event except:

**Loading (fetching existing event)**
- Form skeleton while event data loads from Firestore

**Unauthorized**
- If organizer tries to edit another organizer's event (direct URL manipulation): 403 error page
- Server Action re-validates ownership — client guard alone is not sufficient

**Not Found**
- Event ID doesn't exist: 404 page

---

### SCREEN 9 — Attendee List (RSVP List)
**Route:** `/dashboard/events/[id]/attendees`
**Auth required:** Yes + ownership check
**Route group:** `(organizer)`

#### Purpose
Read-only list of everyone who has RSVPed. Shows headcount at a glance.

#### Primary Actions
- Read attendee data (passive)
- Navigate back to dashboard

#### Key Components
| Component | Notes |
|-----------|-------|
| `AttendeeListHeader` | Event title, date, current RSVP count vs capacity |
| `AttendeeTable` | Name, email, RSVP timestamp — sortable by timestamp only in v1 |
| `EmptyState` | "No RSVPs yet" |
| `BackLink` | "← Back to my events" |

#### States

**Loading**
- Table skeleton: 5 row placeholders

**Empty**
- "No one has RSVPed yet. Share your event link to start collecting RSVPs."
- Event URL shown with copy button

**Populated**
- Table with zebra striping (contrast-safe)
- Timestamps in user-locale format via `Intl.DateTimeFormat`

**Error**
- "We couldn't load the attendee list." + retry

#### Accessibility Notes
- `<table>` with `<caption>` = "RSVPs for [Event Title]"
- `<th scope="col">` on all column headers
- Dates in `<time>` elements

---

## 4. Navigation Model

### Design Decisions

**Two separate nav contexts — no global nav.**
Public attendees and authenticated organizers have entirely different needs. A single global nav would add chrome that misleads attendees or confuses the organizer flow. Each route group has its own layout.

**No sidebar in v1 — top bar only for organizers.**
The organizer nav has exactly two pages (dashboard + event detail variants). A sidebar would be empty structure. The top bar holds: app name/logo (links to `/dashboard`) and a "Sign out" button. This scales to mobile trivially.

### Public Layout (`(public)/layout.tsx`)

```
┌─────────────────────────────────────────┐
│  EventHub                               │  ← Minimal header; logo only, no nav links
├─────────────────────────────────────────┤
│                                         │
│  <main>                                 │
│    page content                         │
│                                         │
├─────────────────────────────────────────┤
│  Footer: © EventHub                     │  ← Static, no nav links in v1
└─────────────────────────────────────────┘
```

### Auth Layout (`(auth)/layout.tsx`)

```
┌─────────────────────────────────────────┐
│  EventHub                  (logo only)  │
├─────────────────────────────────────────┤
│                                         │
│         ┌───────────────────┐           │
│         │  AuthCard         │           │
│         │  (centered, max   │           │
│         │   w-sm)           │           │
│         └───────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

### Organizer Layout (`(organizer)/layout.tsx`)

```
┌─────────────────────────────────────────┐
│  EventHub            [Sign out]          │  ← Top bar
├─────────────────────────────────────────┤
│                                         │
│  <main>                                 │
│    page content (full width, max-w-4xl) │
│                                         │
└─────────────────────────────────────────┘
```

### Mobile Behaviour
- Top bar collapses logo text to icon only below 375px
- All layouts are single-column on mobile; no horizontal scroll
- Touch targets minimum 44×44px (CSS `min-height: 44px; min-width: 44px`)
- "Sign out" in top bar remains full-text — not collapsed into a hamburger (only one action)

### Skip Navigation
Every layout renders a skip link as the first child of `<body>`:

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 ...">
  Skip to main content
</a>
```

`<main id="main-content">` is present in every layout's page slot.

### Route Protection Pattern

```
middleware.ts (runs at edge)
  ├── /dashboard/* → check Firebase session cookie → redirect /login if absent
  ├── /login, /register → check session → redirect /dashboard if present
  └── /events/* → pass through (public)
```

Middleware is the gatekeeper. Individual Server Actions and API routes re-validate the session independently — never trust the middleware alone.

### Breadcrumb Strategy
Organizer routes use a simple text breadcrumb — not a `<nav>` landmark (to avoid duplicate nav landmarks), but a `<div aria-label="breadcrumb">` with an ordered list:

```
My events  →  [Event Title]  →  Attendees
```

Breadcrumb links use `aria-current="page"` on the last item.

---

## 5. State Transition Summary

```
Event Lifecycle (organizer-controlled):
  draft (unpublished) → published → cancelled
                         ↓ (capacity hit)
                       full (published + RSVPs = capacity)
                         ↑ (organizer reopens)
                       published

RSVP Lifecycle (attendee):
  (none) → confirmed → cancelled
```

Both transitions are enforced by Firestore Security Rules, not just client logic.

---
