import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(90000);

async function ready(page) {
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await page.waitForSelector('#tabbar .tab');
}

test('Stage 62 — iPhone visual system and click-through', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await ready(page);

  const shell = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const dock = document.querySelector('#tabbar');
    const activeIcon = document.querySelector('#tabbar .tab.on .tab-ico');
    const d = dock ? getComputedStyle(dock) : null;
    const a = activeIcon ? getComputedStyle(activeIcon) : null;
    return {
      bg: root.getPropertyValue('--k-bg').trim(),
      dockRadius: d?.borderRadius || '',
      dockBackdrop: d?.backdropFilter || d?.webkitBackdropFilter || '',
      activeIconBg: a?.backgroundImage || a?.backgroundColor || '',
      tabCount: document.querySelectorAll('#tabbar .tab').length
    };
  });

  expect(shell.bg).toBe('#070809');
  expect(shell.tabCount).toBe(5);
  expect(Number.parseFloat(shell.dockRadius)).toBeGreaterThanOrEqual(25);
  expect(shell.dockBackdrop).toMatch(/blur/i);
  expect(shell.activeIconBg).toMatch(/rgb|gradient|linear/i);

  await page.screenshot({ path: 'test-results/stage-62-start.png', fullPage: false });

  await page.getByRole('link', { name: 'Receptury' }).click();
  await expect(page).toHaveURL(/#\/recipes/);
  await expect(page.locator('.rcard').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/stage-62-recipes.png', fullPage: false });

  await page.locator('.rcard').first().click();
  await expect(page).toHaveURL(/#\/recipe\//);
  await expect(page.locator('.hero-photo, .recipe-visual').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/stage-62-detail.png', fullPage: false });

  const cookLink = page.getByRole('button', { name: /Gotuj|Zacznij gotować/i }).first();
  if (await cookLink.count()) await cookLink.click();
  else await page.locator('#tabbar .tab[data-tab="cook"]').click();
  await expect(page).toHaveURL(/#\/cook/);
  await page.screenshot({ path: 'test-results/stage-62-cook.png', fullPage: false });

  await page.locator('#tabbar .tab[data-tab="inventory"]').click();
  await expect(page).toHaveURL(/#\/inventory/);
  await page.screenshot({ path: 'test-results/stage-62-inventory.png', fullPage: false });

  await page.locator('#tabbar .tab[data-tab="more"]').click();
  await expect(page.getByRole('heading', { name: 'Więcej' })).toBeVisible();
  await page.screenshot({ path: 'test-results/stage-62-more.png', fullPage: false });

  expect(errors, errors.join('\n')).toEqual([]);
});
