/* ==========================================================================
   views-cook-hub.js — prosty wybór receptury do gotowania.
   Etap 34A: zakładka „Gotuję” jako czytelny punkt wejścia, bez duplikowania
   całego katalogu funkcji.
   ========================================================================== */
import { h, icon, screen, button, emptyState } from './ui.js';
import { navigate } from './router.js';
import { listRecipes } from './recipes.js';
import { recipeVisual } from './components.js';

export function cookHubView() {
  const s = screen({ title: 'Gotuję', cls: 'cook-hub' });

  const all = listRecipes();
  const picks = all
    .filter((r) => Number(r.cookCount || 0) > 0 || r.lastOpenedAt)
    .sort((a, b) => Math.max(b.lastCookedAt || 0, b.lastOpenedAt || 0) - Math.max(a.lastCookedAt || 0, a.lastOpenedAt || 0))
    .slice(0, 8);

  if (!all.length) {
    s.content.replaceChildren(
      emptyState('🍳', 'Nie ma jeszcze receptur', 'Dodaj pierwszą recepturę, a tutaj zacznie się gotowanie.',
        button('Dodaj recepturę', { kind: 'primary', icon: 'plus', onClick: () => navigate('/new') }),
        button('Otwórz przepisy', { icon: 'book', onClick: () => navigate('/recipes') }))
    );
    return { el: s.el };
  }

  const rows = picks.map((r) => h('button', {
    type: 'button',
    class: 'cook-hub-card',
    'aria-label': `Gotuj: ${r.name}`,
    onClick: () => navigate('/recipe/' + encodeURIComponent(r.id)),
  },
    h('div', { class: 'cook-hub-media' }, recipeVisual(r)),
    h('div', { class: 'cook-hub-copy' },
      h('strong', null, r.name || 'Bez nazwy'),
      h('span', { class: 'muted small' }, r.favorite ? 'Ulubione' : 'Ostatnio używane')),
    icon('right', 18)
  ));

  s.content.replaceChildren(
    h('section', { class: 'cook-hub-intro' },
      h('span', { class: 'start-kicker' }, 'Tryb pracy'),
      h('h2', null, 'Wybierz recepturę'),
      h('p', { class: 'muted' }, 'Po otwarciu receptury wystarczy stuknąć „Gotuję”, żeby przejść do pełnego trybu kucharskiego.'),
      button('Wszystkie receptury', { icon: 'book', onClick: () => navigate('/recipes') })
    ),
    picks.length ? h('div', { class: 'cook-hub-list' }, picks) : h('p', { class: 'muted pad' }, 'Otwórz najpierw kilka receptur, żeby pojawiły się tutaj ostatnie wybory.')
  );

  return { el: s.el };
}
