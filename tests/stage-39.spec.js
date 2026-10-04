import { test, expect } from '@playwright/test';

test.describe('Stage 39: Zakupy', () => {
  test('dodawanie łączy duplikaty i zachowuje jednostkę', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const out = await page.evaluate(async () => {
      const s = await import('/shopping.js');
      await s.addItems([
        { name:'Mąka Stage 39', amount:2, unit:'kg' },
        { name:'Mąka Stage 39', amount:1, unit:'kg' }
      ]);
      const rows = (await import('/recipes.js')).state.shopping.filter(x => x.name === 'Mąka Stage 39' && !x.done);
      return { count:rows.length, amount:rows[0]?.amount, unit:rows[0]?.unit };
    });
    expect(out.count).toBe(1);
    expect(out.amount).toBe(3);
    expect(out.unit).toBe('kg');
  });

  test('oznaczenie kupione zasila Magazyn i zamyka pozycję', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const out = await page.evaluate(async () => {
      const s = await import('/shopping.js');
      const i = await import('/inventory.js');
      await s.addItems([{ name:'Pomidor Stage 39', amount:2, unit:'kg' }]);
      const row = (await import('/recipes.js')).state.shopping.find(x => x.name === 'Pomidor Stage 39' && !x.done);
      const result = await s.markPurchased(row);
      await i.reloadInventory();
      const inv = i.findInventoryByName('Pomidor Stage 39');
      return { received:result.received, done:row.done, qty:inv?.quantity, unit:inv?.unit };
    });
    expect(out.received).toBe(true);
    expect(out.done).toBe(true);
    expect(out.qty).toBe(2);
    expect(out.unit).toBe('kg');
  });

  test('ekran Zakupy udostępnia grupowanie i czyszczenie kupionych', async ({ page }) => {
    await page.goto('/#/shopping');
    await expect(page.getByText('Zakupy', { exact:true })).toBeVisible();
    await expect(page.getByText('Grupowanie', { exact:true })).toBeVisible();
    await expect(page.getByRole('button', { name:'Wyczyść kupione' })).toBeVisible();
  });
});
