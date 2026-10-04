import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

async function ready(page, path = '/') {
  await page.goto('/#' + path);
  await page.waitForFunction(() => window.__kucharzyna?.ready === true, null, { timeout: 30000 });
}

test.describe('Etapy 36–43: kontrakt funkcjonalny iPhone', () => {
  test('36: biblioteka ma 1200+ receptur i jest załadowana do IndexedDB', async ({ page }) => {
    await ready(page);
    const result = await page.evaluate(async () => {
      const { recipeLibrary } = await import('/recipe-library.js');
      const { listRecipes } = await import('/recipes.js');
      const lib = recipeLibrary();
      const ids = new Set(lib.map(r => r.id));
      const loaded = listRecipes();
      return { library: lib.length, unique: ids.size, loaded: loaded.length };
    });
    expect(result.library).toBeGreaterThanOrEqual(1200);
    expect(result.unique).toBe(result.library);
    expect(result.loaded).toBeGreaterThanOrEqual(1200);
  });

  test('36: szczegóły receptury pokazują domyślnie jedną porcję i przeliczanie', async ({ page }) => {
    await ready(page, '/recipe/rcp_seed_pizza');
    await expect(page.getByText('1 porcja', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Przelicz' })).toBeVisible();
  });

  test('37: Gotuję ma postęp, przeliczanie i minutnik', async ({ page }) => {
    await ready(page, '/cook/rcp_seed_pizza');
    await expect(page.getByRole('button', { name: 'Minutnik' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Przelicz' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.locator('.cook-row').first()).toBeVisible();
  });

  test('38: Magazyn zapisuje stratę i raport tygodniowy', async ({ page }) => {
    await ready(page, '/inventory');
    const out = await page.evaluate(async () => {
      const { saveInventoryItem } = await import('/inventory.js');
      const { recordWaste, wasteReport } = await import('/pro.js');
      const item = await saveInventoryItem({ id: 'e2e-stage38', name: 'Rukola QA', quantity: 5, unit: 'kg', purchasePrice: 20, priceUnit: 'kg' });
      const row = await recordWaste(item.id, 1, 'zepsucie', 'QA');
      const report = await wasteReport();
      return { remaining: row.after, cost: row.costValue, entries: report.totalEntries, totalCost: report.totalCost };
    });
    expect(out.remaining).toBe(4);
    expect(out.cost).toBeCloseTo(20, 6);
    expect(out.entries).toBeGreaterThan(0);
    expect(out.totalCost).toBeGreaterThanOrEqual(20);
  });

  test('39: Zakupy przyjmują pozycję z przepisu', async ({ page }) => {
    const out = await page.evaluate(async () => {
      const { addItems, listShopping } = await import('/shopping.js');
      await addItems([{ name: 'Mąka QA', amount: 2, unit: 'kg', recipeId: 'e2e-stage', recipeName: 'QA' }]);
      return listShopping().some(x => x.name === 'Mąka QA' && !x.done);
    });
    expect(out).toBe(true);
    await ready(page, '/shopping');
    await expect(page.getByText('Mąka QA', { exact: true })).toBeVisible();
  });

  test('40: Kalkulatory PRO mają pizzę, procenty, skalowanie i food cost', async ({ page }) => {
    await ready(page, '/calc');
    for (const label of ['Pizza i ciasto', 'Procenty', 'Przeliczanie receptury', 'Koszt receptury']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await page.getByRole('link', { name: /Pizza i ciasto/ }).click();
    await expect(page.getByText('Woda', { exact: true })).toBeVisible();
  });

  test('41: import i Kucharek AI mają bezpieczny interfejs gatewaya', async ({ page }) => {
    await ready(page, '/import');
    await expect(page.getByRole('button', { name: 'Rozpoznaj przepis' })).toBeVisible();
    await ready(page, '/settings');
    await expect(page.getByText('Adres AI Gateway', { exact: true })).toBeVisible();
    await expect(page.getByText('Token gatewaya (tylko ta sesja)', { exact: true })).toBeVisible();
  });

  test('42–43: Amator/Pro i Liquid Glass nie psują mobilnego viewportu', async ({ page }) => {
    await ready(page, '/settings');
    await expect(page.getByText('Tryb aplikacji', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Amator', exact: true }).click();
    await expect(page.locator('html[data-mode="amateur"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Pro', exact: true }).click();
    await expect(page.locator('html[data-mode="pro"]')).toHaveCount(1);
    for (const path of ['/', '/recipes', '/cook', '/inventory', '/calc', '/settings']) {
      await ready(page, path);
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        glass: getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim()
      }));
      expect(m.overflow).toBeLessThanOrEqual(1);
      expect(m.glass).toBeTruthy();
    }
  });
});
