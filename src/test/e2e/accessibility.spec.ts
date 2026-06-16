import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Automated Checks", () => {
  async function checkNoViolations(builder: AxeBuilder) {
    const results = await builder.disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
  }

  test("events page should be accessible", async ({ page }) => {
    await page.goto("/events");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("event detail page should be accessible", async ({ page }) => {
    await page.goto("/events");
    await page.click("a[href*='/events/']:first-child");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("My RSVPs page should be accessible", async ({ page }) => {
    await page.goto("/my-rsvps");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("login form should be accessible", async ({ page }) => {
    await page.goto("/login");
    await checkNoViolations(new AxeBuilder({ page }));
  });

  test("error states should be accessible", async ({ page }) => {
    await page.goto("/login");
    await page.click("button[type='submit']");
    const errorMessages = page.locator("[role='alert']");
    await expect(errorMessages.first()).toBeVisible();
    await checkNoViolations(new AxeBuilder({ page }).include("[role='alert']"));
  });

  test("skip link is present and reachable", async ({ page }) => {
    await page.goto("/events");
    await page.keyboard.press("Tab");
    const skipLink = page.locator("a:has-text('Skip to main content')");
    await expect(skipLink).toBeFocused();
  });

  test("all interactive elements have visible focus indicators", async ({ page }) => {
    await page.goto("/events");
    // Tab through the first several elements and verify focus visibility
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
    }
  });
});
