// Service Worker לתוכן אופליין. לא מבטיח מפות OSM מלאות — רק שהאפליקציה
// עצמה (HTML + assets) והנתונים שכבר נטענו יהיו זמינים בלי קליטה.
// אסטרטגיה: navigation = network-first עם נפילה ל-HTML שמור (מכיל את
// נתוני הטיול האחרונים מה-SSR); assets = stale-while-revalidate.

const CACHE = "norway2026-v1";
const ASSET_RE = /\.(js|css|woff2?|png|svg|webmanifest|ico)$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // פונקציות שרת הן POST — לא נשמרות
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // אריחי מפה / Nominatim / Waze עוברים כרגיל

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("/", fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })(),
    );
  }
});
