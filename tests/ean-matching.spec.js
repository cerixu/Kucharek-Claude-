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


test('Recipe UX: domyślnie pokazuje jedną porcję i skaluje ilości do 1 porcji', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await expect(page.getByText('1 porcja', { exact: true })).toBeVisible();
  await expect(page.getByText('167 g', { exact: true }).first()).toBeVisible();
});


test('Recipe UX: lista otwiera szczegóły', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipes');
  await page.getByRole('link', { name: 'Pizza Napoletana' }).click();
  await expect(page.getByRole('heading', { name: 'Pizza Napoletana' })).toBeVisible();
});


test('Recipe UX: skalowanie receptury na dwie porcje przelicza składniki', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await page.getByRole('button', { name: 'Przelicz', exact: true }).click();
  await page.getByLabel('Liczba porcji').fill('2');
  await page.getByRole('button', { name: 'Przelicz' }).last().click();
  await expect(page.getByRole('status')).toContainText('Przeliczone: 2 porcji');
  await expect(page.getByText('333 g', { exact: true }).first()).toBeVisible();
});


test('Recipe UX: składniki, przygotowanie i uwagi są dostępne', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await expect(page.locator('.ingredients')).toBeVisible();
  await expect(page.locator('.ingredient-icon').first()).toBeVisible();
  await expect(page.locator('ol.steps')).toBeVisible();
  await expect(page.getByLabel('Własne uwagi')).toBeVisible();
});

test('Recipe UX: hero i informacje o recepturze są widoczne', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await expect(page.locator('.hero-photo.recipe-visual')).toBeVisible();
  await expect(page.locator('.facts .fact').first()).toContainText('1 porcja');
  await expect(page.getByText('Źródło:', { exact: false })).toBeVisible();
  await expect(page.getByText('450–485 °C', { exact: true })).toBeVisible();
});

test('Recipe UX: własne uwagi zapisują się i wracają po odświeżeniu', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  const notes = page.getByLabel('Własne uwagi');
  const value = 'Test Stage 15: +10 g wody przy następnym wyrabianiu';
  await notes.fill(value);
  await page.waitForTimeout(750);
  await page.reload();
  await expect(page.getByLabel('Własne uwagi')).toHaveValue(value);
});



test('Etap 14: biblioteka startowa ma prawdziwe zdjęcia',async({page})=>{
  await reset(page);
  const r=await page.evaluate(async()=>{const {listRecipes}=await import('/recipes.js');const all=listRecipes();const seeded=all.filter(x=>String(x.id||'').startsWith('rcp_seed_'));return {total:all.length,seeded:seeded.length,photos:seeded.filter(x=>/^https:\/\//.test(x.photo||'')).length,missing:seeded.filter(x=>!x.photo).map(x=>x.name)}});
  expect(r.total).toBeGreaterThanOrEqual(r.seeded);expect(r.seeded).toBeGreaterThanOrEqual(13);expect(r.photos).toBe(r.seeded);expect(r.missing).toEqual([]);
});
test('Etap 14: składniki używają ilustracji SVG zamiast kolorowych kółek',async({page})=>{
  await reset(page);await page.goto('/#/recipe/rcp_seed_pizza');
  const el=page.locator('.ingredient-icon').first();await expect(el).toBeVisible();
  await expect(el.locator('svg.ingredient-svg path')).toHaveAttribute('d', /.+/);
});
test('Etap 14: karta i hero korzystają ze zdjęcia potrawy',async({page})=>{
  await page.route('https://photoshop-api.adobe.io/v2/short-url/**', async route => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="black"/></svg>' });
  });await page.goto('/#/recipes');
  await expect(page.locator('.rcard .recipe-visual').first()).toHaveAttribute('src',/^(https?:\/\/|data:image\/svg\+xml)/);
  await page.getByRole('link',{name:'Pizza Napoletana'}).click();
  await expect(page.locator('.hero-photo.recipe-visual')).toHaveAttribute('src',/^(https?:\/\/|data:image\/svg\+xml)/);
});

test('Etap 14: migracja podmienia stare zdjęcie seedowane',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const {db}=await import('/db.js');
    const {restoreSeeds,listRecipes}=await import('/recipes.js');
    const old='https://images.unsplash.com/photo-legacy-test';
    const cur=await db.get('recipes','rcp_seed_pizza');
    await db.put('recipes',{...cur,photo:old,thumb:old});
    await restoreSeeds();
    const next=(await listRecipes()).find(x=>x.id==='rcp_seed_pizza');
    return {photo:next?.photo||'',old};
  });
  expect(out.photo).toMatch(/^https:\/\//);
  expect(out.photo).not.toBe(out.old);
});

    
test('Etap 14: migracja mediów działa po zmianie wersji biblioteki', async ({ page }) => {
  await reset(page);
  const out = await page.evaluate(async () => {
    const { db } = await import('/db.js');
    const { loadAll, listRecipes } = await import('/recipes.js');
    const legacy = 'https://images.unsplash.com/photo-legacy-build';
    const cur = await db.get('recipes', 'rcp_seed_pizza');
    await db.put('recipes', { ...cur, photo: legacy, thumb: legacy });
    await db.put('settings', { key: 'seedLibraryVersion', value: 5 });
    await loadAll();
    const next = listRecipes().find(x => x.id === 'rcp_seed_pizza');
    return { photo: next?.photo || '', version: (await db.get('settings', 'seedLibraryVersion'))?.value };
  });
  expect(out.version).toBe(11);
  expect(out.photo).toMatch(/^https:\/\/photoshop-api\.adobe\.io\/v2\/short-url\//);
});



test('Etap 14: ingredientIcon renderuje ikonę inline', async ({ page }) => {
  await reset(page);
  const out=await page.evaluate(async()=>{const {ingredientIcon}=await import('/components.js');const el=ingredientIcon({name:'Mąka pszenna'});document.body.appendChild(el);const p=el.querySelector('svg path');return {svg:!!el.querySelector('svg'),path:!!p,d:p?.getAttribute('d')||''}});
  expect(out.svg).toBe(true); expect(out.path).toBe(true); expect(out.d).toContain('M10 36');
});


test('Gotuję: składniki mają ikony i sól ma osobną ikonę niż oliwa', async ({ page }) => {
  await reset(page);
  await page.goto('/#/recipe/rcp_seed_pizza');
  await page.getByRole('button', { name: 'GOTUJĘ' }).click();
  const icons = page.locator('.cook-list .ingredient-icon');
  await expect(icons.first()).toBeVisible();
  const out = await page.evaluate(() => [...document.querySelectorAll('.cook-list .ingredient-icon')].map(x => ({
    cls:x.className.baseVal || x.className,
    d:x.querySelector('path')?.getAttribute('d') || ''
  })));
  expect(out.length).toBeGreaterThan(0);
  expect(out.every(x => x.d)).toBe(true);
  const salt = await page.evaluate(async () => {
    const { ingredientIcon } = await import('/components.js');
    const a = ingredientIcon({name:'Sól'}), b = ingredientIcon({name:'Oliwa z oliwek'});
    return { salt:a.className, oil:b.className, saltD:a.querySelector('path')?.getAttribute('d'), oilD:b.querySelector('path')?.getAttribute('d') };
  });
  expect(salt.salt).toContain('ingredient-icon-salt');
  expect(salt.oil).toContain('ingredient-icon-oil');
  expect(salt.saltD).not.toBe(salt.oilD);
});




test('Biblioteka ikon: pieprz nie jest hakiem i nowe składniki mają osobne glify', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { ingredientIcon } = await import('/components.js');
    const names=['Pieprz','Kmin rzymski','Kurkuma','Cynamon','Goździki','Gałka muszkatołowa','Kardamon','Anyż','Liść laurowy','Kapary','Oliwki','Fasola','Awokado','Ogórek','Cukinia','Bakłażan','Jabłko','Pomarańcza','Truskawka','Maliny','Miód','Syrop'];
    return names.map(name=>{const x=ingredientIcon({name});return {name,cls:x.className,d:x.querySelector('path')?.getAttribute('d')||''};});
  });
  expect(result.every(x=>x.d)).toBe(true);
  expect(result.find(x=>x.name==='Pieprz').cls).toContain('ingredient-icon-pepper');
  expect(result.find(x=>x.name==='Pieprz').d).toContain('M16 18c0-5');
  expect(new Set(result.map(x=>x.d)).size).toBe(result.length);
});

test('Ikony składników: seler naciowy i szeroka biblioteka mają własne glify, a kategoria daje sensowny fallback', async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const { ingredientIcon } = await import('/components.js');
    const names=['Seler naciowy','Szpinak','Sałata','Kapusta','Brokuł','Kalafior','Kukurydza','Groszek','Burak','Rzodkiewka','Por','Fenkuł','Szparagi','Karczoch','Dynia','Gruszka','Banan','Winogrona','Brzoskwinia','Śliwka','Kokos','Ananas','Czekolada','Żelatyna','Chleb','Tofu','Tempeh','Krewetki','Kalmary','Małże'];
    return {items:names.map(name=>{const x=ingredientIcon({name});return [name,x.className,x.querySelector('path')?.getAttribute('d')||''];}),
      fallback: ingredientIcon({name:'Nowy liść X',category:'warzywa'}).className};
  });
  expect(result.items.every(x=>x[2])).toBe(true);
  expect(result.items.find(x=>x[0]==='Seler naciowy')[1]).toContain('ingredient-icon-celery_stalk');
  expect(result.fallback).toContain('ingredient-icon-vegetable');
  const fruit = await page.evaluate(async () => { const { ingredientIcon } = await import('/components.js'); return ingredientIcon({name:'Nowy owoc X',category:'owoce'}).className; });
  expect(fruit).toContain('ingredient-icon-fruit');
});

test('Ikony serów: Parmigiano ma wyraźny glif sera, a seler naciowy nie wpada do soli', async ({ page }) => {
  await reset(page);
  const out = await page.evaluate(async () => {
    const { ingredientIcon } = await import('/components.js');
    const cheese = ingredientIcon({ name:'Parmigiano Reggiano' });
    const celery = ingredientIcon({ name:'Seler naciowy' });
    const salt = ingredientIcon({ name:'Sól' });
    return {
      cheeseClass: cheese.className,
      cheesePath: cheese.querySelector('path')?.getAttribute('d') || '',
      celeryClass: celery.className,
      saltClass: salt.className,
    };
  });
  expect(out.cheeseClass).toContain('ingredient-icon-cheese');
  expect(out.cheesePath).toContain('M8 35V17l29-7v24L8 35');
  expect(out.celeryClass).toContain('ingredient-icon-celery_stalk');
  expect(out.celeryClass).not.toContain('ingredient-icon-salt');
  expect(out.saltClass).toContain('ingredient-icon-salt');
});
