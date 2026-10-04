import { test, expect } from '@playwright/test';

test('Kucharek kończy splash i uruchamia aplikację', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('#boot')).toBeHidden({ timeout: 10000 });
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 10000 });
  await expect(page.locator('#tabbar')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
