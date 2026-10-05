import { test, expect } from '@playwright/test';

const ENGLISH_RESIDUE = /\b(?:almonds?|cups?|pounds?|ounces?|tablespoons?|teaspoons?|water|butter|flour|sugar|salt|pepper|chicken|beef|pork|cheese|bread|stock|sauce|dough|with|without|the|and)\b/i;
const QTY_IN_NAME = /^(?:szklank(?:a|i)|łyżk(?:a|i)|łyżeczk(?:a|i)|funt(?:ów|a|y)?|uncj(?:a|e|i)|kub(?:e|ki|ek)|cups?|tablespoons?|teaspoons?|pounds?|ounces?)\b\s+/i;

async function waitForArchive(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 10000 });
  await page.waitForFunction(
    () => window.__kucharek?.state?.recipes?.size >= 1700,
    null,
    { timeout: 30000 }
  );
}

test.describe('Stage 59: biblioteka receptur', () => {
  test('ładuje pełny korpus 1700+ receptur', async ({ page }) => {
    await waitForArchive(page);
    const result = await page.evaluate(async () => {
      const { listRecipes } = await import('/recipes.js');
      const archive = listRecipes().filter((r) => String(r.id).startsWith('rcp_archive_'));
      return {
        total: listRecipes().length,
        archive: archive.length,
        translationVersions: [...new Set(archive.map((r) => r.translationVersion))]
      };
    });

    expect(result.archive).toBe(1700);
    expect(result.total).toBeGreaterThanOrEqual(1700);
    expect(result.translationVersions).toEqual([34]);
  });

  test('archiwum nie zawiera angielskich resztek ani ilości w nazwach składników', async ({ page }) => {
    await waitForArchive(page);
    const bad = await page.evaluate(() => {
      const { listRecipes } = window.__kucharek.state
        ? { listRecipes: () => [...window.__kucharek.state.recipes.values()] }
        : {};
      const recipes = listRecipes().filter((r) => String(r.id).startsWith('rcp_archive_'));
      const rows = [];
      for (const r of recipes) {
        if (/\b(?:almonds?|cups?|pounds?|ounces?|tablespoons?|teaspoons?|water|butter|flour|sugar|salt|pepper|chicken|beef|pork|cheese|bread|stock|sauce|dough|with|without|the|and)\b/i.test(r.name || '')) {
          rows.push({ type: 'name', value: r.name });
        }
        for (const s of r.sections || []) for (const i of s.ingredients || []) {
          if (/\b(?:almonds?|cups?|pounds?|ounces?|tablespoons?|teaspoons?|water|butter|flour|sugar|salt|pepper|chicken|beef|pork|cheese|bread|stock|sauce|dough|with|without|the|and)\b/i.test(i.name || '')) {
            rows.push({ type: 'ingredient', value: i.name });
          }
          if (/^(?:szklank(?:a|i)|łyżk(?:a|i)|łyżeczk(?:a|i)|funt(?:ów|a|y)?|uncj(?:a|e|i)|kub(?:e|ki|ek)|cups?|tablespoons?|teaspoons?|pounds?|ounces?)\b\s+/i.test(i.name || '')) {
            rows.push({ type: 'quantity-in-name', value: i.name });
          }
        }
      }
      return rows.slice(0, 20);
    });

    expect(bad).toEqual([]);
  });

  test('naprawiony przypadek 15 gramów herbaty zachowuje ilość jako ilość', async ({ page }) => {
    await waitForArchive(page);
    const result = await page.evaluate(() => {
      const recipes = [...window.__kucharek.state.recipes.values()];
      for (const r of recipes) {
        for (const s of r.sections || []) {
          for (const i of s.ingredients || []) {
            if (String(i.raw || '').toLowerCase().includes('finest quality, 15 grams')) {
              return { recipe: r.name, name: i.name, amount: i.amount, unit: i.unit };
            }
          }
        }
      }
      return null;
    });

    expect(result).not.toBeNull();
    expect(result.name).toMatch(/herbat/i);
    expect(result.amount).toBe(15);
    expect(result.unit).toBe('g');
  });
});
