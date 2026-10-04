import { test, expect } from '@playwright/test';

test.describe('Stage 50 — recipe library', () => {
  test('library contains more than 1200 unique structured recipes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const meta = await page.evaluate(async () => {
      const m = await import('./recipe-library.js?stage50=1');
      const rows = m.recipeLibrary(0);
      const ids = new Set(rows.map((r) => r.id));
      const names = new Set(rows.map((r) => r.name));
      const withIngredients = rows.filter((r) => r.sections?.some((s) => s.ingredients?.length >= 3)).length;
      const withSteps = rows.filter((r) => Array.isArray(r.steps) && r.steps.length >= 4).length;
      const categories = new Set(rows.map((r) => r.category));
      return { count: rows.length, uniqueIds: ids.size, uniqueNames: names.size, withIngredients, withSteps, categories: [...categories] };
    });

    expect(meta.count).toBeGreaterThan(1200);
    expect(meta.uniqueIds).toBe(meta.count);
    expect(meta.uniqueNames).toBe(meta.count);
    expect(meta.withIngredients).toBeGreaterThan(1200);
    expect(meta.withSteps).toBeGreaterThan(1200);
    expect(meta.categories.length).toBeGreaterThanOrEqual(10);

    await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();
    await expect(page.locator('.counter')).toHaveText(/\d{4} receptur/);
  });

  test('recipe search can find a known ingredient across the large library', async ({ page }) => {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');
    const search = page.getByRole('searchbox', { name: 'Szukaj' });
    await search.fill('mozzarella');
    await expect(page.locator('.counter')).toHaveText(/\d+ receptur/);
    const text = await page.locator('.list').first().innerText().catch(() => '');
    expect(text.toLowerCase()).toContain('mozzarella');
  });
});
