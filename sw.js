/* ==========================================================================
   Kucharek — service worker
   Strategia: network-first z krótkim limitem czasu i cache jako zapasem.
   Dzięki temu online zawsze dostajesz świeże pliki (brak „starej wersji
   przez kilka dni”), a offline aplikacja otwiera się z pamięci podręcznej.
   Nowa wersja NIE przejmuje aplikacji po cichu: strona pokazuje „Odśwież”
   i dopiero wtedy wysyła SKIP_WAITING.

   ZMIANA WERSJI: podbij VERSION (i APP_VERSION w util.js) przy każdej
   aktualizacji plików, żeby urządzenia wykryły nową wersję.
   ========================================================================== */
const VERSION = 'kucharek-claude-1.3.98';
const NETWORK_TIMEOUT = 3500;

const CORE = [
  './',
  'index.html',
  'styles.css', 'styles-34e.css', 'styles-ai.css', 'styles-34f.css', 'styles-43a.css', 'styles-58.css',
  'manifest.webmanifest',
  'app.js', 'ai.js', 'views-ai.js', 'router.js', 'pwa.js', 'ui.js', 'util.js', 'db.js', 'recipes.js', 'calculator.js', 'importer.js', 'backup.js',
  'components.js', 'shopping.js', 'inventory.js', 'barcode-decoder.js', 'barcode-scanner.js', 'pro.js', 'pro-calculators.js',
  'history.js', 'timers.js', 'kitchen.js', 'views-history.js', 'views-start.js', 'views-cook-hub.js', 'views-recipes.js', 'views-detail.js', 'views-editor.js', 'views-cook.js', 'views-calc.js', 'views-import.js', 'views-settings.js', 'views-inventory.js', 'views-pro-fixed.js',
  'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
  'assets/start/pizza.svg', 'assets/start/pasta.svg', 'assets/start/bakery.svg', 'assets/start/veg.svg', 'assets/ingredient-icons.svg',
      'recipe-library.js', 'recipe-translation.js', 'recipe-library-data/index.js', 'recipe-library-data/part-01.js', 'recipe-library-data/part-02.js', 'recipe-library-data/part-03.js', 'recipe-library-data/part-04.js', 'recipe-library-data/part-05.js', 'recipe-library-data/part-06.js', 'recipe-library-data/part-07.js', 'recipe-library-data/part-08.js', 'recipe-library-data/part-09.js', 'theme-init.js',
];



const scopeUrl = (p) => new URL(p, self.registration.scope).href;
const INDEX = () => scopeUrl('index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // cache:'reload' omija pamięć HTTP przeglądarki — w cache lądują świeże pliki.
    await cache.addAll(CORE.map((p) => new Request(scopeUrl(p), { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('kucharek-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') self.skipWaiting();
  else if (msg.type === 'GET_VERSION' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

/** Sieć najpierw (z limitem czasu, gdy mamy kopię), potem pamięć podręczna. */
async function networkFirst(event, url, cacheKey) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(cacheKey, { ignoreSearch: true });

  const net = fetch(url, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok && res.type !== 'opaque') cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  });

  if (!cached) return net;                       // brak kopii — czekamy na sieć
  event.waitUntil(net.catch(() => {}));          // dokończ aktualizację cache w tle

  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT));
  try {
    const res = await Promise.race([net, timeout]);
    return res && res.ok ? res : cached;         // 404/500 z sieci → lepsza kopia
  } catch (_) {
    return cached;                               // offline
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFoodImage=url.hostname==='images.unsplash.com' || url.hostname==='photoshop-api.adobe.io';
  if(isFoodImage){
    event.respondWith((async()=>{
      const cache=await caches.open(VERSION);
      const hit=await cache.match(req);
      if(hit)return hit;
      try{
        const res=await fetch(req);
        if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone()).catch(()=>{});
        return res;
      }catch(_){return (await cache.match(req))||Response.error();}
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;   // nic spoza własnej domeny

  if (req.mode === 'navigate') {
    // Aplikacja jednostronicowa (trasy po #): każda nawigacja = index.html.
    event.respondWith(networkFirst(event, INDEX(), INDEX()).catch(async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match(INDEX())) || Response.error();
    }));
    return;
  }
  event.respondWith(networkFirst(event, req.url, req.url).catch(async () => {
    const cache = await caches.open(VERSION);
    return (await cache.match(req, { ignoreSearch: true })) || Response.error();
  }));
});
