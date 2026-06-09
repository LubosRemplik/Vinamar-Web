import { test, expect } from '@playwright/test';

const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

test('guest can submit a valid inquiry', async ({ page }) => {
  await page.goto('/rezervace');
  await page.getByPlaceholder('Jméno').fill('Jan Novák');
  await page.getByPlaceholder('E-mail').fill('jan@example.cz');
  await page.locator('input[type=date]').first().fill(future(30));
  await page.locator('input[type=date]').last().fill(future(37));
  await page.getByRole('button', { name: 'Odeslat poptávku' }).click();
  await expect(page.getByText(/Děkujeme/)).toBeVisible();
});
