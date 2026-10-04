import { test, expect } from '@playwright/test';

const DB = 'kucharzyna-claude-db';

async function reset(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  await page.evaluate(async () => {
    const { db, STORES } = await import('/db.js');
    for (const store of Object.keys(STORES)) await db.clear(store);
  });
  await page.reload();
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
}

test.describe('Security & privacy', () => {
  test('CSP i polityka referrera są obecne, a skrypty są wyłącznie lokalne', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");

    expect(await page.locator('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
    expect(await page.locator('script:not([src])').count()).toBe(0);
    expect(await page.locator('script[src^="http://"], script[src^="https://"]').count()).toBe(0);

    await page.evaluate(() => {
      const s = document.createElement('script');
      s.textContent = 'window.__csp_inline_executed = true';
      document.head.appendChild(s);
    });
    expect(await page.evaluate(() => window.__csp_inline_executed === true)).toBe(false);
  });

  test('niebezpieczny URL źródła nie staje się linkiem javascript', async ({ page }) => {
    await reset(page);
    const id = await page.evaluate(async () => {
      const { saveRecipe, blankRecipe } = await import('/recipes.js');
      const r = blankRecipe({
        name: 'Security URL test',
        category: 'cat-pizza',
        servings: 1,
        source: 'Niebezpieczne źródło',
        sourceUrl: 'javascript:window.__security_xss = true',
      });
      const saved = await saveRecipe(r);
      return saved.id;
    });

    await page.goto('/#/recipe/' + id);
    await expect(page.getByRole('heading', { name: 'Security URL test', exact: true })).toBeVisible();
    expect(await page.locator('a.ext').count()).toBe(0);
    expect(await page.evaluate(() => window.__security_xss === true)).toBe(false);

    await page.evaluate(async (recipeId) => {
      const { patchRecipe } = await import('/recipes.js');
      await patchRecipe(recipeId, { sourceUrl: 'https://example.com/source' }, { touch: false });
    }, id);
    await page.reload();
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const link = page.locator('a.ext');
    await expect(link).toHaveAttribute('href', 'https://example.com/source');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('zdjęcie receptury nie wysyła referrera strony', async ({ page }) => {
    await reset(page);
    const result = await page.evaluate(async () => {
      const { recipeVisual } = await import('/components.js');
      const el = recipeVisual({
        name: 'External image',
        category: 'cat-pizza',
        photo: 'https://images.unsplash.com/photo-test',
      });
      return {
        referrerPolicy: el.referrerPolicy,
        src: el.getAttribute('src'),
      };
    });
    expect(result.referrerPolicy).toBe('no-referrer');
    expect(result.src).toContain('images.unsplash.com');
  });

  test('service worker cache zawiera lokalny initializer CSP', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const sw = await (await page.request.get('/sw.js')).text();
    expect(sw).toContain("kucharek-claude-1.3.44");
    expect(sw).toContain("'theme-init.js'");
  });
});
