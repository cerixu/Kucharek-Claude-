import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

test('Stage 60 — unified country cuisines', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/#/world');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });

  await expect(page.locator('.world-intro')).toBeVisible();
  const japan = page.locator('.world-country[aria-label^="Japonia"]').first();
  await expect(japan).toBeVisible();

  const countLabel = await japan.getAttribute('aria-label');
  expect(countLabel).toMatch(/^Japonia, \d+ receptur$/);

  await japan.click();
  await expect(page).toHaveURL(/#\/recipes\?origin=JP/);
  await expect(page.locator('.origin-filter-head')).toBeVisible();

  const data = await page.evaluate(async () => {
    const { listRecipes } = await import('./recipes.js');
    const all = listRecipes();
    const jp = all.filter(r => String(r.origin || '').toUpperCase() === 'JP');
    return { all: all.length, jp: jp.length, uniqueSources: [...new Set(jp.map(r => r.archiveCollection || r.source || ''))].length };
  });

  expect(data.jp).toBeGreaterThan(0);
  expect(data.uniqueSources).toBeGreaterThanOrEqual(1);
  expect(errors, errors.join('\n')).toEqual([]);
});
