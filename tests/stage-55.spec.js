import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

async function waitReady(page) {
  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await page.waitForFunction(
    () => [...window.__kucharek.state.recipes.values()]
      .filter(r => String(r.id).startsWith('rcp_archive_')).length === 1700,
    null,
    { timeout: 90000 }
  );
}

test('Stage 55 — wiele minutników, trwałość i integracja z Gotuję', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await waitReady(page);
  await page.goto('/#/cook/' + BIGOS_ID);
  await expect(page.getByRole('button', { name: 'Minutnik', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Minutnik', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minutniki' })).toBeVisible();

  const oneMinute = page.getByRole('button', { name: '1 min', exact: true });
  await oneMinute.click();
  await oneMinute.click();

  await expect(page.locator('.timer-row')).toHaveCount(2);
  await expect(page.locator('.timer-pill')).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('k:timers') || '[]'));
  expect(stored).toHaveLength(2);

  await page.reload();
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await expect(page.locator('.timer-pill')).toBeVisible();

  await page.locator('.timer-pill').click();
  await expect(page.getByRole('heading', { name: 'Minutniki' })).toBeVisible();
  await expect(page.locator('.timer-row')).toHaveCount(2);

  await page.locator('.timer-row').first().getByRole('button', { name: '+1 min', exact: true }).click();
  const storedAfterAdd = await page.evaluate(() => JSON.parse(localStorage.getItem('k:timers') || '[]'));
  expect(storedAfterAdd).toHaveLength(2);
  expect(Number(storedAfterAdd[0].total)).toBeGreaterThan(60);

  expect(errors, errors.join('\n')).toEqual([]);
});
