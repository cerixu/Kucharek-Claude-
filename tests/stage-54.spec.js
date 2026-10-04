import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

const OBVIOUS_ENGLISH = [
  'almond','almonds','walnut','walnuts','shoulder','leg','larding','needle','using','strips','halfway','cooking',
  'spit','delicate','entirely','minced','smoked','scalding','pouring','ingredients','mixture','serving','tablespoonful',
  'teaspoonful','cupful','chives','knife','saucepan','ginger','herbs','truffles','casserole','recipe','jelly','coat',
  'moisten','seasoning','sides','brim','moderately','densely','sticking','browning','scrambled','pickled','cured'
];

test.describe('Stage 54 — static Polish corpus gate', () => {
  test('all 1700 archive records are version 10 Polish translations with clean names', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const info = await page.evaluate(() => {
      const rs = [...window.__kucharzyna.state.recipes.values()].filter(r => String(r.id).startsWith('rcp_archive_'));
      return {
        count: rs.length,
        ids: new Set(rs.map(r => r.id)).size,
        pl: rs.filter(r => r.translationLanguage === 'pl' && Number(r.translationVersion) >= 10).length,
        dirtyNames: rs.filter(r => /[():\[\]"]/u.test(r.name)).length,
      };
    });
    expect(info.count).toBe(1700);
    expect(info.ids).toBe(1700);
    expect(info.pl).toBe(1700);
    expect(info.dirtyNames).toBe(0);
  });

  test('no obvious untranslated English remains in visible recipe text', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate((words) => {
      const re = new RegExp('(?<!\\p{L})(?:' + words.map(w => w.replace(/[.*+?^$(){}|[\\]\\]/g, '\\$&')).join('|') + ')(?!\\p{L})', 'iu');
      const rs = [...window.__kucharzyna.state.recipes.values()].filter(r => String(r.id).startsWith('rcp_archive_'));
      const hits = [];
      for (const r of rs) {
        const fields = [r.name, ...(r.sections || []).flatMap(s => (s.ingredients || []).map(i => i.name)), ...(r.steps || []).map(s => s.text)];
        for (const f of fields) if (re.test(String(f))) hits.push({ id: r.id, name: r.name, text: f });
      }
      return hits.slice(0, 40);
    }, words => words);
    expect(result).toEqual([]);
  });

  test('Bigos and detail view are Polish and source original is preserved', async ({ page }) => {
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const data = await page.evaluate((id) => {
      const r = window.__kucharzyna.state.recipes.get(id);
      return {
        name: r?.name, originalName: r?.originalName,
        ingredient: r?.sections?.[0]?.ingredients?.[0]?.name, step: r?.steps?.[0]?.text
      };
    }, BIGOS_ID);
    expect(data.name).toBe('Bigos');
    expect(data.name).not.toMatch(/[():\[\]"]/u);
    expect(data.originalName).toContain('Polish Hunter');
    expect(data.ingredient).toContain('kapusta');
    expect(data.step).toContain('kapust');
  });
});
