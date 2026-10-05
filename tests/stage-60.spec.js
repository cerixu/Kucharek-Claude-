import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

test('Stage 60 — master iPhone visual shell', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/#/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  const version = await page.evaluate(async () => (await import('./util.js')).APP_VERSION);
  expect(version).toBe('1.4.2');

  await expect(page.locator('.start-brand')).toBeVisible();
  await expect(page.locator('.start-category-scroller')).toBeVisible();
  await expect(page.locator('.start-hero-card')).toBeVisible();
  await expect(page.locator('#tabbar')).toBeVisible();
  await expect(page.locator('.start-v2 .topbar')).toBeHidden();

  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.start-hero-card');
    const dock = document.querySelector('#tabbar');
    const brand = document.querySelector('.start-brand');
    const cat = document.querySelector('.start-category');
    const get = (el) => {
      const s = getComputedStyle(el);
      return { radius: parseFloat(s.borderTopLeftRadius), blur: s.backdropFilter || s.webkitBackdropFilter, shadow: s.boxShadow };
    };
    return { hero: get(hero), dock: get(dock), brand: get(brand), category: get(cat) };
  });

  expect(metrics.hero.radius).toBeGreaterThanOrEqual(32);
  expect(metrics.dock.radius).toBeGreaterThanOrEqual(28);
  expect(metrics.dock.blur).toContain('blur');
  expect(metrics.hero.shadow).toContain('rgba');
  expect(metrics.category.radius).toBeGreaterThanOrEqual(18);

  await page.screenshot({ path: 'test-results/stage-60-start.png', fullPage: true });

  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  const card = page.locator('.rcard').first();
  await expect(card).toBeVisible();
  await expect(page.locator('#tabbar')).toBeVisible();
  await card.locator('.rcard-main').click();
  await expect(page.locator('.hero-photo.recipe-visual')).toBeVisible();

  const detail = await page.evaluate(() => {
    const hero = document.querySelector('.hero-photo.recipe-visual');
    return hero ? getComputedStyle(hero).borderTopLeftRadius : 0;
  });
  expect(parseFloat(detail)).toBeGreaterThanOrEqual(28);
  expect(errors, errors.join('\n')).toEqual([]);
});
