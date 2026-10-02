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

test('ETAP 18: ekran Straty pokazuje tygodniowy raport',async({page})=>{await reset(page);await page.goto('/#/inventory');await page.getByRole('button',{name:'PRO',exact:true}).click();await page.getByRole('button',{name:'Straty',exact:true}).click();await expect(page.getByRole('heading',{name:'Raport strat',exact:true})).toBeVisible();await expect(page.getByText('Koszt liczony według ceny z chwili wyrzucenia.',{exact:true})).toBeVisible();});
