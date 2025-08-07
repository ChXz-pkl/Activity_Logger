// Nama cache dan file-file yang akan disimpan untuk mode offline
const CACHE_NAME = 'activity-logger-v5'; // VERSI NAIK LAGI UNTUK MEMAKSA UPDATE
const urlsToCache = [
  '/',
  'index.html',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Proses Instalasi: Menyimpan aset untuk offline
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache v4 dibuka, menyimpan aset...');
        return cache.addAll(urlsToCache);
      })
  );
  // Perintahkan SW baru untuk tidak menunggu, langsung aktif.
  self.skipWaiting();
});

// 2. Proses Aktivasi: Membersihkan cache LAMA dan mengambil alih kontrol
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW v4: Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        console.log('SW v4: Mengambil alih kontrol semua klien.');
        // INI KUNCINYA: Paksa semua tab/jendela yang terbuka untuk menggunakan SW baru ini.
        return self.clients.claim();
      });
    })
  );
});

// 3. Proses Fetch: Strategi Cache-First
self.addEventListener('fetch', event => {
  // Abaikan permintaan selain GET atau ke Firebase
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika ada di cache, langsung berikan
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak, ambil dari internet dan simpan ke cache
        return fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
        );
      }).catch(error => {
          console.log('Fetch gagal, pengguna mungkin sedang offline.', error);
      })
  );
});
