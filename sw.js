// 1. NAIKKAN VERSI CACHE INI
const CACHE_NAME = 'activity-logger-v10'; 

// 2. TAMBAHKAN SCRIPT SORTABLEJS KE DALAM DAFTAR CACHE
const urlsToCache = [
  '/',
  'index.html',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js' // <-- BARIS BARU
];

// Proses Instalasi
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

// Proses Aktivasi
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

// Proses Fetch
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


// Event listener untuk klik notifikasi
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