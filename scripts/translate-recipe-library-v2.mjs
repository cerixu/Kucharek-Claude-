#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PARTS = Array.from({ length: 9 }, (_, i) => path.join(ROOT, 'recipe-library-data', 'part-' + String(i + 1).padStart(2, '0') + '.js'));
const MAX_RETRIES = 6;
const DELAY_MS = 250;
const PAYLOAD = 2400;
const VERSION = 21;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parsePart(text) {
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a < 0 || b < a) throw new Error('Brak tablicy receptur');
  return JSON.parse(text.slice(a, b + 1));
}
function emitPart(rows) {
  return 'export const ARCHIVE_RECIPES_PART = ' + JSON.stringify(rows) + ';\n';
}
function cleanName(value) {
  let s = String(value == null ? '' : value);
  s = s.replaceAll('\\', '').replaceAll('"', '');
  s = s.replace(/[\\(\\[\\{][^\\)\\]\\}]*[\\)\\]\\}]/g, ' ');
  for (const ch of [':', ';']) s = s.split(ch).join(' ');
  for (let i = 0; i < 5; i++) s = s.replaceAll('  ', ' ');
  return s.trim();
}

const POST_FIXES = [
  ['tablespoonfuls','łyżki'],['tablespoonful','łyżka'],['teaspoonfuls','łyżeczki'],['teaspoonful','łyżeczka'],
  ['cupfuls','szklanki'],['cupful','szklanka'],['almonds','migdały'],['almond','migdał'],
  ['walnuts','orzechy włoskie'],['walnut','orzech włoski'],['hazelnuts','orzechy laskowe'],['hazelnut','orzech laskowy'],
  ['cashews','nerkowce'],['cashew','nerkowiec'],['pecans','orzechy pekan'],['pecan','orzech pekan'],
  ['raisins','rodzynki'],['raisin','rodzynka'],['ginger root','korzeń imbiru'],['ginger','imbir'],
  ['shoulder','łopatka'],['larding needle','igła do szpikowania'],['needle','igła'],['strips','paski'],['strip','pasek'],
  ['halfway through cooking','w połowie gotowania'],['halfway','w połowie'],['spit','rożen'],['delicate','delikatny'],
  ['entirely','całkowicie'],['minced','mielony'],['smoked','wędzony'],['scalding','sparzanie'],['pouring','wlewanie'],
  ['ingredients','składniki'],['mixture','masa'],['serving','podanie'],['saucepan','rondel'],['chives','szczypiorek'],
  ['herbs','zioła'],['herb','zioło'],['truffles','trufle'],['truffle','trufla'],['casserole','zapiekanka'],
  ['recipe','przepis'],['jelly','galaretka'],['coat','obtocz'],['moisten','zwilż'],['seasoning','przyprawianie'],
  ['sides','boki'],['brim','brzeg'],['moderately','umiarkowanie'],['densely','ściśle'],['follows','następuje'],
  ['sticking','przywieraniu'],['browning','rumienienie'],['scraped','zeskrobany'],['kernels','ziarna'],['fowl','drób'],
  ['giblets','podroby'],['gizzard','żołądek'],['gizzards','żołądki'],['frankfurter','parówka'],['frankfurters','parówki'],
  ['pickled','marynowany'],['cured','peklowany'],['scrambled','jajecznica'],['spicery powder','mieszanka przypraw'],
  ['Fun Wine','chińskie wino ryżowe'],['Syou','sos sojowy'],['syou','sos sojowy'],['ghee','masło klarowane'],
  ['bamboo shoots','pędy bambusa'],['water chestnuts','kasztany wodne'],['bean sticks','makaron sojowy'],['string beans','fasolka szparagowa'],
  ['primary soup','bazowa zupa'],['secondary vegetables','warzywa dodatkowe'],['Chinese tissue-paper','chińska bibułka'],
  ['tinned beef','wołowina z puszki'],['clear jelly','klarowna galaretka'],['sweet herbs','zioła aromatyczne'],
  ['powders of chillies','sproszkowane chili'],['mustard oil','olej musztardowy'],['cow\'s ghee','masło klarowane'],
  ['mixed','wymieszany'],['stirring','mieszając'],['slices','plastry'],['slice','plaster'],['pieces','kawałki'],['piece','kawałek'],
  ['long','długi'],['hard','twardy'],['color','kolor'],['little','mało'],['knife','nóż'],['knives','noże'],['paper','papier'],
  ['keep','zachowaj'],['spices','przyprawy'],['quarters','ćwiartki'],['bouquet','bukiet'],['dozen','tuzin'],['strong','mocny'],
  ['using','używając'],['cooking','gotowanie'],['while','podczas gdy'],['only','tylko'],['also','również'],
];

function postFix(text) {
  let s = String(text == null ? '' : text);
  for (const [from, to] of POST_FIXES) {
    const re = new RegExp('(?<!\\p{L})' + from.replace(/[.*+?^$(){}|[\\]\\\\]/g, '\\\\function cleanName(value) {
  let s = String(value == null ? '' : value);
  s = s.replaceAll('\\', '').replaceAll('"', '');
  for (const ch of ['(', ')', '[', ']', '{', '}', ':', ';']) s = s.split(ch).join(' ');
  for (let i = 0; i < 5; i++) s = s.replaceAll('  ', ' ');
  return s.trim();
}') + '(?!\\p{L})', 'giu');
    s = s.replace(re, to);
  }
  return s.replace(/\\s{2,}/g, ' ').replace(/\\s+([,.;:!?])/g, '$1').trim();
}
function cleanText(value) {
  let s = String(value == null ? '' : value);
  for (let i = 0; i < 5; i++) s = s.replaceAll('  ', ' ');
  return s.replaceAll(' ,', ',').replaceAll(' .', '.').trim();
}
function markerOf(s) {
  const i = s.indexOf(']]');
  return i >= 0 ? s.slice(0, i + 2) : '';
}
function parseBatch(translated, batch) {
  const result = {};
  for (let i = 0; i < batch.length; i++) {
    const marker = markerOf(batch[i]);
    const start = translated.indexOf(marker);
    if (start < 0) return null;
    const from = start + marker.length;
    const next = i + 1 < batch.length ? markerOf(batch[i + 1]) : '';
    const to = next ? translated.indexOf(next, from) : translated.length;
    if (to < 0) return null;
    result[marker] = translated.slice(from, to).trim();
  }
  return result;
}
async function translate(text) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pl&dt=t&q=' + encodeURIComponent(text);
  let last;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 Kucharek/1.0', 'Accept': 'application/json,text/plain,*/*' },
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const out = Array.isArray(data?.[0]) ? data[0].map(x => x?.[0] || '').join('') : '';
      if (!out) throw new Error('Pusta odpowiedź');
      return out;
    } catch (e) {
      last = e;
      await sleep(Math.min(20000, 1000 * (attempt + 1)));
    }
  }
  throw last || new Error('Tłumaczenie nieudane');
}

async function translateRecipe(recipe) {
  if (recipe.translationLanguage === 'pl' && Number(recipe.translationVersion || 0) >= VERSION) return recipe;
  const fields = [];
  const add = (m, v) => fields.push(m + String(v == null ? '' : v).replaceAll('\u0000', ' '));
  add('[[NAME]]', cleanName(recipe.name || recipe.originalName || ''));
  for (let si = 0; si < (recipe.sections || []).length; si++) {
    const list = recipe.sections[si].ingredients || [];
    for (let ii = 0; ii < list.length; ii++) add('[[I:' + si + ':' + ii + ']]', list[ii].name || '');
  }
  for (let si = 0; si < (recipe.steps || []).length; si++) add('[[S:' + si + ']]', recipe.steps[si].text || '');

  const parsed = {};
  for (let from = 0; from < fields.length;) {
    const batch = [];
    let size = 0;
    while (from < fields.length && (!batch.length || size + fields[from].length + 1 <= PAYLOAD)) {
      batch.push(fields[from++]);
      size += batch.at(-1).length + 1;
    }
    const translated = await translate(batch.join('\n'));
    const part = parseBatch(translated, batch);
    if (part) Object.assign(parsed, part);
    else {
      for (const field of batch) {
        const marker = markerOf(field);
        parsed[marker] = await translate(field.slice(marker.length));
        await sleep(DELAY_MS);
      }
    }
  }

  return {
    ...recipe,
    originalName: recipe.originalName || recipe.name || '',
    name: postFix(cleanName(parsed['[[NAME]]'] || cleanName(recipe.name || recipe.originalName || ''))),
    sections: (recipe.sections || []).map((s, si) => ({
      ...s,
      ingredients: (s.ingredients || []).map((ing, ii) => ({
        ...ing,
        name: postFix(cleanText(parsed['[[I:' + si + ':' + ii + ']]'] || ing.name || ''))
      }))
    })),
    steps: (recipe.steps || []).map((st, si) => ({
      ...st,
      text: postFix(cleanText(parsed['[[S:' + si + ']]'] || st.text || ''))
    })),
    translationLanguage: 'pl',
    translationVersion: VERSION,
  };
}

const groups = [];
for (const file of PARTS) groups.push({ file, recipes: parsePart(await fs.readFile(file, 'utf8')) });
const flat = groups.flatMap(g => g.recipes);
if (flat.length !== 1700) throw new Error('Liczba receptur: ' + flat.length);

const output = new Array(flat.length);
let cursor = 0;

async function persist() {
  let pos = 0;
  for (const g of groups) {
    const rows = g.recipes.map((original) => output[pos++] || original);
    await fs.writeFile(g.file, emitPart(rows), 'utf8');
  }
}

while (cursor < flat.length) {
  const i = cursor++;
  output[i] = await translateRecipe(flat[i]);
  if ((i + 1) % 25 === 0) {
    await persist();
    console.log('Punkt kontrolny ' + (i + 1) + '/1700');
  }
}
await persist();
console.log('Gotowe: 1700/1700');
