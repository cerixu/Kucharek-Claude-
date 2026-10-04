import {
  h, screen, button, iconBtn, openSheet, toast, field,
  textInput, selectEl, emptyState
} from './ui.js';
import { navigate } from './router.js';
import { loadInventory, listInventory, subscribeInventory } from './inventory.js';
import {
  listSuppliers, addSupplier, createPurchaseOrder, listPurchaseOrders,
  receiveDelivery, listDeliveries, recordWaste, startStocktake,
  updateStocktake, finalizeStocktake, createProductionBatch,
  completeProductionBatch, planRecipe, analyticsSummary, adjustStockPro
} from './pro.js';
import { listRecipes } from './recipes.js';

const UNITS = [
  ['g', 'g'],
  ['kg', 'kg'],
  ['ml', 'ml'],
  ['l', 'l'],
  ['szt', 'szt'],
  ['opak', 'opak']
];

const PRICE_UNITS = [
  ['kg', 'zł / kg'],
  ['l', 'zł / l'],
  ['szt', 'zł / szt'],
  ['opak', 'zł / opak']
];

const fmt = (value) => {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })
    : '0';
};

const date = (value) => value
  ? new Date(value).toLocaleDateString('pl-PL')
  : '';

export function proView() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const initialTab = params.get('tab') || 'dashboard';
  const s = screen({
    title: 'Kucharek PRO',
    right: iconBtn('refresh', 'Odśwież', () => paint(), 'quiet')
  });

  let tab = initialTab;
  let inventory = [];
  let suppliers = [];
  let orders = [];
  let deliveries = [];
  let summary = {};
  let unsub = null;

  const nav = (id, label) => button(label, {
    sm: true,
    kind: tab === id ? 'primary' : 'ghost',
    onClick: () => {
      tab = id;
      paint();
    }
  });

  async function refresh() {
    await loadInventory();
    const data = await Promise.all([
      Promise.resolve(listInventory()),
      listSuppliers(),
      listPurchaseOrders(),
      listDeliveries(),
      analyticsSummary()
    ]);
    [inventory, suppliers, orders, deliveries, summary] = data;
  }

  async function paint() {
    try {
      await refresh();
    } catch (error) {
      toast(error?.message || 'Nie udało się wczytać PRO', { type: 'error' });
      return;
    }

    const menu = h(
      'div',
      { class: 'pro-nav' },
      nav('dashboard', 'Dashboard'),
      nav('delivery', 'Dostawy'),
      nav('orders', 'Zamówienia'),
      nav('production', 'Produkcja'),
      nav('planning', 'Planowanie'),
      nav('calculators', 'Kalkulatory'),
      nav('analytics', 'Analityka')
    );

    let body;
    if (tab === 'delivery') body = deliveryView();
    else if (tab === 'orders') body = ordersView();
    else if (tab === 'production') body = productionView();
    else if (tab === 'planning') body = planningView();
    else if (tab === 'calculators') body = calculatorsView();
    else if (tab === 'analytics') body = analyticsView();
    else body = dashboardView();

    s.content.replaceChildren(menu, body);
  }

  function dashboardView() {
    const cards = [
      ['Produkty', summary.products],
      ['Niskie stany', summary.low],
      ['Wartość magazynu', fmt(summary.stockValue) + ' zł'],
      ['Straty', fmt(summary.wasteValue) + ' zł'],
      ['Dostawy', summary.deliveries],
      ['Zamówienia', summary.orders],
      ['Ruchy', summary.movements],
      ['Inwentaryzacje', summary.stocktakes]
    ].map(([label, value]) => h(
      'div',
      { class: 'result' },
      h('span', { class: 'result-k' }, label),
      h('strong', { class: 'result-v' }, String(value ?? 0))
    ));

    return h(
      'div',
      { class: 'stack' },
      h('div', { class: 'results-grid' }, ...cards),
      h(
        'div',
        { class: 'card' },
        h('h3', null, 'Szybkie operacje'),
        h(
          'div',
          { class: 'row wrap' },
          button('➕ Dostawa', { kind: 'primary', onClick: () => deliverySheet() }),
          button('🗑️ Strata', { onClick: () => wasteSheet() }),
          button('📋 Inwentaryzacja', { onClick: () => stocktakeSheet() }),
          button('⚖️ Korekta', { onClick: () => adjustSheet() })
        )
      ),
      h(
        'div',
        { class: 'card' },
        h('h3', null, 'Magazyn PRO'),
        h(
          'p',
          { class: 'muted' },
          'Dostawy, ceny zakupu, partie, straty, inwentaryzacja, zakupy, produkcja i analityka w jednym miejscu.'
        )
      )
    );
  }

  function deliveryView() {
    const items = deliveries.slice(0, 20).map((delivery) => h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'row between' },
        h('strong', null, delivery.supplierName || 'Bez dostawcy'),
        h('span', { class: 'tag' }, delivery.documentNo || 'bez dokumentu')
      ),
      h(
        'p',
        { class: 'muted' },
        date(delivery.at) + ' · ' + String(delivery.items?.length || 0) + ' pozycji'
      )
    ));

    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'row between' },
        h(
          'div',
          null,
          h('h3', null, 'Dostawy'),
          h('p', { class: 'muted' }, String(deliveries.length) + ' przyjętych dostaw')
        ),
        button('Nowa dostawa', {
          kind: 'primary',
          icon: 'plus',
          onClick: () => deliverySheet()
        })
      ),
      items.length
        ? h('div', { class: 'stack' }, ...items)
        : emptyState('📦', 'Brak dostaw', 'Przyjmij pierwszą dostawę do magazynu.')
    );
  }

  function ordersView() {
    const items = orders.slice(0, 20).map((order) => h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'row between' },
        h('strong', null, order.supplierName || 'Bez dostawcy'),
        h('span', { class: 'tag' }, order.status || 'draft')
      ),
      h(
        'p',
        { class: 'muted' },
        date(order.createdAt) + ' · ' + String(order.items?.length || 0) + ' pozycji'
      )
    ));

    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'row between' },
        h(
          'div',
          null,
          h('h3', null, 'Zamówienia'),
          h('p', { class: 'muted' }, String(orders.length) + ' zamówień')
        ),
        h(
          'div',
          { class: 'row' },
          button('Dostawca', {
            sm: true,
            onClick: () => supplierSheet()
          }),
          button('Nowe zamówienie', {
            kind: 'primary',
            icon: 'plus',
            onClick: () => orderSheet()
          })
        )
      ),
      items.length
        ? h('div', { class: 'stack' }, ...items)
        : emptyState('🛒', 'Brak zamówień', 'Zbuduj pierwsze zamówienie do dostawcy.')
    );
  }

  function productionView() {
    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'row between' },
        h(
          'div',
          null,
          h('h3', null, 'Produkcja półproduktów'),
          h(
            'p',
            { class: 'muted' },
            'Twórz półprodukty i zwiększaj ich stan w Magazynie.'
          )
        ),
        button('Nowa produkcja', {
          kind: 'primary',
          icon: 'plus',
          onClick: () => productionSheet()
        })
      ),
      h(
        'div',
        { class: 'card' },
        h('strong', null, 'Produkcja kontrolowana'),
        h(
          'p',
          { class: 'muted' },
          'Zużycie składników wejściowych i przyjęcie gotowego półproduktu są zapisywane w historii magazynu.'
        )
      )
    );
  }

  function planningView() {
    const recipes = listRecipes().slice(0, 30);
    const cards = recipes.map((recipe) => h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'row between' },
        h('strong', null, recipe.name),
        button('Sprawdź braki', {
          sm: true,
          onClick: async () => {
            try {
              const rows = await planRecipe(recipe, 1);
              const missing = rows.filter((row) => Number(row.missing) > 0);
              if (!missing.length) {
                toast('Komplet składników na 1×', { type: 'success' });
                return;
              }
              const text = missing
                .map((row) => row.name + ' ' + fmt(row.missing) + ' ' + row.unit)
                .join(', ');
              toast('Braki: ' + text, { type: 'error' });
            } catch (error) {
              toast(error?.message || 'Nie udało się sprawdzić braków', { type: 'error' });
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
        h(
          'p',
          { class: 'muted' },
          'Sprawdź zapotrzebowanie receptury względem aktualnego Magazynu.'
        )
      ),
      cards.length
        ? h('div', { class: 'stack' }, ...cards)
        : emptyState('📐', 'Brak receptur', 'Dodaj recepturę, aby planować produkcję.')
    );
  }

  function calculatorsView() {
    let input = 10;
    let output = 7.5;
    let target = 15;

    const resultBox = h('div', { class: 'results-grid' });

    const paintResults = () => {
      const i = Number(input);
      const o = Number(output);
      const t = Number(target);
      const efficiency = i > 0 ? (o / i) * 100 : 0;
      const loss = i > 0 ? Math.max(0, ((i - o) / i) * 100) : 0;
      const sourceForTarget = o > 0 ? (i * t) / o : 0;

      resultBox.replaceChildren(
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
      );
    };

    const editor = h(
      'div',
      { class: 'card stack' },
      h('h3', null, 'Wydajność i skala produkcji'),
      textInput({
        type: 'number',
        label: 'Surowiec',
        value: input,
        onInput: (value) => { input = value; paintResults(); }
      }),
      textInput({
        type: 'number',
        label: 'Wynik',
        value: output,
        onInput: (value) => { output = value; paintResults(); }
      }),
      textInput({
        type: 'number',
        label: 'Docelowy wynik',
        value: target,
        onInput: (value) => { target = value; paintResults(); }
      }),
      resultBox
    );

    paintResults();

    const coverage = h(
      'div',
      { class: 'card' },
      h('h3', null, 'Pokrycie magazynu'),
      inventory.length
        ? h(
          'div',
          { class: 'stack' },
          ...inventory.slice(0, 12).map((item) => h(
            'div',
            { class: 'row between' },
            h('span', null, item.name),
            h('span', { class: 'muted' }, fmt(item.quantity) + ' ' + item.unit)
          ))
        )
        : h('p', { class: 'muted' }, 'Magazyn jest pusty.')
    );

    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        null,
        h('h3', null, 'Kalkulatory PRO'),
        h('p', { class: 'muted' }, 'Wydajność, straty i skala produkcji.')
      ),
      editor,
      coverage
    );
  }

  function analyticsView() {
    const changes = (summary.priceChanges || []).slice(0, 12);
    const history = changes.length
      ? h(
        'div',
        { class: 'stack' },
        ...changes.map((row) => h(
          'div',
          { class: 'row between' },
          h('span', null, row.inventoryName),
          h(
            'span',
            { class: row.change > 0 ? 'warn' : '' },
            fmt(row.price) + ' zł/' + row.priceUnit +
            (row.change ? ' · ' + (row.change > 0 ? '+' : '') + fmt(row.change) : '')
          )
        ))
      )
      : h('p', { class: 'muted' }, 'Brak danych cenowych.');

    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'results-grid' },
        h('div', { class: 'result' },
          h('span', { class: 'result-k' }, 'Ruchy'),
          h('strong', { class: 'result-v' }, String(summary.movements ?? 0))
        ),
        h('div', { class: 'result' },
          h('span', { class: 'result-k' }, 'Straty'),
          h('strong', { class: 'result-v' }, String(summary.waste ?? 0))
        ),
        h('div', { class: 'result' },
          h('span', { class: 'result-k' }, 'Dostawy'),
          h('strong', { class: 'result-v' }, String(summary.deliveries ?? 0))
        ),
        h('div', { class: 'result' },
          h('span', { class: 'result-k' }, 'Zamówienia'),
          h('strong', { class: 'result-v' }, String(summary.orders ?? 0))
        )
      ),
      h(
        'div',
        { class: 'card' },
        h('h3', null, 'Historia cen'),
        history
      )
    );
  }

  function supplierSheet() {
    let name = '';
    let contact = '';
    let phone = '';
    let email = '';
    let notes = '';

    const form = h(
      'div',
      { class: 'stack' },
      textInput({ label: 'Nazwa dostawcy', onInput: (value) => { name = value; } }),
      textInput({ label: 'Osoba kontaktowa', onInput: (value) => { contact = value; } }),
      textInput({ label: 'Telefon', inputmode: 'tel', onInput: (value) => { phone = value; } }),
      textInput({ label: 'E-mail', type: 'email', onInput: (value) => { email = value; } }),
      textInput({ label: 'Uwagi', onInput: (value) => { notes = value; } })
    );

    openSheet({
      title: 'Nowy dostawca',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Zapisz',
          kind: 'primary',
          onClick: async () => {
            try {
              await addSupplier({ name, contact, phone, email, notes });
              toast('Dostawca zapisany');
              paint();
            } catch (error) {
              toast(error?.message || 'Nie udało się zapisać dostawcy', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function deliverySheet() {
    let supplierId = '';
    let supplierName = '';
    let documentNo = '';
    const item = {
      name: '',
      quantity: '',
      unit: 'kg',
      purchasePrice: '',
      priceUnit: 'kg',
      lot: '',
      expiryAt: ''
    };

    const form = h(
      'div',
      { class: 'stack' },
      field(
        'Dostawca',
        selectEl(
          [['', 'Bez dostawcy'], ...suppliers.map((supplier) => [supplier.id, supplier.name])],
          '',
          (value) => {
            supplierId = value;
            supplierName = suppliers.find((supplier) => supplier.id === value)?.name || '';
          }
        )
      ),
      textInput({
        label: 'Numer dokumentu',
        onInput: (value) => { documentNo = value; }
      }),
      h(
        'div',
        { class: 'card stack' },
        h('strong', null, 'Pozycja dostawy'),
        textInput({ label: 'Produkt', onInput: (value) => { item.name = value; } }),
        h(
          'div',
          { class: 'grid-2' },
          textInput({ type: 'number', label: 'Ilość', onInput: (value) => { item.quantity = value; } }),
          selectEl(UNITS, item.unit, (value) => { item.unit = value; })
        ),
        h(
          'div',
          { class: 'grid-2' },
          textInput({ type: 'number', label: 'Cena zakupu', onInput: (value) => { item.purchasePrice = value; } }),
          selectEl(PRICE_UNITS, item.priceUnit, (value) => { item.priceUnit = value; })
        ),
        textInput({ label: 'Partia', onInput: (value) => { item.lot = value; } }),
        textInput({
          type: 'date',
          label: 'Termin',
          onInput: (value) => { item.expiryAt = value ? new Date(value).getTime() : ''; }
        })
      )
    );

    openSheet({
      title: 'Nowa dostawa',
      variant: 'sheet',
      body: form,
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        {
          label: 'Przyjmij',
          kind: 'primary',
          icon: 'check',
          onClick: async () => {
            try {
              await receiveDelivery({
                supplierId,
                supplierName,
                documentNo,
                items: [item]
              });
              toast('Dostawa przyjęta 📦');
              paint();
            } catch (error) {
              toast(error?.message || 'Nie udało się przyjąć dostawy', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function orderSheet() {
    let supplierId = '';
    let supplierName = '';
    let name = '';
    let amount = '';
    let unit = 'kg';

    const form = h(
      'div',
      { class: 'stack' },
      field(
        'Dostawca',
        selectEl(
          [['', 'Bez dostawcy'], ...suppliers.map((supplier) => [supplier.id, supplier.name])],
          '',
          (value) => {
            supplierId = value;
            supplierName = suppliers.find((supplier) => supplier.id === value)?.name || '';
          }
        )
      ),
      textInput({ label: 'Produkt', onInput: (value) => { name = value; } }),
      h(
        'div',
        { class: 'grid-2' },
        textInput({ type: 'number', label: 'Ilość', onInput: (value) => { amount = value; } }),
        selectEl(UNITS, unit, (value) => { unit = value; })
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
            } catch (error) {
              toast(error?.message || 'Nie udało się zapisać zamówienia', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function wasteSheet() {
    if (!inventory.length) {
      toast('Najpierw dodaj produkt do Magazynu', { type: 'error' });
      return;
    }

    let id = inventory[0].id;
    let amount = '';
    let reason = 'zepsucie';

    const form = h(
      'div',
      { class: 'stack' },
      field(
        'Produkt',
        selectEl(inventory.map((item) => [item.id, item.name]), id, (value) => { id = value; })
      ),
      textInput({ type: 'number', label: 'Ilość straty', onInput: (value) => { amount = value; } }),
      field(
        'Powód',
        selectEl(
          [
            ['zepsucie', 'Zepsucie'],
            ['przeterminowanie', 'Przeterminowanie'],
            ['uszkodzenie', 'Uszkodzenie'],
            ['produkcja', 'Błąd produkcyjny'],
            ['inne', 'Inne']
          ],
          reason,
          (value) => { reason = value; }
        )
      )
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
            } catch (error) {
              toast(error?.message || 'Nie udało się zapisać straty', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  function adjustSheet() {
    if (!inventory.length) {
      toast('Magazyn jest pusty', { type: 'error' });
      return;
    }

    let id = inventory[0].id;
    let delta = '';
    let reason = 'manual';

    const form = h(
      'div',
      { class: 'stack' },
      field(
        'Produkt',
        selectEl(inventory.map((item) => [item.id, item.name]), id, (value) => { id = value; })
      ),
      textInput({
        type: 'number',
        label: 'Zmiana ilości (+ / -)',
        onInput: (value) => { delta = value; }
      }),
      textInput({
        label: 'Powód',
        value: reason,
        onInput: (value) => { reason = value; }
      })
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
            } catch (error) {
              toast(error?.message || 'Nie udało się zapisać korekty', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  async function stocktakeSheet() {
    try {
      const take = await startStocktake();
      for (const item of take.items) {
        await updateStocktake(take.id, item.inventoryId, item.systemQuantity);
      }
      await finalizeStocktake(take.id);
      toast('Inwentaryzacja zamknięta.');
      paint();
    } catch (error) {
      toast(error?.message || 'Błąd inwentaryzacji', { type: 'error' });
    }
  }

  function productionSheet() {
    let productName = '';
    let quantity = '';
    let unit = 'kg';
    let recipeId = '';
    let factor = 1;
    const recipes = listRecipes();

    const form = h(
      'div',
      { class: 'stack' },
      textInput({ label: 'Półprodukt', onInput: (value) => { productName = value; } }),
      textInput({ type: 'number', label: 'Ilość', onInput: (value) => { quantity = value; } }),
      field('Jednostka', selectEl(UNITS, unit, (value) => { unit = value; })),
      field(
        'Receptura wejściowa',
        selectEl(
          [['', 'Bez receptury'], ...recipes.map((recipe) => [recipe.id, recipe.name])],
          '',
          (value) => { recipeId = value; }
        )
      ),
      textInput({
        type: 'number',
        label: 'Mnożnik receptury',
        value: factor,
        onInput: (value) => { factor = value; }
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
          icon: 'check',
          onClick: async () => {
            try {
              const row = await createProductionBatch({
                productName,
                quantity,
                unit,
                recipeId,
                factor
              });
              await completeProductionBatch(row.id);
              toast('Produkcja przyjęta do Magazynu');
              paint();
            } catch (error) {
              toast(error?.message || 'Nie udało się zapisać produkcji', { type: 'error' });
              return false;
            }
          }
        }
      ]
    });
  }

  paint();
  unsub = subscribeInventory(() => {
    if (tab === 'dashboard' || tab === 'analytics' || tab === 'calculators') {
      paint();
    }
  });

  return {
    el: s.el,
    destroy: () => {
      if (unsub) unsub();
    }
  };
}
