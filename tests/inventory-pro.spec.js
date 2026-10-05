import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 10000 });
}

test.describe('Stage 60: Magazyn PRO i automatyczne zużycie', () => {
  test('strata odejmuje stan, zapisuje koszt i trafia do raportu tygodniowego', async ({ page }) => {
    await ready(page);

    const result = await page.evaluate(async () => {
      const { db } = await import('/db.js');
      const { seedTestInventory, listInventory } = await import('/inventory.js');
      const { recordWaste, wasteReport } = await import('/pro.js');

      await db.clear('inventory');
      await db.clear('inventoryLog');
      await db.clear('waste');
      await db.clear('stockMovements');
      await seedTestInventory();

      const item = listInventory().find((x) => x.id === 'demo_stock_flour');
      const row = await recordWaste(item.id, 0.2, 'zepsucie', 'test Stage 60');
      const after = listInventory().find((x) => x.id === item.id);
      const report = await wasteReport();

      return {
        before: item.quantity,
        after: after?.quantity,
        amount: row.amount,
        unit: row.unit,
        costValue: row.costValue,
        totalCost: report.totalCost,
        totalEntries: report.totalEntries,
        topProduct: report.topProduct?.name
      };
    });

    expect(result.before).toBe(1.2);
    expect(result.after).toBe(1.0);
    expect(result.amount).toBe(0.2);
    expect(result.unit).toBe('kg');
    expect(result.costValue).toBeCloseTo(0.9, 6);
    expect(result.totalCost).toBeCloseTo(0.9, 6);
    expect(result.totalEntries).toBe(1);
    expect(result.topProduct).toBe('Mąka 00 test');
  });

  test('automatyczne zużycie działa w jednostkach bazowych i nie podwaja wpisu', async ({ page }) => {
    await ready(page);

    const result = await page.evaluate(async () => {
      const { db } = await import('/db.js');
      const { seedTestInventory, listInventory, consumeRecipeIngredients } = await import('/inventory.js');

      await db.clear('inventory');
      await db.clear('inventoryLog');
      await db.clear('stockMovements');
      await seedTestInventory();

      const recipe = {
        id: 'stage60-recipe',
        name: 'Testowe danie',
        sections: [{
          name: '',
          ingredients: [
            { id: 'ing-1', name: 'Mąka 00 test', amount: 500, unit: 'g' },
            { id: 'ing-2', name: 'Oliwa EVO test', amount: 250, unit: 'ml' }
          ]
        }]
      };

      const first = await consumeRecipeIngredients(recipe, 1, { sourceId: 'stage60-cook-1' });
      const second = await consumeRecipeIngredients(recipe, 1, { sourceId: 'stage60-cook-1' });
      const flour = listInventory().find((x) => x.id === 'demo_stock_flour');
      const oil = listInventory().find((x) => x.id === 'demo_stock_oil');

      return {
        firstChanges: first.changes.map((x) => ({ name: x.name, quantity: x.quantity, unit: x.unit })),
        shortages: first.shortages,
        secondAlreadyConsumed: second.alreadyConsumed === true,
        flour: flour && { quantity: flour.quantity, unit: flour.unit },
        oil: oil && { quantity: oil.quantity, unit: oil.unit }
      };
    });

    expect(result.shortages).toEqual([]);
    expect(result.firstChanges).toHaveLength(2);
    expect(result.secondAlreadyConsumed).toBe(true);
    expect(result.flour).toEqual({ quantity: 0.7, unit: 'kg' });
    expect(result.oil).toEqual({ quantity: 0.55, unit: 'l' });
  });
});
