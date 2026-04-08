// Basic Service Worker for PWA compliance and offline support
const CACHE_NAME = 'natron-ia-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Network-first strategy to prevent infinite loading loops with outdated index.html
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Return fresh network response
                return response;
            })
            .catch(() => {
                // On failure (offline), fallback to cache
                return caches.match(event.request);
            })
    );
});
