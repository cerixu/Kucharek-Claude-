import { h, icon, screen, button, iconBtn, openSheet, toast, field, textInput, selectEl, emptyState } from './ui.js';
import { loadInventory, listInventory, subscribeInventory } from './inventory.js';
import { listSuppliers, addSupplier, createPurchaseOrder, listPurchaseOrders, receiveDelivery, listDeliveries, recordWaste, startStocktake, updateStocktake, finalizeStocktake, createProductionBatch, completeProductionBatch, planRecipe, analyticsSummary, adjustStockPro } from './pro.js';
import { listRecipes } from './recipes.js';
import { scaleBatch, productionYield, lossPercent, inventoryCoverage } from './pro-calculators.js';

const units=[['g','g'],['kg','kg'],['ml','ml'],['l','l'],['szt','szt'],['opak','opak']];
const fmt=(n)=>Number.isFinite(Number(n))?Number(n).toLocaleString('pl-PL',{maximumFractionDigits:2}):'0';
const date=(v)=>v?new Date(v).toLocaleDateString('pl-PL'):'';

export function proView(){
  const s=screen({title:'Kucharek PRO',right:iconBtn('refresh','Odśwież',()=>paint(),'quiet')});
  let tab='dashboard', inv=[], suppliers=[], orders=[], deliveries=[], summary=null, unsub;
  const nav=(name,label)=>button(label,{sm:true,kind:tab===name?'primary':'ghost',onClick:()=>{tab=name;paint();}});
  async function refresh(){await loadInventory();[inv,suppliers,orders,deliveries,summary]=await Promise.all([Promise.resolve(listInventory()),listSuppliers(),listPurchaseOrders(),listDeliveries(),analyticsSummary()]);}
  async function paint(){
    try{await refresh();}catch(e){toast(e.message||'Nie udało się wczytać PRO',{type:'error'});return;}
    const head=h('div',{class:'pro-nav'},nav('dashboard','Dashboard'),nav('delivery','Dostawy'),nav('orders','Zamówienia'),nav('production','Produkcja'),nav('planning','Planowanie'),nav('calculators','Kalkulatory'),nav('analytics','Analityka'));
    s.content.replaceChildren(head,tab==='dashboard'?dashboard():tab==='delivery'?delivery():tab==='orders'?ordersView():tab==='production'?production():tab==='planning'?planning():tab==='calculators'?calculators():analytics());
  }
  function dashboard(){
    const cards=[['Produkty',summary.products],['Niskie stany',summary.low],['Wartość magazynu',fmt(summary.stockValue)+' zł'],['Straty',fmt(summary.wasteValue)+' zł'],['Dostawy',summary.deliveries],['Zamówienia',summary.orders],['Ruchy',summary.movements],['Inwentaryzacje',summary.stocktakes]].map(([k,v])=>h('div',{class:'result'},h('span',{class:'result-k'},k),h('strong',{class:'result-v'},String(v))));
    return h('div',{class:'results'},h('div',{class:'results-grid'},...cards),h('div',{class:'card'},h('h3',null,'Szybkie operacje'),h('div',{class:'row wrap'},button('➕ Dostawa',{kind:'primary',onClick:()=>{tab='delivery';paint();}}),button('🗑️ Strata',{onClick:()=>wasteSheet()}),button('📋 Inwentaryzacja',{onClick:()=>stocktakeSheet()}),button('⚖️ Korekta',{onClick:()=>adjustSheet()}))),h('div',{class:'card'},h('h3',null,'Magazyn PRO'),h('p',{class:'muted'},'Dostawy, ceny zakupu, partie, straty, inwentaryzacja, zakupy, produkcja i analityka w jednym miejscu.')));
  }
  function delivery(){return h('div',{class:'stack'},h('div',{class:'row between'},h('div',null,h('h3',null,'Dostawy'),h('p',{class:'muted'},String(deliveries.length)+' przyjętych dostaw')),button('Nowa dostawa',{kind:'primary',icon:'plus',onClick:()=>deliverySheet()})),deliveries.length?h('div',{class:'stack'},...deliveries.slice(0,20).map(d=>h('div',{class:'card'},h('strong',null,d.supplierName||'Bez dostawcy'),h('p',{class:'muted'},date(d.at)+' · '+(d.documentNo||'bez numeru dokumentu')+' · '+(d.items?.length||0)+' pozycji')))):emptyState('📦','Brak dostaw','Przyjmij pierwszą dostawę do magazynu.'));}
  function ordersView(){
    const header=h('div',{class:'row between'},
      h('div',null,
        h('h3',null,'Zamówienia'),
        h('p',{class:'muted'},String(orders.length)+' zamówień')),
      h('div',{class:'row'},
        button('Dostawca',{sm:true,onClick:()=>supplierSheet()}),
        button('Nowe zamówienie',{kind:'primary',icon:'plus',onClick:()=>orderSheet()})));
    const list=orders.length
      ? h('div',{class:'stack'},...orders.slice(0,20).map(o=>h('div',{class:'card'},
          h('div',{class:'row between'},
            h('strong',null,o.supplierName||'Bez dostawcy'),
            h('span',{class:'tag'},o.status)),
          h('p',{class:'muted'},date(o.createdAt)+' · '+(o.items?.length||0)+' pozycji'))))
      : emptyState('🛒','Brak zamówień','Zbuduj pierwsze zamówienie do dostawcy.');
    return h('div',{class:'stack'},header,list);
  }
  function production(){return h('div',{class:'stack'},h('div',{class:'row between'},h('div',null,h('h3',null,'Produkcja półproduktów'),h('p',{class:'muted'},'Twórz półprodukty i zwiększaj ich stan w Magazynie.')),button('Nowa produkcja',{kind:'primary',icon:'plus',onClick:()=>productionSheet()})),h('div',{class:'card'},h('strong',null,'Przykład'),h('p',{class:'muted'},'Sos pomidorowy 7,5 kg → przyjęcie do Magazynu jako półprodukt.')));}
  function planning() {
    const recipes = listRecipes().slice(0, 30);
    const cards = recipes.map((r) => h('div', { class: 'card' },
      h('div', { class: 'row between' },
        h('strong', null, r.name),
        button('Sprawdź braki', {
          sm: true,
          onClick: async () => {
            try {
              const lines = await planRecipe(r, 1);
              const miss = lines.filter((x) => x.missing > 0);
              toast(
                miss.length
                  ? 'Braki: ' + miss.map((x) => x.name + ' ' + fmt(x.missing) + ' ' + x.unit).join(', ')
                  : 'Komplet składników na 1×',
                { type: miss.length ? 'error' : 'success' }
              );
            } catch (e) {
              toast(e?.message || 'Nie udało się sprawdzić braków', { type: 'error' });
            }
          }
        })
      )
    ));
    return h(
      'div',
      { class: 'stack' },
      h('div', null,
        h('h3', null, 'Planowanie produkcji'),
        h('p', { class: 'muted' }, 'Sprawdź zapotrzebowanie receptury względem aktualnego Magazynu.')
      ),
      recipes.length
        ? h('div', { class: 'stack' }, ...cards)
        : emptyState('📐', 'Brak receptur', 'Dodaj recepturę, aby planować produkcję.')
    );
  }
  function calculators() {
    let input = '10', output = '7.5', target = '15';
    const yieldCard = () => {
      const i = Number(input), o = Number(output), t = Number(target);
      const efficiency = i > 0 ? (o / i) * 100 : 0;
      const loss = i > 0 ? Math.max(0, ((i - o) / i) * 100) : 0;
      const sourceForTarget = o > 0 ? (i * t) / o : 0;
      return h('div', { class: 'card' },
        h('h3', null, 'Wydajność i skala produkcji'),
        h('div', { class: 'grid-2' },
          textInput({ type: 'number', label: 'Surowiec', value: input, onInput: (v) => { input = v; paint(); } }),
          textInput({ type: 'number', label: 'Wynik', value: output, onInput: (v) => { output = v; paint(); } })
        ),
        textInput({ type: 'number', label: 'Docelowy wynik', value: target, onInput: (v) => { target = v; paint(); } }),
        h('div', { class: 'results-grid' },
          h('div', { class: 'result' },
            h('span', { class: 'result-k' }, 'Wydajność'),
            h('strong', { class: 'result-v' }, fmt(efficiency) + '%')
          ),
          h('div', { class: 'result' },
            h('span', { class: 'result-k' }, 'Strata'),
            h('strong', { class: 'result-v' }, fmt(loss) + '%')
          ),
          h('div', { class: 'result' },
            h('span', { class: 'result-k' }, 'Surowiec na cel'),
            h('strong', { class: 'result-v' }, fmt(sourceForTarget))
          )
        )
      );
    };
    return h('div', { class: 'stack' },
      h('div', null,
        h('h3', null, 'Kalkulatory PRO'),
        h('p', { class: 'muted' }, 'Wydajność, straty, skala produkcji i pokrycie magazynowe.')
      ),
      yieldCard(),
      h('div', { class: 'card' },
        h('h3', null, 'Pokrycie magazynu'),
        ...inv.slice(0, 12).map((x) =>
          h('div', { class: 'row between' },
            h('span', null, x.name),
            h('span', { class: 'muted' }, fmt(x.quantity) + ' ' + x.unit)
          )
        )
      )
    );
  }
  function analytics() {
    const p = summary.priceChanges.slice(0, 12);
    const stats = h('div', { class: 'results-grid' },
      h('div', { class: 'result' },
        h('span', { class: 'result-k' }, 'Ruchy'),
        h('strong', { class: 'result-v' }, summary.movements)
      ),
      h('div', { class: 'result' },
        h('span', { class: 'result-k' }, 'Straty'),
        h('strong', { class: 'result-v' }, summary.waste)
      ),
      h('div', { class: 'result' },
        h('span', { class: 'result-k' }, 'Dostawy'),
        h('strong', { class: 'result-v' }, summary.deliveries)
      ),
      h('div', { class: 'result' },
        h('span', { class: 'result-k' }, 'Zamówienia'),
        h('strong', { class: 'result-v' }, summary.orders)
      )
    );
    const history = p.length
      ? h('div', { class: 'stack' },
        ...p.map((x) => h('div', { class: 'row between' },
          h('span', null, x.inventoryName),
          h('span', { class: x.change > 0 ? 'warn' : '' },
            fmt(x.price) + ' zł/' + x.priceUnit +
            (x.change ? ' · ' + (x.change > 0 ? '+' : '') + fmt(x.change) : '')
          )
        ))
      )
      : h('p', { class: 'muted' }, 'Brak danych cenowych.');
    return h('div', { class: 'stack' },
      stats,
      h('div', { class: 'card' },
        h('h3', null, 'Historia cen'),
        history
      )
    );
  }
  function supplierSheet(){
    let name='',contact='',phone='',email='',notes='';
    const form=h('div',{class:'stack'},
      textInput({label:'Nazwa dostawcy',onInput:v=>name=v}),
      textInput({label:'Kontakt',onInput:v=>contact=v}),
      textInput({label:'Telefon',onInput:v=>phone=v,inputmode:'tel'}),
      textInput({label:'E-mail',onInput:v=>email=v,type:'email',inputmode:'email'}),
      textInput({label:'Notatki',onInput:v=>notes=v})
    );
    openSheet({title:'Nowy dostawca',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await addSupplier({name,contact,phone,email,notes});toast('Dostawca zapisany');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać dostawcy',{type:'error'});return false;}
      }}
    ]});
  }

  function supplierSheet(){
    let name='',contact='',phone='',email='',notes='';
    const form=h('div',{class:'stack'},
      textInput({label:'Nazwa dostawcy',onInput:v=>name=v}),
      textInput({label:'Kontakt',onInput:v=>contact=v}),
      textInput({label:'Telefon',onInput:v=>phone=v,inputmode:'tel'}),
      textInput({label:'E-mail',onInput:v=>email=v,type:'email',inputmode:'email'}),
      textInput({label:'Notatki',onInput:v=>notes=v})
    );
    openSheet({title:'Nowy dostawca',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await addSupplier({name,contact,phone,email,notes});toast('Dostawca zapisany');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać dostawcy',{type:'error'});return false;}
      }}
    ]});
  }

  function supplierSheet(){
    let name='',contact='',phone='',email='',notes='';
    const form=h('div',{class:'stack'},
      textInput({label:'Nazwa dostawcy',onInput:v=>name=v}),
      textInput({label:'Kontakt',onInput:v=>contact=v}),
      textInput({label:'Telefon',onInput:v=>phone=v,inputmode:'tel'}),
      textInput({label:'E-mail',onInput:v=>email=v,type:'email',inputmode:'email'}),
      textInput({label:'Notatki',onInput:v=>notes=v})
    );
    openSheet({title:'Nowy dostawca',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await addSupplier({name,contact,phone,email,notes});toast('Dostawca zapisany');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać dostawcy',{type:'error'});return false;}
      }}
    ]});
  }

  function supplierSheet(){
    let name='',contact='',phone='',email='',notes='';
    const form=h('div',{class:'stack'},
      textInput({label:'Nazwa dostawcy',onInput:v=>name=v}),
      textInput({label:'Kontakt',onInput:v=>contact=v}),
      textInput({label:'Telefon',onInput:v=>phone=v,inputmode:'tel'}),
      textInput({label:'E-mail',onInput:v=>email=v,type:'email',inputmode:'email'}),
      textInput({label:'Notatki',onInput:v=>notes=v})
    );
    openSheet({title:'Nowy dostawca',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await addSupplier({name,contact,phone,email,notes});toast('Dostawca zapisany');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać dostawcy',{type:'error'});return false;}
      }}
    ]});
  }

  function supplierSheet(){
    let name='',contact='',phone='',email='',notes='';
    const form=h('div',{class:'stack'},
      textInput({label:'Nazwa dostawcy',onInput:v=>name=v}),
      textInput({label:'Kontakt',onInput:v=>contact=v}),
      textInput({label:'Telefon',onInput:v=>phone=v,inputmode:'tel'}),
      textInput({label:'E-mail',onInput:v=>email=v,type:'email',inputmode:'email'}),
      textInput({label:'Notatki',onInput:v=>notes=v})
    );
    openSheet({title:'Nowy dostawca',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await addSupplier({name,contact,phone,email,notes});toast('Dostawca zapisany');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać dostawcy',{type:'error'});return false;}
      }}
    ]});
  }

  function deliverySheet(){
    let supplierId='',supplierName='',documentNo='';
    const item={name:'',quantity:'',unit:'kg',purchasePrice:'',priceUnit:'kg',lot:'',expiryAt:''};
    const form=h('div',{class:'stack'},
      field('Dostawca',selectEl(
        [['','Bez dostawcy'],...suppliers.map(x=>[x.id,x.name])],'',
        v=>{supplierId=v;supplierName=suppliers.find(x=>x.id===v)?.name||''}
      )),
      field('Numer dokumentu',textInput({label:'Numer dokumentu',onInput:v=>documentNo=v})),
      h('div',{class:'card'},
        h('strong',null,'Pozycja dostawy'),
        textInput({label:'Produkt',onInput:v=>item.name=v}),
        h('div',{class:'grid-2'},
          textInput({type:'number',label:'Ilość',onInput:v=>item.quantity=v}),
          selectEl(units,'kg',v=>item.unit=v)
        ),
        h('div',{class:'grid-2'},
          textInput({type:'number',label:'Cena zakupu',onInput:v=>item.purchasePrice=v}),
          selectEl(units,item.priceUnit,v=>item.priceUnit=v)
        ),
        textInput({label:'Partia',onInput:v=>item.lot=v}),
        textInput({type:'date',label:'Termin',onInput:v=>item.expiryAt=v?new Date(v).getTime():''})
      )
    );
    openSheet({title:'Nowa dostawa',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{await receiveDelivery({supplierId,supplierName,documentNo,items:[item]});toast('Dostawa przyjęta 📦');paint();}
        catch(e){toast(e?.message||'Nie udało się przyjąć dostawy',{type:'error'});return false;}
      }}
    ]});
  }

  function orderSheet(){
    let supplierId='',supplierName='',name='',amount='',unit='kg';
    const form=h('div',{class:'stack'},
      field('Dostawca',selectEl(
        [['','Bez dostawcy'],...suppliers.map(x=>[x.id,x.name])],'',
        v=>{supplierId=v;supplierName=suppliers.find(x=>x.id===v)?.name||''}
      )),
      textInput({label:'Produkt',onInput:v=>name=v}),
      h('div',{class:'grid-2'},
        textInput({type:'number',label:'Ilość',onInput:v=>amount=v}),
        selectEl(units,'kg',v=>unit=v)
      )
    );
    openSheet({title:'Nowe zamówienie',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await createPurchaseOrder({supplierId,supplierName,status:'ordered',items:[{name,amount,unit}]});toast('Zamówienie zapisane');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać zamówienia',{type:'error'});return false;}
      }}
    ]});
  }

  function wasteSheet(){
    if(!inv.length) return toast('Najpierw dodaj produkt do Magazynu',{type:'error'});
    let id=inv[0].id,amount='',reason='zepsucie';
    const form=h('div',{class:'stack'},
      field('Produkt',selectEl(inv.map(x=>[x.id,x.name]),id,v=>id=v)),
      textInput({type:'number',label:'Ilość straty',onInput:v=>amount=v}),
      field('Powód',selectEl([
        ['zepsucie','Zepsucie'],['przeterminowanie','Przeterminowanie'],
        ['uszkodzenie','Uszkodzenie'],['produkcja','Błąd produkcyjny'],['inne','Inne']
      ],reason,v=>reason=v))
    );
    openSheet({title:'Zarejestruj stratę',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await recordWaste(id,amount,reason);toast('Strata zapisana');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać straty',{type:'error'});return false;}
      }}
    ]});
  }

  function adjustSheet(){
    if(!inv.length) return toast('Magazyn jest pusty',{type:'error'});
    let id=inv[0].id,delta='',reason='manual';
    const form=h('div',{class:'stack'},
      field('Produkt',selectEl(inv.map(x=>[x.id,x.name]),id,v=>id=v)),
      textInput({type:'number',label:'Zmiana ilości (+ / -)',onInput:v=>delta=v}),
      textInput({label:'Powód',value:reason,onInput:v=>reason=v})
    );
    openSheet({title:'Korekta stanu',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{
        try{await adjustStockPro(id,delta,reason);toast('Korekta zapisana');paint();}
        catch(e){toast(e?.message||'Nie udało się zapisać korekty',{type:'error'});return false;}
      }}
    ]});
  }

  async function stocktakeSheet(){
    try{
      const take=await startStocktake();
      for(const item of take.items) await updateStocktake(take.id,item.inventoryId,item.systemQuantity);
      await finalizeStocktake(take.id);
      toast('Inwentaryzacja zamknięta.');
      paint();
    }catch(e){toast(e?.message||'Błąd inwentaryzacji',{type:'error'});}
  }

  function productionSheet(){
    let productName='',quantity='',unit='kg',recipeId='',factor=1;
    const recipes=listRecipes();
    const form=h('div',{class:'stack'},
      textInput({label:'Półprodukt',onInput:v=>productName=v}),
      textInput({type:'number',label:'Ilość',onInput:v=>quantity=v}),
      selectEl(units,unit,v=>unit=v),
      field('Receptura wejściowa',selectEl(
        [['','Bez receptury'],...recipes.map(r=>[r.id,r.name])],'',
        v=>recipeId=v
      )),
      textInput({type:'number',label:'Mnożnik receptury',value:factor,onInput:v=>factor=v})
    );
    openSheet({title:'Nowa produkcja',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz i przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{
          const row=await createProductionBatch({productName,quantity,unit,recipeId,factor});
          await completeProductionBatch(row.id);
          toast('Produkcja przyjęta do Magazynu');
          paint();
        }catch(e){toast(e?.message||'Nie udało się zapisać produkcji',{type:'error'});return false;}
      }}
    ]});
  }
  paint();
    }catch(e){toast(e?.message||'Błąd inwentaryzacji',{type:'error'});}
  }

  function productionSheet(){
    let productName='',quantity='',unit='kg',recipeId='',factor=1;
    const recipes=listRecipes();
    const form=h('div',{class:'stack'},
      textInput({label:'Półprodukt',onInput:v=>productName=v}),
      textInput({type:'number',label:'Ilość',onInput:v=>quantity=v}),
      selectEl(units,unit,v=>unit=v),
      field('Receptura wejściowa',selectEl(
        [['','Bez receptury'],...recipes.map(r=>[r.id,r.name])],'',
        v=>recipeId=v
      )),
      textInput({type:'number',label:'Mnożnik receptury',value:factor,onInput:v=>factor=v})
    );
    openSheet({title:'Nowa produkcja',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz i przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{
          const row=await createProductionBatch({productName,quantity,unit,recipeId,factor});
          await completeProductionBatch(row.id);
          toast('Produkcja przyjęta do Magazynu');
          paint();
        }catch(e){toast(e?.message||'Nie udało się zapisać produkcji',{type:'error'});return false;}
      }}
    ]});
  }
  paint();
    }catch(e){toast(e?.message||'Błąd inwentaryzacji',{type:'error'});}
  }

  function productionSheet(){
    let productName='',quantity='',unit='kg',recipeId='',factor=1;
    const recipes=listRecipes();
    const form=h('div',{class:'stack'},
      textInput({label:'Półprodukt',onInput:v=>productName=v}),
      textInput({type:'number',label:'Ilość',onInput:v=>quantity=v}),
      selectEl(units,unit,v=>unit=v),
      field('Receptura wejściowa',selectEl(
        [['','Bez receptury'],...recipes.map(r=>[r.id,r.name])],'',
        v=>recipeId=v
      )),
      textInput({type:'number',label:'Mnożnik receptury',value:factor,onInput:v=>factor=v})
    );
    openSheet({title:'Nowa produkcja',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz i przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{
          const row=await createProductionBatch({productName,quantity,unit,recipeId,factor});
          await completeProductionBatch(row.id);
          toast('Produkcja przyjęta do Magazynu');
          paint();
        }catch(e){toast(e?.message||'Nie udało się zapisać produkcji',{type:'error'});return false;}
      }}
    ]});
  }
  paint();
    }catch(e){toast(e?.message||'Błąd inwentaryzacji',{type:'error'});}
  }

  function productionSheet(){
    let productName='',quantity='',unit='kg',recipeId='',factor=1;
    const recipes=listRecipes();
    const form=h('div',{class:'stack'},
      textInput({label:'Półprodukt',onInput:v=>productName=v}),
      textInput({type:'number',label:'Ilość',onInput:v=>quantity=v}),
      selectEl(units,unit,v=>unit=v),
      field('Receptura wejściowa',selectEl(
        [['','Bez receptury'],...recipes.map(r=>[r.id,r.name])],'',
        v=>recipeId=v
      )),
      textInput({type:'number',label:'Mnożnik receptury',value:factor,onInput:v=>factor=v})
    );
    openSheet({title:'Nowa produkcja',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz i przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{
          const row=await createProductionBatch({productName,quantity,unit,recipeId,factor});
          await completeProductionBatch(row.id);
          toast('Produkcja przyjęta do Magazynu');
          paint();
        }catch(e){toast(e?.message||'Nie udało się zapisać produkcji',{type:'error'});return false;}
      }}
    ]});
  }
  paint();
    }catch(e){toast(e?.message||'Błąd inwentaryzacji',{type:'error'});}
  }

  function productionSheet(){
    let productName='',quantity='',unit='kg',recipeId='',factor=1;
    const recipes=listRecipes();
    const form=h('div',{class:'stack'},
      textInput({label:'Półprodukt',onInput:v=>productName=v}),
      textInput({type:'number',label:'Ilość',onInput:v=>quantity=v}),
      selectEl(units,unit,v=>unit=v),
      field('Receptura wejściowa',selectEl(
        [['','Bez receptury'],...recipes.map(r=>[r.id,r.name])],'',
        v=>recipeId=v
      )),
      textInput({type:'number',label:'Mnożnik receptury',value:factor,onInput:v=>factor=v})
    );
    openSheet({title:'Nowa produkcja',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz i przyjmij',kind:'primary',icon:'check',onClick:async()=>{
        try{
          const row=await createProductionBatch({productName,quantity,unit,recipeId,factor});
          await completeProductionBatch(row.id);
          toast('Produkcja przyjęta do Magazynu');
          paint();
        }catch(e){toast(e?.message||'Nie udało się zapisać produkcji',{type:'error'});return false;}
      }}
    ]});
  }
  paint();
            } catch (e) {
              toast(e?.message || 'Nie udało się przyjąć dostawy', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function orderSheet() {
    let supplierId = '', supplierName = '', name = '', amount = '', unit = 'kg';
    const supplier = selectEl(
      [['', 'Bez dostawcy'], ...suppliers.map((x) => [x.id, x.name])],
      '',
      (v) => {
        supplierId = v;
        supplierName = suppliers.find((x) => x.id === v)?.name || '';
      }
    );
    const form = h('div', { class: 'stack' },
      field('Dostawca', supplier),
      textInput({ label: 'Produkt', onInput: (v) => { name = v; } }),
      h('div', { class: 'grid-2' },
        textInput({ type: 'number', label: 'Ilość', onInput: (v) => { amount = v; } }),
        selectEl(units, unit, (v) => { unit = v; })
      )
    );

    openSheet({
      title: 'Nowe zamówienie',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Zapisz',
          kind: 'primary',
          onClick: async () => {
            try {
              await createPurchaseOrder({
                supplierId,
                supplierName,
                status: 'ordered',
                items: [{ name, amount, unit }]
              });
              toast('Zamówienie zapisane');
              paint();
            } catch (e) {
              toast(e?.message || 'Nie udało się zapisać zamówienia', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function wasteSheet() {
    if (!inv.length) return toast('Najpierw dodaj produkt do Magazynu', { type: 'error' });
    let id = inv[0].id, amount = '', reason = 'zepsucie';
    const form = h('div', { class: 'stack' },
      field('Produkt', selectEl(inv.map((x) => [x.id, x.name]), id, (v) => { id = v; })),
      textInput({ type: 'number', label: 'Ilość straty', onInput: (v) => { amount = v; } }),
      field('Powód', selectEl(
        [['zepsucie', 'Zepsucie'], ['przeterminowanie', 'Przeterminowanie'], ['uszkodzenie', 'Uszkodzenie'], ['produkcja', 'Błąd produkcyjny'], ['inne', 'Inne']],
        reason,
        (v) => { reason = v; }
      ))
    );

    openSheet({
      title: 'Zarejestruj stratę',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Zapisz',
          kind: 'primary',
          onClick: async () => {
            try {
              await recordWaste(id, amount, reason);
              toast('Strata zapisana');
              paint();
            } catch (e) {
              toast(e?.message || 'Nie udało się zapisać straty', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function adjustSheet() {
    if (!inv.length) return toast('Magazyn jest pusty', { type: 'error' });
    let id = inv[0].id, delta = '', reason = 'manual';
    const form = h('div', { class: 'stack' },
      field('Produkt', selectEl(inv.map((x) => [x.id, x.name]), id, (v) => { id = v; })),
      textInput({ type: 'number', label: 'Zmiana ilości (+ / -)', onInput: (v) => { delta = v; } }),
      textInput({ label: 'Powód', value: reason, onInput: (v) => { reason = v; } })
    );

    openSheet({
      title: 'Korekta stanu',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Zapisz',
          kind: 'primary',
          onClick: async () => {
            try {
              await adjustStockPro(id, delta, reason);
              toast('Korekta zapisana');
              paint();
            } catch (e) {
              toast(e?.message || 'Nie udało się zapisać korekty', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function stocktakeSheet() {
    startStocktake()
      .then(async (take) => {
        for (const item of take.items) {
          await updateStocktake(take.id, item.inventoryId, item.systemQuantity);
        }
        await finalizeStocktake(take.id);
        toast('Inwentaryzacja zamknięta.');
        paint();
      })
      .catch((e) => toast(e?.message || 'Błąd inwentaryzacji', { type: 'error' }));
  }

  function productionSheet() {
    let productName = '', quantity = '', unit = 'kg', recipeId = '', factor = 1;
    const recipes = listRecipes();
    const form = h('div', { class: 'stack' },
      textInput({ label: 'Półprodukt', onInput: (v) => { productName = v; } }),
      textInput({ type: 'number', label: 'Ilość', onInput: (v) => { quantity = v; } }),
      selectEl(units, unit, (v) => { unit = v; }),
      field('Receptura wejściowa', selectEl(
        [['', 'Bez receptury'], ...recipes.map((r) => [r.id, r.name])],
        '',
        (v) => { recipeId = v; }
      )),
      textInput({
        type: 'number',
        label: 'Mnożnik receptury',
        value: factor,
        onInput: (v) => { factor = v; }
      })
    );

    openSheet({
      title: 'Nowa produkcja',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Zapisz i przyjmij',
          kind: 'primary',
          onClick: async () => {
            try {
              const row = await createProductionBatch({ productName, quantity, unit, recipeId, factor });
              await completeProductionBatch(row.id);
              toast('Produkcja przyjęta do Magazynu');
              paint();
            } catch (e) {
              toast(e?.message || 'Nie udało się zapisać produkcji', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  paint();
  unsub=subscribeInventory(()=>{if(tab==='dashboard'||tab==='analytics')paint();});
  return {el:s.el,destroy:()=>unsub&&unsub()};
}
