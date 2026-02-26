# EventHub — Production Architecture

**Version:** 1.0 · **Depends on:** PRD v1.1, IA & Screens v1.0, A11y Spec v1.0 · **Status:** Draft

---

## 1. Folder Tree

```
eventhub/
├── .env.local                        # Local secrets — never committed
├── .env.example                      # Committed template with all keys, no values
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── firebase.json                     # Hosting + emulator config
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
│
├── public/
│   ├── favicon.ico
│   └── og-default.png               # Default Open Graph image
│
├── src/
│   │
│   ├── app/                         # Next.js App Router — ROUTES ONLY
│   │   │                            # No business logic here. Route files
│   │   │                            # are thin: they compose components and
│   │   │                            # call server functions.
│   │   │
│   │   ├── layout.tsx               # Root layout: fonts, global providers
│   │   ├── not-found.tsx            # Global 404
│   │   ├── error.tsx                # Global error boundary
│   │   │
│   │   ├── (public)/                # Route group: minimal header/footer
│   │   │   └── layout.tsx
│   │   │   └── events/
│   │   │       └── [id]/
│   │   │           ├── page.tsx
│   │   │           ├── loading.tsx
│   │   │           ├── error.tsx
│   │   │           └── cancel/
│   │   │               ├── page.tsx
│   │   │               └── error.tsx
│   │   │
│   │   ├── (auth)/                  # Route group: centered auth card
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   └── (organizer)/             # Route group: protected, top-bar nav
│   │       ├── layout.tsx
│   │       └── dashboard/
│   │           ├── page.tsx
│   │           ├── loading.tsx
│   │           ├── error.tsx
│   │           └── events/
│   │               ├── new/
│   │               │   └── page.tsx
│   │               └── [id]/
│   │                   ├── edit/page.tsx
│   │                   └── attendees/page.tsx
│   │
│   ├── components/                  # UI components — no direct Firebase calls
│   │   │
│   │   ├── ui/                      # Primitives: no domain knowledge
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── label.tsx
│   │   │   ├── form-field.tsx       # label + input + error wrapper
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx           # Focus-trap dialog primitive
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toast-region.tsx     # aria-live region, rendered in root layout
│   │   │   └── spinner.tsx
│   │   │
│   │   ├── event/                   # Event-domain components
│   │   │   ├── event-card.tsx
│   │   │   ├── event-header.tsx
│   │   │   ├── event-status-banner.tsx
│   │   │   ├── event-form.tsx       # Shared create/edit form
│   │   │   ├── event-form.schema.ts # Zod schema for the form
│   │   │   ├── capacity-indicator.tsx
│   │   │   └── shareable-link-modal.tsx
│   │   │
│   │   ├── rsvp/
│   │   │   ├── rsvp-form.tsx
│   │   │   ├── rsvp-form.schema.ts
│   │   │   ├── rsvp-success-banner.tsx
│   │   │   └── cancel-confirmation.tsx
│   │   │
│   │   ├── attendee/
│   │   │   └── attendee-table.tsx
│   │   │
│   │   └── layout/
│   │       ├── skip-link.tsx
│   │       ├── public-header.tsx
│   │       ├── organizer-topbar.tsx
│   │       ├── auth-card.tsx
│   │       └── page-title.tsx       # Sets document.title client-side for SPAs
│   │
│   ├── lib/                         # Pure logic — framework-agnostic where possible
│   │   │
│   │   ├── firebase/
│   │   │   ├── client.ts            # Firebase client SDK init (singleton)
│   │   │   ├── admin.ts             # Firebase Admin SDK init (server-only)
│   │   │   ├── auth.client.ts       # Client-side auth helpers
│   │   │   ├── auth.server.ts       # Server-side session validation
│   │   │   └── converters.ts        # Typed Firestore data converters
│   │   │
│   │   ├── actions/                 # Next.js Server Actions
│   │   │   ├── event.actions.ts     # createEvent, updateEvent, cancelEvent
│   │   │   ├── rsvp.actions.ts      # createRsvp, cancelRsvp
│   │   │   └── auth.actions.ts      # signOut (server-side cookie clear)
│   │   │
│   │   ├── queries/                 # Server-side Firestore read functions
│   │   │   ├── event.queries.ts     # getEvent, getOrganizerEvents
│   │   │   └── rsvp.queries.ts      # getRsvps, validateCancelToken
│   │   │
│   │   ├── email/
│   │   │   ├── index.ts             # Send function (provider-agnostic interface)
│   │   │   └── templates/
│   │   │       ├── rsvp-confirmation.ts
│   │   │       └── rsvp-cancellation.ts
│   │   │
│   │   ├── tokens/
│   │   │   └── cancel-token.ts      # Sign + verify cancel tokens
│   │   │
│   │   ├── validations/             # Zod schemas shared across client + server
│   │   │   ├── event.schema.ts
│   │   │   └── rsvp.schema.ts
│   │   │
│   │   └── utils/
│   │       ├── dates.ts             # Format, compare, validate date helpers
│   │       ├── errors.ts            # AppError class, error normalizer
│   │       ├── logger.ts            # Structured logger
│   │       └── cn.ts                # clsx + tailwind-merge utility
│   │
│   ├── hooks/                       # Client-side React hooks
│   │   ├── use-toast.ts
│   │   ├── use-copy-to-clipboard.ts
│   │   ├── use-focus-trap.ts
│   │   └── use-form-recovery.ts     # sessionStorage form state recovery
│   │
│   ├── types/                       # Global TypeScript types
│   │   ├── event.types.ts
│   │   ├── rsvp.types.ts
│   │   └── auth.types.ts
│   │
│   └── middleware.ts                # Edge middleware: session guard
│
└── tests/
    ├── unit/                        # Vitest unit tests
    │   ├── lib/
    │   └── components/
    ├── integration/                 # Server Action + Firestore emulator tests
    └── e2e/                         # Playwright end-to-end tests
        ├── fixtures/
        ├── pages/                   # Page Object Models
        └── specs/
```

---

## 2. Architecture Explanation

### 2.1 The Three-Layer Model

EventHub is structured in three strict layers. Dependencies only flow downward — a lower layer never imports from a higher one.

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Routes (app/)                             │
│  What: Page composition, metadata, route segments   │
│  Knows about: components/, lib/queries/, lib/actions│
│  Does not: contain business logic, call Firebase    │
└─────────────────────┬───────────────────────────────┘
                      │ imports
┌─────────────────────▼───────────────────────────────┐
│  LAYER 2: Components (components/)                  │
│  What: Rendering, user interaction, local UI state  │
│  Knows about: hooks/, lib/utils/, types/            │
│  Does not: call Firebase directly, call queries     │
└─────────────────────┬───────────────────────────────┘
                      │ imports
┌─────────────────────▼───────────────────────────────┐
│  LAYER 3: Logic (lib/)                              │
│  What: Firebase, Server Actions, email, validation  │
│  Knows about: Firebase SDKs, external services      │
│  Does not: import from app/ or components/          │
└─────────────────────────────────────────────────────┘
```

**Why this matters in practice:** When a Server Action needs to change (e.g., adding rate-limiting to RSVP creation), you touch `lib/actions/rsvp.actions.ts` only. The component that calls the action doesn't change. The route that renders the component doesn't change. The layers are genuinely independent.

### 2.2 Server Components by Default

Every component is a React Server Component (RSC) unless it explicitly needs client capabilities. The decision tree:

```
Does this component need:
  - onClick, onChange, or other event handlers?    → "use client"
  - useState or useReducer?                        → "use client"
  - useEffect or lifecycle behavior?               → "use client"
  - browser APIs (localStorage, navigator, etc.)?  → "use client"
  - a third-party library that uses the above?     → "use client"

If none of the above → Server Component (default, no directive needed)
```

**Client component boundary placement:** Push the `"use client"` boundary as deep into the tree as possible. A page that is 90% static content with one interactive button should be a Server Component that renders a small Client Component leaf — not a Client Component page that happens to have static content in it.

```tsx
// ✅ Correct: Client boundary is narrow
// app/(public)/events/[id]/page.tsx — Server Component
import { RsvpForm } from "@/components/rsvp/rsvp-form"; // "use client"

export default async function EventPage({ params }) {
  const event = await getEvent(params.id); // runs on server
  return (
    <article>
      <EventHeader event={event} /> {/* Server Component */}
      <EventDescription text={event.description} /> {/* Server Component */}
      <RsvpForm eventId={event.id} capacity={event.capacity} />{" "}
      {/* Client leaf */}
    </article>
  );
}

// ❌ Wrong: Entire page becomes a client bundle
// "use client"
// export default function EventPage() { ... }
```

### 2.3 Server Actions as the Mutation Layer

All data writes go through Next.js Server Actions in `lib/actions/`. They are the exclusive owners of:

- Firebase Admin SDK writes
- Input validation (Zod, server-side)
- Session authentication checks
- Email dispatch
- Error normalization before returning to the client

Server Actions are **not** thin wrappers. They contain real business logic:

```tsx
// lib/actions/rsvp.actions.ts
"use server";

export async function createRsvp(
  eventId: string,
  raw: unknown,
): Promise<ActionResult<{ rsvpId: string }>> {
  // 1. Auth: none required (public action)
  // 2. Validate input
  const parsed = RsvpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }
  // 3. Check event exists + is published + not cancelled
  // 4. Firestore transaction: check capacity, write RSVP
  // 5. Generate + store cancel token
  // 6. Dispatch confirmation email (non-blocking, logged on failure)
  // 7. Return success
}
```

**Why not API Routes?** Server Actions eliminate the client-side fetch boilerplate, give you type-safe function calls from Client Components, and are automatically POST requests with CSRF protection. For EventHub's mutation surface (create event, RSVP, cancel), there is no benefit to a separate REST layer. API Routes (`app/api/`) are reserved for webhooks from external services if they are introduced.

### 2.4 State Management — Why No Zustand

**The answer for EventHub is: React's built-in primitives are sufficient.** Here is the complete state inventory:

| State                           | Location                                | Tool                              |
| ------------------------------- | --------------------------------------- | --------------------------------- |
| Auth session                    | Server (cookie), verified in middleware | Firebase Admin + `next/headers`   |
| Event data (read)               | Server Component props / RSC fetch      | `async/await` in page.tsx         |
| RSVP form values                | Local component                         | `useState` / `react-hook-form`    |
| Form submission state (pending) | Local component                         | `useTransition` / `useFormStatus` |
| Optimistic RSVP count           | Local component                         | `useOptimistic`                   |
| Toast messages                  | Shared across components                | Custom `useToast` hook + Context  |
| Dialog open state               | Local component                         | `useState`                        |
| Copy-to-clipboard state         | Local component                         | `useState` in custom hook         |

None of these require a global store. The only "global" state is toasts, and a simple React Context with a reducer is exactly the right tool for it — not a 13kB store library.

**When Zustand would be justified:**

- Real-time collaborative editing with conflict resolution
- A shopping cart / multi-step checkout
- A complex dashboard with cross-panel filters that need to survive tab changes
- Any state that needs to be accessed by deeply nested, unrelated component trees without a clear provider

EventHub has none of these. Adding Zustand would be premature architecture — it adds a dependency, a learning curve for contributors, and a new abstraction for state that is naturally local.

**The one pattern to watch:** If the organizer dashboard ever adds real-time RSVP streaming (Firestore `onSnapshot`), that listener's teardown becomes important. The right tool there is a custom hook with `useEffect` cleanup — still no global store needed.

### 2.5 Data Fetching Strategy

**Reads: fetch on the server, pass as props.**

```
Route segment (Server Component)
  → calls lib/queries/event.queries.ts
    → Firebase Admin Firestore
      → typed response via Firestore converter
        → passed as props to child components
```

No client-side data fetching on initial load. The event detail page, organizer dashboard, and attendee list are all server-rendered. This gives us:

- No loading flash for primary content
- No client-side Firebase SDK required for reads
- Better SEO for public event pages
- Simpler component code (no `useEffect` + fetch pattern)

**The exception — optimistic UI on RSVP:**

The RSVP form uses `useOptimistic` to update the capacity indicator immediately on submit, before the Server Action resolves. This is the one place where client-side state temporarily diverges from server state — intentionally and with a defined rollback.

```tsx
const [optimisticCount, addOptimistic] = useOptimistic(
  serverRsvpCount,
  (current, delta: number) => current + delta,
);

const handleSubmit = async (formData: FormData) => {
  addOptimistic(1); // Immediate UI update
  const result = await createRsvp(eventId, formData);
  if (!result.ok) {
    // useOptimistic auto-reverts to serverRsvpCount on next render
    showToast({ type: "error", message: result.error });
  }
};
```

**Real-time updates (if capacity matters):** The capacity indicator on the public event page has an `aria-live="polite"` region. If we want live updates as other users RSVP, we add a Firestore `onSnapshot` listener in a Client Component that wraps only the capacity display — not the entire page. This is not in v1 MVP but the architecture accommodates it without changes to the page structure.

### 2.6 Error Handling

Error handling is explicit, typed, and consistent across all layers.

**`ActionResult<T>` — the universal Server Action return type:**

```ts
// src/types/action.types.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Every Server Action returns this type. Never throws. The Client Component always checks `result.ok` before proceeding. This makes the error path impossible to accidentally skip.

**`AppError` — structured internal errors:**

```ts
// src/lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    return new AppError(err.message, "UNKNOWN", 500);
  }
  return new AppError("An unexpected error occurred", "UNKNOWN", 500);
}
```

**Layer-specific error handling:**

| Layer            | Approach                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| Server Action    | `try/catch` → `normalizeError` → return `ActionResult { ok: false }`    |
| Route segment    | `error.tsx` boundary catches thrown errors from Server Components       |
| `not-found.tsx`  | Called via Next.js `notFound()` for 404 conditions                      |
| Client Component | Checks `ActionResult.ok`; shows toast or inline error                   |
| Email dispatch   | Fire-and-forget with structured log on failure; never blocks RSVP write |

**What we never do:**

- Expose raw Firebase error messages to the client
- Let a thrown error in a Server Action propagate to the client unhandled
- Use a single generic "Something went wrong" for every failure (uninformative and untestable)

### 2.7 Logging

**Tool:** A thin structured logger wrapping `console` in development and a structured JSON logger in production. No third-party logging SDK in v1 — Firebase Hosting runs Next.js on Cloud Run, and stdout logs are captured by Cloud Logging automatically.

```ts
// src/lib/utils/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: { message: string; code?: string; stack?: string };
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (process.env.NODE_ENV === "production") {
    // Cloud Logging parses structured JSON from stdout
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    fn(`[${level.toUpperCase()}] ${message}`, context ?? "");
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, err?: unknown, ctx?: Record<string, unknown>) => {
    const normalized = normalizeError(err);
    log("error", msg, {
      ...ctx,
      error: {
        message: normalized.message,
        code: normalized.code,
        stack:
          process.env.NODE_ENV !== "production" ? normalized.stack : undefined,
      },
    });
  },
};
```

**Logging rules:**

- Every Server Action logs at `info` on entry with sanitized input (no PII)
- Every caught error logs at `error` with full context
- Email send failures log at `warn` (non-fatal, but needs visibility)
- Never log: passwords, tokens, full email addresses in production contexts
- `debug` logs are only emitted in development (`NODE_ENV !== 'production'`)

### 2.8 Environment Configuration

**Two principles:** (1) All config flows through environment variables. (2) Config is validated at startup — a missing variable crashes loudly at build time, not silently at runtime.

```ts
// src/lib/config.ts
import { z } from "zod";

const envSchema = z.object({
  // Firebase client (public — safe to expose to browser)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Firebase Admin (server-only — never in browser bundle)
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(1), // JSON string
  FIREBASE_SESSION_COOKIE_SECRET: z.string().min(32),

  // Email
  EMAIL_PROVIDER_API_KEY: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().email(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CANCEL_TOKEN_SECRET: z.string().min(32),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten());
    throw new Error("Environment validation failed — check .env.local");
  }
  return result.data;
}

// Validated once at module load time
export const env = validateEnv();
```

**.env.example (committed to repo):**

```bash
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase (server — never prefix with NEXT_PUBLIC_)
FIREBASE_SERVICE_ACCOUNT_KEY=        # Paste the full JSON as a single-line string
FIREBASE_SESSION_COOKIE_SECRET=      # openssl rand -base64 32

# Email
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=noreply@eventhub.dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CANCEL_TOKEN_SECRET=                 # openssl rand -base64 32
```

**Important:** `FIREBASE_SERVICE_ACCOUNT_KEY` is the full service account JSON as a single-line string. Parse it in `lib/firebase/admin.ts`:

```ts
const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
```

This avoids multi-line env var escaping issues across deployment platforms.

---

## 3. Rules of the Road

These are the conventions every contributor follows. They are enforced via ESLint rules where possible; otherwise via code review.

### 3.1 Naming

| Thing              | Convention                                                            | Example                             |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------- |
| Files              | `kebab-case`                                                          | `rsvp-form.tsx`, `event.actions.ts` |
| React components   | `PascalCase` function                                                 | `export function RsvpForm()`        |
| Hooks              | `camelCase`, prefix `use`                                             | `useFocusTrap`, `useToast`          |
| Server Actions     | `camelCase`, suffix `Action` pattern                                  | `createRsvp`, `cancelEvent`         |
| Zod schemas        | `PascalCase`, suffix `Schema`                                         | `RsvpSchema`, `EventFormSchema`     |
| Inferred Zod types | `PascalCase`, suffix `Input`                                          | `RsvpInput`, `EventFormInput`       |
| Firestore types    | `PascalCase`, suffix `Doc`                                            | `EventDoc`, `RsvpDoc`               |
| Domain types       | `PascalCase`, no suffix                                               | `Event`, `Rsvp`, `Organizer`        |
| Env vars           | `SCREAMING_SNAKE_CASE`                                                | `FIREBASE_SESSION_COOKIE_SECRET`    |
| Constants          | `SCREAMING_SNAKE_CASE`                                                | `MAX_CAPACITY`, `TOKEN_TTL_HOURS`   |
| CSS classes        | Tailwind utility-first; no custom class names unless component-scoped |

### 3.2 Where Types Live

```
types/                → Domain models (Event, Rsvp, Organizer)
                         These describe what a thing IS in the domain.
                         No Zod, no Firebase specifics.

lib/validations/      → Zod schemas and their inferred Input types.
                         These describe what data looks like at a BOUNDARY.

lib/firebase/
  converters.ts       → Firestore-specific types (EventDoc, RsvpDoc)
                         These describe Firestore's shape — not the domain model.
                         Converters map between EventDoc ↔ Event.

components/*/
  *.schema.ts         → Form-specific Zod schemas colocated with the form component.
                         These extend or subset lib/validations/ schemas.
```

**The distinction that matters:** An `Event` (domain type) is what the application works with. An `EventDoc` (Firestore type) is what's stored. A `CreateEventInput` (validation type) is what comes in over the wire. These are related but not the same — conflating them creates either an anemic model or a leaky abstraction.

### 3.3 Component Boundaries

**`components/ui/`** — Zero domain knowledge. These components accept generic props: `variant`, `size`, `className`, `children`. They do not know what an "event" or an "RSVP" is. They can be dropped into any project.

```tsx
// ✅ Correct: ui component knows nothing about the domain
<Badge variant="success">Published</Badge>

// ❌ Wrong: ui component knows about event status
<EventStatusBadge status={event.status} />  // This belongs in components/event/
```

**`components/event/`, `components/rsvp/`, `components/attendee/`** — Domain-aware. These know about `Event`, `Rsvp`, etc. They receive typed domain props. They can call hooks. They cannot call Firebase directly or import from `lib/actions/` directly (they receive action functions as props or call them via form actions).

**`app/`** — Composition layer. Route files import from `components/` and `lib/`. They pass Server Action references as props to Client Components that need them:

```tsx
// app/(public)/events/[id]/page.tsx
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { createRsvp } from "@/lib/actions/rsvp.actions";

export default async function EventPage({ params }) {
  const event = await getEvent(params.id);
  return <RsvpForm eventId={event.id} action={createRsvp} />;
}
```

### 3.4 Server Action Conventions

- Every action file starts with `'use server'` at the top of the file (not per-function)
- Every action validates input with Zod before touching Firebase — no exceptions
- Every action verifies session/ownership before mutating protected resources
- Every action returns `ActionResult<T>` — never `void`, never `throws`
- Actions are named with a verb: `createEvent`, `cancelRsvp`, `updateEvent`
- Actions are never called directly from Server Components — use query functions for reads

```ts
// ✅ Correct action signature
export async function createEvent(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ eventId: string }>>;

// ❌ Wrong — no return type, throws instead of returning error
export async function createEvent(formData: FormData) {
  // ... throws on error
}
```

### 3.5 `"use client"` Discipline

- Never add `"use client"` to a file unless it needs it (see decision tree in §2.2)
- When you add `"use client"`, add a one-line comment explaining why:
  ```tsx
  "use client"; // Needs useState for form submission + useOptimistic for capacity
  ```
- Client Components may not import from `lib/firebase/admin.ts` or `lib/firebase/auth.server.ts` — ESLint rule enforces this
- Client Components may not import from `lib/actions/` directly — actions are passed as props from Server Components (this keeps the bundle boundary clean and makes testing easier)

### 3.6 File Co-location

Tests, schemas, and stories live next to the component they describe:

```
components/rsvp/
  rsvp-form.tsx
  rsvp-form.schema.ts     ← Zod schema for this form specifically
  rsvp-form.test.tsx      ← Unit/component tests
```

The exception: integration and e2e tests live in `tests/` because they span multiple components and require emulator setup.

### 3.7 Import Aliases

All imports use the `@/` alias pointing to `src/`. No relative `../../..` paths.

```ts
// ✅
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { logger } from "@/lib/utils/logger";

// ❌
import { RsvpForm } from "../../../components/rsvp/rsvp-form";
```

### 3.8 No Barrel Files (`index.ts`)

Barrel files (`index.ts` that re-export everything from a directory) cause:

- Slower TypeScript compilation
- Larger client bundles (tree-shaking works less reliably through re-exports)
- Circular dependency risks

Import directly from the file:

```ts
// ✅
import { Button } from "@/components/ui/button";

// ❌
import { Button } from "@/components/ui";
```

### 3.9 Async in Server Components

Server Component `page.tsx` files are `async` functions. Data fetching happens at the top level — not in `useEffect`. Parallel fetches use `Promise.all`:

```tsx
// app/(organizer)/dashboard/events/[id]/attendees/page.tsx
export default async function AttendeesPage({ params }) {
  // Parallel fetches — not sequential
  const [event, rsvps] = await Promise.all([
    getEvent(params.id),
    getRsvps(params.id),
  ]);

  if (!event) notFound();

  return <AttendeeTable event={event} rsvps={rsvps} />;
}
```

### 3.10 Suspense and Streaming

Each route segment has a `loading.tsx` that exports a skeleton component. Next.js wraps the page in a `<Suspense>` boundary automatically. This means:

- The layout (nav, header) renders immediately
- The page content streams in as the server fetch completes
- No full-page loading spinner — just the content area shows a skeleton

For routes with multiple independently-fetchable sections, wrap each section in an explicit `<Suspense>` with a targeted skeleton:

```tsx
// Not needed for MVP — single data source per page
// But the pattern is available when needed
<Suspense fallback={<AttendeeTableSkeleton />}>
  <AttendeeTableServer eventId={id} />
</Suspense>
```

---
