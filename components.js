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

function visualKind(r) {
  const text = String(r.name || '').toLowerCase();
  if (/pizza|focaccia|ciasto|chleb|bułk|pieczyw/.test(text)) return 'bakery';
  if (/makaron|pasta|spaghetti|carbonara|lasagn/.test(text)) return 'pasta';
  if (/sałat|warzyw|zupa|sos|krem/.test(text)) return 'fresh';
  return 'dish';
}

export function recipeGraphicData(r) {
  const label = String(r.name || catName(r.category) || 'Receptura').slice(0, 34).replace(/[&<>]/g, '');
  const kind = visualKind(r);
  const title = kind === 'bakery' ? 'PIECZYWO' : kind === 'pasta' ? 'MAKARON' : kind === 'fresh' ? 'WARZYWA · SOSY' : 'RECEPTURA';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17191c"/><stop offset="1" stop-color="#08090b"/></linearGradient><radialGradient id="gl"><stop stop-color="#ffffff" stop-opacity=".16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="800" fill="url(%23bg)"/><circle cx="980" cy="130" r="360" fill="url(%23gl)"/><circle cx="180" cy="700" r="300" fill="#fff" opacity=".035"/><ellipse cx="600" cy="440" rx="300" ry="190" fill="#0b0c0e" stroke="#3a3d42" stroke-width="5"/><ellipse cx="600" cy="430" rx="245" ry="145" fill="#111317" stroke="#292c31" stroke-width="3"/><path d="M420 410c55-75 120-95 180-58 48-48 126-25 168 34 36 51 24 101-28 127-86 42-254 35-319-12-35-25-35-57-1-91z" fill="#22262b"/><circle cx="515" cy="410" r="24" fill="#8d939b"/><circle cx="590" cy="370" r="18" fill="#666b73"/><circle cx="675" cy="423" r="28" fill="#9a9fa6"/><circle cx="720" cy="475" r="15" fill="#5e636a"/><text x="600" y="105" text-anchor="middle" fill="#aeb3ba" font-family="system-ui,sans-serif" font-size="20" font-weight="800" letter-spacing="6">' + title + '</text><text x="600" y="690" text-anchor="middle" fill="#f5f5f2" font-family="system-ui,sans-serif" font-size="48" font-weight="800">' + label + '</text><text x="600" y="735" text-anchor="middle" fill="#8f949c" font-family="system-ui,sans-serif" font-size="18" letter-spacing="3">KUCHAREK</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function ingredientIcon(ing) {
  const n=String(ing?.name||'').toLowerCase();
  let kind='generic';
  if(/mąk|flour|semolin|farin/.test(n))kind='flour';
  else if(/wod|water/.test(n))kind='water';
  else if(/pomidor|tomato/.test(n))kind='tomato';
  else if(/jaj|egg|żółtk/.test(n))kind='egg';
  else if(/ser|cheese|pecorino|parmezan|parmigiano|mozzarella/.test(n))kind='cheese';
  else if(/mięs|wołow|wieprz|kurcz|guancial|boczek|szynk|chashu|meat|beef|pork|chicken/.test(n))kind='meat';
  else if(/ryb|łosoś|tuńczy|sushi|fish|salmon|tuna/.test(n))kind='fish';
  else if(/oliw|olej|oil/.test(n))kind='oil';
  else if(/cebula|onion/.test(n))kind='onion';
  else if(/czosn|garlic/.test(n))kind='garlic';
  else if(/pieprz|pepper/.test(n))kind='pepper';
  else if(/bazyl|pietrusz|oregano|tymian|rozmaryn|herb|zioł/.test(n))kind='herb';
  else if(/cukier|sugar/.test(n))kind='sugar';
  else if(/mleko|milk|śmietan|cream/.test(n))kind='milk';
  else if(/masło|butter/.test(n))kind='butter';
  else if(/cytr|lemon/.test(n))kind='lemon';
  else if(/pieczark|grzyb|mushroom/.test(n))kind='mushroom';
  return h('span',{class:'ingredient-icon ingredient-icon-'+kind,'aria-hidden':'true'},
    h('svg',{class:'ingredient-svg',viewBox:'0 0 48 48',width:30,height:30,focusable:'false'},
      h('use',{href:'./assets/ingredient-icons.svg#'+kind})
    )
  );
}
function fallbackVisual(r) { return recipeGraphicData(r); }

export function recipeVisual(r, cls = '', { hero = false } = {}) {
  const imageSrc = hero ? (r.photo || r.thumb) : (r.thumb || r.photo);
  const legacyVisual = !Array.isArray(r.sections) && !r.servings && !r.photo && !r.thumb && r.category === 'cat-pizza' ? ['assets','start','pizza.svg'].join('/') : '';
  if (legacyVisual) return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: legacyVisual, alt: '' });
  if (imageSrc) return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: imageSrc, alt: hero ? ('Zdjęcie: ' + (r.name || 'receptura')) : '', loading: hero ? 'eager' : 'lazy', decoding: 'async', onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackVisual(r); } });
  return h('img', { class: (hero ? 'hero-photo ' : 'rthumb-img ') + cls + ' recipe-visual', src: fallbackVisual(r), alt: hero ? ('Grafika receptury: ' + (r.name || 'receptura')) : '', loading: hero ? 'eager' : 'lazy', decoding: 'async' });
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
