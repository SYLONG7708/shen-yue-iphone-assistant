const cacheName = "shen-yue-assistant-v256-evergreen-native-core";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./native-bridge.js",
  "./updates.json",
  "./shen-yue-assistant-content.json",
  "./manifest.webmanifest",
  "./update-uploader/index.html",
  "./update-uploader/styles.css",
  "./update-uploader/app.js",
  "./replay-center/index.html",
  "./replay-center/compat-app.js",
  "./replay-center/watch/index.html",
  "./replay-center/remote-config.json",
  "./replay-center/native-config.json",
  "./replay-center/manifest.webmanifest",
  "./replay-center/favicon.svg",
  "./assets/app-logo.png",
  "./assets/update-splash.png",
  "./assets/sy-product-icons.png",
  "./assets/hero-car-audio.png",
  "./assets/icon-car-android.png",
  "./assets/icon-360-camera.png",
  "./assets/icon-dashcam.png",
  "./assets/icon-car-audio.png",
  "./assets/icon-tailgate.png",
  "./assets/icon-blind-spot.png",
  "./assets/qr-line.png",
  "./assets/qr-phone.png",
  "./assets/product-android.jpg",
  "./assets/product-360.png",
  "./assets/audio-case.jpg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isMutableConfig = /\/(?:remote|native)-config\.json$/.test(requestUrl.pathname);
  if (isMutableConfig) {
    const stableKey = requestUrl.origin + requestUrl.pathname;
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && requestUrl.origin === location.origin) {
          caches.open(cacheName).then((cache) => cache.put(stableKey, response.clone()));
        }
        return response;
      }).catch(() => caches.match(stableKey))
    );
    return;
  }

  const hasEphemeralCacheBuster = requestUrl.searchParams.has("_apk_live")
    || requestUrl.searchParams.has("_evergreen");
  const stableRequestKey = hasEphemeralCacheBuster
    ? requestUrl.origin + requestUrl.pathname
    : event.request;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok && requestUrl.origin === location.origin) {
        const responseCopy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(stableRequestKey, responseCopy));
      }
      return response;
    }).catch(() => caches.match(stableRequestKey))
  );
});
