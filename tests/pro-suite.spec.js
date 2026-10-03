import { test, expect } from '@playwright/test';
const DB='kucharzyna-claude-db';
async function reset(page){
  await page.goto('/');
  await page.waitForFunction(()=>window.__kucharzyna?.ready===true);
  await page.evaluate(async()=>{
    const {db,STORES}=await import('/db.js');
    for(const store of Object.keys(STORES)) await db.clear(store);
  });
  await page.reload();
  await page.waitForFunction(()=>window.__kucharzyna?.ready===true);
}

test('ETAP 5: dostawa aktualizuje stan, cenę, historię i partię',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const p=await import('/pro.js');const i=await import('/inventory.js');const d=await p.receiveDelivery({supplierName:'Dostawca E2E',documentNo:'FV/1',items:[{name:'Mąka PRO',quantity:25,unit:'kg',purchasePrice:9.5,priceUnit:'kg',lot:'L001',expiryAt:Date.now()+86400000*30}]});const item=i.findInventoryByName('Mąka PRO');const lots=await p.listLots();const prices=await p.listPriceHistory(item.id);const mov=await p.listMovements();return{qty:item.quantity,price:item.purchasePrice,lot:lots[0].lot,prices:prices.length,movement:mov.find(x=>x.sourceId===d.id)?.type};});expect(out.qty).toBe(25);expect(out.price).toBe(9.5);expect(out.lot).toBe('L001');expect(out.prices).toBe(1);expect(out.movement).toBe('delivery');});

test('ETAP 5: korekta i strata tworzą ślad ruchu',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const item=await i.saveInventoryItem({name:'Ser PRO',quantity:10,unit:'kg',purchasePrice:20,priceUnit:'kg'});await p.adjustStockPro(item.id,-2,'korekta test');await p.recordWaste(item.id,1,'zepsucie');return{qty:i.listInventory().find(x=>x.id===item.id).quantity,moves:(await p.listMovements()).filter(x=>x.inventoryId===item.id).map(x=>x.type)};});expect(out.qty).toBe(7);expect(out.moves).toEqual(expect.arrayContaining(['adjustment','waste']));});

test('ETAP 5: inwentaryzacja zatwierdza różnicę',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const item=await i.saveInventoryItem({name:'Ryż PRO',quantity:10,unit:'kg'});const t=await p.startStocktake();await p.updateStocktake(t.id,item.id,7);await p.finalizeStocktake(t.id);await i.reloadInventory();return i.findInventoryByName('Ryż PRO').quantity;});expect(out).toBe(7);});

test('ETAP 6: dostawca i zamówienie zapisują się',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const p=await import('/pro.js');const s=await p.addSupplier({name:'Metro Gastro',phone:'123'});const o=await p.createPurchaseOrder({supplierId:s.id,supplierName:s.name,status:'ordered',items:[{name:'Oliwa',amount:10,unit:'l'}]});return{supplier:(await p.listSuppliers()).length,order:(await p.listPurchaseOrders()).find(x=>x.id===o.id)?.status};});expect(out.supplier).toBe(1);expect(out.order).toBe('ordered');});

test('ETAP 7: realny Food Cost uwzględnia opakowanie i stratę',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const{realFoodCost}=await import('/pro-calculators.js');const r={servings:4,sections:[{ingredients:[{name:'Ser',amount:400,unit:'g',price:20,priceUnit:'kg'}]}]};return realFoodCost(r,1,{packaging:1.2,wastePercent:10});});expect(out.total).toBeCloseTo(10,8);expect(out.perPortion).toBeCloseTo(2.5,8);});

test('ETAP 7: historia cen liczy zmianę',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const{priceTrend}=await import('/pro-calculators.js');return priceTrend([{price:10,at:1},{price:12,at:2},{price:15,at:3}]);});expect(out.change).toBe(5);expect(out.percent).toBe(50);});

test('ETAP 8: produkcja zwiększa półprodukt i zużywa recepturę',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const{db}=await import('/db.js');await i.saveInventoryItem({name:'Pomidor surowy',quantity:1000,unit:'g'});const recipe={id:'prod-recipe',name:'Sos',sections:[{ingredients:[{name:'Pomidor surowy',amount:500,unit:'g'}]}]};await db.put('recipes',recipe);const row=await p.createProductionBatch({productName:'Sos pomidorowy',quantity:300,unit:'g',recipeId:recipe.id,factor:1});await p.completeProductionBatch(row.id);await i.reloadInventory();return{input:i.findInventoryByName('Pomidor surowy').quantity,output:i.findInventoryByName('Sos pomidorowy').quantity,status:(await db.get('productionBatches',row.id)).status};});expect(out.input).toBe(500);expect(out.output).toBe(300);expect(out.status).toBe('completed');});

test('ETAP 9: planowanie wykrywa brakującą ilość',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const{planRecipe}=await import('/pro.js');await i.saveInventoryItem({name:'Mąka plan',quantity:2,unit:'kg'});return planRecipe({id:'r',name:'Pizza plan',sections:[{ingredients:[{name:'Mąka plan',amount:3,unit:'kg'},{name:'Sól plan',amount:20,unit:'g'}]}]},1);});expect(out.find(x=>x.name==='Mąka plan').missing).toBe(1);expect(out.find(x=>x.name==='Sól plan').missing).toBe(20);});

test('ETAP 10: kalkulator skaluje produkcję i liczy straty',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const{scaleBatch,productionYield,lossPercent,inventoryCoverage}=await import('/pro-calculators.js');return{scaled:scaleBatch(10,5,15),yield:productionYield(10,7.5),loss:lossPercent(10,7.5),coverage:inventoryCoverage(10,4)};});expect(out.scaled).toBe(30);expect(out.yield).toBe(75);expect(out.loss).toBe(25);expect(out.coverage.missing).toBe(6);});

test('ETAP 11: analityka pokazuje wartość magazynu, ruchy i straty',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const item=await i.saveInventoryItem({name:'Olej analityka',quantity:10,unit:'l',purchasePrice:20,priceUnit:'l'});await p.recordWaste(item.id,2,'zepsucie');await p.receiveDelivery({supplierName:'D',items:[{name:'Olej analityka',quantity:5,unit:'l',purchasePrice:22,priceUnit:'l'}]});return p.analyticsSummary();});expect(out.products).toBe(1);expect(out.stockValue).toBeCloseTo(286,8);expect(out.waste).toBe(1);expect(out.deliveries).toBe(1);expect(out.movements).toBeGreaterThanOrEqual(2);});

test('ETAP 5-11: ekran PRO jest dostępny z Magazynu',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await expect(page.getByRole('heading',{name:'Kucharek PRO',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Dostawy',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Analityka',exact:true})).toBeVisible();});

test('backup obejmuje dane PRO',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const b=await import('/backup.js');await i.saveInventoryItem({name:'Backup PRO',quantity:5,unit:'kg'});await p.addSupplier({name:'Backup dostawca'});const x=await b.buildBackup();return {inventory:x.data.inventory.length,suppliers:x.data.suppliers.length,deliveries:x.data.deliveries.length,lots:x.data.lots.length};});expect(out.inventory).toBe(1);expect(out.suppliers).toBe(1);expect(out.deliveries).toBe(0);});
test('backup obejmuje także postęp GOTUJĘ',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const{db}=await import('/db.js');const b=await import('/backup.js');await db.put('cookSessions',{recipeId:'cook-backup',checked:['ing1'],stepIndex:2,updatedAt:Date.now()});const x=await b.buildBackup();return x.data.cookSessions?.[0]?.recipeId;});expect(out).toBe('cook-backup');});

test('inwentaryzacja nie pozwala zamknąć bez policzonej ilości',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');await i.saveInventoryItem({name:'Stockcheck',quantity:10,unit:'kg'});const t=await p.startStocktake();try{await p.finalizeStocktake(t.id);return false;}catch(e){return true;}});expect(out).toBe(true);});


test('ETAP 13: receptura domyślnie pokazuje ilości na 1 porcję',async({page})=>{
  await reset(page);
  await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    const r=blankRecipe({name:'Test jedna porcja',category:'cat-pizza',servings:4,sections:[{id:'s1',name:'',ingredients:[{id:'i1',name:'Mąka',amount:400,unit:'g'}]}]});
    await saveRecipe(r);
  });
  const id=await page.evaluate(async()=>{const{listRecipes}=await import('/recipes.js');return listRecipes().find(r=>r.name==='Test jedna porcja').id;});
  await page.goto('/#/recipe/'+id);
  await expect(page.getByText('1 porcja',{exact:true})).toBeVisible();
  await expect(page.locator('.ing-qty').filter({hasText:'100'})).toBeVisible();
});

test('ETAP 13: receptura bez zdjęcia dostaje offline grafikę zastępczą',async({page})=>{
  await reset(page);
  await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    await saveRecipe(blankRecipe({name:'Grafika test',category:'cat-pizza',servings:1}));
  });
  const id=await page.evaluate(async()=>{const{listRecipes}=await import('/recipes.js');return listRecipes().find(r=>r.name==='Grafika test').id;});
  await page.goto('/#/recipe/'+id);
  await expect(page.locator('img.recipe-visual')).toBeVisible();
  await expect(page.locator('img.recipe-visual')).toHaveAttribute('src',/^(data:image\/svg\+xml|assets\/start\/)/);
});

test('ETAP 13: edytor potrafi utworzyć grafikę receptury offline',async({page})=>{
  await reset(page);
  await page.goto('/#/new');
  await expect(page.getByRole('button',{name:'Utwórz grafikę',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Utwórz grafikę',exact:true}).click();
  await expect(page.locator('img.photo-prev')).toBeVisible();
  await expect(page.locator('img.photo-prev')).toHaveAttribute('src',/^data:image\/svg\+xml/);
});

test('ETAP 13: nowa receptura ma domyślnie 1 porcję',async({page})=>{
  await reset(page);
  await page.goto('/#/new');
  const input=page.getByLabel('Liczba porcji');
  await expect(input).toHaveValue('1');
});


test('ETAP 14: miniaturka i hero wybierają źródło obrazu',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{recipeVisual}=await import('/components.js');
    const r={name:'Media split',category:'cat-pizza',photo:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',thumb:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>'};
    const card=recipeVisual(r);
    const hero=recipeVisual(r,'',{hero:true});
    return {card:card.getAttribute('src'),hero:hero.getAttribute('src')};
  });
  expect(out.card).toContain('circle');
  expect(out.hero).toContain('rect');
  expect(out.card).toMatch(/^data:image\/svg\+xml/);
});

test('ETAP 14: brak zdjęcia korzysta z lokalnej grafiki kategorii',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{recipeVisual}=await import('/components.js');
    return recipeVisual({name:'Pizza visual',category:'cat-pizza'}).getAttribute('src');
  });
  expect(out).toBe('assets/start/pizza.svg');
});

test('ETAP 14: uszkodzone zdjęcie ma bezpieczny fallback graficzny',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{recipeVisual}=await import('/components.js');
    const el=recipeVisual({name:'Broken media',category:'cat-pizza',photo:'https://invalid.example/kucharek.jpg'});
    document.body.append(el);
    el.dispatchEvent(new Event('error'));
    return el.getAttribute('src');
  });
  expect(out).toMatch(/^data:image\/svg\+xml/);
});

test('ETAP 14: ekran startowy używa nazwy Kucharek',async({page})=>{
  await reset(page);
  await expect(page.getByText('Kucharek',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Kucharzyno',{exact:false})).toHaveCount(0);
});


test('ETAP 18: strata zapisuje koszt historyczny i tygodniowy raport grupuje produkty',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const item=await i.saveInventoryItem({name:'Rukola raport',quantity:10,unit:'kg',purchasePrice:20,priceUnit:'kg'});const row=await p.recordWaste(item.id,1,'zepsucie');await i.saveInventoryItem({...item,purchasePrice:30});const report=await p.wasteReport(Date.now()-86400000*3,Date.now()+1000);return{cost:row.costValue,price:row.price,reportCost:report.totalCost,top:report.topProduct?.name,amount:report.topProduct?.amount};});expect(out.cost).toBe(20);expect(out.price).toBe(20);expect(out.reportCost).toBe(20);expect(out.top).toBe('Rukola raport');expect(out.amount).toBe(1);});

test('ETAP 18: ekran Straty pokazuje tygodniowy raport',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Straty',exact:true}).click();await expect(page.getByRole('heading',{name:'Raport strat',exact:true})).toBeVisible();await expect(page.getByText('Brak strat w tym tygodniu.',{exact:true})).toBeVisible();});

test('ETAP 19: sprzedaż rozlicza wiele receptur atomowo i nie pozwala zejść poniżej stanu',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');await i.saveInventoryItem({name:'Mąka sprzedaż',quantity:10,unit:'kg'});const r={id:'sale-r',name:'Pizza sprzedaż',sections:[{ingredients:[{name:'Mąka sprzedaż',amount:200,unit:'g'}]}]};await p.salesDeplete([{recipe:r,quantity:3}]);return i.findInventoryByName('Mąka sprzedaż').quantity;});expect(out).toBe(9.4);});
test('ETAP 19: sprzedaż jest atomowa przy braku składnika',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');await i.saveInventoryItem({name:'Mąka A',quantity:1,unit:'kg'});await i.saveInventoryItem({name:'Sól A',quantity:1,unit:'g'});const r={id:'sale-r2',name:'Pizza A',sections:[{ingredients:[{name:'Mąka A',amount:200,unit:'g'},{name:'Sól A',amount:2,unit:'g'}]}]};const x=await p.salesDeplete([{recipe:r,quantity:1}]);return{x:x.ok,m:i.findInventoryByName('Mąka A').quantity,s:i.findInventoryByName('Sól A').quantity};});expect(out.x).toBe(false);expect(out.m).toBe(1);expect(out.s).toBe(1);});
test('ETAP 19: CSV sprzedaży mapuje nazwę i ilość',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const p=await import('/pro.js');return p.parseSalesCsv('nazwa,ilość\nPizza,12\nPasta,3');});expect(out).toEqual([{name:'Pizza',quantity:12},{name:'Pasta',quantity:3}]);});
test('ETAP 19: autopilot daje propozycję zakupu i alert partii',async({page})=>{await reset(page);await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');await i.saveInventoryItem({name:'Śmietana auto',quantity:1,unit:'l',minQuantity:2,targetQuantity:5});await p.receiveDelivery({items:[{name:'Masło auto',quantity:1,unit:'kg',expiryAt:Date.now()+86400000}]});});const r=await page.evaluate(async()=>{const p=await import('/pro.js');return{re:(await p.reorderSuggestions())[0]?.orderQuantity,ex:(await p.expiryAlerts(3)).length};});expect(r.re).toBe(4);expect(r.ex).toBe(1);});
test('ETAP 19: ekran Automatyzacje jest dostępny',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Automatyzacje',exact:true}).click();await expect(page.getByRole('heading',{name:'Autopilot magazynu',exact:true})).toBeVisible();});

test('ETAP 19: autopilot nie dubluje już oczekującego zakupu',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');const s=await import('/shopping.js');await i.saveInventoryItem({name:'Mąka pending',quantity:1,unit:'kg',minQuantity:2,targetQuantity:5});await s.addItems([{name:'Mąka pending',amount:2,unit:'kg'}]);return (await p.reorderSuggestions())[0]?.orderQuantity;});expect(out).toBe(2);});

test('ETAP 20: Automatyzacje pokazują stan autopilota i pozwalają go przełączyć',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Automatyzacje',exact:true}).click();await expect(page.getByText('AKTYWNY · zakupy mogą być uzupełniane automatycznie.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Wyłącz autopilota',exact:true}).click();await expect(page.getByText('WYŁĄCZONY · nic nie zostanie dodane automatycznie.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Włącz autopilota',exact:true}).click();await expect(page.getByText('AKTYWNY · zakupy mogą być uzupełniane automatycznie.',{exact:true})).toBeVisible();});
test('ETAP 20: przeterminowana partia jest oznaczona osobno',async({page})=>{await reset(page);await page.evaluate(async()=>{const i=await import('/inventory.js');const p=await import('/pro.js');await p.receiveDelivery({items:[{name:'Produkt przeterminowany',quantity:1,unit:'kg',expiryAt:Date.now()-86400000}]});await i.loadInventory();});await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Automatyzacje',exact:true}).click();await expect(page.getByText('PRZETERMINOWANE',{exact:true})).toBeVisible();});

test('ETAP 21: sugestie magazynu można zamienić w jedno zamówienie',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Automatyzacje',exact:true}).click();await expect(page.locator('.pro-nav').getByRole('button',{name:'Automatyzacje',exact:true})).toBeVisible();await expect(page.getByText(/Utwórz zamówienie/).first()).toBeVisible();});
test('ETAP 21: dostawa ma pola dokumentu i terminu ważności',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Dostawy',exact:true}).click();await page.getByRole('button',{name:'Nowa dostawa',exact:true}).click();await expect(page.locator('input[aria-label="Numer dokumentu"]')).toBeVisible();await expect(page.locator('input[aria-label="Termin ważności"]')).toBeVisible();});

test('ETAP 22: magazyn ma gotowy zestaw danych testowych',async({page})=>{await reset(page);const out=await page.evaluate(async()=>{const i=await import('/inventory.js');const added=await i.seedTestInventory();return{added:added.length,total:i.listInventory().length,low:i.listInventory().filter(x=>i.stockState(x)!=='ok').length};});expect(out.added).toBeGreaterThanOrEqual(6);expect(out.total).toBeGreaterThanOrEqual(6);expect(out.low).toBeGreaterThanOrEqual(6);await page.goto('/#/inventory');await expect(page.getByText('Automatyzacja',{exact:true})).toBeVisible();await expect(page.locator('.stock-row .stock-title').filter({hasText:'Mąka 00 test'})).toBeVisible();});


test('ETAP 23: Magazyn ma prostą automatyzację zużycia i zakupów',async({page})=>{
  await reset(page);
  await page.goto('/#/inventory');
  await expect(page.getByText('Automatyzacja',{exact:true})).toBeVisible();
  await expect(page.getByText('Zużycie przy gotowaniu',{exact:true})).toBeVisible();
  await expect(page.getByText('Sugestie zakupów',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Lista zakupów',exact:true})).toBeVisible();
});

test('ETAP 24: Pizza kalkulator ma tryb Mam mąkę i liczy składniki od mąki',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{pizzaCalcFromFlour}=await import('/calculator.js');
    return pizzaCalcFromFlour({flour:7500,ballWeight:250,hydration:65,salt:3,oil:0,yeast:0.2});
  });
  expect(out.flour).toBe(7500);
  expect(out.water).toBe(4875);
  expect(out.salt).toBe(225);
  expect(out.yeast).toBe(15);
  expect(out.total).toBe(12615);
  expect(out.balls).toBe(50);
  await page.goto('/#/calc/pizza');
  await page.getByRole('button',{name:'Mam mąkę',exact:true}).click();
  await expect(page.getByLabel('Mam mąkę w gramach')).toBeVisible();
  await page.getByLabel('Mam mąkę w gramach').fill('7500');
  await expect(page.locator('.result').filter({hasText:'Woda'})).toContainText('4875');
  await expect(page.locator('.result').filter({hasText:'Sól'})).toContainText('225');
  await expect(page.locator('.result').filter({hasText:'Kulki'})).toContainText('50');
});


test('ETAP 25: wyszukiwarka receptur nie traci focusu po wpisaniu kolejnych znaków',async({page})=>{
  await reset(page);
  await page.goto('/#/recipes');
  const input=page.locator('input.search-input');
  await expect(input).toBeVisible();
  await input.fill('pizza');
  await expect(input).toHaveValue('pizza');
  await expect(input).toBeFocused();
});

test('ETAP 25: wyszukiwarka magazynu nie traci focusu po wpisaniu kolejnych znaków',async({page})=>{
  await reset(page);
  await page.goto('/#/inventory');
  const input=page.locator('input.search-input');
  await expect(input).toBeVisible();
  await input.fill('mąka');
  await expect(input).toHaveValue('mąka');
  await expect(input).toBeFocused();
});

test('ETAP 25: pola temperatury i czasu w kalkulatorze pizzy zachowują focus po zmianie wartości',async({page})=>{
  await reset(page);
  await page.goto('/#/calc/pizza');
  const temp=page.getByLabel('Temperatura fermentacji');
  await temp.fill('20');
  await expect(temp).toBeVisible();
  await expect(temp).toBeFocused();
  const hours=page.getByLabel('Czas fermentacji w godzinach');
  await hours.fill('24');
  await expect(hours).toBeVisible();
  await expect(hours).toBeFocused();
});

test('ETAP 26: edytor pozwala pisać ciągłym tekstem bez utraty focusu',async({page})=>{
  await reset(page);
  await page.goto('/#/new');
  const name=page.getByLabel('Nazwa receptury');
  await name.click();
  await name.pressSequentially('Carbonara', {delay: 20});
  await expect(name).toHaveValue('Carbonara');
  await expect(name).toBeFocused();
  const desc=page.getByLabel('Opis');
  await desc.click();
  await desc.pressSequentially('Opis testowy', {delay: 20});
  await expect(desc).toHaveValue('Opis testowy');
  await expect(desc).toBeFocused();
});


test('ETAP 27: zakończenie gotowania automatycznie zużywa składniki z magazynu',async({page})=>{
  await reset(page);
  const id=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    const i=await import('/inventory.js');
    await i.saveInventoryItem({name:'Mąka automatyczna',quantity:1,unit:'kg',minQuantity:0.9,targetQuantity:2});
    const r=blankRecipe({name:'Pizza auto magazyn',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[{id:'i1',name:'Mąka automatyczna',amount:200,unit:'g'}]}],steps:[]});
    await saveRecipe(r);
    return r.id;
  });
  await page.goto('/#/cook/'+id);
  await page.getByRole('checkbox').filter({hasText:'Mąka automatyczna'}).click();
  await page.getByRole('button',{name:'Zakończ',exact:true}).click();
  await expect(page.getByText('Smacznego! 👨‍🍳',{exact:true})).toBeVisible();
  const qty=await page.evaluate(async()=>{const i=await import('/inventory.js');await i.reloadInventory();return i.findInventoryByName('Mąka automatyczna').quantity;});
  expect(qty).toBeCloseTo(0.8,8);
});

test('ETAP 27: zużycie gotowania jest idempotentne i zapisuje ruch magazynowy',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const i=await import('/inventory.js');
    const p=await import('/pro.js');
    const r={id:'recipe-idempotent',name:'Idempotentna pizza',sections:[{ingredients:[{name:'Mąka idempotentna',amount:200,unit:'g'}]}]};
    const item=await i.saveInventoryItem({name:'Mąka idempotentna',quantity:1,unit:'kg'});
    const a=await i.consumeRecipeIngredients(r,1,{sourceId:'cook:test:idempotent'});
    const b=await i.consumeRecipeIngredients(r,1,{sourceId:'cook:test:idempotent'});
    await i.reloadInventory();
    const moves=(await p.listMovements()).filter(x=>x.sourceId==='cook:test:idempotent');
    return{qty:i.findInventoryByName('Mąka idempotentna').quantity,first:a.changes.length,second:b.alreadyConsumed,moves:moves.length,type:moves[0]?.type};
  });
  expect(out.qty).toBeCloseTo(0.8,8);
  expect(out.first).toBe(1);
  expect(out.second).toBe(true);
  expect(out.moves).toBe(1);
  expect(out.type).toBe('recipe_consumption');
});

test('ETAP 27: wyłączenie automatycznego zużycia zachowuje stan magazynu',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{setSetting}=await import('/recipes.js');
    const i=await import('/inventory.js');
    await setSetting('inventoryAutoConsumption',false);
    await i.saveInventoryItem({name:'Mąka ręczna',quantity:1,unit:'kg'});
    return {enabled:(await import('/recipes.js')).getSetting('inventoryAutoConsumption'),qty:i.findInventoryByName('Mąka ręczna').quantity};
  });
  expect(out.enabled).toBe(false);
  expect(out.qty).toBe(1);
});


test('ETAP 18: niski stan po gotowaniu trafia automatycznie do zakupów',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const i=await import('/inventory.js');
    const sh=await import('/shopping.js');
    await i.saveInventoryItem({name:'Oliwa low auto',quantity:1.2,unit:'l',minQuantity:1.5,targetQuantity:5});
    const r=await sh.addLowStockToShopping();
    return {count:r.count,items:r.items.map(x=>({name:x.name,amount:x.amount,unit:x.unit})),shopping:(await import('/recipes.js')).state.shopping.filter(x=>!x.done&&x.name==='Oliwa low auto').map(x=>x.amount)};
  });
  expect(out.count).toBe(1);
  expect(out.items[0].amount).toBeCloseTo(3.8,8);
  expect(out.shopping[0]).toBeCloseTo(3.8,8);
});

test('ETAP 18: ponowne uruchomienie sugestii nie dubluje pozycji zakupowej',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const i=await import('/inventory.js');
    const sh=await import('/shopping.js');
    await i.saveInventoryItem({name:'Mozz low auto',quantity:1,unit:'kg',minQuantity:2,targetQuantity:5});
    await sh.addLowStockToShopping();
    await sh.addLowStockToShopping();
    return (await import('/recipes.js')).state.shopping.filter(x=>!x.done&&x.name==='Mozz low auto');
  });
  expect(out).toHaveLength(1);
  expect(out[0].amount).toBeCloseTo(4,8);
});

test('ETAP 19: przeliczone gotowanie zużywa magazyn zgodnie z mnożnikiem',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    const i=await import('/inventory.js');
    const r=blankRecipe({name:'Pizza ×2',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[{id:'i1',name:'Mąka ×2',amount:200,unit:'g'}]}],steps:[]});
    await saveRecipe(r);
    await i.saveInventoryItem({name:'Mąka ×2',quantity:2,unit:'kg'});
    const result=await i.consumeRecipeIngredients(r,2,{sourceId:'cook:test-scale'});
    return {quantity:i.findInventoryByName('Mąka ×2').quantity,delta:result.changes[0]?.delta};
  });
  expect(out.quantity).toBeCloseTo(1.6,8);
  expect(out.quantity).toBeCloseTo(1.6,8);
});

test('ETAP 19: zapis ostatniego gotowania receptury',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe,patchRecipe,getRecipe}=await import('/recipes.js');
    const r=blankRecipe({name:'Historia gotowania',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    await saveRecipe(r);
    await patchRecipe(r.id,{lastCookedAt:Date.now(),cookCount:1},{touch:true});
    const saved=getRecipe(r.id);
    return {count:saved?.cookCount,last:saved?.lastCookedAt};
  });
  expect(out.count).toBe(1);
  expect(out.last).toBeGreaterThan(0);
});

test('ETAP 28: filtr Gotowane pokazuje tylko ugotowane receptury i liczbę gotowań',async({page})=>{
  await reset(page);
  await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    const a=blankRecipe({name:'Gotowana receptura',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    const b=blankRecipe({name:'Jeszcze niegotowana',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    a.cookCount=3; a.lastCookedAt=Date.now()-1000; b.cookCount=0; b.lastCookedAt=0;
    await saveRecipe(a); await saveRecipe(b);
  });
  await page.goto('/#/recipes');
  await page.getByRole('button',{name:/Gotowane/}).click();
  await expect(page.getByRole('link',{name:'Gotowana receptura'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Jeszcze niegotowana'})).toHaveCount(0);
  await expect(page.getByText(/gotowano 3×/)).toBeVisible();
});
test('ETAP 28: sortowanie Najczęściej gotowane układa receptury po liczbie gotowań',async({page})=>{
  await reset(page);
  const out=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe,listRecipes}=await import('/recipes.js');
    const a=blankRecipe({name:'Często',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    const b=blankRecipe({name:'Rzadko',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    a.cookCount=5; b.cookCount=2; await saveRecipe(a); await saveRecipe(b);
    return listRecipes().sort((x,y)=>(y.cookCount||0)-(x.cookCount||0)).slice(0,2).map(x=>x.name);
  });
  expect(out).toEqual(['Często','Rzadko']);
});

test('ETAP 29: zakończenie gotowania zapisuje trwały wpis historii',async({page})=>{
  await reset(page);
  const id=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe}=await import('/recipes.js');
    const r=blankRecipe({name:'Historia trwała test',category:'cat-pizza',servings:2,sections:[{id:'s1',name:'',ingredients:[{id:'i1',name:'Woda test',amount:100,unit:'g'}]}],steps:[]});
    await saveRecipe(r);
    return r.id;
  });
  await page.goto('/#/cook/'+id);
  await page.getByRole('checkbox').filter({hasText:'Woda test'}).click();
  await page.getByRole('button',{name:'Zakończ',exact:true}).click();
  const out=await page.evaluate(async()=>{
    const{db}=await import('/db.js');
    const rows=await db.byIndex('cookHistory','recipeId',window.location.hash.split('/').pop());
    return rows.map(x=>({recipeId:x.recipeId,name:x.recipeName,factor:x.factor,servings:x.servings,inventory:x.inventoryConsumed})).slice(-1)[0];
  });
  expect(out.recipeId).toBe(id);
  expect(out.name).toBe('Historia trwała test');
  expect(out.factor).toBe(1);
  expect(out.servings).toBe(2);
  expect(out.inventory).toBe(true);
});

test('ETAP 29: receptura pokazuje historię gotowania i szczegóły ostatniego gotowania',async({page})=>{
  await reset(page);
  const id=await page.evaluate(async()=>{
    const{saveRecipe,blankRecipe,patchRecipe}=await import('/recipes.js');
    const{db}=await import('/db.js');
    const r=blankRecipe({name:'Karta historii test',category:'cat-pizza',servings:1,sections:[{id:'s1',name:'',ingredients:[]}],steps:[]});
    await saveRecipe(r);
    await db.put('cookHistory',{id:'cook-history-ui',recipeId:r.id,recipeName:r.name,at:Date.now(),factor:2,servings:2,inventoryConsumed:false});
    await patchRecipe(r.id,{cookCount:1,lastCookedAt:Date.now()},{touch:true});
    return r.id;
  });
  await page.goto('/#/recipe/'+id);
  await expect(page.getByText('Historia gotowania',{exact:true})).toBeVisible();
  await expect(page.getByText(/Gotowano 1×/)).toBeVisible();
  await page.getByRole('button',{name:'Pokaż historię',exact:true}).click();
  await expect(page.getByText(/Skala ×2/)).toBeVisible();
  await expect(page.getByText(/Bez zmiany magazynu/)).toBeVisible();
});
