// Nama cache dan file-file yang akan disimpan untuk mode offline
const CACHE_NAME = 'activity-logger-v4'; // VERSI DIUBAH UNTUK MEMAKSA UPDATE
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
        console.log('Cache v3 dibuka, mulai menyimpan aset untuk offline...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Gagal saat proses caching awal:', err);
      })
  );
  // Memaksa service worker baru untuk segera aktif
  self.skipWaiting();
});

// 2. Proses Aktivasi: Membersihkan cache LAMA
self.addEventListener('activate', event => {
  // Hapus semua cache yang tidak sesuai dengan CACHE_NAME yang baru (v3)
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
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
