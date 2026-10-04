import { test, expect } from '@playwright/test';

test.describe('Stage 36: biblioteka receptur', () => {
  test('ładowane jest 1200+ receptur jako normalne rekordy', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate(() => ({
      count: window.__kucharzyna.state.recipes.size,
      libraryCount: [...window.__kucharzyna.state.recipes.values()].filter(r => String(r.id).startsWith('rcp_lib_')).length
    }));
    expect(result.count).toBeGreaterThanOrEqual(1200);
    expect(result.libraryCount).toBe(1200);
  });

  test('biblioteka jest przeszukiwalna i ma poprawne rekordy', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate(() => {
      const rows = [...window.__kucharzyna.state.recipes.values()];
      const r = rows.find(x => x.id === 'rcp_lib_0001');
      return { name: r?.name, ingredients: r?.sections?.[0]?.ingredients?.length, steps: r?.steps?.length, origin: r?.origin };
    });
    expect(result.name).toContain('Pizza Margherita');
    expect(result.ingredients).toBeGreaterThanOrEqual(5);
    expect(result.steps).toBeGreaterThanOrEqual(3);
    expect(result.origin).toBe('IT');
  });

  test('szczegóły receptury domyślnie skalują widok do 1 porcji', async ({ page }) => {
    await page.goto('/#/recipe/rcp_seed_pizza');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByText('1 porcja', { exact: true })).toBeVisible();
  });
});
