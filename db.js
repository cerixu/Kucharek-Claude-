/* ==========================================================================
   db.js — warstwa nad IndexedDB + wersjonowanie schematu.
   v2 rozdziela ustawienia od danych funkcjonalnych (GOTUJĘ, szkice, magazyn).
   Migracja v1 → v2 jest automatyczna i nie usuwa danych.
   ========================================================================== */

const DB_NAME = 'kucharzyna-claude-db';
const DB_VERSION = 2;

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
      const tx = event.target.transaction;

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

      // v2: dedykowane stores.
      if (oldVersion < 2) {
        const cook = d.objectStore('cookSessions');
        const drafts = d.objectStore('drafts');
        const inventory = d.objectStore('inventory');
        const log = d.objectStore('inventoryLog');

        addIndex(cook, 'updatedAt', 'updatedAt');
        addIndex(drafts, 'recipeId', 'recipeId');
        addIndex(drafts, 'savedAt', 'savedAt');
        addIndex(inventory, 'ean', 'ean');
        addIndex(inventory, 'name', 'name');
        addIndex(inventory, 'updatedAt', 'updatedAt');
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
