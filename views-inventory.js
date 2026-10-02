import { h, icon, screen, button, iconBtn, openSheet, confirmDialog, emptyState, toast, field, textInput, selectEl, focusPreservingPaint } from './ui.js';
import { navigate } from './router.js';
import { getSetting, setSetting } from './recipes.js';
import { openBarcodeScanner } from './barcode-scanner.js';
import { loadInventory, listInventory, saveInventoryItem, seedTestInventory, adjustInventory, removeInventoryItem, stockState, subscribeInventory, normalizeEAN, validEAN } from './inventory.js';

const UNITS=[['g','g'],['kg','kg'],['ml','ml'],['l','l'],['szt','szt'],['opak','opak']];
const fmt=n=>Number.isInteger(Number(n))?String(n):String(Number(Number(n).toFixed(3)));

export function inventoryView(){
  const search=h('input',{class:'input search-input',type:'search',placeholder:'Szukaj składnika…','aria-label':'Szukaj składnika',autocomplete:'off'});
  const s=screen({
    title:'Magazyn',
    right:h('div',{class:'row'},button('PRO',{sm:true,onClick:()=>navigate('/pro')}),iconBtn('barcode','Skanuj kod kreskowy',()=>scanProduct()),iconBtn('plus','Dodaj składnik',()=>openEditor())),
    sub:h('div',{class:'searchbox'},icon('search',20),search),
    cls:'inventory'
  });
  let q='', lowOnly=false;

  const matches=item=>{
    const text=(item.name+' '+(item.category||'')+' '+(item.ean||'')).toLocaleLowerCase();
    return (!q||text.includes(q.toLocaleLowerCase())) && (!lowOnly||stockState(item)!=='ok');
  };

  const row=item=>{
    const st=stockState(item);
    const label=st==='empty'?'BRAK':st==='low'?'MAŁO':'OK';
    return h('article',{class:'stock-row '+st},
      h('div',{class:'stock-main'},
        h('div',{class:'stock-title'},item.name),
        h('div',{class:'stock-meta'},fmt(item.quantity)+' '+item.unit+(item.minQuantity>0?' · próg '+fmt(item.minQuantity)+' '+item.unit:''))
      ),
      h('span',{class:'stock-state'},label),
      h('div',{class:'stock-actions'},
        button('−',{sm:true,onClick:()=>adjustInventory(item.id,-1)}),
        button('+',{sm:true,kind:'primary',onClick:()=>adjustInventory(item.id,1)}),
        button('Zużyj',{sm:true,onClick:()=>adjustInventory(item.id,-1,'manual-consumption')}),
        iconBtn('edit','Edytuj '+item.name,()=>openEditor(item),'quiet')
      )
    );
  };

  async function paint(){
    const all=listInventory(), filtered=all.filter(matches);
    const counts={empty:all.filter(x=>stockState(x)==='empty').length,low:all.filter(x=>stockState(x)==='low').length,ok:all.filter(x=>stockState(x)==='ok').length};
    const automation=h('div',{class:'card inventory-automation-simple'},
      h('div',{class:'row between'},h('div',null,h('strong',null,'Automatyzacja'),h('p',{class:'muted'},'Magazyn reaguje podczas gotowania i przy brakach.')),h('span',{class:'tag'},'AUTO')),
      h('label',{class:'setting-toggle'},h('span',null,h('strong',null,'Zużycie przy gotowaniu'),h('small',{class:'muted'},'Po zakończeniu przepisu odejmuje składniki automatycznie.')),h('input',{type:'checkbox',checked:getSetting('inventoryAutoConsumption')!==false,onChange:async e=>{await setSetting('inventoryAutoConsumption',e.target.checked);toast(e.target.checked?'Zużycie automatyczne włączone':'Zużycie automatyczne wyłączone');}})),
      h('label',{class:'setting-toggle'},h('span',null,h('strong',null,'Sugestie zakupów'),h('small',{class:'muted'},'Braki i niskie stany trafiają do zakupów.')),h('input',{type:'checkbox',checked:getSetting('inventoryAutoShopping')!==false,onChange:async e=>{await setSetting('inventoryAutoShopping',e.target.checked);toast(e.target.checked?'Sugestie zakupów włączone':'Sugestie zakupów wyłączone');}})),
      h('div',{class:'row wrap'},button('Lista zakupów',{sm:true,onClick:()=>navigate('/shopping')}),button('Zaawansowane',{sm:true,kind:'ghost',onClick:()=>navigate('/pro?tab=automation')}))
    );

    const summary=h('div',{class:'inventory-summary-simple'},
      h('button',{class:'inventory-count empty '+(lowOnly?'active':''),onClick:()=>{lowOnly=!lowOnly;paint();}},h('strong',null,String(counts.empty)),h('span',null,'Brak')),
      h('button',{class:'inventory-count low '+(lowOnly?'active':''),onClick:()=>{lowOnly=!lowOnly;paint();}},h('strong',null,String(counts.low)),h('span',null,'Mało')),
      h('button',{class:'inventory-count ok',onClick:()=>{lowOnly=false;paint();}},h('strong',null,String(counts.ok)),h('span',null,'OK'))
    );

    const content=[summary,automation];
    if(!filtered.length) content.push(emptyState('📦',all.length?'Nic nie znaleziono':'Magazyn jest pusty',all.length?'Zmień wyszukiwanie.':'Dodaj pierwszy składnik, żeby zacząć.',button('Dodaj składnik',{kind:'primary',icon:'plus',onClick:()=>openEditor()})));
    else content.push(h('div',{class:'stock-list'},filtered.map(row)));
    s.content.replaceChildren(...content);
  }

  function scanProduct(){openBarcodeScanner({onDetected:async code=>{const found=listInventory().find(x=>normalizeEAN(x.ean||'')===normalizeEAN(code));if(found){toast('Znaleziono: '+found.name);openEditor(found);}else{toast('Nowy kod EAN: '+code);openEditor(null,code);}}});}

  function openEditor(item=null, initialEAN=''){
    let eanInput=null,name=item?.name||'',quantity=item?.quantity??0,unit=item?.unit||'g',minQuantity=item?.minQuantity??0,targetQuantity=item?.targetQuantity??0,purchasePrice=item?.purchasePrice??'',priceUnit=item?.priceUnit||'kg',ean=item?.ean||initialEAN||'',category=item?.category||'',aliases=(item?.aliases||[]).join(', ');
    const form=h('div',{class:'stack'},
      field('Składnik',textInput({value:name,label:'Nazwa składnika',placeholder:'np. Mąka 00',onInput:v=>{name=v;}})),
      field('Stan',h('div',{class:'grid-2'},textInput({value:quantity,type:'number',label:'Ilość',onInput:v=>{quantity=v;}}),selectEl(UNITS,unit,v=>{unit=v}))),
      field('Próg minimalny',textInput({value:minQuantity,type:'number',label:'Alert poniżej tej ilości',onInput:v=>{minQuantity=v;}})),
      field('Stan docelowy',textInput({value:targetQuantity,type:'number',label:'Ile chcesz mieć po uzupełnieniu',onInput:v=>{targetQuantity=v;}})),
      field('Cena zakupu',h('div',{class:'grid-2'},textInput({value:purchasePrice,type:'number',label:'Cena',onInput:v=>{purchasePrice=v;}}),selectEl([['kg','zł / kg'],['l','zł / l'],['szt','zł / szt'],['opak','zł / opak']],priceUnit,v=>{priceUnit=v}))),
      field('EAN',h('div',{class:'ean-entry'},(eanInput=textInput({value:ean,type:'text',label:'Kod EAN',inputmode:'numeric',placeholder:'opcjonalnie',onInput:v=>{ean=v;}})),button('Skanuj',{sm:true,icon:'barcode',onClick:()=>openBarcodeScanner({onDetected:async code=>{ean=code;eanInput.value=code;toast('Odczytano EAN: '+code);}})}))),
      field('Kategoria',textInput({value:category,label:'Kategoria',placeholder:'np. Nabiał',onInput:v=>{category=v;}})),
      field('Nazwy alternatywne',textInput({value:aliases,label:'Nazwy alternatywne',placeholder:'np. mozzarella fior di latte, mozzarella',onInput:v=>{aliases=v;}}))
    );
    openSheet({title:item?'Edytuj składnik':'Nowy składnik',variant:'sheet',body:form,actions:[
      {label:'Anuluj',kind:'ghost'},
      {label:'Zapisz',kind:'primary',icon:'check',onClick:async()=>{try{if(ean&&!validEAN(ean))throw new Error('Nieprawidłowy kod EAN.');await saveInventoryItem({id:item?.id,createdAt:item?.createdAt,name,quantity,unit,minQuantity,targetQuantity,purchasePrice,priceUnit,ean:normalizeEAN(ean),aliases:aliases.split(',').map(x=>x.trim()).filter(Boolean),category});toast(item?'Zapisano składnik':'Dodano składnik');paint();}catch(e){toast(e.message||'Nie udało się zapisać',{type:'error'});return false;}}}
    ]});
  }

  search.addEventListener('input',()=>{q=search.value.trim();focusPreservingPaint(paint,s.el);});
  loadInventory().then(paint).catch(e=>toast(e.message||'Nie udało się wczytać magazynu',{type:'error'}));
  const unsub=subscribeInventory(()=>paint());
  return{el:s.el,destroy:unsub};
}
