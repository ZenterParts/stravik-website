/* Stravik Site Visits: offline shell. Files are served from the phone first (works with no signal),
   and refreshed in the background whenever there is a connection, so the next launch has the new version. */
var CACHE = 'stravik-visits-v2';
var SHELL = [
  '/visits/', '/visits/app.js', '/visits/manifest.webmanifest',
  '/admin/vendor/supabase-2.57.4.min.js',
  '/assets/fonts/fonts.css', '/assets/fonts/InstrumentSans-Latin.woff2', '/assets/fonts/SairaSemiCondensed-SemiBold.woff2', '/assets/fonts/SairaSemiCondensed-Bold.woff2',
  '/assets/img/logo-wordmark.webp', '/assets/icons/stravik-192.png', '/assets/icons/stravik-180.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('stravik-visits-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  var key = url.pathname === '/visits/index.html' ? '/visits/' : url.pathname;
  if (SHELL.indexOf(key) < 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(key).then(function (hit) {
      var fresh = fetch(new Request(key, { cache: 'no-cache' })).then(function (res) { if (res && res.ok) c.put(key, res.clone()); return res; });
      if (hit) { fresh.catch(function () {}); return hit; }
      return fresh;
    });
  }));
});
