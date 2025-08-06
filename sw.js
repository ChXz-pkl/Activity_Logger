// Nama cache dan file-file yang akan disimpan
const CACHE_NAME = 'activity-logger-v1';
const urlsToCache = [
  '/',
  'index.html',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'https://cdn.tailwindcss.com', // Cache library Tailwind
  'https://cdn.jsdelivr.net/npm/chart.js' // Cache library Chart.js
];

// 1. Proses Instalasi: membuka cache dan menyimpan file-file inti
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Memaksa service worker baru untuk aktif
});

// 2. Proses Aktivasi: membersihkan cache lama jika ada
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Proses Fetch: mencegat permintaan jaringan
self.addEventListener('fetch', event => {
  // Hanya proses permintaan GET
  if (event.request.method !== 'GET') return;
  
  // Strategi: Cache-First
  // Coba cari di cache dulu, jika tidak ada baru ke jaringan.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Jika ada di cache, langsung kembalikan dari cache
          return response;
        }
        // Jika tidak ada, coba ambil dari jaringan
        return fetch(event.request);
      })
  );
});