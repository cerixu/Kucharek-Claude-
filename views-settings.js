/* ==========================================================================
   views-settings.js — Ustawienia: wygląd i tryb, kategorie, kopia zapasowa,
   pamięć i PWA, aktualizacje, strefa ryzyka, prywatność.
   ========================================================================== */
import {
  h, icon, screen, button, toast, openSheet, confirmDialog, promptDialog, segmented, switchEl, selectEl, field, textInput,
} from './ui.js';
import { navigate, rerender } from './router.js';
import { state, getSetting, setSetting, restoreSeeds, listRecipes } from './recipes.js';
import { openCategoryManager } from './views-recipes.js';
import { exportBackup, readBackupFile, importBackup, wipeAll, daysSinceBackup } from './backup.js';
import { checkForUpdate, swVersion, storageInfo, requestPersist, isStandalone, isIOS, swSupported } from './pwa.js';
import { APP_VERSION, fmtDateTime } from './util.js';
import { getAIGatewayUrl, setAIGatewayUrl, setAIGatewayToken, clearAIGatewayToken, testAIGateway } from './ai.js';

const mb = (b) => (b == null ? '—' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB');

export function settingsView() {
  const s = screen({ title: 'Ustawienia', cls: 'settings' });
  const c = s.content;
  const group = (title, ...kids) => h('section', { class: 'card stack' }, h('h2', { class: 'card-title' }, title), ...kids);

  const set = (k) => async (v) => { await setSetting(k, v); };

  /* ----- Wygląd ----- */
  const scaleVal = h('span', { class: 'num' }, getSetting('textScale') + '%');
  const range = h('input', { type: 'range', min: 90, max: 130, step: 5, value: getSetting('textScale'), 'aria-label': 'Wielkość tekstu', class: 'range' });
  range.addEventListener('input', () => { scaleVal.textContent = range.value + '%'; document.documentElement.style.setProperty('--ts', String(range.value / 100)); });
  range.addEventListener('change', () => setSetting('textScale', +range.value));

  const appearance = group('Wygląd',
    h('div', null, h('div', { class: 'field-label' }, 'Motyw'),
      segmented([['auto', 'Auto'], ['light', 'Jasny'], ['dark', 'Ciemny']], getSetting('theme'), set('theme'), { label: 'Motyw' })),
    h('div', null, h('div', { class: 'field-label' }, 'Tryb'),
      segmented([['pro', 'Pro'], ['amateur', 'Amator']], getSetting('mode'), async (v) => { await setSetting('mode', v); rerender(); }, { label: 'Tryb aplikacji' }),
      h('p', { class: 'muted small' }, 'Pro: procenty piekarskie, food cost, historia zmian, ciemna stal i szafran. Amator: zielony, zaokrąglony, prostszy wygląd — bez zaawansowanych funkcji.')),
    h('div', null, h('div', { class: 'field-label' }, 'Wielkość przycisków'),
      segmented([['normal', 'Normalne'], ['large', 'Duże'], ['xl', 'Bardzo duże']], getSetting('tapSize'), set('tapSize'), { label: 'Wielkość przycisków' }),
      h('p', { class: 'muted small' }, 'Większe przyciski są wygodniejsze przy mokrych rękach.')),
    h('div', null, h('div', { class: 'row between' }, h('span', { class: 'field-label' }, 'Wielkość tekstu'), scaleVal), range));

  /* ----- Kucharek AI ----- */
  const aiGateway = textInput({
    value: getAIGatewayUrl(),
    label: 'Adres AI Gateway',
    placeholder: 'https://twoj-worker.example.workers.dev',
    type: 'url',
    inputmode: 'url',
    capitalize: 'none'
  });
  const aiToken = textInput({
    value: '',
    label: 'Token gatewaya (tylko ta sesja)',
    placeholder: 'Wklej token tylko na tym urządzeniu',
    type: 'password',
    capitalize: 'none'
  });
  const aiStatus = h('div', { class: 'ai-settings-status', 'aria-live': 'polite' },
    icon('info', 18), h('span', null, 'Niepołączono'));
  const syncAiInputs = async () => {
    await setAIGatewayUrl(aiGateway.value);
    setAIGatewayToken(aiToken.value);
  };
  aiToken.addEventListener('input', () => setAIGatewayToken(aiToken.value));
  aiGateway.addEventListener('change', async () => {
    await setAIGatewayUrl(aiGateway.value);
    clearAIGatewayToken();
    aiToken.value = '';
    aiStatus.replaceChildren(icon('info', 18), h('span', null, 'Adres zapisany. Wklej token sesji i sprawdź połączenie.'));
  });
  const ai = group('Kucharek AI',
    switchEl(getSetting('aiEnabled') !== false, set('aiEnabled'), 'Kucharek AI', 'Włącza import URL i pomocnika podczas gotowania'),

    h('details', { class: 'ai-setup-guide' },
      h('summary', null, icon('sparkle', 18), h('strong', null, 'Jak uruchomić Kucharek AI?')),
      h('div', { class: 'ai-guide-body stack' },
        h('p', null, h('strong', null, 'To robisz tylko raz. Potrzebujesz własnego konta OpenAI i darmowego konta Cloudflare.')),
        h('div', { class: 'ai-step' },
          h('b', null, '1. Pobierz pliki gatewaya'),
          h('p', { class: 'muted' }, 'W repozytorium Kucharek otwórz folder „ai-gateway”. Znajdziesz tam plik worker.js i instrukcję.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '2. Załóż konto Cloudflare'),
          h('p', { class: 'muted' }, 'Wejdź na Cloudflare, zaloguj się lub załóż konto, a następnie wybierz Workers & Pages → Create → Worker.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '3. Wgraj worker.js'),
          h('p', { class: 'muted' }, 'Otwórz kod Workera, usuń przykładowy kod i wklej zawartość pliku worker.js z Kucharka. Kliknij Deploy.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '4. Dodaj klucz OpenAI jako SECRET'),
          h('p', { class: 'muted' }, 'W Workerze wejdź w Settings → Variables and Secrets → Add secret. Nazwa:'),
          h('code', null, 'OPENAI_API_KEY'),
          h('p', { class: 'muted' }, 'Wartość: Twój klucz API OpenAI. Nie wklejaj go do Kucharka, GitHuba ani żadnego pola w aplikacji.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '5. Dodaj drugi SECRET'),
          h('p', { class: 'muted' }, 'Dodaj kolejny sekret o nazwie:'),
          h('code', null, 'KUCHAREK_GATEWAY_TOKEN'),
          h('p', { class: 'muted' }, 'Wartość wymyśl jako długi losowy token, np. wygenerowany menedżerem haseł. Ten sam token wkleisz niżej w Kucharku.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '6. Dodaj adres strony aplikacji'),
          h('p', { class: 'muted' }, 'W Variables dodaj:'),
          h('code', null, 'ALLOWED_ORIGIN'),
          h('p', { class: 'muted' }, 'Wartość to dokładny adres, z którego działa Kucharek, np. https://cerixu.github.io. Bez ukośnika na końcu.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '7. Deploy i skopiuj adres Workera'),
          h('p', { class: 'muted' }, 'Po wdrożeniu Cloudflare pokaże adres kończący się zwykle na workers.dev. Skopiuj go i wklej poniżej do „Adres AI Gateway”.'),
        ),
        h('div', { class: 'ai-step' },
          h('b', null, '8. Wklej token i sprawdź połączenie'),
          h('p', { class: 'muted' }, 'Wklej ten sam token, który podałeś jako KUCHAREK_GATEWAY_TOKEN, a następnie kliknij „Sprawdź połączenie”. Jeśli zobaczysz „Gateway działa”, gotowe.'),
        ),
        h('div', { class: 'notice warning' },
          icon('shield', 18),
          h('div', null,
            h('strong', null, 'Najważniejsze:'),
            h('p', { class: 'muted small' }, 'Nigdy nie wpisuj OPENAI_API_KEY w Kucharku. Kucharek potrzebuje tylko adresu Workera i tokenu gatewaya.')
          )
        ),
        h('p', { class: 'muted small' }, 'Koszt AI zależy od użycia OpenAI. Cloudflare i OpenAI mogą wymagać własnych limitów/płatności zgodnie z aktualnym cennikiem.'),
      )
    ),

    h('p', { class: 'muted' }, 'Bezpieczny wariant: klucz OpenAI nie trafia do aplikacji ani do repozytorium. Jest przechowywany jako sekret w Twoim AI Gateway.'),
    field('Adres AI Gateway', aiGateway),
    field('Token gatewaya (tylko ta sesja)', aiToken, 'Token nie jest zapisywany w IndexedDB ani localStorage. Po ponownym uruchomieniu wpisz go ponownie.'),
    aiStatus,
    h('div', { class: 'row wrap gap' },
      button('Sprawdź połączenie', { icon: 'link', kind: 'primary', onClick: async () => {
        try {
          await syncAiInputs();
          const r = await testAIGateway();
          aiStatus.replaceChildren(icon('check', 18), h('span', null, r?.service ? 'Gateway działa' : 'Połączono'));
          toast('Kucharek AI jest gotowy 🤖');
        } catch (e) {
          aiStatus.replaceChildren(icon('x', 18), h('span', null, e?.message || 'Nie udało się połączyć'));
          toast(e?.message || 'Nie udało się połączyć z AI', { type: 'error', ms: 5000 });
        }
      } }),
      button('Wyczyść token', { icon: 'trash', kind: 'ghost', onClick: () => { clearAIGatewayToken(); aiToken.value = ''; aiStatus.replaceChildren(icon('info', 18), h('span', null, 'Token usunięty z sesji')); } })
    ),
    h('p', { class: 'muted small' }, 'Gateway jest potrzebny, bo OpenAI zaleca kierowanie żądań przez własny backend zamiast trzymania klucza API w przeglądarce.')
  );

  /* ----- Receptury ----- */
  const recipes = group('Receptury',
    button('Kategorie', { icon: 'tag', block: true, onClick: () => openCategoryManager() }),
    switchEl(!!getSetting('pinTraditional'), set('pinTraditional'), 'Tradycyjne receptury na górze', 'Z gwiazdką i flagą kraju'),
    switchEl(!!getSetting('keepAwake'), set('keepAwake'), 'Nie gaś ekranu w trybie „Gotuję”', 'Działa, gdy przeglądarka obsługuje Wake Lock'),
    field('Waluta', selectEl(['zł', '€', '$', '£', 'Kč', 'Ft'], getSetting('currency'), set('currency'))),
    switchEl(getSetting('inventoryAlerts') !== false, set('inventoryAlerts'), 'Alerty stanów magazynowych', 'Pokazuj liczbę produktów na minimum lub bez stanu na ekranie Start'),
    button('Przywróć przykładowe receptury', { icon: 'refresh', block: true, kind: 'ghost', onClick: async () => {
      const n = await restoreSeeds();
      toast(n ? `Przywrócono receptury: ${n}` : 'Przykładowe receptury już są (edytowanych nie nadpisuję)');
    } }));

  /* ----- Kopia zapasowa ----- */
  const backupInfo = h('p', { class: 'muted small' });
  const paintBackupInfo = () => {
    const last = getSetting('lastBackupAt');
    const d = daysSinceBackup();
    backupInfo.textContent = last ? `Ostatnia kopia: ${fmtDateTime(last)}${d > 14 ? ` (${d} dni temu — czas na nową)` : ''}` : 'Nie zrobiono jeszcze żadnej kopii. Dane są tylko w tym telefonie.';
  };
  paintBackupInfo();
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-file', 'aria-label': 'Wybierz plik kopii' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files && fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    try { openRestore(await readBackupFile(f)); }
    catch (e) { toast(e.message || 'Nie udało się wczytać pliku', { type: 'error', ms: 4000 }); }
  });

  function openRestore({ backup, summary }) {
    const sh = openSheet({
      title: 'Wczytać kopię zapasową?', variant: 'sheet',
      body: h('div', { class: 'stack' },
        h('div', { class: 'kv' },
          h('div', { class: 'kv-row' }, h('span', null, 'Receptury'), h('span', { class: 'num' }, String(summary.recipes))),
          h('div', { class: 'kv-row' }, h('span', null, 'Kategorie'), h('span', { class: 'num' }, String(summary.categories))),
          h('div', { class: 'kv-row' }, h('span', null, 'Pozycje zakupów'), h('span', { class: 'num' }, String(summary.shopping))),
          h('div', { class: 'kv-row' }, h('span', null, 'Wpisy historii'), h('span', { class: 'num' }, String(summary.history))),
          summary.exportedAt ? h('div', { class: 'kv-row' }, h('span', null, 'Zrobiona'), h('span', { class: 'num' }, fmtDateTime(summary.exportedAt))) : null),
        h('p', { class: 'muted small' }, '„Połącz” dodaje brakujące receptury i zostawia nowszą wersję każdej z nich. „Zastąp” usuwa obecne dane i wczytuje tylko kopię.')),
      actions: [
        { label: 'Anuluj', kind: 'ghost' },
        { label: 'Zastąp wszystko', kind: 'danger', onClick: async () => {
          const ok = await confirmDialog({ title: 'Zastąpić wszystkie dane?', message: `Obecnych receptur (${listRecipes().length}) nie będzie już w aplikacji. Tej operacji nie da się cofnąć.`, confirmText: 'Zastąp', danger: true });
          if (!ok) return false;
          await doImport(backup, 'replace');
        } },
        { label: 'Połącz', kind: 'primary', onClick: () => doImport(backup, 'merge') },
      ],
    });
    void sh;
  }
  async function doImport(backup, mode) {
    try {
      const r = await importBackup(backup, mode);
      toast(`Wczytano kopię — receptur: ${r.recipes}`);
      rerender();
    } catch (e) { console.error(e); toast('Nie udało się wczytać kopii: ' + (e && e.message), { type: 'error', sticky: true }); }
  }

  const backup = group('Kopia zapasowa (JSON)',
    h('p', { class: 'muted' }, 'Receptury, składniki, kategorie, uwagi, ulubione, ustawienia, zakupy i historia w jednym pliku. Zapisz go w Plikach / iCloud Drive — to jedyna ochrona, gdyby Safari wyczyściło dane witryny.'),
    backupInfo,
    button('Eksportuj kopię', { icon: 'download', kind: 'primary', block: true, onClick: async () => {
      const r = await exportBackup();
      if (r === 'cancelled') return;
      paintBackupInfo();
      toast(r === 'shared' ? 'Kopia gotowa do zapisania' : r === 'downloaded' ? 'Plik kopii pobrany' : r === 'copied' ? 'Kopia skopiowana do schowka' : 'Nie udało się zapisać kopii', { type: r ? '' : 'error' });
    } }),
    button('Wczytaj kopię z pliku', { icon: 'upload', block: true, onClick: () => fileIn.click() }), fileIn);

  /* ----- Pamięć i aplikacja ----- */
  const storageBox = h('div', { class: 'kv' });
  const swRow = h('span', { class: 'num' }, '…');
  async function paintStorage() {
    const si = await storageInfo();
    const cnt = listRecipes().length;
    storageBox.replaceChildren(
      h('div', { class: 'kv-row' }, h('span', null, 'Receptur'), h('span', { class: 'num' }, String(cnt))),
      h('div', { class: 'kv-row' }, h('span', null, 'Zajęte miejsce'), h('span', { class: 'num' }, mb(si.usage))),
      h('div', { class: 'kv-row' }, h('span', null, 'Trwały magazyn'), h('span', { class: 'num' }, si.persisted ? 'tak' : 'nie (kopia JSON chroni dane)')),
      h('div', { class: 'kv-row' }, h('span', null, 'Połączenie'), h('span', { class: 'num' }, navigator.onLine ? 'online' : 'offline')),
      h('div', { class: 'kv-row' }, h('span', null, 'Tryb'), h('span', { class: 'num' }, isStandalone() ? 'aplikacja (ekran początkowy)' : 'karta przeglądarki')));
    const v = await swVersion();
    swRow.textContent = !swSupported() ? 'niedostępny' : v ? `aktywny (${v})` : 'jeszcze się instaluje';
  }
  paintStorage();

  const app = group('Aplikacja i pamięć',
    storageBox,
    h('div', { class: 'kv' }, h('div', { class: 'kv-row' }, h('span', null, 'Wersja aplikacji'), h('span', { class: 'num' }, APP_VERSION)), h('div', { class: 'kv-row' }, h('span', null, 'Service worker'), swRow)),
    button('Poproś o trwały magazyn', { icon: 'info', block: true, kind: 'ghost', onClick: async () => { const ok = await requestPersist(); toast(ok ? 'Magazyn oznaczony jako trwały' : 'Przeglądarka nie nadała trwałości — rób kopie JSON'); paintStorage(); } }),
    button('Sprawdź aktualizacje', { icon: 'refresh', block: true, onClick: async () => {
      const r = await checkForUpdate();
      const msg = { available: 'Jest nowa wersja — stuknij „Odśwież”', current: 'Masz najnowszą wersję', offline: 'Jesteś offline', unsupported: 'Aktualizacje niedostępne w tej przeglądarce', error: 'Nie udało się sprawdzić' }[r];
      if (r !== 'available') toast(msg, { type: r === 'error' ? 'error' : '' });
    } }));

  const install = !isStandalone() ? group('Instalacja',
    isIOS()
      ? h('ol', { class: 'plain steps-mini' }, h('li', null, 'Otwórz tę stronę w Safari.'), h('li', null, 'Stuknij przycisk Udostępnij (kwadrat ze strzałką).'), h('li', null, 'Wybierz „Do ekranu początkowego”, a potem „Dodaj”.'))
      : h('p', { class: 'muted' }, 'W menu przeglądarki wybierz „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.'),
    h('p', { class: 'muted small' }, 'Zainstalowana aplikacja działa w pełnym ekranie i bez internetu.')) : null;

  /* ----- Ryzyko i prywatność ----- */
  const danger = group('Strefa ryzyka',
    h('p', { class: 'muted' }, 'Usunięcie danych kasuje receptury, historię, zakupy i ustawienia z tego telefonu. Najpierw zrób kopię JSON.'),
    button('Usuń wszystkie dane', { icon: 'trash', kind: 'danger', block: true, onClick: async () => {
      const t = await promptDialog({ title: 'Usunąć wszystkie dane?', message: 'Wpisz USUŃ, aby potwierdzić. Tej operacji nie da się cofnąć.', label: 'Potwierdzenie', placeholder: 'USUŃ', confirmText: 'Usuń wszystko' });
      if (t == null) return;
      if (t.trim().toUpperCase() !== 'USUŃ') { toast('Nie wpisano USUŃ — nic nie usunięto', { type: 'error' }); return; }
      await wipeAll({ keepSeeds: false });
      toast('Dane usunięte');
      navigate('/', { replace: true });
    } }));

  const about = group('Prywatność',
    h('p', { class: 'muted' }, 'Kucharek nie ma konta, reklam, śledzenia ani analityki. Receptury, magazyn i historia są przechowywane lokalnie. Gdy używasz AI, tylko potrzebny kontekst jest wysyłany przez Twój własny AI Gateway; Kucharek nie zapisuje tokenu gatewaya ani historii rozmowy.'));

  c.append(appearance, ai, recipes, backup, app, install, danger, about);
  void state;
  return { el: s.el };
}
