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
  if (Number(r.cookCount || 0) > 0) parts.push(`gotowano ${Number(r.cookCount)}×`);
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
  const n = String(ing?.name || '').toLowerCase();
  let kind = 'generic';
  const category = String(ing?.category || ing?.type || ing?.group || '').toLowerCase();
  const categoryKind = /warzy|vegetable|veg/.test(category) ? 'vegetable'
    : /owoc|fruit/.test(category) ? 'fruit'
    : /nabiał|dairy/.test(category) ? 'milk'
    : /mięs|meat/.test(category) ? 'meat'
    : /ryb|seafood|fish/.test(category) ? 'fish'
    : /przypraw|spice/.test(category) ? 'herb'
    : /zboż|grain|bakery/.test(category) ? 'flour'
    : /tłuszcz|fat|oil/.test(category) ? 'oil'
    : null;
  if (/mleko kokos|coconut milk/.test(n)) kind = 'coconut_milk';

  else if (/olej sezam|sesame oil/.test(n)) kind = 'sesame_oil';

  else if (/ancho|anchov/.test(n)) kind = 'anchovy';

  else if (/małż|mussel/.test(n)) kind = 'mussel';

  else if (/kalm|squid/.test(n)) kind = 'squid';

  else if (/krewet|shrimp/.test(n)) kind = 'shrimp';

  else if (/tempeh/.test(n)) kind = 'tempeh';

  else if (/tofu/.test(n)) kind = 'tofu';

  else if (/chleb|bread/.test(n)) kind = 'bread';

  else if (/żelatyn|gelatin/.test(n)) kind = 'gelatin';

  else if (/mąka ryż|rice flour/.test(n)) kind = 'flour_alt';

  else if (/czekolad|chocolate/.test(n)) kind = 'chocolate';

  else if (/ananas|pineapple/.test(n)) kind = 'pineapple';

  else if (/kokos|coconut/.test(n)) kind = 'coconut';

  else if (/śliwk|plum/.test(n)) kind = 'plum';

  else if (/brzoskw|peach/.test(n)) kind = 'peach';

  else if (/winogron|grape/.test(n)) kind = 'grape';

  else if (/banan|banana/.test(n)) kind = 'banana';

  else if (/gruszk|pear/.test(n)) kind = 'pear';

  else if (/dyni|pumpkin/.test(n)) kind = 'pumpkin';

  else if (/karczoch|artichoke/.test(n)) kind = 'artichoke';

  else if (/szparag|asparagus/.test(n)) kind = 'asparagus';

  else if (/fenkuł|koper włoski|fennel/.test(n)) kind = 'fennel';

  else if (/por|leek/.test(n)) kind = 'leek';

  else if (/rzodkiew|radish/.test(n)) kind = 'radish';

  else if (/burak|beet/.test(n)) kind = 'beet';

  else if (/groszek|pea/.test(n)) kind = 'pea';

  else if (/kukurydz|corn/.test(n)) kind = 'corn';

  else if (/kalafior|cauliflower/.test(n)) kind = 'cauliflower';

  else if (/brokuł|broccoli/.test(n)) kind = 'broccoli';

  else if (/kapust|cabbage/.test(n)) kind = 'cabbage';

  else if (/sałat|lettuce/.test(n)) kind = 'lettuce';

  else if (/szpinak|spinach/.test(n)) kind = 'spinach';

  if (/\b(sól|salt)\b/.test(n)) kind = 'salt';
  else if (/mąk|flour|semolin|farin/.test(n)) kind = 'flour';
  else if (/skrobi|mączka ziemniacz|cornstarch|starch/.test(n)) kind = 'starch';
  else if (/wod|water/.test(n)) kind = 'water';
  else if (/bulion|wywar|stock|broth/.test(n)) kind = 'broth';
  else if (/pomidor|tomato|pelat|passat/.test(n)) kind = 'tomato';
  else if (/jaj|egg|żółtk|białk/.test(n)) kind = 'egg';
  else if (/ser|cheese|pecorino|parmezan|parmigiano|mozzarella|ricotta|mascarpone/.test(n)) kind = 'cheese';
  else if (/mięs|wołow|wieprz|kurcz|gęś|kacz|guancial|boczek|szynk|salami|prosciutto|chashu|meat|beef|pork|chicken/.test(n)) kind = 'meat';
  else if (/ryb|łosoś|tuńczy|sushi|ancho|sardyn|fish|salmon|tuna/.test(n)) kind = 'fish';
  else if (/oliw|olej|oil/.test(n)) kind = 'oil';
  else if (/ocet|vinegar/.test(n)) kind = 'vinegar';
  else if (/wino|wine/.test(n)) kind = 'wine';
  else if (/cebula|onion|szalot/.test(n)) kind = 'onion';
  else if (/czosn|garlic/.test(n)) kind = 'garlic';
  else if (/imbir|ginger/.test(n)) kind = 'ginger';
  else if (/chili|chilli|papryczk|cayenne/.test(n)) kind = 'chili';
  else if (/papryk|paprika/.test(n)) kind = 'paprika';
  else if (/pieprz|pepper|poivre/.test(n)) kind = 'pepper';
  else if (/kmin|cumin|kminek/.test(n)) kind = 'cumin';
  else if (/kurkum|turmeric/.test(n)) kind = 'turmeric';
  else if (/cynamon|cinnamon/.test(n)) kind = 'cinnamon';
  else if (/goździk|clove/.test(n)) kind = 'clove';
  else if (/gałk|nutmeg/.test(n)) kind = 'nutmeg';
  else if (/kardamon|cardamom/.test(n)) kind = 'cardamom';
  else if (/anyż|anise|star anise/.test(n)) kind = 'anise';
  else if (/liść laurow|bay leaf/.test(n)) kind = 'bay';
  else if (/kapar|caper/.test(n)) kind = 'caper';
  else if (/oliwk|olive/.test(n)) kind = 'olive';
  else if (/fasol|bean|ciecierzyc|chickpea|soczewic|lentil/.test(n)) kind = 'legume';
  else if (/awokad|avocado/.test(n)) kind = 'avocado';
  else if (/ogór|cucumber/.test(n)) kind = 'cucumber';
  else if (/cukini|zucchini/.test(n)) kind = 'zucchini';
  else if (/bakłażan|eggplant|aubergine/.test(n)) kind = 'eggplant';
  else if (/jabłk|apple/.test(n)) kind = 'apple';
  else if (/pomarańcz|orange/.test(n)) kind = 'orange';
  else if (/truskawk|strawberr/.test(n)) kind = 'strawberry';
  else if (/malin|raspberr/.test(n)) kind = 'raspberry';
  else if (/miód|honey/.test(n)) kind = 'honey';
  else if (/syrop|syrup/.test(n)) kind = 'syrup';
  else if (/bazyl|pietrusz|oregano|tymian|rozmaryn|kolendr|szczypior|herb|zioł/.test(n)) kind = 'herb';
  else if (/cukier|sugar/.test(n)) kind = 'sugar';
  else if (/mleko|milk|śmietan|cream/.test(n)) kind = 'milk';
  else if (/masło|butter/.test(n)) kind = 'butter';
  else if (/cytr|lemon|lime|limonka/.test(n)) kind = 'lemon';
  else if (/pieczark|grzyb|mushroom/.test(n)) kind = 'mushroom';
  else if (/ryż|rice/.test(n)) kind = 'rice';
  else if (/makaron|pasta|spaghetti|tagliatelle|noodle/.test(n)) kind = 'pasta';
  else if (/ziemniak|potato/.test(n)) kind = 'potato';
  else if (/marchew|carrot/.test(n)) kind = 'carrot';
  else if (/seler korzeni|korzeń selera|celery root|celeriac/.test(n)) kind = 'celery_root';
  else if (/seler naci|seler łodyg|naci selera|łodyg[ai] selera|celery stalk|celery stem/.test(n)) kind = 'celery_stalk';
  else if (/seler/.test(n)) kind = 'celery';
  else if (/pietruszk[aę]|korzeń pietruszk|parsley root|parsnip/.test(n)) kind = 'parsley_root';
  else if (/koperek|koper|dill/.test(n)) kind = 'dill';
  else if (/mięt[aę]|mint/.test(n)) kind = 'mint';
  else if (/szczypior|szczypiorek|spring onion|scallion|green onion/.test(n)) kind = 'spring_onion';
  else if (/szałwi|sage/.test(n)) kind = 'sage';
  else if (/majeran|marjoram/.test(n)) kind = 'marjoram';
  else if (/orzech|walnut|almond|hazelnut|nut/.test(n)) kind = 'nut';
  else if (/sezam|sesame/.test(n)) kind = 'sesame';
  else if (/soja|soy|sos sojowy/.test(n)) kind = 'soy';
  else if (/mis[oó]|miso/.test(n)) kind = 'miso';
  else if (/kakao|cocoa/.test(n)) kind = 'cocoa';
  else if (/wanili|vanilla/.test(n)) kind = 'vanilla';
  else if (/drożdż|yeast/.test(n)) kind = 'yeast';

  if (/parmigiano|parmezan|parmesan|pecorino|mozzarella|ricotta|mascarpone|gorgonzol|grana padano|gruy[eè]re|emmental|cheddar|feta|halloumi|camembert|brie/.test(n)) kind = 'cheese';
  if (kind === 'generic' && categoryKind) kind = categoryKind;
  // Nigdy nie zostawiamy „przypadkowej” ikony. Nowy składnik dostaje
  // bezpieczny fallback zgodny z kategorią, a dopiero potem ikonę ogólną.
  const paths = {
    flour:'M10 36h28M13 36l4-22h14l4 22M17 14l7-6 7 6M20 22h8M18 29h12',
    starch:'M12 18h24l-2 20H14l-2-20ZM16 18l3-7h10l3 7M17 25h14M18 31h12',
    water:'M24 7C18 15 13 20 13 27a11 11 0 0 0 22 0c0-7-5-12-11-20Z',
    broth:'M11 30c2-9 8-14 13-14s11 5 13 14M10 30h28M14 36h20M18 23c2-2 4-2 6 0s4 2 6 0',
    salt:'M13 25h22l-2 13H15l-2-13ZM17 25v-5h14v5M19 16c2-2 4-2 6 0s4 2 6 0M18 31h.1M24 31h.1M30 31h.1',
    tomato:'M24 14c-9 0-14 6-14 13 0 9 6 14 14 14s14-5 14-14c0-7-5-13-14-13Z M24 14l-1-6M24 11c4-4 8-2 9 1-4 1-6 2-9 2',
    egg:'M24 7c-7 7-11 13-11 21a11 11 0 0 0 22 0c0-8-4-14-11-21Z',
    cheese:'M8 35V17l29-7v24L8 35ZM8 17l29 17M14 19v14M19 18v14M28 16v14M18 25h.1M27 21h.1M31 29h.1',
    meat:'M12 30c2-8 9-16 17-16 5 0 8 3 8 7 0 9-7 17-15 17-7 0-11-3-10-8Z M25 22c3-3 7-1 6 2-1 3-5 3-6 0',
    fish:'M8 24c8-10 20-12 31-4l4 4-4 4c-11 8-23 6-31-4Z M8 24l-5-5M8 24l-5 5M31 23h.1',
    oil:'M18 10h12v6l4 7v12H14V23l4-7v-6ZM18 10h12M19 29h10',
    vinegar:'M18 9h12v5l4 6v18H14V20l4-6V9ZM18 14h12M17 25h14M20 30h8',
    wine:'M14 8h20l-3 13c-1 4-3 6-7 7v7h7v3H17v-3h7v-7c-4-1-6-3-7-7L14 8ZM17 13h14',
    onion:'M24 10c-7 5-12 11-12 18a12 12 0 0 0 24 0c0-7-5-13-12-18ZM24 10v28M16 28c3 3 5 4 8 4s5-1 8-4',
    garlic:'M24 9c-5 5-9 8-9 15 0 8 4 14 9 14s9-6 9-14c0-7-4-10-9-15ZM24 9v29M19 15c2 2 3 3 5 3s3-1 5-3',
    ginger:'M12 28c3-9 9-15 17-15 5 0 8 3 8 7-1 7-7 14-15 15-7 1-11-2-10-7ZM17 27c5-4 8-7 10-11',
    chili:'M15 30c8 3 15-1 18-9 1-3 0-6-2-8-2 7-7 10-13 10-7 0-9 4-3 7ZM31 13l4-5',
    paprika:'M14 29c3-10 10-16 20-15 0 9-5 18-15 21-5 1-7-2-5-6ZM20 28c4-3 8-7 10-11',
    pepper:'M16 18c0-5 4-9 8-9s8 4 8 9c0 4-3 7-7 7-5 0-9-3-9-7ZM11 30c0-5 4-9 8-9s8 4 8 9c0 4-3 7-7 7-5 0-9-3-9-7ZM29 31c0-5 4-9 8-9s8 4 8 9c0 4-3 7-7 7-5 0-9-3-9-7ZM23 10l2-4',
    herb:'M24 39V16M24 27c-6 0-10-4-10-9 6 0 10 3 10 9ZM24 23c6 0 10-4 10-9-6 0-10 3-10 9ZM24 33c-6 0-9-3-9-8 5 0 9 3 9 8Z',
    sugar:'M14 18h20l3 20H11l3-20ZM14 18l5-8h10l5 8M18 25h12M17 31h14',
    milk:'M16 9h16v5l3 5v18H13V19l3-5V9ZM16 14h16M14 22h20',
    butter:'M11 28h26v10H11zM15 28l5-13h12l5 13M20 15h12',
    lemon:'M10 31c5-12 15-17 28-14-2 13-9 21-22 20-5 0-8-2-6-6Z M20 22c5 3 9 7 11 12',
    mushroom:'M10 25c0-8 6-14 14-14s14 6 14 14H10ZM21 25v13h6V25M15 21h.1M24 17h.1M32 21h.1',
    rice:'M11 27c4-8 9-12 13-12s9 4 13 12H11ZM15 27v9h18v-9M18 32h12',
    pasta:'M12 16c4 0 4 16 8 16s4-16 8-16 4 16 8 16M12 12h24',
    potato:'M13 29c-2-8 4-17 12-18 8-1 13 5 12 13-1 9-8 15-17 13-4-1-6-4-7-8ZM19 21h.1M28 27h.1',
    carrot:'M13 18c4-4 12-4 20 0-2 8-5 16-9 21-4-5-7-13-11-21ZM24 18V8M20 11l-5-3M28 11l5-3',
    celery:'M24 39V14M24 27c-5-2-9-6-9-12M24 30c5-2 9-6 9-12M24 19c-3-3-5-6-5-9',
    celery_root:'M24 11c-8 1-13 7-13 15 0 8 5 13 13 13s13-5 13-13c0-8-5-14-13-15ZM19 18h.1M29 22h.1M21 29h.1M28 33h.1M24 11V6',
    parsley_root:'M16 37c-2-7 0-16 4-25h8c4 9 6 18 4 25-5 3-11 3-16 0ZM24 12V6M20 9l-5-4M28 9l5-4',
    dill:'M24 39V10M24 25c-5-2-9-6-9-12M24 28c5-2 9-6 9-12M24 19c-3-3-5-7-5-11M24 19c3-3 5-7 5-11',
    mint:'M24 39V18M24 28c-7-1-11-5-11-12 7 0 11 4 11 12 0-8 5-13 12-13 0 8-4 12-12 13',
    spring_onion:'M19 39c-1-9 0-19 2-29M27 39c1-9 0-19-2-29M21 12l-6-6M27 12l6-6M24 10V4',
    sage:'M24 38V18M24 28c-7 0-11-4-11-10 7 0 11 4 11 10 0-7 5-11 12-11 0 7-4 11-12 11',
    marjoram:'M24 39V17M24 27c-6-1-9-5-9-10 6 0 9 3 9 10 0-6 4-10 10-10 0 6-4 10-10 10',
    nut:'M13 30c-1-8 4-15 11-17 7 2 12 9 11 17-1 7-7 11-14 9-5-1-8-5-8-9Z M24 15v24',
    sesame:'M17 13c4-3 8 0 7 5-1 4-5 5-8 2-3-2-3-5 1-7ZM31 28c4-3 8 0 7 5-1 4-5 5-8 2-3-2-3-5 1-7Z',
    soy:'M13 20h22l-2 18H15l-2-18ZM17 20v-6h14v6M18 27h12M19 32h10',
    miso:'M10 23h28v15H10zM14 23c1-8 5-12 10-12s9 4 10 12M16 29h16',
    cocoa:'M24 10c-8 4-13 10-13 18 0 7 5 11 13 11s13-4 13-11c0-8-5-14-13-18ZM24 10v29M17 23c4 3 10 3 14 0',
    vanilla:'M16 38c-4-6-3-16 2-24l5-7 5 3-3 8c-2 8-2 15 1 20M21 16l6 3',
    yeast:'M12 29c0-8 5-14 12-14s12 6 12 14c0 6-5 10-12 10s-12-4-12-10ZM18 26h.1M24 23h.1M30 28h.1',
    cumin:'M13 27c0-6 5-11 11-11s11 5 11 11-5 10-11 10-11-4-11-10ZM19 21h.1M25 26h.1M31 22h.1',
    turmeric:'M13 31c2-9 7-16 18-18 1 8-1 17-8 22-5 3-9 1-10-4ZM18 30c4-4 8-8 11-13',
    cinnamon:'M14 12h20v24H14zM18 17h12M18 23h12M18 29h12',
    clove:'M24 11c4 0 7 3 7 7 0 4-3 7-7 7s-7-3-7-7c0-4 3-7 7-7ZM24 25v14M19 39h10',
    nutmeg:'M15 25c0-8 4-13 9-13s9 5 9 13c0 7-4 12-9 12s-9-5-9-12ZM21 17c2 3 4 3 6 0',
    cardamom:'M24 10c6 2 10 7 10 14s-4 12-10 14c-6-2-10-7-10-14s4-12 10-14ZM18 24h12M24 14v20',
    anise:'M24 8l4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1 4-9Z',
    bay:'M12 36c10-1 19-8 23-22-11 0-20 7-23 22ZM15 33c5-5 10-10 16-16',
    caper:'M14 29c0-7 4-12 10-12s10 5 10 12c0 6-4 10-10 10s-10-4-10-10ZM20 24h.1M27 29h.1',
    olive:'M15 29c0-7 4-12 9-12s9 5 9 12-4 10-9 10-9-3-9-10ZM24 17v22',
    legume:'M12 28c0-6 4-10 9-10s9 4 9 10-4 10-9 10-9-4-9-10ZM27 20c6-2 10 1 10 7s-4 9-10 9',
    avocado:'M24 9c-8 2-13 9-13 18 0 7 5 12 13 12s13-5 13-12c0-9-5-16-13-18ZM24 22c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7Z',
    cucumber:'M12 25c0-7 5-13 12-13s12 6 12 13-5 12-12 12-12-5-12-12ZM18 21h.1M24 30h.1M30 22h.1',
    zucchini:'M12 30c0-8 5-15 12-18 7 3 12 10 12 18 0 5-5 8-12 8s-12-3-12-8ZM18 25h.1M24 30h.1M30 25h.1',
    eggplant:'M24 8c7 0 13 6 13 13 0 10-7 18-13 18S11 31 11 21c0-7 6-13 13-13ZM19 10l5-5 5 5',
    apple:'M12 25c0-8 5-13 12-13s12 5 12 13c0 8-5 14-12 14s-12-6-12-14ZM24 12c0-5 3-7 6-8',
    orange:'M12 27c0-8 5-14 12-14s12 6 12 14-5 12-12 12-12-4-12-12ZM19 17h.1M25 22h.1M30 29h.1',
    strawberry:'M12 18c5-5 19-5 24 0-1 11-6 20-12 20s-11-9-12-20ZM18 16l-2-6M24 15V7M30 16l2-6M19 24h.1M25 30h.1',
    raspberry:'M13 27c0-7 5-12 11-12s11 5 11 12c0 7-5 11-11 11s-11-4-11-11ZM18 24h.1M24 21h.1M30 27h.1M24 31h.1',
    honey:'M14 16h20v22H14zM18 16v-5h12v5M19 25c3 3 7 3 10 0M20 31h8',
    syrup:'M18 9h12v6l4 7v16H14V22l4-7V9ZM18 15h12M19 29h10',
celery_stalk:'M18 39V13M24 39V10M30 39V15M18 22c-5-2-8-6-8-11M24 19c-4-2-6-5-6-9M30 24c5-2 8-6 8-11',
spinach:'M24 39V24c-8-1-12-6-12-13 8 0 12 4 12 13 0-9 5-14 13-14 0 8-4 13-13 14',
lettuce:'M10 28c4-8 8-12 14-12s10 4 14 12c-4 8-9 11-14 11S14 36 10 28ZM24 17v21M16 24c3 3 5 4 8 4s5-1 8-4',
cabbage:'M24 10c-8 0-14 6-14 15s6 14 14 14 14-5 14-14S32 10 24 10ZM24 10v29M12 25c6-2 18-2 24 0',
broccoli:'M12 25c0-6 4-10 9-10 1-6 6-9 11-6 4 2 5 6 4 10 3 1 5 4 5 8 0 6-5 10-12 10H19c-4 0-7-2-7-6ZM24 31v8',
cauliflower:'M11 27c0-5 4-9 9-9 1-5 5-8 9-8s8 3 9 8c5 0 9 4 9 9 0 7-6 11-13 11H24c-7 0-13-4-13-11ZM24 38v-7',
corn:'M17 10c-3 8-3 19 3 28h8c6-9 6-20 3-28-5-2-9-2-14 0ZM14 15l-5-4M34 15l5-4M20 18h8M19 24h10M20 30h8',
pea:'M12 28c4-8 11-11 24-7 0 9-7 14-17 14-5 0-8-3-7-7ZM17 27c2 2 4 3 7 3M24 24c2 2 4 3 7 3',
beet:'M13 29c0-7 5-12 11-12s11 5 11 12-5 10-11 10-11-3-11-10ZM24 17V9M20 12l-5-4M28 12l5-4',
radish:'M13 28c0-6 5-11 11-11s11 5 11 11-5 10-11 10-11-4-11-10ZM24 17V8M20 11l-5-5M28 11l5-5',
leek:'M17 39c-2-8-1-18 2-29h10c3 11 4 21 2 29M19 25h10M20 10l-3-5M28 10l3-5',
fennel:'M24 39V17M15 27c4-5 9-7 9-7s5 2 9 7M17 18c3-4 7-6 7-6M31 18c-3-4-7-6-7-6',
asparagus:'M16 39c-1-11 0-21 5-29M24 39c0-11 1-21 5-29M32 39c1-11 0-21-5-29M19 18h10M17 25h14',
artichoke:'M24 9c-8 4-12 10-12 18 0 8 5 12 12 12s12-4 12-12c0-8-4-14-12-18ZM16 22c5 3 11 3 16 0M18 29c4 2 8 2 12 0',
pumpkin:'M10 27c0-9 5-15 14-15s14 6 14 15-5 12-14 12-14-3-14-12ZM24 12v27M17 15c3 5 3 16 0 21M31 15c-3 5-3 16 0 21',
pear:'M24 10c-5 2-6 7-4 11-6 3-9 8-8 14 1 7 6 11 12 11s11-4 12-11c1-6-2-11-8-14 2-4 1-8-4-11ZM24 10V6',
banana:'M12 18c5 13 13 18 25 10 0 7-5 11-12 11-10 0-17-7-18-18l5-3ZM12 18l-3-5',
grape:'M24 17c-6 0-11 5-11 11s5 10 11 10 11-4 11-10-5-11-11-11ZM24 17V9M20 12c-4-3-7-2-9 1M28 12c4-3 7-2 9 1',
peach:'M12 27c0-8 5-14 12-14s12 6 12 14-5 12-12 12-12-4-12-12ZM24 13c-3 5-3 9 0 14',
plum:'M12 27c0-8 5-14 12-14s12 6 12 14-5 12-12 12-12-4-12-12ZM24 13v-5',
coconut:'M12 29c0-10 5-18 12-18s12 8 12 18-5 10-12 10-12-1-12-10ZM17 23c4-3 10-3 14 0M18 29h12',
pineapple:'M14 20c0-6 4-10 10-10s10 4 10 10c0 10-4 18-10 18s-10-8-10-18ZM24 10V4M19 10l-5-5M29 10l5-5M18 22h12M18 29h12',
chocolate:'M11 12h26v27H11zM11 21h26M11 30h26M20 12v27M29 12v27',
gelatin:'M13 29c0-8 5-13 11-13s11 5 11 13-5 10-11 10-11-3-11-10ZM18 25h.1M24 30h.1M30 25h.1',
bread:'M11 34V22c0-7 6-12 13-12s13 5 13 12v12H11ZM16 22c3-4 5-5 8-5s5 1 8 5',
tofu:'M11 17h26v21H11zM15 17l4-7h10l4 7M18 25h12',
tempeh:'M12 16h24v23H12zM16 21h16M16 28h16M16 34h16',
shrimp:'M10 28c5-9 13-13 22-9 5 2 6 7 2 11-6 6-17 6-24-2ZM33 20l5-5M28 25h.1',
squid:'M15 14c0-5 4-8 9-8s9 3 9 8v13c0 7-4 12-9 12s-9-5-9-12V14ZM18 39l-4 4M23 39v5M28 39l4 4',
mussel:'M12 31c0-10 5-18 12-21 7 3 12 11 12 21-7 7-17 7-24 0ZM24 10v29',
anchovy:'M9 27c7-9 17-11 28-5l4 4-4 4c-11 6-21 4-28-3ZM9 27l-6-4M9 27l-6 5',
sesame_oil:'M18 10h12v6l4 7v12H14V23l4-7v-6ZM18 10h12M19 29h10',
coconut_milk:'M14 12h20v26H14zM18 12v-4h12v4M18 21h12',
    vegetable:'M24 39V24M24 27c-7-1-12-6-12-13 7 0 12 4 12 13 0-8 5-13 12-13 0 7-5 12-12 13M24 24c-4-5-7-8-7-13M24 24c4-5 7-8 7-13',
    fruit:'M12 28c0-9 5-15 12-15s12 6 12 15-5 11-12 11-12-2-12-11ZM24 13V7M20 9l-4-4M28 9l4-4',
    generic:'M10 24h28M14 18h20l4 18H10l4-18ZM18 18v-5h12v5'
  };
  const NS = 'http://www.w3.org/2000/svg';
  const span = h('span', { class:'ingredient-icon ingredient-icon-'+kind, 'aria-hidden':'true' });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ingredient-svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', '30'); svg.setAttribute('height', '30'); svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', paths[kind] || paths.generic);
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.4'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path); span.appendChild(svg); return span;
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
  return h('div', { class: 'rthumb' }, recipeVisual(r, cls));
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
