import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Test użytkownika: iPhone', () => {

  test('start → receptury → historia → powrót działa jak użytkownik', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Receptury', exact: true }).click();
    await expect(page).toHaveURL(/#\/recipes$/);
    await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();

    await page.getByRole('button', { name: 'Historia gotowania' }).click();
    await expect(page).toHaveURL(/#\/history$/);
    await expect(page.getByRole('heading', { name: 'Historia gotowania' })).toBeVisible();

    await page.getByRole('link', { name: 'Receptury' }).click();
    await expect(page).toHaveURL(/#\/recipes$/);
  });

  test('dolna nawigacja nie znika na ekranie mobilnym', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const tabs = page.locator('#tabbar');
    await expect(tabs).toBeVisible();

    const box = await tabs.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 2);
  });

  test('wyszukiwarka zachowuje fokus podczas pisania', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const input = page.locator('input.search-input');
    await input.fill('pizza');
    await expect(input).toHaveValue('pizza');
    await expect(input).toBeFocused();
  });
});


test.describe('Stage 34A: nowy UX iPhone', () => {
  test('Start ma nową hierarchię i główne akcje', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await expect(page.locator('.start-hero-card')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zacznij gotować' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Przepisy' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Magazyn/ }).first()).toBeVisible();
    await expect(page.locator('.tiles')).toHaveCount(0);
  });

  test('dolny dock ma pięć głównych miejsc i Więcej', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const labels = await page.locator('#tabbar .tab-label').allTextContents();
    expect(labels).toEqual(['Start', 'Receptury', 'Gotuję', 'Magazyn', 'Więcej']);

    await page.getByRole('button', { name: 'Więcej' }).click();
    await expect(page.getByRole('heading', { name: 'Więcej' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zakupy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kalkulatory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ustawienia' })).toBeVisible();
  });

  test('zakładka Gotuję prowadzi do prostego wyboru receptury', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await page.getByRole('link', { name: 'Gotuję' }).click();
    await expect(page).toHaveURL(/#\/cook$/);
    await expect(page.getByRole('heading', { name: 'Gotuję' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wybierz recepturę' })).toBeVisible();
  });

  test('główne widoki nie powodują poziomego overflow', async ({ page }) => {
    for (const path of ['/', '/recipes', '/cook', '/inventory']) {
      await page.goto('/#' + path);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
