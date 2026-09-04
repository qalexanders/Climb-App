// ============================================================================
// WHAT THIS FILE DOES
//   Keeps a copy of the app on the phone. After the first visit the app opens
//   with no signal, in a canyon, or in airplane mode. This file holds no climb
//   records. It holds the page only.
//
// INPUTS
//   Every request that the app makes for one of its own files.
//
// OUTPUTS
//   The file from the copy on the phone. When the copy has no such file, the
//   worker gets it from the network and keeps it.
//
// SIDE EFFECTS
//   Makes a cache on the phone with the name in CACHE_NAME.
//
// FAILURE MODES
//   The first visit fails when the phone has no signal, because the copy does
//   not exist yet. Every later visit works with no signal.
//
// ASSUMPTIONS
//   The file index.html is beside this file on the server.
//
// TRACEABILITY
//   Personal climbing log. No requirement document.
//
// OWNER
//   The person who climbs.
// ============================================================================

// Change this name after each edit of index.html. A new name makes the phone
// get the new page. The old cache is then removed on activation.
const CACHE_NAME = "climb-log-version-4";

const APP_FILE_ADDRESSES = ["./", "./index.html"];

// On install, get the app and keep it.
self.addEventListener("install", function handleInstall(installEvent) {
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then(function addFiles(cache) {
      return cache.addAll(APP_FILE_ADDRESSES);
    }).then(function startAtOnce() {
      return self.skipWaiting();
    })
  );
});

// On activation, remove the cache of an older version.
self.addEventListener("activate", function handleActivate(activateEvent) {
  activateEvent.waitUntil(
    caches.keys().then(function removeOldCaches(cacheNames) {
      return Promise.all(cacheNames.filter(function isOldCache(cacheName) {
        return cacheName !== CACHE_NAME;
      }).map(function removeOne(cacheName) {
        return caches.delete(cacheName);
      }));
    }).then(function controlOpenPages() {
      return self.clients.claim();
    })
  );
});

// Answer each request from the copy first. The app has no live data, so the
// copy is always correct, and this makes the app open with no signal.
self.addEventListener("fetch", function handleFetch(fetchEvent) {
  if (fetchEvent.request.method !== "GET") {
    return;
  }
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(function answerFromCache(cachedResponse) {
      if (cachedResponse !== undefined) {
        return cachedResponse;
      }
      return fetch(fetchEvent.request).catch(function reportOffline() {
        // The file is not in the copy and the phone has no signal. An error
        // response is better than a promise that never settles.
        return new Response("This file is not available offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});
