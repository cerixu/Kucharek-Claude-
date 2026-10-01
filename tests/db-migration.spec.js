import { test, expect } from '@playwright/test';

const DB_NAME = 'kucharzyna-claude-db';

test.describe.configure({ mode: 'serial' });

async function openV1(page) {
  await page.goto('/');
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
        db.transaction.objectStore('history').createIndex('recipeId', 'recipeId');
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
  await page.evaluate(async (name) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onblocked = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, DB_NAME);
  await openV1(page);
  await page.goto('/');
  await page.waitForTimeout(500);

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
