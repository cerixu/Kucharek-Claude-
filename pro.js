import { db } from './db.js';
import { uid } from './util.js';
import { loadInventory, reloadInventory, listInventory, saveInventoryItem, adjustInventory, findInventoryMatch, unitCompatible, unitToBase, unitFromBase, consumeRecipeIngredients } from './inventory.js';
import { getRecipe } from './recipes.js';

const now = () => Date.now();
const BASE_UNITS = { g:1, kg:1000, ml:1, l:1000, szt:1, opak:1 };
const costForAmount = (amount, unit, price, priceUnit) => num(amount) * (BASE_UNITS[unit] || 1) / (BASE_UNITS[priceUnit] || 1) * num(price);
const weekBounds = (at = now()) => { const d = new Date(at); const day = d.getDay() || 7; d.setHours(0,0,0,0); const end = new Date(d); end.setDate(d.getDate() + (7-day)); const start = new Date(d); start.setDate(d.getDate() - (day-1)); return {start:start.getTime(), end:end.getTime()+86400000-1}; };
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
  const delivery={id:data.id||uid('del_'),supplierId:data.supplierId||null,supplierName:data.supplierName||'',documentNo:data.documentNo||'',at:data.at||now(),notes:data.notes||'',items:[],createdAt:data.createdAt||now(),purchaseOrderId:data.purchaseOrderId||null};
  const inventoryWrites=[], movementWrites=[], priceWrites=[], lotWrites=[];
  const current=new Map(listInventory().map(x=>[x.id,{...x}]));
  const order=data.purchaseOrderId ? await db.get('purchaseOrders',data.purchaseOrderId) : null;
  for(const raw of (data.items||[])){
    const name=String(raw.name||'').trim(), qty=num(raw.quantity);
    if(!name||!(qty>0)) continue;
    const unit=raw.unit||'szt', price=raw.purchasePrice===''||raw.purchasePrice==null?null:num(raw.purchasePrice);
    const priceUnit=raw.priceUnit||unit;
    const match=findInventoryMatch({name,ean:raw.ean});
    let item=match?.item ? current.get(match.item.id) : null, before=0;
    if(item && unitCompatible(item.unit,unit)){
      before=num(item.quantity);
      const delta=unitFromBase(unitToBase(qty,unit),item.unit);
      item={...item,quantity:Math.max(0,before+delta),updatedAt:delivery.at};
    } else if(!item){
      item={id:uid('stock_'),name,quantity:qty,unit,minQuantity:0,purchasePrice:price,priceUnit,ean:raw.ean||'',aliases:[],category:raw.category||'',createdAt:delivery.at,updatedAt:delivery.at};
      before=0;
    } else throw new Error('Niezgodna jednostka dla produktu: '+name);
    if(price!=null){item={...item,purchasePrice:price,priceUnit,ean:raw.ean||item.ean,updatedAt:delivery.at};}
    current.set(item.id,item);
    inventoryWrites.push(item);
    const delta=item.quantity-before;
    movementWrites.push({id:uid('mov_'),at:delivery.at,type:'delivery',inventoryId:item.id,inventoryName:item.name,delta,unit:item.unit,before,after:item.quantity,sourceId:delivery.id,reason:'delivery'});
    if(price!=null) priceWrites.push({id:uid('price_'),inventoryId:item.id,inventoryName:item.name,price,priceUnit,at:delivery.at,source:'delivery',sourceId:delivery.id,supplierId:delivery.supplierId||null,documentNo:delivery.documentNo||''});
    if(raw.lot||raw.expiryAt) lotWrites.push({id:uid('lot_'),inventoryId:item.id,inventoryName:item.name,lot:String(raw.lot||''),expiryAt:raw.expiryAt?Number(raw.expiryAt):null,quantity:qty,unit,deliveryId:delivery.id,at:delivery.at});
    delivery.items.push({inventoryId:item.id,name:item.name,quantity:qty,unit,purchasePrice:price,priceUnit,lot:raw.lot||'',expiryAt:raw.expiryAt||null,purchaseOrderItemId:raw.purchaseOrderItemId||null});
  }
  if(!delivery.items.length) throw new Error('Dostawa nie zawiera poprawnych pozycji.');
  if(order){
    const updatedOrder={...order,items:(order.items||[]).map(item=>{
      const received=delivery.items.filter(x=>x.purchaseOrderItemId===item.id||(!x.purchaseOrderItemId&&String(x.name).trim()===String(item.name).trim())).reduce((s,x)=>s+num(x.quantity),0);
      return received>0?{...item,receivedAmount:num(item.receivedAmount)+received}:item;
    }),updatedAt:delivery.at};
    const total=(updatedOrder.items||[]).reduce((s,x)=>s+num(x.amount),0);
    const received=(updatedOrder.items||[]).reduce((s,x)=>s+num(x.receivedAmount),0);
    updatedOrder.status=received<=0?order.status:received+1e-9>=total?'received':'partial';
    delivery.purchaseOrderId=order.id;
    await db.tx(['inventory','inventoryLog','deliveries','lots','stockMovements','priceHistory','purchaseOrders'],t=>{
      inventoryWrites.forEach(item=>{const before=current.get(item.id)?.quantity-num(movementWrites.find(m=>m.inventoryId===item.id)?.delta||0);t.put('inventory',item);t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:item.id,type:'delivery',delta:movementWrites.find(m=>m.inventoryId===item.id)?.delta||0,before,after:item.quantity,at:delivery.at});});
      movementWrites.forEach(x=>t.put('stockMovements',x)); priceWrites.forEach(x=>t.put('priceHistory',x)); lotWrites.forEach(x=>t.put('lots',x)); t.put('deliveries',delivery); t.put('purchaseOrders',updatedOrder);
    });
  } else {
    await db.tx(['inventory','inventoryLog','deliveries','lots','stockMovements','priceHistory'],t=>{
      inventoryWrites.forEach(item=>{const mv=movementWrites.find(m=>m.inventoryId===item.id);const before=mv?.before??0;t.put('inventory',item);t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:item.id,type:'delivery',delta:mv?.delta||0,before,after:item.quantity,at:delivery.at});});
      movementWrites.forEach(x=>t.put('stockMovements',x)); priceWrites.forEach(x=>t.put('priceHistory',x)); lotWrites.forEach(x=>t.put('lots',x)); t.put('deliveries',delivery);
    });
  }
  await reloadInventory();
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
  const before=num(item.quantity), actual=Math.min(before,qty), after=before-actual, at=now();
  const price = item.purchasePrice == null ? null : num(item.purchasePrice);
  const priceUnit = item.priceUnit || item.unit;
  const costValue = price == null ? null : costForAmount(actual, item.unit, price, priceUnit);
  const row={id:uid('waste_'),inventoryId,inventoryName:item.name,amount:actual,unit:item.unit,reason,note,at,price,priceUnit,costValue};
  const next={...item,quantity:after,updatedAt:at};
  await db.tx(['inventory','inventoryLog','waste','stockMovements'],t=>{
    t.put('inventory',next);
    t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:inventoryId,type:'waste',delta:-actual,before,after,at});
    t.put('waste',row);
    t.put('stockMovements',{id:uid('mov_'),at,type:'waste',inventoryId,inventoryName:item.name,delta:-actual,unit:item.unit,before,after,sourceId:row.id,reason,note});
  });
  await reloadInventory();
  return row;
}

export async function listWaste({start=null,end=null}={}) { const rows=await all('waste'); return rows.filter(x=>(start==null||x.at>=start)&&(end==null||x.at<=end)).sort((a,b)=>b.at-a.at); }
export async function wasteReport(start=null,end=null) { if(start==null||end==null){const b=weekBounds();start=start==null?b.start:start;end=end==null?b.end:end;} const rows=await listWaste({start,end}); const byProduct=new Map(),byReason=new Map(); for(const row of rows){const cost=row.costValue==null?0:num(row.costValue);const p=byProduct.get(row.inventoryId)||{inventoryId:row.inventoryId,name:row.inventoryName,amount:0,unit:row.unit,cost:0,count:0};p.amount+=num(row.amount);p.cost+=cost;p.count++;byProduct.set(row.inventoryId,p);const reason=row.reason||'inne';const r=byReason.get(reason)||{reason,cost:0,count:0};r.cost+=cost;r.count++;byReason.set(reason,r);} const products=[...byProduct.values()].sort((a,b)=>b.cost-a.cost); const reasons=[...byReason.values()].sort((a,b)=>b.cost-a.cost); return {start,end,totalCost:rows.reduce((s,x)=>s+(x.costValue==null?0:num(x.costValue)),0),totalEntries:rows.length,products,reasons,topProduct:products[0]||null}; }
export { weekBounds };

export async function startStocktake(note='') {
  await loadInventory();
  const items=listInventory().map(x=>({inventoryId:x.id,name:x.name,systemQuantity:num(x.quantity),countedQuantity:null,unit:x.unit,difference:null}));
  return put('stocktakes',{id:uid('take_'),status:'open',note,createdAt:now(),updatedAt:now(),items});
}
export async function updateStocktake(id, inventoryId, countedQuantity) {
  const take=await db.get('stocktakes',id); if(!take) throw new Error('Inwentaryzacja nie istnieje.');
  const row=take.items.find(x=>x.inventoryId===inventoryId); if(!row) throw new Error('Produkt nie należy do spisu.');
  if (countedQuantity === '' || countedQuantity == null || !Number.isFinite(Number(countedQuantity)) || Number(countedQuantity) < 0) throw new Error('Podaj rzeczywiście policzoną ilość.');
  row.countedQuantity=num(countedQuantity); row.difference=row.countedQuantity-row.systemQuantity; take.updatedAt=now();
  return put('stocktakes',take);
}
export async function finalizeStocktake(id) {
  await loadInventory();
  const take=await db.get('stocktakes',id); if(!take) throw new Error('Inwentaryzacja nie istnieje.');
  if(take.status==='closed') return take;
  if(take.items.some(x=>x.countedQuantity==null)) throw new Error('Uzupełnij policzone ilości wszystkich pozycji.');
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
  const plannedQuantity=num(data.plannedQuantity==null?data.quantity:data.plannedQuantity);
  const row={id:data.id||uid('prod_'),productName:String(data.productName||'').trim(),quantity:num(data.quantity),plannedQuantity,unit:data.unit||'g',recipeId:data.recipeId||null,recipeName:data.recipeName||'',yieldPercent:data.yieldPercent==null?100:num(data.yieldPercent),factor:data.factor==null?1:num(data.factor),at:data.at||now(),expiryAt:data.expiryAt?Number(data.expiryAt):null,notes:data.notes||'',status:'planned',createdAt:now()};
  if(!row.productName||!(row.quantity>0)||!(row.plannedQuantity>0)) throw new Error('Podaj półprodukt i ilość.');
  return put('productionBatches',row);
}
export async function completeProductionBatch(id) {
  const row=await db.get('productionBatches',id); if(!row) throw new Error('Produkcja nie istnieje.');
  if(row.status==='completed') return row;
  await loadInventory();
  const recipe=row.recipeId?(getRecipe(row.recipeId)||await db.get('recipes',row.recipeId)):null;
  const changes=new Map(), shortages=[];
  if(recipe){
    for(const ing of (recipe.sections||[]).flatMap(s=>s.ingredients||[])){
      if(!ing?.name||ing.amount==null||ing.unit==='%') continue;
      const req=num(ing.amount)*num(row.factor||1), match=findInventoryMatch(ing), item=match?.item;
      if(!(req>0)||!item||!unitCompatible(item.unit,ing.unit)){shortages.push(ing.name);continue;}
      const delta=unitFromBase(unitToBase(req,ing.unit),item.unit);
      const used=Math.min(num(item.quantity),delta);
      if(used<delta){shortages.push(ing.name);continue;}
      changes.set(item.id,(changes.get(item.id)||0)+used);
    }
  }
  if(shortages.length) throw new Error('Brak składników do produkcji: '+[...new Set(shortages)].join(', '));
  const outputMatch=findInventoryMatch({name:row.productName})?.item;
  if(outputMatch&&!unitCompatible(outputMatch.unit,row.unit)) throw new Error('Niezgodna jednostka półproduktu.');
  const at=now(), outputDelta=outputMatch?unitFromBase(unitToBase(row.quantity,row.unit),outputMatch.unit):row.quantity;
  const output=outputMatch?{...outputMatch,quantity:num(outputMatch.quantity)+outputDelta,updatedAt:at}:{id:uid('stock_'),name:row.productName,quantity:row.quantity,unit:row.unit,minQuantity:0,purchasePrice:null,priceUnit:row.unit,ean:'',aliases:[],category:'',createdAt:at,updatedAt:at};
  const stores=['inventory','inventoryLog','productionBatches','stockMovements'];
  const inputRows=[...changes.entries()].map(([id,delta])=>{const item=listInventory().find(x=>x.id===id);return{item,delta,after:num(item.quantity)-delta};});
  const inputCost=inputRows.reduce((s,x)=>s+(x.item.purchasePrice==null?0:num(x.item.quantity?x.delta:x.delta)*num(x.item.purchasePrice)*((x.item.priceUnit===x.item.unit)?1:1)),0);
  row.status='completed'; row.completedAt=at; row.inventoryId=output.id; row.actualQuantity=row.quantity; row.yieldPercent=Math.min(100,row.quantity/row.plannedQuantity*100); row.wastePercent=Math.max(0,100-row.yieldPercent); row.inputCost=inputCost; row.outputCostPerUnit=row.quantity>0?inputCost/row.quantity:null;
  await db.tx(stores,t=>{
    inputRows.forEach(x=>{t.put('inventory',{...x.item,quantity:x.after,updatedAt:at});t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:x.item.id,type:'production',recipeId:row.recipeId,delta:-x.delta,before:x.item.quantity,after:x.after,at});t.put('stockMovements',{id:uid('mov_'),at,type:'production_input',inventoryId:x.item.id,inventoryName:x.item.name,delta:-x.delta,unit:x.item.unit,before:x.item.quantity,after:x.after,sourceId:row.id,reason:'produkcja'});});
    const before=outputMatch?num(outputMatch.quantity):0;
    t.put('inventory',output);t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:output.id,type:'production',delta:outputDelta,before,after:output.quantity,at});
    t.put('stockMovements',{id:uid('mov_'),at,type:'production_output',inventoryId:output.id,inventoryName:output.name,delta:outputDelta,unit:output.unit,before,after:output.quantity,sourceId:row.id,reason:'produkcja'});
    t.put('productionBatches',row);
  });
  await reloadInventory();
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
  const wasteValue=waste.reduce((s,x)=>s+(x.costValue==null?(()=>{const i=inv.find(y=>y.id===x.inventoryId);return i&&i.purchasePrice!=null?costForAmount(x.amount,x.unit,i.purchasePrice,i.priceUnit||x.unit):0})():num(x.costValue)),0);
  const byType={}; movements.forEach(m=>byType[m.type]=(byType[m.type]||0)+Math.abs(num(m.delta)));
  const latestPrices={}; prices.forEach(p=>{if(!latestPrices[p.inventoryId])latestPrices[p.inventoryId]=p});
  const priceChanges=Object.values(latestPrices).map(p=>{const old=prices.filter(x=>x.inventoryId===p.inventoryId).sort((a,b)=>a.at-b.at)[0];return {...p,firstPrice:old?.price||p.price,change:p.price-(old?.price||p.price)}});
  return {products:inv.length,low:inv.filter(x=>num(x.quantity)<=num(x.minQuantity)&&num(x.minQuantity)>0).length,stockValue,wasteValue,deliveries:deliveries.length,waste:waste.length,movements:movements.length,stocktakes:takes.length,orders:orders.length,byType,priceChanges};
}
