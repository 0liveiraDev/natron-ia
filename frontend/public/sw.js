const CACHE_NAME = 'natron-ia-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
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
    const url = new URL(event.request.url);
    
    // FORBID caching of API and dynamic uploads
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
        return; // Let browser handle normally (Network Only)
    }

    // Cache-first for hashed build assets (JS/CSS with content hash in filename)
    if (url.pathname.startsWith('/assets/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for HTML and other resources
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
