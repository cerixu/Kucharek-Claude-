/* ==========================================================================
   app.js — start aplikacji: baza, ustawienia, motyw, nawigacja dolna,
   obsługa klawiatury iOS (visualViewport), trasy, service worker.
   ========================================================================== */
import { openDB } from './db.js';
import { loadAll, state, subscribe, getSetting } from './recipes.js';
import { h, icon, toast, $, openSheet, button } from './ui.js';
import { route, startRouter, navigate } from './router.js';
import { registerSW, requestPersist } from './pwa.js';
import { initTimers, mountTimerPill, openTimersSheet } from './timers.js';

import { startView } from './views-start.js';
import { recipesView } from './views-recipes.js';
import { detailView } from './views-detail.js';
import { editorView } from './views-editor.js';
import { cookView } from './views-cook.js';
import { calcView } from './views-calc.js';
import { shoppingView } from './shopping.js';
import { importView } from './views-import.js';
import { settingsView } from './views-settings.js';
import { historyView } from './views-history.js';
import { inventoryView } from './views-inventory.js';
import { cookHubView } from './views-cook-hub.js';

let proModulePromise;
const loadProModule = () => proModulePromise ||= import('./views-pro-fixed.js');

const root = document.documentElement;
const bootStartedAt = performance.now();

/* ---------- Motyw, tryb, rozmiary ---------- */

const BG = { light: '#eef0ee', dark: '#0a0d0e' };
const dark = matchMedia('(prefers-color-scheme: dark)');

function applyAppearance() {
  const theme = getSetting('theme'), tap = getSetting('tapSize'), ts = getSetting('textScale');
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-tap', tap);
  root.style.setProperty('--ts', String((ts || 100) / 100));
  try {
    localStorage.setItem('k:theme', theme);
    localStorage.setItem('k:tap', tap); localStorage.setItem('k:ts', String(ts));
  } catch (_) { /* tryb prywatny */ }
  // Kolor paska systemowego zgodny z faktycznie wybranym motywem (nie tylko z systemowym).
  const eff = theme === 'auto' ? (dark.matches ? 'dark' : 'light') : theme;
  const color = BG[eff];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.setAttribute('content', color); m.removeAttribute('media'); });
}
dark.addEventListener && dark.addEventListener('change', () => { if (getSetting('theme') === 'auto') applyAppearance(); });

/* ---------- Dolna nawigacja ---------- */

const TABS = [
  ['recipes', 'Receptury', 'book', '/recipes'],
  ['inventory', 'Magazyn', 'list', '/inventory'],
  ['add', 'Dodaj', 'plus', null],
  ['calc', 'Kalkulatory', 'calc', '/calc'],
  ['more', 'Więcej', 'more', null],
];

function openQuickAdd() {
  openSheet({ title: 'Dodaj', variant: 'sheet', body: h('div', { class: 'more-grid quick-add-grid' },
    button('Nowa receptura', { icon: 'plus', block: true, onClick: () => navigate('/new', { replace: true }) }),
    button('Importuj recepturę', { icon: 'upload', block: true, onClick: () => navigate('/import', { replace: true }) }),
    button('Skanuj kod produktu', { icon: 'barcode', block: true, onClick: () => navigate('/inventory', { replace: true }) })
  ) });
}

function openMoreMenu() {
  openSheet({
    title: 'Więcej',
    variant: 'sheet',
    body: h('div', { class: 'more-grid' },
      button('Menu główne', { icon: 'home', block: true, onClick: () => navigate('/', { replace: true }) }),
      button('Historia gotowania', { icon: 'history', block: true, onClick: () => navigate('/history', { replace: true }) }),
      button('Zakupy', { icon: 'cart', block: true, onClick: () => navigate('/shopping', { replace: true }) }),
      button('Centrum PRO', { icon: 'coins', block: true, onClick: () => navigate('/pro', { replace: true }) }),
      button('Ustawienia', { icon: 'sliders', block: true, onClick: () => navigate('/settings', { replace: true }) })
    ),
  });
}

function buildTabbar() {
  const bar = $('#tabbar');
  bar.replaceChildren(...TABS.map(([id, label, ico, path]) => {
    if (id === 'add') {
      return h('button', { type: 'button', class: 'tab tab-add', dataset: { tab: id }, 'aria-label': 'Dodaj', onClick: openQuickAdd },
        h('span', { class: 'tab-ico' }, icon('plus', 26)), h('span', { class: 'tab-label' }, 'Dodaj'));
    }
    if (id === 'more') {
      return h('button', {
        type: 'button',
        class: 'tab',
        dataset: { tab: id },
        'aria-label': label,
        'aria-haspopup': 'dialog',
        onClick: openMoreMenu,
      },
        h('span', { class: 'tab-ico' }, icon(ico, 23)),
        h('span', { class: 'tab-label' }, label));
    }
    return h('a', {
      href: '#' + path,
      class: 'tab',
      dataset: { tab: id },
      'aria-label': label,
      onClick: (e) => { e.preventDefault(); navigate(path, { replace: true }); },
    },
      h('span', { class: 'tab-ico' }, icon(ico, 23),
      ),
      h('span', { class: 'tab-label' }, label));
  }));
}

function setActiveTab(meta) {
  document.body.classList.toggle('no-tabs', meta.tabs === false);
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === meta.tab;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
}

/* ---------- Klawiatura ekranowa i rozmiar widoku (iOS) ---------- */

function watchViewport() {
  const vv = window.visualViewport;
  const update = () => {
    if (!vv) return;
    const kb = window.innerHeight - vv.height > 150;
    document.body.classList.toggle('kb-open', kb);
    if (kb) {
      root.style.setProperty('--app-h', vv.height + 'px');
      root.style.setProperty('--vv-top', vv.offsetTop + 'px');
    } else {
      root.style.removeProperty('--app-h');
      root.style.removeProperty('--vv-top');
    }
  };
  if (vv) { vv.addEventListener('resize', update); vv.addEventListener('scroll', update); }
  window.addEventListener('orientationchange', () => setTimeout(update, 250));
  window.addEventListener('resize', update);
  // Pole, w którym piszemy, zawsze ma być widoczne nad klawiaturą.
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement) || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    setTimeout(() => { try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { /* */ } }, 320);
  });
  // Safari↔aplikacja: po powrocie odśwież wymiary.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(update, 100); });
  window.addEventListener('pageshow', () => setTimeout(update, 50));
  update();
}

/* ---------- Offline ---------- */

function watchNetwork() {
  const set = () => root.classList.toggle('offline', !navigator.onLine);
  window.addEventListener('offline', () => { set(); toast('Brak sieci — aplikacja działa normalnie offline'); });
  window.addEventListener('online', () => { set(); toast('Połączenie wróciło'); });
  set();
}

/* ---------- Trasy ---------- */

route('/', () => startView(), { tab: null });
route('/recipes', (p, q) => recipesView(q), { tab: 'recipes' });
route('/history', () => historyView(), { tab: 'more' });
route('/recipe/:id', (p) => detailView(p), { tab: 'recipes' });
route('/edit/:id', (p) => editorView(p), { tab: 'recipes', tabs: false });
route('/new', (p, q) => editorView({ id: null }, q), { tab: 'recipes', tabs: false });
route('/cook/:id', (p) => cookView(p), { tab: 'cook', tabs: false });
route('/import', (p, q) => importView(q), { tab: 'recipes' });
route('/calc', () => calcView({}), { tab: 'more' });
route('/calc/:kind', (p, q) => calcView(p, q), { tab: 'more' });
route('/shopping', () => shoppingView(), { tab: 'more' });
route('/cook', () => cookHubView(), { tab: 'cook' });
route('/inventory', () => inventoryView(), { tab: 'inventory' });
route('/pro', async () => {
  const { proView } = await loadProModule();
  return proView();
}, { tab: 'more' });
route('/settings', () => settingsView(), { tab: 'more' });

/* ---------- Start ---------- */

function fatal(err) {
  console.error(err);
  const bootEl = $('#boot');
  if (bootEl) bootEl.remove();
  $('#view').replaceChildren(h('div', { class: 'screen' }, h('div', { class: 'scroll' }, h('div', { class: 'content' },
    h('div', { class: 'empty' }, h('div', { class: 'empty-emoji' }, '⚠️'), h('h2', null, 'Nie mogę otworzyć bazy danych'),
      h('p', { class: 'muted' }, 'Kucharek zapisuje dane lokalnie (IndexedDB). Sprawdź, czy przeglądarka nie działa w trybie prywatnym ani nie blokuje pamięci witryny, i uruchom ponownie.'),
      h('p', { class: 'muted small' }, String(err && err.message || err)))))));
}

async function boot() {
  try {
    await Promise.race([
      (async () => { await openDB(); await loadAll(); })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Start aplikacji trwa zbyt długo. IndexedDB może być zablokowane przez starą kartę aplikacji.')), 30000))
    ]);
  } catch (e) { fatal(e); return; }

  applyAppearance();
  subscribe((type) => {
    if (type === 'settings') applyAppearance();
  });
  buildTabbar();
  initTimers();
  const appHost = document.querySelector('#app');
  if (appHost) mountTimerPill(appHost, () => openTimersSheet());
  watchViewport();
  watchNetwork();
  startRouter($('#view'), (path, meta) => { setActiveTab(meta); });
  const bootEl = $('#boot');
  if (bootEl) { bootEl.classList.add('gone'); setTimeout(() => bootEl.remove(), 350); }

  // Pamięć trwała i cięższy moduł PRO nie konkurują z pierwszym renderem.
  setTimeout(() => requestPersist().catch(() => {}), 1200);
  registerSW();
  const deferPro = (cb) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(cb, { timeout: 2500 });
    } else {
      setTimeout(cb, 1200);
    }
  };
  deferPro(() => loadProModule().catch(() => {}));
  window.__kucharekPerf = Object.freeze({
    bootMs: Math.round(performance.now() - bootStartedAt),
    recipeCount: state.recipes.size,
    readyAt: performance.now()
  });
  window.__kucharek = { state, ready: true };
}

boot();
