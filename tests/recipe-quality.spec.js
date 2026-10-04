import { test, expect } from '@playwright/test';

test.describe('Stage 34D: standard i walidacja bazy receptur', () => {
  test('aktualna biblioteka przechodzi walidację jakości', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const report = await page.evaluate(async () => {
      const { listRecipes, validateRecipeLibrary } = await import('/recipes.js');
      return validateRecipeLibrary(listRecipes());
    });
    expect(report.total).toBeGreaterThanOrEqual(13);
    expect(report.invalid).toBe(0);
  });

  test('walidator wykrywa braki wymagane przez standard', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate(async () => {
      const { validateRecipe, blankRecipe } = await import('/recipes.js');
      const r = blankRecipe({ id: 'bad', name: '', servings: 0, traditional: true, origin: '' });
      r.sections = [{ id: 's1', name: 'S', ingredients: [{ id: 'i1', name: '', amount: -2, unit: '' }] }];
      r.steps = [];
      return validateRecipe(r, { strict: true }).map((x) => x.code);
    });
    expect(result).toEqual(expect.arrayContaining([
      'recipe.name', 'recipe.servings', 'ingredient.name', 'ingredient.amount',
      'ingredient.unit', 'recipe.steps', 'recipe.traditional.origin', 'recipe.traditional.source'
    ]));
  });

  test('walidator wykrywa duplikat identyfikatora', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate(async () => {
      const { validateRecipeLibrary, blankRecipe } = await import('/recipes.js');
      const a = blankRecipe({ id: 'dup', name: 'A', sections: [{ id: 's', name: '', ingredients: [{ id: 'i', name: 'Mąka', amount: 100, unit: 'g' }] }], steps: [{ id: 't', text: 'OK' }] });
      const b = { ...a, name: 'B' };
      return validateRecipeLibrary([a, b]).reports.flatMap((x) => x.errors.map((e) => e.code));
    });
    expect(result).toContain('recipe.duplicate-id');
  });

  test('Ustawienia pokazują aktualną wersję aplikacji', async ({ page }) => {
    await page.goto('/#/settings');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByText('Wersja aplikacji', { exact: true })).toBeVisible();
    await expect(page.getByText('1.3.39', { exact: true })).toBeVisible();
  });
});
