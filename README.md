# Kucharzyna 👨‍🍳

Prywatny notatnik szefa kuchni na iPhone'a (działa też na innych telefonach i komputerze).
Instalowalna aplikacja PWA, **działa bez internetu**, bez kont, reklam, śledzenia i płatnych API.
Wszystkie dane są w pamięci Twojego urządzenia.

## Co potrafi

- **Receptury**: wyszukiwarka (bez względu na polskie znaki), kategorie (własne też), filtry, sortowanie, ulubione, ostatnie. Tradycyjne receptury są przypięte na górze z gwiazdką i flagą kraju.
- **Edytor**: wiele sekcji (CIASTO / SOS / DODATKI), przesuwanie składników i sekcji, kroki, zdjęcie (kompresowane lokalnie), tagi, źródło, czasy, temperatura, własne uwagi. Szkic zapisuje się na bieżąco — nic nie ginie.
- **GOTUJĘ**: duże checkboxy składników i kroków (postęp zapamiętany), minutnik z dźwiękiem, zmiana rozmiaru tekstu, przeliczanie w trakcie, ekran nie gaśnie.
- **Przelicz**: według porcji, wydajności albo jednego składnika; szybkie ×0,5 ×2 ×3 ×5 ×10; zapis jako nowa receptura lub nadpisanie.
- **Procenty piekarskie**: mąka = 100%, hydracja, sól, drożdże, tłuszcz; przeliczanie masy ciasta, liczby i wagi kulek.
- **Kalkulatory**: pizza/ciasto (z podpowiedzią ilości drożdży), procenty, przeliczanie receptury, koszt receptury.
- **Food cost**: ceny składników (za kg/l/g/ml/szt./opakowanie), koszt receptury i porcji, food cost %, cena sprzedaży.
- **Zakupy**: dodawanie z receptury (z wyborem pozycji), ręcznie, odhaczanie, edycja ilości, grupowanie wg alejek/receptur, czyszczenie kupionych, udostępnianie listy.
- **Import**: wklej tekst przepisu (albo kod strony) — aplikacja rozpoznaje nazwę, składniki, ilości, jednostki (także cups/oz/lb/°F), sekcje, kroki, czasy, temperaturę i porcje. Możesz zapisać od razu albo poprawić w formularzu. „Znajdź przepis w internecie” otwiera Google, a tłumaczenie obcego tekstu — Google Tłumacz (tylko na Twoje kliknięcie).
- **Historia zmian**: poprzednie wersje receptury i „Przywróć wersję” (też można cofnąć).
- **Kopia zapasowa JSON**: eksport/import wszystkiego, wczytanie z opcją „Zastąp” albo „Połącz”.
- **Wygląd**: jasny/ciemny/auto, tryb **Pro** (ciemna stal + szafran, procenty piekarskie, food cost, historia) i **Amator** (zielony, zaokrąglony, prostszy, bez funkcji zaawansowanych), rozmiar przycisków (normalne/duże/bardzo duże) i tekstu.

## Struktura plików

```
kucharzyna/
├── index.html              # powłoka aplikacji, meta tagi iOS, wczesne ustawienie motywu
├── styles.css              # wszystkie style (motywy, safe-area, komponenty, ekrany)
├── manifest.webmanifest    # manifest PWA
├── sw.js                   # service worker (cache offline + wykrywanie aktualizacji)
├── .nojekyll               # wyłącza Jekyll na GitHub Pages
├── app.js                  # start, motyw, nawigacja dolna, klawiatura iOS, trasy
├── router.js               # router po hashu (#/…), pamięć przewijania
├── pwa.js                  # rejestracja SW, „Nowa wersja → Odśwież”, trwały magazyn
├── db.js                   # IndexedDB (recipes, ingredients, categories, shoppingItems, settings, history)
├── recipes.js              # model danych, zapis, historia, kategorie, dane startowe
├── calculator.js           # przeliczanie, procenty piekarskie, pizza, food cost
├── importer.js             # parser tekstu przepisu (PL/EN, JSON-LD)
├── backup.js               # eksport/import JSON
├── shopping.js             # lista zakupów (logika + widok)
├── ui.js, util.js, components.js          # elementy interfejsu, narzędzia
├── views-start.js          # ekran Start
├── views-recipes.js        # lista receptur, menedżer kategorii
├── views-detail.js         # podgląd receptury, Przelicz, procenty, koszt, historia
├── views-editor.js         # edytor receptury
├── views-cook.js           # tryb GOTUJĘ + minutnik
├── views-calc.js           # kalkulatory
├── views-import.js         # import i „Znajdź przepis w internecie”
├── views-settings.js       # ustawienia
└── assets/                 # ikony: apple-touch-icon 180, 192, 512, maskable 512
```

Brak bundlera i zależności — czyste moduły ES. Nic nie trzeba instalować ani budować.

## Uruchomienie lokalnie

Service worker i instalacja wymagają `http://localhost` albo HTTPS (otwarcie pliku z dysku przez `file://` nie zadziała).

```bash
cd kucharzyna
python3 -m http.server 8080
# albo: npx serve .
```

Otwórz `http://localhost:8080`.

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie (np. `kucharzyna`) i wgraj **zawartość tego folderu** do katalogu głównego repozytorium (z plikiem `.nojekyll`).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, gałąź `main`, folder `/ (root)` → **Save**.
3. Po minucie–dwóch aplikacja będzie pod `https://TWOJA-NAZWA.github.io/kucharzyna/`.

Wszystkie ścieżki są względne, więc działa w podkatalogu repozytorium. Repozytorium może być prywatne tylko na planie GitHuba, który to dla Pages dopuszcza — w przeciwnym razie strona jest publiczna (same dane i tak zostają w telefonie, nie w repozytorium).

## Instalacja na iPhonie

1. Otwórz adres aplikacji w **Safari** (nie w innej przeglądarce — instalacja jest tylko z Safari).
2. Stuknij **Udostępnij** (kwadrat ze strzałką) → **Do ekranu początkowego** → **Dodaj**.
3. Uruchom aplikację **z ikony na ekranie początkowym**. Przy pierwszym uruchomieniu miej internet — wtedy zapisuje się pamięć offline.
4. Sprawdź: włącz tryb samolotowy i otwórz aplikację. Powinna działać normalnie.

**Ważne:** na iOS aplikacja z ekranu początkowego ma **osobną pamięć** od karty Safari. Receptury dodane w Safari przed instalacją nie pojawią się w zainstalowanej aplikacji. Najlepiej zainstalować od razu, a jeśli już coś wpisałeś w Safari — zrób kopię JSON i wczytaj ją w aplikacji.

## Gdzie są dane

W **IndexedDB** w przeglądarce / zainstalowanej aplikacji na tym urządzeniu (stores: `recipes`, `ingredients`, `categories`, `shoppingItems`, `settings`, `history`). Nic nie jest wysyłane na żaden serwer. Zdjęcia są kompresowane i przechowywane razem z recepturą.

Skutki: dane jednego telefonu nie pojawią się na drugim (przenoś kopią JSON), a **usunięcie danych witryny lub aplikacji kasuje receptury**. Przeglądarka może też wyczyścić pamięć, gdy brakuje miejsca albo długo jej nie używasz — dlatego rób kopie.

## Kopia zapasowa

- **Ustawienia → Eksportuj kopię** — na iPhonie otworzy się arkusz udostępniania: wybierz **Zachowaj w Plikach** (np. iCloud Drive). Plik ma nazwę `kucharzyna-kopia-RRRR-MM-DD.json`.
- **Ustawienia → Wczytaj kopię z pliku**: **Połącz** (dodaje brakujące, przy tej samej recepturze zostaje nowsza wersja) albo **Zastąp wszystko** (po dodatkowym potwierdzeniu).
- Kopia obejmuje receptury, katalog składników z cenami, kategorie, uwagi, ulubione, ustawienia, zakupy i historię zmian. Szkice edytora nie są w niej zapisywane.
- Aplikacja przypomina o kopii, gdy ostatnia ma ponad 14 dni.

## Aktualizacje aplikacji

1. Zmień pliki, podbij wersję w **`sw.js`** (`VERSION = 'kucharzyna-1.0.1'`) i w **`util.js`** (`APP_VERSION = '1.0.1'`) — muszą być zgodne.
2. Wypchnij zmiany na GitHub.
3. Telefon wykryje nową wersję i pokaże: **„Nowa wersja Kucharzyny jest dostępna” → Odśwież**. Ręcznie: Ustawienia → Sprawdź aktualizacje.

Service worker pobiera pliki z sieci w pierwszej kolejności (z krótkim limitem czasu), więc po stronie telefonu nic nie „zalega” przez dni; offline używa zapisanej kopii.

## Czego aplikacja nie robi (świadomie)

- Nie ma wbudowanej bazy „wszystkich przepisów z internetu” — to wymagałoby serwera i licencji. Zamiast tego importujesz przepis, który sam znajdziesz i skopiujesz.
- Nie pobiera automatycznie stron z przepisami (chronione treści). Wklejasz tekst lub kod strony.
- Nie tłumaczy kroków przepisu offline. Nazwy składników i jednostki są słownikowo zamieniane na polskie; resztę przetłumaczysz przyciskiem „Przetłumacz (Google)”, który otwiera zewnętrzną stronę.
- Ceny w przykładowych recepturach to wartości przykładowe — ustaw własne.

## Prywatność

Brak kont, reklam, analityki i śledzenia. Internet jest używany wyłącznie wtedy, gdy sam otworzysz wyszukiwarkę Google lub Google Tłumacz, albo gdy aplikacja sprawdza własne aktualizacje na hostingu, z którego jest serwowana.


<!-- CI verification -->
