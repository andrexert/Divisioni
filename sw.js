/*
 * Service worker: conserva una copia di tutti i file dell'app nel browser,
 * così dopo la prima apertura "Impariamo insieme" funziona anche senza rete.
 *
 * VERSIONE e FILE vengono riempiti automaticamente da tools/prepara_sito.py
 * al momento della pubblicazione: ogni pubblicazione ha una versione nuova,
 * il browser scarica i file aggiornati e cancella la copia vecchia.
 *
 * Strategia "prima la copia locale": l'app si apre subito anche con una rete
 * lenta. Quando arriva una versione nuova, questo service worker la scarica
 * e prende subito il controllo; app.js ricarica la pagina appena si è sul menu,
 * mai a metà di un esercizio.
 */
var VERSIONE = 'sviluppo';
var FILE = ['./', 'index.html'];

var CACHE = 'impariamo-' + VERSIONE;

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FILE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nomi) {
      return Promise.all(nomi.map(function (nome) {
        if (nome.indexOf('impariamo-') === 0 && nome !== CACHE) return caches.delete(nome);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (evento) {
  var richiesta = evento.request;
  if (richiesta.method !== 'GET' || new URL(richiesta.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(richiesta, { ignoreSearch: true }).then(function (copia) {
      return copia || fetch(richiesta);
    })
  );
});
