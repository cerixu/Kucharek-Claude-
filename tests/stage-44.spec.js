import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });
test.describe.configure({ mode: 'serial' });

async function waitReady(page) {
  await page.waitForFunction(() => window.__kucharzyna?.ready === true, { timeout: 30000 });
}

async function swVersion(page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error('Brak aktywnego service workera');
    return await new Promise((resolve) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 2000);
      ch.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data?.version || null);
      };
      reg.active.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
    });
  });
}

async function primeOffline(page) {
  await page.goto('/');
  await waitReady(page);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error('Service worker nie jest aktywny');
  });
}

test('Stage 44: manifest spełnia kontrakt instalowalnego PWA', async ({ page }) => {
  const html = await page.request.get('/');
  expect(html.ok()).toBeTruthy();

  await page.goto('/');
  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestLink).toBe('manifest.webmanifest');

  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();

  expect(manifest.name).toBe('Kucharek');
  expect(manifest.short_name).toBe('Kucharek');
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.display).toBe('standalone');
  expect(manifest.prefer_related_applications).toBe(false);

  const iconSet = new Set((manifest.icons || []).map((i) => i.sizes));
  expect(iconSet.has('192x192')).toBeTruthy();
  expect(iconSet.has('512x512')).toBeTruthy();

  for (const icon of manifest.icons.slice(0, 3)) {
    const r = await page.request.get('/' + icon.src.replace(/^\.\//, ''));
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-type'] || '').toContain('image/');
  }

  await page.goto('/');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test('Stage 44: service worker aktywuje się i trzyma kompletny app-shell w cache', async ({ page }) => {
  await primeOffline(page);

  const audit = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const active = reg.active;
    if (!active) throw new Error('Brak aktywnego service workera');

    const source = await (await fetch('sw.js', { cache: 'no-store' })).text();
    const match = source.match(/const CORE = \[(.*?)\];/s);
    if (!match) throw new Error('Nie znaleziono listy CORE w sw.js');
    const core = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]).filter(Boolean);

    const version = await new Promise((resolve) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 2000);
      ch.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data?.version || null);
      };
      active.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
    });
    if (!version) throw new Error('Service worker nie zwrócił wersji');

    const cache = await caches.open(version);
    const missing = [];
    for (const path of core) {
      const hit = await cache.match(new URL(path, location.href).href, { ignoreSearch: true });
      if (!hit) missing.push(path);
    }
    return {
      version,
      coreCount: core.length,
      missing,
      cacheNames: await caches.keys(),
    };
  });

  expect(audit.version).toMatch(/^kucharek-claude-1\.3\.71$/);
  expect(audit.coreCount).toBeGreaterThan(30);
  expect(audit.missing).toEqual([]);
  expect(audit.cacheNames.filter((x) => x.startsWith('kucharek-')).length).toBe(1);
});

test('Stage 44: cold-start offline otwiera Start i Receptury bez sieci', async ({ page, context }) => {
  await primeOffline(page);
  await expect(page.locator('.start-hero-card')).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await expect(page.locator('.start-hero-card')).toBeVisible();
  await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();
  await expect(page.locator('html.offline')).toHaveCount(1);

  await page.goto('/#/recipes', { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();

  const assets = await page.evaluate(async () => {
    const urls = ['styles.css?v=1.3.71', 'app.js?v=20261004-44A-1.3.71', 'manifest.webmanifest'];
    const results = [];
    for (const url of urls) {
      const res = await fetch(url, { cache: 'no-store' });
      results.push({ url, ok: res.ok, status: res.status });
    }
    return results;
  });
  expect(assets.every((x) => x.ok && x.status === 200)).toBeTruthy();

  await context.setOffline(false);
});

test('Stage 44: IndexedDB zachowuje dane robocze po przejściu offline i reloadzie', async ({ page, context }) => {
  await primeOffline(page);

  const key = 'stage44-offline-probe';
  await page.evaluate(async (key) => {
    const { db } = await import('/db.js');
    await db.put('settings', { key, value: { ok: true, stamp: 'offline' } });
  }, key);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);

  const value = await page.evaluate(async (key) => {
    const { db } = await import('/db.js');
    return await db.get('settings', key);
  }, key);
  expect(value?.value).toEqual({ ok: true, stamp: 'offline' });

  await page.evaluate(async (key) => {
    const { db } = await import('/db.js');
    await db.delete('settings', key);
  }, key);

  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBeTruthy();
});

test('Stage 44: powrót online usuwa stan offline, a wersja SW zgadza się z aplikacją', async ({ page, context }) => {
  await primeOffline(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await expect(page.locator('html.offline')).toHaveCount(1);

  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBeTruthy();
  await expect.poll(() => page.locator('html.offline').count()).toBe(0);

  const version = await swVersion(page);
  expect(version).toBe('kucharek-claude-1.3.71');
  const appVersion = await page.evaluate(async () => (await import('/util.js')).APP_VERSION);
  expect(appVersion).toBe('1.3.71');
});
