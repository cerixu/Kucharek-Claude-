import { h, screen, button, iconBtn, toast, field, textInput, selectEl, openSheet } from './ui.js';
import { navigate } from './router.js';
import { listInventory, loadInventory, subscribeInventory } from './inventory.js';
import { listSuppliers, addSupplier, createPurchaseOrder, listPurchaseOrders, receiveDelivery, listDeliveries, recordWaste, startStocktake, updateStocktake, finalizeStocktake, createProductionBatch, completeProductionBatch, planRecipe, analyticsSummary, adjustStockPro, wasteReport, salesDeplete, parseSalesCsv, importSalesCsv, reorderSuggestions, expiryAlerts, runInventoryAutopilot } from './pro.js';
import { listRecipes } from './recipes.js';

const units=[['g','g'],['kg','kg'],['ml','ml'],['l','l'],['szt','szt'],['opak','opak']];
const n=(v)=>Number(v||0);
const money=(v)=>n(v).toLocaleString('pl-PL',{maximumFractionDigits:2});

export function proView(){
 const s=screen({title:'Kucharek PRO',right:iconBtn('refresh','Odśwież',()=>render())});
 let tab='dashboard',unsub;
 const nav=(id,label)=>button(label,{sm:true,kind:tab===id?'primary':'ghost',onClick:()=>{tab=id;render();}});
 async function render(){
  const menu=h('div',{class:'pro-nav'},nav('dashboard','Dashboard'),nav('delivery','Dostawy'),nav('orders','Zamówienia'),nav('production','Produkcja'),nav('planning','Planowanie'),nav('analytics','Analityka'),nav('waste','Straty'),nav('automation','Automatyzacje'));
  s.content.replaceChildren(menu,h('p',{class:'muted'},'Ładuję dane…'));

  if(tab==='waste'){
    try{s.content.replaceChildren(menu,await wasteView());}catch(e){console.error(e);s.content.appendChild(h('p',{class:'muted'},'Nie udało się wczytać raportu strat.'));} 
    return;
  }
  if(tab==='automation'){
    try{s.content.replaceChildren(menu,await automationView());}catch(e){console.error(e);s.content.appendChild(h('p',{class:'muted'},'Nie udało się wczytać automatyzacji.'));} 
    return;
  }

  try{
    await loadInventory();
    const summary=await analyticsSummary();
    const inv=listInventory();
    const [suppliers,orders,deliveries]=await Promise.all([listSuppliers(),listPurchaseOrders(),listDeliveries()]);
    let body;
    if(tab==='dashboard') body=h('div',{class:'stack'},
      h('div',{class:'results-grid'},
        stat('Produkty',summary.products),stat('Niskie stany',summary.low),stat('Wartość',money(summary.stockValue)+' zł'),stat('Straty',money(summary.wasteValue)+' zł'),
        stat('Dostawy',summary.deliveries),stat('Zamówienia',summary.orders),stat('Ruchy',summary.movements),stat('Spisy',summary.stocktakes)),
      h('div',{class:'card'},h('h3',null,'Operacje'),button('Nowa dostawa',{kind:'primary',onClick:()=>deliverySheet(suppliers)}),button('Strata',{onClick:()=>wasteSheet(inv)}),button('Korekta',{onClick:()=>adjustSheet(inv)}),button('Inwentaryzacja',{onClick:()=>stocktake()})));
    else if(tab==='delivery') body=listBlock('Dostawy',deliveries.map(x=>x.supplierName||'Bez dostawcy'),()=>deliverySheet(suppliers),'Nowa dostawa');
    else if(tab==='orders') body=listBlock('Zamówienia',orders.map(x=>(x.supplierName||'Bez dostawcy')+' · '+x.status),()=>orderSheet(suppliers),'Nowe zamówienie');
    else if(tab==='production') body=h('div',{class:'stack'},h('h3',null,'Produkcja półproduktów'),button('Nowa produkcja',{kind:'primary',onClick:()=>productionSheet()}),h('p',{class:'muted'},'Produkcja może korzystać z receptury wejściowej i automatycznie przyjąć wynik do Magazynu.'));
    else if(tab==='planning') body=h('div',{class:'stack'},h('h3',null,'Planowanie'),...listRecipes().slice(0,30).map(r=>h('div',{class:'card'},h('div',{class:'row between'},h('strong',null,r.name),button('Sprawdź braki',{sm:true,onClick:async()=>{const x=await planRecipe(r,1);const m=x.filter(z=>z.missing>0);toast(m.length?'Braki: '+m.map(z=>z.name+' '+z.missing+' '+z.unit).join(', '):'Komplet składników');}})))));
    else body=h('div',{class:'stack'},h('h3',null,'Analityka'),stat('Ruchy',summary.movements),stat('Straty',summary.waste),stat('Dostawy',summary.deliveries),stat('Zamówienia',summary.orders),h('div',{class:'card'},h('strong',null,'Historia cen'),...summary.priceChanges.slice(0,12).map(x=>h('p',null,x.inventoryName+': '+money(x.price)+' zł/'+x.priceUnit))));
    s.content.replaceChildren(menu,body);
  }catch(e){
    console.error(e);
    s.content.replaceChildren(menu,h('div',{class:'card'},h('h3',null,'Nie udało się wczytać danych PRO'),h('p',{class:'muted'},String(e?.message||e))));
  }
 }
 const stat=(k,v)=>h('div',{class:'result'},h('span',{class:'result-k'},k),h('strong',{class:'result-v'},String(v)));
 const listBlock=(title,rows,action,label)=>h('div',{class:'stack'},h('div',{class:'row between'},h('h3',null,title),button(label,{kind:'primary',onClick:action})),...rows.map(x=>h('div',{class:'card'},x)));
 function deliverySheet(suppliers){let supplierId='',supplierName='',name='',qty='',unit='kg',price='',lot='';const form=h('div',{class:'stack'},field('Dostawca',selectEl([['','Brak'],...suppliers.map(x=>[x.id,x.name])],'',v=>{supplierId=v;supplierName=suppliers.find(x=>x.id===v)?.name||''})),textInput({label:'Produkt',onInput:v=>name=v}),textInput({type:'number',label:'Ilość',onInput:v=>qty=v}),selectEl(units,unit,v=>unit=v),textInput({type:'number',label:'Cena zakupu',onInput:v=>price=v}),textInput({label:'Partia',onInput:v=>lot=v}));openSheet({title:'Dostawa',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Przyjmij',kind:'primary',onClick:async()=>{await receiveDelivery({supplierId,supplierName,items:[{name,quantity:qty,unit,purchasePrice:price,priceUnit:unit,lot}]});toast('Dostawa przyjęta');render();}}]});}
 function orderSheet(suppliers){let supplierId='',supplierName='',name='',qty='',unit='kg';const form=h('div',{class:'stack'},field('Dostawca',selectEl([['','Brak'],...suppliers.map(x=>[x.id,x.name])],'',v=>{supplierId=v;supplierName=suppliers.find(x=>x.id===v)?.name||''})),textInput({label:'Produkt',onInput:v=>name=v}),textInput({type:'number',label:'Ilość',onInput:v=>qty=v}),selectEl(units,unit,v=>unit=v));openSheet({title:'Zamówienie',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Zapisz',kind:'primary',onClick:async()=>{await createPurchaseOrder({supplierId,supplierName,status:'ordered',items:[{name,amount:qty,unit}]});toast('Zamówienie zapisane');render();}}]});}
 function wasteSheet(inv){if(!inv.length)return toast('Magazyn jest pusty',{type:'error'});let id=inv[0].id,qty='',reason='zepsucie';const form=h('div',{class:'stack'},field('Produkt',selectEl(inv.map(x=>[x.id,x.name]),id,v=>id=v)),textInput({type:'number',label:'Ilość',onInput:v=>qty=v}),textInput({label:'Powód',value:reason,onInput:v=>reason=v}));openSheet({title:'Strata',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Zapisz',kind:'primary',onClick:async()=>{await recordWaste(id,qty,reason);toast('Strata zapisana');render();}}]});}
 async function wasteView(){ const r=await wasteReport(); const range=new Date(r.start).toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'})+'–'+new Date(r.end).toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'}); return h('div',{class:'stack'},h('div',{class:'card'},h('div',{class:'row between'},h('div',null,h('h3',null,'Raport strat'),h('p',{class:'muted'},'Bieżący tydzień · '+range)),h('strong',null,money(r.totalCost)+' zł')),h('p',{class:'muted'},r.totalEntries?'Koszt liczony według ceny z chwili wyrzucenia.':'Brak strat w tym tygodniu.')),h('div',{class:'card'},h('h3',null,'Największe straty'),r.products.length?r.products.map(x=>h('div',{class:'row between'},h('span',null,x.name+' · '+money(x.amount)+' '+x.unit),h('strong',null,money(x.cost)+' zł'))):h('p',{class:'muted'},'Brak danych.')),h('div',{class:'card'},h('h3',null,'Według powodu'),r.reasons.length?r.reasons.map(x=>h('div',{class:'row between'},h('span',null,x.reason),h('strong',null,money(x.cost)+' zł'))):h('p',{class:'muted'},'Brak danych.')); }
 async function automationView(){ const [reorders,expiring]=await Promise.all([reorderSuggestions(),expiryAlerts(3)]); return h('div',{class:'stack'},h('div',{class:'card'},h('h3',null,'Autopilot magazynu'),h('p',{class:'muted'},'Kucharek sam wykrywa braki po sprzedaży i przygotowuje zakupy. Nie musisz co chwilę przepisywać zużycia.'),button('Uruchom autopilota teraz',{kind:'primary',onClick:async()=>{const r=await runInventoryAutopilot();toast(r.enabled?(r.added?'Dodano brakujące pozycje do zakupów 📦':'Brak nowych zakupów'):'Autopilot jest wyłączony');render();}}),button('Dodaj propozycje do zakupów'+(reorders.length?' ('+reorders.length+')':''),{kind:'primary',onClick:async()=>{const {addItems}=await import('./shopping.js');await addItems(reorders.map(x=>({name:x.name,amount:x.orderQuantity,unit:x.unit})));toast(reorders.length?'Propozycje dodane do zakupów':'Brak pozycji do zamówienia');}}),h('div',{class:'stack'},...reorders.slice(0,10).map(x=>h('div',{class:'row between'},h('span',null,x.name+' · stan '+money(x.quantity)+' '+x.unit),h('strong',null,'+'+money(x.orderQuantity)+' '+x.unit)))),h('div',{class:'card'},h('h3',null,'Terminy ważności'),expiring.length?expiring.slice(0,10).map(x=>h('div',{class:'row between'},h('span',null,x.inventoryName),h('strong',null,new Date(x.expiryAt).toLocaleDateString('pl-PL')))):h('p',{class:'muted'},'Brak partii kończących się w ciągu 3 dni.')),h('div',{class:'card'},h('h3',null,'Sprzedaż'),h('p',{class:'muted'},'Najwygodniej: eksport sprzedaży z POS → import raz na zmianę. Kucharek rozbije sprzedaż na składniki receptur i odejmie je atomowo.'),button('Import CSV sprzedaży',{kind:'primary',onClick:()=>salesImportSheet()}))); }
 function salesImportSheet(){ let text=''; const form=h('div',{class:'stack'},h('p',{class:'muted'},'CSV: nazwa receptury, ilość. Obsługiwany separator , lub ;.'),textInput({label:'CSV sprzedaży',placeholder:'Pizza Margherita,12',onInput:v=>text=v})); openSheet({title:'Import sprzedaży',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Importuj',kind:'primary',onClick:async()=>{const r=await importSalesCsv(text);if(!r.ok){toast(r.missing?.length?'Nie znaleziono receptur: '+r.missing.map(x=>x.name).join(', '):'Nie udało się zaimportować',{type:'error'});return false;}toast('Sprzedaż rozliczona, magazyn zaktualizowany 📦');render();}}]}); }
 function adjustSheet(inv){if(!inv.length)return toast('Magazyn jest pusty',{type:'error'});let id=inv[0].id,delta='',reason='korekta';const form=h('div',{class:'stack'},field('Produkt',selectEl(inv.map(x=>[x.id,x.name]),id,v=>id=v)),textInput({type:'number',label:'Zmiana',onInput:v=>delta=v}),textInput({label:'Powód',onInput:v=>reason=v}));openSheet({title:'Korekta',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Zapisz',kind:'primary',onClick:async()=>{await adjustStockPro(id,delta,reason);toast('Korekta zapisana');render();}}]});}
 async function stocktake(){
  const t=await startStocktake();
  let index=0;
  const ask=async()=>{
    const row=t.items[index];
    if(!row){await finalizeStocktake(t.id);toast('Inwentaryzacja zamknięta');render();return;}
    openSheet({title:'Inwentaryzacja '+(index+1)+'/'+t.items.length,variant:'sheet',body:h('div',{class:'stack'},h('strong',null,row.name),h('p',{class:'muted'},'Stan systemowy: '+row.systemQuantity+' '+row.unit),textInput({type:'number',label:'Policzono fizycznie',onInput:v=>row._count=v})),actions:[{label:'Anuluj',kind:'ghost'},{label:index===t.items.length-1?'Zakończ':'Dalej',kind:'primary',onClick:async()=>{if(row._count==null||row._count==='')return toast('Wpisz policzoną ilość',{type:'error'});await updateStocktake(t.id,row.inventoryId,row._count);index++;await ask();}}]});
  };
  await ask();
 }
 function productionSheet(){let name='',qty='',unit='kg',recipeId='',factor=1;const rs=listRecipes();const form=h('div',{class:'stack'},textInput({label:'Półprodukt',onInput:v=>name=v}),textInput({type:'number',label:'Ilość',onInput:v=>qty=v}),selectEl(units,unit,v=>unit=v),field('Receptura wejściowa',selectEl([['','Brak'],...rs.map(x=>[x.id,x.name])],'',v=>recipeId=v)),textInput({type:'number',label:'Mnożnik',value:factor,onInput:v=>factor=v}));openSheet({title:'Produkcja',variant:'sheet',body:form,actions:[{label:'Anuluj',kind:'ghost'},{label:'Przyjmij',kind:'primary',onClick:async()=>{const row=await createProductionBatch({productName:name,quantity:qty,unit,recipeId,factor});await completeProductionBatch(row.id);toast('Produkcja przyjęta');render();}}]});}
 render();
 unsub=subscribeInventory(()=>{if(tab==='dashboard'||tab==='analytics')render();});
 return {el:s.el,destroy:()=>unsub&&unsub()};
}
