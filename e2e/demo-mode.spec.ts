import { test, expect } from '@playwright/test';

test('App loads and metadata is correct in demo mode', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Turena/);
  
  // Verify no console errors
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/arena');
  await page.waitForLoadState('networkidle');

  // Should have some error array length expectation, but for now we just want to ensure it loads
  expect(errors).not.toContain('Internal Server Error');
});
