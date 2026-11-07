/* Holy Bible's service worker: what lets the installed app open and read with no internet.
 *
 * Generated per build (vite.config.ts fills in SHELL and the versions), so each release knows its
 * own files exactly and an update is simply a new worker.
 *
 *  - The app itself (SHELL) is cached whole on install, under a name that changes every release;
 *    the previous release's copy is deleted once the new one takes over.
 *  - Bible text (data/) is cached a book at a time as it is read, or all at once by "Save for
 *    offline", in a cache that survives app updates: the text does not change when the app does.
 *    DATA_VERSION changes only if the exported text itself changes.
 *  - A new release waits until the reader taps Refresh (the page posts SKIP_WAITING), so nobody
 *    is reloaded in the middle of a chapter.
 */
const SHELL = ["./","./assets/index-COuA6Zb2.js","./assets/index-DNvs9Y98.css","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png","./data/meta.json"]
const SHELL_CACHE = 'shell-' + "802f0bc63a1f"
const DATA_CACHE = 'data-' + "6ef26eac0933"

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  // Any page load is the app: answer it from the cached index so the app opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(new URL('./', self.registration.scope).href, { cacheName: SHELL_CACHE })
        .then((hit) => hit || fetch(request)),
    )
    return
  }

  const isData = url.pathname.includes('/data/') && !url.pathname.endsWith('/meta.json')
  const cacheName = isData ? DATA_CACHE : SHELL_CACHE
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: true })
      if (hit) return hit
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    }),
  )
})
