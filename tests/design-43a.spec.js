import { test, expect } from '@playwright/test';

test.describe('Stage 43A · Visual QA / iPhone glass', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true, { timeout: 30000 });
    await expect(page.locator('.screen')).toBeVisible();
    expect(errors).toEqual([]);
  });

  async function auditShell(page) {
    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const viewport = { w: root.clientWidth, h: root.clientHeight };
      const overflow = {
        html: root.scrollWidth - root.clientWidth,
        body: body.scrollWidth - body.clientWidth,
      };
      const q = (s) => document.querySelector(s);
      const cs = (s) => {
        const el = q(s);
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          exists: true,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          background: style.backgroundColor,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
          borderTopLeftRadius: style.borderTopLeftRadius,
          borderRadius: style.borderRadius,
        };
      };
      const tapTargets = [...document.querySelectorAll('button, a')].slice(0, 120).map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || '' };
      });
      return {
        viewport,
        overflow,
        topbar: cs('.topbar'),
        tabbar: cs('#tabbar'),
        surface: cs('.card, .start-action, .start-recent-card, .recipe-card'),
        input: cs('.input'),
        tapTargets,
      };
    });

    expect(result.overflow.html).toBeLessThanOrEqual(1);
    expect(result.overflow.body).toBeLessThanOrEqual(1);
    expect(result.topbar?.backdropFilter).toContain('blur');
    expect(result.tabbar?.backdropFilter).toContain('blur');

    const importantTargets = result.tapTargets.filter((x) => /Start|Receptury|Gotuję|Magazyn|Więcej|Szukaj|Dodaj|Skanuj|Kalkulatory|Ustawienia/.test(x.label));
    for (const target of importantTargets) {
      expect(target.w).toBeGreaterThanOrEqual(44);
      expect(target.h).toBeGreaterThanOrEqual(44);
    }

    return result;
  }

  test('shell is glassy, bounded and touch-safe', async ({ page }, testInfo) => {
    const audit = await auditShell(page);
    await page.screenshot({ path: testInfo.outputPath('43a-start.png'), fullPage: false });
    expect(audit.surface?.backdropFilter || '').toContain('blur');
  });

  test('key iPhone screens stay inside the viewport', async ({ page }, testInfo) => {
    for (const route of ['/recipes', '/cook', '/inventory', '/shopping', '/calc', '/settings']) {
      await page.goto('/#' + route);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      const audit = await auditShell(page);
      expect(audit.topbar?.rect.width || 0).toBeLessThanOrEqual(audit.viewport.w + 1);
      expect(audit.tabbar?.rect.width || 0).toBeLessThanOrEqual(audit.viewport.w + 1);
      const safeRoute = route.slice(1).replace(/[^a-z]/gi, '-') || 'root';
      await page.screenshot({ path: testInfo.outputPath(`43a-${safeRoute}.png`), fullPage: false });
    }
  });

  test('sheet keeps the iOS glass material and does not escape screen bounds', async ({ page }) => {
    await page.getByRole('button', { name: 'Więcej' }).click();
    const panel = page.getByRole('dialog', { name: 'Więcej' });
    await expect(panel).toBeVisible();

    const audit = await panel.evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        blur: s.backdropFilter || s.webkitBackdropFilter || '',
        radius: s.borderRadius,
        width: r.width,
        right: r.right,
      };
    });

    expect(audit.blur).toContain('blur');
    expect(audit.radius).not.toBe('0px');
    expect(audit.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(audit.right).toBeLessThanOrEqual(page.viewportSize().width + 1);
  });

  test('auto theme keeps the same material in light and dark', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('k:theme', 'auto');
      localStorage.setItem('k:mode', 'pro');
    });

    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.reload();
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      const values = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const top = getComputedStyle(document.querySelector('.topbar'));
        const tab = getComputedStyle(document.querySelector('#tabbar'));
        return {
          bg: root.getPropertyValue('--34e-bg').trim(),
          topBlur: top.backdropFilter || top.webkitBackdropFilter || '',
          tabBlur: tab.backdropFilter || tab.webkitBackdropFilter || '',
        };
      });
      expect(values.bg).not.toBe('');
      expect(values.topBlur).toContain('blur');
      expect(values.tabBlur).toContain('blur');
    }
  });
});
