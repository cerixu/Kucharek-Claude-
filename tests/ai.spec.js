import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__kucharek?.ready === true);
}

async function configureMockGateway(page) {
  await page.evaluate(async () => {
    const { setAIGatewayUrl, setAIGatewayToken } = await import('/ai.js');
    await setAIGatewayUrl('https://test-gateway.invalid/__ai');
    setAIGatewayToken('test-gateway-token');
  });
}

test.describe('Kucharek AI', () => {
  test('ustawienia mają gateway, ale nie mają pola na klucz OpenAI', async ({ page }) => {
    await ready(page);
    await page.goto('/#/settings');
    await page.waitForFunction(() => window.__kucharek?.ready === true);

    await expect(page.getByLabel('Adres AI Gateway', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Token gatewaya (tylko ta sesja)', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sprawdź połączenie', exact: true })).toBeVisible();

    expect(await page.getByLabel(/OpenAI API key|Klucz OpenAI/i).count()).toBe(0);
  });

  test('token gatewaya nie jest zapisywany w IndexedDB ani localStorage', async ({ page }) => {
    await ready(page);
    await configureMockGateway(page);

    const result = await page.evaluate(async () => {
      const { db } = await import('/db.js');
      const settings = await db.getAll('settings');
      return {
        local: Object.keys(localStorage).filter((k) => /openai|api.?key|gateway.?token/i.test(k)),
        settings: settings.filter((x) => /openai|api.?key|gateway.?token/i.test(String(x.key)))
      };
    });

    expect(result.local).toEqual([]);
    expect(result.settings).toEqual([]);
  });

  test('import z URL przechodzi przez gateway i pokazuje podgląd receptury', async ({ page }) => {
    await ready(page);
    await page.goto('/#/import');
    await configureMockGateway(page);

    let receivedUrl = '';
    await page.route('**/__ai/v1/recipe-from-url', async (route) => {
      const body = route.request().postDataJSON();
      receivedUrl = body?.url || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          recipe: {
            name: 'Carbonara testowa',
            description: 'Test importu AI',
            servings: 2,
            prepTime: 10,
            cookTime: 8,
            fermentTime: 0,
            temperature: '',
            category: 'cat-pasta',
            traditional: true,
            origin: 'IT',
            tags: ['Tradycyjne'],
            sections: [{ name: '', ingredients: [
              { name: 'guanciale', amount: 120, unit: 'g' },
              { name: 'jajka', amount: 2, unit: 'szt.' },
              { name: 'pecorino romano', amount: 80, unit: 'g' }
            ]}],
            steps: [{ text: 'Usmaż guanciale.' }, { text: 'Wymieszaj jajka z serem.' }, { text: 'Połącz z makaronem.' }],
            source: 'example.com',
            sourceUrl: 'https://example.com/carbonara'
          }
        })
      });
    });

    await page.getByLabel('Adres strony z przepisem', { exact: true }).fill('https://example.com/carbonara');
    await page.getByRole('button', { name: 'Importuj adres strony z AI', exact: true }).click();

    await expect(page.getByText('Gotowe. Sprawdź podgląd przed zapisaniem.')).toBeVisible();
    await expect(page.getByText('Carbonara testowa', { exact: true })).toBeVisible();
    expect(receivedUrl).toBe('https://example.com/carbonara');
  });

  test('AI w Gotuję dostaje recepturę i aktualny krok', async ({ page }) => {
    await ready(page);
    const id = await page.evaluate(async () => {
      const { listRecipes } = await import('/recipes.js');
      return listRecipes()[0]?.id;
    });
    expect(id).toBeTruthy();
    await page.goto('/#/cook/' + id);
    await configureMockGateway(page);

    let received = null;
    await page.route('**/__ai/v1/ask-recipe', async (route) => {
      received = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, answer: 'Tak. Boczek może zastąpić guanciale, ale będzie trochę mniej intensywny.' })
      });
    });

    await expect(page.getByRole('button', { name: 'AI', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'AI', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Zapytaj AI' })).toBeVisible();

    await page.getByLabel('Pytanie do Kucharek AI', { exact: true }).fill('Mam boczek zamiast guanciale. Mogę?');
    await page.getByRole('button', { name: 'Zapytaj', exact: true }).click();

    await expect(page.locator('.ai-answer .ai-live')).toContainText('Tak. Boczek może zastąpić guanciale');
    expect(received?.question).toContain('boczek');
    expect(received?.recipe?.name).toBeTruthy();
    expect(typeof received?.currentStep).toBe('string');
  });
  test('gateway AI odrzuca niezabezpieczony adres HTTP', async ({ page }) => {
    await ready(page);
    const message = await page.evaluate(async () => {
      const { setAIGatewayUrl, setAIGatewayToken, testAIGateway } = await import('/ai.js');
      try {
        await setAIGatewayUrl('http://example.com/ai');
        setAIGatewayToken('test-gateway-token');
        await testAIGateway();
        return 'NO_ERROR';
      } catch (e) {
        return String(e?.message || e);
      }
    });
    expect(message).toContain('HTTPS');
  });
});
