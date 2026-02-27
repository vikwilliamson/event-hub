import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Automated Checks', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page);
  });

  test('events page should be accessible', async ({ page }) => {
    await page.goto('/events');
    
    // Check for accessibility violations
    await checkA11y(page, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // Temporarily disable rules that need manual verification
        'color-contrast': { enabled: false },
        'keyboard-navigation': { enabled: false }
      }
    });
  });

  test('event detail page should be accessible', async ({ page }) => {
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    
    await checkA11y(page, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: false },
        'keyboard-navigation': { enabled: false }
      }
    });
  });

  test('RSVP button should be accessible', async ({ page }) => {
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    
    // Test RSVP button states
    const rsvpButton = page.locator('button:has-text("RSVP")');
    await expect(rsvpButton).toBeVisible();
    
    // Check accessibility of RSVP button
    await checkA11y(page.locator('button:has-text("RSVP")'), {
      detailedReport: true
    });
    
    // Test "Going" state
    await rsvpButton.click();
    await checkA11y(page.locator('button:has-text("Going")'), {
      detailedReport: true
    });
  });

  test('My RSVPs page should be accessible', async ({ page }) => {
    await page.goto('/my-rsvps');
    
    await checkA11y(page, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: false },
        'keyboard-navigation': { enabled: false }
      }
    });
  });

  test('navigation should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check header navigation
    await checkA11y(page.locator('header'), {
      detailedReport: true
    });
    
    // Test keyboard navigation through menu
    await page.keyboard.press('Tab');
    const firstFocusable = await page.locator(':focus');
    await expect(firstFocusable).toBeVisible();
    
    // Navigate through all focusable elements
    let focusCount = 0;
    const maxTabs = 20; // Prevent infinite loops
    
    while (focusCount < maxTabs) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      
      if (!await focused.isVisible()) break;
      
      // Each focused element should be accessible
      await checkA11y(focused, {
        detailedReport: false, // Skip detailed report for individual elements
        rules: {
          'color-contrast': { enabled: false }
        }
      });
      
      focusCount++;
    }
  });

  test('forms should be accessible', async ({ page }) => {
    await page.goto('/login');
    
    // Check form accessibility
    await checkA11y(page.locator('form'), {
      detailedReport: true
    });
    
    // Test form field labels
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label:has-text("Email")');
    
    await expect(emailLabel).toBeVisible();
    await expect(emailInput).toHaveAttribute('aria-labelledby', await emailLabel.getAttribute('id'));
    
    // Test password field
    const passwordInput = page.locator('input[type="password"]');
    const passwordLabel = page.locator('label:has-text("Password")');
    
    await expect(passwordLabel).toBeVisible();
    await expect(passwordInput).toHaveAttribute('aria-labelledby', await passwordLabel.getAttribute('id'));
  });

  test('error states should be accessible', async ({ page }) => {
    await page.goto('/login');
    
    // Submit empty form to trigger validation errors
    await page.click('button[type="submit"]');
    
    // Check error messages are accessible
    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
    
    await checkA11y(page.locator('[role="alert"]'), {
      detailedReport: true
    });
  });

  test('loading states should be accessible', async ({ page }) => {
    await page.goto('/events');
    await page.click('a[href*="/events/"]:first-child');
    
    // Mock slow network to trigger loading state
    await page.route('**/rsvp**', route => {
      setTimeout(() => route.fulfill({ status: 200 }), 2000);
    });
    
    await page.click('button:has-text("RSVP")');
    
    // Check loading state accessibility
    const loadingButton = page.locator('button[aria-busy="true"]');
    await expect(loadingButton).toBeVisible();
    
    await checkA11y(loadingButton, {
      detailedReport: true
    });
  });
});
