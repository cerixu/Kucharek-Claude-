/* ==========================================================================
   views-cook.js — tryb GOTUJĘ: duże checkboxy składników i kroków (postęp
   zapisuje się w IndexedDB), minutnik z dźwiękiem, przeliczanie, uwagi,
   blokada wygaszania ekranu (Wake Lock).
   ========================================================================== */
import { h, icon, screen, button, iconBtn, toast, openSheet, confirmDialog, numInput, textArea, field, emptyState } from './ui.js';
import { navigate, goBack } from './router.js';
import { getRecipe, patchRecipe, getSetting } from './recipes.js';
import { recordCook } from './history.js';
import { db } from './db.js';
import { scaleRecipe, factorFromServings } from './calculator.js';
import { qtyParts, ingredientIcon } from './components.js';
import { fmtNum, fmtClock, debounce, parseNum } from './util.js';
import { consumeRecipeIngredients } from './inventory.js';
import { addItems, addLowStockToShopping } from './shopping.js';
import { openRecipeAiSheet } from './views-ai.js';

/* ---------- Minutnik (poziom modułu — działa też po wyjściu z ekranu) ---------- */

let timer = null;                 // { end, total, label, done }
let tickHandle = null;
let audioCtx = null;
const subs = new Set();

function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) { /* brak audio */ }
}

function beep(times = 6) {
  ensureAudio();
  if (audioCtx) {
    const t0 = audioCtx.currentTime;
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = i % 2 ? 988 : 784;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.32);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.32 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.32 + 0.28);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0 + i * 0.32); o.stop(t0 + i * 0.32 + 0.3);
    }
  }
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); } catch (_) { /* */ }
}

function tick() {
  if (!timer) return;
  if (!timer.done && Date.now() >= timer.end) {
    timer.done = true;
    beep();
    toast(`Minutnik: koniec${timer.label ? ' — ' + timer.label : ''}!`, { sticky: true, action: { label: 'OK', fn: () => stopTimer() } });
  }
  subs.forEach((f) => f());
}

export function startTimer(seconds, label = '') {
  ensureAudio();   // musi nastąpić po geście użytkownika (iOS)
  stopTimer(true);
  timer = { end: Date.now() + seconds * 1000, total: seconds, label, done: false };
  tickHandle = setInterval(tick, 250);
  tick();
}
export function stopTimer(silent) {
  clearInterval(tickHandle); tickHandle = null; timer = null;
  if (!silent) subs.forEach((f) => f());
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });

/* ---------- Widok ---------- */

const STEP_TIME = /(\d+(?:[.,]\d+)?)\s*(?:-\s*\d+\s*)?(min(?:ut\w*)?|godz(?:in\w*)?|h|s(?:ek(?:und\w*)?)?)\b/i;

function stepTimer(text) {
  const m = text.match(STEP_TIME);
  if (!m) return null;
  const n = parseNum(m[1]);
  if (!(n > 0)) return null;
  const u = m[2].toLowerCase();
  const sec = u.startsWith('min') ? n * 60 : u.startsWith('g') || u === 'h' ? n * 3600 : n;
  if (sec < 10 || sec > 6 * 3600) return null;
  return { sec: Math.round(sec), label: m[0] };
}

export function cookView({ id }) {
  const r0 = getRecipe(id);
  if (!r0) {
    const s = screen({ title: 'Gotuję', left: iconBtn('left', 'Wstecz', () => goBack('/recipes')) },
      emptyState('🤷', 'Nie ma takiej receptury', '', button('Receptury', { kind: 'primary', onClick: () => navigate('/recipes', { replace: true }) })));
    return { el: s.el };
  }

  let prog = { ing: {}, steps: {}, factor: 1, tab: 'ing', ts: 1.15, inventoryConsumedAt: 0, inventoryConsumptionId: '' };
  let loaded = false;
  const base = () => getRecipe(id) || r0;
  const view = () => scaleRecipe(base(), prog.factor || 1);
  const saveProg = debounce(() => { db.put('cookSessions', { ...prog, recipeId: id, updatedAt: Date.now() }).catch(() => {}); }, 300);

  const s = screen({ title: r0.name, left: iconBtn('left', 'Wróć do receptury', () => goBack('/recipe/' + id)), cls: 'cook',
    right: h('div', { class: 'row' },
      h('button', { type: 'button', class: 'iconbtn txt', 'aria-label': 'Mniejszy tekst', onClick: () => setTs(-0.1) }, 'A−'),
      h('button', { type: 'button', class: 'iconbtn txt big', 'aria-label': 'Większy tekst', onClick: () => setTs(0.1) }, 'A+'),
      iconBtn('more', 'Więcej', () => openMore())) });
  const progress = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { class: 'bar' }));
  const progressText = h('span', { class: 'muted small num' });
  const tabs = h('div', { class: 'cook-tabs' });
  s.top.append(h('div', { class: 'cook-sub' }, tabs, h('div', { class: 'row between' }, progressText), progress));

  const timerBar = h('div', { class: 'timerbar', hidden: true });
  const currentStepText = () => s.content.querySelector('.cook-row.step.current .cook-step')?.textContent?.trim() || '';
  const foot = h('div', { class: 'cookbar' },
    button('AI', { icon: 'sparkle', onClick: () => openRecipeAiSheet({ openSheet, recipe: view(), currentStep: currentStepText() }) }),
    button('Minutnik', { icon: 'timer', onClick: () => openTimerSheet() }),
    button('Przelicz', { icon: 'swap', onClick: () => openScale() }),
    button('Zakończ', { icon: 'check', kind: 'primary', onClick: () => finish() }));
  s.el.append(timerBar, foot);

  function setTs(d) {
    prog.ts = Math.min(1.8, Math.max(0.9, Math.round((prog.ts + d) * 10) / 10));
    s.el.style.setProperty('--cook-ts', String(prog.ts));
    saveProg();
  }

  /* ----- Treść ----- */

  const counts = () => {
    const r = view();
    const ings = r.sections.flatMap((x) => x.ingredients).filter((i) => i.name);
    const di = ings.filter((i) => prog.ing[i.id]).length;
    const ds = r.steps.filter((st) => prog.steps[st.id]).length;
    return { ni: ings.length, di, ns: r.steps.length, ds };
  };

  function paintProgress() {
    const c = counts();
    const total = c.ni + c.ns, done = c.di + c.ds;
    const pct = total ? Math.round((done / total) * 100) : 0;
    progress.firstChild.style.width = pct + '%';
    progress.setAttribute('aria-valuenow', pct);
    progressText.textContent = `Składniki ${c.di}/${c.ni} · Kroki ${c.ds}/${c.ns}`;
    tabs.replaceChildren(...[['ing', 'Składniki'], ['steps', 'Kroki'], ['notes', 'Uwagi']].map(([k, l]) =>
      h('button', { type: 'button', class: 'ctab' + (prog.tab === k ? ' on' : ''), 'aria-pressed': prog.tab === k, onClick: () => { prog.tab = k; saveProg(); paint(); s.scroll.scrollTop = 0; } }, l)));
  }

  function toggle(map, key, rowEl) {
    map[key] = !map[key];
    if (!map[key]) delete map[key];
    saveProg();
    rowEl.classList.toggle('on', !!map[key]);
    rowEl.setAttribute('aria-checked', !!map[key]);
    paintProgress();
    if (prog.tab === 'steps') markCurrent();
  }

  function checkRow(key, map, inner, cls = '') {
    const row = h('div', { class: `cook-row ${cls} ${map[key] ? 'on' : ''}`, role: 'checkbox', tabindex: '0', 'aria-checked': !!map[key] },
      h('span', { class: 'cbox' }, icon('check', 22)), inner);
    row.addEventListener('click', (e) => { if (e.target.closest('.step-timer')) return; toggle(map, key, row); });
    row.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(map, key, row); } });
    return row;
  }

  function markCurrent() {
    const rows = [...s.content.querySelectorAll('.cook-row.step')];
    let found = false;
    rows.forEach((row) => { const cur = !found && !row.classList.contains('on'); if (cur) found = true; row.classList.toggle('current', cur); });
  }

  function ingTab(r) {
    const kids = [];
    r.sections.forEach((sec) => {
      const list = sec.ingredients.filter((i) => i.name);
      if (!list.length) return;
      if (sec.name) kids.push(h('div', { class: 'tape' }, sec.name));
      list.forEach((i) => {
        const q = qtyParts(i);
        kids.push(checkRow(i.id, prog.ing, h('span', { class: 'cook-text' },
          ingredientIcon(i),
          h('span', { class: 'cook-name' }, i.name),
          h('span', { class: 'cook-qty' }, h('span', { class: 'amt num' }, q.num), h('span', { class: 'unit' }, q.unit)))));
      });
    });
    if (!kids.length) kids.push(h('p', { class: 'muted' }, 'Brak składników.'));
    return h('div', { class: 'cook-list' }, kids);
  }

  function stepsTab(r) {
    if (!r.steps.length) return h('p', { class: 'muted' }, 'Brak kroków. Dodaj je w edytorze.');
    return h('div', { class: 'cook-list' }, r.steps.map((st, n) => {
      const t = stepTimer(st.text);
      return checkRow(st.id, prog.steps, h('span', { class: 'cook-text' },
        h('span', { class: 'cook-step-n num' }, String(n + 1)),
        h('span', { class: 'cook-step' }, st.text),
        t ? h('button', { type: 'button', class: 'chip step-timer', 'aria-label': `Uruchom minutnik: ${t.label}`, onClick: (e) => { e.stopPropagation(); startTimer(t.sec, `krok ${n + 1}`); toast(`Minutnik: ${t.label}`); } }, icon('timer', 16), t.label) : null), 'step');
    }));
  }

  let notesEl = null, notesDirty = false;
  const saved = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const notesSave = debounce(async (v) => {
    await patchRecipe(id, { notes: v }, { touch: true });
    notesDirty = false; saved.textContent = 'Zapisano';
    setTimeout(() => { if (saved.textContent === 'Zapisano') saved.textContent = ''; }, 1500);
  }, 500);
  function notesTab() {
    notesEl = textArea({ value: base().notes || '', label: 'Własne uwagi', rows: 6, placeholder: 'Notuj w trakcie: zmiany, czasy, wrażenia…', onInput: (v) => { notesDirty = true; saved.textContent = '…'; notesSave(v); } });
    return h('div', { class: 'stack' }, h('div', { class: 'row between' }, h('h3', { class: 'group-title' }, 'Własne uwagi'), saved), notesEl);
  }

  function paint() {
    paintProgress();
    const r = view();
    let body;
    if (prog.tab === 'steps') body = stepsTab(r);
    else if (prog.tab === 'notes') body = notesTab();
    else body = ingTab(r);
    const kids = [];
    if ((prog.factor || 1) !== 1) kids.push(h('div', { class: 'banner info small', role: 'status' }, h('strong', null, `Przeliczone ×${fmtNum(prog.factor, 3)}`), h('button', { type: 'button', class: 'linkbtn', onClick: () => { prog.factor = 1; saveProg(); paint(); } }, 'Reset')));
    kids.push(body);
    s.content.replaceChildren(...kids);
    if (prog.tab === 'steps') markCurrent();
    if (notesEl) notesEl._fit && requestAnimationFrame(() => notesEl._fit());
  }

  /* ----- Arkusze ----- */

  function openScale() {
    const r = base();
    let servings = r.servings ? r.servings * (prog.factor || 1) : null;
    const out = h('div', { class: 'preview-line' });
    const apply = (k) => { prog.factor = k; saveProg(); paint(); };
    const chips = [0.5, 1, 2, 3, 4].map((k) => h('button', { type: 'button', class: 'chip' + ((prog.factor || 1) === k ? ' on' : ''), onClick: () => { apply(k); sh.close(); } }, '×' + String(k).replace('.', ',')));
    const sh = openSheet({
      title: 'Przelicz w trakcie gotowania', variant: 'sheet',
      body: h('div', { class: 'stack' }, h('div', { class: 'chips wrap' }, chips),
        r.servings ? field('Liczba porcji', numInput({ value: servings, label: 'Liczba porcji', dec: 1, onInput: (v) => { servings = v; const k = factorFromServings(r, v); out.textContent = k ? `Współczynnik ×${fmtNum(k, 3)}` : ''; } })) : null, out),
      actions: [{ label: 'Anuluj', kind: 'ghost' }, { label: 'Przelicz', kind: 'primary', onClick: () => {
        const k = r.servings ? factorFromServings(r, servings) : null;
        if (!k) { toast('Podaj liczbę porcji albo wybierz mnożnik', { type: 'error' }); return false; }
        apply(k);
      } }],
    });
  }

  function openTimerSheet() {
    let minutes = null;
    const presets = [[1, '1 min'], [3, '3 min'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min'], [60, '1 h']];
    const sh = openSheet({
      title: 'Minutnik', variant: 'sheet',
      body: h('div', { class: 'stack' },
        h('div', { class: 'preset-grid' }, presets.map(([m, l]) => h('button', { type: 'button', class: 'btn', onClick: () => { startTimer(m * 60, ''); sh.close(); } }, l))),
        field('Własny czas (minuty)', numInput({ value: null, label: 'Minuty', dec: 2, placeholder: 'np. 7,5', onInput: (v) => { minutes = v; } })),
        h('p', { class: 'muted small' }, 'Dźwięk zadziała, gdy aplikacja jest na ekranie. Dlatego ekran nie gaśnie podczas gotowania (można wyłączyć w Ustawieniach).')),
      actions: [{ label: 'Anuluj', kind: 'ghost' }, { label: 'Start', kind: 'primary', icon: 'timer', onClick: () => {
        if (!(minutes > 0)) { toast('Wpisz liczbę minut', { type: 'error' }); return false; }
        startTimer(Math.round(minutes * 60), '');
      } }],
    });
  }

  function openMore() {
    const sh = openSheet({
      title: 'Gotuję', variant: 'sheet',
      body: h('div', { class: 'menu' },
        button('Wyczyść zaznaczenia', { icon: 'refresh', block: true, onClick: async () => { sh.close(); prog.ing = {}; prog.steps = {}; saveProg(); paint(); toast('Wyczyszczono postęp'); } }),
        button('Edytuj recepturę', { icon: 'edit', block: true, onClick: () => { sh.close(); navigate('/edit/' + id); } }),
        button('Wróć do receptury', { icon: 'left', block: true, onClick: () => { sh.close(); goBack('/recipe/' + id); } })),
    });
  }

  async function finish() {
    const c = counts();
    const all = c.di === c.ni && c.ds === c.ns;
    if (!all) {
      const ok = await confirmDialog({ title: 'Zakończyć gotowanie?', message: 'Nie wszystko jest odhaczone. Postęp zostanie zapamiętany, więc możesz wrócić do tego miejsca.', confirmText: 'Zakończ' });
      if (!ok) return;
    }
    if (all) {
      const cookEventId = prog.cookHistoryId || `cook:${id}:${Date.now()}`;
      prog.cookHistoryId = cookEventId;
    }
    if (all && !prog.inventoryConsumedAt) {
      const autoConsumption = getSetting('inventoryAutoConsumption') !== false;
      const useStock = autoConsumption ? true : await confirmDialog({
        title: 'Odjąć składniki z magazynu?',
        message: 'Aplikacja odejmie od Magazynu ilości użyte w tej recepturze.',
        confirmText: 'Odjąć',
      });
      if (useStock) {
        const sourceId = prog.inventoryConsumptionId || `cook:${id}:${Date.now()}`;
        prog.inventoryConsumptionId = sourceId;
        const result = await consumeRecipeIngredients(base(), prog.factor || 1, { sourceId });
        prog.inventoryConsumedAt = Date.now();
        const autoShopping = getSetting('inventoryAutoShopping') !== false;
        if (result.shortages.length) {
          if (autoShopping) {
            await addItems(result.shortages.map((x) => ({ name: x.name, amount: x.missing, unit: x.unit, recipeId: id, recipeName: r0.name })));
            toast('Magazyn zaktualizowany. Braki dodane do zakupów 📦');
          } else {
            const addMissing = await confirmDialog({
              title: 'Braki w magazynie',
              message: result.shortages.map((x) => `${x.name}: brakuje ${fmtNum(x.missing, 3)} ${x.unit}`).join(' · '),
              confirmText: 'Dodaj do zakupów',
            });
            if (addMissing) {
              await addItems(result.shortages.map((x) => ({ name: x.name, amount: x.missing, unit: x.unit, recipeId: id, recipeName: r0.name })));
              toast('Braki dodano do zakupów');
            }
          }
        } else if (autoShopping) {
          const low = await addLowStockToShopping();
          toast(low.count ? 'Zużycie zapisane w magazynie 📦 · Niskie stany dodane do zakupów 🛒' : (autoConsumption ? 'Zużycie zapisane w magazynie 📦' : 'Magazyn zaktualizowany 📦'));
        } else {
          toast(autoConsumption ? 'Zużycie zapisane w magazynie 📦' : 'Magazyn zaktualizowany 📦');
        }
        saveProg.flush();
      }
    }
    if (all) {
      const cookedAt = Date.now();
      const cookEventId = prog.cookHistoryId || `cook:${id}:${cookedAt}`;
      const cookedRecipe = base();
      const cookedServings = Number(view().servings || cookedRecipe.servings || 1);
      const cookedFactor = Number(prog.factor || 1);
      await recordCook({
        id: cookEventId,
        recipeId: id,
        recipeName: cookedRecipe.name,
        at: cookedAt,
        factor: cookedFactor,
        servings: cookedServings,
        inventoryConsumed: !!prog.inventoryConsumedAt,
      });
      await patchRecipe(id, {
        lastCookedAt: cookedAt,
        cookCount: Number(cookedRecipe.cookCount || 0) + 1,
      }, { touch: true });
      prog.ing = {}; prog.steps = {}; prog.tab = 'ing'; prog.inventoryConsumedAt = 0; prog.inventoryConsumptionId = ''; prog.cookHistoryId = ''; saveProg.flush(); toast('Smacznego! 👨‍🍳'); }
    goBack('/recipe/' + id);
  }

  /* ----- Minutnik: pasek ----- */

  function paintTimer() {
    if (!timer) { timerBar.hidden = true; return; }
    const left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
    timerBar.hidden = false;
    timerBar.classList.toggle('done', timer.done);
    timerBar.replaceChildren(icon('timer', 22),
      h('span', { class: 'timer-time num' }, timer.done ? 'Koniec!' : fmtClock(left)),
      timer.label ? h('span', { class: 'muted small' }, timer.label) : null,
      h('span', { class: 'grow' }),
      timer.done ? null : button('+1 min', { sm: true, onClick: () => { timer.end += 60000; paintTimer(); } }),
      button(timer.done ? 'OK' : 'Stop', { sm: true, kind: timer.done ? 'primary' : 'ghost', onClick: () => stopTimer() }));
  }
  subs.add(paintTimer);

  /* ----- Wake Lock ----- */

  let lock = null;
  async function acquire() {
    if (!getSetting('keepAwake') || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (_) { /* odmowa */ }
  }
  const onVis = () => { if (document.visibilityState === 'visible' && !lock) acquire(); };
  document.addEventListener('visibilitychange', onVis);

  /* ----- Start ----- */

  s.el.style.setProperty('--cook-ts', String(prog.ts));
  paint(); paintTimer();
  db.get('cookSessions', id).then((p) => {
    if (p && typeof p === 'object') {
      prog = { ing: {}, steps: {}, factor: 1, tab: 'ing', ts: 1.15, inventoryConsumedAt: 0, inventoryConsumptionId: '', ...p };
      s.el.style.setProperty('--cook-ts', String(prog.ts));
      const c = counts();
      if (p.tab === undefined && c.ni && c.di === c.ni) prog.tab = 'steps';
    }
    loaded = true;
    paint();
  }).catch(() => { loaded = true; });
  acquire();

  return {
    el: s.el,
    destroy: () => {
      subs.delete(paintTimer);
      document.removeEventListener('visibilitychange', onVis);
      if (loaded) saveProg.flush();
      if (notesDirty && notesEl) notesSave.flush(notesEl.value);
      if (lock) { try { lock.release(); } catch (_) { /* */ } lock = null; }
    },
  };
}
