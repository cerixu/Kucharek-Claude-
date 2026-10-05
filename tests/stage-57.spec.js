import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

test('Stage 57 — semantyczne grafiki receptur i poprawny fallback mediów', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    const { recipeGraphicData } = await import('./components.js');
    const make = (name, category = 'cat-inne', ingredients = []) => ({
      name, category, servings: 1, sections: [{ ingredients }]
    });

    const fixtures = [
      make('Margherita', 'cat-pizza', [{ name: 'mąka' }, { name: 'mozzarella' }]),
      make('Carbonara', 'cat-pasta', [{ name: 'spaghetti' }, { name: 'pecorino' }]),
      make('Ramen Shoyu', 'cat-zupy', [{ name: 'makaron ramen' }, { name: 'bulion' }]),
      make('Butter Chicken', 'cat-mieso', [{ name: 'kurczak' }, { name: 'garam masala' }]),
      make('Cezar', 'cat-salatki', [{ name: 'sałata' }, { name: 'parmezan' }]),
      make('Tiramisu', 'cat-desery', [{ name: 'mascarpone' }, { name: 'kakao' }]),
      make('Negroni', 'cat-cocktaile', [{ name: 'gin' }, { name: 'wermut' }]),
      make('Pesto', 'cat-sosy', [{ name: 'bazylia' }, { name: 'oliwa' }])
    ];

    const decoded = fixtures.map((r) => {
      const src = recipeGraphicData(r);
      return { name: r.name, src, svg: decodeURIComponent(src.split(',')[1]) };
    });

    const heroCocktail = recipeGraphicData(fixtures[6], { hero: true });
    const heroPizza = recipeGraphicData(fixtures[0], { hero: true });

    return {
      titles: decoded.map(x => ({ name: x.name, title: (x.svg.match(/<text[^>]*>([^<]+)/)?.[1] || '') })),
      unique: new Set(decoded.map(x => x.src)).size,
      cocktailIsCocktail: decoded.find(x => x.name === 'Negroni')?.svg.includes('KOKTAJL'),
      pizzaIsPizza: decoded.find(x => x.name === 'Margherita')?.svg.includes('PIZZA'),
      heroDifferent: heroCocktail !== heroPizza
    };
  });

  expect(result.unique).toBe(8);
  expect(result.cocktailIsCocktail).toBe(true);
  expect(result.pizzaIsPizza).toBe(true);
  expect(result.heroDifferent).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);

  await page.goto('/#/recipes');
  await expect(page.locator('#tabbar')).toBeVisible();
  await expect(page.locator('.rcard').first()).toBeVisible();
});
