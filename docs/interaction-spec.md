# EventHub — Accessibility Interaction Specification
**Version:** 1.0 · **Depends on:** PRD v1.1, IA & Screens v1.0 · **Status:** Draft
**Standard:** WCAG 2.1 AA · **Test targets:** VoiceOver/Safari (macOS), NVDA/Firefox (Windows), Keyboard-only (Chrome)

> **How to read this doc:** Each section maps to a screen or shared pattern. For each interactive surface, you get: tab order, keyboard contract, ARIA roles/attributes, validation behaviour, and focus lifecycle. Implementation notes call out code-level specifics. Test assertions are written as checkable statements.

---

## 0. Global Patterns (apply to every screen)

### 0.1 Skip Navigation Link

**Rendered as the first focusable element in every layout's `<body>`.**

```html
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
         focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700
         focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  Skip to main content
</a>
```

- Visually hidden until it receives focus
- Must be the **first** Tab stop on every page — before logo, nav, or any other chrome
- `<main id="main-content" tabindex="-1">` receives focus when the link is activated (the `tabindex="-1"` allows programmatic focus without adding it to the tab sequence)
- **Test assertion:** Tab once from an empty browser address bar → skip link is visible and focused. Press Enter → focus is on `<main>`, page scrolls to top of content.

### 0.2 Page Title Discipline

Every route sets a unique `<title>` in the format `[Page Name] — EventHub`.

| Route | Title |
|-------|-------|
| `/events/[id]` | `[Event Title] — EventHub` |
| `/events/[id]/cancel` | `Cancel RSVP: [Event Title] — EventHub` |
| `/login` | `Sign In — EventHub` |
| `/register` | `Create Account — EventHub` |
| `/reset-password` | `Reset Password — EventHub` |
| `/dashboard` | `My Events — EventHub` |
| `/dashboard/events/new` | `Create Event — EventHub` |
| `/dashboard/events/[id]/edit` | `Edit Event — EventHub` |
| `/dashboard/events/[id]/attendees` | `Attendees: [Event Title] — EventHub` |

Next.js App Router implementation:
```tsx
// app/(public)/events/[id]/page.tsx
export async function generateMetadata({ params }: Props) {
  const event = await getEvent(params.id);
  return { title: `${event.title} — EventHub` };
}
```

**Why it matters:** Screen reader users rely on the page title to orient themselves after navigation. A title that doesn't change is a WCAG 2.4.2 failure.

### 0.3 Heading Hierarchy

| Screen | `<h1>` | `<h2>` examples |
|--------|--------|-----------------|
| Event Detail | Event title | "About this event", "RSVP" |
| Cancel RSVP | "Cancel your RSVP" | — |
| Register | "Create your account" | — |
| Login | "Sign in" | — |
| Reset Password | "Reset your password" | — |
| Dashboard | "My events" | — |
| Create Event | "Create a new event" | "Event details", "Date & time" |
| Edit Event | "Edit event" | same as Create |
| Attendees | "Attendees" | — |

**Rule:** No heading levels are skipped. If a section doesn't warrant a heading in the visual design, it does not get one in the markup either — do not use headings for styling.

### 0.4 Focus Visibility

All interactive elements must display a visible focus ring that meets **3:1** contrast against adjacent colors. Do not use `outline: none` without a custom equivalent.

```css
/* Base focus style — applied globally */
:focus-visible {
  outline: 2px solid #2563eb; /* blue-600 */
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove for mouse users only (not keyboard) */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Implementation note:** Use `:focus-visible`, not `:focus`. This hides the ring for mouse/touch clicks while preserving it for keyboard users — no more "suppress all outlines" hacks.

### 0.5 Live Region for Toasts

A single `aria-live` region exists in every layout root, outside the page content flow. The toast system writes into it.

```html
<!-- In layout.tsx, rendered once, never unmounted -->
<div
  id="toast-region"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  <!-- Toast text injected here by JS; visual toast renders separately -->
</div>
```

**Pattern:** The visible toast component is positioned absolutely for sighted users. The `aria-live` region is `sr-only` but receives the same text. This separation avoids the common bug where repositioning a visual toast causes the live region to re-announce when the element moves in the DOM.

**Timing rule:** Inject text into the live region *after* a 100ms delay from the triggering action. This ensures the browser has processed any DOM changes first and will reliably read the announcement.

---

## 1. RSVP Form (`/events/[id]`)

### 1.1 Tab Order

```
[Skip to main content]          ← 1 (visually hidden until focused)
[Event detail — not focusable]  ← landmark navigation only
[RSVP section heading]          ← not focusable (h2)
[Name input]                    ← 2
[Email input]                   ← 3
[Submit button]                 ← 4
```

No other interactive elements on this page in the default state. When the event is full/cancelled, the form is absent and there are no Tab stops beyond the skip link.

### 1.2 Keyboard Contract

| Key | Element | Behaviour |
|-----|---------|-----------|
| `Tab` | Any input | Moves to next field / submit button |
| `Shift+Tab` | Any input | Moves to previous field / page |
| `Enter` | Submit button | Submits form |
| `Enter` | Name or email input | Submits form (default `<form>` behaviour — do not suppress) |
| `Space` | Submit button | Submits form (button default) |

No custom keyboard shortcuts on this screen — it is a public-facing form and must work with zero learning curve.

### 1.3 ARIA Structure

```html
<main id="main-content" tabindex="-1">
  <article aria-labelledby="event-title">
    <h1 id="event-title">{{ event.title }}</h1>

    <section aria-label="Event details">
      <time datetime="{{ event.isoDate }}">{{ event.formattedDate }}</time>
      <p>{{ event.location }}</p>
      <!-- Capacity: only rendered if cap is set -->
      <p aria-live="polite" aria-atomic="true" id="capacity-status">
        {{ remainingSpots }} of {{ capacity }} spots remaining
      </p>
    </section>

    <section aria-labelledby="rsvp-heading">
      <h2 id="rsvp-heading">RSVP to this event</h2>
      <form
        aria-label="RSVP form"
        novalidate
        onsubmit="handleSubmit"
      >
        <div>
          <label for="rsvp-name">Your name</label>
          <input
            id="rsvp-name"
            name="name"
            type="text"
            autocomplete="name"
            required
            aria-required="true"
            aria-describedby="rsvp-name-error"
            aria-invalid="{{ nameError ? 'true' : 'false' }}"
          />
          <span id="rsvp-name-error" role="alert" aria-live="assertive">
            {{ nameError }}  <!-- empty string when no error -->
          </span>
        </div>

        <div>
          <label for="rsvp-email">Your email address</label>
          <input
            id="rsvp-email"
            name="email"
            type="email"
            autocomplete="email"
            required
            aria-required="true"
            aria-describedby="rsvp-email-error rsvp-email-hint"
            aria-invalid="{{ emailError ? 'true' : 'false' }}"
          />
          <span id="rsvp-email-hint">
            We'll send your confirmation and cancel link here.
          </span>
          <span id="rsvp-email-error" role="alert" aria-live="assertive">
            {{ emailError }}
          </span>
        </div>

        <button type="submit" aria-disabled="{{ isSubmitting }}">
          {{ isSubmitting ? 'Reserving your spot…' : 'Reserve my spot' }}
        </button>
      </form>
    </section>
  </article>
</main>
```

### 1.4 Validation Behaviour

**Trigger:** Validation runs on submit attempt only — not on blur, not on keyup. Reasoning: eager validation on a public-facing form creates false errors while users are still typing, which is hostile UX and can confuse screen readers with premature `role="alert"` announcements.

**On submit with errors:**
1. Prevent form submission
2. Set `aria-invalid="true"` on each invalid field
3. Inject error text into the corresponding `aria-live="assertive"` span
4. Move focus to the **first invalid field** (`inputRef.current.focus()`)
5. Screen reader reads: field label + error message (because `aria-describedby` links them)

**On submit success:**
1. Replace form with success message:
```html
<div
  id="rsvp-success"
  tabindex="-1"
  role="status"
>
  <h2>You're registered!</h2>
  <p>Check your email for your confirmation and cancel link.</p>
</div>
```
2. Move focus to `#rsvp-success` (the `tabindex="-1"` enables this)
3. Screen reader reads the `role="status"` content

**Why `role="alert"` on individual errors but `role="status"` on success?**
`role="alert"` is `aria-live="assertive"` — it interrupts the screen reader immediately. Errors need to be heard right away. `role="status"` is `aria-live="polite"` — it waits for the reader to finish. Success doesn't need to interrupt; the user is expecting the outcome.

### 1.5 Error Message Copy

| Field | Condition | Error text |
|-------|-----------|------------|
| Name | Empty | "Please enter your name." |
| Name | < 2 chars | "Name must be at least 2 characters." |
| Email | Empty | "Please enter your email address." |
| Email | Invalid format | "Please enter a valid email address." |
| Form-level | Already registered | "You're already registered for this event. Check your inbox for your confirmation email." |
| Form-level | Event full (race) | "This event just reached capacity. You haven't been registered." |
| Form-level | Server error | "Something went wrong. Please try again." |

All error text is prefixed visually with an error icon (❌ decorative, `aria-hidden="true"`). The text alone must be sufficient — no "see the red field" copy.

---

## 2. Cancel RSVP (`/events/[id]/cancel`)

### 2.1 Tab Order (valid token state)

```
[Skip to main content]
[Event summary — read-only]
[Cancel my RSVP button]         ← 1 (destructive — secondary styling)
[Keep my spot button]           ← 2 (primary styling — biased toward retention)
```

**Note:** "Keep my spot" is Tab-order second but styled as the visually dominant button. This is intentional: DOM order serves keyboard users (less likely to accidentally cancel by pressing Enter on first button), visual weight serves mouse users who are more likely to click impulsively.

### 2.2 Focus on Mount

When the page loads with a valid token, focus is placed programmatically on the page `<h1>`:

```tsx
const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => { headingRef.current?.focus(); }, []);

<h1 ref={headingRef} tabindex="-1">
  Cancel your RSVP for {event.title}
</h1>
```

The heading is not interactive — `tabindex="-1"` makes it programmatically focusable without adding it to the tab sequence. Screen reader reads the heading content, orienting the user before they interact.

### 2.3 Post-Cancellation State

After the organizer confirms cancellation:

1. Both buttons removed from DOM
2. Success message rendered:
```html
<div id="cancel-success" tabindex="-1" role="status">
  <h2>Your RSVP has been cancelled.</h2>
  <p>We hope to see you at a future event.</p>
</div>
```
3. Focus moves to `#cancel-success`

---

## 3. Auth Forms (Register, Login, Reset Password)

### 3.1 Tab Order — Register

```
[Skip to main content]
[Email input]                   ← 1
[Password input]                ← 2
[Show/hide password toggle]     ← 3
[Confirm password input]        ← 4
[Show/hide password toggle]     ← 5
[Create account button]         ← 6
[Sign in link]                  ← 7
```

### 3.2 Password Show/Hide Toggle

```html
<div style="position: relative;">
  <input
    id="password"
    type="{{ showPassword ? 'text' : 'password' }}"
    autocomplete="new-password"
    aria-describedby="password-hint password-error"
  />
  <button
    type="button"
    aria-label="{{ showPassword ? 'Hide password' : 'Show password' }}"
    aria-controls="password"
    aria-pressed="{{ showPassword }}"
    onclick="toggleVisibility"
  >
    <!-- Icon: eye / eye-off, aria-hidden="true" -->
  </button>
</div>
```

**Key decisions:**
- `type="button"` prevents accidental form submission
- `aria-pressed` communicates toggle state to screen readers
- `aria-label` updates with the *next* action ("Show password" when hidden, "Hide password" when shown) — consistent with ARIA authoring practices for toggle buttons where the label describes the action, not the state. **Alternative:** use `aria-pressed` + a static label like "Password visibility". Either is valid; choose one and apply consistently.
- `aria-controls` links the button to the input it affects

### 3.3 Validation Behaviour — Auth Forms

Auth forms validate on submit only, with one exception: **confirm password** validates on blur after the field loses focus, so the user gets immediate feedback before reaching the submit button.

**On submit with errors:**
1. `aria-invalid="true"` on each invalid field
2. Error injected into associated `aria-live` span
3. Focus moves to first invalid field

**Firebase error mapping:**

| Firebase code | User-facing message |
|---------------|---------------------|
| `auth/email-already-in-use` | "An account with this email already exists. Try signing in instead." |
| `auth/invalid-email` | "Please enter a valid email address." |
| `auth/weak-password` | "Password must be at least 8 characters." |
| `auth/user-not-found` | "Incorrect email or password." *(deliberately vague)* |
| `auth/wrong-password` | "Incorrect email or password." *(same message — no enumeration)* |
| `auth/too-many-requests` | "Too many attempts. Please wait a moment or reset your password." |
| Any other | "Something went wrong. Please try again." |

**Why map Firebase errors?** Raw Firebase error messages leak implementation details and fail plain-language requirements. They also sometimes reveal whether an email exists (a security concern).

### 3.4 ARIA Structure — Login Form

```html
<form aria-label="Sign in to your organizer account" novalidate>
  <h1>Sign in</h1>

  <div>
    <label for="login-email">Email address</label>
    <input
      id="login-email"
      type="email"
      autocomplete="email"
      aria-required="true"
      aria-describedby="login-email-error"
      aria-invalid="{{ emailError ? 'true' : 'false' }}"
    />
    <span id="login-email-error" role="alert">{{ emailError }}</span>
  </div>

  <div>
    <label for="login-password">Password</label>
    <input
      id="login-password"
      type="password"
      autocomplete="current-password"
      aria-required="true"
      aria-describedby="login-password-error"
      aria-invalid="{{ passwordError ? 'true' : 'false' }}"
    />
    <span id="login-password-error" role="alert">{{ passwordError }}</span>
  </div>

  <!-- Form-level error (e.g., invalid credentials) -->
  <div role="alert" aria-live="assertive" id="login-form-error">
    {{ formError }}
  </div>

  <button type="submit">Sign in</button>

  <a href="/reset-password">Forgot your password?</a>
  <a href="/register">Create an organizer account</a>
</form>
```

---

## 4. Event Form — Create & Edit (`/dashboard/events/new`, `/dashboard/events/[id]/edit`)

### 4.1 Tab Order

```
[Skip to main content]
[Title input]                   ← 1
[Description textarea]          ← 2
[Date input]                    ← 3
[Time input]                    ← 4
[Location input]                ← 5
[Capacity input]                ← 6
[Publish event button]          ← 7
[Save as draft button]          ← 8
[Cancel / Discard button]       ← 9
```

### 4.2 Field-Level ARIA

```html
<form aria-label="Create a new event" novalidate>

  <!-- Title -->
  <div>
    <label for="event-title">
      Event title
      <span aria-hidden="true"> *</span>
    </label>
    <input
      id="event-title"
      type="text"
      maxlength="100"
      aria-required="true"
      aria-describedby="event-title-error event-title-count"
      aria-invalid="{{ titleError ? 'true' : 'false' }}"
    />
    <span id="event-title-count" aria-live="polite">
      {{ titleLength }}/100 characters
    </span>
    <span id="event-title-error" role="alert">{{ titleError }}</span>
  </div>

  <!-- Description -->
  <div>
    <label for="event-description">
      Description
      <span aria-hidden="true"> *</span>
    </label>
    <textarea
      id="event-description"
      rows="6"
      maxlength="5000"
      aria-required="true"
      aria-describedby="event-description-error event-description-count"
      aria-invalid="{{ descError ? 'true' : 'false' }}"
    ></textarea>
    <span id="event-description-count" aria-live="polite">
      {{ descLength }}/5000 characters
    </span>
    <span id="event-description-error" role="alert">{{ descError }}</span>
  </div>

  <!-- Date -->
  <div>
    <label for="event-date">
      Date
      <span aria-hidden="true"> *</span>
    </label>
    <input
      id="event-date"
      type="date"
      aria-required="true"
      aria-describedby="event-date-error"
      aria-invalid="{{ dateError ? 'true' : 'false' }}"
      min="{{ todayISO }}"
    />
    <span id="event-date-error" role="alert">{{ dateError }}</span>
  </div>

  <!-- Time -->
  <div>
    <label for="event-time">
      Time
      <span aria-hidden="true"> *</span>
    </label>
    <input
      id="event-time"
      type="time"
      aria-required="true"
      aria-describedby="event-time-error"
      aria-invalid="{{ timeError ? 'true' : 'false' }}"
    />
    <span id="event-time-error" role="alert">{{ timeError }}</span>
  </div>

  <!-- Location -->
  <div>
    <label for="event-location">
      Location
      <span aria-hidden="true"> *</span>
    </label>
    <input
      id="event-location"
      type="text"
      autocomplete="off"
      aria-required="true"
      aria-describedby="event-location-hint event-location-error"
      aria-invalid="{{ locationError ? 'true' : 'false' }}"
    />
    <span id="event-location-hint">
      Address, venue name, or "Online" — plain text only.
    </span>
    <span id="event-location-error" role="alert">{{ locationError }}</span>
  </div>

  <!-- Capacity (optional) -->
  <div>
    <label for="event-capacity">Capacity</label>
    <input
      id="event-capacity"
      type="number"
      min="1"
      inputmode="numeric"
      aria-describedby="event-capacity-hint event-capacity-error"
      aria-invalid="{{ capacityError ? 'true' : 'false' }}"
    />
    <span id="event-capacity-hint">
      Optional. Leave blank for unlimited attendance.
    </span>
    <span id="event-capacity-error" role="alert">{{ capacityError }}</span>
  </div>

  <!-- Required field legend -->
  <p>Fields marked with <span aria-hidden="true">*</span>
    <span class="sr-only">an asterisk</span> are required.
  </p>

  <div role="group" aria-label="Form actions">
    <button type="submit" name="intent" value="publish">
      Publish event
    </button>
    <button type="submit" name="intent" value="draft">
      Save as draft
    </button>
    <a href="/dashboard">Cancel</a>
  </div>

</form>
```

**Character count pattern:** `aria-live="polite"` on the count span means it announces as the user types, but politely — it won't interrupt other announcements. The count updates on every keystroke. **Concern:** some users find this extremely noisy. Mitigation: debounce the live region update to announce only when focus leaves the field, not on every keystroke.

```tsx
// Debounced character count announcement
const [announcedCount, setAnnouncedCount] = useState(0);
useEffect(() => {
  const timer = setTimeout(() => setAnnouncedCount(value.length), 1500);
  return () => clearTimeout(timer);
}, [value]);
```

### 4.3 Validation Behaviour

**Date field cross-validation:** The date must be in the future. This requires a custom validation rule that runs against `new Date()` at submit time. The `min` attribute provides a basic browser-level guard but is not sufficient — server-side validation in the Server Action is the authoritative check.

**Intent-based submit:** Two submit buttons share the same form. The `name="intent"` + `value` pattern lets the Server Action distinguish which button was pressed without JavaScript:

```tsx
// Server Action
export async function createEvent(formData: FormData) {
  const intent = formData.get('intent'); // 'publish' | 'draft'
  const status = intent === 'publish' ? 'published' : 'draft';
  // ...
}
```

### 4.4 Shareable Link Modal (post-publish)

See Section 6 for full modal focus spec. Summary:
- Modal opens automatically after successful publish
- Focus moves to modal heading on open
- "Copy link" is the primary action
- `Escape` closes the modal, focus returns to "Publish event" button

---

## 5. Cancel Event Dialog (Dashboard)

This is the only dialog in the organizer flow triggered by a user action (as opposed to the post-publish modal which is programmatic).

### 5.1 ARIA Pattern: `role="dialog"`

```html
<!-- Backdrop -->
<div
  aria-hidden="true"
  onclick="closeDialog"
  style="position: fixed; inset: 0; background: rgba(0,0,0,0.5);"
/>

<!-- Dialog -->
<div
  id="cancel-event-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="cancel-dialog-title"
  aria-describedby="cancel-dialog-body"
>
  <h2 id="cancel-dialog-title">Cancel this event?</h2>
  <p id="cancel-dialog-body">
    This will cancel the event and send a cancellation email to all
    {{ rsvpCount }} registered attendees. This cannot be undone.
  </p>
  <div role="group" aria-label="Confirm cancellation">
    <button type="button" onclick="confirmCancel">
      Yes, cancel the event
    </button>
    <button type="button" onclick="closeDialog">
      Keep the event
    </button>
  </div>
</div>
```

### 5.2 Focus Trap Implementation

Focus must cycle within the dialog while it is open. No focus may escape to the page behind it.

```tsx
function useFocusTrap(ref: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }

      if (e.shiftKey) {
        // Shift+Tab: if leaving first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if leaving last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    first?.focus(); // Move focus to first element on mount

    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
```

### 5.3 Focus Lifecycle

```
1. User clicks "Cancel event" on an EventListItem
2. Dialog renders in DOM
3. useFocusTrap activates → focus moves to first button ("Yes, cancel the event")
4. User presses Tab → focus moves to "Keep the event"
5. User presses Tab again → wraps back to "Yes, cancel the event"
6. User presses Escape (OR clicks "Keep the event" OR clicks backdrop)
   → dialog removed from DOM
   → focus returns to the "Cancel event" button that triggered the dialog
```

**Trigger ref pattern:**

```tsx
const triggerRef = useRef<HTMLButtonElement>(null);
const [dialogOpen, setDialogOpen] = useState(false);

const openDialog = () => setDialogOpen(true);
const closeDialog = () => {
  setDialogOpen(false);
  // Return focus to trigger on next tick (after DOM update)
  setTimeout(() => triggerRef.current?.focus(), 0);
};

<button ref={triggerRef} onClick={openDialog}>Cancel event</button>
{dialogOpen && <CancelEventDialog onClose={closeDialog} />}
```

### 5.4 Keyboard Contract for Dialog

| Key | Behaviour |
|-----|-----------|
| `Tab` | Cycles forward through focusable elements within dialog |
| `Shift+Tab` | Cycles backward within dialog |
| `Escape` | Closes dialog; focus returns to trigger |
| `Enter` / `Space` | Activates focused button |
| Any key outside dialog | No effect (focus is trapped) |

### 5.5 Background Inertness

When the dialog is open, the background page content must be inert. Two approaches:

**Option A — `inert` attribute (preferred, modern browsers):**
```tsx
// Add inert to the page root when dialog opens
document.getElementById('page-root')?.setAttribute('inert', '');
// Remove on close
document.getElementById('page-root')?.removeAttribute('inert');
```

**Option B — `aria-hidden` on background (older compat):**
```tsx
document.getElementById('page-root')?.setAttribute('aria-hidden', 'true');
```

Use Option A. The `inert` attribute also prevents mouse and touch interaction on the background, not just keyboard/screen reader access. Browser support is now sufficient (all modern browsers as of 2023). Add a polyfill (`wicg-inert`) if IE11 support were ever required — it isn't for this stack.

---

## 6. Shareable Link Modal (Post-Publish)

### 6.1 ARIA Structure

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="share-modal-title"
>
  <h2 id="share-modal-title" tabindex="-1">
    Your event is live!
  </h2>
  <p>Share this link with your attendees:</p>
  <div>
    <input
      id="share-url"
      type="url"
      readonly
      value="{{ eventUrl }}"
      aria-label="Event URL"
      onclick="this.select()"
    />
    <button
      id="copy-button"
      type="button"
      aria-label="Copy event link to clipboard"
      aria-describedby="copy-status"
      onclick="copyToClipboard"
    >
      Copy link
    </button>
    <span id="copy-status" role="status" aria-live="polite"></span>
  </div>
  <button type="button" onclick="closeModal">
    Done
  </button>
</div>
```

### 6.2 Copy Button State Machine

```
Initial:  aria-label="Copy event link to clipboard" | text: "Copy link"
          ↓ click
Copying:  aria-label="Copying…" | text: "Copying…" | disabled
          ↓ success
Copied:   aria-label="Copied!" | text: "Copied!" 
          + inject "Link copied to clipboard" into #copy-status (aria-live)
          ↓ after 2000ms
Reset:    back to Initial state
```

```tsx
const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
const statusRef = useRef<HTMLSpanElement>(null);

const copyToClipboard = async () => {
  setCopyState('copying');
  try {
    await navigator.clipboard.writeText(eventUrl);
    setCopyState('copied');
    if (statusRef.current) {
      statusRef.current.textContent = 'Link copied to clipboard.';
    }
    setTimeout(() => {
      setCopyState('idle');
      if (statusRef.current) statusRef.current.textContent = '';
    }, 2000);
  } catch {
    setCopyState('idle');
    // Fallback: select the input text
    document.getElementById('share-url')?.select();
  }
};
```

### 6.3 Focus Lifecycle

```
1. Server Action returns success → modal renders
2. Focus moves to <h2 id="share-modal-title"> (tabindex="-1", focused programmatically)
3. Tab → Copy button
4. Tab → Done button
5. Tab wraps → Copy button (focus trap: only two interactive elements)
6. Escape OR "Done" clicked → modal closes
   → focus returns to "Publish event" submit button
```

---

## 7. Attendee Table (`/dashboard/events/[id]/attendees`)

No interactive elements except the back link. Focus considerations are minimal but semantic correctness matters for screen reader table navigation.

```html
<main id="main-content" tabindex="-1">
  <a href="/dashboard" id="back-link">← Back to my events</a>
  <h1>Attendees</h1>

  <table aria-describedby="attendee-table-caption">
    <caption id="attendee-table-caption">
      RSVPs for {{ eventTitle }} — {{ rsvpCount }} registered
    </caption>
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Email</th>
        <th scope="col">
          <span>RSVP date</span>
          <!-- Sort indicator if sorting is added later -->
        </th>
      </tr>
    </thead>
    <tbody>
      {{ #each attendees }}
      <tr>
        <td>{{ name }}</td>
        <td>{{ email }}</td>
        <td>
          <time datetime="{{ isoTimestamp }}">{{ formattedDate }}</time>
        </td>
      </tr>
      {{ /each }}
    </tbody>
  </table>
</main>
```

**Screen reader table navigation:** Screen readers expose table navigation shortcuts (`T` to jump to next table, arrow keys to traverse cells in NVDA/JAWS). Proper `<th scope="col">` ensures the reader announces column headers as the user moves through cells. `<caption>` is announced when the user enters the table.

---

## 8. Keyboard Shortcuts Summary

EventHub v1 has **no custom keyboard shortcuts** beyond browser and OS defaults. This is intentional:

- Custom shortcuts conflict with screen reader shortcut keys (e.g., `H` for headings, `F` for forms, `T` for tables in NVDA)
- A public-facing RSVP tool is used once — muscle memory shortcuts offer no value
- The organizer flow is simple enough that shortcuts would be optimizing a non-bottleneck

If shortcuts are added in v2 (e.g., `N` for new event from the dashboard), they must:
- Not conflict with single-character screen reader navigation
- Be disclosed in a keyboard help overlay (`?` key is conventional)
- Be disabled when focus is in a text input

---

## 9. Reduced Motion Specification

```css
/* ✅ Correct pattern: motion is opt-in, not opt-out */
@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: shimmer 1.5s infinite;
  }
  .toast {
    transition: opacity 200ms ease, transform 200ms ease;
  }
  .modal-overlay {
    transition: opacity 150ms ease;
  }
  .button-loading {
    animation: spin 1s linear infinite;
  }
}

/* No animation rules outside the media query.
   Elements are always visible/present — motion is additive. */
```

**Rule:** Never hide content behind motion. If removing the animation would make an element invisible (e.g., a fade-in that starts at `opacity: 0`), the element must have a non-animated fallback state with `opacity: 1`.

```css
/* ❌ Wrong — content hidden without motion */
.modal { opacity: 0; transition: opacity 200ms; }
.modal.visible { opacity: 1; }

/* ✅ Correct — visible by default, motion is enhancement */
.modal { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .modal { opacity: 0; transition: opacity 200ms; }
  .modal.visible { opacity: 1; }
}
```

---

## 10. Screen-by-Screen Test Assertions

These are written to be directly runnable as manual or automated a11y test cases.

| # | Screen | Assertion |
|---|--------|-----------|
| T-01 | All | Tab once from address bar → skip link is visible and focused |
| T-02 | All | Activate skip link → focus lands on `<main>`, content scrolls into view |
| T-03 | All | `document.title` matches the format `[Page] — EventHub` |
| T-04 | Event Detail | Page has exactly one `<h1>` containing the event title |
| T-05 | RSVP Form | Submit empty form → focus moves to Name field → error announced |
| T-06 | RSVP Form | Submit with invalid email → `aria-invalid="true"` on email input |
| T-07 | RSVP Form | Successful submit → focus moves to success message |
| T-08 | RSVP Form | Error text never relies on color alone (icon or text prefix present) |
| T-09 | Cancel RSVP | Page load → focus on `<h1>` |
| T-10 | Cancel RSVP | Confirm cancel → focus moves to success banner |
| T-11 | Cancel RSVP | Invalid token → error message with organizer contact info visible |
| T-12 | Register | Password show/hide → `aria-pressed` updates; `type` toggles |
| T-13 | Register | `aria-label` on toggle reads "Show password" when hidden |
| T-14 | Auth forms | Submit with errors → focus to first invalid field |
| T-15 | Auth forms | Firebase errors surface as plain-language messages (no raw codes) |
| T-16 | Event Form | All required fields have `aria-required="true"` |
| T-17 | Event Form | `aria-describedby` links each input to its hint and error |
| T-18 | Event Form | Past date submission → inline error on date field, not browser alert |
| T-19 | Cancel Dialog | Opens → focus on first button |
| T-20 | Cancel Dialog | Tab cycles within dialog; no focus escapes to background |
| T-21 | Cancel Dialog | Escape → dialog closes → focus on trigger button |
| T-22 | Cancel Dialog | Background receives `inert` attribute while dialog is open |
| T-23 | Share Modal | Opens → focus on `<h2>` |
| T-24 | Share Modal | Copy → `role="status"` region announces "Link copied to clipboard" |
| T-25 | Share Modal | Escape / Done → focus returns to Publish button |
| T-26 | Attendees | Table has `<caption>` with RSVP count |
| T-27 | Attendees | All `<th>` have `scope="col"` |
| T-28 | All forms | Color contrast ≥ 4.5:1 for label and input text |
| T-29 | All | Focus ring visible on all interactive elements (≥ 3:1 contrast) |
| T-30 | All | No animations play when `prefers-reduced-motion: reduce` is set |

---
