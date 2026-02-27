# EventHub — Step-by-Step Scaffolding Plan

**Version:** 1.0 · **Status:** In progress  
**Purpose:** Ship a portfolio-ready MVP with senior-level ownership: architecture, a11y, testing, security, and documentation.

---

## 1. Prerequisites

- Node 20+
- Firebase project (Auth + Firestore enabled)
- Local env: copy `.env.example` → `.env.local`, fill `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_ADMIN_*`

---

## 2. Scaffolding Order

Execute in this order to respect dependencies (no circular imports, types before use).

| Step | What | Why |
|------|------|-----|
| 1 | Root config: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example` | So `npm install` and `npm run dev` work; path alias `@/` → `src/` |
| 2 | `src/lib/utils/cn.ts` | Used by UI components; no deps |
| 3 | `src/lib/utils/errors.ts` (minimal `AppError`, `normalizeError`) | Used by actions and firebase layer |
| 4 | Firebase types + converters: `src/lib/firebase/types.ts`, `converters.ts` | Typed Firestore layer depends on these |
| 5 | Firebase client SDK: `src/lib/firebase/client.ts` | Singleton; client-only |
| 6 | Firebase Admin SDK: `src/lib/firebase/admin.ts` | Server-only; used by auth and Firestore access |
| 7 | Typed Firestore access: `src/lib/firebase/db.ts` | Thin wrapper: typed collection/doc refs; server-only |
| 8 | Auth client: `src/lib/firebase/auth.client.ts` | Sign in/up/out, session cookie mint; uses client SDK |
| 9 | Auth server: `src/lib/firebase/auth.server.ts` | `getSession()`, `verifySessionCookie()`; uses Admin |
| 10 | UI primitives: `Button`, `Input`, `FieldError`, `Spinner` in `src/components/ui/` | Accessible, minimal; used by layouts and forms |
| 11 | Layout: `SkipLink`, `PublicHeader`, `AppNav` in `src/components/layout/` | Skip link + nav; used by root layout |
| 12 | Root layout: `src/app/layout.tsx` | Skip link, nav, fonts, `<main>` |
| 13 | Route groups + MVP page stubs: `(public)`, `(auth)`, `(organizer)` | Thin route files; no business logic |
| 14 | Global `not-found.tsx`, `error.tsx` | Error boundaries and 404 |
| 15 | Middleware: `src/middleware.ts` | Protect `/dashboard/*`, redirect unauthenticated to `/login` |

---

## 3. File Map (Generated Files)

```
src/
├── app/
│   ├── layout.tsx                 # Root: skip link, nav, main
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── (public)/
│   │   ├── layout.tsx            # Optional: public-specific wrapper
│   │   └── events/[id]/
│   │       └── page.tsx          # Stub: event detail
│   ├── (auth)/
│   │   ├── layout.tsx            # Centered card layout
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   └── (organizer)/
│       ├── layout.tsx            # Protected; top bar
│       └── dashboard/
│           └── page.tsx          # Stub
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── field-error.tsx
│   │   └── spinner.tsx
│   └── layout/
│       ├── skip-link.tsx
│       ├── public-header.tsx     # Nav + logo
│       └── app-nav.tsx           # Accessible nav links
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Client SDK init
│   │   ├── admin.ts              # Admin SDK init (server-only)
│   │   ├── auth.client.ts        # Sign in/up/out, createSessionCookie
│   │   ├── auth.server.ts        # getSession, verifySessionCookie
│   │   ├── types.ts              # Event, Rsvp, etc. (domain types)
│   │   ├── converters.ts         # FirestoreDataConverter
│   │   └── db.ts                 # Typed collection refs (server)
│   └── utils/
│       ├── cn.ts
│       └── errors.ts
└── middleware.ts
```

---

## 4. Auth Session Strategy (Chosen)

**Firebase session cookies (ADR-002).**

- Client: Firebase Auth (email/password) → on sign-in success, call Server Action that mints session cookie via `adminAuth.createSessionCookie(idToken, { expiresIn: 7 * 24 * 60 * 60 })`.
- Cookie: `HttpOnly`, `Secure`, `SameSite=Strict`, 7-day expiry.
- Middleware: read cookie, verify with `verifySessionCookie` (or skip verify in middleware and verify in Server Components / actions for simplicity in MVP).
- Sign-out: Server Action revokes refresh tokens and clears cookie.

**Scaffold implements:**  
`auth.client.ts` (signIn, signUp, signOut, createSessionCookie via Server Action), `auth.server.ts` (`getSession(cookies())`), middleware stub that checks for cookie presence and redirects to `/login` for `/dashboard/*`.

---

## 5. Tradeoffs in This Scaffold

| Choice | Tradeoff |
|--------|----------|
| Session cookie over ID token in header | Cookie works with Server Actions and middleware without client passing token; slightly more setup on sign-in. |
| Converters in `lib/firebase/` | Single place for Firestore ↔ app types; server and client (if any client Firestore) share types. |
| UI primitives without a component library | Minimal deps, full control over a11y and styles; more code to maintain. |
| Route groups `(public)`, `(auth)`, `(organizer)` | Clear layout boundaries; no URL segment added. |
| Middleware only checks cookie presence | Fast; full `verifySessionCookie` in layout or Server Actions avoids double verification. |

---

## 6. Next Steps After Scaffold

1. Implement Server Actions: `auth.actions.ts` (createSessionCookie, signOut), then event and RSVP actions.
2. Wire auth forms to Firebase Auth + session cookie action.
3. Add Firestore queries in `lib/queries/` and use in page Server Components.
4. Add form validation (Zod) and `ActionResult<T>` return types.
5. Add tests: unit for utils/converters, integration for actions with emulator, a11y for critical routes.

---

## 7. References

- PRD: `docs/prd.md`
- Architecture: `docs/project-arch.md`
- ADRs: `docs/adr.md` (ADR-001 App Router, ADR-002 session cookies)
- Data model: `docs/data-model.md`
- Security rules: `docs/security-rules.md`
