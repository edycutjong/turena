import { test, expect } from '@playwright/test';

test.describe('Responsive layout', () => {
  test('Arena renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/arena');
    
    // Check there is no horizontal scroll
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  });

  test('Arena renders correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/arena');
    
    // Check main elements are visible
    await expect(page.locator('main')).toBeVisible();
  });
});
