import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'allow' });

async function ready(page) {
  const started = await page.evaluate(() => performance.now());
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, { timeout: 30000 });
  return page.evaluate((started) => ({
    wallMs: Math.round(performance.now() - started),
    ...window.__kucharekPerf
  }), started);
}

test('Stage 46: pierwszy start ładuje pełną bibliotekę 1200+ bez przekroczenia budżetu', async ({ page }) => {
  const perf = await ready(page);
  expect(perf.recipeCount).toBeGreaterThanOrEqual(1200);
  expect(perf.bootMs).toBeLessThan(12000);
  expect(perf.wallMs).toBeLessThan(15000);
});

test('Stage 46: lista receptur renderuje tylko pierwszą stronę zamiast 2070 kart', async ({ page }) => {
  await ready(page);

  const before = await page.evaluate(() => performance.now());
  await page.goto('/#/recipes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Receptury' }).waitFor();
  const paintMs = await page.evaluate((before) => Math.round(performance.now() - before), before);

  const count = await page.locator('.rcard').count();
  const total = await page.locator('.counter').textContent();

  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(40);
  expect(total).toMatch(/2070|receptur|receptury|receptura/);
  expect(paintMs).toBeLessThan(3000);
});

test('Stage 46: ciężki moduł PRO nie blokuje pierwszego renderu', async ({ page }) => {
  await ready(page);
  const resources = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => e.name.includes('views-pro-fixed.js'))
    .map((e) => ({ start: Math.round(e.startTime), duration: Math.round(e.duration) })));
  expect(resources.length).toBeLessThanOrEqual(1);
});

test('Stage 46: restoreSeeds nie generuje biblioteki drugi raz', async ({ page }) => {
  const source = await (await page.request.get('/recipes.js', { cache: 'no-store' })).text();
  expect(source).toContain('seedRecipes() już zawiera całą bibliotekę 1200+');
  expect(source).toContain('new Map(seedRecipes().map((r) => [r.id, r]))');
  expect(source).not.toContain('const seeds=[...seedRecipes(), ...recipeLibrary()]');
});
