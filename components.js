/* ==========================================================================
   components.js — wspólne elementy interfejsu (karta receptury, nagłówki sekcji).
   ========================================================================== */
import { h, icon, toast } from './ui.js';
import { navigate } from './router.js';
import { catName, catIcon, ORIGINS, toggleFavorite } from './recipes.js';
import { fmtMinutes, fmtAmount, fmtNum } from './util.js';

export const originOf = (code) => ORIGINS.find((o) => o.code === code);

/** Czas czynny + osobno fermentacja, np. "45 min · ferm. 24 h". */
export function timeText(r) {
  const active = (r.prepTime || 0) + (r.cookTime || 0);
  const parts = [];
  if (active) parts.push(fmtMinutes(active));
  if (r.fermentTime) parts.push('ferm. ' + fmtMinutes(r.fermentTime));
  return parts.join(' · ');
}

export function metaLine(r) {
  const parts = [catName(r.category)];
  if (r.servings) parts.push(`${r.servings} porc.`);
  const t = timeText(r);
  if (t) parts.push(t);
  return parts.join(' · ');
}

/** Gwiazdka + flaga dla receptur tradycyjnych. */
export function tradMark(r) {
  if (!r.traditional) return null;
  const o = originOf(r.origin);
  return h('span', { class: 'trad', title: o ? `Tradycyjna — ${o.name}` : 'Tradycyjna', 'aria-label': o ? `Tradycyjna, ${o.name}` : 'Tradycyjna' },
    icon('star', 16), o ? h('span', { class: 'flag', 'aria-hidden': 'true' }, o.flag) : null);
}

export function heartBtn(r, onToggle) {
  const b = h('button', { type: 'button', class: 'heart' + (r.favorite ? ' on' : ''), 'aria-pressed': !!r.favorite,
    'aria-label': r.favorite ? `Usuń z ulubionych: ${r.name}` : `Dodaj do ulubionych: ${r.name}`,
    onClick: async (e) => {
      e.stopPropagation();
      const next = await toggleFavorite(r.id);
      toast(next.favorite ? 'Dodano do ulubionych' : 'Usunięto z ulubionych');
      if (onToggle) onToggle(next);
    } }, icon('heart', 22));
  return b;
}

const CATEGORY_VISUALS = {
  'cat-pizza': 'assets/start/pizza.svg',
  'cat-pasta': 'assets/start/pasta.svg',
  'cat-pieczywo': 'assets/start/bakery.svg',
  'cat-warzywa': 'assets/start/veg.svg',
};

function fallbackVisual(r) {
  const label = String(r.name || catName(r.category) || 'Kucharek').slice(0, 28).replace(/[&<>]/g, '');
  const emoji = catIcon(r.category);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2b2e33"/><stop offset="1" stop-color="#0e1012"/></linearGradient></defs><rect width="900" height="600" fill="#121316"/><rect x="28" y="28" width="844" height="544" rx="42" fill="url(%23g)"/><text x="450" y="300" text-anchor="middle" font-size="150">' + emoji + '</text><text x="450" y="430" text-anchor="middle" fill="#f4f4f1" font-family="system-ui,sans-serif" font-size="34" font-weight="700">' + label + '</text><text x="450" y="480" text-anchor="middle" fill="#aeb3ba" font-family="system-ui,sans-serif" font-size="20">KUCHAREK</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function recipeVisual(r, cls = '', { hero = false } = {}) {
  const imageSrc = hero ? (r.photo || r.thumb) : (r.thumb || r.photo);
  const categoryVisual = CATEGORY_VISUALS[r.category] || '';
  if (imageSrc) return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: imageSrc, alt: hero ? ('Zdjęcie: ' + (r.name || 'receptura')) : '', loading: hero ? 'eager' : 'lazy', decoding: 'async', onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackVisual(r); } });
  if (categoryVisual) return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: categoryVisual, alt: hero ? ('Grafika: ' + (r.name || catName(r.category))) : '', loading: hero ? 'eager' : 'lazy', decoding: 'async' });
  const label = String(r.name || catName(r.category) || 'Kucharek').slice(0, 28);
  const emoji = catIcon(r.category);
  const bg = hero ? '121316' : '1b1d20';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2b2e33"/><stop offset="1" stop-color="#0e1012"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="28"/></filter></defs><rect width="900" height="600" fill="#' + bg + '"/><circle cx="760" cy="90" r="180" fill="#ffffff" opacity=".05" filter="url(%23b)"/><circle cx="130" cy="520" r="230" fill="#ffffff" opacity=".04" filter="url(%23b)"/><rect x="28" y="28" width="844" height="544" rx="42" fill="url(%23g)" opacity=".72"/><text x="450" y="300" text-anchor="middle" font-size="150">' + emoji + '</text><text x="450" y="430" text-anchor="middle" fill="#f4f4f1" font-family="system-ui,sans-serif" font-size="34" font-weight="700">' + label.replace(/[&<>]/g, '') + '</text><text x="450" y="480" text-anchor="middle" fill="#aeb3ba" font-family="system-ui,sans-serif" font-size="20">KUCHAREK</text></svg>';
  const fallbackSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: fallbackSrc, alt: hero ? ('Grafika: ' + label) : '', loading: hero ? 'eager' : 'lazy', decoding: 'async' });
}

function thumbEl(r, cls = '') {
  return recipeVisual(r, cls);
}

/** Karta receptury (lista, ekran startowy). */
export function recipeCard(r, { onFav } = {}) {
  return h('div', { class: 'rcard' + (r.traditional ? ' trad-card' : '') },
    h('a', { class: 'rcard-main', href: '#/recipe/' + encodeURIComponent(r.id), 'aria-label': r.name,
      onClick: (e) => { e.preventDefault(); navigate('/recipe/' + encodeURIComponent(r.id)); } },
      thumbEl(r),
      h('div', { class: 'rbody' },
        h('div', { class: 'rtitle' }, tradMark(r), h('span', { class: 'rname' }, r.name || 'Bez nazwy')),
        h('div', { class: 'rmeta' }, metaLine(r)))),
    heartBtn(r, onFav));
}

export function sectionHead(title, { action, onAction, count } = {}) {
  return h('div', { class: 'sechead' },
    h('h2', null, title, count != null ? h('span', { class: 'count' }, String(count)) : null),
    action ? h('button', { type: 'button', class: 'linkbtn', onClick: onAction }, action, icon('right', 16)) : null);
}

/** Ilość składnika do wyświetlenia: { num: '1000', unit: 'g' } albo { num: '', unit: 'do smaku' }. */
export function qtyParts(ing) {
  if (ing.amount == null || !Number.isFinite(ing.amount)) return { num: '', unit: 'do smaku' };
  return { num: fmtAmount(ing.amount), unit: ing.unit === 'szt.' ? 'szt.' : ing.unit || '' };
}

/** Receptura jako czysty tekst (kopiowanie, udostępnianie). */
export function recipeToText(r) {
  const L = [r.name];
  const meta = [];
  if (r.servings) meta.push(`Porcje: ${r.servings}`);
  if (r.yieldAmount) meta.push(`Wydajność: ${fmtAmount(r.yieldAmount)} ${r.yieldUnit}`);
  if (r.prepTime) meta.push(`Przygotowanie: ${fmtMinutes(r.prepTime)}`);
  if (r.cookTime) meta.push(`Gotowanie: ${fmtMinutes(r.cookTime)}`);
  if (r.fermentTime) meta.push(`Fermentacja: ${fmtMinutes(r.fermentTime)}`);
  if (r.temperature) meta.push(`Temperatura: ${r.temperature}`);
  if (meta.length) L.push(meta.join(' · '));
  if (r.description) L.push('', r.description);
  L.push('', 'SKŁADNIKI');
  r.sections.forEach((s) => {
    if (s.name) L.push('', s.name + ':');
    s.ingredients.forEach((i) => {
      const q = qtyParts(i);
      L.push(`- ${i.name}${q.num || q.unit ? ' — ' + [q.num, q.unit].filter(Boolean).join(' ') : ''}${i.percent != null ? ` (${fmtNum(i.percent, 2)}%)` : ''}`);
    });
  });
  if (r.steps.length) { L.push('', 'PRZYGOTOWANIE'); r.steps.forEach((s, n) => L.push(`${n + 1}. ${s.text}`)); }
  if (r.notes) L.push('', 'UWAGI', r.notes);
  if (r.sourceUrl || r.source) L.push('', `Źródło: ${[r.source, r.sourceUrl].filter(Boolean).join(' — ')}`);
  return L.join('\n');
}
