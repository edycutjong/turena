import { test, expect } from '@playwright/test';

test('Arena split-screen chat flow', async ({ page }) => {
  await page.goto('/arena');
  
  // Wait for the disclaimer modal to potentially appear and dismiss it if present
  const disclaimerButton = page.getByRole('button', { name: /I Understand/i });
  if (await disclaimerButton.isVisible()) {
    await disclaimerButton.click();
  }

  // Expect the primary agent panel to be visible (Agent-404 is hidden on mobile so we don't assert it strictly here)
  await expect(page.locator('text=Agent-007').first()).toBeVisible();
  
  // Check spectator chat is rendering
  await expect(page.getByText('LIVE ARENA CHAT', { exact: false })).toBeVisible();
});
