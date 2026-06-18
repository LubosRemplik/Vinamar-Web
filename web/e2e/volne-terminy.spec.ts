import { test, expect } from '@playwright/test';

const iso = (d: Date) => d.toISOString().slice(0, 10);

// A clean, always-future 7-night range: the 15th three months out stays clear of
// both the past and the seeded summer-2026 blocks, no matter when CI runs.
function futureWeek() {
  const arrival = new Date();
  arrival.setHours(12, 0, 0, 0);
  arrival.setMonth(arrival.getMonth() + 3, 15);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 7);
  return { arrival: iso(arrival), departure: iso(departure) };
}

// Booking happens entirely on the calendar: pick a free range, then the inline
// contact form appears below — no separate /rezervace page.
test('volné termíny: pick a range and book via the inline form', async ({ page }) => {
  const { arrival, departure } = futureWeek();

  await page.goto('/volne-terminy');
  await expect(page.getByRole('heading', { level: 1, name: 'Volné termíny' })).toBeVisible();
  await page.waitForSelector('[data-date][data-state="free"]');

  await page.click(`[data-date="${arrival}"]`); // arrival
  await page.click(`[data-date="${departure}"]`); // departure (7 nights, no blocks nearby)

  // The inline booking form appears in the bottom bar — no navigation.
  await expect(page.getByPlaceholder('Jméno a příjmení')).toBeVisible();
  await page.getByPlaceholder('Jméno a příjmení').fill('Test Host');
  await page.getByPlaceholder('E-mail').fill('test@example.cz');
  await page.getByPlaceholder('Telefonní číslo').fill('+420123456789');
  await page.getByRole('button', { name: 'Odeslat poptávku' }).click();

  await expect(page.getByText(/Děkujeme, ozveme se vám/)).toBeVisible();
  await expect(page).toHaveURL(/\/volne-terminy$/); // stayed on the calendar
});
