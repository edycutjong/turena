import { test, expect } from '@playwright/test';

test('Arena split-screen chat flow', async ({ page }) => {
  await page.goto('/arena');
  
  // Wait for the disclaimer modal to potentially appear and dismiss it if present
  const disclaimerButton = page.getByRole('button', { name: /I Understand/i });
  if (await disclaimerButton.isVisible()) {
    await disclaimerButton.click();
  }

  // Expect the two agent panels and the spectator chat to be visible
  await expect(page.getByText('Agent-007', { exact: false })).toBeVisible();
  await expect(page.getByText('Agent-404', { exact: false })).toBeVisible();
  
  // Check spectator chat is rendering
  await expect(page.getByText('Spectator Chat', { exact: false })).toBeVisible();
});
