const CACHE_NAME = 'cfa-dashboard-v2'; // 升級為 V2 版本

const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// 1. 安裝階段：強制立刻接管
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 啟動階段：無情刪除舊版本快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 清除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 攔截請求：改採「網路優先 (Network First)」策略
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果網路抓取成功，順便把最新版存入快取，以備未來離線使用
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 只有在「沒有網路」或「伺服器掛掉」時，才退回使用快取
        return caches.match(event.request);
      })
  );
});