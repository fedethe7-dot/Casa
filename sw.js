// Cambia la versione a ogni aggiornamento, così il telefono scarica la nuova.
const CACHE = "hub-v9";
const FILES = ["./", "index.html", "ecosistema.js", "sistema.js", "blocco.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "sfondo.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Prima la rete (per vedere subito le novità), se manca internet usa la copia salvata.
self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
