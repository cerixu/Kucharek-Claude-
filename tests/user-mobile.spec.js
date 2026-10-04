import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Test użytkownika: iPhone', () => {

  test('start → receptury → historia → powrót działa jak użytkownik', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await expect(page.getByText('Kucharek', { exact: true }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Receptury', exact: true }).click();
    await expect(page).toHaveURL(/#\/recipes$/);
    await expect(page.getByRole('heading', { name: 'Receptury' })).toBeVisible();

    await page.getByRole('button', { name: 'Historia gotowania' }).click();
    await expect(page).toHaveURL(/#\/history$/);
    await expect(page.getByRole('heading', { name: 'Historia gotowania' })).toBeVisible();

    await page.getByRole('link', { name: 'Receptury' }).click();
    await expect(page).toHaveURL(/#\/recipes$/);
  });

  test('dolna nawigacja nie znika na ekranie mobilnym', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const tabs = page.locator('#tabbar');
    await expect(tabs).toBeVisible();

    const box = await tabs.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 2);
  });

  test('wyszukiwarka zachowuje fokus podczas pisania', async ({ page }) => {
    await page.goto('/#/recipes');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const input = page.locator('input.search-input');
    await input.fill('pizza');
    await expect(input).toHaveValue('pizza');
    await expect(input).toBeFocused();
  });
});


test.describe('Stage 34A: nowy UX iPhone', () => {
  test('Start ma nową hierarchię i główne akcje', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await expect(page.locator('.start-hero-card')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zacznij gotować' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Przepisy' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Magazyn/ }).first()).toBeVisible();
    await expect(page.locator('.tiles')).toHaveCount(0);
  });

  test('dolny dock ma pięć głównych miejsc i Więcej', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    const labels = await page.locator('#tabbar .tab-label').allTextContents();
    expect(labels).toEqual(['Start', 'Receptury', 'Gotuję', 'Magazyn', 'Więcej']);

    await page.getByRole('button', { name: 'Więcej' }).click();
    await expect(page.getByRole('heading', { name: 'Więcej' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zakupy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kalkulatory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ustawienia' })).toBeVisible();
  });

  test('zakładka Gotuję prowadzi do prostego wyboru receptury', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await page.getByRole('link', { name: 'Gotuję' }).click();
    await expect(page).toHaveURL(/#\/cook$/);
    await expect(page.getByRole('heading', { name: 'Gotuję' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wybierz recepturę' })).toBeVisible();
  });

  test('główne widoki nie powodują poziomego overflow', async ({ page }) => {
    for (const path of ['/', '/recipes', '/cook', '/inventory']) {
      await page.goto('/#' + path);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});

  
test('Stage 34B: Start ma docelowy hero, wyszukiwanie i spójną warstwę wizualną', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);

  await expect(page.locator('.start-hero-backdrop')).toBeVisible();
  await expect(page.locator('.start-hero-image')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zacznij gotować' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Szukaj receptury/ })).toBeVisible();
  await expect(page.locator('.start-actions-grid .start-action')).toHaveCount(4);
  await expect(page.locator('.start-status-strip > div')).toHaveCount(3);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('Stage 34B: numer wersji jest widoczny w Ustawieniach', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForFunction(() => window.__kucharzyna?.ready === true);
  await expect(page.getByText('Wersja aplikacji', { exact: true })).toBeVisible();
  await expect(page.getByText('1.3.39', { exact: true })).toBeVisible();
});


test.describe('Stage 34C: wspólny system wizualny', () => {

  test('auto-theme ma kontrast zgodny z motywem urządzenia', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const lightGlass = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim());
    expect(lightGlass).toContain('255');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const darkGlass = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim());
    expect(darkGlass).toContain('28');
  });

  test('główne ekrany używają wspólnej geometrii i iPhone tap targets', async ({ page }) => {
    for (const path of ['/', '/recipes', '/inventory', '/settings']) {
      await page.goto('/#' + path);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);

      await expect(page.locator('.screen .topbar')).toBeVisible();

      const metrics = await page.evaluate(() => {
        const button = document.querySelector('.btn');
        const input = document.querySelector('input');
        const surface = document.querySelector('.card, .rcard, .stock-row, .history-card, .bigcard, .start-hero-card, .cook-hub-intro');
        const style = surface ? getComputedStyle(surface) : null;
        const btnStyle = button ? getComputedStyle(button) : null;
        const inputStyle = input ? getComputedStyle(input) : null;
        return {
          surfaceRadius: style ? parseFloat(style.borderTopLeftRadius) : 0,
          buttonHeight: button ? button.getBoundingClientRect().height : 0,
          inputFontSize: inputStyle ? parseFloat(inputStyle.fontSize) : 0,
          buttonRadius: btnStyle ? parseFloat(btnStyle.borderTopLeftRadius) : 0,
        };
      });

      expect(metrics.surfaceRadius).toBeGreaterThanOrEqual(14);
      if (metrics.buttonHeight) expect(metrics.buttonHeight).toBeGreaterThanOrEqual(44);
      if (metrics.inputFontSize) expect(metrics.inputFontSize).toBeGreaterThanOrEqual(16);
      if (metrics.buttonRadius) expect(metrics.buttonRadius).toBeGreaterThanOrEqual(12);
    }
  });

  test('główne widoki mają zerowy poziomy overflow po finalnym stylowaniu', async ({ page }) => {
    for (const path of ['/', '/recipes', '/cook', '/inventory', '/settings']) {
      await page.goto('/#' + path);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      expect(metrics.viewportWidth).toBeGreaterThan(0);
    }
  });

  test('ustawienia pokazują aktualną wersję 34C', async ({ page }) => {
    await page.goto('/#/settings');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await expect(page.getByText('Wersja aplikacji', { exact: true })).toBeVisible();
    await expect(page.getByText('1.3.39', { exact: true })).toBeVisible();
  });

  test('zrzuty kontrolne głównych ekranów powstają w QA', async ({ page }, testInfo) => {
    for (const [name, path] of [['start','/'], ['recipes','/recipes'], ['inventory','/inventory'], ['settings','/settings']]) {
      await page.goto('/#' + path);
      await page.waitForFunction(() => window.__kucharzyna?.ready === true);
      await page.screenshot({ path: testInfo.outputPath('visual-' + name + '-34C.png'), fullPage: false });
    }
  });
});

  
test.describe('Stage 34D: Magazyn UX', () => {
  test('Magazyn pokazuje stan, filtry, listę produktów i automatykę', async ({ page }) => {
    await page.goto('/#/inventory');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await page.evaluate(async () => {
      const { seedTestInventory } = await import('/inventory.js');
      await seedTestInventory();
    });
    await page.reload();
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await expect(page.getByRole('heading', { name: 'Magazyn' })).toBeVisible();
    await expect(page.locator('.inventory-summary-v2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtr: Brak' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtr: Mało' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Automatyka/ })).toBeVisible();
    await expect(page.locator('.inventory-product')).toHaveCount(8);
  });

  test('filtr Niskie i wejście w produkt działają jednym tapnięciem', async ({ page }) => {
    await page.goto('/#/inventory');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await page.evaluate(async () => {
      const { seedTestInventory } = await import('/inventory.js');
      await seedTestInventory();
    });
    await page.reload();
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);

    await page.getByRole('button', { name: 'Niskie', exact: true }).click();
    await expect(page.locator('.inventory-product.low, .inventory-product.empty')).not.toHaveCount(0);
    await expect(page.locator('.inventory-product.ok')).toHaveCount(0);

    const first = page.locator('.inventory-product').first();
    const label = await first.locator('.inventory-product-main').getAttribute('aria-label');
    expect(label).toMatch(/MAŁO|BRAK/);

    await first.locator('.inventory-product-main').click();
    await expect(page.getByRole('heading', { name: label?.split(' — ')[0] || '' })).toBeVisible();
    await expect(page.getByText('Aktualny stan', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edytuj dane' })).toBeVisible();
  });

  test('Automatyka jest schowana pod jednym wejściem i pokazuje oba przełączniki', async ({ page }) => {
    await page.goto('/#/inventory');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    await page.getByRole('button', { name: /Automatyka/ }).click();
    await expect(page.getByRole('heading', { name: 'Automatyzacja magazynu' })).toBeVisible();
    await expect(page.getByText('Zużycie przy gotowaniu', { exact: true })).toBeVisible();
    await expect(page.getByText('Sugestie zakupów', { exact: true })).toBeVisible();
  });

  test('Magazyn zachowuje iPhone tap targets oraz brak poziomego overflow', async ({ page }) => {
    await page.goto('/#/inventory');
    await page.waitForFunction(() => window.__kucharzyna?.ready === true);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      action: document.querySelector('.inventory-product-actions .iconbtn')?.getBoundingClientRect().width || 0,
      mainAction: document.querySelector('.inventory-product-main')?.getBoundingClientRect().height || 0,
    }));
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    if (metrics.action) expect(metrics.action).toBeGreaterThanOrEqual(40);
    if (metrics.mainAction) expect(metrics.mainAction).toBeGreaterThanOrEqual(44);
  });
});
