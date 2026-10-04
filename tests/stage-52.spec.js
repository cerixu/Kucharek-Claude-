import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

test.describe('Stage 52 — recipe quality gate', () => {
  test('recipe detail keeps one-portion reading order and polished mobile layout', async ({ page }) => {
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharek?.ready === true);

    await expect(page.locator('.screen.detail')).toBeVisible();
    await expect(page.locator('.hero-photo.recipe-visual')).toBeVisible();
    await expect(page.locator('.detail-head')).toBeVisible();
    await expect(page.locator('.facts .fact').first()).toContainText('1 porcja');
    await expect(page.locator('.ingredients .ing').first()).toBeVisible();
    await expect(page.locator('.ingredients .ingredient-icon').first()).toBeVisible();
    await expect(page.locator('.ingredients .ing-qty .amt').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Przygotowanie' })).toBeVisible();
    await expect(page.locator('ol.steps > li').first()).toBeVisible();

    const columns = await page.locator('.actions-row').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    expect(columns.trim().split(/\s+/).length).toBe(2);

    const rows = await page.locator('.ingredients .ing').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('recipe stays readable at narrow iPhone width without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharek?.ready === true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await expect(page.locator('.screen.detail')).toBeVisible();
    await expect(page.locator('.ingredients')).toBeVisible();
  });
});
