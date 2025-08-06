// Nama cache dan file-file yang akan disimpan untuk mode offline
const CACHE_NAME = 'activity-logger-v1';
const urlsToCache = [
  '/',
  'index.html',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'https://cdn.tailwindcss.com', // Cache library Tailwind CSS
  'https://cdn.jsdelivr.net/npm/chart.js' // Cache library Chart.js
];

// 1. Proses Instalasi: membuka cache dan menyimpan file-file inti
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka dan file-file inti disimpan');
        return cache.addAll(urlsToCache);
      })
  );
  // Memaksa service worker baru untuk segera aktif
  self.skipWaiting(); 
});

// 2. Proses Aktivasi: membersihkan cache lama jika ada versi baru
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika nama cache tidak ada di whitelist, hapus
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Proses Fetch: mencegat permintaan jaringan dan menyajikannya dari cache jika memungkinkan
self.addEventListener('fetch', event => {
  // Hanya proses permintaan GET, abaikan yang lain (misal: POST ke Firebase)
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
