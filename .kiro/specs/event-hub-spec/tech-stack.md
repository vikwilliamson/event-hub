# EventHub — Tech Stack

**Version:** 1.0 · **Status:** Living Document

---

## Runtime & Framework

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | ^15.0.0 | Server Components by default; Server Actions for mutations |
| Language | TypeScript | ^5.6.0 | Strict mode; all files typed |
| Runtime | Node.js | LTS | Deployed on Firebase Hosting via Cloud Run |
| React | React | ^19.0.0 | `useOptimistic`, `useTransition`, `useActionState` available |

---

## Database & Auth

| Service | Purpose | Notes |
|---|---|---|
| Firebase Firestore | Primary database | Subcollection hierarchy: `/organizers/{uid}/events/{id}/rsvps/{id}` |
| Firebase Auth | Organizer authentication | Email/password only in v1; Google OAuth deferred |
| Firebase Admin SDK | Server-side Firestore + Auth | `firebase-admin` ^13.7.0; never in client bundle |
| Firebase Client SDK | Client-side sign-in flow | `firebase` ^11.10.0; auth only — no client-side Firestore reads |
| Session Cookies | Organizer session management | `HttpOnly`, `Secure`, `SameSite=Strict`, 7-day TTL |

---

## Styling

| Tool | Version | Notes |
|---|---|---|
| Tailwind CSS | ^3.4.0 | Utility-first; no custom class names except component-scoped |
| PostCSS | ^8.4.0 | Tailwind build tooling |
| `clsx` | ^2.1.0 | Conditional class composition |
| `tailwind-merge` | ^2.5.0 | Deduplication of conflicting Tailwind classes |

---

## Validation

| Tool | Version | Notes |
|---|---|---|
| Zod | ^3.23.0 | Single schema used on both client (form validation) and server (action guard) |

---

## Email (Not Yet Implemented)

The email provider is undecided (open question OQ-1 in PRD). The architecture spec defines a provider-agnostic interface at `lib/email/index.ts`. Candidates: **Resend**, **SendGrid**, **Postmark**. The `ANTHROPIC_API_KEY` for the AI confirmation email feature will also need to be added to the env schema.

---

## Testing

| Tool | Purpose | Status |
|---|---|---|
| Vitest | Unit tests (schemas, utils) | Configured in architecture; **not yet set up in package.json** |
| Playwright | E2E and accessibility tests | Config file exists (`playwright.a11y.config.ts`); specs exist in `src/test/e2e/` |
| `@axe-core/playwright` | Automated a11y assertions in E2E | Referenced in docs; **not in dependencies** |
| Firebase Emulator Suite | Integration tests against real local DB | Referenced in docs; **not in package.json scripts** |
| Jest (partial) | Integration test files use `@jest/globals` imports | Conflicts with Vitest decision in ADR-005; needs resolution |

---

## Observability

| Tool | Purpose | Status |
|---|---|---|
| `src/lib/observability/logger.ts` | Structured in-memory logger | Implemented; no external sink wired |
| `src/lib/analytics.ts` | Simple client-side analytics tracker | Implemented; in-memory only |
| `src/components/analytics-dashboard.tsx` | UI for viewing analytics | Partially broken — imports `@/lib/observability/analytics` which does not exist |
| Cloud Logging | Production log sink | Automatic via Cloud Run stdout; logger emits JSON in production |

---

## Dev Tooling

| Tool | Version | Notes |
|---|---|---|
| ESLint | ^9.0.0 | `eslint-config-next` included; custom rules for Firebase import boundaries not yet configured |
| `dotenv` | ^17.3.1 | Used in scripts; env validation at startup is in `src/lib/env.ts` |

---

## Environment Variables

All config is validated at startup via Zod in `src/lib/env.ts`. The schema currently makes all Firebase variables **optional** (emits a warning in dev, exits in prod). The architecture spec calls for them to be required — this is a known gap.

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client config | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client config | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase client config | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase client config | Yes |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin SDK | Yes |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin SDK | Yes |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin SDK | Yes |
| `SESSION_COOKIE_NAME` | Cookie name override | No (defaults to `session`) |
| `CANCEL_TOKEN_SECRET` | HMAC signing for cancel links | **Missing from current env.ts** |
| `EMAIL_PROVIDER_API_KEY` | Transactional email | **Missing — not yet wired** |
| `EMAIL_FROM_ADDRESS` | From address for emails | **Missing — not yet wired** |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (for cancel links) | **Missing from current env.ts** |
| `ANTHROPIC_API_KEY` | Claude API for AI email feature | **To be added** |

---

## What Is NOT in the Stack (By Design)

| Excluded | Reason |
|---|---|
| Zustand / Redux | State is local or prop-passed; no global store justified |
| React Query / SWR | All reads are server-side; no client-side data fetching needed |
| Prisma / other ORM | Firestore only; Admin SDK with typed converters suffices |
| Stripe | Payment processing permanently out of scope |
| React Testing Library | Replaced by E2E coverage + schema unit tests (ADR-005) |
| Google OAuth | Deferred to v2 |
| `react-hook-form` | Not yet installed despite being called for in ADR-004 |
