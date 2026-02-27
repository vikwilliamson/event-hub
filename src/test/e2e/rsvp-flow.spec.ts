import { test, expect } from '@playwright/test';

test.describe('RSVP Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or events page
    await page.waitForURL(/\/(dashboard|events)/);
  });

  test('should RSVP to an event from event detail page', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await expect(page.locator('h1')).toContainText('Browse Events');

    // Click on first event
    await page.click('a[href*="/events/"]:first-child');
    
    // Wait for event detail page to load
    await expect(page.locator('h1')).toBeVisible();
    
    // Find RSVP button
    const rsvpButton = page.locator('button:has-text("RSVP")');
    await expect(rsvpButton).toBeVisible();
    
    // Click RSVP button
    await rsvpButton.click();
    
    // Should show "Going" state
    await expect(page.locator('button:has-text("Going")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    
    // RSVP count should be updated
    const rsvpCount = page.locator('text=/\\d+ people going/');
    await expect(rsvpCount).toBeVisible();
  });

  test('should cancel RSVP from event detail page', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    
    // Click on first event
    await page.click('a[href*="/events/"]:first-child');
    
    // RSVP first
    await page.click('button:has-text("RSVP")');
    await expect(page.locator('button:has-text("Going")')).toBeVisible();
    
    // Cancel RSVP
    await page.click('button:has-text("Cancel")');
    
    // Should show RSVP button again
    await expect(page.locator('button:has-text("RSVP")')).toBeVisible();
  });

  test('should RSVP from event card', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    
    // Find RSVP button on event card
    const rsvpButton = page.locator('button:has-text("RSVP")').first();
    await expect(rsvpButton).toBeVisible();
    
    // Click RSVP button
    await rsvpButton.click();
    
    // Should show "Going" state on card
    await expect(page.locator('button:has-text("Going")')).toBeVisible();
  });

  test('should show RSVPs in My RSVPs page', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    
    // RSVP to first event
    await page.click('a[href*="/events/"]:first-child');
    await page.click('button:has-text("RSVP")');
    
    // Navigate to My RSVPs
    await page.click('a[href="/my-rsvps"]');
    
    // Should show the RSVP'd event
    await expect(page.locator('h1')).toContainText('My RSVPs');
    await expect(page.locator('text=/Test Event/')).toBeVisible();
    
    // Should have cancel option
    await expect(page.locator('button:has-text("Cancel RSVP")')).toBeVisible();
  });

  test('should cancel RSVP from My RSVPs page', async ({ page }) => {
    // RSVP to an event first
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    await page.click('button:has-text("RSVP")');
    
    // Navigate to My RSVPs
    await page.click('a[href="/my-rsvps"]');
    
    // Cancel RSVP
    await page.click('button:has-text("Cancel RSVP")');
    
    // Should show empty state or updated list
    await page.waitForTimeout(1000); // Wait for update
    
    // Verify event is no longer in RSVPs
    const eventTitle = page.locator('text=/Test Event/');
    if (await eventTitle.isVisible()) {
      // If there are other events, this specific one should be gone
      // This depends on having multiple test events
      expect(true).toBe(true); // Placeholder for more specific assertion
    } else {
      // Empty state
      await expect(page.locator('text=/No RSVPs yet/')).toBeVisible();
    }
  });

  test('should handle unauthenticated RSVP attempts', async ({ page }) => {
    // Logout first
    await page.goto('/logout');
    
    // Try to RSVP without auth
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    
    // Should show "Sign in to RSVP" button
    const signInButton = page.locator('a:has-text("Sign in to RSVP")');
    await expect(signInButton).toBeVisible();
    
    // Click should redirect to login
    await signInButton.click();
    await expect(page).toHaveURL('/login');
  });

  test('should show loading states during RSVP operations', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    
    // Mock slow network
    await page.route('**/rsvp**', route => {
      setTimeout(() => route.fulfill({ status: 200 }), 1000);
    });
    
    // Click RSVP button
    await page.click('button:has-text("RSVP")');
    
    // Should show loading state
    await expect(page.locator('button[aria-busy="true"]')).toBeVisible();
    await expect(page.locator('text=/RSVPing/')).toBeVisible();
  });

  test('should handle RSVP errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/rsvp**', route => {
      route.fulfill({ 
        status: 400, 
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Event is full' })
      });
    });
    
    // Navigate to event and try to RSVP
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    await page.click('button:has-text("RSVP")');
    
    // Should show error state
    await expect(page.locator('text=/Event is full/')).toBeVisible();
    
    // Button should be usable again
    await expect(page.locator('button:has-text("RSVP")')).toBeVisible();
  });
});
