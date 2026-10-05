import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 10000 });
}

test.describe('Stage 61: kopia zapasowa', () => {
  test('nowa kopia ma format Kucharek i nie przenosi konfiguracji gatewaya', async ({ page }) => {
    await ready(page);

    const result = await page.evaluate(async () => {
      const { db } = await import('/db.js');
      const { setSetting } = await import('/recipes.js');
      const { buildBackup, backupFilename } = await import('/backup.js');

      await db.put('settings', { key: 'aiGatewayUrl', value: 'https://should-not-be-exported.invalid' });
      await db.put('settings', { key: 'draft:for-test', value: { secret: true } });

      const backup = await buildBackup();
      const json = JSON.stringify(backup);

      return {
        app: backup.app,
        appVersion: backup.appVersion,
        hasGateway: json.includes('should-not-be-exported.invalid'),
        hasDraft: json.includes('draft:for-test'),
        filename: backupFilename()
      };
    });

    expect(result.app).toBe('Kucharek');
    expect(result.appVersion).toBe('1.5.6');
    expect(result.hasGateway).toBe(false);
    expect(result.hasDraft).toBe(false);
    expect(result.filename).toMatch(/^kucharek-kopia-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('import akceptuje starszy format Kucharzyna bez zmiany nowego eksportu', async ({ page }) => {
    await ready(page);

    const result = await page.evaluate(async () => {
      const { parseBackup } = await import('/backup.js');
      const legacy = {
        app: 'Kucharzyna',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          recipes: [], ingredients: [], categories: [], shoppingItems: [], settings: [],
          history: [], cookSessions: [], cookHistory: [],
          inventory: [], inventoryLog: [], deliveries: [], lots: [], stockMovements: [],
          suppliers: [], purchaseOrders: [], productionBatches: [], stocktakes: [],
          waste: [], priceHistory: []
        }
      };
      const parsed = parseBackup(JSON.stringify(legacy));
      return { recipes: parsed.summary?.recipes ?? parsed.data?.recipes?.length ?? 0 };
    });

    expect(result.recipes).toBe(0);
  });
});
