import { test, expect } from '@playwright/test';

// Final Stage 50 gate: real archive corpus + UI search + provenance checks.
test.describe('Stage 50 — real recipe corpus', () => {
  test('contains >1200 real archive recipes, deduped and structured', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const meta = await page.evaluate(async () => {
      const m = await import('./recipe-library.js?stage50=corpus');
      const rows = m.recipeLibrary(0);
      const ids = new Set(rows.map((r) => r.id));
      const fingerprints = new Set(rows.map((r) => [
        r.name,
        ...(r.sections || []).flatMap((s) => (s.ingredients || []).map((i) => i.raw || i.name)),
        ...(r.steps || []).map((s) => s.text),
      ].join('|')));
      const collections = new Set(rows.map((r) => r.archiveCollection));
      const titles = new Map();
      rows.forEach((r) => {
        const k = r.name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
        titles.set(k, (titles.get(k) || 0) + 1);
      });
      const maxSameTitle = Math.max(...titles.values());
      const withIngredients = rows.filter((r) => r.sections?.some((s) => s.ingredients?.length >= 3)).length;
      const withSteps = rows.filter((r) => Array.isArray(r.steps) && r.steps.length >= 1).length;
      const sourced = rows.filter((r) => r.archiveLicense === 'public-domain' && r.sourceRepository);
      const noArtificialProfile = rows.filter((r) => !/\\s•\\s/.test(r.name) && !/^Kucharek — biblioteka/i.test(r.source || '')).length;
      const categories = new Set(rows.map((r) => r.category));
      const archiveIds = rows.filter((r) => /^rcp_archive_[a-z0-9]+$/.test(r.id)).length;
      const rawIngredients = rows.filter((r) => r.sections?.some((s) => s.ingredients?.every((i) => i.raw))).length;
      const numericAmounts = rows.filter((r) => r.sections?.some((s) => s.ingredients?.some((i) => typeof i.amount === 'number'))).length;
      const frog = rows.find((r) => /frog legs/i.test(r.name));
      const mixed = rows.flatMap((r) => r.sections || []).flatMap((s) => s.ingredients || []).find((i) => /one and one half cupfuls/i.test(i.raw || ''));
      return {
        count: rows.length,
        uniqueIds: ids.size,
        uniqueFingerprints: fingerprints.size,
        collections: collections.size,
        maxSameTitle,
        withIngredients,
        withSteps,
        sourced: sourced.length,
        noArtificialProfile,
        archiveIds,
        rawIngredients,
        numericAmounts,
        frogCategory: frog?.category || '',
        mixedAmount: mixed?.amount ?? null,
        mixedUnit: mixed?.unit || '',
        categories: categories.size,
        categoryValues: [...categories],
      };
    });

    expect(meta.count).toBeGreaterThan(1200);
    expect(meta.uniqueIds).toBe(meta.count);
    expect(meta.uniqueFingerprints).toBe(meta.count);
    expect(meta.collections).toBeGreaterThanOrEqual(6);
    expect(meta.maxSameTitle).toBeLessThanOrEqual(3);
    expect(meta.withIngredients).toBeGreaterThan(1200);
    expect(meta.withSteps).toBeGreaterThan(1200);
    expect(meta.sourced).toBe(meta.count);
    expect(meta.noArtificialProfile).toBe(meta.count);
    expect(meta.archiveIds).toBe(meta.count);
    expect(meta.rawIngredients).toBe(meta.count);
    expect(meta.numericAmounts).toBeGreaterThan(500);
    expect(meta.frogCategory).toBe('cat-mieso');
    expect(meta.mixedAmount).toBe(1.5);
    expect(meta.mixedUnit).toBe('szkl.');
    expect(meta.categories).toBeGreaterThanOrEqual(10);

    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();
    await expect(page.locator('.counter')).toHaveText(/[0-9]{4,} receptur/);
  });

  test('recipe search works against the real archive corpus', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true && /[0-9]{4,} receptur/.test(document.querySelector('.counter')?.textContent || ''));
    const known = await page.evaluate(async () => {
      const { listRecipes, searchText } = await import('/recipes.js');
      const row = listRecipes().find(r => /frog legs/i.test(r.name));
      return { id: row?.id || '', name: row?.name || '', indexed: row ? searchText(row).includes('frog legs') : false };
    });
    expect(known.id).toMatch(/^rcp_archive_/);
    expect(known.indexed).toBe(true);

    const search = page.getByRole('searchbox', { name: 'Szukaj' });
    await expect(search).toBeVisible();
    await search.fill('frog legs');
    await page.waitForTimeout(250);
    await expect(page.locator('.counter')).toHaveText(/[0-9]+ receptur/);
    await expect(page.locator('.list').first()).toContainText(/frog legs/i);
  });
});
