import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'block' });

const BIGOS_ID = 'rcp_archive_aa342cc6ecae42afbac0';
const OBVIOUS_ENGLISH = [
  'almond','almonds','walnut','walnuts','shoulder','leg','larding','needle','using','strips','halfway','cooking',
  'spit','delicate','entirely','minced','smoked','scalding','pouring','ingredients','mixture','serving','tablespoonful',
  'teaspoonful','cupful','chives','knife','saucepan','ginger','herbs','truffles','casserole','recipe','jelly','coat',
  'moisten','seasoning','sides','brim','moderately','densely','sticking','browning','scrambled','pickled','cured'
];

test.setTimeout(60000);

test('Stage 54 — static Polish corpus gate', async ({ page }) => {
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

  await page.goto('/#/recipes');
  try {
    await page.waitForFunction(() => window.__kucharek?.ready === true, null, { timeout: 30000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      bootPresent: Boolean(document.querySelector('#boot')),
      bootText: document.querySelector('#boot')?.textContent || '',
      tabCount: document.querySelectorAll('#tabbar .tab').length,
      ready: window.__kucharek?.ready ?? null,
      bootPerf: window.__kucharekPerf || null,
    }));
    throw new Error([
      error.message,
      `diagnostic=${JSON.stringify(diagnostic)}`,
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `failedRequests=${JSON.stringify(failedRequests)}`,
    ].join('\\n'));
  }
  await page.waitForFunction(
    () => [...window.__kucharek.state.recipes.values()]
      .filter(r => String(r.id).startsWith('rcp_archive_')).length === 1700,
    null,
    { timeout: 90000 }
  );

  const info = await page.evaluate((words, bigosId) => {
    const rs = [...window.__kucharek.state.recipes.values()]
      .filter(r => String(r.id).startsWith('rcp_archive_'));

    const escapeRegex = value => value.replace(/[.*+?^$(){}|[\\]\\]/g, '\\$&');
    const re = new RegExp(
      '(?<!\\p{L})(?:' + words.map(escapeRegex).join('|') + ')(?!\\p{L})',
      'iu'
    );

    const dirtyNames = rs.filter(r => ['(', ')', '[', ']', '"'].some(mark => String(r.name).includes(mark))).length;
    const englishHits = [];

    for (const r of rs) {
      const fields = [
        r.name,
        ...(r.sections || []).flatMap(s => (s.ingredients || []).map(i => i.name)),
        ...(r.steps || []).map(s => s.text)
      ];
      for (const field of fields) {
        if (re.test(String(field))) {
          englishHits.push({ id: r.id, name: r.name, text: field });
          if (englishHits.length >= 40) break;
        }
      }
      if (englishHits.length >= 40) break;
    }

    const bigos = window.__kucharek.state.recipes.get(bigosId);

    return {
      count: rs.length,
      ids: new Set(rs.map(r => r.id)).size,
      pl: rs.filter(r => r.translationLanguage === 'pl' && Number(r.translationVersion) >= 21).length,
      dirtyNames,
      englishHits,
      bigos: {
        name: bigos?.name,
        originalName: bigos?.originalName,
        ingredient: bigos?.sections?.[0]?.ingredients?.[0]?.name,
        step: bigos?.steps?.[0]?.text
      }
    };
  }, OBVIOUS_ENGLISH, BIGOS_ID);

  expect(info.count).toBe(1700);
  expect(info.ids).toBe(1700);
  expect(info.pl).toBe(1700);
  expect(info.dirtyNames).toBe(0);
  expect(info.englishHits).toEqual([]);
  expect(info.bigos.name).toBe('Bigos');
  expect(['(', ')', '[', ']', '"'].some(mark => String(info.bigos.name).includes(mark))).toBe(false);
  expect(info.bigos.originalName).toContain('Polish Hunter');
  expect(info.bigos.ingredient).toContain('kapusta');
  expect(info.bigos.step).toContain('kapust');
});

// Stage 54 verification trigger: run this corpus gate explicitly.
