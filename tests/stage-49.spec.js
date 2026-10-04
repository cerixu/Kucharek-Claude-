import { test, expect } from '@playwright/test';

test.describe('Stage 49 · ingredient icon coverage', () => {
  test('known culinary ingredients map to dedicated icons', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true, { timeout: 30000 });

    const result = await page.evaluate(async () => {
      const mod = await import('./components.js');
      const cases = [
        ['Koper', 'dill'],
        ['Koperek świeży', 'dill'],
        ['Musztarda Dijon', 'mustard'],
        ['Jogurt naturalny', 'yogurt'],
        ['Kefir', 'yogurt'],
        ['Tahini', 'tahini'],
        ['Pasta sezamowa', 'tahini'],
        ['Pecorino Romano', 'cheese'],
        ['Seler naciowy', 'celery_stalk'],
      ];
      return cases.map(([name, expected]) => {
        const el = mod.ingredientIcon({ name });
        return {
          name,
          expectedClass: el.classList.contains('ingredient-icon-' + expected),
          hasSvg: !!el.querySelector('svg'),
          hasPath: !!el.querySelector('path')?.getAttribute('d'),
        };
      });
    });

    for (const item of result) {
      expect(item.expectedClass, item.name).toBeTruthy();
      expect(item.hasSvg, item.name).toBeTruthy();
      expect(item.hasPath, item.name).toBeTruthy();
    }
  });

  test('unknown ingredients receive safe category fallbacks', async ({ page }) => {
    await page.goto('/#inventory');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true, { timeout: 30000 });

    const result = await page.evaluate(async () => {
      const mod = await import('./components.js');
      const cases = [
        [{ name: 'Nowy składnik testowy' }, 'ingredient-icon-generic'],
        [{ name: 'Nowa rzecz z warzyw', category: 'Warzywa' }, 'ingredient-icon-vegetable'],
        [{ name: 'Nowy produkt mleczny', category: 'Nabiał' }, 'ingredient-icon-milk'],
        [{ name: 'Nowy produkt piekarniczy', category: 'Bakery' }, 'ingredient-icon-flour'],
      ];
      return cases.map(([ing, expected]) => ({
        expected,
        actual: mod.ingredientIcon(ing).className,
        svg: !!mod.ingredientIcon(ing).querySelector('svg'),
        path: !!mod.ingredientIcon(ing).querySelector('path')?.getAttribute('d'),
      }));
    });

    for (const item of result) {
      expect(item.actual).toContain(item.expected);
      expect(item.svg).toBeTruthy();
      expect(item.path).toBeTruthy();
    }
  });

  test('dill matcher is clean and contains no control-character typo', async ({ page }) => {
    await page.goto('/');
    const source = await page.evaluate(() => fetch('./components.js').then(r => r.text()));
    expect(source).toContain('/koperek|koper|dill/');
    expect(source).not.toContain('koper\b');
  });
});
