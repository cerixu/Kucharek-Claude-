/* ==========================================================================
   recipe-library.js — prawdziwy korpus startowy Kucharka.
   Źródło: AdamBouhmad/open-recipe-archive (public-domain).
   Ten plik NIE mnoży wariantów. Każdy rekord pochodzi z osobnej receptury
   archiwalnej i ma stabilne ID oparte na skrócie treści.
   ========================================================================== */

import { ARCHIVE_RECIPES } from './recipe-library-data/index.js';
import { translateRecipe, normalizeArchivePolishText, normalizeArchivePolishName, normalizeArchivePolishTag } from './recipe-translation.js';


const UNIT_FACTORS = {
  oz: ['g', 28.349523125],
  ounce: ['g', 28.349523125],
  ounces: ['g', 28.349523125],
  lb: ['g', 453.59237],
  pound: ['g', 453.59237],
  pounds: ['g', 453.59237],
  cup: ['ml', 236.5882365],
  cups: ['ml', 236.5882365],
  tbsp: ['ml', 14.7867648],
  tablespoon: ['ml', 14.7867648],
  tablespoons: ['ml', 14.7867648],
  tsp: ['ml', 4.92892159],
  teaspoon: ['ml', 4.92892159],
  teaspoons: ['ml', 4.92892159],
  pint: ['ml', 473.176473],
  pints: ['ml', 473.176473],
  quart: ['ml', 946.352946],
  quarts: ['ml', 946.352946],
  gallon: ['l', 3.785411784],
  gallons: ['l', 3.785411784],
  inch: ['cm', 2.54],
  inches: ['cm', 2.54],
};

function roundKitchenAmount(n) {
  if (!Number.isFinite(n)) return n;
  if (Math.abs(n) >= 100) return Math.round(n);
  if (Math.abs(n) >= 10) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

function normalizeArchiveIngredient(i) {
  const next = { ...i, name: normalizeArchivePolishText(i.name) };
  const key = String(i.unit || '').trim().toLowerCase();
  const conversion = UNIT_FACTORS[key];
  if (!conversion || !Number.isFinite(Number(i.amount))) return next;
  const [unit, factor] = conversion;
  next.amount = roundKitchenAmount(Number(i.amount) * factor);
  next.unit = unit;
  return next;
}

function normalizeArchiveRecipe(r) {
  const next = {
    ...r,
    name: normalizeArchivePolishName(r.name),
    description: normalizeArchivePolishText(r.description),
    notes: normalizeArchivePolishText(r.notes),
    tags: Array.isArray(r.tags) ? r.tags.map((t) => normalizeArchivePolishTag(t)) : [],
    sections: (r.sections || []).map((s) => ({
      ...s,
      name: normalizeArchivePolishText(s.name),
      ingredients: (s.ingredients || []).map(normalizeArchiveIngredient),
    })),
    steps: (r.steps || []).map((s) => ({ ...s, text: normalizeArchivePolishText(s.text) })),
    translationLanguage: 'pl',
    translationVersion: 32,
  };
  return next;
}

export function recipeLibrary(now = Date.now()) {
  return ARCHIVE_RECIPES.map((r) => {
    const translated = r.translationLanguage === 'pl' && Number(r.translationVersion || 0) >= 10 ? r : translateRecipe(r);
    return {
      ...normalizeArchiveRecipe(translated),
      createdAt: now,
      updatedAt: now,
    };
  });
}
