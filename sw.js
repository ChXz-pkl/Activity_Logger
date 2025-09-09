const CACHE_NAME = 'activity-logger-v11';

// Pisahkan file lokal dan file dari CDN
const localUrlsToCache = [
  '/',
  'index.html',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
];

const cdnUrlsToCache = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

// Proses Instalasi (dengan logika baru)
self.addEventListener('install', event => {
  console.log(`SW: Proses instalasi untuk cache '${CACHE_NAME}' dimulai...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 1. Cache file-file lokal seperti biasa
      const cacheLocalPromise = cache.addAll(localUrlsToCache);
      console.log('SW: Meng-cache aset lokal...');

      // 2. Cache file-file CDN satu per satu dengan mode 'no-cors'
      const cacheCdnPromises = cdnUrlsToCache.map(url => {
        const request = new Request(url, { mode: 'no-cors' });
        return fetch(request).then(response => {
          console.log(`SW: Meng-cache aset CDN: ${url}`);
          return cache.put(request, response);
        }).catch(err => {
          console.warn(`SW: Gagal meng-cache ${url}`, err);
        });
      });

      // Tunggu semua proses caching selesai
      return Promise.all([cacheLocalPromise, ...cacheCdnPromises]);
    }).then(() => {
      console.log('SW: Semua aset berhasil di-cache. Proses instalasi selesai.');
      return self.skipWaiting();
    })
  );
});

// Proses Aktivasi (tetap sama)
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

// Proses Fetch (tetap sama)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, kembalikan dari cache
        if (response) {
          return response;
        }
        // Jika tidak, ambil dari jaringan
        return fetch(event.request);
      })
  );
});

// Event listener untuk klik notifikasi (tetap sama)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});