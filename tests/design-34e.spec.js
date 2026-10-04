import { test, expect } from '@playwright/test';

test.describe('Stage 34E • visual system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();
  });

  test('loads the 34E visual layer and preserves the main shell', async ({ page }) => {
    await expect(page.locator('link[href*="styles-34e.css"]')).toHaveCount(1);
    await expect(page.locator('#tabbar')).toBeVisible();

    const design = await page.locator('body').evaluate((el) => {
      const root = getComputedStyle(document.documentElement);
      const tabbar = document.querySelector('#tabbar');
      const shell = tabbar ? getComputedStyle(tabbar) : null;
      return {
        radius: root.getPropertyValue('--34e-radius').trim(),
        tabRadius: shell?.borderRadius || '',
        blur: shell?.backdropFilter || shell?.webkitBackdropFilter || '',
      };
    });

    expect(design.radius).not.toBe('');
    expect(design.tabRadius).not.toBe('0px');
  });

  test('keeps the primary navigation compact and functional', async ({ page }) => {
    const tabs = page.locator('#tabbar .tab');
    await expect(tabs).toHaveCount(5);

    await page.getByRole('link', { name: 'Receptury' }).click();
    await expect(page.getByText('Receptury', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Więcej' }).click();
    await expect(page.getByRole('button', { name: 'Zakupy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Historia gotowania' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kalkulatory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ustawienia' })).toBeVisible();
  });

  test('has no horizontal page overflow', async ({ page }) => {
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
  });

  test('keeps important iPhone surfaces within the viewport', async ({ page }) => {
    await page.goto('/#/inventory');
    const viewport = page.viewportSize();
    const tabbar = await page.locator('#tabbar').boundingBox();
    const screen = await page.locator('.screen').boundingBox();

    expect(viewport).not.toBeNull();
    expect(screen).not.toBeNull();
    expect(tabbar).not.toBeNull();

    if (viewport && tabbar) {
      expect(tabbar.x).toBeGreaterThanOrEqual(0);
      expect(tabbar.x + tabbar.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
