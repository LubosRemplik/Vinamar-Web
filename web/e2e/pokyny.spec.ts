import { test, expect } from '@playwright/test';

test('pokyny page loads with heading, PDF link and noindex', async ({ page }) => {
  await page.goto('/pokyny');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pokyny k pobytu');
  await expect(page.getByRole('link', { name: 'Stáhnout PDF' })).toHaveAttribute(
    'href',
    '/pokyny/pdf',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('pokyny page is not linked from navigation', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation').first().getByRole('link', { name: /pokyny/i }),
  ).toHaveCount(0);
});

test('pokyny PDF is served as a download', async ({ request }) => {
  const res = await request.get('/pokyny/pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');
  expect(res.headers()['content-disposition']).toContain('attachment');
  const body = await res.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
});
