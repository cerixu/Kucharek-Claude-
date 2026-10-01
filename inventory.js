import { db } from './db.js';
import { uid, norm } from './util.js';
let items = []; let loaded = false; const listeners = new Set();
export const subscribeInventory = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => { try { fn(); } catch (_) {} });
export async function loadInventory() { if (!loaded) { items = (await db.getAll('inventory')).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pl')); loaded=true; } return items; }
export const listInventory = () => items.slice();
export function stockState(item) { const qty=Number(item.quantity||0), min=Number(item.minQuantity||0); if(qty<=0)return 'empty'; if(min>0&&qty<=min)return 'low'; return 'ok'; }
export async function saveInventoryItem(data) { const now=Date.now(); const item={id:data.id||uid('stock_'),name:String(data.name||'').trim(),quantity:Number(data.quantity||0),unit:data.unit||'g',minQuantity:Number(data.minQuantity||0),purchasePrice:data.purchasePrice==null||data.purchasePrice===''?null:Number(data.purchasePrice),priceUnit:data.priceUnit||'kg',ean:String(data.ean||'').trim(),category:String(data.category||'').trim(),updatedAt:now,createdAt:data.createdAt||now}; if(!item.name)throw new Error('Podaj nazwę produktu.'); await db.put('inventory',item); const i=items.findIndex(x=>x.id===item.id); if(i>=0)items[i]=item;else items.push(item);items.sort((a,b)=>a.name.localeCompare(b.name,'pl'));emit();return item; }
export async function adjustInventory(id,delta,reason='manual'){const item=items.find(x=>x.id===id);if(!item)return null;const before=Number(item.quantity||0),after=Math.max(0,before+Number(delta||0)),now=Date.now(),next={...item,quantity:after,updatedAt:now};await db.tx(['inventory','inventoryLog'],t=>{t.put('inventory',next);t.put('inventoryLog',{id:uid('stocklog_'),ingredientId:id,type:reason,delta:after-before,before,after,at:now});});Object.assign(item,next);emit();return item;}
export async function removeInventoryItem(id){await db.delete('inventory',id);items=items.filter(x=>x.id!==id);emit();}
export function findInventoryByName(name){const n=norm(name);return items.find(x=>norm(x.name)===n)||null;}

const UNIT_TO_BASE = { g: 1, kg: 1000, ml: 1, l: 1000, szt: 1, opak: 1 };
const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase().replace(/\.$/, '');
const compatibleUnits = (a, b) => {
  if (a === b) return true;
  return (a in UNIT_TO_BASE) && (b in UNIT_TO_BASE) && ((a === 'g' || a === 'kg') && (b === 'g' || b === 'kg') || (a === 'ml' || a === 'l') && (b === 'ml' || b === 'l'));
};
const toBase = (value, unit) => Number(value || 0) * (UNIT_TO_BASE[unit] || 1);

export async function consumeRecipeIngredients(recipe, factor = 1) {
  await loadInventory();
  const shortages = [];
  const usedByItem = new Map();
  const remainingByItem = new Map();

  for (const ing of (recipe?.sections || []).flatMap((s) => s.ingredients || [])) {
    if (!ing?.name || ing.amount == null || ing.unit === '%') continue;
    const required = Number(ing.amount) * Number(factor || 1);
    if (!(required > 0)) continue;

    const item = findInventoryByName(ing.name);
    const itemUnit = normalizeUnit(item?.unit);
    const ingredientUnit = normalizeUnit(ing.unit);
    if (!item || !compatibleUnits(itemUnit, ingredientUnit)) {
      shortages.push({ name: ing.name, amount: required, unit: ing.unit, missing: required });
      continue;
    }

    if (!remainingByItem.has(item.id)) {
      remainingByItem.set(item.id, toBase(item.quantity, itemUnit));
    }
    const remainingBase = remainingByItem.get(item.id);
    const requiredBase = toBase(required, ingredientUnit);
    const usedBase = Math.min(requiredBase, remainingBase);
    const missingBase = requiredBase - usedBase;

    remainingByItem.set(item.id, Math.max(0, remainingBase - usedBase));
    usedByItem.set(item.id, (usedByItem.get(item.id) || 0) + usedBase);

    if (missingBase > 0) {
      shortages.push({
        name: ing.name,
        amount: required,
        unit: ing.unit,
        missing: missingBase / UNIT_TO_BASE[ingredientUnit],
      });
    }
  }

  if (!usedByItem.size) return { changes: [], shortages };

  const now = Date.now();
  const next = [...usedByItem.entries()].map(([id, usedBase]) => {
    const item = items.find((x) => x.id === id);
    const itemUnit = normalizeUnit(item.unit);
    return {
      ...item,
      quantity: Math.max(0, Number(item.quantity || 0) - usedBase / UNIT_TO_BASE[itemUnit]),
      updatedAt: now,
    };
  });

  await db.tx(['inventory', 'inventoryLog'], (t) => {
    next.forEach((item) => {
      const before = Number(items.find((x) => x.id === item.id)?.quantity || 0);
      t.put('inventory', item);
      t.put('inventoryLog', {
        id: uid('stocklog_'),
        ingredientId: item.id,
        type: 'recipe',
        recipeId: recipe.id,
        recipeName: recipe.name,
        delta: item.quantity - before,
        before,
        after: item.quantity,
        at: now,
      });
    });
  });

  next.forEach((item) => {
    const i = items.findIndex((x) => x.id === item.id);
    if (i >= 0) items[i] = item;
  });
  emit();
  return { changes: next, shortages };
}


export const unitCompatible = (a, b) => compatibleUnits(normalizeUnit(a), normalizeUnit(b));
export const unitToBase = (value, unit) => toBase(value, normalizeUnit(unit));
export const unitFromBase = (value, unit) => Number(value || 0) / (UNIT_TO_BASE[normalizeUnit(unit)] || 1);

export async function receiveStock(name, amount, unit = 'szt', meta = {}) {
  await loadInventory();
  const qty = Number(amount);
  if (!name || !(qty > 0)) return { changed: false, reason: 'invalid' };
  const existing = findInventoryByName(name);
  if (existing && compatibleUnits(normalizeUnit(existing.unit), normalizeUnit(unit))) {
    const delta = unitFromBase(unitToBase(qty, unit), existing.unit);
    const updated = await adjustInventory(existing.id, delta, meta.reason || 'shopping');
    return { changed: true, item: updated, delta, created: false };
  }
  if (existing) return { changed: false, reason: 'unit-mismatch', item: existing };
  const created = await saveInventoryItem({
    name, quantity: qty, unit,
    minQuantity: 0, purchasePrice: null, priceUnit: unit,
    ean: meta.ean || '', category: meta.category || ''
  });
  return { changed: true, item: created, delta: qty, created: true };
}
