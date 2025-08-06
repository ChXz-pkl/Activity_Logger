// Nama cache dan file-file yang akan disimpan untuk mode offline
const CACHE_NAME = 'activity-logger-v3'; // Versi cache dinaikkan untuk memicu update
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

// 1. Proses Instalasi: DIBUAT LEBIH TANGGUH
// Menyimpan file satu per satu, bukan sekaligus.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka, mulai menyimpan aset untuk offline...');
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
  // Hapus semua cache yang tidak sesuai dengan CACHE_NAME yang baru
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

// 3. Proses Fetch: Strategi Cache-First yang Jelas
self.addEventListener('fetch', event => {
  // Abaikan permintaan selain GET (misal: POST ke Firebase)
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    // Coba cari di cache terlebih dahulu
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika ada di cache, langsung berikan (ini yang membuat offline bisa)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, ambil dari internet
        return fetch(event.request).then(networkResponse => {
            // Setelah berhasil diambil, simpan ke cache untuk penggunaan berikutnya
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              // Kembalikan respons dari jaringan
              return networkResponse;
            });
          }
        );
      }).catch(error => {
          console.log('Fetch gagal, pengguna mungkin sedang offline.', error);
          // Di sini Anda bisa menambahkan halaman fallback jika mau,
          // tapi untuk sekarang biarkan saja.
      })
  );
});
