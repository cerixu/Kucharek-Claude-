#!/usr/bin/env node
/*
 * Build the real Kucharek recipe corpus from:
 * https://github.com/AdamBouhmad/open-recipe-archive
 *
 * Rules:
 * - never multiply recipes into artificial "profiles" or variants
 * - dedupe exact recipe content using SHA-256
 * - keep at most 3 records with the same normalized title
 * - preserve source/provenance metadata
 * - emit static JS chunks for offline PWA use
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const WORK = path.join(ROOT, '.recipe-archive-build');
const SOURCE = path.join(WORK, 'open-recipe-archive');
const OUT = path.join(ROOT, 'recipe-library-data');
const SOURCE_URL = 'https://github.com/AdamBouhmad/open-recipe-archive';

const TARGET = 1700;
const MAX_SAME_TITLE = 3;
const CHUNK_SIZE = 200;

const COLLECTIONS = [
  ['kuchnia-polska', 'Kuchnia Polska', 'PL'],
  ['cucina-italiana', 'Cucina Italiana', 'IT'],
  ['cocina-espanola', 'Cocina Española', 'ES'],
  ['cuisine-francaise', 'Cuisine Française', 'FR'],
  ['japanese-kitchen', 'Japanese Kitchen', 'JP'],
  ['chinese-kitchen', 'Chinese Kitchen', 'CN'],
  ['indian-kitchen', 'Indian Kitchen', 'IN'],
  ['german-kitchen', 'German Kitchen', 'DE'],
  ['ceska-kuchyne', 'Česká kuchyně', 'CZ'],
];

function shasum(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\[.*?\]\([^)]*\)/g, '')
    .replace(/\*{1,2}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseScalar(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v.startsWith('[') && v.endsWith(']')) {
    try { return JSON.parse(v.replace(/'/g, '"')); } catch (_) {}
  }
  if (/^-?\d+(?:[.,]\d+)?$/.test(v)) return Number(v.replace(',', '.'));
  return v;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const block = text.slice(3, end).replace(/^\n/, '');
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = parseScalar(m[2]);
  }
  return out;
}

function section(text, headingNames) {
  const lines = text.split('\n');
  const wanted = headingNames.map((x) => x.toLowerCase());
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[1].trim().replace(/:$/, '').toLowerCase();
    if (wanted.includes(heading)) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return '';
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

function parseMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const front = parseFrontmatter(raw);
  const ingredientsText = section(raw, ['Ingredients', 'Ingredient']);
  const directionsText = section(raw, ['Directions', 'Direction', 'Instructions', 'Instruction', 'Method']);

  const lines = (x) => x.split('\n').map((s) => s.trim()).filter(Boolean);

  const ingredientLines = lines(ingredientsText)
    .filter((line) => /^[-*+]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim());

  const directionLines = lines(directionsText)
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line && !/^_{3,}$/.test(line));

  return { raw, front, ingredientLines, directionLines };
}

const NUMBER_WORDS = {
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const FRACTION_WORDS = {
  'one half': 0.5,
  'one quarter': 0.25,
  'one fourth': 0.25,
  'one third': 1 / 3,
  'two thirds': 2 / 3,
  'three quarters': 0.75,
  'three fourths': 0.75,
  'a half': 0.5,
  'a quarter': 0.25,
};

const FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function parseQuantity(raw) {
  let s = String(raw).trim().replace(/[–—]/g, '-');

  if (/^(a few|several|some|enough|a little|little)\b/i.test(s)) {
    return { amount: null, rest: s };
  }

  const wordValue = (word) => NUMBER_WORDS[word.toLowerCase()];

  const mixedWord = s.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+and\s+(a |an )?(one half|one quarter|one fourth|one third|two thirds|three quarters|three fourths|a half|a quarter)\b/i);
  if (mixedWord) {
    const whole = wordValue(mixedWord[1]);
    const fracPhrase = mixedWord[3].toLowerCase();
    const frac = FRACTION_WORDS[fracPhrase] ?? (fracPhrase === 'a half' ? 0.5 : fracPhrase === 'a quarter' ? 0.25 : null);
    if (frac != null) {
      return { amount: whole + frac, rest: s.slice(mixedWord[0].length).trim() };
    }
  }

  for (const [phrase, amount] of Object.entries(FRACTION_WORDS)) {
    const re = new RegExp('^' + phrase.replace(/\s+/g, '\\s+') + '\\b', 'i');
    if (re.test(s)) {
      return { amount, rest: s.slice(phrase.length).trim() };
    }
  }

  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)\b/);
  if (mixed && Number(mixed[3])) {
    return {
      amount: Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]),
      rest: s.slice(mixed[0].length).trim(),
    };
  }

  const frac = s.match(/^(\d+)\/(\d+)\b/);
  if (frac && Number(frac[2])) {
    return { amount: Number(frac[1]) / Number(frac[2]), rest: s.slice(frac[0].length).trim() };
  }

  for (const [glyph, amount] of Object.entries(FRACTIONS)) {
    if (s.startsWith(glyph)) return { amount, rest: s.slice(glyph.length).trim() };
  }

  const word = s.match(/^(one|a|an|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
  if (word) {
    return { amount: NUMBER_WORDS[word[1].toLowerCase()], rest: s.slice(word[0].length).trim() };
  }

  const num = s.match(/^(\d+(?:[.,]\d+)?)\b/);
  if (num) return { amount: Number(num[1].replace(',', '.')), rest: s.slice(num[0].length).trim() };

  return { amount: null, rest: s };
}
function normalizeIngredient(raw) {
  const original = cleanText(raw);
  const lower = original.toLowerCase();

  if (/\bto taste\b|\bas desired\b|do smaku/i.test(lower)) {
    return {
      name: original.replace(/\bto taste\b/i, '').replace(/,\s*$/, '').trim() || original,
      amount: null,
      unit: 'do smaku',
    };
  }
  if (/^(?:a )?pinch of\s+/i.test(original)) {
    return {
      name: original.replace(/^(?:a )?pinch of\s+/i, ''),
      amount: null,
      unit: 'szczypta',
    };
  }

  const q = parseQuantity(original);
  const amount = q.amount;
  let rest = q.rest;

  const unitRules = [
    [/^(cups?|cupfuls?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'szkl.' })],
    [/^(tablespoons?|tbsp\.?|tbs\.?|tblsp\.?|spoonfuls?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'łyżka' })],
    [/^(teaspoons?|tsp\.?|teasp?\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'łyżeczka' })],
    [/^(pounds?|pound|lbs?\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'lb' })],
    [/^(ounces?|ounce|oz\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'oz' })],
    [/^(kilograms?|kilogram|kilos?|kg\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'kg' })],
    [/^(grams?|gram|g\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'g' })],
    [/^(liters?|litres?|liter|litre|l\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'l' })],
    [/^(milliliters?|millilitres?|milliliter|millilitre|ml\.?)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'ml' })],
    [/^(pints?|pint)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'pinta' })],
    [/^(quarts?|quart)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'kwarta' })],
    [/^(gallons?|gallon)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'galon' })],
    [/^(pieces?|piece)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'szt.' })],
    [/^(handfuls?|handful)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'garść' })],
    [/^(heads?|head|cloves?|clove|sprigs?|sprig|slices?|slice)\b\s+of?\s*/i, (n) => ({ amount: n, unit: 'szt.' })],
  ];

  if (amount != null) {
    for (const [re, convert] of unitRules) {
      const m = rest.match(re);
      if (m) {
        const mapped = convert(amount);
        rest = rest.slice(m[0].length).trim();
        return {
          name: rest || original,
          amount: Math.round(mapped.amount * 1000) / 1000,
          unit: mapped.unit,
        };
      }
    }

    const egg = rest.match(/^eggs?\b\s*/i);
    if (egg) return { name: rest.slice(egg[0].length).trim() || 'egg', amount, unit: 'szt.' };

    return {
      name: rest.replace(/^of\s+/i, '').trim() || original,
      amount,
      unit: 'szt.',
    };
  }

  return { name: original.replace(/^[,;:-]+/, '').trim(), amount: null, unit: 'opis' };
}

function categoryFor(title, ingredients) {
  const titleText = norm(title);
  const ingredientText = norm(ingredients.join(' '));

  const titleRules = [
    ['cat-pizza', /\b(pizza|pizzas)\b/],
    ['cat-pasta', /\b(pasta|macaroni|spaghetti|lasagn|ravioli|noodles?|vermicelli|dumplings?|pierogi|gnocchi)\b/],
    ['cat-sosy', /\b(sauce|sugo|salsa|ragout|ragu|gravy|mayonnaise|mustard|vinaigrette|dressing|aioli|relish)\b/],
    ['cat-zupy', /\b(soup|soups|broth|chowder|bisque|stew|zupa|consomme|consomm)\b/],
    ['cat-salatki', /\b(salad|salads|slaw|salade|ensalada|sałatka)\b/],
    ['cat-cocktaile', /\b(cocktail|cocktails|punch|drink|drinks|lemonade|tea|coffee)\b/],
    ['cat-ryby', /\b(fish|salmon|cod|herring|tuna|trout|pike|carp|mackerel|eel|eels)\b/],
    ['cat-owoce-morza', /\b(shrimp|prawn|lobster|crab|oyster|mussel|clam|squid|octopus|anchov)\b/],
    ['cat-mieso', /\b(beef|veal|pork|ham|bacon|mutton|lamb|chicken|duck|turkey|goose|sausage|meat|venison|frog legs)\b/],
    ['cat-desery', /\b(cake|cakes|pie|pies|pudding|puddings|dessert|sweet|pastry|tart|cookies?|biscuit|custard|ice cream|chocolate|jelly|candy|zmrzlin)\b/],
    ['cat-pieczywo', /\b(bread|loaf|loaves|rolls?|bun|buns|focaccia|brioche|dough|muffins?)\b/],
    ['cat-warzywa', /\b(vegetable|vegetables|bean|beans|pea|peas|carrot|potato|cabbage|eggplant|aubergine|tomato|mushroom|spinach)\b/],
  ];

  for (const [category, re] of titleRules) {
    if (re.test(titleText)) return category;
  }

  const text = titleText + ' ' + ingredientText;
  const ingredientRules = [
    ['cat-ryby', /\b(fish|salmon|cod|herring|tuna|trout|pike|carp|mackerel|eel|eels)\b/],
    ['cat-owoce-morza', /\b(shrimp|prawn|lobster|crab|oyster|mussel|clam|squid|octopus|anchov)\b/],
    ['cat-mieso', /\b(beef|veal|pork|ham|bacon|mutton|lamb|chicken|duck|turkey|goose|sausage|meat|venison|frog legs)\b/],
    ['cat-pizza', /\b(pizza|pizzas)\b/],
    ['cat-pasta', /\b(pasta|macaroni|spaghetti|lasagn|ravioli|noodles?|vermicelli|dumplings?|pierogi|gnocchi)\b/],
    ['cat-sosy', /\b(sauce|sugo|salsa|ragout|ragu|gravy|mayonnaise|mustard|vinaigrette|dressing|aioli|relish)\b/],
    ['cat-zupy', /\b(soup|soups|broth|chowder|bisque|stew|zupa|consomme|consomm)\b/],
    ['cat-salatki', /\b(salad|salads|slaw|salade|ensalada|sałatka)\b/],
    ['cat-desery', /\b(cake|cakes|pie|pies|pudding|puddings|dessert|sweet|pastry|tart|cookies?|biscuit|custard|ice cream|chocolate|jelly|candy|zmrzlin)\b/],
    ['cat-pieczywo', /\b(bread|loaf|loaves|rolls?|bun|buns|focaccia|brioche|dough|muffins?)\b/],
    ['cat-warzywa', /\b(vegetable|vegetables|bean|beans|pea|peas|carrot|potato|cabbage|eggplant|aubergine|tomato|mushroom|spinach)\b/],
    ['cat-cocktaile', /\b(cocktail|cocktails|punch|drink|drinks|lemonade|tea|coffee)\b/],
  ];
  for (const [category, re] of ingredientRules) {
    if (re.test(text)) return category;
  }
  return 'cat-inne';
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

if (!fs.existsSync(SOURCE)) {
  fs.mkdirSync(WORK, { recursive: true });
  console.log('Cloning archive...');
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/AdamBouhmad/open-recipe-archive.git', SOURCE], { stdio: 'inherit' });
}

const pools = [];
for (const [slug, collectionName, origin] of COLLECTIONS) {
  const dir = path.join(SOURCE, 'collections', slug, 'recipes');
  if (!fs.existsSync(dir)) {
    console.warn('Missing collection: ' + slug);
    continue;
  }
  const files = walk(dir);
  pools.push({ slug, collectionName, origin, files, cursor: 0 });
  console.log(slug + ': ' + files.length + ' source recipes');
}

const selected = [];
const fingerprints = new Set();
const titleCounts = new Map();

function buildRecipe(pool, file) {
  const parsed = parseMarkdown(file);
  const title = cleanText(parsed.front.title || path.basename(file, '.md').replace(/[-_]+/g, ' '));
  if (!title || parsed.ingredientLines.length < 1 || parsed.directionLines.length < 1) return null;

  const rawIngredients = parsed.ingredientLines.join(' | ');
  const rawDirections = parsed.directionLines.join(' | ');
  const fingerprint = shasum(norm(title) + '|' + norm(rawIngredients) + '|' + norm(rawDirections));
  const tKey = norm(title);

  if (fingerprints.has(fingerprint)) return null;
  if ((titleCounts.get(tKey) || 0) >= MAX_SAME_TITLE) return null;

  const ingredients = parsed.ingredientLines.slice(0, 40).map((line, index) => {
    const item = normalizeIngredient(line);
    return {
      id: 'arc_' + fingerprint.slice(0, 12) + '_ing_' + String(index + 1),
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      percent: null,
      flour: /\b(flour|mąka|farine|farina|mehl)\b/i.test(item.name),
      raw: line,
    };
  });

  const steps = parsed.directionLines.slice(0, 40).map((line, index) => ({
    id: 'arc_' + fingerprint.slice(0, 12) + '_stp_' + String(index + 1),
    text: cleanText(line),
  }));

  const sourceYear = Number(parsed.front.source_year || String(parsed.front.date || '').slice(0, 4)) || null;
  const servings = Number(parsed.front.servings) || 4;
  const tempMatch = rawDirections.match(/\b(\d{2,3})\s*°\s*([CF])\b/i);

  const tags = [
    'archiwum',
    'public-domain',
    pool.slug,
    pool.origin,
    ...(Array.isArray(parsed.front.tags) ? parsed.front.tags : []),
  ].map(cleanText).filter(Boolean).slice(0, 16);

  const source = cleanText(parsed.front.source_title || pool.collectionName || 'Open Recipe Archive');
  const sourceUrl = cleanText(parsed.front.source_url || SOURCE_URL);
  const provenance = cleanText(
    (parsed.front.collection_name || pool.collectionName) +
    (sourceYear ? ' · źródło ' + sourceYear : '') +
    (parsed.front.author ? ' · autor: ' + cleanText(parsed.front.author) : '') +
    ' · licencja: ' + cleanText(parsed.front.license || 'public-domain')
  );

  return {
    id: 'rcp_archive_' + fingerprint.slice(0, 20),
    schema: 1,
    name: title,
    originalName: title,
    category: categoryFor(title, parsed.ingredientLines),
    description: provenance,
    photo: '',
    thumb: '',
    servings: Math.max(1, Math.round(servings)),
    yieldAmount: null,
    yieldUnit: 'g',
    prepTime: 0,
    cookTime: 0,
    fermentTime: 0,
    temperature: tempMatch ? tempMatch[1] + ' °' + tempMatch[2].toUpperCase() : '',
    bakers: false,
    sections: [{
      id: 'arc_' + fingerprint.slice(0, 12) + '_sec_1',
      name: 'RECEPTURA',
      ingredients,
    }],
    steps,
    notes: provenance,
    tags,
    favorite: false,
    favoritedAt: 0,
    source,
    sourceUrl,
    traditional: false,
    origin: pool.origin,
    salePrice: null,
    createdAt: 0,
    updatedAt: 0,
    lastOpenedAt: 0,
    openCount: 0,
    archiveCollection: pool.slug,
    archiveCollectionName: pool.collectionName,
    archiveLicense: cleanText(parsed.front.license || 'public-domain'),
    sourceYear,
    sourceAuthor: cleanText(parsed.front.author || ''),
    sourceRepository: SOURCE_URL,
  };
}

const QUOTAS = new Map([
  ['kuchnia-polska', 500],
  ['cucina-italiana', 250],
  ['cocina-espanola', 200],
  ['cuisine-francaise', 200],
  ['indian-kitchen', 150],
  ['chinese-kitchen', 100],
  ['japanese-kitchen', 109],
  ['german-kitchen', 100],
  ['ceska-kuchyne', 91],
]);

function acceptRecipe(recipe) {
  if (!recipe) return false;
  const fingerprint = shasum(
    norm(recipe.name) + '|' +
    recipe.sections[0].ingredients.map((x) => x.raw).join('|') + '|' +
    recipe.steps.map((x) => x.text).join('|')
  );
  if (fingerprints.has(fingerprint)) return false;
  const key = norm(recipe.name);
  if ((titleCounts.get(key) || 0) >= MAX_SAME_TITLE) return false;
  fingerprints.add(fingerprint);
  titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
  selected.push(recipe);
  return true;
}

function chooseFromPool(pool, quota) {
  const candidates = pool.files.map((file) => buildRecipe(pool, file)).filter(Boolean);
  const chosen = new Set();

  const anchors = pool.slug === 'kuchnia-polska'
    ? [/pierogi/i, /żurek|zurek/i, /bigos/i, /barszcz/i, /schabowy/i, /sernik/i]
    : [];

  for (const re of anchors) {
    const anchor = candidates.find((recipe, index) => !chosen.has(index) && re.test(recipe.name));
    if (!anchor) continue;
    const index = candidates.indexOf(anchor);
    if (acceptRecipe(anchor)) chosen.add(index);
  }

  const remaining = quota - [...chosen].length;
  if (remaining <= 0) return [...chosen];

  const stride = candidates.length / remaining;
  for (let i = 0; i < candidates.length && [...chosen].length < quota; i += 1) {
    const target = Math.min(candidates.length - 1, Math.floor(i * stride));
    const recipe = candidates[target];
    if (!recipe) continue;
    if (chosen.has(target)) continue;
    if (acceptRecipe(recipe)) chosen.add(target);
  }

  // Fill gaps from every remaining candidate, keeping the quota hard.
  for (let i = 0; i < candidates.length && [...chosen].length < quota; i += 1) {
    if (chosen.has(i)) continue;
    if (acceptRecipe(candidates[i])) chosen.add(i);
  }
  return [...chosen];
}

for (const pool of pools) {
  const quota = QUOTAS.get(pool.slug) || 0;
  if (!quota) continue;
  const before = selected.length;
  chooseFromPool(pool, Math.min(quota, pool.files.length));
  console.log(pool.slug + ': selected ' + (selected.length - before) + ' / ' + quota);
}

if (selected.length < 1201) {
  throw new Error('Only ' + selected.length + ' unique recipes were built. Need more than 1200.');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const parts = Math.ceil(selected.length / CHUNK_SIZE);
for (let start = 0, part = 1; start < selected.length; start += CHUNK_SIZE, part += 1) {
  const chunk = selected.slice(start, start + CHUNK_SIZE);
  const file = path.join(OUT, 'part-' + String(part).padStart(2, '0') + '.js');
  fs.writeFileSync(file, 'export const ARCHIVE_RECIPES_PART = ' + JSON.stringify(chunk) + ';\n', 'utf8');
}

const imports = [];
for (let part = 1; part <= parts; part += 1) {
  imports.push("import { ARCHIVE_RECIPES_PART as P" + part + " } from './part-" + String(part).padStart(2, '0') + ".js';");
}
const all = 'export const ARCHIVE_RECIPES = [' +
  Array.from({ length: parts }, (_, i) => '...P' + (i + 1)).join(', ') +
  '];\n';
fs.writeFileSync(path.join(OUT, 'index.js'), imports.join('\n') + '\n\n' + all, 'utf8');

const stats = {};
for (const r of selected) stats[r.archiveCollection] = (stats[r.archiveCollection] || 0) + 1;

fs.writeFileSync(
  path.join(OUT, 'BUILD-META.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceRepository: SOURCE_URL,
    target: TARGET,
    count: selected.length,
    uniqueFingerprints: fingerprints.size,
    maxSameNormalizedTitle: MAX_SAME_TITLE,
    byCollection: stats,
  }, null, 2) + '\n',
  'utf8'
);

fs.rmSync(WORK, { recursive: true, force: true });

console.log('Built ' + selected.length + ' genuine archive recipes.');
console.log(JSON.stringify(stats, null, 2));
