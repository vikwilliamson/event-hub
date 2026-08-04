import { test, expect } from "@playwright/test";

/**
 * Demo smoke: the core no-auth journey against seeded data.
 *
 * Identity is automatic — the middleware mints an `eh_uid` cookie on first
 * request, and Playwright's per-test browser context keeps it, so each test is
 * "one user" with no sign-in. Tests that only read seeded data are safe to run
 * in parallel; the RSVP/create test isolates itself with a uniquely-titled
 * event so counts stay deterministic no matter how many workers run.
 */

test.describe("Demo smoke", () => {
  test("browse and filter events by city + radius", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Browse Events");

    // Seeded data spans several metros before filtering.
    await expect(page.getByRole("link", { name: "Denver TypeScript Meetup" })).toBeVisible();
    await expect(page.getByRole("link", { name: "East Austin Taco Crawl" })).toBeVisible();

    // Filter to Denver within 50km via the server-rendered search form.
    const search = page.getByRole("search", { name: "Search events" });
    await search.getByLabel("Search").fill("meetup");
    await search.getByLabel("Near").selectOption("denver");
    await search.getByLabel("Within").selectOption("50");
    await search.getByRole("button", { name: "Search" }).click();

    // The filter produces a shareable URL...
    await expect(page).toHaveURL(/near=denver/);
    await expect(page).toHaveURL(/radius=50/);
    await expect(page).toHaveURL(/q=meetup/);

    // ...Denver results show with distance badges, Austin events are gone.
    await expect(page.getByRole("link", { name: "Denver TypeScript Meetup" })).toBeVisible();
    await expect(page.getByRole("link", { name: "East Austin Taco Crawl" })).toHaveCount(0);
    await expect(page.getByText(/km away/).first()).toBeVisible();
  });

  test("create an event, see it listed, RSVP, and find it in My RSVPs", async ({ page }) => {
    // A unique title keeps this flow's assertions independent of other workers.
    const title = `E2E Rooftop Party ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD, ~30 days out

    // --- Create + publish ---
    await page.goto("/dashboard/events/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create event");
    // Publishing is a client action (react-hook-form). Wait for the client
    // bundle to load/hydrate before submitting, or a cold dev-mode compile can
    // let the click fire a native form submit that never creates the event.
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("A relaxed evening on the rooftop with music and friends.");
    await page.getByLabel("Location").fill("Denver, CO");
    await page.getByLabel("Date").fill(future);
    await page.getByLabel("Time").fill("19:00");
    await page.getByRole("button", { name: "Publish event" }).click();

    // Publishing redirects to the organizer's event page.
    await expect(page).toHaveURL(/\/dashboard\/events\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    // --- It appears on the public /events listing ---
    await page.goto("/events");
    const listingLink = page.getByRole("link", { name: title });
    await expect(listingLink).toBeVisible();

    // --- RSVP from the detail page ---
    await listingLink.click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("0 people going")).toBeVisible();

    // RSVP is a client onClick — wait for hydration before pressing it.
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "RSVP to this event" }).click();

    // Button flips to Going + Cancel, and the count increments (unique event → 1).
    await expect(page.getByRole("button", { name: "You are going to this event" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel RSVP" })).toBeVisible();
    await expect(page.getByText("1 person going")).toBeVisible();

    // --- My RSVPs lists it as confirmed ---
    await page.goto("/my-rsvps");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("My RSVPs");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Confirmed RSVPs")).toBeVisible();
  });
});
