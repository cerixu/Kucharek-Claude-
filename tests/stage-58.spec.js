import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

test('Stage 58 — luxury glass visual system and user flow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/#/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });

  const version = await page.evaluate(async () => (await import('./util.js')).APP_VERSION);
  expect(version).toBe('1.3.98');

  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.mode = 'pro';
  });

  await expect(page.locator('.start-hero-card')).toBeVisible();
  await expect(page.locator('#tabbar')).toBeVisible();

  const startStyle = await page.evaluate(() => {
    const hero = document.querySelector('.start-hero-card');
    const dock = document.querySelector('#tabbar');
    const action = document.querySelector('.start-action');
    const cs = getComputedStyle(hero);
    const ds = getComputedStyle(dock);
    const as = getComputedStyle(action);
    return {
      heroRadius: parseFloat(cs.borderTopLeftRadius),
      heroShadow: cs.boxShadow,
      dockRadius: parseFloat(ds.borderTopLeftRadius),
      dockBlur: ds.backdropFilter || ds.webkitBackdropFilter,
      actionRadius: parseFloat(as.borderTopLeftRadius),
    };
  });

  expect(startStyle.heroRadius).toBeGreaterThanOrEqual(30);
  expect(startStyle.dockRadius).toBeGreaterThanOrEqual(28);
  expect(startStyle.heroShadow).toContain('rgba');
  expect(startStyle.actionRadius).toBeGreaterThanOrEqual(22);
  expect(startStyle.dockBlur).toContain('blur');

  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.mode = 'pro';
  });

  const card = page.locator('.rcard').first();
  await expect(card).toBeVisible();
  const recipeStyle = await card.evaluate((el) => {
    const card = getComputedStyle(el);
    const thumb = getComputedStyle(el.querySelector('.rthumb'));
    return {
      cardRadius: parseFloat(card.borderTopLeftRadius),
      thumbRadius: parseFloat(thumb.borderTopLeftRadius),
      thumbWidth: parseFloat(thumb.width),
      cardMinHeight: parseFloat(card.minHeight)
    };
  });
  expect(recipeStyle.cardRadius).toBeGreaterThanOrEqual(24);
  expect(recipeStyle.thumbRadius).toBeGreaterThanOrEqual(18);
  expect(recipeStyle.thumbWidth).toBeGreaterThanOrEqual(88);
  expect(recipeStyle.cardMinHeight).toBeGreaterThanOrEqual(108);

  await card.locator('.rcard-main').click();
  await expect(page.locator('.hero-photo.recipe-visual')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
