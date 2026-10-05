import { h, icon, screen } from './ui.js';
import { navigate } from './router.js';
import { listRecipes, ORIGINS } from './recipes.js';
import { recipeVisual } from './components.js';

const FEATURED = ['IT','JP','PL','US','FR','ES','CN','IN','TH','VN','KR','MX','GR','TR','DE','CZ','PT','GE','MA','BR','PE','AR'];

function countFor(code, recipes) {
  return recipes.filter((r) => String(r.origin || '').toUpperCase() === code).length;
}

export function worldView() {
  const recipes = listRecipes();
  const all = ORIGINS.map((o) => ({ ...o, count: countFor(o.code, recipes) }));
  const featured = FEATURED.map((code) => all.find((o) => o.code === code)).filter(Boolean);
  const rest = all.filter((o) => !FEATURED.includes(o.code)).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));

  const countryCard = (o, featuredCard = false) => {
    const sample = recipes.find((r) => String(r.origin || '').toUpperCase() === o.code);
    const visual = sample ? recipeVisual(sample, 'world-card-img') : null;
    return h('button', {
      type: 'button', class: 'world-country ' + (featuredCard ? 'world-country-featured' : ''),
      'aria-label': o.name + ', ' + o.count + ' receptur',
      onClick: () => navigate('/recipes?origin=' + encodeURIComponent(o.code)),
    },
      visual ? h('div', { class: 'world-country-media' }, visual) : h('div', { class: 'world-country-media empty-media' }),
      h('div', { class: 'world-country-scrim' }),
      h('div', { class: 'world-country-content' },
        h('div', { class: 'world-country-title' }, h('span', { class: 'world-flag' }, o.flag), h('span', null, o.name)),
        h('div', { class: 'world-country-count' }, o.count + ' ' + (o.count === 1 ? 'receptura' : 'receptur')),
      ),
      h('span', { class: 'world-country-arrow', 'aria-hidden': 'true' }, icon('right', 18))
    );
  };

  const s = screen({
    title: 'Kuchnie świata',
    right: h('button', { type: 'button', class: 'world-search-btn', 'aria-label': 'Przejdź do wszystkich receptur', onClick: () => navigate('/recipes') }, icon('search', 20)),
  });

  s.content.append(
    h('section', { class: 'world-intro' },
      h('div', { class: 'world-eyebrow' }, 'ŚWIAT NA TALERZU'),
      h('h1', null, 'Wybierz kuchnię'),
      h('p', { class: 'muted' }, 'Jedna kuchnia = wszystkie receptury tego kraju, niezależnie od źródła.'),
    ),
    h('section', { class: 'world-featured-grid' }, featured.map((o) => countryCard(o, true))),
    h('section', { class: 'world-rest' },
      h('div', { class: 'world-section-head' }, h('h2', null, 'Pozostałe kraje'), h('span', { class: 'muted' }, String(rest.length))),
      h('div', { class: 'world-list' }, rest.map((o) => countryCard(o)))
    )
  );

  return { el: s.el };
}