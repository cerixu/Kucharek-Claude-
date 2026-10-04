import { test, expect } from '@playwright/test';

test.describe('Stage 36: biblioteka receptur', () => {
  test('ładowane jest 1200+ prawdziwych receptur archiwalnych jako normalne rekordy', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharek?.ready === true);
    const result = await page.evaluate(() => {
      const rows = [...window.__kucharek.state.recipes.values()];
      const archive = rows.filter(r => String(r.id).startsWith('rcp_archive_'));
      return {
        count: rows.length,
        archiveCount: archive.length,
        uniqueArchiveIds: new Set(archive.map(r => r.id)).size,
        artificialVariants: archive.filter(r => /\s•\s/.test(r.name)).length,
      };
    });
    expect(result.count).toBeGreaterThanOrEqual(1200);
    expect(result.archiveCount).toBeGreaterThanOrEqual(1700);
    expect(result.uniqueArchiveIds).toBe(result.archiveCount);
    expect(result.artificialVariants).toBe(0);
  });

  test('biblioteka jest przeszukiwalna i ma poprawne rekordy archiwalne', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharek?.ready === true);
    const result = await page.evaluate(() => {
      const rows = [...window.__kucharek.state.recipes.values()];
      const r = rows.find(x => /Żabie Udka/.test(x.name) && x.archiveCollection === 'kuchnia-polska');
      return {
        name: r?.name,
        ingredients: r?.sections?.[0]?.ingredients?.length,
        steps: r?.steps?.length,
        origin: r?.origin,
        source: r?.source,
        license: r?.archiveLicense,
      };
    });
    expect(result.name).toContain('Żabie Udka');
    expect(result.ingredients).toBeGreaterThanOrEqual(4);
    expect(result.steps).toBeGreaterThanOrEqual(3);
    expect(result.origin).toBe('PL');
    expect(result.license).toBe('public-domain');
    expect(result.source).toContain('Kuchnia polsko-amerykańska');
  });

  test('szczegóły receptury domyślnie skalują widok do 1 porcji', async ({ page }) => {
    await page.goto('/#/recipe/rcp_seed_pizza');
    await page.waitForFunction(() => window.__kucharek?.ready === true);
    await expect(page.getByText('1 porcja', { exact: true })).toBeVisible();
  });
});
