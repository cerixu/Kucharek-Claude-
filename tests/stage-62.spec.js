import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });
test.setTimeout(90000);

async function ready(page) {
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  await page.waitForSelector('#tabbar .tab');
  await page.waitForFunction(() => window.__kucharek?.state?.recipes?.size >= 1700, null, { timeout: 60000 });
}

test('Stage 62 — nowy shell, dock i czystość receptur', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await ready(page);

  const version = await page.evaluate(async () => (await import('./util.js')).APP_VERSION);
  expect(version).toBe('1.6.0');

  await expect(page.locator('.start-menu')).toBeVisible();
  await expect(page.locator('.menu-grid')).toBeVisible();
  await expect(page.locator('.menu-hero')).toBeVisible();

  const nav = await page.locator('#tabbar .tab').evaluateAll(nodes =>
    nodes.map(n => n.querySelector('.tab-label')?.textContent?.trim())
  );
  expect(nav).toEqual(['Receptury', 'Magazyn', 'Dodaj', 'Kalkulatory', 'Więcej']);
  expect(nav).not.toContain('Zakupy');

  const shell = await page.evaluate(() => {
    const dock = document.querySelector('#tabbar');
    const plus = document.querySelector('.tab-add .tab-ico');
    const styles = [...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules].map(r => r.cssText); } catch (_) { return []; }
    }).join(' ');
    return {
      dockRadius: parseFloat(getComputedStyle(dock).borderTopLeftRadius),
      dockBlur: getComputedStyle(dock).backdropFilter || getComputedStyle(dock).webkitBackdropFilter,
      plusRadius: parseFloat(getComputedStyle(plus).borderTopLeftRadius),
      modeAttr: document.documentElement.getAttribute('data-mode'),
      orange: /#f5b400|#ffc21a|#ffb74d|#9a5b00/i.test(styles),
    };
  });
  expect(shell.dockRadius).toBeGreaterThanOrEqual(26);
  expect(shell.dockBlur).toContain('blur');
  expect(shell.plusRadius).toBeGreaterThanOrEqual(28);
  expect(shell.modeAttr).toBeNull();
  expect(shell.orange).toBeFalsy();

  const quality = await page.evaluate(() => {
    const recipes = [...window.__kucharek.state.recipes.values()].filter(r => String(r.id).startsWith('rcp_archive_'));
    const english = /\\b(?:almonds?|cups?|tablespoons?|teaspoons?|pounds?|ounces?|water|butter|flour|sugar|salt|pepper|chicken|beef|pork|cheese|bread|stock|sauce|dough|with|without|the|and)\\b/i;
    const broken = /^(?:jeden|jedna|jedno|dwa|dwie|one|two)\\s+(?:łyżka|lyzka|łyżeczka|lyzeczka|żółtko|zoltko|egg yolk|tablespoon|teaspoon)\\b/i;
    const ascii = /\\b(?:lyzka|lyzki|lyzeczka|lyzeczki|zoltko|zoltka|zoltk)\\b/i;
    const hits = [];
    for (const r of recipes) {
      if (english.test(r.name || '')) hits.push({type:'name', value:r.name});
      for (const s of r.sections || []) for (const i of s.ingredients || []) {
        if (!String(i.name || '').trim()) hits.push({type:'empty', recipe:r.name});
        else if (english.test(i.name)) hits.push({type:'english', recipe:r.name, value:i.name});
        if (broken.test(i.name)) hits.push({type:'quantity', recipe:r.name, value:i.name});
        if (ascii.test(i.name)) hits.push({type:'ascii', recipe:r.name, value:i.name});
      }
    }
    return {count: recipes.length, versions:[...new Set(recipes.map(r => r.translationVersion))], hits:hits.slice(0,40)};
  });
  expect(quality.count).toBe(1700);
  expect(quality.versions).toEqual([34]);
  expect(quality.hits).toEqual([]);

  await page.goto('/#/recipes');
  await page.waitForSelector('.rcard');
  await page.locator('.rcard').first().click();
  await expect(page.locator('.detail')).toBeVisible();
  await expect(page.locator('.detail .hero-photo')).toBeVisible();

  const detail = await page.evaluate(() => {
    const back = document.querySelector('.detail .topbar .iconbtn');
    const icons = [...document.querySelectorAll('.detail .ingredient-icon')];
    const names = [...document.querySelectorAll('.detail .ing-name')].map(e => e.textContent || '');
    return {
      backPosition: getComputedStyle(back).position,
      iconCount: icons.length,
      photoIconCount: icons.filter(i => i.classList.contains('ingredient-icon-photo')).length,
      broken: names.filter(n => /\b(?:jeden|jedna|jedno)\s+(?:łyżka|lyzka|żółtko|zoltko)\b/i.test(n)),
    };
  });
  expect(detail.backPosition).toBe('static');
  expect(detail.iconCount).toBeGreaterThan(0);
  expect(detail.photoIconCount).toBeGreaterThan(0);
  expect(detail.broken).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});
