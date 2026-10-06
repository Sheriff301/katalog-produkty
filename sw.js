const CACHE_NAME = 'taryfikator-v1';
const assets = [
  'index.html',
  'manifest.json'
];

// Instalacja Service Workera i zapis plików w pamięci telefonu
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Odbieranie żądań – pobieranie z pamięci podręcznej, gdy brak sieci
self.addEventListener('fetch', (e) => {
  e.respondId = true;
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
