import { test, expect } from '@playwright/test';

const DB_NAME = 'kucharzyna-claude-db';

test.describe.configure({ mode: 'serial' });

async function resetDb(page) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (name) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onblocked = req.onerror = () => resolve();
    });
  }, DB_NAME);
}

async function openV1(page) {
  await page.evaluate(async (name) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [store, keyPath] of [
          ['recipes', 'id'],
          ['ingredients', 'id'],
          ['categories', 'id'],
          ['shoppingItems', 'id'],
          ['settings', 'key'],
          ['history', 'id'],
        ]) db.createObjectStore(store, { keyPath });
        req.transaction.objectStore('history').createIndex('recipeId', 'recipeId');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['recipes', 'settings'], 'readwrite');
        tx.objectStore('recipes').put({
          id: 'migration-test-recipe',
          name: 'Receptura migracyjna',
          sections: [],
          steps: [],
          tags: [],
          servings: 1,
        });
        tx.objectStore('settings').put({
          key: 'cook:migration-test-recipe',
          value: { ing: { oldIngredient: true }, steps: {}, factor: 2, tab: 'ing', ts: 1.2 }
        });
        tx.objectStore('settings').put({
          key: 'draft:migration-test-recipe',
          value: {
            savedAt: Date.now(),
            recipe: { id: 'migration-test-recipe', name: 'Szkic migracyjny', sections: [], steps: [] }
          }
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, DB_NAME);
}

async function readDb(page) {
  return page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const read = (store, key) => new Promise((resolve, reject) => {
      const req = db.transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return {
      version: db.version,
      stores: [...db.objectStoreNames].sort(),
      recipe: await read('recipes', 'migration-test-recipe'),
      cook: await read('cookSessions', 'migration-test-recipe'),
      draft: await read('drafts', 'migration-test-recipe'),
      legacyCook: await read('settings', 'cook:migration-test-recipe'),
      legacyDraft: await read('settings', 'draft:migration-test-recipe'),
    };
  }, DB_NAME);
}

test('migracja IndexedDB v1 → v2 zachowuje dane i rozdziela stores', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
  await page.goto('about:blank');
  await resetDb(page);
  await openV1(page);
  await page.goto('/');
  await page.waitForTimeout(1000);
  if (!await page.evaluate(() => window.__kucharzyna?.ready === true)) {
    const view = await page.locator('#view').innerText().catch(() => '');
    throw new Error(`App boot nie zakończył się. pageerror: ${pageErrors.join(' | ')} | view: ${view}`);
  }

  const db = await readDb(page);

  expect(db.version).toBe(2);
  expect(db.stores).toEqual(expect.arrayContaining([
    'recipes',
    'ingredients',
    'categories',
    'shoppingItems',
    'settings',
    'history',
    'cookSessions',
    'drafts',
    'inventory',
    'inventoryLog',
  ]));

  expect(db.recipe.name).toBe('Receptura migracyjna');
  expect(db.cook.recipeId).toBe('migration-test-recipe');
  expect(db.cook.factor).toBe(2);
  expect(db.draft.id).toBe('migration-test-recipe');
  expect(db.draft.recipe.name).toBe('Szkic migracyjny');

  expect(db.legacyCook).toBeTruthy();
  expect(db.legacyDraft).toBeTruthy();
});

test('v2 stores są zapisywalne', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['inventory', 'inventoryLog', 'drafts', 'cookSessions'], 'readwrite');
      tx.objectStore('inventory').put({
        id: 'test-flour',
        name: 'Mąka testowa',
        quantity: 10,
        unit: 'kg',
        minimum: 2,
        lowStock: true,
        ean: '5901234567890',
        updatedAt: Date.now(),
      });
      tx.objectStore('inventoryLog').put({
        id: 'log-test',
        ingredientId: 'test-flour',
        type: 'correction',
        delta: -1,
        at: Date.now(),
      });
      tx.objectStore('drafts').put({
        id: 'new',
        recipeId: null,
        savedAt: Date.now(),
        recipe: { name: 'Nowy szkic testowy' },
      });
      tx.objectStore('cookSessions').put({
        recipeId: 'cook-test',
        factor: 1,
        updatedAt: Date.now(),
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, DB_NAME);

  const result = await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const read = (store, key) => new Promise((resolve, reject) => {
      const req = db.transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return {
      inventory: await read('inventory', 'test-flour'),
      log: await read('inventoryLog', 'log-test'),
      draft: await read('drafts', 'new'),
      cook: await read('cookSessions', 'cook-test'),
    };
  }, DB_NAME);

  expect(result.inventory.ean).toBe('5901234567890');
  expect(result.log.type).toBe('correction');
  expect(result.draft.recipe.name).toBe('Nowy szkic testowy');
  expect(result.cook.recipeId).toBe('cook-test');
});


test('Magazyn: dodanie produktu, próg minimum i trwałość danych', async ({ page }) => {
  await page.goto('/#/inventory');
  await expect(page.getByRole('heading', { name: 'Magazyn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj produkt' }).first().click();
  await expect(page.getByText('Nowy produkt')).toBeVisible();
  await page.getByLabel('Nazwa produktu').fill('Mozzarella E2E');
  await page.getByLabel('Ilość').fill('2');
  await page.getByLabel('Alert poniżej tej ilości').fill('3');
  await page.getByLabel('Cena').fill('24');
  await page.getByLabel('Kod EAN').fill('5900000000001');
  await page.getByLabel('Kategoria').fill('Nabiał');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Mozzarella E2E')).toBeVisible();
  await expect(page.getByText('MAŁO')).toBeVisible();
  await page.reload();
  await page.goto('/#/inventory');
  await expect(page.getByText('Mozzarella E2E')).toBeVisible();
  await expect(page.getByText('MAŁO')).toBeVisible();
  await expect(page.getByText(/2 g/)).toBeVisible();
  await expect(page.getByText(/min\. 3 g/)).toBeVisible();
  await expect(page.getByText(/EAN 5900000000001/)).toBeVisible();
});


test('Gotuję: zakończenie receptury odejmuje składniki z Magazynu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('inventory', 'readwrite');
    const now = Date.now();
    [
      ['Pomidory San Marzano (pelati)', 1000, 'g'],
      ['Oliwa extra vergine', 100, 'ml'],
      ['Czosnek (ząbki)', 5, 'szt'],
      ['Sól', 20, 'g'],
      ['Bazylia (świeże liście)', 20, 'szt'],
    ].forEach(([name, quantity, unit], i) => tx.objectStore('inventory').put({
      id: 'e2e-stock-' + i, name, quantity, unit, minQuantity: 0,
      purchasePrice: null, priceUnit: 'kg', ean: '', category: '', createdAt: now, updatedAt: now,
    }));
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }, DB_NAME);

  await page.goto('/#/cook/rcp_seed_sos');
  await expect(page.getByText('Sos pomidorowy')).toBeVisible();
  const ingredientBoxes = page.getByRole('checkbox');
  await expect(ingredientBoxes).toHaveCount(5);
  for (let i = 0; i < 5; i++) await ingredientBoxes.nth(i).click();
  await page.getByRole('button', { name: 'Kroki', exact: true }).click();
  const stepBoxes = page.getByRole('checkbox');
  await expect(stepBoxes).toHaveCount(4);
  for (let i = 0; i < 4; i++) await stepBoxes.nth(i).click();
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await expect(page.getByText('Odjąć składniki z magazynu?')).toBeVisible();
  await page.getByRole('button', { name: 'Odjąć' }).click();
  await expect(page.getByText('Magazyn zaktualizowany')).toBeVisible();

  const stock = await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const read = (id) => new Promise((resolve, reject) => {
      const req = db.transaction('inventory').objectStore('inventory').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const out = await Promise.all(['e2e-stock-0', 'e2e-stock-1', 'e2e-stock-2', 'e2e-stock-3', 'e2e-stock-4'].map(read));
    db.close();
    return out;
  }, DB_NAME);

  expect(stock[0].quantity).toBe(200);
  expect(stock[1].quantity).toBe(60);
  expect(stock[2].quantity).toBe(3);
  expect(stock[3].quantity).toBe(12);
  expect(stock[4].quantity).toBe(10);
});


test('Magazyn: powtarzające się składniki są sumowane bez podwójnego odejmowania', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('inventory', 'readwrite');
    tx.objectStore('inventory').put({
      id: 'e2e-dup-flour', name: 'Mąka duplikat E2E', quantity: 1, unit: 'kg',
      minQuantity: 0, purchasePrice: null, priceUnit: 'kg', ean: '', category: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
    const mod = await import('/inventory.js');
    const recipe = {
      id: 'e2e-dup-recipe',
      name: 'Test duplikatów',
      sections: [{ name: '', ingredients: [
        { id: 'a', name: 'Mąka duplikat E2E', amount: 400, unit: 'g' },
        { id: 'b', name: 'Mąka duplikat E2E', amount: 300, unit: 'g' },
      ] }],
    };
    const consumed = await mod.consumeRecipeIngredients(recipe, 1);
    return { quantity: mod.listInventory().find((x) => x.id === 'e2e-dup-flour').quantity, shortages: consumed.shortages };
  }, DB_NAME);
  expect(result.quantity).toBeCloseTo(0.3, 10);
  expect(result.shortages).toHaveLength(0);
});

test('Gotuję: brakujące składniki trafiają do Zakupów', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['inventory', 'shoppingItems', 'cookSessions'], 'readwrite');
      tx.objectStore('inventory').clear();
      tx.objectStore('shoppingItems').clear();
      tx.objectStore('cookSessions').delete('rcp_seed_sos');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, DB_NAME);

  await page.goto('/#/cook/rcp_seed_sos');
  const ingredientBoxes = page.getByRole('checkbox');
  await expect(ingredientBoxes).toHaveCount(5);
  for (let i = 0; i < 5; i++) await ingredientBoxes.nth(i).click();
  await page.getByRole('button', { name: 'Kroki', exact: true }).click();
  const stepBoxes = page.getByRole('checkbox');
  await expect(stepBoxes).toHaveCount(4);
  for (let i = 0; i < 4; i++) await stepBoxes.nth(i).click();
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await page.getByRole('button', { name: 'Odjąć' }).click();
  await expect(page.getByText('Braki w magazynie')).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj braki do zakupów' }).click();
  await expect(page.getByText('Brakujące składniki dodano do zakupów')).toBeVisible();

  const shopping = await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const req = db.transaction('shoppingItems').objectStore('shoppingItems').getAll();
    const rows = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  }, DB_NAME);
  expect(shopping).toHaveLength(5);
  expect(shopping.every((x) => !x.done)).toBeTruthy();
});


test('Magazyn: alerty stanów można wyłączyć dla ekranu Start', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('inventory', 'readwrite');
      tx.objectStore('inventory').clear();
      tx.objectStore('inventory').put({
        id: 'e2e-alert-stock', name: 'Alert E2E', quantity: 0, unit: 'g',
        minQuantity: 1, purchasePrice: null, priceUnit: 'kg', ean: '', category: '',
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, DB_NAME);
  await page.reload();
  const mag = page.getByRole('link', { name: '1 Magazyn', exact: true });
  await expect(mag).toBeVisible();
  await expect(mag.getByText('1', { exact: true })).toBeVisible();

  await page.goto('/#/settings');
  const toggle = page.getByRole('switch', { name: 'Alerty stanów magazynowych' });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();

  await page.goto('/');
  await expect(mag.getByText('1', { exact: true })).toHaveCount(0);
});


test('Food Cost: cena zakupu z Magazynu zasila koszt receptury', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('inventory', 'readwrite');
    tx.objectStore('inventory').clear();
    tx.objectStore('inventory').put({
      id: 'e2e-cost-flour', name: 'Mąka pszenna typ 00 (W 260–280)',
      quantity: 10, unit: 'kg', minQuantity: 0,
      purchasePrice: 8, priceUnit: 'kg', ean: '', category: 'Mąka',
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }, DB_NAME);

  const result = await page.evaluate(async (name) => {
    const { getRecipe } = await import('/recipes.js');
    const { recipeCost } = await import('/calculator.js');
    const { loadInventory, findInventoryByName } = await import('/inventory.js');
    await loadInventory();
    const recipe = getRecipe('rcp_seed_pizza');
    const priceResolver = (ing) => {
      const item = findInventoryByName(ing.name);
      return item?.purchasePrice != null ? { price: item.purchasePrice, priceUnit: item.priceUnit } : null;
    };
    const cost = recipeCost(recipe, 1, { priceResolver });
    return {
      flourCost: cost.lines.find((x) => x.ing.name === 'Mąka pszenna typ 00 (W 260–280)')?.cost,
      total: cost.total,
    };
  }, DB_NAME);

  expect(result.flourCost).toBeCloseTo(8, 10);
  expect(result.total).toBeGreaterThan(8);
});

test('Food Cost: Magazyn poprawnie przelicza kg→g i l→ml', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('inventory', 'readwrite');
    tx.objectStore('inventory').clear();
    tx.objectStore('inventory').put({
      id: 'e2e-cost-oil', name: 'Oliwa extra vergine', quantity: 2, unit: 'l',
      minQuantity: 0, purchasePrice: 40, priceUnit: 'l', ean: '', category: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();

    const { recipeCost } = await import('/calculator.js');
    const recipe = {
      id: 'e2e-unit-cost', name: 'Test jednostek', servings: 1, salePrice: 0,
      sections: [{ name: '', ingredients: [{ id: 'oil', name: 'Oliwa extra vergine', amount: 250, unit: 'ml' }] }]
    };
    const { loadInventory, findInventoryByName } = await import('/inventory.js');
    await loadInventory();
    const priceResolver = (ing) => {
      const item = findInventoryByName(ing.name);
      return item ? { price: item.purchasePrice, priceUnit: item.priceUnit } : null;
    };
    return recipeCost(recipe, 1, { priceResolver }).total;
  }, DB_NAME);

  expect(result).toBeCloseTo(10, 10);
});

test('Food Cost: koszt porcji skaluje się razem z recepturą', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { recipeCost } = await import('/calculator.js');
    const recipe = {
      id: 'e2e-scale-cost', name: 'Skalowanie kosztu', servings: 4, salePrice: 20,
      sections: [{ name: '', ingredients: [{ id: 'x', name: 'Ser', amount: 400, unit: 'g', price: 20, priceUnit: 'kg' }] }]
    };
    const base = recipeCost(recipe, 1);
    const doubled = recipeCost(recipe, 2);
    return { base, doubled };
  });

  expect(result.base.total).toBeCloseTo(8, 10);
  expect(result.base.perPortion).toBeCloseTo(2, 10);
  expect(result.doubled.total).toBeCloseTo(16, 10);
  expect(result.doubled.perPortion).toBeCloseTo(2, 10);
});
