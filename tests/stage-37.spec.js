import { test, expect } from '@playwright/test';

test.describe('Stage 37: GOTUJĘ', () => {
  test('GOTUJĘ zapisuje postęp składnika i przywraca go po reloadzie', async ({ page }) => {
    await page.goto('/#/cook/rcp_seed_pizza');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const row = page.getByRole('checkbox').first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(row).toHaveAttribute('aria-checked', 'true');
    await page.reload();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');
  });

  test('GOTUJĘ ma minutnik i skalowanie w jednym miejscu', async ({ page }) => {
    await page.goto('/#/cook/rcp_seed_pizza');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByRole('button', { name: 'Minutnik' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Przelicz' })).toBeVisible();
    await page.getByRole('button', { name: 'Przelicz' }).click();
    const dialog = page.getByRole('dialog', { name: 'Przelicz w trakcie gotowania' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '×2' }).click();
    await expect(page.getByText(/Przeliczone ×2/)).toBeVisible();
  });

  test('GOTUJĘ zachowuje dostęp do uwag i zakończenia pracy', async ({ page }) => {
    await page.goto('/#/cook/rcp_seed_pizza');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByRole('button', { name: 'Zakończ' })).toBeVisible();
    await page.getByRole('button', { name: 'Uwagi' }).click();
    await expect(page.getByLabel('Własne uwagi')).toBeVisible();
  });
});
