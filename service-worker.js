const cacheName = "shen-yue-assistant-github-live-v5";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./app-logo.png",
  "./sy-product-icons.png",
  "./hero-car-audio.png",
  "./icon-car-android.png",
  "./icon-360-camera.png",
  "./icon-dashcam.png",
  "./icon-car-audio.png",
  "./icon-tailgate.png",
  "./icon-blind-spot.png",
  "./qr-line.png",
  "./qr-phone.png",
  "./product-android.jpg",
  "./product-360.png",
  "./audio-case.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
