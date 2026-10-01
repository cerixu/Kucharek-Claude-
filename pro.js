import { db } from './db.js';
import { uid } from './util.js';
import { loadInventory, reloadInventory, listInventory, saveInventoryItem, adjustInventory, findInventoryMatch, unitCompatible, unitToBase, unitFromBase, consumeRecipeIngredients } from './inventory.js';
import { getRecipe } from './recipes.js';

const now = () => Date.now();
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

async function all(store) { return db.getAll(store); }
async function put(store, value) { await db.put(store, value); return value; }

export async function listDeliveries() { return (await all('deliveries')).sort((a,b)=>b.at-a.at); }
export async function listLots() { return (await all('lots')).sort((a,b)=>(a.expiryAt||Infinity)-(b.expiryAt||Infinity)); }
export async function listMovements() { return (await all('stockMovements')).sort((a,b)=>b.at-a.at); }
export async function listPriceHistory(inventoryId=null) {
  const rows = await all('priceHistory');
  return rows.filter(x=>!inventoryId||x.inventoryId===inventoryId).sort((a,b)=>b.at-a.at);
}

export async function recordMovement(data) {
  const row={id:uid('mov_'),at:now(),type:data.type||'manual',inventoryId:data.inventoryId||null,inventoryName:data.inventoryName||'',delta:num(data.delta),unit:data.unit||'',before:data.before??null,after:data.after??null,sourceId:data.sourceId||null,reason:data.reason||'',note:data.note||''};
  return put('stockMovements',row);
}

export async function addSupplier(data) {
  const row={id:data.id||uid('sup_'),name:String(data.name||'').trim(),contact:String(data.contact||'').trim(),phone:String(data.phone||'').trim(),email:String(data.email||'').trim(),notes:String(data.notes||'').trim(),updatedAt:now(),createdAt:data.createdAt||now()};
  if(!row.name) throw new Error('Podaj nazwę dostawcy.');
  return put('suppliers',row);
}
export async function listSuppliers(){return (await all('suppliers')).sort((a,b)=>a.name.localeCompare(b.name,'pl'));}

export async function createPurchaseOrder(data) {
  const row={id:data.id||uid('po_'),supplierId:data.supplierId||null,supplierName:data.supplierName||'',status:data.status||'draft',items:(data.items||[]).map(x=>({...x,amount:num(x.amount),unit:x.unit||'szt'})),notes:data.notes||'',createdAt:data.createdAt||now(),updatedAt:now()};
  return put('purchaseOrders',row);
}
export async function updatePurchaseOrder(id, patch) {
  const row=await db.get('purchaseOrders',id); if(!row) return null;
  Object.assign(row,patch,{updatedAt:now()}); return put('purchaseOrders',row);
}
export async function listPurchaseOrders(){return (await all('purchaseOrders')).sort((a,b)=>b.createdAt-a.createdAt);}

export async function receiveDelivery(data) {
  await loadInventory();
  const delivery={id:data.id||uid('del_'),supplierId:data.supplierId||null,supplierName:data.supplierName||'',documentNo:data.documentNo||'',at:data.at||now(),notes:data.notes||'',items:[],createdAt:data.createdAt||now()};
  for(const raw of (data.items||[])){
    const name=String(raw.name||'').trim(), qty=num(raw.quantity);
    if(!name||!(qty>0)) continue;
    const unit=raw.unit||'szt', price=raw.purchasePrice===''||raw.purchasePrice==null?null:num(raw.purchasePrice);
    const priceUnit=raw.priceUnit||unit;
    const match=findInventoryMatch({name,ean:raw.ean});
    let item=match?.item||null, before=0;
    if(item && unitCompatible(item.unit,unit)){
      before=num(item.quantity);
      const delta=unitFromBase(unitToBase(qty,unit),item.unit);
      item=await adjustInventory(item.id,delta,'delivery');
      if(price!=null){item=await saveInventoryItem({...item,purchasePrice:price,priceUnit,ean:raw.ean||item.ean});}
      await recordMovement({type:'delivery',inventoryId:item.id,inventoryName:item.name,delta,unit:item.unit,before,after:item.quantity,sourceId:delivery.id,reason:'delivery'});
    } else if(!item){
      item=await saveInventoryItem({name,quantity:qty,unit,minQuantity:0,purchasePrice:price,priceUnit,ean:raw.ean||'',category:raw.category||''});
      await recordMovement({type:'delivery',inventoryId:item.id,inventoryName:item.name,delta:qty,unit, before:0,after:item.quantity,sourceId:delivery.id,reason:'delivery'});
    } else {
      throw new Error('Niezgodna jednostka dla produktu: '+name);
    }
    if(price!=null) await put('priceHistory',{id:uid('price_'),inventoryId:item.id,inventoryName:item.name,price,priceUnit,at:delivery.at,source:'delivery',sourceId:delivery.id});
    if(raw.lot||raw.expiryAt) await put('lots',{id:uid('lot_'),inventoryId:item.id,inventoryName:item.name,lot:String(raw.lot||''),expiryAt:raw.expiryAt?Number(raw.expiryAt):null,quantity:qty,unit,deliveryId:delivery.id,at:delivery.at});
    delivery.items.push({inventoryId:item.id,name:item.name,quantity:qty,unit,purchasePrice:price,priceUnit,lot:raw.lot||'',expiryAt:raw.expiryAt||null});
  }
  await put('deliveries',delivery);
  return delivery;
}

export async function adjustStockPro(inventoryId, delta, reason='manual', note='') {
  await loadInventory();
  const item=listInventory().find(x=>x.id===inventoryId); if(!item) throw new Error('Produkt nie istnieje.');
  const before=num(item.quantity), updated=await adjustInventory(inventoryId,num(delta),reason);
  await recordMovement({type:'adjustment',inventoryId,inventoryName:item.name,delta:updated.quantity-before,unit:item.unit,before,after:updated.quantity,reason,note});
  return updated;
}

export async function recordWaste(inventoryId, amount, reason='inne', note='') {
  await loadInventory();
  const item=listInventory().find(x=>x.id===inventoryId); if(!item) throw new Error('Produkt nie istnieje.');
  const qty=num(amount); if(!(qty>0)) throw new Error('Podaj ilość straty.');
  const before=num(item.quantity), updated=await adjustInventory(inventoryId,-qty,'waste');
  const actual=before-updated.quantity;
  const row={id:uid('waste_'),inventoryId,inventoryName:item.name,amount:actual,unit:item.unit,reason,note,at:now()};
  await db.tx(['waste','stockMovements'],t=>{
    t.put('waste',row);
    t.put('stockMovements',{id:uid('mov_'),at:row.at,type:'waste',inventoryId,inventoryName:item.name,delta:-actual,unit:item.unit,before,after:updated.quantity,sourceId:row.id,reason,note});
  });
  return row;
}

export async function startStocktake(note='') {
  await loadInventory();
  const items=listInventory().map(x=>({inventoryId:x.id,name:x.name,systemQuantity:num(x.quantity),countedQuantity:num(x.quantity),unit:x.unit,difference:0}));
  return put('stocktakes',{id:uid('take_'),status:'open',note,createdAt:now(),updatedAt:now(),items});
}
export async function updateStocktake(id, inventoryId, countedQuantity) {
  const take=await db.get('stocktakes',id); if(!take) throw new Error('Inwentaryzacja nie istnieje.');
  const row=take.items.find(x=>x.inventoryId===inventoryId); if(!row) throw new Error('Produkt nie należy do spisu.');
  row.countedQuantity=num(countedQuantity); row.difference=row.countedQuantity-row.systemQuantity; take.updatedAt=now();
  return put('stocktakes',take);
}
export async function finalizeStocktake(id) {
  await loadInventory();
  const take=await db.get('stocktakes',id); if(!take) throw new Error('Inwentaryzacja nie istnieje.');
  if(take.status==='closed') return take;
  const at=now();
  await db.tx(['stocktakes','inventory','inventoryLog','stockMovements'],t=>{
    for(const row of take.items){
      if(!row.difference) continue;
      const item=listInventory().find(x=>x.id===row.inventoryId); if(!item) continue;
      const before=num(item.quantity), after=Math.max(0,num(row.countedQuantity));
      t.put('inventory',{...item,quantity:after,updatedAt:at});
      t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:item.id,type:'stocktake',delta:after-before,before,after,at});
      t.put('stockMovements',{id:uid('mov_'),at,type:'stocktake',inventoryId:item.id,inventoryName:item.name,delta:after-before,unit:item.unit,before,after,sourceId:take.id,reason:'inwentaryzacja'});
    }
    t.put('stocktakes',{...take,status:'closed',closedAt:at,updatedAt:at});
  });
  await reloadInventory();
  return {...take,status:'closed',closedAt:at,updatedAt:at};
}

export async function createProductionBatch(data) {
  const row={id:data.id||uid('prod_'),productName:String(data.productName||'').trim(),quantity:num(data.quantity),unit:data.unit||'g',recipeId:data.recipeId||null,recipeName:data.recipeName||'',yieldPercent:data.yieldPercent==null?100:num(data.yieldPercent),at:data.at||now(),expiryAt:data.expiryAt?Number(data.expiryAt):null,notes:data.notes||'',status:'planned',createdAt:now()};
  if(!row.productName||!(row.quantity>0)) throw new Error('Podaj półprodukt i ilość.');
  return put('productionBatches',row);
}
export async function completeProductionBatch(id) {
  const row=await db.get('productionBatches',id); if(!row) throw new Error('Produkcja nie istnieje.');
  if(row.status==='completed') return row;
  await loadInventory();
  if(row.recipeId){ const recipe=getRecipe(row.recipeId); if(recipe) await consumeRecipeIngredients(recipe, row.factor || 1); }
  const existing=findInventoryMatch({name:row.productName})?.item;
  let item;
  if(existing&&unitCompatible(existing.unit,row.unit)){
    item=await adjustInventory(existing.id,unitFromBase(unitToBase(row.quantity,row.unit),existing.unit),'production');
  } else if(!existing){
    item=await saveInventoryItem({name:row.productName,quantity:row.quantity,unit:row.unit,minQuantity:0,purchasePrice:null,priceUnit:row.unit});
  } else throw new Error('Niezgodna jednostka półproduktu.');
  row.status='completed'; row.completedAt=now(); row.inventoryId=item.id;
  await db.tx(['productionBatches','stockMovements'],t=>{
    t.put('productionBatches',row);
    t.put('stockMovements',{id:uid('mov_'),at:now(),type:'production',inventoryId:item.id,inventoryName:item.name,delta:row.quantity,unit:row.unit,before:null,after:item.quantity,sourceId:row.id,reason:'produkcja'});
  });
  return row;
}

export async function planRecipe(recipe, factor=1) {
  await loadInventory();
  const lines=[];
  for(const ing of (recipe?.sections||[]).flatMap(s=>s.ingredients||[])){
    if(!ing?.name||ing.amount==null||ing.unit==='%') continue;
    const required=num(ing.amount)*num(factor,1), stock=findInventoryMatch(ing)?.item;
    const available=stock&&unitCompatible(stock.unit,ing.unit)?unitFromBase(unitToBase(stock.quantity,stock.unit),ing.unit):0;
    lines.push({name:ing.name,required,unit:ing.unit,available,missing:Math.max(0,required-available),ean:ing.ean||''});
  }
  return lines;
}

export async function createPlan(recipes) {
  const plan=[]; for(const r of recipes||[]) plan.push({recipeId:r.recipe?.id||r.id,recipeName:r.recipe?.name||r.name,factor:num(r.factor,1),lines:await planRecipe(r.recipe||r,num(r.factor,1))});
  const missing=plan.flatMap(x=>x.lines.filter(l=>l.missing>0).map(l=>({...l,recipeId:x.recipeId,recipeName:x.recipeName})));
  return {plan,missing};
}

export async function analyticsSummary() {
  await loadInventory();
  const inv=listInventory();
  const [deliveries,waste,movements,prices,takes,orders]=await Promise.all([all('deliveries'),all('waste'),all('stockMovements'),all('priceHistory'),all('stocktakes'),all('purchaseOrders')]);
  const base={'g':1,'kg':1000,'ml':1,'l':1000,'szt':1,'opak':1};
  const stockValue=inv.reduce((s,x)=>{if(x.purchasePrice==null)return s;const factor=(base[x.unit]||1)/(base[x.priceUnit]||1);return s+(num(x.quantity)*factor*num(x.purchasePrice));},0);
  const wasteValue=waste.reduce((s,x)=>{const i=inv.find(y=>y.id===x.inventoryId);return s+(i&&i.purchasePrice!=null?num(x.amount)*(base[x.unit]||1)/(base[i.priceUnit]||1)*num(i.purchasePrice):0)},0);
  const byType={}; movements.forEach(m=>byType[m.type]=(byType[m.type]||0)+Math.abs(num(m.delta)));
  const latestPrices={}; prices.forEach(p=>{if(!latestPrices[p.inventoryId])latestPrices[p.inventoryId]=p});
  const priceChanges=Object.values(latestPrices).map(p=>{const old=prices.filter(x=>x.inventoryId===p.inventoryId).sort((a,b)=>a.at-b.at)[0];return {...p,firstPrice:old?.price||p.price,change:p.price-(old?.price||p.price)}});
  return {products:inv.length,low:inv.filter(x=>num(x.quantity)<=num(x.minQuantity)&&num(x.minQuantity)>0).length,stockValue,wasteValue,deliveries:deliveries.length,waste:waste.length,movements:movements.length,stocktakes:takes.length,orders:orders.length,byType,priceChanges};
}
