import { test, expect } from '@playwright/test';

test.describe('Stage 48 · final iPhone dock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharek?.ready === true, { timeout: 30000 });
    await expect(page.locator('#tabbar')).toBeVisible();
  });

  test('active tab uses one material and keeps icon + label on one axis', async ({ page }) => {
    const audit = await page.locator('#tabbar .tab.on').evaluate((tab) => {
      const iconWrap = tab.querySelector('.tab-ico');
      const iconSvg = tab.querySelector('.tab-ico .ico');
      const label = tab.querySelector('.tab-label');
      const ts = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          background: s.backgroundColor,
          radius: s.borderRadius,
          display: s.display,
        };
      };
      const tabRect = tab.getBoundingClientRect();
      const iconRect = iconWrap.getBoundingClientRect();
      const svgRect = iconSvg.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      return {
        tab: ts(tab),
        icon: ts(iconWrap),
        svg: { x: svgRect.x, y: svgRect.y, width: svgRect.width, height: svgRect.height },
        label: ts(label),
        centerDelta: Math.abs(
          (iconRect.x + iconRect.width / 2) - (labelRect.x + labelRect.width / 2)
        ),
        verticalGap: labelRect.y - (iconRect.y + iconRect.height),
        tabHeight: tabRect.height,
      };
    });

    expect(audit.tabHeight).toBeGreaterThanOrEqual(54);
    expect(audit.icon.background).toBe('rgba(0, 0, 0, 0)');
    expect(audit.centerDelta).toBeLessThanOrEqual(2);
    expect(audit.verticalGap).toBeGreaterThanOrEqual(1);
    expect(audit.verticalGap).toBeLessThanOrEqual(8);
    expect(audit.svg.width).toBeGreaterThanOrEqual(20);
    expect(audit.svg.height).toBeGreaterThanOrEqual(20);
  });

  test('dock remains bounded on the key mobile routes', async ({ page }) => {
    for (const route of ['/', '/recipes', '/cook', '/inventory', '/shopping', '/calc', '/settings']) {
      await page.goto('/#' + (route === '/' ? '' : route));
      await page.waitForFunction(() => window.__kucharek?.ready === true);
      const result = await page.evaluate(() => {
        const root = document.documentElement;
        const bar = document.querySelector('#tabbar');
        const r = bar?.getBoundingClientRect();
        return {
          viewportWidth: root.clientWidth,
          overflow: root.scrollWidth - root.clientWidth,
          right: r?.right ?? 0,
          width: r?.width ?? 0,
        };
      });
      expect(result.overflow).toBeLessThanOrEqual(1);
      expect(result.width).toBeGreaterThanOrEqual(300);
      expect(result.right).toBeLessThanOrEqual(result.viewportWidth + 1);
    }
  });
});
