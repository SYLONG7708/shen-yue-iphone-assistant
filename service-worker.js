const cacheName = "shen-yue-assistant-v207-warranty-cleanup";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./updates.json",
  "./manifest.webmanifest",
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

  event.respondWith(
    fetch(event.request).then((response) => {
      const requestUrl = new URL(event.request.url);
      if (response.ok && requestUrl.origin === location.origin) {
        const responseCopy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, responseCopy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
