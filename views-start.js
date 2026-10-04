/* ==========================================================================
   views-start.js — ekran Start: szybkie akcje, stan kuchni, ostatnie receptury.
   Etap 34B: docelowy Start, hierarchia wizualna i spójność Liquid Glass, iPhone-first.
   ========================================================================== */
import { h, icon, screen, button, emptyState } from './ui.js';
import { navigate } from './router.js';
import { subscribe, listRecipes, getSetting } from './recipes.js';
import { recipeVisual } from './components.js';
import { pendingCount } from './shopping.js';
import { backupDue, daysSinceBackup } from './backup.js';
import { loadInventory, listInventory, stockState, subscribeInventory } from './inventory.js';

const plural = (n) =>
  `${n} ${n === 1 ? 'receptura' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'receptury' : 'receptur'}`;

export function startView() {
  const s = screen({ title: 'Kucharek', cls: 'start start-v2' });
  const c = s.content;
  let unsub;
  let unsubInventory;

  const link = (label, description, ico, path, cls = '', badge = 0) =>
    h('a', {
      class: `start-action ${cls}`.trim(),
      href: '#' + path,
      'aria-label': badge ? `${badge} ${label}` : label,
      onClick: (e) => { e.preventDefault(); navigate(path); },
    },
      h('span', { class: 'start-action-ico' }, icon(ico, 23),
        badge ? h('span', { class: 'badge' }, String(badge > 99 ? '99+' : badge)) : null),
      h('span', { class: 'start-action-copy' },
        h('strong', null, label),
        h('small', { class: 'muted' }, description)),
      icon('right', 17));

  function recentCard(r) {
    return h('a', {
      class: 'start-recent-card',
      href: '#/recipe/' + encodeURIComponent(r.id),
      'aria-label': r.name || 'Receptura',
      onClick: (e) => { e.preventDefault(); navigate('/recipe/' + encodeURIComponent(r.id)); },
    },
      h('div', { class: 'start-recent-media' }, recipeVisual(r)),
      h('div', { class: 'start-recent-copy' },
        h('strong', null, r.name || 'Bez nazwy'),
        h('span', { class: 'muted small' }, r.traditional ? 'Tradycyjne · receptura' : (r.categoryName || 'Receptura'))));
  }

  function paint() {
    const all = listRecipes();
    const recent = all
      .filter((r) => r.lastOpenedAt)
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, 6);
    const cooked = all
      .filter((r) => Number(r.cookCount || 0) > 0 || Number(r.lastCookedAt || 0) > 0)
      .sort((a, b) => (b.lastCookedAt || 0) - (a.lastCookedAt || 0))
      .slice(0, 1);
    const favs = all
      .filter((r) => r.favorite)
      .sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
      .slice(0, 4);

    const pending = pendingCount();
    const alerts = getSetting('inventoryAlerts') !== false;
    const lowStock = alerts ? listInventory().filter((item) => stockState(item) !== 'ok').length : 0;
    const heroRecipe = cooked[0] || recent[0] || favs[0] || null;

    const kids = [];

    kids.push(
      h('section', { class: 'start-hero-card' },
        heroRecipe ? h('div', { class: 'start-hero-backdrop' }, recipeVisual(heroRecipe, '', { hero: true })) : null,
        heroRecipe ? h('div', { class: 'start-hero-image' }, recipeVisual(heroRecipe, '', { hero: true })) : null,
        h('div', { class: 'start-hero-scrim' }),
        h('div', { class: 'start-hero-content' },
          h('div', { class: 'start-hero-top' },
            h('span', { class: 'start-kicker' }, 'Kucharek'),
            heroRecipe ? h('span', { class: 'start-hero-chip' }, icon('history', 14), 'Ostatnio gotowane') : null),
          h('div', { class: 'start-hero-copy' },
            h('h2', null, 'Co dziś gotujemy?'),
            h('p', { class: 'start-hero-sub' },
              heroRecipe ? heroRecipe.name : `${plural(all.length)} · wszystko pod ręką`)),
          button('Zacznij gotować', { kind: 'primary', icon: 'chef', cls: 'start-cook-btn', onClick: () => navigate(heroRecipe ? '/cook/' + encodeURIComponent(heroRecipe.id) : '/cook') }),
        )
      )
    );

    kids.push(
      h('section', { class: 'start-section' },
        h('div', { class: 'start-section-head' },
          h('h2', null, 'Szybki dostęp'),
          h('span', { class: 'muted small' }, 'Najczęściej używane')),
        h('div', { class: 'start-actions-grid' },
          link('Przepisy', 'Znajdź recepturę', 'book', '/recipes'),
          link('Magazyn', lowStock ? `${lowStock} ${lowStock === 1 ? 'uwaga' : 'uwag'}` : 'Stany produktów', 'list', '/inventory', '', lowStock),
          link('Zakupy', pending ? `${pending} do kupienia` : 'Lista jest pusta', 'cart', '/shopping', '', pending),
          link('Ulubione', favs.length ? `${favs.length} zapisane` : 'Twoje ulubione', 'heart', '/recipes?f=fav')
        )
      )
    );

    kids.push(
      h('div', { class: 'start-status-strip', role: 'status' },
        h('div', null, icon('book', 17), h('span', null, `${all.length} ${all.length === 1 ? 'receptura' : 'receptury'}`)),
        h('div', null, icon('cart', 17), h('span', null, pending ? `${pending} zakupów` : 'Zakupy OK')),
        h('div', null, icon('list', 17), h('span', null, lowStock ? `${lowStock} uwag` : 'Magazyn OK'))
      )
    );

    if (recent.length) {
      kids.push(
        h('section', { class: 'start-section' },
          h('div', { class: 'start-section-head' },
            h('h2', null, 'Ostatnio otwierane'),
            h('button', { type: 'button', class: 'start-text-link', onClick: () => navigate('/recipes?f=recent') }, 'Pokaż wszystkie')),
          h('div', { class: 'start-recent-scroller' }, recent.map(recentCard))
        )
      );
    }

    if (favs.length) {
      kids.push(
        h('section', { class: 'start-section start-favorites' },
          h('div', { class: 'start-section-head' },
            h('h2', null, 'Ulubione'),
            h('button', { type: 'button', class: 'start-text-link', onClick: () => navigate('/recipes?f=fav') }, 'Wszystkie')),
          h('div', { class: 'list' }, favs.map((r) => h('div', { class: 'start-favorite-row' }, recentCard(r))))
        )
      );
    }

    if (backupDue()) {
      const d = daysSinceBackup();
      kids.push(h('section', { class: 'start-note' },
        icon('download', 19),
        h('div', { class: 'start-note-copy' },
          h('strong', null, 'Kopia zapasowa'),
          h('span', { class: 'muted small' },
            d == null ? 'Dane są obecnie tylko na tym telefonie.' : `Ostatnia kopia: ${d} dni temu.`)),
        button('Ustawienia', { sm: true, kind: 'ghost', onClick: () => navigate('/settings') })
      ));
    }

    if (!all.length) {
      kids.push(emptyState('📒', 'Pusty Kucharek', 'Dodaj pierwszą recepturę albo wklej przepis z internetu.',
        button('Nowa receptura', { kind: 'primary', icon: 'plus', onClick: () => navigate('/new') }),
        button('Importuj', { icon: 'upload', onClick: () => navigate('/import') })));
    }

    c.replaceChildren(...kids);
  }

  paint();
  loadInventory().then(() => paint()).catch(() => {});
  unsub = subscribe((t) => { if (t === 'recipes' || t === 'shopping' || t === 'settings') paint(); });
  unsubInventory = subscribeInventory(paint);

  return {
    el: s.el,
    destroy: () => {
      unsub && unsub();
      unsubInventory && unsubInventory();
    },
  };
}

