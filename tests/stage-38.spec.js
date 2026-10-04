import { test, expect } from '@playwright/test';

test.describe('Stage 38: Magazyn 2.0', () => {
  test('strata aktualizuje stan, koszt i ruch magazynowy', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const out = await page.evaluate(async () => {
      const i = await import('/inventory.js');
      const p = await import('/pro.js');
      const item = await i.saveInventoryItem({ name:'Rukola Stage 38', quantity:2, unit:'kg', purchasePrice:20, priceUnit:'kg' });
      const waste = await p.recordWaste(item.id, 0.4, 'zepsucie', 'koniec zmiany');
      const moves = (await p.listMovements()).filter(x => x.sourceId === waste.id);
      return { qty:i.findInventoryByName('Rukola Stage 38')?.quantity, cost:waste.costValue, moves:moves.length, type:moves[0]?.type };
    });
    expect(out.qty).toBeCloseTo(1.6, 8);
    expect(out.cost).toBeCloseTo(8, 8);
    expect(out.moves).toBe(1);
    expect(out.type).toBe('waste');
  });

  test('raport tygodniowy grupuje produkt i powód', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const out = await page.evaluate(async () => {
      const i = await import('/inventory.js');
      const p = await import('/pro.js');
      const a = await i.saveInventoryItem({ name:'Sos Stage 38', quantity:3, unit:'kg', purchasePrice:30, priceUnit:'kg' });
      const b = await i.saveInventoryItem({ name:'Sos Stage 38 B', quantity:2, unit:'kg', purchasePrice:10, priceUnit:'kg' });
      await p.recordWaste(a.id,0.5,'zepsucie');
      await p.recordWaste(a.id,0.25,'produkcja');
      await p.recordWaste(b.id,0.5,'zepsucie');
      return p.wasteReport(Date.now()-7*86400000,Date.now()+1000);
    });
    expect(out.totalEntries).toBeGreaterThanOrEqual(3);
    expect(out.totalCost).toBeGreaterThanOrEqual(20);
    expect(out.products.find(x => x.name === 'Sos Stage 38')?.count).toBe(2);
    expect(out.reasons.find(x => x.reason === 'zepsucie')?.count).toBe(2);
  });

  test('UI Magazyn Pro pokazuje raport strat i automatykę', async ({ page }) => {
    await page.goto('/#/pro?tab=waste');
    await expect(page.getByText('Raport strat', { exact:true })).toBeVisible();
    await expect(page.getByRole('button', { name:'Dodaj stratę' })).toBeVisible();
    await page.goto('/#/pro?tab=automation');
    await expect(page.getByText('Autopilot magazynu', { exact:true })).toBeVisible();
    await expect(page.getByRole('button', { name:/Uruchom autopilota teraz/ })).toBeVisible();
  });
});
