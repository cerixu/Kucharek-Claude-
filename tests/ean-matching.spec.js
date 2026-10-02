import { test, expect } from '@playwright/test';

const DB_NAME = 'kucharzyna-claude-db';

async function reset(page) {
  await page.goto('/');
  await page.waitForFunction(()=>window.__kucharzyna?.ready===true);
  await page.evaluate(async()=>{
    const {db,STORES}=await import('/db.js');
    for(const store of Object.keys(STORES)) await db.clear(store);
  });
  await page.reload();
  await page.waitForFunction(()=>window.__kucharzyna?.ready===true);
}

test('EAN: normalizacja i dopasowanie wskazuje istniejący produkt', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async (name) => {
    const { saveInventoryItem, findInventoryByEAN, normalizeEAN, validEAN } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Mozzarella EAN', quantity:2, unit:'kg', ean:'5901234123457' });
    return {
      id: item.id,
      normalized: normalizeEAN('590 123 412 3457'),
      valid: validEAN('5901234123457'),
      found: findInventoryByEAN('590-123-412-3457')?.id,
    };
  }, DB_NAME);
  expect(result.normalized).toBe('5901234123457');
  expect(result.valid).toBe(true);
  expect(result.found).toBe(result.id);
});

test('EAN: niepoprawny kod nie zostaje zaakceptowany przez formularz Magazynu', async ({ page }) => {
  await reset(page);
  await page.goto('/#/inventory');
  await page.getByRole('button', { name:'Dodaj produkt' }).first().click();
  await page.getByLabel('Nazwa produktu').fill('EAN invalid E2E');
  await page.getByLabel('Kod EAN').fill('1234567890123');
  await page.getByRole('button', { name:'Zapisz' }).click();
  await expect(page.getByText('Nieprawidłowy kod EAN.')).toBeVisible();
});

test('Aliasy: receptura dopasowuje produkt magazynowy po nazwie alternatywnej', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, findInventoryMatch } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Mozzarella Fior di Latte', aliases:['mozzarella','fior di latte'], quantity:1500, unit:'g', purchasePrice:24, priceUnit:'kg' });
    const match = findInventoryMatch({ name:'Mozzarella' });
    return { id:item.id, found:match?.item.id, source:match?.source };
  });
  expect(result.found).toBe(result.id);
  expect(result.source).toBe('name');
});

test('EAN ma pierwszeństwo przed nazwą przy dopasowaniu Food Cost', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, findInventoryMatch } = await import('/inventory.js');
    const byName = await saveInventoryItem({ name:'Mąka premium', quantity:10, unit:'kg', purchasePrice:10, priceUnit:'kg' });
    const byEAN = await saveInventoryItem({ name:'Mąka 00', quantity:10, unit:'kg', ean:'5901234123457', purchasePrice:14, priceUnit:'kg' });
    const match = findInventoryMatch({ name:'Mąka premium', ean:'5901234123457' });
    return { byName:byName.id, byEAN:byEAN.id, found:match.item.id, source:match.source };
  });
  expect(result.found).toBe(result.byEAN);
  expect(result.source).toBe('ean');
});

test('Zużycie receptury korzysta z aliasu produktu w Magazynie', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { saveInventoryItem, consumeRecipeIngredients, findInventoryByName } = await import('/inventory.js');
    const item = await saveInventoryItem({ name:'Pomodoro Pelati', aliases:['pomidory san marzano'], quantity:1000, unit:'g' });
    const recipe = { id:'ean-alias-recipe', name:'Sos', sections:[{ ingredients:[{ name:'Pomidory San Marzano', amount:300, unit:'g' }] }] };
    const out = await consumeRecipeIngredients(recipe);
    return { id:item.id, quantity:findInventoryByName('Pomodoro Pelati').quantity, changes:out.changes.length, shortages:out.shortages.length };
  });
  expect(result.changes).toBe(1);
  expect(result.quantity).toBe(700);
  expect(result.shortages).toBe(0);
});


test('Skaner EAN: otwiera kamerę i aktywną linię skanującą', async ({ page }) => {
  let requested = false;
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = async function(){ return; };
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    navigator.mediaDevices.getUserMedia = async () => {
      window.__getUserMediaRequested = true;
      const track = {
        kind:'video',
        stop(){ window.__torchStopped = true; },
        getCapabilities(){ return { torch:true }; },
        async applyConstraints(constraints){
          window.__torchState = constraints?.advanced?.[0]?.torch === true;
        }
      };
      return {
        getVideoTracks(){ return [track]; },
        getTracks(){ return [track]; }
      };
    };
  });
  await page.goto('/');
  await page.waitForFunction(()=>window.__kucharzyna?.ready===true);
  await page.goto('/#/inventory');
  await page.getByRole('button', { name:'Skanuj kod kreskowy' }).click();
  await expect(page.getByRole('heading', { name:'Skanuj kod kreskowy' })).toBeVisible();
  await expect(page.locator('.barcode-scan-line')).toBeVisible();
  await expect(page.getByText('Skieruj aparat na kod kreskowy')).toBeVisible();
  requested = await page.evaluate(() => !!window.__getUserMediaRequested);
  expect(requested).toBe(true);
  const flash = page.getByRole('button', { name:'Włącz latarkę' });
  await expect(flash).toBeEnabled();
  await flash.click();
  await expect(page.getByRole('button', { name:'Wyłącz latarkę' })).toBeVisible();
  expect(await page.evaluate(() => window.__torchState)).toBe(true);
});


test('Recipe UX: domyślnie pokazuje jedną porcję', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await expect(page.getByText('1 porcja', { exact: true })).toBeVisible();
});


test('Recipe UX: lista otwiera szczegóły', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipes');
  await page.getByRole('link', { name: 'Pizza Napoletana' }).click();
  await expect(page.getByRole('heading', { name: 'Pizza Napoletana' })).toBeVisible();
});


test('Recipe UX: skalowanie receptury na dwie porcje', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await page.getByRole('button', { name: 'Przelicz', exact: true }).click();
  await page.getByLabel('Liczba porcji').fill('2');
  await page.getByRole('button', { name: 'Przelicz' }).last().click();
  await expect(page.getByText('Przeliczone: 2 porcji')).toBeVisible();
});


test('Recipe UX: składniki, przygotowanie i uwagi są dostępne', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await expect(page.locator('.ingredients')).toBeVisible();
  await expect(page.locator('.ingredient-icon').first()).toBeVisible();
  await expect(page.locator('ol.steps')).toBeVisible();
  await expect(page.getByLabel('Własne uwagi')).toBeVisible();
});



test('Etap 14: biblioteka startowa ma prawdziwe zdjęcia',async({page})=>{
  await reset(page);
  const r=await page.evaluate(async()=>{const {listRecipes}=await import('/recipes.js');const all=listRecipes();return {total:all.length,photos:all.filter(x=>/^https:\/\/photoshop-api\.adobe\.io\/v2\/short-url\//.test(x.photo||'')).length,missing:all.filter(x=>!x.photo).map(x=>x.name)}});
  expect(r.total).toBeGreaterThanOrEqual(13);expect(r.photos).toBeGreaterThanOrEqual(13);expect(r.missing).toEqual([]);
});
test('Etap 14: składniki używają ilustracji SVG zamiast kolorowych kółek',async({page})=>{
  await reset(page);await page.goto('/#/recipe/rcp_seed_pizza');
  const el=page.locator('.ingredient-icon').first();await expect(el).toBeVisible();
  await expect(el.locator('svg.ingredient-svg use')).toHaveAttribute('href',/assets\/ingredient-icons\.svg#/);
});
test('Etap 14: karta i hero korzystają ze zdjęcia potrawy',async({page})=>{
  await reset(page);await page.goto('/#/recipes');
  await expect(page.locator('.rcard .recipe-visual').first()).toHaveAttribute('src',/photoshop-api\.adobe\.io\/v2\/short-url/);
  await page.getByRole('link',{name:'Pizza Napoletana'}).click();
  await expect(page.locator('.hero-photo.recipe-visual')).toHaveAttribute('src',/images\.unsplash\.com/);
});
