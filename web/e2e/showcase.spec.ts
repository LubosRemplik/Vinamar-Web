import { test, expect } from '@playwright/test';

test('home renders hero and CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Apartmán');
  await expect(page.getByRole('link', { name: /Zobrazit volné termíny/i }).first()).toBeVisible();
});

test('nav reaches all showcase pages', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation').first();
  await nav.getByRole('link', { name: 'Apartmán a okolí' }).click();
  await expect(page).toHaveURL(/\/apartman$/);
  await page.goto('/');
  await nav.getByRole('link', { name: 'Tipy na výlety' }).click();
  await expect(page).toHaveURL(/\/tipy-na-vylety$/);
});

test('the retired /okoli URL redirects into the merged page', async ({ page }) => {
  await page.goto('/okoli');
  await expect(page).toHaveURL(/\/apartman$/);
  await expect(page.getByRole('heading', { name: 'Pláž a La Mata' })).toBeVisible();
});

test('a trip detail page loads from its slug', async ({ page }) => {
  await page.goto('/tipy-na-vylety');
  await page.getByRole('heading', { name: 'Růžová solná jezera' }).click();
  await expect(page).toHaveURL(/\/tipy-na-vylety\/solna-jezera$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Růžová solná jezera');
});

test('gallery lightbox opens on click and closes with Escape', async ({ page }) => {
  await page.goto('/apartman');
  await page
    .getByRole('button', { name: /^Zvětšit fotku/ })
    .first()
    .click();

  const lightbox = page.getByRole('dialog');
  await expect(lightbox).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});
