import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

test.describe('Stage 51 — recipe UX', () => {
  test('recipe library is paginated and recipe opens at one portion', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();

    const counter = await page.locator('.counter').textContent();
    expect(counter).toMatch(/^1700 receptur$/);
    expect(await page.locator('.rcard').count()).toBeLessThanOrEqual(40);

    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.locator('.screen.detail')).toBeVisible();
    await expect(page.locator('.facts .fact').first()).toContainText('1 porcja');
    await expect(page.locator('.ingredients')).toBeVisible();
    expect(await page.locator('.ingredients .ing').count()).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Przygotowanie' })).toBeVisible();
  });

  test('recipe scaling changes the visible quantities without saving', async ({ page }) => {
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await page.getByRole('button', { name: 'Przelicz' }).click();
    const dialog = page.getByRole('dialog', { name: 'Przelicz' });
    await expect(dialog).toBeVisible();

    const servings = dialog.getByRole('spinbutton', { name: 'Liczba porcji' });
    await servings.fill('2');
    await dialog.getByRole('button', { name: 'Przelicz' }).click();

    await expect(page.locator('.scale-banner')).toContainText('Przeliczone: 2 porcje');
    await expect(page.getByRole('button', { name: 'Zapisz jako nową' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zapisz w tej' })).toBeVisible();
  });

  test('recipe search indexes ingredients from the real corpus', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const search = page.getByRole('searchbox', { name: 'Szukaj' });
    await search.fill('frog legs');
    await page.waitForTimeout(300);

    const cards = page.locator('.rcard');
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(cards.first()).toContainText('Frog Legs');
  });
});
