import { test, expect } from '@playwright/test';

test('finder returns windows and Vybrat termín prefills the inquiry', async ({ page }) => {
  await page.goto('/najit-terminy');
  await page.getByRole('button', { name: 'Najít termíny' }).click();
  const first = page.getByRole('link', { name: 'Vybrat termín' }).first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(
    /\/rezervace\?arrival=\d{4}-\d{2}-\d{2}&departure=\d{4}-\d{2}-\d{2}/,
  );
  await expect(page.locator('input[type=date]').first()).not.toHaveValue('');
});
