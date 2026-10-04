import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';

const FOREIGN = [
  /\bthe\b/i, /\band\b/i, /\bwith\b/i, /\badd\b/i, /\bcook\b/i, /\bbake\b/i,
  /\bfry\b/i, /\bflour\b/i, /\bbutter\b/i, /\bsalt\b/i, /\bpepper\b/i,
  /\bwater\b/i, /\bonion\b/i, /\bgarlic\b/i, /\bchicken\b/i, /\bbeef\b/i,
  /\btablespoons?\b/i, /\bteaspoons?\b/i, /\bcups?\b/i,
  /\bcebolla\b/i, /\boignon\b/i, /\bzwiebel\b/i, /\bcibule\b/i, /\bčesnek\b/i,
];

test.describe('Stage 53 — Polish recipe translation gate', () => {
  test('keeps exactly 1700 stable recipe records and translates every record', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const info = await page.evaluate(() => {
      const values = [...window.__kucharzyna.state.recipes.values()];
      return {
        count: values.length,
        ids: new Set(values.map((r) => r.id)).size,
        translations: values.filter((r) => r.translationLanguage === 'pl').length,
        originals: values.filter((r) => r.originalName).length,
      };
    });
    expect(info.count).toBe(1700);
    expect(info.ids).toBe(1700);
    expect(info.translations).toBe(1700);
    expect(info.originals).toBe(1700);
  });

  test('translates Bigos visibly and preserves source-language originalName', async ({ page }) => {
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const data = await page.evaluate((id) => {
      const r = window.__kucharzyna.state.recipes.get(id);
      return {
        name: r?.name,
        originalName: r?.originalName,
        ingredient: r?.sections?.[0]?.ingredients?.[0]?.name,
        step: r?.steps?.[0]?.text,
      };
    }, BIGOS_ID);
    expect(data.name).toContain('Bigos');
    expect(data.name).not.toContain('Polish Hunter');
    expect(data.ingredient).toContain('kapusta');
    expect(data.step).toContain('kapust');
    expect(data.originalName).toContain('Polish Hunter');
  });

  test('keeps foreign-language residue low across all visible recipe text', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const result = await page.evaluate((markers) => {
      const recipes = [...window.__kucharzyna.state.recipes.values()];
      let hits = 0;
      let fields = 0;
      for (const r of recipes) {
        const texts = [
          r.name, r.description,
          ...(r.sections || []).flatMap((s) => (s.ingredients || []).map((i) => i.name)),
          ...(r.steps || []).map((s) => s.text),
        ].filter(Boolean);
        for (const t of texts) {
          fields++;
          if (markers.some((m) => new RegExp(m.source, m.flags).test(t))) hits++;
        }
      }
      return { hits, fields };
    }, markers);
    expect(result.fields).toBeGreaterThan(5000);
    expect(result.hits).toBeLessThan(30);
  });

  test('detail view renders translated ingredients and preparation', async ({ page }) => {
    await page.goto('/#/recipe/' + BIGOS_ID);
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.locator('.screen.detail')).toBeVisible();
    await expect(page.locator('.ingredients .ing').first()).toContainText('kapusta');
    await expect(page.getByRole('heading', { name: 'Przygotowanie' })).toBeVisible();
    await expect(page.locator('ol.steps > li').first()).toContainText('kapust');
  });
});
