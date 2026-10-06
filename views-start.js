/* ==========================================================================
   views-start.js — główne menu Kucharka, iPhone-first.
   Układ inspirowany ekranem Receptur: zdjęcia, sekcje, zwarte karty, szybki start.
   ========================================================================== */
import { h, icon, iconBtn, screen, button } from './ui.js';
import { navigate } from './router.js';
import { subscribe, listRecipes, getSetting } from './recipes.js';
import { recipeVisual } from './components.js';
import { backupDue, daysSinceBackup } from './backup.js';
import { loadInventory, listInventory, stockState, subscribeInventory } from './inventory.js';

const plural = (n) => {
  if (n === 1) return '1 receptura';
  return n + ' ' + (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'receptury' : 'receptur');
};

export function startView() {
  const s = screen({
    title: 'Kucharek',
    right: h('div', { class: 'row' },
      iconBtn('search', 'Szukaj receptury', () => navigate('/recipes')),
      iconBtn('sliders', 'Ustawienia', () => navigate('/settings')),
    ),
    cls: 'start start-menu',
  });
  const c = s.content;
  let unsub = null;
  let unsubInventory = null;

  const tile = (label, desc, ico, path, cls) => h('a', {
    class: ('menu-tile ' + (cls || '')).trim(),
    href: '#' + path,
    onClick: (e) => { e.preventDefault(); navigate(path); },
  },
    h('span', { class: 'menu-tile-icon' }, icon(ico, 24)),
    h('span', { class: 'menu-tile-copy' }, h('strong', null, label), h('small', { class: 'muted' }, desc)),
    icon('right', 17)
  );

  const recipeCard = (r) => h('a', {
    class: 'menu-recipe-card',
    href: '#/recipe/' + encodeURIComponent(r.id),
    onClick: (e) => { e.preventDefault(); navigate('/recipe/' + encodeURIComponent(r.id)); },
  },
    h('div', { class: 'menu-recipe-media' }, recipeVisual(r)),
    h('div', { class: 'menu-recipe-copy' },
      h('strong', null, r.name || 'Bez nazwy'),
      h('span', { class: 'muted small' }, r.traditional ? 'Tradycyjna' : (r.categoryName || 'Receptura')))
  );

  function paint() {
    const all = listRecipes();
    const recent = all.filter(r => r.lastOpenedAt).sort((a,b) => (b.lastOpenedAt||0) - (a.lastOpenedAt||0)).slice(0, 6);
    const cooked = all.filter(r => Number(r.cookCount || 0) > 0 || Number(r.lastCookedAt || 0) > 0).sort((a,b) => (b.lastCookedAt||0) - (a.lastCookedAt||0));
    const favs = all.filter(r => r.favorite).sort((a,b) => (b.favoritedAt||0) - (a.favoritedAt||0)).slice(0, 4);
    const low = getSetting('inventoryAlerts') !== false ? listInventory().filter(i => stockState(i) !== 'ok').length : 0;
    const hero = cooked[0] || recent[0] || favs[0] || all[0] || null;

    const kids = [
      h('section', { class: 'menu-welcome' },
        h('div', { class: 'menu-welcome-mark' }, icon('chef', 30)),
        h('div', { class: 'menu-welcome-copy' },
          h('strong', null, 'Twoja kuchnia.'),
          h('span', { class: 'muted' }, 'Receptury, magazyn i kalkulatory w jednym miejscu.')),
        h('span', { class: 'menu-count num' }, String(all.length))
      ),
      h('div', { class: 'menu-search' },
        icon('search', 19),
        h('button', { type: 'button', onClick: () => navigate('/recipes') }, 'Szukaj receptury, składnika lub tagu…'),
        icon('right', 17)
      ),
    ];

    if (hero) kids.push(
      h('a', {
        class: 'menu-hero',
        href: '#/recipe/' + encodeURIComponent(hero.id),
        onClick: e => { e.preventDefault(); navigate('/recipe/' + encodeURIComponent(hero.id)); }
      },
        h('div', { class: 'menu-hero-media' }, recipeVisual(hero, '', { hero: true })),
        h('div', { class: 'menu-hero-scrim' }),
        h('div', { class: 'menu-hero-content' },
          h('span', { class: 'menu-overline' }, 'DZIŚ GOTUJEMY'),
          h('h2', null, hero.name || 'Wybierz recepturę'),
          h('span', { class: 'menu-hero-meta' }, hero.traditional ? 'Tradycyjna receptura' : (hero.categoryName || 'Receptura')),
          button('Otwórz recepturę', { sm: true, kind: 'primary', icon: 'right', onClick: e => { e.stopPropagation(); navigate('/recipe/' + encodeURIComponent(hero.id)); } })
        )
      )
    );

    kids.push(
      h('section', { class: 'menu-section' },
        h('div', { class: 'menu-section-head' },
          h('div', null, h('h2', null, 'Najważniejsze'), h('p', { class: 'muted small' }, 'Bez przeklikiwania przez pół aplikacji.'))
        ),
        h('div', { class: 'menu-grid' },
          tile('Receptury', plural(all.length), 'book', '/recipes', 'featured'),
          tile('Magazyn', low ? (low + (low === 1 ? ' uwaga' : ' uwagi')) : 'Stan składników', 'list', '/inventory'),
          tile('Kalkulatory', 'Skala, wydajność, food cost', 'calc', '/calc'),
          tile('Historia', 'Ostatnio gotowane', 'history', '/history'),
          tile('Tradycyjne', all.filter(r => r.traditional).length + ' receptur', 'star', '/recipes?f=trad'),
          tile('Ulubione', favs.length + ' zapisane', 'heart', '/recipes?f=fav'),
          tile('Kuchnie świata', 'Włochy, Polska, Azja i więcej', 'globe', '/recipes'),
          tile('Importuj', 'URL, tekst lub zdjęcie', 'upload', '/import'),
        )
      ),
      h('section', { class: 'menu-status' },
        h('span', null, icon('book', 16), plural(all.length)),
        h('span', null, icon('list', 16), low ? (low + ' wymagające uwagi') : 'Magazyn OK'),
        h('span', null, icon('clock', 16), recent.length ? (recent.length + ' ostatnich') : 'Brak historii')
      )
    );

    if (recent.length) kids.push(
      h('section', { class: 'menu-section' },
        h('div', { class: 'menu-section-head' },
          h('div', null, h('h2', null, 'Ostatnio otwierane'), h('p', { class: 'muted small' }, 'Wracaj dokładnie tam, gdzie skończyłeś.')),
          h('button', { type: 'button', class: 'menu-link', onClick: () => navigate('/recipes?f=recent') }, 'Wszystkie', icon('right', 15))
        ),
        h('div', { class: 'menu-recipe-strip' }, recent.map(recipeCard))
      )
    );

    if (backupDue()) {
      const d = daysSinceBackup();
      kids.push(h('section', { class: 'menu-backup' },
        icon('download', 19),
        h('div', { class: 'menu-backup-copy' },
          h('strong', null, 'Kopia zapasowa'),
          h('span', { class: 'muted small' }, d == null ? 'Dane są tylko na tym telefonie.' : ('Ostatnia kopia: ' + d + ' dni temu.'))
        ),
        button('Ustawienia', { sm: true, kind: 'ghost', onClick: () => navigate('/settings') })
      ));
    }

    if (!all.length) kids.push(h('section', { class: 'menu-empty' },
      h('div', { class: 'empty-emoji' }, '📒'),
      h('h2', null, 'Zacznij od pierwszej receptury'),
      h('p', { class: 'muted' }, 'Dodaj własną recepturę albo importuj gotową.'),
      h('div', { class: 'row wrap center' }, button('Nowa receptura', { kind: 'primary', icon: 'plus', onClick: () => navigate('/new') }), button('Importuj', { icon: 'upload', onClick: () => navigate('/import') }))
    ));

    c.replaceChildren(...kids);
  }

  paint();
  loadInventory().then(paint).catch(() => {});
  unsub = subscribe(t => { if (t === 'recipes' || t === 'settings' || t === 'categories') paint(); });
  unsubInventory = subscribeInventory(paint);
  return { el: s.el, destroy: () => { unsub?.(); unsubInventory?.(); } };
}
