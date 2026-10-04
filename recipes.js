/* ==========================================================================
   recipes.js — model danych, warstwa dostępu (IndexedDB + pamięć podręczna),
   historia zmian, kategorie, ustawienia i dane startowe.

   Zasada: IndexedDB jest jedynym źródłem prawdy. Mapa `state.recipes` to tylko
   lustro do szybkiego renderowania — każda zmiana najpierw trafia do bazy.
   ========================================================================== */
import { db, kv } from './db.js';
import { uid, norm, fmtAmount, fmtMinutes, fmtDateTime, flagEmoji } from './util.js';
import { recipeLibrary } from './recipe-library.js';

/* ---------- Kategorie i kraje ---------- */

export const DEFAULT_CATEGORIES = [
  ['cat-pizza', 'Pizza', '🍕'], ['cat-pasta', 'Pasta', '🍝'], ['cat-sosy', 'Sosy', '🥫'],
  ['cat-mieso', 'Mięso', '🥩'], ['cat-ryby', 'Ryby', '🐟'], ['cat-owoce-morza', 'Owoce morza', '🦐'],
  ['cat-warzywa', 'Warzywa', '🥕'], ['cat-desery', 'Desery', '🍰'], ['cat-pieczywo', 'Pieczywo', '🥖'],
  ['cat-zupy', 'Zupy', '🍲'], ['cat-salatki', 'Sałatki', '🥗'], ['cat-cocktaile', 'Cocktaile', '🍸'],
  ['cat-prep', 'Prep', '🔪'], ['cat-sosy-bazowe', 'Sosy bazowe', '🍅'], ['cat-inne', 'Inne', '🍽️'],
].map(([id, name, icon], order) => ({ id, name, icon, builtin: true, order }));

export const ORIGINS = [
  ['IT', 'Włochy'], ['PL', 'Polska'], ['FR', 'Francja'], ['ES', 'Hiszpania'], ['DE', 'Niemcy'], ['GR', 'Grecja'],
  ['PT', 'Portugalia'], ['GB', 'Wielka Brytania'], ['AT', 'Austria'], ['HU', 'Węgry'], ['CZ', 'Czechy'],
  ['SE', 'Szwecja'], ['TR', 'Turcja'], ['LB', 'Liban'], ['GE', 'Gruzja'], ['IL', 'Izrael'], ['MA', 'Maroko'],
  ['IN', 'Indie'], ['CN', 'Chiny'], ['JP', 'Japonia'], ['KR', 'Korea'], ['TH', 'Tajlandia'], ['VN', 'Wietnam'],
  ['US', 'USA'], ['MX', 'Meksyk'], ['PE', 'Peru'], ['BR', 'Brazylia'], ['AR', 'Argentyna'],
].map(([code, name]) => ({ code, name, flag: flagEmoji(code) }));

/* ---------- Ustawienia domyślne ---------- */

export const DEFAULT_SETTINGS = {
  theme: 'auto',          // auto | light | dark
  mode: 'pro',            // pro | amateur
  tapSize: 'large',       // normal | large | xl
  textScale: 100,         // 90–130 (%)
  pinTraditional: true,
  keepAwake: true,
  currency: 'zł',
  sort: 'name',
  seeded: false,
  lastBackupAt: 0,
  inventoryAlerts: true,
  inventoryAutoShopping: true,
  inventoryAutoConsumption: true,
  seedLibraryVersion: 1,
  aiEnabled: true,
  aiGatewayUrl: '',
};

/* ---------- Stan (lustro bazy) ---------- */

export const state = {
  recipes: new Map(),
  categories: [],
  shopping: [],
  settings: {},
  catalog: new Map(),   // katalog składników z cenami: norm(nazwa) → rekord
  ready: false,
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emit = (type) => listeners.forEach((fn) => { try { fn(type); } catch (e) { console.error(e); } });

export const getSetting = (k) => (k in state.settings ? state.settings[k] : DEFAULT_SETTINGS[k]);
export async function setSetting(k, v) {
  state.settings[k] = v;
  await db.put('settings', { key: k, value: v });
  emit('settings');
}

/* ---------- Modele ---------- */

export function blankIngredient(over = {}) {
  return { id: uid('ing_'), name: '', amount: null, unit: 'g', percent: null, flour: null,
    price: null, priceUnit: 'kg', packageWeight: null, packageUnit: 'g', ...over };
}
export const blankSection = (name = '') => ({ id: uid('sec_'), name, ingredients: [] });
export const blankStep = (text = '') => ({ id: uid('stp_'), text });

export function blankRecipe(over = {}) {
  const now = Date.now();
  return {
    id: uid('rcp_'), schema: 1, name: '', category: 'cat-inne', description: '', photo: '', thumb: '',
    servings: 1, yieldAmount: null, yieldUnit: 'g', prepTime: 0, cookTime: 0, fermentTime: 0, temperature: '',
    bakers: false, sections: [blankSection('')], steps: [], notes: '', tags: [], favorite: false, favoritedAt: 0,
    source: '', sourceUrl: '', traditional: false, origin: '', salePrice: null,
    createdAt: now, updatedAt: now, lastOpenedAt: 0, openCount: 0, ...over,
  };
}

/** Uzupełnia brakujące pola (np. po imporcie starszego backupu). */
export function normalizeRecipe(r) {
  const b = blankRecipe();
  const o = { ...b, ...r };
  o.tags = Array.isArray(o.tags) ? o.tags.filter(Boolean) : [];
  o.steps = (Array.isArray(o.steps) ? o.steps : []).map((s) => ({ id: s.id || uid('stp_'), text: s.text || '' }));
  o.sections = (Array.isArray(o.sections) && o.sections.length ? o.sections : [blankSection('')]).map((s) => ({
    id: s.id || uid('sec_'), name: s.name || '',
    ingredients: (s.ingredients || []).map((i) => ({ ...blankIngredient(), ...i, id: i.id || uid('ing_') })),
  }));
  return o;
}

export const allIngredients = (r) => r.sections.flatMap((s) => s.ingredients);
export const cloneRecipe = (r) => ({
  ...r, tags: [...r.tags], steps: r.steps.map((s) => ({ ...s })),
  sections: r.sections.map((s) => ({ ...s, ingredients: s.ingredients.map((i) => ({ ...i })) })),
});
/** Migawka do historii — bez zdjęć (oszczędza miejsce). */
export function stripMedia(r) { const c = cloneRecipe(r); c.photo = ''; c.thumb = ''; return c; }

const searchCache = new WeakMap();
export function searchText(r) {
  let t = searchCache.get(r);
  if (t == null) {
    t = norm([r.name, catName(r.category), r.description, r.tags.join(' '), r.notes, r.source,
      allIngredients(r).map((i) => i.name).join(' ')].join(' '));
    searchCache.set(r, t);
  }
  return t;
}

/* ---------- Ładowanie ---------- */

export async function loadAll() {
  const [recipes, cats, shop, sets, ings] = await Promise.all([
    db.getAll('recipes'), db.getAll('categories'), db.getAll('shoppingItems'), db.getAll('settings'), db.getAll('ingredients'),
  ]);
  state.recipes.clear();
  recipes.forEach((r) => state.recipes.set(r.id, normalizeRecipe(r)));
  state.shopping = shop.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  state.settings = {};
  sets.forEach((s) => { if (!String(s.key).includes(':')) state.settings[s.key] = s.value; });
  state.catalog = new Map(ings.map((i) => [i.id, i]));
  if (!cats.length) { await db.putMany('categories', DEFAULT_CATEGORIES); state.categories = [...DEFAULT_CATEGORIES]; }
  else state.categories = cats.sort((a, b) => a.order - b.order);
  if (!getSetting('seeded')) {
    if (!state.recipes.size) await restoreSeeds();
    await setSetting('seeded', true);
  }
  if (getSetting('seedLibraryVersion') !== SEED_MEDIA_VERSION) {
    await removeLegacyLibrarySeeds();
    await restoreSeeds();
    await setSetting('seedLibraryVersion', SEED_MEDIA_VERSION);
  }
  state.ready = true;
}

/* ---------- Kategorie ---------- */

export const catName = (id) => (state.categories.find((c) => c.id === id) || { name: 'Inne' }).name;
export const catIcon = (id) => (state.categories.find((c) => c.id === id) || { icon: '🍽️' }).icon || '🍽️';

export async function saveCategory(cat) {
  const c = { builtin: false, icon: '🍽️', ...cat };
  if (c.order == null) c.order = state.categories.length ? Math.max(...state.categories.map((x) => x.order)) + 1 : 0;
  await db.put('categories', c);
  const i = state.categories.findIndex((x) => x.id === c.id);
  if (i >= 0) state.categories[i] = c; else state.categories.push(c);
  state.categories.sort((a, b) => a.order - b.order);
  emit('categories');
  return c;
}

export async function deleteCategory(id) {
  if (id === 'cat-inne') return;
  const affected = [...state.recipes.values()].filter((r) => r.category === id).map((r) => ({ ...r, category: 'cat-inne' }));
  await db.tx(['categories', 'recipes'], (t) => { t.delete('categories', id); affected.forEach((r) => t.put('recipes', r)); });
  affected.forEach((r) => state.recipes.set(r.id, r));
  state.categories = state.categories.filter((c) => c.id !== id);
  emit('categories');
}

export async function reorderCategories(ids) {
  ids.forEach((id, i) => { const c = state.categories.find((x) => x.id === id); if (c) c.order = i; });
  state.categories.sort((a, b) => a.order - b.order);
  await db.putMany('categories', state.categories);
  emit('categories');
}

/* ---------- Receptury ---------- */

export const getRecipe = (id) => state.recipes.get(id);
export const listRecipes = () => [...state.recipes.values()];

const fmtPrice = (i) => (i.price == null ? '—' : `${i.price} zł/${i.priceUnit}`);

/** Lista czytelnych zmian między dwiema wersjami receptury (po polsku). */
export function diffRecipes(a, b) {
  const out = [];
  const chg = (label, x, y) => {
    const X = x == null || x === '' ? '—' : x, Y = y == null || y === '' ? '—' : y;
    if (String(X) !== String(Y)) out.push(`${label}: ${X} → ${Y}`);
  };
  const qty = (i) => (i.amount == null ? i.unit || 'do smaku' : `${fmtAmount(i.amount)} ${i.unit}`.trim());

  chg('Nazwa', a.name, b.name);
  chg('Kategoria', catName(a.category), catName(b.category));
  chg('Porcje', a.servings, b.servings);
  chg('Wydajność', a.yieldAmount ? `${fmtAmount(a.yieldAmount)} ${a.yieldUnit}` : '', b.yieldAmount ? `${fmtAmount(b.yieldAmount)} ${b.yieldUnit}` : '');
  chg('Czas przygotowania', fmtMinutes(a.prepTime), fmtMinutes(b.prepTime));
  chg('Czas gotowania', fmtMinutes(a.cookTime), fmtMinutes(b.cookTime));
  chg('Fermentacja', fmtMinutes(a.fermentTime), fmtMinutes(b.fermentTime));
  chg('Temperatura', a.temperature, b.temperature);
  chg('Źródło', a.source, b.source);
  chg('URL źródła', a.sourceUrl, b.sourceUrl);
  chg('Cena sprzedaży', a.salePrice, b.salePrice);
  chg('Tagi', a.tags.join(', '), b.tags.join(', '));
  if (a.bakers !== b.bakers) out.push(`Procenty piekarskie: ${a.bakers ? 'tak' : 'nie'} → ${b.bakers ? 'tak' : 'nie'}`);
  if (a.traditional !== b.traditional || a.origin !== b.origin) out.push('Zmieniono oznaczenie „tradycyjna”');
  if (a.description !== b.description) out.push('Zmieniono opis');
  if (a.notes !== b.notes) out.push('Zmieniono własne uwagi');
  if (a.photo !== b.photo) out.push('Zmieniono zdjęcie');

  // Sekcje
  const sa = new Map(a.sections.map((s) => [s.id, s])), sb = new Map(b.sections.map((s) => [s.id, s]));
  for (const [id, s] of sb) {
    if (!sa.has(id)) out.push(`Dodano sekcję „${s.name || 'bez nazwy'}”`);
    else if (sa.get(id).name !== s.name) out.push(`Sekcja: „${sa.get(id).name || '—'}” → „${s.name || '—'}”`);
  }
  for (const [id, s] of sa) if (!sb.has(id)) out.push(`Usunięto sekcję „${s.name || 'bez nazwy'}”`);
  const common = (arr, other) => arr.filter((s) => other.has(s.id)).map((s) => s.id).join();
  if (common(a.sections, sb) !== common(b.sections, sa)) out.push('Zmieniono kolejność sekcji');

  // Składniki
  const flat = (r) => r.sections.flatMap((s) => s.ingredients.map((i) => ({ ...i, _sec: s.name || '' })));
  const A = new Map(flat(a).map((i) => [i.id, i])), B = new Map(flat(b).map((i) => [i.id, i]));
  for (const [id, ib] of B) {
    const ia = A.get(id);
    if (!ia) { out.push(`Dodano: ${ib.name || 'składnik'} — ${qty(ib)}`); continue; }
    if (ia.name !== ib.name) out.push(`Składnik: ${ia.name} → ${ib.name}`);
    if (ia.amount !== ib.amount || ia.unit !== ib.unit) out.push(`${ib.name}: ${qty(ia)} → ${qty(ib)}`);
    if ((ia.percent ?? null) !== (ib.percent ?? null)) out.push(`${ib.name}: procent ${ia.percent ?? '—'} → ${ib.percent ?? '—'}`);
    if (ia._sec !== ib._sec) out.push(`${ib.name}: sekcja „${ia._sec || '—'}” → „${ib._sec || '—'}”`);
    if (ia.price !== ib.price || ia.priceUnit !== ib.priceUnit) out.push(`${ib.name}: cena ${fmtPrice(ia)} → ${fmtPrice(ib)}`);
  }
  for (const [id, ia] of A) if (!B.has(id)) out.push(`Usunięto: ${ia.name || 'składnik'}`);
  const commonI = (x, y) => [...x.keys()].filter((k) => y.has(k)).join();
  if (commonI(A, B) !== commonI(B, A)) out.push('Zmieniono kolejność składników');

  // Kroki
  const pa = new Map(a.steps.map((s) => [s.id, s])), pb = new Map(b.steps.map((s) => [s.id, s]));
  b.steps.forEach((s, i) => {
    if (!pa.has(s.id)) out.push(`Dodano krok ${i + 1}`);
    else if (pa.get(s.id).text !== s.text) out.push(`Zmieniono krok ${i + 1}`);
  });
  for (const [id] of pa) if (!pb.has(id)) out.push('Usunięto krok');
  if ([...pa.keys()].filter((k) => pb.has(k)).join() !== [...pb.keys()].filter((k) => pa.has(k)).join()) out.push('Zmieniono kolejność kroków');

  if (out.length > 16) { const n = out.length - 15; out.length = 15; out.push(`…i ${n} innych zmian`); }
  return out;
}

/**
 * Zapis receptury do IndexedDB (z atomową historią i katalogiem cen).
 * opts.history=false — bez wpisu do historii; opts.note — dodatkowy opis zmiany.
 */
export async function saveRecipe(input, opts = {}) {
  const prev = state.recipes.get(input.id);
  const next = normalizeRecipe(input);
  const now = Date.now();
  next.updatedAt = now;
  if (!prev) next.createdAt = next.createdAt || now;
  let entry = null;
  if (prev && opts.history !== false) {
    const changes = diffRecipes(prev, next);
    if (opts.note) changes.unshift(opts.note);
    if (changes.length) entry = { id: uid('his_'), recipeId: next.id, at: now, changes, snapshot: stripMedia(prev) };
  }
  const catalog = [];
  allIngredients(next).forEach((i) => {
    if (i.name && i.price != null) {
      catalog.push({ id: norm(i.name), name: i.name, price: i.price, priceUnit: i.priceUnit, packageWeight: i.packageWeight, packageUnit: i.packageUnit, updatedAt: now });
    }
  });
  await db.tx(['recipes', 'history', 'ingredients'], (t) => {
    t.put('recipes', next);
    if (entry) t.put('history', entry);
    catalog.forEach((c) => t.put('ingredients', c));
  });
  state.recipes.set(next.id, next);
  catalog.forEach((c) => state.catalog.set(c.id, c));
  if (entry) pruneHistory(next.id).catch(() => {});
  emit('recipes');
  return next;
}

/** Szybka zmiana pól bez historii (ulubione, notatki z autozapisu, licznik otwarć). */
export async function patchRecipe(id, patch, { touch = false } = {}) {
  const cur = state.recipes.get(id);
  if (!cur) return null;
  const cookHistory = patch && patch.__cookHistory;
  const next = { ...cur, ...patch };
  delete next.__cookHistory;
  if (touch) next.updatedAt = Date.now();
  await db.put('recipes', next);
  if (cookHistory && cookHistory.id) {
    await db.put('cookHistory', {
      ...cookHistory,
      recipeId: id,
      recipeName: next.name || cur.name || 'Receptura',
    });
  }
  state.recipes.set(id, next);
  emit('recipes');
  return next;
}

export const toggleFavorite = (id) => {
  const r = state.recipes.get(id);
  return patchRecipe(id, { favorite: !r.favorite, favoritedAt: !r.favorite ? Date.now() : 0 });
};

export const markOpened = (id) => {
  const r = state.recipes.get(id);
  return r ? patchRecipe(id, { lastOpenedAt: Date.now(), openCount: (r.openCount || 0) + 1 }) : null;
};

export async function deleteRecipe(id) {
  const hist = await db.byIndex('history', 'recipeId', id);
  const cookHist = await db.byIndex('cookHistory', 'recipeId', id).catch(() => []);
  await db.tx(['recipes', 'history', 'settings', 'cookSessions', 'drafts', 'cookHistory'], (t) => {
    t.delete('recipes', id);
    hist.forEach((h) => t.delete('history', h.id));
    // Usuń również legacy klucze, jeśli stara wersja aplikacji zostawiła je w settings.
    t.delete('settings', 'cook:' + id);
    t.delete('settings', 'draft:' + id);
    t.delete('cookSessions', id);
    t.delete('drafts', id);
    cookHist.forEach((h) => { if (h && h.id) t.delete('cookHistory', h.id); });
  });
  state.recipes.delete(id);
  emit('recipes');
}

export async function duplicateRecipe(id) {
  const src = state.recipes.get(id);
  const c = cloneRecipe(src);
  const now = Date.now();
  Object.assign(c, { id: uid('rcp_'), name: `${src.name} (kopia)`, favorite: false, favoritedAt: 0, createdAt: now, updatedAt: now, lastOpenedAt: 0, openCount: 0 });
  c.sections.forEach((s) => { s.id = uid('sec_'); s.ingredients.forEach((i) => { i.id = uid('ing_'); }); });
  c.steps.forEach((s) => { s.id = uid('stp_'); });
  return saveRecipe(c);
}

/* ---------- Historia ---------- */

export async function getHistory(recipeId) {
  return (await db.byIndex('history', 'recipeId', recipeId)).sort((a, b) => b.at - a.at);
}

async function pruneHistory(recipeId, keep = 60) {
  const all = await getHistory(recipeId);
  if (all.length > keep) await db.tx(['history'], (t) => all.slice(keep).forEach((h) => t.delete('history', h.id)));
}

/** Przywraca recepturę do migawki z historii (zdjęcie, ulubione i statystyki zostają). */
export async function restoreVersion(entry) {
  const cur = state.recipes.get(entry.recipeId);
  const snap = JSON.parse(JSON.stringify(entry.snapshot));
  const restored = { ...snap, id: cur.id, photo: cur.photo, thumb: cur.thumb, favorite: cur.favorite, favoritedAt: cur.favoritedAt,
    createdAt: cur.createdAt, lastOpenedAt: cur.lastOpenedAt, openCount: cur.openCount };
  return saveRecipe(restored, { note: `Przywrócono wersję z ${fmtDateTime(entry.at)}` });
}

/* ---------- Katalog składników (ceny, podpowiedzi) ---------- */

export const catalogLookup = (name) => state.catalog.get(norm(name));
export function ingredientNames() {
  const set = new Map();
  state.catalog.forEach((c) => set.set(norm(c.name), c.name));
  state.recipes.forEach((r) => allIngredients(r).forEach((i) => { if (i.name) set.set(norm(i.name), i.name); }));
  return [...set.values()].sort((a, b) => a.localeCompare(b, 'pl'));
}
export function allTags() {
  const s = new Set();
  state.recipes.forEach((r) => r.tags.forEach((t) => s.add(t)));
  return [...s].sort((a, b) => a.localeCompare(b, 'pl'));
}

/* ---------- Dane startowe ---------- */


/* ---------- Biblioteka zdjęć startowych ---------- */
const SEED_MEDIA_VERSION = 11;
const PHOTO = Object.freeze({
  pizza:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:19d098c7-f308-4416-951d-4d5bb6ed6cc4',
  carbonara:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:995b5785-cd24-4bff-b5c2-ba36d567a827',
  lasagna:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143',
  risotto:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ce7495e9-ffd9-4eb0-839d-2d3f0ea7c2cb',
  caesar:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2',
  ramen:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1e2c10cf-9142-48c0-8996-8a5b66cb9015',
  tiramisu:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1adf5a93-c4f0-4427-93fd-fd5e11e2db63',
  pesto:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34',
  soup:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ef0f08fd-ee15-4d66-b56b-d31ef64a64ba',
  tomatoSauce:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:4a0ea06e-609d-4c9f-ac74-c8b8b01f54f0',
  sushi:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:0d05b6dc-b2d8-4875-93d3-85443f23381d',
  cheesecake:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:67f0ca3a-3fd1-4491-b46d-8342a620a693',
  focaccia:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:f8b5dce7-934d-4fd2-8e7f-9ccac2c5fc3a',
});

const I = (name, amount, unit, x = {}) => blankIngredient({ name, amount, unit, ...x });
const S = (name, ...ingredients) => ({ id: uid('sec_'), name, ingredients });
const T = (text) => blankStep(text);

export function seedRecipes() {
  const now = Date.now();
  const base = { createdAt: now, updatedAt: now };
  return [
    blankRecipe({
      ...base, id: 'rcp_seed_pizza', name: 'Pizza Napoletana', category: 'cat-pizza', photo: PHOTO.pizza, thumb: PHOTO.pizza, traditional: true, origin: 'IT',
      description: 'Klasyczne neapolitańskie ciasto na 6 pizz (ok. 280 g na kulkę), długo dojrzewające. Dane przykładowe — edytuj lub usuń.',
      servings: 6, yieldAmount: 1682, yieldUnit: 'g', prepTime: 30, cookTime: 2, fermentTime: 1440, temperature: '450–485 °C', bakers: true,
      salePrice: 32, tags: ['ciasto', 'fermentacja', 'włoskie'],
      source: 'Associazione Verace Pizza Napoletana — Disciplinare (STG)', sourceUrl: 'https://www.pizzanapoletana.org/',
      sections: [
        S('CIASTO',
          I('Mąka pszenna typ 00 (W 260–280)', 1000, 'g', { percent: 100, flour: true, price: 6.5, priceUnit: 'kg' }),
          I('Woda', 650, 'g', { percent: 65, price: 0, priceUnit: 'l' }),
          I('Sól morska', 30, 'g', { percent: 3, price: 2.5, priceUnit: 'kg' }),
          I('Drożdże świeże', 2, 'g', { percent: 0.2, price: 14, priceUnit: 'kg' })),
        S('SOS', I('Pomidory San Marzano (pelati)', 500, 'g', { price: 14, priceUnit: 'kg' }), I('Sól', 5, 'g')),
        S('DODATKI (Margherita)', I('Mozzarella fior di latte', 500, 'g', { price: 32, priceUnit: 'kg' }), I('Bazylia (świeże liście)', 24, 'szt.'), I('Oliwa extra vergine', 60, 'ml', { price: 38, priceUnit: 'l' })),
      ],
      steps: [
        T('Rozpuść sól w wodzie (ok. 20 °C), dodaj drożdże i rozprowadź.'),
        T('Stopniowo dodawaj mąkę i wyrabiaj ok. 10 minut do gładkiego, elastycznego ciasta (temperatura ciasta 23–25 °C).'),
        T('Odpoczynek 2 godziny w temperaturze pokojowej pod przykryciem.'),
        T('Podziel na 6 kulek po ok. 280 g i uformuj (zamknięcie od spodu).'),
        T('Kulki w szczelnym pojemniku: łącznie ok. 24 h fermentacji (pokojowa) lub 24–48 h w lodówce — wyjmij 2 h przed wypiekiem.'),
        T('Rozciągnij ręcznie (bez wałka) do ok. 30–35 cm, zostawiając wyższy brzeg.'),
        T('Sos, mozzarella, bazylia; piecz 60–90 s w maksymalnie gorącym piecu (450–485 °C), na koniec oliwa.'),
      ],
    }),
    blankRecipe({
      ...base, id: 'rcp_seed_carbonara', name: 'Carbonara', category: 'cat-pasta', photo: PHOTO.carbonara, thumb: PHOTO.carbonara, traditional: true, origin: 'IT',
      description: 'Rzymska carbonara — bez śmietany. Dane przykładowe — edytuj lub usuń.',
      servings: 4, prepTime: 10, cookTime: 20, temperature: 'sos poza ogniem, ok. 70 °C', tags: ['makaron', 'rzymskie', 'klasyk'],
      source: 'Tradycyjna receptura rzymska (guanciale, pecorino, żółtka, pieprz)',
      sections: [
        S('', I('Spaghetti', 400, 'g'), I('Guanciale', 150, 'g'), I('Żółtka', 6, 'szt.'), I('Pecorino romano (drobno starte)', 80, 'g'), I('Pieprz czarny (świeżo mielony)', 3, 'g')),
        S('DO GOTOWANIA', I('Woda', 4, 'l'), I('Sól', 30, 'g')),
      ],
      steps: [
        T('Guanciale pokrój w słupki. Smaż na patelni na małym ogniu, bez tłuszczu, 8–10 minut aż się wytopi i będzie chrupiące.'),
        T('W misce rozetrzyj żółtka z pecorino i dużą ilością pieprzu na gęstą pastę.'),
        T('Ugotuj spaghetti al dente w osolonej wodzie. Odlej ok. 200 ml wody z gotowania.'),
        T('Makaron przełóż na patelnię z guanciale, zdejmij z ognia.'),
        T('Dodaj masę jajeczną i szybko mieszaj, dolewając po łyżce wody z makaronu, aż sos będzie kremowy (nie ścięty).'),
        T('Podaj od razu, posyp pecorino i pieprzem.'),
      ],
    }),
    blankRecipe({
      ...base, id: 'rcp_seed_sos', name: 'Sos pomidorowy', category: 'cat-sosy-bazowe', photo: PHOTO.tomatoSauce, thumb: PHOTO.tomatoSauce,
      description: 'Prosty sos bazowy do pizzy i makaronu. Dane przykładowe — edytuj lub usuń.',
      servings: 4, yieldAmount: 650, yieldUnit: 'g', prepTime: 5, cookTime: 25, tags: ['baza', 'pomidory', 'wegańskie'],
      source: 'Klasyczna receptura włoska (przykład)',
      sections: [S('', I('Pomidory San Marzano (pelati)', 800, 'g'), I('Oliwa extra vergine', 40, 'ml'), I('Czosnek (ząbki)', 2, 'szt.'), I('Sól', 8, 'g'), I('Bazylia (świeże liście)', 10, 'szt.'))],
      steps: [
        T('Na małym ogniu podgrzej oliwę z czosnkiem 1–2 minuty (bez przypalania).'),
        T('Dodaj pomidory rozgniecione ręcznie i sól.'),
        T('Gotuj bez przykrycia 20–25 minut na małym ogniu, od czasu do czasu mieszając.'),
        T('Na koniec dodaj darte ręcznie liście bazylii; w razie potrzeby popraw solą.'),
      ],
    }),
  ...extraSeedRecipes(now),
    ...recipeLibrary(now),
  ];
}

function extraSeedRecipes(now) {
  const base={createdAt:now,updatedAt:now};
  return [
    blankRecipe({...base,id:'rcp_seed_lasagne',name:'Lasagne al forno',category:'cat-pasta',traditional:true,origin:'IT',photo:PHOTO.lasagna,thumb:PHOTO.lasagna,description:'Warstwowa lasagne z ragù, beszamelem i Parmigiano Reggiano.',servings:6,prepTime:35,cookTime:45,temperature:'190 °C',tags:['lasagne','ragù','włoskie'],sections:[S('RAGÙ',I('Wołowina mielona',500,'g'),I('Pancetta',100,'g'),I('Passata pomidorowa',700,'g'),I('Cebula',120,'g'),I('Marchew',100,'g'),I('Seler naciowy',80,'g'),I('Oliwa extra vergine',30,'ml')),S('BESZAMEL',I('Mleko',700,'ml'),I('Masło',60,'g'),I('Mąka pszenna',60,'g'),I('Gałka muszkatołowa',1,'g')),S('MONTAŻ',I('Płaty lasagne',250,'g'),I('Parmigiano Reggiano',100,'g'))],steps:[T('Zeszklij warzywa na oliwie, dodaj pancettę i mięso. Mocno zrumień.'),T('Dodaj pomidory i gotuj ragù minimum 30 minut.'),T('Z masła, mąki i mleka przygotuj gładki beszamel. Dopraw gałką.'),T('Układaj warstwami: ragù, płaty, beszamel i ser. Powtórz.'),T('Piecz około 45 minut w 190 °C. Odstaw na 10 minut przed krojeniem.')]}),
    blankRecipe({...base,id:'rcp_seed_risotto',name:'Risotto alla Milanese',category:'cat-pasta',traditional:true,origin:'IT',photo:PHOTO.risotto,thumb:PHOTO.risotto,description:'Kremowe risotto z szafranem, wykończone masłem i Parmigiano.',servings:4,prepTime:10,cookTime:25,tags:['risotto','szafran','włoskie'],sections:[S('',I('Ryż Carnaroli',320,'g'),I('Wywar warzywny lub drobiowy',1000,'ml'),I('Cebula',80,'g'),I('Białe wytrawne wino',100,'ml'),I('Szafran',0.2,'g'),I('Masło',60,'g'),I('Parmigiano Reggiano',80,'g'))],steps:[T('Podgrzewaj wywar. Szafran zalej niewielką ilością gorącego wywaru.'),T('Zeszklij cebulę na części masła, dodaj ryż i praż 2 minuty.'),T('Wlej wino i odparuj.'),T('Dolewaj wywar partiami, mieszając, gdy poprzednia porcja zostanie wchłonięta.'),T('Dodaj szafran. Ryż ma być al dente i płynny.'),T('Zdejmij z ognia, wmieszaj zimne masło i Parmigiano.')]}),
    blankRecipe({...base,id:'rcp_seed_caesar',name:'Sałatka Caesar',category:'cat-salatki',origin:'US',photo:PHOTO.caesar,thumb:PHOTO.caesar,description:'Chrupiąca sałata rzymska, kurczak, grzanki i intensywny sos anchois.',servings:2,prepTime:15,cookTime:10,tags:['sałatka','kurczak','sos'],sections:[S('SAŁATKA',I('Sałata rzymska',250,'g'),I('Pierś z kurczaka',250,'g'),I('Grzanki',100,'g'),I('Parmigiano Reggiano',40,'g')),S('SOS',I('Żółtko',1,'szt.'),I('Anchois',20,'g'),I('Czosnek',1,'szt.'),I('Sok z cytryny',20,'ml'),I('Oliwa extra vergine',80,'ml'))],steps:[T('Kurczaka dopraw, zgrilluj i pokrój w plastry.'),T('Rozetrzyj anchois i czosnek, dodaj żółtko, cytrynę i stopniowo oliwę.'),T('Sałatę wymieszaj z sosem tuż przed podaniem.'),T('Dodaj kurczaka, grzanki i płatki Parmigiano.')]}),
    blankRecipe({...base,id:'rcp_seed_ramen',name:'Ramen shoyu',category:'cat-zupy',traditional:true,origin:'JP',photo:PHOTO.ramen,thumb:PHOTO.ramen,description:'Aromatyczny ramen z bulionem, tare shoyu, makaronem, jajkiem i chashu.',servings:2,prepTime:25,cookTime:20,tags:['japonia','ramen','makaron'],sections:[S('BULION',I('Bulion drobiowy',900,'ml'),I('Sos sojowy',60,'ml'),I('Mirin',30,'ml'),I('Imbir',20,'g'),I('Czosnek',2,'szt.')),S('DODATKI',I('Makaron ramen',240,'g'),I('Jajka',2,'szt.'),I('Boczek chashu',180,'g'),I('Dymka',30,'g'),I('Nori',2,'szt.'))],steps:[T('Podgrzej bulion z imbirem i czosnkiem. Dodaj sos sojowy i mirin.'),T('Jajka ugotuj 6,5 minuty, zahartuj i obierz.'),T('Makaron ugotuj osobno zgodnie z instrukcją.'),T('Do misek wlej bulion, dodaj makaron, chashu, jajko, nori i dymkę.')]}),
    blankRecipe({...base,id:'rcp_seed_tiramisu',name:'Tiramisù',category:'cat-desery',traditional:true,origin:'IT',photo:PHOTO.tiramisu,thumb:PHOTO.tiramisu,description:'Klasyczne tiramisù z mascarpone, kawą i kakao.',servings:6,prepTime:30,tags:['deser','kawa','włoskie'],sections:[S('KREM',I('Mascarpone',500,'g'),I('Żółtka',4,'szt.'),I('Cukier',100,'g')),S('MONTAŻ',I('Biszkopty savoiardi',250,'g'),I('Espresso',250,'ml'),I('Kakao',20,'g'))],steps:[T('Utrzyj żółtka z cukrem do jasnej, puszystej masy.'),T('Dodaj mascarpone i wymieszaj do gładkości.'),T('Savoiardi krótko nasączaj espresso.'),T('Układaj warstwami biszkopty i krem.'),T('Schłodź minimum 6 godzin. Przed podaniem oprósz kakao.')]}),
    blankRecipe({...base,id:'rcp_seed_pesto',name:'Pasta al pesto',category:'cat-pasta',traditional:true,origin:'IT',photo:PHOTO.pesto,thumb:PHOTO.pesto,description:'Liguryjska pasta z bazyliowym pesto, Parmigiano i orzeszkami.',servings:2,prepTime:10,cookTime:12,tags:['pesto','bazylia','włoskie'],sections:[S('PESTO',I('Bazylia',50,'g'),I('Parmigiano Reggiano',45,'g'),I('Pecorino Romano',20,'g'),I('Orzeszki piniowe',30,'g'),I('Oliwa extra vergine',100,'ml'),I('Czosnek',1,'szt.')),S('PASTA',I('Trofie lub linguine',200,'g'),I('Sól',20,'g'))],steps:[T('Utrzyj bazylię, czosnek i orzeszki. Dodaj sery i oliwę.'),T('Ugotuj makaron al dente, zachowaj trochę wody z gotowania.'),T('Wymieszaj pesto z makaronem poza ogniem, rozluźniając wodą z gotowania.'),T('Podawaj od razu z dodatkowym Parmigiano.')]}),
    blankRecipe({...base,id:'rcp_seed_pumpkin',name:'Krem z pieczonej dyni',category:'cat-zupy',origin:'PL',photo:PHOTO.soup,thumb:PHOTO.soup,description:'Gładki krem z pieczonej dyni z imbirem, czosnkiem i oliwą.',servings:4,prepTime:15,cookTime:40,temperature:'200 °C',tags:['zupa','dynia','jesień'],sections:[S('',I('Dynia',1000,'g'),I('Cebula',150,'g'),I('Czosnek',3,'szt.'),I('Imbir',15,'g'),I('Bulion warzywny',700,'ml'),I('Oliwa extra vergine',40,'ml'),I('Śmietanka 30%',100,'ml'))],steps:[T('Dynię pokrój, skrop oliwą i piecz z cebulą oraz czosnkiem w 200 °C przez około 30 minut.'),T('Przełóż do garnka, dodaj imbir i bulion.'),T('Gotuj 10 minut, następnie zmiksuj na gładki krem.'),T('Dodaj śmietankę, dopraw solą i pieprzem.')]}),
    blankRecipe({...base,id:'rcp_seed_sushi',name:'Nigiri z łososiem',category:'cat-ryby',traditional:true,origin:'JP',photo:PHOTO.sushi,thumb:PHOTO.sushi,description:'Nigiri z łososiem na zaprawianym ryżu sushi.',servings:2,prepTime:30,cookTime:20,tags:['sushi','łosoś','japonia'],sections:[S('RYŻ',I('Ryż do sushi',200,'g'),I('Woda',240,'ml'),I('Ocet ryżowy',35,'ml'),I('Cukier',12,'g'),I('Sól',4,'g')),S('NIGIRI',I('Łosoś sushi grade',180,'g'),I('Wasabi',10,'g'),I('Sos sojowy',60,'ml'))],steps:[T('Ryż wypłucz do czystej wody i ugotuj.'),T('Wymieszaj ocet, cukier i sól. Zapraw gorący ryż i ostudź.'),T('Łososia pokrój w równe plastry.'),T('Uformuj porcje ryżu, posmaruj odrobiną wasabi i ułóż łososia.')]}),
    blankRecipe({...base,id:'rcp_seed_cheesecake',name:'Sernik nowojorski',category:'cat-desery',origin:'US',photo:PHOTO.cheesecake,thumb:PHOTO.cheesecake,description:'Kremowy pieczony sernik na kruchym spodzie.',servings:10,prepTime:25,cookTime:70,temperature:'160 °C',tags:['sernik','deser','wypiek'],sections:[S('SPÓD',I('Herbatniki',220,'g'),I('Masło',90,'g')),S('MASA',I('Serek śmietankowy',900,'g'),I('Cukier',180,'g'),I('Jajka',4,'szt.'),I('Śmietana 18%',180,'g'),I('Wanilia',5,'ml'),I('Sok z cytryny',15,'ml'))],steps:[T('Herbatniki zmiel, wymieszaj z masłem i dociśnij do formy.'),T('Serek krótko zmiksuj z cukrem. Dodawaj jajka pojedynczo.'),T('Dodaj śmietanę, wanilię i cytrynę. Nie napowietrzaj masy.'),T('Piecz w 160 °C około 65–70 minut.'),T('Wystudź i schłodź minimum 6 godzin.')]}),
    blankRecipe({...base,id:'rcp_seed_focaccia',name:'Focaccia genovese',category:'cat-pieczywo',traditional:true,origin:'IT',photo:PHOTO.focaccia,thumb:PHOTO.focaccia,description:'Wysoka, oliwna focaccia z chrupiącą powierzchnią i miękkim wnętrzem.',servings:8,yieldAmount:900,yieldUnit:'g',prepTime:25,cookTime:22,fermentTime:1440,temperature:'230 °C',bakers:true,tags:['focaccia','pieczywo','fermentacja'],sections:[S('CIASTO',I('Mąka pszenna typ 00',600,'g',{percent:100,flour:true}),I('Woda',420,'g',{percent:70}),I('Sól',15,'g',{percent:2.5}),I('Drożdże świeże',3,'g',{percent:0.5}),I('Oliwa extra vergine',35,'ml')),S('WYKOŃCZENIE',I('Oliwa extra vergine',40,'ml'),I('Rozmaryn',5,'g'),I('Sól morska',5,'g'))],steps:[T('Wymieszaj mąkę, wodę i drożdże. Po kilku minutach dodaj sól i oliwę.'),T('Zostaw do fermentacji w lodówce około 18–24 godzin.'),T('Przenieś na mocno oliwioną blachę i delikatnie rozciągnij.'),T('Po wyrośnięciu zrób palcami wgłębienia. Dodaj oliwę, rozmaryn i sól.'),T('Piecz około 22 minut w 230 °C, aż powierzchnia będzie mocno złota.')]}),
  ];
}

/** Dodaje przykładowe receptury, jeśli ich brakuje (nie nadpisuje edytowanych). */
/** Usuwa stare, automatycznie wygenerowane rekordy biblioteki przed zmianą corpusu. */
async function removeLegacyLibrarySeeds() {
  const legacy=[...state.recipes.values()].filter((r)=>{
    const id=String(r.id||'');
    if(id.startsWith('rcp_lib_')||r.source==='Kucharek — biblioteka startowa') return true;
    if(id.startsWith('rcp_archive_')){
      return (r.updatedAt||0)===(r.createdAt||0);
    }
    return false;
  });
  if(!legacy.length)return 0;
  const hist=(await Promise.all(legacy.map((r)=>db.byIndex('history','recipeId',r.id).catch(()=>[])))).flat();
  const cookHist=(await Promise.all(legacy.map((r)=>db.byIndex('cookHistory','recipeId',r.id).catch(()=>[])))).flat();
  await db.tx(['recipes','history','cookSessions','drafts','cookHistory'],(t)=>{
    legacy.forEach((r)=>{t.delete('recipes',r.id);t.delete('cookSessions',r.id);t.delete('drafts',r.id);});
    hist.forEach((h)=>{if(h&&h.id)t.delete('history',h.id);});
    cookHist.forEach((h)=>{if(h&&h.id)t.delete('cookHistory',h.id);});
  });
  legacy.forEach((r)=>state.recipes.delete(r.id));
  emit('recipes');
  return legacy.length;
}

export async function restoreSeeds({ forceMedia = false } = {}) {
  // seedRecipes() już zawiera całą bibliotekę 1200+. Nie generuj jej drugi raz.
  // Deduplikacja ID gwarantuje też pojedynczy zapis każdej receptury.
  const seeds=[...new Map(seedRecipes().map((r) => [r.id, r])).values()];
  const missing=seeds.filter(r=>!state.recipes.has(r.id));
  const mediaUpdates=seeds.filter(r=>{
    if(!state.recipes.has(r.id)||!r.photo)return false;
    const cur=state.recipes.get(r.id);
    const legacyMedia=/^https:\/\/images\.unsplash\.com\//.test(cur.photo||'');
    const legacyThumb=/^https:\/\/images\\.unsplash\\.com\//.test(cur.thumb||'');
    return !cur.photo || legacyMedia || legacyThumb || (r.id==='rcp_seed_sos'&&cur.photo===PHOTO.soup) || forceMedia;
  }).map(r=>({...state.recipes.get(r.id),photo:r.photo,thumb:r.thumb,updatedAt:Date.now()}));
  const all=[...missing,...mediaUpdates];
  if(!all.length)return 0;
  await db.putMany('recipes',all);
  all.forEach(r=>state.recipes.set(r.id,r));
  emit('recipes');
  return all.length;
}

export { kv };
