import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// The E2E suite runs against a throwaway store on a dedicated port so it never
// touches the user's live data file or their `npm run dev` server on :3000.
const E2E_PORT = 3100;
const E2E_DATA_FILE = path.join(os.tmpdir(), "eventhub-e2e-db.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./src/test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Fresh throwaway store each run: delete → seed → serve, all pinned to the
    // same EVENTHUB_DATA_FILE so browse/RSVP/create act on seeded data only.
    command: `rm -f "${E2E_DATA_FILE}" && npm run seed && npm run dev -- -p ${E2E_PORT}`,
    url: BASE_URL,
    env: { EVENTHUB_DATA_FILE: E2E_DATA_FILE },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
