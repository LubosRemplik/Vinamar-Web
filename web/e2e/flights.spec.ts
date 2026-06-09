import { test, expect } from '@playwright/test';

test('letenky page shows three origin cards with deep links', async ({ page }) => {
  await page.goto('/letenky');
  await expect(page.getByRole('heading', { name: /Letenky do Alicante/ })).toBeVisible();
  const links = page.getByRole('link', { name: /Zkontrolovat a rezervovat/ });
  await expect(links).toHaveCount(3);
});
