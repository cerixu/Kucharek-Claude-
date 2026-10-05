import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(60000);

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

async function waitReady(page) {
  await page.goto('/#/recipes');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await page.waitForFunction(
    () => [...window.__kucharek.state.recipes.values()]
      .filter(r => String(r.id).startsWith('rcp_archive_')).length === 1700,
    null,
    { timeout: 90000 }
  );
}

test('Stage 56 — inteligentne łączenie składników, kroków i Magazynu', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await waitReady(page);

  const intelligence = await page.evaluate(async () => {
    const { nameStems, ingredientsInText, pantrySummary } = await import('./kitchen.js?v=20261005-63-1.3.96');
    const recipe = {
      sections: [{ ingredients: [
        { id: 'a', name: 'Mąka pszenna', amount: 500, unit: 'g' },
        { id: 'b', name: 'Czosnek', amount: 2, unit: 'szt.' },
        { id: 'c', name: 'Oliwa z oliwek', amount: 20, unit: 'ml' }
      ]}],
      steps: []
    };
    const mentioned = ingredientsInText('Dodać mąki i posiekany czosnek, a następnie podlać oliwą.', recipe.sections[0].ingredients);
    const pantry = pantrySummary(recipe, ['Mąkę pszenną', 'czosnkiem']);
    return {
      stems: nameStems('Mąki pszennej'),
      mentioned: mentioned.map(x => x.name),
      have: pantry.have.map(x => x.name),
      missing: pantry.missing.map(x => x.name),
      percent: pantry.percent
    };
  });

  expect(intelligence.stems.length).toBeGreaterThan(0);
  expect(intelligence.mentioned).toEqual(expect.arrayContaining(['Mąka pszenna', 'Czosnek', 'Oliwa z oliwek']));
  expect(intelligence.have).toEqual(expect.arrayContaining(['Mąka pszenna', 'Czosnek']));
  expect(intelligence.missing).toEqual(['Oliwa z oliwek']);
  expect(intelligence.percent).toBe(67);

  await page.goto('/#/cook/' + BIGOS_ID);
  await page.getByRole('button', { name: 'Przelicz', exact: true }).waitFor();
  await page.locator('.cook-tabs .ctab', { hasText: 'Kroki' }).click();
  await expect(page.locator('.step-ingredients')).toHaveCount(1);

  await page.goto('/#/recipe/' + BIGOS_ID);
  await expect(page.locator('.pantry-card')).toBeVisible();
  await expect(page.locator('.pantry-card')).toContainText('Magazyn');

  expect(errors, errors.join('\n')).toEqual([]);
});
