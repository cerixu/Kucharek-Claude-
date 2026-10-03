import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('PWA: service worker rejestruje się i zgłasza wersję Kucharek', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error('Brak aktywnego service workera');
  });
  const out = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.active) throw new Error('Brak aktywnego service workera');
    return await new Promise((resolve) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 2000);
      ch.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      reg.active.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
    });
  });
  expect(out?.version).toMatch(/^kucharek-claude-/);
});

test('PWA: po zapisaniu cache aplikacja otwiera się offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error('Brak aktywnego service workera');
  });

  await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#view')).toBeVisible();
  await context.setOffline(false);
});

test('PWA: komunikaty użytkownika nie wracają do starej nazwy Kucharzyna', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  const source = await page.evaluate(async () => {
    const files = ['app.js', 'pwa.js', 'views-settings.js'];
    const texts = await Promise.all(files.map(async (f) => await (await fetch(f, { cache: 'no-store' })).text()));
    return texts.join('\n');
  });
  expect(source).not.toContain('Kucharzyna zapisuje dane lokalnie');
  expect(source).not.toContain('Nowa wersja Kucharzyny jest dostępna');
  expect(source).not.toContain('Kucharzyna nie ma konta');
});
