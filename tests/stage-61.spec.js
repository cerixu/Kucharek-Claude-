import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(90000);

test('Stage 61 — full Polish archive normalization', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });

  const data = await page.evaluate(async () => {
    const { recipeLibrary } = await import('./recipe-library.js?v=20261005-61-1.5.1');
    const rows = recipeLibrary(0);
    const visibleText = (r) => [
      r.name, r.description, r.notes, ...(r.tags || []),
      ...(r.sections || []).map(s => s.name),
      ...(r.sections || []).flatMap(s => (s.ingredients || []).flatMap(i => [i.name, i.unit])),
      ...(r.steps || []).map(s => s.text)
    ].join(' ');

    const english = /\b(english|beef|cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|pound|pounds|ounce|ounces|flour|sugar|water|butter|salt|pepper|onion|garlic|tomato|potato|milk|cream|cheese|egg|chicken|rice|bread|cake|sauce|broth)\b/i;
    const badUnits = /^(oz|lb|ounce|ounces|pound|pounds|cup|cups|tbsp|tsp|quart|quarts|pint|pints|gallon|gallons|inch|inches)$/i;
    const englishHits = rows.filter(r => english.test(visibleText(r))).map(r => ({ id:r.id, name:r.name, text:visibleText(r).match(english)?.[0] }));
    const badTagRows = rows.filter(r => (r.tags || []).some(t => /^(italy|spain|france|germany|japan|china|india|korea|thailand|vietnam|poland|public-domain|archive|cucina-italiana|cocina-espanola|cuisine-francaise|japanese-kitchen|chinese-kitchen|indian-kitchen|german-kitchen|ceska-kuchyne)$/i.test(String(t))));
    const badUnitRows = rows.flatMap(r => (r.sections || []).flatMap(s => (s.ingredients || []).filter(i => badUnits.test(String(i.unit || ''))).map(i => ({ id:r.id, recipe:r.name, ingredient:i.name, amount:i.amount, unit:i.unit }))));
    return {
      count: rows.length,
      englishHits: englishHits.slice(0, 30),
      englishHitCount: englishHits.length,
      badUnitCount: badUnitRows.length,
      badTagCount: badTagRows.length,
      badUnits: badUnitRows.slice(0, 20),
      fixedNames: rows.filter(r => ['Muffiny angielskie','Ketchup','Napój jajeczny','Klarowny bulion po książęcemu','Homary po newburgsku','Czekolada po wiedeńsku'].includes(r.name)).map(r => r.name)
    };
  });

  expect(data.count).toBe(1700);
  expect(data.badUnitCount).toBe(0);
  expect(data.badTagCount).toBe(0);
  expect(data.englishHitCount).toBe(0);
  expect(data.fixedNames).toEqual(expect.arrayContaining([
    'Muffiny angielskie',
    'Ketchup',
    'Napój jajeczny',
    'Klarowny bulion po książęcemu',
    'Homary po newburgsku',
    'Czekolada po wiedeńsku'
  ]));
  expect(errors, errors.join('\n')).toEqual([]);
});
