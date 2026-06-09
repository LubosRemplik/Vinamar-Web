import { test, expect } from '@playwright/test';

test('volné termíny shows month cards and a window prefills the inquiry', async ({ page }) => {
  await page.goto('/volne-terminy');
  await expect(page.getByRole('heading', { level: 1, name: 'Volné termíny' })).toBeVisible();

  const book = page.getByRole('link', { name: 'Rezervovat termín' }).first();
  await expect(book).toBeVisible();
  await book.click();

  await expect(page).toHaveURL(
    /\/rezervace\?arrival=\d{4}-\d{2}-\d{2}&departure=\d{4}-\d{2}-\d{2}/,
  );
  await expect(page.locator('input[type=date]').first()).not.toHaveValue('');
});
