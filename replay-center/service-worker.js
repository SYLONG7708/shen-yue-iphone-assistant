const CACHE_NAME = 'replay-center-v26-evergreen-native-core'
const STATIC_ASSETS = ['./', './index.html', './compat-app.js', '../native-bridge.js', './remote-config.json', './native-config.json', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const requestUrl = new URL(request.url)
  if (/\/(?:remote|native)-config\.json$/.test(requestUrl.pathname)) {
    const stableKey = requestUrl.origin + requestUrl.pathname
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(stableKey, response.clone()))
          return response
        })
        .catch(() => caches.match(stableKey)),
    )
    return
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})
