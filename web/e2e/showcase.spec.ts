import { test, expect } from '@playwright/test';

test('home renders hero and CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Apartmán');
  await expect(page.getByRole('link', { name: /Zobrazit volné termíny/i })).toBeVisible();
});

test('nav reaches all showcase pages', async ({ page }) => {
  const nav = page.getByRole('navigation');
  await page.goto('/');
  await nav.getByRole('link', { name: 'Apartmán' }).click();
  await expect(page).toHaveURL(/\/apartman$/);
  await nav.getByRole('link', { name: 'Okolí' }).click();
  await expect(page).toHaveURL(/\/okoli$/);
  await nav.getByRole('link', { name: 'Tipy na výlety' }).click();
  await expect(page).toHaveURL(/\/tipy-na-vylety$/);
});

test('rezervace link navigates to the booking page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Rezervace' }).click();
  await expect(page).toHaveURL(/\/rezervace$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rezervace');
});

test('a trip detail page loads from its slug', async ({ page }) => {
  await page.goto('/tipy-na-vylety');
  await page.getByText('Pláž La Mata').click();
  await expect(page).toHaveURL(/\/tipy-na-vylety\/la-mata-plaz$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pláž La Mata');
});
