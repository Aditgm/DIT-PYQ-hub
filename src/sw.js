import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Precache all build assets (injected at build time)
precacheAndRoute(self.__WB_MANIFEST)

// Clean up old caches
cleanupOutdatedCaches()

// Immediately claim all clients
clientsClaim()

// ── Custom update activation ──────────────────────────────────────
// Activate the new service worker immediately so clients don't remain
// pinned to stale bundles (for example, old API URL logic).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Navigation fallback ──────────────────────────────────────────
// All navigation requests (SPA routes) fall back to index.html
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'))
)

// ── Runtime caching ──────────────────────────────────────────────

// Supabase REST API — network-first
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 300 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
    networkTimeoutSeconds: 5,
  })
)

// Supabase Auth — network-first
registerRoute(
  /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-auth',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
    networkTimeoutSeconds: 3,
  })
)

// Cloudinary assets — cache-first
registerRoute(
  /^https:\/\/res\.cloudinary\.com\/.*/i,
  new CacheFirst({
    cacheName: 'cloudinary-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Google Fonts stylesheets — stale-while-revalidate
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Google Fonts files — cache-first
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 31536000 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Cloudinary API (uploads) — network-only
registerRoute(
  /^https:\/\/api\.cloudinary\.com\/.*/i,
  new NetworkOnly({
    cacheName: 'cloudinary-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)
