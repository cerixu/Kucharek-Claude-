/* ==========================================================================
   views-start.js — ekran Start: nagłówek, szybkie akcje, ostatnie, ulubione.
   ========================================================================== */
import { h, icon, screen, emptyState, button } from './ui.js';
import { navigate } from './router.js';
import { state, subscribe, listRecipes, getSetting } from './recipes.js';
import { recipeCard, sectionHead } from './components.js';
import { pendingCount } from './shopping.js';
import { backupDue, daysSinceBackup } from './backup.js';

const plural = (n) => `${n} ${n === 1 ? 'receptura' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'receptury' : 'receptur'}`;
const HEADLINE = '„No Elo kurwa, Kucharzyno za pięć złotych👨‍🍳”';

export function startView() {
  const s = screen({ title: 'Kucharzyna', cls: 'start' });
  const c = s.content;
  let unsub;

  const tile = (label, ico, path, { primary = false, badge = 0 } = {}) =>
    h('a', { class: 'tile' + (primary ? ' primary' : ''), href: '#' + path, onClick: (e) => { e.preventDefault(); navigate(path); } },
      h('span', { class: 'tile-ico' }, icon(ico, 26), badge ? h('span', { class: 'badge' }, String(badge > 99 ? '99+' : badge)) : null),
      h('span', { class: 'tile-label' }, label));

  function paint() {
    const all = listRecipes();
    const recent = all.filter((r) => r.lastOpenedAt).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 5);
    const favs = all.filter((r) => r.favorite).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)).slice(0, 6);
    const n = pendingCount();

    const kids = [
      h('div', { class: 'hero' },
        h('p', { class: 'eyebrow' }, 'Kucharzyna'),
        h('h2', { class: 'hero-line' }, HEADLINE),
        h('p', { class: 'muted hero-sub' }, `${plural(all.length)} w telefonie · działa bez internetu`)),
      h('div', { class: 'tiles' },
        tile('Nowa receptura', 'plus', '/new', { primary: true }),
        tile('Moje receptury', 'book', '/recipes'),
        tile('Ostatnio używane', 'clock', '/recipes?f=recent'),
        tile('Ulubione', 'heart', '/recipes?f=fav'),
        tile('Kalkulatory', 'calc', '/calc'),
        tile('Lista zakupów', 'cart', '/shopping', { badge: n }),
        tile('Magazyn', 'list', '/inventory')),
    ];

    if (backupDue()) {
      const d = daysSinceBackup();
      kids.push(h('div', { class: 'notice' },
        icon('download', 22),
        h('div', { class: 'notice-text' }, h('strong', null, 'Zrób kopię zapasową'),
          h('span', { class: 'muted' }, d == null ? 'Jeszcze jej nie zrobiono — dane są tylko w tym telefonie.' : `Ostatnia: ${d} dni temu.`)),
        button('Kopia', { sm: true, onClick: () => navigate('/settings') })));
    }

    if (!all.length) {
      kids.push(emptyState('📒', 'Pusto w książce', 'Dodaj pierwszą recepturę albo wklej przepis z internetu.',
        button('Nowa receptura', { kind: 'primary', icon: 'plus', onClick: () => navigate('/new') }),
        button('Importuj', { icon: 'upload', onClick: () => navigate('/import') })));
    } else {
      kids.push(sectionHead('Ostatnio używane', recent.length ? { action: 'Wszystkie', onAction: () => navigate('/recipes?f=recent') } : {}));
      kids.push(recent.length
        ? h('div', { class: 'list' }, recent.map((r) => recipeCard(r)))
        : h('p', { class: 'muted pad' }, 'Tu pojawią się receptury, które otworzysz.'));
      kids.push(sectionHead('Ulubione', favs.length ? { action: 'Wszystkie', onAction: () => navigate('/recipes?f=fav') } : {}));
      kids.push(favs.length
        ? h('div', { class: 'list' }, favs.map((r) => recipeCard(r)))
        : h('p', { class: 'muted pad' }, 'Stuknij serce przy recepturze, żeby była zawsze pod ręką.'));
    }
    c.replaceChildren(...kids);
  }

  paint();
  unsub = subscribe((t) => { if (t === 'recipes' || t === 'shopping' || t === 'settings') paint(); });
  return { el: s.el, destroy: () => unsub && unsub() };
}
