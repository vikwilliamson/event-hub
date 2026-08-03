# Event Hub

A meetup-style event discovery and RSVP app built with Next.js 15, React 19, and TypeScript. Browse and search events by keyword, category, and location; RSVP with capacity enforcement; and manage your own events from an organizer dashboard — all with **zero sign-in and zero API keys**.

## Demo Quickstart

```bash
npm install
npm run seed   # ~12 realistic events across several US cities
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — no `.env.local` needed.

The demo runs entirely on a local JSON-file store (`data/eventhub-db.json`, gitignored). There is no login: middleware mints an anonymous `eh_uid` cookie on your first visit, and that identity scopes "My RSVPs" and your organizer dashboard per browser.

## Features

- **Event discovery**: browse upcoming and past events with server-rendered, shareable search URLs
- **Search & location**: text, category, and city+radius filters; distance badges when a search center is active (pure haversine math — no geocoding API)
- **Map view**: optional Google Maps view of results when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; degrades to the list with a notice without it
- **RSVP management**: RSVP/cancel with capacity enforcement, atomic counts, and re-RSVP after cancel
- **Organizer dashboard**: create, edit, publish/unpublish, and cancel events; attendee list per event
- **AI confirmation emails**: Claude-generated RSVP confirmations when `ANTHROPIC_API_KEY` and email keys are set (skipped otherwise)
- **Accessibility**: skip links, `aria-live` updates, reduced-motion support, axe-checked components

## Environment Variables

Every key is **optional** — the demo runs with an empty environment. Keys unlock extras:

| Variable | Unlocks |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map view on `/events` |
| `ANTHROPIC_API_KEY` | Claude-generated RSVP confirmation emails |
| `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS` | Email sending (Resend) |
| `EVENTHUB_DATA_FILE` | Alternate path for the local JSON store |
| `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*` | Legacy — unused by the local-store runtime, kept for a future data-layer swap back to Firestore |

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions), React 19, TypeScript
- **Data**: JSON-file-backed store behind a small `Store` interface (`src/lib/store/`) — swapping back to Firestore is a data-layer change, not a rewrite
- **Validation**: Zod schemas shared between forms (react-hook-form) and Server Actions
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit + integration against an in-memory store), Playwright (E2E), axe-core (a11y)

## Project Structure

```
src/
  app/
    (public)/        # Browse, event detail, my RSVPs
    (organizer)/     # Dashboard: create/edit/cancel events, attendees
  components/
    event/           # Cards, forms, search form, map
    ui/              # Base UI primitives (button, input, toast, …)
  lib/
    actions/         # Server Actions (events, RSVPs)
    store/           # Store interface + JsonFileStore / MemoryStore
    geo.ts           # Haversine distance, radius filtering
    search.ts        # Event search + URL param parsing
    cities.ts        # Preset search centers
    session.ts       # Anonymous demo identity (eh_uid cookie)
    email/           # Email templates + Claude-powered confirmation
  test/              # Unit + integration tests, factories
scripts/seed.ts      # npm run seed
```

## Data Model

One flat `events` collection with an `organizerId` field; RSVPs keyed `${eventId}_${userId}`; users created lazily from the demo session. Dates persist as ISO strings and revive to `Date` on load. See `src/lib/types.ts` for the canonical types.

## Testing

```bash
npm test                  # all Vitest suites (unit + integration)
npm run test:unit         # geo, search, store, schema, a11y units
npm run test:integration  # Server Actions against MemoryStore
npm run test:e2e          # Playwright
```

Integration tests substitute a `MemoryStore` via `setStore()` and a stubbed session — no external services, no emulators.

## Deployment

```bash
npm run build
npm start
```

Note the local JSON store is per-instance; for a multi-instance or serverless deployment, swap the `Store` implementation for a real database first.

## License

MIT — see [LICENSE](LICENSE).
