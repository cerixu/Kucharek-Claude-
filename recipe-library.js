/* ==========================================================================
   recipe-library.js — prawdziwy korpus startowy Kucharka.
   Źródło: AdamBouhmad/open-recipe-archive (public-domain).
   Ten plik NIE mnoży wariantów. Każdy rekord pochodzi z osobnej receptury
   archiwalnej i ma stabilne ID oparte na skrócie treści.
   ========================================================================== */

import { ARCHIVE_RECIPES } from './recipe-library-data/index.js';

export function recipeLibrary(now = Date.now()) {
  return ARCHIVE_RECIPES.map((r) => ({
    ...r,
    createdAt: now,
    updatedAt: now,
  }));
}
