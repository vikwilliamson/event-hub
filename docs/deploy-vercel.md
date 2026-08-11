# Deploying EventHub to Vercel

EventHub's default data store is a local JSON file, which **cannot** run on
Vercel's serverless runtime (read-only, ephemeral, per-instance filesystem). On
Vercel the app instead uses **Vercel KV** (Upstash Redis) — the code already
switches automatically when the KV REST credentials are present (see
`src/lib/store/index.ts` → `createStore`). Nothing to change in code; you just
provision KV, set env vars, seed once, and deploy.

The steps below require your Vercel account, so **you** run them (an agent can't
do the interactive `vercel login`). Run each from the project root.

## 1. Log in and link the project

```sh
vercel login          # opens a browser; run as `! vercel login` in this session if you want the output here
vercel link           # pick/create the Vercel project for this repo
```

## 2. Provision Vercel KV and attach it

In the Vercel dashboard → your project → **Storage** → **Create Database** →
**KV** (Upstash Redis). Create it and click **Connect** to this project for all
environments. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into the
project's env vars automatically.

## 3. Add the feature keys (optional but recommended)

The AI and map features are key-gated — without these the app still runs, it
just hides those features. Add them for the full demo:

```sh
vercel env add ANTHROPIC_API_KEY production            # Claude: AI search + description drafting
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production   # map view on /events
```

(Repeat for `preview`/`development` if you want them there too.)

## 4. Seed the KV store once

KV starts empty, so seed it with the demo events. Pull the project's env vars
locally and run the existing seed script against KV:

```sh
vercel env pull .env.production.local           # writes KV_REST_API_URL / KV_REST_API_TOKEN
node --env-file=.env.production.local --import tsx scripts/seed.ts
# expect: "Seeded 12 events (store now has 12 events, 3 users)."
```

`npm run seed` is idempotent (upserts by fixed IDs), so it's safe to re-run.
`.env.production.local` is gitignored — don't commit it.

## 5. Deploy

```sh
vercel deploy --prod
```

Or connect the GitHub repo in the Vercel dashboard for automatic deploys on
push. Either way, open the deployment URL and verify: `/events` lists the seeded
events, the map renders (if the Maps key is set), the AI search box appears (if
the Anthropic key is set), and creating an event / RSVPing persists across a
page reload (proves KV writes work).

## Notes

- **Persistence model:** the whole store is one KV blob; reads/writes are
  read-modify-write with last-writer-wins. Fine for a demo; not built for high
  write concurrency.
- **No KV credentials set?** The app falls back to the local JSON file store —
  which is what you want locally (`npm run dev`) and in the E2E suite, but would
  break on Vercel. The KV integration in step 2 is what prevents that.
- **Rotating keys:** update the env var in Vercel and redeploy; KV data is
  unaffected.
