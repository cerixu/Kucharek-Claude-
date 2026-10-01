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