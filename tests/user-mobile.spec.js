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
