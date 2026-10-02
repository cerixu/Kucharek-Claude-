import { test, expect } from '@playwright/test';

const DB_NAME = 'kucharzyna-claude-db';

async function reset(page) {
  await page.goto('about:blank');
  await page.evaluate(async (name) => {
    await new Promise((resolve) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = resolve; });
  }, DB_NAME);
  await page.goto('/');
}

test('EAN: normalizacja i dopasowanie wskazuje istniejący produkt', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async (name) => {
    const { saveInventoryItem, findInventoryByEAN, normalizeEAN, validEAN } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Mozzarella EAN', quantity:2, unit:'kg', ean:'5901234123457' });
    return {
      id: item.id,
      normalized: normalizeEAN('590 123 412 3457'),
      valid: validEAN('5901234123457'),
      found: findInventoryByEAN('590-123-412-3457')?.id,
    };
  }, DB_NAME);
  expect(result.normalized).toBe('5901234123457');
  expect(result.valid).toBe(true);
  expect(result.found).toBe(result.id);
});

test('EAN: niepoprawny kod nie zostaje zaakceptowany przez formularz Magazynu', async ({ page }) => {
  await reset(page);
  await page.goto('/#/inventory');
  await page.getByRole('button', { name:'Dodaj produkt' }).first().click();
  await page.getByLabel('Nazwa produktu').fill('EAN invalid E2E');
  await page.getByLabel('Kod EAN').fill('1234567890123');
  await page.getByRole('button', { name:'Zapisz' }).click();
  await expect(page.getByText('Nieprawidłowy kod EAN.')).toBeVisible();
});

test('Aliasy: receptura dopasowuje produkt magazynowy po nazwie alternatywnej', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, findInventoryMatch } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Mozzarella Fior di Latte', aliases:['mozzarella','fior di latte'], quantity:1500, unit:'g', purchasePrice:24, priceUnit:'kg' });
    const match = findInventoryMatch({ name:'Mozzarella' });
    return { id:item.id, found:match?.item.id, source:match?.source };
  });
  expect(result.found).toBe(result.id);
  expect(result.source).toBe('name');
});

test('EAN ma pierwszeństwo przed nazwą przy dopasowaniu Food Cost', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, findInventoryMatch } = await import('/inventory.js');
    const byName = await saveInventoryItem({ name:'Mąka premium', quantity:10, unit:'kg', purchasePrice:10, priceUnit:'kg' });
    const byEAN = await saveInventoryItem({ name:'Mąka 00', quantity:10, unit:'kg', ean:'5901234123457', purchasePrice:14, priceUnit:'kg' });
    const match = findInventoryMatch({ name:'Mąka premium', ean:'5901234123457' });
    return { byName:byName.id, byEAN:byEAN.id, found:match.item.id, source:match.source };
  });
  expect(result.found).toBe(result.byEAN);
  expect(result.source).toBe('ean');
});

test('Zużycie receptury korzysta z aliasu produktu w Magazynie', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, consumeRecipeIngredients, findInventoryByName } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Pomodoro Pelati', aliases:['pomidory san marzano'], quantity:1000, unit:'g' });
    const recipe = { id:'ean-alias-recipe', name:'Sos', sections:[{ ingredients:[{ name:'Pomidory San Marzano', amount:300, unit:'g' }] }] };
    const out = await consumeRecipeIngredients(recipe);
    return { id:item.id, quantity:findInventoryByName('Pomodoro Pelati').quantity, changes:out.changes.length, shortages:out.shortages.length };
  });
  expect(result.changes).toBe(1);
  expect(result.quantity).toBe(700);
  expect(result.shortages).toBe(0);
});
