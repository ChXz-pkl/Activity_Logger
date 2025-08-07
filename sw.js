// NAIKKAN VERSI INI KARENA ADA PERUBAHAN FUNGSI DI SERVICE WORKER
const CACHE_NAME = 'activity-logger-v9'; 
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

// 1. Proses Instalasi: (Tidak ada perubahan logika)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`Cache '${CACHE_NAME}' dibuka, menyimpan aset...`);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. Proses Aktivasi: (Tidak ada perubahan logika)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`SW: Menghapus cache lama: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        console.log(`SW '${CACHE_NAME}' aktif dan mengambil alih kontrol.`);
        return self.clients.claim();
      });
    })
  );
});

// 3. Proses Fetch: (Tidak ada perubahan logika)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          if(networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});


/**
 * =================================================================
 * PENAMBAHAN BARU DI BAGIAN INI
 * =================================================================
 * Event listener ini akan berjalan ketika notifikasi di-klik oleh pengguna.
 */
self.addEventListener('notificationclick', event => {
  // Tutup notifikasi yang di-klik
  event.notification.close();

  // Ambil URL yang kita simpan di 'data' saat membuat notifikasi
  const urlToOpen = event.notification.data.url;

  // Cek apakah ada tab aplikasi yang sudah terbuka
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Jika sudah ada tab yang terbuka, fokus ke tab tersebut
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada tab yang terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
