/* ==========================================================================
   db.js — warstwa nad IndexedDB + wersjonowanie schematu.
   Schemat obejmuje receptury, GOTUJĘ, szkice oraz pełny moduł Magazyn PRO (dostawy, partie, ruchy, dostawcy, zamówienia, produkcja, inwentaryzacje, straty i historię cen).
   Migracje v1 → v4 są automatyczne i nie usuwają danych.
   ========================================================================== */

const DB_NAME = 'kucharzyna-claude-db';
const DB_VERSION = 5;

export const STORES = {
  recipes: 'id',
  ingredients: 'id',
  categories: 'id',
  shoppingItems: 'id',
  settings: 'key',
  history: 'id',
  cookSessions: 'recipeId',
  drafts: 'id',
  inventory: 'id',
  inventoryLog: 'id',
  deliveries: 'id',
  lots: 'id',
  stockMovements: 'id',
  suppliers: 'id',
  purchaseOrders: 'id',
  productionBatches: 'id',
  stocktakes: 'id',
  waste: 'id',
  priceHistory: 'id',
  cookHistory: 'id',
};

let dbPromise = null;
let needsLegacyMigration = false;

function createStore(d, name, keyPath) {
  if (d.objectStoreNames.contains(name)) return d.transaction.objectStore(name);
  return d.createObjectStore(name, { keyPath });
}

function addIndex(store, name, keyPath, options) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      return reject(new Error('Ta przeglądarka nie udostępnia IndexedDB.'));
    }

    const rq = indexedDB.open(DB_NAME, DB_VERSION);

    rq.onupgradeneeded = (event) => {
      const d = rq.result;
      const oldVersion = event.oldVersion;
      const tx = rq.transaction;

      // Stores istniejące od v1.
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!d.objectStoreNames.contains(name)) {
          d.createObjectStore(name, { keyPath });
        }
      }

      // Indeksy wspólne.
      if (d.objectStoreNames.contains('history')) {
        addIndex(tx.objectStore('history'), 'recipeId', 'recipeId');
      }

      // v4: dane PRO magazynu, dostaw, zakupów, produkcji i inwentaryzacji.
      if (oldVersion < 4) {
        addIndex(tx.objectStore('deliveries'), 'supplierId', 'supplierId');
        addIndex(tx.objectStore('deliveries'), 'at', 'at');
        addIndex(tx.objectStore('lots'), 'inventoryId', 'inventoryId');
        addIndex(tx.objectStore('lots'), 'expiryAt', 'expiryAt');
        addIndex(tx.objectStore('stockMovements'), 'inventoryId', 'inventoryId');
        addIndex(tx.objectStore('stockMovements'), 'at', 'at');
        addIndex(tx.objectStore('stockMovements'), 'type', 'type');
        addIndex(tx.objectStore('suppliers'), 'name', 'name');
        addIndex(tx.objectStore('purchaseOrders'), 'supplierId', 'supplierId');
        addIndex(tx.objectStore('purchaseOrders'), 'status', 'status');
        addIndex(tx.objectStore('purchaseOrders'), 'createdAt', 'createdAt');
        addIndex(tx.objectStore('productionBatches'), 'productName', 'productName');
        addIndex(tx.objectStore('productionBatches'), 'at', 'at');
        addIndex(tx.objectStore('stocktakes'), 'status', 'status');
        addIndex(tx.objectStore('stocktakes'), 'createdAt', 'createdAt');
        addIndex(tx.objectStore('waste'), 'inventoryId', 'inventoryId');
        addIndex(tx.objectStore('waste'), 'at', 'at');
        addIndex(tx.objectStore('priceHistory'), 'inventoryId', 'inventoryId');
        addIndex(tx.objectStore('priceHistory'), 'at', 'at');
      }

      // v5: historia zakończonych gotowań.
      if (oldVersion < 5) {
        const cookHistory = tx.objectStore('cookHistory');
        addIndex(cookHistory, 'recipeId', 'recipeId');
        addIndex(cookHistory, 'at', 'at');
      }

      // v2: dedykowane stores.
      if (oldVersion < 2) {
        const cook = tx.objectStore('cookSessions');
        const drafts = tx.objectStore('drafts');
        const inventory = tx.objectStore('inventory');
        const log = tx.objectStore('inventoryLog');

        addIndex(cook, 'updatedAt', 'updatedAt');
        addIndex(drafts, 'recipeId', 'recipeId');
        addIndex(drafts, 'savedAt', 'savedAt');
        addIndex(inventory, 'ean', 'ean');
        addIndex(inventory, 'name', 'name');
        addIndex(inventory, 'updatedAt', 'updatedAt');
        addIndex(inventory, 'ean', 'ean', { unique: false });
        addIndex(log, 'ingredientId', 'ingredientId');
        addIndex(log, 'type', 'type');
        addIndex(log, 'at', 'at');

        needsLegacyMigration = true;
      }
    };

    rq.onsuccess = () => {
      const d = rq.result;

      d.onversionchange = () => {
        d.close();
        dbPromise = null;
      };

      d.onclose = () => {
        dbPromise = null;
      };

      const finish = async () => {
        if (needsLegacyMigration) {
          const t = d.transaction(['settings', 'cookSessions', 'drafts'], 'readwrite');
          const settingsReq = t.objectStore('settings').getAll();
          settingsReq.onsuccess = () => {
            for (const row of settingsReq.result || []) {
              const key = String(row?.key ?? '');
              const value = row?.value;

              if (key.startsWith('cook:') && value && typeof value === 'object') {
                const recipeId = key.slice(5);
                if (recipeId) {
                  t.objectStore('cookSessions').put({
                    ...value,
                    recipeId,
                    updatedAt: value.updatedAt || Date.now(),
                  });
                }
              }

              if (key.startsWith('draft:') && value && typeof value === 'object') {
                const id = key.slice(6);
                if (id) {
                  t.objectStore('drafts').put({
                    ...value,
                    id,
                    recipeId: id === 'new' ? null : id,
                    savedAt: value.savedAt || Date.now(),
                  });
                }
              }
            }
          };

          await done(t);
          needsLegacyMigration = false;
        }

        resolve(d);
      };

      finish().catch((error) => {
        dbPromise = null;
        d.close();
        reject(error);
      });
    };

    rq.onerror = () => {
      dbPromise = null;
      reject(rq.error);
    };

    rq.onblocked = () => {
      console.warn('[Kucharek] Aktualizacja IndexedDB oczekuje na zamknięcie starej karty.');
    };
  });

  return dbPromise;
}

const wrap = (rq) => new Promise((res, rej) => {
  rq.onsuccess = () => res(rq.result);
  rq.onerror = () => rej(rq.error);
});

const done = (t) => new Promise((res, rej) => {
  t.oncomplete = () => res();
  t.onerror = () => rej(t.error);
  t.onabort = () => rej(t.error || new Error('Transakcja przerwana'));
});

export const db = {
  async getAll(store) {
    const d = await openDB();
    return wrap(d.transaction(store).objectStore(store).getAll());
  },

  async get(store, key) {
    const d = await openDB();
    return wrap(d.transaction(store).objectStore(store).get(key));
  },

  async byIndex(store, index, key) {
    const d = await openDB();
    return wrap(d.transaction(store).objectStore(store).index(index).getAll(key));
  },

  async put(store, val) {
    const d = await openDB();
    const t = d.transaction(store, 'readwrite');
    t.objectStore(store).put(val);
    return done(t);
  },

  async putMany(store, vals) {
    const d = await openDB();
    const t = d.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    vals.forEach((v) => s.put(v));
    return done(t);
  },

  async delete(store, key) {
    const d = await openDB();
    const t = d.transaction(store, 'readwrite');
    t.objectStore(store).delete(key);
    return done(t);
  },

  async clear(store) {
    const d = await openDB();
    const t = d.transaction(store, 'readwrite');
    t.objectStore(store).clear();
    return done(t);
  },

  /** Atomowa transakcja na wielu magazynach. */
  async tx(stores, fn) {
    const d = await openDB();
    const t = d.transaction(stores, 'readwrite');

    fn({
      put: (s, v) => t.objectStore(s).put(v),
      delete: (s, k) => t.objectStore(s).delete(k),
      clear: (s) => t.objectStore(s).clear(),
    });

    return done(t);
  },
};

/** Klucz → wartość dla ustawień aplikacji. */
export const kv = {
  async get(key) {
    const r = await db.get('settings', key);
    return r ? r.value : undefined;
  },
  async set(key, value) {
    return db.put('settings', { key, value });
  },
  async del(key) {
    return db.delete('settings', key);
  },
};
