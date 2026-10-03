import { test, expect } from '@playwright/test';

test.describe('Historia gotowania', () => {
  test('ma szybki dostęp z Receptur i pokazuje zapisane gotowanie', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const fixture = await page.evaluate(async () => {
      const { db } = await import('/db.js');
      const { loadAll, blankRecipe } = await import('/recipes.js');
      const { recordCook } = await import('/history.js');

      const recipeId = 'e2e_history_recipe';
      const eventId = 'e2e_history_event';
      const recipe = blankRecipe({
        id: recipeId,
        name: 'E2E Historia Pizza',
        image: '',
        photo: '',
        thumb: '',
        sections: [{ id: 'sec-e2e-history', name: '', ingredients: [] }],
        steps: [],
      });

      await db.delete('cookHistory', eventId);
      await db.delete('recipes', recipeId);
      await db.put('recipes', recipe);
      await loadAll();

      await recordCook({
        id: eventId,
        recipeId,
        recipeName: recipe.name,
        at: 1730000000000,
        factor: 2,
        servings: 2,
        inventoryConsumed: true,
      });

      // Ten sam identyfikator aktualizuje wpis, nie tworzy duplikatu.
      await recordCook({
        id: eventId,
        recipeId,
        recipeName: recipe.name,
        at: 1730000001000,
        factor: 2,
        servings: 2,
        inventoryConsumed: true,
      });

      return { recipeId, eventId };
    });

    await page.goto('/#/recipes');
    await expect(page.getByRole('button', { name: 'Historia gotowania' })).toBeVisible();
    await page.getByRole('button', { name: 'Historia gotowania' }).click();

    await expect(page).toHaveURL(/#\/history$/);
    await expect(page.getByRole('heading', { name: 'Historia gotowania' })).toBeVisible();
    await expect(page.getByText('E2E Historia Pizza', { exact: true })).toBeVisible();
    await expect(page.getByText('×2')).toBeVisible();
    await expect(page.getByText('2 porcje')).toBeVisible();
    await expect(page.getByText('Magazyn ✓')).toBeVisible();
    await expect(page.locator('.history-card')).toHaveCount(1);

    await page.getByRole('button', { name: /E2E Historia Pizza/ }).click();
    await expect(page).toHaveURL(/#\/recipe\/e2e_history_recipe$/);

    await page.evaluate(async ({ recipeId, eventId }) => {
      const { db } = await import('/db.js');
      await db.delete('cookHistory', eventId);
      await db.delete('recipes', recipeId);
    }, fixture);
  });

  test('pusta historia ma bezpieczny stan pusty', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await page.evaluate(async () => {
      const { db } = await import('/db.js');
      await db.clear('cookHistory');
    });

    await page.goto('/#/history');
    await expect(page.getByRole('heading', { name: 'Historia gotowania' })).toBeVisible();
    await expect(page.getByText('Historia jest pusta', { exact: true })).toBeVisible();
  });
});
