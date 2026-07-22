import { test, expect } from '@playwright/test';

test('z-letiste page loads with heading and route link', async ({ page }) => {
  await page.goto('/z-letiste');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Z letiště');
  const link = page.getByRole('link', { name: /Trasa z letiště na mapě/i });
  await expect(link).toHaveAttribute('href', /google\.com\/maps\/dir/);
});

test('nav reaches z-letiste page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').first().getByRole('link', { name: 'Z letiště' }).click();
  await expect(page).toHaveURL(/\/z-letiste$/);
});
