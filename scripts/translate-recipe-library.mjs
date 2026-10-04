#!/usr/bin/env node
/*
  Stage 54 — static recipe translator.
  Uses the free Google Translate web endpoint from GitHub Actions.
  It rewrites only visible recipe text: name, ingredient names, steps.
  originalName/raw/source remain untouched.
*/
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PARTS = Array.from({length: 9}, (_, i) => path.join(ROOT, 'recipe-library-data', `part-${String(i + 1).padStart(2, '0')}.js`));
const CONCURRENCY = 2;
const MAX_RETRIES = 8;
const DELAY_MS = 450;
const MAX_PAYLOAD_CHARS = 2800;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parsePart(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('Nie znaleziono tablicy receptur.');
  return JSON.parse(text.slice(start, end + 1));
}

function emitPart(recipes) {
  return `export const ARCHIVE_RECIPES_PART = ${JSON.stringify(recipes)};\n`;
}

function cleanName(name) {
  return String(name ?? '')
    .replace(/\\+"/g, '"')
    .replace(/[“”„‟]/g, '"')
    .replace(/"/g, '')
    .replace(/\\s*[({[][^)}\\]]*[)}\\]]/g, ' ')
    .replace(/[:;]+/g, ' ')
    .replace(/\\s{2,}/g, ' ')
    .replace(/^[\\s.,:;|]+|[\\s.,:;|]+$/g, '')
    .trim();
}

function extractTranslatedMarkers(text, markers) {
  const out = {};
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const next = markers[i + 1];
    const a = text.indexOf(marker);
    if (a < 0) return null;
    const start = a + marker.length;
    const b = next ? text.indexOf(next, start) : text.length;
    if (b < 0) return null;
    out[marker] = text.slice(start, b).trim();
  }
  return out;
}

async function googleTranslate(text) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pl&dt=t&q=${q}`;
  let last = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 Kucharek/1.0', 'Accept': 'application/json,text/plain,*/*' },
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = Array.isArray(data?.[0]) ? data[0].map(x => x?.[0] || '').join('') : '';
      if (!translated) throw new Error('Pusta odpowiedź tłumacza');
      return translated;
    } catch (e) {
      last = e;
      const backoff = Math.min(30000, 1500 * (2 ** attempt)) + Math.round(Math.random() * 500);
      console.warn(`Tłumaczenie retry ${attempt + 1}/${MAX_RETRIES}: ${e.message}; czekam ${backoff} ms`);
      await sleep(backoff);
    }
  }
  throw last || new Error('Tłumaczenie nie powiodło się');
}

async function translateRecipe(recipe, index) {
  const fields = [];
  const markers = [];
  const push = (marker, value) => {
    markers.push(marker);
    fields.push(marker + String(value ?? '').replace(/\\u0000/g, ' '));
  };
  push('[[NAME]]', recipe.name || recipe.originalName || '');
  for (const [si, section] of (recipe.sections || []).entries()) {
    for (const [ii, ing] of (section.ingredients || []).entries()) {
      push(`[[I:${si}:${ii}]]`, ing.name || '');
    }
  }
  for (const [si, step] of (recipe.steps || []).entries()) {
    push(`[[S:${si}]]`, step.text || '');
  }
  const batches = [];
  let batch = [];
  let batchLen = 0;
  for (let i = 0; i < fields.length; i++) {
    const part = fields[i];
    if (batch.length && batchLen + part.length + 1 > MAX_PAYLOAD_CHARS) {
      batches.push(batch);
      batch = [];
      batchLen = 0;
    }
    batch.push(part);
    batchLen += part.length + 1;
  }
  if (batch.length) batches.push(batch);

  const parsed = {};
  for (const b of batches) {
    const translated = await googleTranslate(b.join('\n'));
    const part = extractTranslatedMarkers(translated, b.map(v => v.slice(0, v.indexOf(']]') + 2)));
    if (part) {
      Object.assign(parsed, part);
      continue;
    }
    // Last-resort field-by-field retry when the translator modifies markers.
    for (const field of b) {
      const marker = field.slice(0, field.indexOf(']]') + 2);
      const source = field.slice(marker.length);
      parsed[marker] = await googleTranslate(source);
      await sleep(DELAY_MS);
    }
  }

  const next = {
    ...recipe,
    originalName: recipe.originalName || recipe.name || '',
    name: cleanName(parsed['[[NAME]]'] || recipe.name || recipe.originalName || ''),
    sections: (recipe.sections || []).map((section, si) => ({
      ...section,
      ingredients: (section.ingredients || []).map((ing, ii) => ({
        ...ing,
        name: String(parsed[`[[I:${si}:${ii}]]`] || ing.name || '').trim()
      }))
    })),
    steps: (recipe.steps || []).map((step, si) => ({
      ...step,
      text: String(parsed[`[[S:${si}]]`] || step.text || '').trim()
    })),
    translationLanguage: 'pl',
    translationVersion: 2,
  };
  if (!next.name) throw new Error(`Pusta nazwa po tłumaczeniu: ${recipe.id}`);
  if ((index + 1) % 25 === 0) console.log(`Przetłumaczono ${index + 1}/1700`);
  await sleep(DELAY_MS);
  return next;
}

const all = [];
for (const file of PARTS) {
  const text = await fs.readFile(file, 'utf8');
  all.push({file, recipes: parsePart(text)});
}

const flat = all.flatMap(x => x.recipes);
if (flat.length !== 1700) throw new Error(`Oczekiwano 1700 rekordów, jest ${flat.length}`);

let cursor = 0;
const out = new Array(flat.length);
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= flat.length) return;
    out[i] = await translateRecipe(flat[i], i);
  }
}
await Promise.all(Array.from({length: CONCURRENCY}, worker));

const idsBefore = new Set(flat.map(r => r.id));
const idsAfter = new Set(out.map(r => r.id));
if (idsAfter.size !== 1700 || [...idsBefore].some(id => !idsAfter.has(id))) {
  throw new Error('Zmiana/duplikacja stabilnych ID podczas tłumaczenia.');
}

for (let i = 0; i < all.length; i++) {
  const start = all[i].recipes[0]?.id;
  const end = all[i].recipes.at(-1)?.id;
  const slice = out.slice(flat.findIndex(r => r.id === start), out.findIndex(r => r.id === end) + 1);
  await fs.writeFile(all[i].file, emitPart(slice), 'utf8');
}
console.log('Stage 54 translation complete: 1700/1700 records written.');
