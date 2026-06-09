import { test, expect } from '@playwright/test';

// Booking happens entirely on the calendar: pick a free range, then the inline
// contact form appears below — no separate /rezervace page. (Relies on the seeded
// 2026 summer fixtures; June is fully free.)
test('volné termíny: pick a range and book via the inline form', async ({ page }) => {
  await page.goto('/volne-terminy');
  await expect(page.getByRole('heading', { level: 1, name: 'Volné termíny' })).toBeVisible();
  await page.waitForSelector('[data-date][data-state="free"]');

  await page.click('[data-date="2026-06-15"]'); // arrival
  await page.click('[data-date="2026-06-22"]'); // departure (7 nights, no blocks nearby)

  // The inline booking form appears below the calendar — no navigation.
  await expect(page.getByText(/Rezervace termínu 2026-06-15/)).toBeVisible();
  await page.getByPlaceholder('Jméno').fill('Test Host');
  await page.getByPlaceholder('E-mail').fill('test@example.cz');
  await page.getByRole('button', { name: 'Odeslat poptávku' }).click();

  await expect(page.getByText(/Děkujeme, ozveme se vám/)).toBeVisible();
  await expect(page).toHaveURL(/\/volne-terminy$/); // stayed on the calendar
});
