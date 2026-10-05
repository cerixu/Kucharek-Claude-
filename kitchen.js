/* ==========================================================================
   kitchen.js — inteligencja kuchennego kontekstu.
   Łączy składniki receptury z tekstem kroków i stanem Magazynu.
   Ten moduł nie zmienia stanów magazynowych i nie wykonuje ryzykownych
   „zgadniętych” rozchodów. Służy do podpowiedzi i prezentacji.
   ========================================================================== */

import { norm } from './util.js';

const STOP = new Set([
  'typ','swieze','swiezy','swieza','mielony','mielona','mielone','suszone','suszony','suszona',
  'do','na','z','ze','w','we','lub','i','oraz','dla','po','od','duza','duzy','male','maly','mala',
  'ostudzone','ciepla','cieple','ciepłe','zimna','zimny','zimne','czesci','tuszka','filet',
  'plaster','plastry','gorzka','gorzki','pelnoziarnista','extra','vergine','kawalek','listki',
  'liscie','galazka','galazki','zabki','zabek','szt','sztuka','sztuki','puszki','puszka',
  'odsaczona','odsaczone','ugotowana','ugotowane','klasyczny','wiejska','swiezo','drobno',
  'grubo','dobrze','mocno','lekko','wedlug','smaku','ilości','ilosci'
]);

const IRREGULAR = new Map([
  ['maki','mak'], ['make','mak'], ['maka','mak'], ['maku','mak'],
  ['wody','wod'], ['woda','wod'], ['wode','wod'], ['woda','wod'],
  ['soli','sol'], ['sola','sol'], ['sol','sol'],
  ['pieprzu','piepr'], ['pieprz','piepr'],
  ['czosnku','czosn'], ['czosnek','czosn'], ['czosnkiem','czosn'],
  ['cebuli','cebul'], ['cebula','cebul'], ['cebule','cebul'],
  ['pomidora','pomidor'], ['pomidor','pomidor'], ['pomidory','pomidor'], ['pomidorow','pomidor'],
  ['masla','masl'], ['maslo','masl'], ['maslem','masl'],
  ['jajka','jaj'], ['jajko','jaj'], ['jajek','jaj'], ['jajkiem','jaj'],
  ['sera','ser'], ['serem','ser'], ['ser','ser'],
  ['mleka','mlek'], ['mleko','mlek'], ['mlekiem','mlek'],
  ['smietany','smietan'], ['smietana','smietan'], ['smietane','smietan'],
  ['oliwy','oliw'], ['oliwa','oliw'], ['oliwe','oliw'],
  ['octu','ocet'], ['ocet','ocet'],
  ['cukru','cuk'], ['cukier','cuk'], ['cukrem','cuk'],
  ['masla','masl']
]);

export function stem(word) {
  const w = norm(word);
  if (w.length < 3) return w;
  if (IRREGULAR.has(w)) return IRREGULAR.get(w);
  if (w.length >= 8 && w.endsWith('ami')) return w.slice(0, -3);
  if (w.length >= 7 && w.endsWith('ach')) return w.slice(0, -3);
  if (w.length >= 7 && w.endsWith('iem')) return w.slice(0, -3);
  if (w.length >= 7 && w.endsWith('em')) return w.slice(0, -2);
  if (w.length >= 7 && w.endsWith('om')) return w.slice(0, -2);
  if (w.length >= 7 && w.endsWith('owi')) return w.slice(0, -3);
  if (w.length >= 7 && w.endsWith('owa')) return w.slice(0, -3);
  if (w.length >= 7 && w.endsWith('owe')) return w.slice(0, -3);
  return w.slice(0, Math.max(3, w.length - (w.length >= 6 ? 2 : 1)));
}

export function nameStems(name) {
  const clean = String(name || '').replace(/\([^)]*\)/g, ' ');
  return norm(clean)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
    .slice(0, 3)
    .map(stem);
}

function matchesStem(text, st) {
  if (!st) return false;
  return new RegExp('(^|[^a-z0-9])' + st).test(norm(text));
}

export function ingredientsInText(text, ingredients = []) {
  const found = [];
  const source = String(text || '');
  for (const ing of ingredients) {
    if (!ing?.name) continue;
    const stems = nameStems(ing.name);
    if (stems.some((s) => matchesStem(source, s))) found.push(ing);
  }
  return found;
}

export function pantryScore(recipe, haveList = []) {
  const haveText = haveList.map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean);
  const relevant = (recipe?.sections || [])
    .flatMap((s) => s.ingredients || [])
    .filter((i) => i?.name && i.unit !== '%')
    .filter((i) => !/^(sol|pieprz|woda)$/i.test(norm(i.name)));

  if (!relevant.length) return { have: [], missing: [], score: 0 };

  const have = [];
  const missing = [];

  for (const ing of relevant) {
    const stems = nameStems(ing.name);
    const ok = stems.length > 0 && haveText.some((item) => {
      const itemStems = nameStems(item);
      return stems.some((a) => itemStems.some((b) => a === b || a.startsWith(b) || b.startsWith(a)));
    });
    (ok ? have : missing).push(ing);
  }

  return {
    have,
    missing,
    score: have.length / relevant.length,
  };
}

export function pantrySummary(recipe, inventory = []) {
  const result = pantryScore(recipe, inventory);
  return {
    ...result,
    percent: result.score ? Math.round(result.score * 100) : 0,
    haveCount: result.have.length,
    missingCount: result.missing.length,
    totalCount: result.have.length + result.missing.length,
  };
}
