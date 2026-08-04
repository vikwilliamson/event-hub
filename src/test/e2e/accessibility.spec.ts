import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated axe scans across the demo's key routes. Auth is gone, so there is
 * no /login page to scan — coverage is the public discovery pages plus the
 * organizer dashboard and create form. Color-contrast is excluded here (audited
 * separately in TASK-29).
 */
test.describe("Accessibility Automated Checks", () => {
  async function checkNoViolations(builder: AxeBuilder) {
    const results = await builder.disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
  }

  test("home page should be accessible", async ({ page }) => {
    await page.goto("/");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("events page should be accessible", async ({ page }) => {
    await page.goto("/events");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("event detail page should be accessible", async ({ page }) => {
    await page.goto("/events");
    await page.getByRole("link", { name: "View details" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("dashboard should be accessible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("create-event form should be accessible", async ({ page }) => {
    await page.goto("/dashboard/events/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create event");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("skip link is present and reachable", async ({ page }) => {
    await page.goto("/events");
    await page.keyboard.press("Tab");
    const skipLink = page.locator("a:has-text('Skip to main content')");
    await expect(skipLink).toBeFocused();
  });

  test("all interactive elements have visible focus indicators", async ({ page }) => {
    await page.goto("/events");
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
    }
  });
});
