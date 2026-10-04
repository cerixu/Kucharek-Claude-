import { test, expect, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import gateway from '../ai-gateway/worker.js';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true, { timeout: 30000 });
}

test('Stage 45: CSP blokuje dynamiczny kod i trzyma zewnętrzne zasoby na smyczy', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/i)?.[1] || '';

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain('eval(');
  expect(csp).toContain('connect-src');
  expect(csp).toContain('https:');
  expect(csp).toContain("img-src 'self' data: blob:");
  expect(csp).not.toContain('http://');

  const scriptSrcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => e.getAttribute('src') || ''));
  expect(scriptSrcs.every((src) => src.startsWith('app.js') || src === 'theme-init.js')).toBeTruthy();
});

test('Stage 45: źródła aplikacji nie używają eval/new Function', async () => {
  const root = process.cwd();
  const banned = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'test-results' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith('.js') && !full.includes(path.sep + 'tests' + path.sep)) {
        const source = fs.readFileSync(full, 'utf8');
        if (/\beval\s*\(/.test(source) || /\bnew\s+Function\s*\(/.test(source)) banned.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  expect(banned).toEqual([]);
});

test('Stage 45: AI gateway URL nie przyjmuje HTTP, danych logowania ani prywatnych hostów', async ({ page }) => {
  await ready(page);
  const out = await page.evaluate(async () => {
    const ai = await import('/ai.js');
    const cases = [
      ['https://example.com/worker', 'https://example.com/worker'],
      ['https://example.com/worker///', 'https://example.com/worker'],
    ];
    const accepted = cases.map(([input, expected]) => ai.normalizeAIGatewayUrl(input) === expected);
    const rejected = [];
    for (const value of [
      'http://example.com/worker',
      'https://user:pass@example.com/worker',
      'https://example.com/worker?token=123',
      'https://localhost/worker',
      'https://127.0.0.1/worker',
      'https://192.168.1.5/worker',
    ]) {
      try { ai.normalizeAIGatewayUrl(value); rejected.push(false); }
      catch (_) { rejected.push(true); }
    }
    return { accepted, rejected };
  });

  expect(out.accepted).toEqual([true, true]);
  expect(out.rejected).toEqual([true, true, true, true, true, true]);
});

test('Stage 45: sesyjny token jest związany z gatewayem i nie przechodzi na zmianę adresu', async ({ page }) => {
  await ready(page);
  const out = await page.evaluate(async () => {
    const ai = await import('/ai.js');
    await ai.setAIGatewayUrl('https://gateway-one.example');
    ai.setAIGatewayToken('session-secret');
    const before = await ai.hasAIAccess();

    await ai.setAIGatewayUrl('https://gateway-two.example');
    let blocked = '';
    try { await ai.testAIGateway(); }
    catch (e) { blocked = String(e?.message || e); }

    ai.clearAIGatewayToken();
    return { before, blocked };
  });

  expect(out.before).toBeTruthy();
  expect(out.blocked).toContain('przypisany do innego gatewaya');
});

test('Stage 45: backup nie transportuje zaufania do AI Gateway', async ({ page }) => {
  await ready(page);
  const out = await page.evaluate(async () => {
    const { setSetting } = await import('/recipes.js');
    const { buildBackup } = await import('/backup.js');
    await setSetting('aiGatewayUrl', 'https://attacker.example/exfil');
    const backup = await buildBackup();
    const raw = JSON.stringify(backup);
    const hasSetting = backup.data.settings.some((x) => x.key === 'aiGatewayUrl');
    const leaksHost = raw.includes('attacker.example');
    return { hasSetting, leaksHost };
  });

  expect(out.hasSetting).toBeFalsy();
  expect(out.leaksHost).toBeFalsy();
});

test('Stage 45: Cloudflare gateway odrzuca nieautoryzowane żądania i SSRF do prywatnego hosta', async () => {
  const base = { ALLOWED_ORIGIN: 'https://cerixu.github.io', KUCHAREK_GATEWAY_TOKEN: 'secret' };

  const noAuth = await gateway.fetch(
    new Request('https://gateway.example/health', {
      headers: { Origin: base.ALLOWED_ORIGIN }
    }),
    base
  );
  expect(noAuth.status).toBe(401);

  const wrongOrigin = await gateway.fetch(
    new Request('https://gateway.example/health', {
      headers: { Origin: 'https://evil.example', Authorization: 'Bearer secret' }
    }),
    base
  );
  expect(wrongOrigin.status).toBe(403);

  const privateUrl = await gateway.fetch(
    new Request('https://gateway.example/v1/recipe-from-url', {
      method: 'POST',
      headers: {
        Origin: base.ALLOWED_ORIGIN,
        Authorization: 'Bearer secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://127.0.0.1/admin' })
    }),
    base
  );
  expect(privateUrl.status).toBe(502);
});
