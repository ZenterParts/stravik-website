/* Stravik Site Visits: phone app for field sales (installed from stravikparts.com/visits/).
   A visit = start at a site (GPS fix + live camera photo), end when leaving (time + GPS), then a short visit report:
   how it went, whether a follow-up is needed (with an optional date), a summary and photos.
   Everything is saved on the phone first (IndexedDB) and sent to Supabase "Master Data" when there is a connection:
   tables stravik_visit_sites, stravik_visits, stravik_visit_photos and the private bucket stravik-visit-photos.
   Sign-in is the normal Stravik staff account. A salesperson only ever sees their own visits (row level security);
   distance from the site and the flags are worked out by the database, not by this app. */
(function () {
  'use strict';
  var SB_URL = 'https://kyegujgvlsbttyrlibgn.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZWd1amd2bHNidHR5cmxpYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTQ4NjUsImV4cCI6MjEwNjgzMDg2NX0.qw8n7Y9l8zO-npZ4BDlqK9PvksRQpEVg6BxqEo_MnWs';   // public (anon) key: on its own it cannot read anything
  var BUCKET = 'stravik-visit-photos';
  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

  var COUNTRIES = ['Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Congo (Brazzaville)', 'Congo (DRC)', "Côte d'Ivoire", 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe', 'Other'];
  var OUTCOME = { proceed: 'Moving forward', in_progress: 'In discussion', no_business: 'Not at this time' };

  var user = null;          // { id, email }
  var needLogin = false;    // signed-in session expired: visits are kept on the phone until the next sign-in
  var lastSyncError = null;

  // ---------------------------------------------------------------- helpers
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var toastT;
  function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 4200); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  function hm(iso) { var d = new Date(iso); return two(d.getHours()) + ':' + two(d.getMinutes()); }
  function day(iso) { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function stamp(d) { return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }
  function dur(a, b) { var m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + two(m % 60) + ' min'; }
  function ymd(d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function place(s) { return [s.city, s.country].filter(Boolean).join(', '); }
  var LS = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };

  // ---------------------------------------------------------------- storage on the phone
  var dbp;
  function db() {
    if (!dbp) dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('stravik-visits', 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        d.createObjectStore('sites', { keyPath: 'id' });
        d.createObjectStore('visits', { keyPath: 'id' });
        d.createObjectStore('photos', { keyPath: 'id' }).createIndex('visit', 'visit_id');
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), out, rq = fn(t.objectStore(store));
        if (rq) rq.onsuccess = function () { out = rq.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error || new Error('Phone storage error')); };
      });
    });
  }
  var idb = {
    all: function (s) { return tx(s, 'readonly', function (o) { return o.getAll(); }); },
    put: function (s, v) { return tx(s, 'readwrite', function (o) { return o.put(v); }); },
    get: function (s, k) { return tx(s, 'readonly', function (o) { return o.get(k); }); },
    del: function (s, k) { return tx(s, 'readwrite', function (o) { return o.delete(k); }); },
    // read, change and write one record in a single step, so the app and the background sending never overwrite each other
    patch: function (s, k, fn) {
      return db().then(function (d) {
        return new Promise(function (res, rej) {
          var t = d.transaction(s, 'readwrite'), o = t.objectStore(s), out, g = o.get(k);
          g.onsuccess = function () { out = g.result; if (out) { fn(out); o.put(out); } };
          t.oncomplete = function () { res(out); };
          t.onerror = t.onabort = function () { rej(t.error || new Error('Phone storage error')); };
        });
      });
    },
    photosOf: function (id) { return tx('photos', 'readonly', function (o) { return o.index('visit').getAll(id); }); }
  };
  var mine = function (x) { return user && x.user_id === user.id; };
  async function myVisits() { return (await idb.all('visits')).filter(mine).sort(function (a, b) { return a.check_in_at < b.check_in_at ? 1 : -1; }); }
  async function openVisit() { return (await myVisits()).find(function (v) { return !v.check_out_at; }) || null; }

  // ---------------------------------------------------------------- location
  // keeps listening while a screen needs it; current() is the most accurate fix of the last two minutes
  var Loc = {
    id: null, fixes: [], err: null, cb: null,
    start: function (cb) {
      this.stop(); this.cb = cb || function () {}; this.fixes = []; this.err = null;
      var self = this;
      if (!navigator.geolocation) { this.err = 'none'; this.cb(); return; }
      this.id = navigator.geolocation.watchPosition(function (p) {
        self.err = null;
        self.fixes.push({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: Date.now() });
        if (self.fixes.length > 30) self.fixes.shift();
        self.cb();
      }, function (e) {
        self.err = e.code === 1 ? 'denied' : (self.current() ? null : 'weak');
        self.cb();
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    },
    stop: function () { if (this.id != null && navigator.geolocation) navigator.geolocation.clearWatch(this.id); this.id = null; },
    current: function () {
      var now = Date.now(), r = this.fixes.filter(function (f) { return now - f.at < 120000; });
      return r.length ? r.reduce(function (a, b) { return b.acc < a.acc ? b : a; }) : null;
    }
  };
  // one fix for the end of a visit: waits up to `wait` ms, stops early once it is accurate enough
  function locateOnce(wait, onUpdate) {
    return new Promise(function (res) {
      var done = false;
      function fin() { if (done) return; done = true; clearTimeout(t); var f = Loc.current(), e = Loc.err; Loc.stop(); res({ fix: f, err: e }); }
      var t = setTimeout(fin, wait);
      Loc.start(function () {
        var f = Loc.current(); if (onUpdate) onUpdate(f, Loc.err);
        if (Loc.err === 'denied' || Loc.err === 'none' || (f && f.acc <= 30)) fin();
      });
    });
  }
  function locHelp(err) {
    if (err === 'denied') return 'Location is blocked for this app. Open your phone settings, allow location for this site, then come back.';
    if (err === 'none') return 'This phone or browser cannot share its location.';
    return 'No GPS signal yet. Turn on Location and step outside or near a window.';
  }

  // ---------------------------------------------------------------- camera (live camera only: photos cannot come from the gallery)
  var Cam = { stream: null, facing: 'environment', lines: null, done: null, shot: null };
  async function camStart() {
    camStop();
    $('camNote').hidden = true;
    try {
      Cam.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: Cam.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      $('camVideo').srcObject = Cam.stream;
      await $('camVideo').play().catch(function () {});
    } catch (e) {
      $('camNote').textContent = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
        ? 'The camera is blocked for this app. Open your phone settings, allow the camera for this site, then try again.'
        : 'The camera could not be opened. Close other apps that use the camera and try again.';
      $('camNote').hidden = false;
    }
  }
  function camStop() { if (Cam.stream) Cam.stream.getTracks().forEach(function (t) { t.stop(); }); Cam.stream = null; $('camVideo').srcObject = null; }
  function camReview(on) { $('camVideo').hidden = on; $('camShot').hidden = !on; $('camLive').hidden = on; $('camReview').hidden = !on; }
  // lines() returns the text printed on the photo at the moment it is taken; done(photo) receives { blob, thumb, taken_at, fix }
  function openCamera(lines, getFix, done) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('This browser cannot open the camera. Use Chrome on Android or Safari on iPhone.'); return; }
    Cam.lines = lines; Cam.getFix = getFix; Cam.done = done; Cam.shot = null;
    $('cam').hidden = false; camReview(false); camStart();
  }
  function closeCamera() { camStop(); $('cam').hidden = true; if (Cam.shot && Cam.shot.url) URL.revokeObjectURL(Cam.shot.url); Cam.shot = null; }
  function scaled(src, w, h, max) { var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c; }
  async function camSnap() {
    var v = $('camVideo'); if (!Cam.stream || !v.videoWidth) return;
    var now = new Date(), fix = Cam.getFix ? Cam.getFix() : null;
    var c = scaled(v, v.videoWidth, v.videoHeight, 1280), g = c.getContext('2d');
    var text = Cam.lines(now, fix), fs = Math.max(15, Math.round(Math.min(c.width, c.height) / 22)), pad = Math.round(fs * 0.7), lh = Math.round(fs * 1.32), h = text.length * lh + pad * 2;
    g.fillStyle = 'rgba(6,20,42,.78)'; g.fillRect(0, c.height - h, c.width, h);
    g.fillStyle = '#fff'; g.font = '600 ' + fs + 'px "Instrument Sans", Arial, sans-serif'; g.textBaseline = 'top';
    text.forEach(function (t, i) { g.fillText(t, pad, c.height - h + pad + i * lh, c.width - pad * 2); });
    var blob = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.72); });
    if (!blob) { toast('The photo could not be saved. Try again.'); return; }
    var thumb = scaled(c, c.width, c.height, 200).toDataURL('image/jpeg', 0.6);
    Cam.shot = { blob: blob, thumb: thumb, taken_at: now.toISOString(), fix: fix, url: URL.createObjectURL(blob) };
    $('camShot').src = Cam.shot.url; camReview(true); camStop();
  }
  $('camSnap').addEventListener('click', camSnap);
  $('camCancel').addEventListener('click', closeCamera);
  $('camFlip').addEventListener('click', function () { Cam.facing = Cam.facing === 'environment' ? 'user' : 'environment'; camStart(); });
  $('camRetake').addEventListener('click', function () { if (Cam.shot) URL.revokeObjectURL(Cam.shot.url); Cam.shot = null; camReview(false); camStart(); });
  $('camUse').addEventListener('click', function () { var s = Cam.shot, done = Cam.done; Cam.shot = null; camStop(); $('cam').hidden = true; if (s) { URL.revokeObjectURL(s.url); delete s.url; done(s); } });
  // arrival photo: site, time, who and where. Photos added to the report: site and time only.
  function arrivalLines(siteName) {
    return function (now, fix) {
      return [siteName, stamp(now) + '  ' + (user ? user.email : ''), fix ? fix.lat.toFixed(5) + ', ' + fix.lng.toFixed(5) + '  ±' + fix.acc + ' m' : 'Location not available'];
    };
  }
  function reportLines(siteName) { return function (now) { return [siteName, stamp(now)]; }; }
  // a photo added during the visit or with the report
  function addPhoto(v, after) {
    Loc.start();   // a fresh fix to save with the photo, if one arrives in time
    openCamera(reportLines(v.site_name || 'Site'), function () { return Loc.current(); }, async function (p) {
      var f = p.fix; Loc.stop();
      try {
        await idb.put('photos', { id: uuid(), visit_id: v.id, user_id: user.id, kind: 'other', taken_at: p.taken_at, lat: f ? f.lat : null, lng: f ? f.lng : null, acc: f ? f.acc : null, blob: p.blob, thumb: p.thumb, synced: false });
      } catch (e) { toast('The photo could not be saved on this phone. Free up some storage and try again.'); return; }
      toast('Photo added.'); after(); sync();
    });
  }
  async function thumbsOf(id) {
    var ph = (await idb.photosOf(id)).sort(function (a, b) { return a.taken_at < b.taken_at ? -1 : 1; });
    return ph.map(function (p) { return p.thumb ? '<img src="' + p.thumb + '" alt="Visit photo">' : ''; }).join('');
  }

  // ---------------------------------------------------------------- screens
  var SCREENS = ['sHome', 'sAddSite', 'sCheckin', 'sReport'];
  function show(id) {
    $('sLogin').hidden = id !== 'sLogin';
    $('app').hidden = id === 'sLogin' || id === 'sOnSite';
    $('sOnSite').hidden = id !== 'sOnSite';
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    if (id !== 'sCheckin') Loc.stop();
    if (id !== 'sOnSite') clearInterval(timerT);
    if (id !== 'sReport') RP = null;
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-home]')) home(); });

  // ----- home: reports to complete, follow-ups, pick a site, recent visits
  var sitesCache = [];
  async function home() {
    var v = await openVisit(); if (v) return onSite(v);
    show('sHome');
    sitesCache = await idb.all('sites');
    $('siteSearch').value = '';
    await renderSites(); renderTodo(); renderHistory();
  }
  async function renderSites() {
    var q = norm($('siteSearch').value), visits = await myVisits(), last = {};
    visits.forEach(function (v) { if (!last[v.site_id]) last[v.site_id] = v.check_in_at; });
    var list = sitesCache.filter(function (s) { return !q || norm(s.name + ' ' + (s.city || '') + ' ' + (s.country || '')).indexOf(q) >= 0; });
    list.sort(function (a, b) { var x = last[a.id] || '', y = last[b.id] || ''; return x !== y ? (x < y ? 1 : -1) : a.name.localeCompare(b.name); });
    var more = list.length - 25; list = list.slice(0, 25);
    $('siteList').innerHTML = list.length
      ? '<ul class="rows">' + list.map(function (s) { return '<li><button type="button" data-site="' + esc(s.id) + '"><b>' + esc(s.name) + '</b><span>' + esc(place(s) || 'No town or country yet') + '</span></button></li>'; }).join('') + '</ul>' +
        (more > 0 ? '<p class="muted small">' + more + ' more. Type a name to narrow the list.</p>' : '')
      : '<div class="empty">' + (q ? 'No site matches “' + esc($('siteSearch').value.trim()) + '”. Add it as a new site below.' : 'No sites yet. Add the site you are visiting below.') + '</div>';
  }
  $('siteSearch').addEventListener('input', renderSites);
  $('siteList').addEventListener('click', function (e) { var b = e.target.closest('[data-site]'); if (!b) return; var s = sitesCache.find(function (x) { return x.id === b.dataset.site; }); if (s) checkin(s); });
  function fuDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  async function renderTodo() {
    var visits = await myVisits(), today = ymd(new Date()), html = '';
    var need = visits.filter(function (v) { return v.check_out_at && !v.reported_at; }).slice(0, 10);
    var fus = visits.filter(function (v) { return v.follow_up && !v.follow_up_done_at; }).sort(function (a, b) { return (a.follow_up_on || '9999') < (b.follow_up_on || '9999') ? -1 : 1; });
    if (need.length) html += '<h2>Reports to complete</h2><ul class="rows">' + need.map(function (v) {
      return '<li><button type="button" data-report="' + esc(v.id) + '"><b>' + esc(v.site_name || 'Site') + '</b><span>' + esc(day(v.check_in_at)) + ', ' + hm(v.check_in_at) + ' to ' + hm(v.check_out_at) + '. Tap to write the report.</span></button></li>';
    }).join('') + '</ul>';
    if (fus.length) html += '<h2>Follow-ups</h2><ul class="rows">' + fus.map(function (v) {
      var late = v.follow_up_on && v.follow_up_on < today;
      return '<li><div class="row"><b>' + esc(v.site_name || 'Site') + '</b><span' + (late ? ' class="due"' : '') + '>' + (v.follow_up_on ? (late ? 'Was due ' : 'Due ') + esc(fuDate(v.follow_up_on)) : 'No date set') + '</span>' +
        '<div class="acts"><button type="button" data-done="' + esc(v.id) + '">Mark as done</button>' + (v.follow_up_on ? '<button type="button" data-cal="' + esc(v.id) + '">Add to calendar</button>' : '') + '</div></div></li>';
    }).join('') + '</ul>';
    $('todo').innerHTML = html;
  }
  $('todo').addEventListener('click', async function (e) {
    var r = e.target.closest('[data-report]'), d = e.target.closest('[data-done]'), c = e.target.closest('[data-cal]');
    if (r) return report(r.dataset.report);
    if (d) { await idb.patch('visits', d.dataset.done, function (x) { x.follow_up_done_at = new Date().toISOString(); x.rev = (x.rev || 0) + 1; x.s_rep = false; }); toast('Follow-up marked as done.'); renderTodo(); sync(); return; }
    if (c) { var v = await idb.get('visits', c.dataset.cal); if (v && v.follow_up_on) calendar(v); }
  });
  async function renderHistory() {
    var visits = (await myVisits()).slice(0, 20), photos = await idb.all('photos'), waitP = {};
    photos.forEach(function (p) { if (!p.synced) waitP[p.visit_id] = true; });
    $('history').innerHTML = visits.length
      ? '<ul class="rows">' + visits.map(function (v) {
          var sent = v.s_in && (!v.check_out_at || v.s_out) && v.s_rep !== false && !waitP[v.id];
          var body = '<span class="state' + (sent ? '' : ' wait') + '">' + (sent ? 'Sent' : 'Waiting to send') + '</span><b>' + esc(v.site_name || 'Site') + '</b><span>' + esc(day(v.check_in_at)) + ', ' + hm(v.check_in_at) +
            (v.check_out_at ? ' to ' + hm(v.check_out_at) + ' (' + dur(v.check_in_at, v.check_out_at) + ')' : ', in progress') + (v.outcome ? '. ' + esc(OUTCOME[v.outcome] || '') : '') + '</span>';
          return v.check_out_at ? '<li><button type="button" data-report="' + esc(v.id) + '">' + body + '</button></li>' : '<li><div class="row">' + body + '</div></li>';
        }).join('') + '</ul>'
      : '<div class="empty">Your visits will appear here.</div>';
  }
  $('history').addEventListener('click', function (e) { var b = e.target.closest('[data-report]'); if (b) report(b.dataset.report); });

  // ----- add a site
  $('addSiteBtn').addEventListener('click', function () {
    show('sAddSite');
    var typed = $('siteSearch').value.trim(), lastC = LS.get('sv_visits_country');
    $('nsCountry').innerHTML = '<option value="">Choose a country</option>' + COUNTRIES.map(function (c) { return '<option' + (c === lastC ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    $('nsName').value = typed; $('nsCity').value = ''; $('nsContact').value = ''; $('nsPhone').value = ''; $('nsMsg').textContent = '';
    dupes(); $('nsName').focus();
  });
  function dupes() {
    var q = norm($('nsName').value), box = $('nsDupes');
    var hits = q.length < 3 ? [] : sitesCache.filter(function (s) { var n = norm(s.name); return n.indexOf(q) >= 0 || q.indexOf(n) >= 0; }).slice(0, 4);
    box.hidden = !hits.length;
    box.innerHTML = hits.length ? 'Already on the list? Tap to use it:' + hits.map(function (s) { return '<button type="button" data-site="' + esc(s.id) + '">' + esc(s.name) + (place(s) ? ' (' + esc(place(s)) + ')' : '') + '</button>'; }).join('') : '';
  }
  $('nsName').addEventListener('input', dupes);
  $('nsDupes').addEventListener('click', function (e) { var b = e.target.closest('[data-site]'); if (!b) return; var s = sitesCache.find(function (x) { return x.id === b.dataset.site; }); if (s) checkin(s); });
  $('siteForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('nsName').value.replace(/\s+/g, ' ').trim(), country = $('nsCountry').value;
    if (!name) { $('nsMsg').textContent = 'Enter the site or company name.'; $('nsName').focus(); return; }
    if (!country) { $('nsMsg').textContent = 'Choose the country.'; $('nsCountry').focus(); return; }
    var s = { id: uuid(), name: name, country: country, city: $('nsCity').value.trim() || null, contact_name: $('nsContact').value.trim() || null, contact_phone: $('nsPhone').value.trim() || null, synced: false, user_id: user.id };
    try { await idb.put('sites', s); } catch (err) { $('nsMsg').textContent = 'The site could not be saved on this phone. Free up some storage and try again.'; return; }
    LS.set('sv_visits_country', country);
    sitesCache.push(s); sync(); checkin(s);
  });

  // ----- start a visit
  var CI = null;
  function checkin(site) {
    CI = { site: site, photo: null };
    show('sCheckin');
    $('ciSite').textContent = site.name; $('ciPlace').textContent = place(site);
    $('ciPhoto').hidden = true; $('ciPhoto').removeAttribute('src');
    $('photoText').textContent = 'A photo of the site, for example the entrance or signboard.'; $('ciCam').textContent = 'Open camera';
    $('stPhoto').classList.remove('done');
    ciRender(); Loc.start(ciRender);
  }
  function ciRender() {
    if (!CI) return;
    var f = Loc.current(), st = $('stLoc');
    st.classList.toggle('done', !!f); st.classList.toggle('bad', !f && (Loc.err === 'denied' || Loc.err === 'none'));
    $('locText').textContent = f ? 'Location found, accurate to about ' + f.acc + ' m.' + (f.acc > 150 ? ' The signal is weak: step outside if you can.' : '')
      : Loc.err ? locHelp(Loc.err) : 'Finding your location…';
    $('ciGo').disabled = !(f && CI.photo);
  }
  $('ciCam').addEventListener('click', function () {
    if (!CI) return;
    openCamera(arrivalLines(CI.site.name), function () { return Loc.current(); }, function (p) {
      CI.photo = p; $('ciPhoto').src = p.thumb; $('ciPhoto').hidden = false;
      $('photoText').textContent = 'Photo taken at ' + hm(p.taken_at) + '.'; $('ciCam').textContent = 'Take it again';
      $('stPhoto').classList.add('done'); ciRender();
    });
  });
  $('ciGo').addEventListener('click', async function () {
    var f = Loc.current(); if (!CI || !CI.photo || !f) return ciRender();
    $('ciGo').disabled = true;
    var now = new Date().toISOString(), p = CI.photo, pf = p.fix || f;
    var v = { id: uuid(), user_id: user.id, site_id: CI.site.id, site_name: CI.site.name, check_in_at: now, check_in_lat: f.lat, check_in_lng: f.lng, check_in_acc: f.acc, check_out_at: null, notes: '', rev: 0, s_in: false, s_out: false };
    try {
      await idb.put('visits', v);
      await idb.put('photos', { id: uuid(), visit_id: v.id, user_id: user.id, kind: 'check_in', taken_at: p.taken_at, lat: pf.lat, lng: pf.lng, acc: pf.acc, blob: p.blob, thumb: p.thumb, synced: false });
    } catch (e) { toast('The visit could not be saved on this phone. Free up some storage and try again.'); $('ciGo').disabled = false; return; }
    CI = null; Loc.stop();
    toast('Visit started at ' + hm(now) + '.');
    onSite(v); sync();
  });

  // ----- visit in progress
  var OS = null, timerT;
  async function onSite(v) {
    OS = v; show('sOnSite');
    $('osSite').textContent = v.site_name || 'Site';
    $('osSince').textContent = 'Started ' + day(v.check_in_at) + ' at ' + hm(v.check_in_at);
    $('osNotes').value = v.notes || '';
    $('osLeave').disabled = false; $('osLeave').textContent = 'End visit';
    var tick = function () {
      var s = Math.max(0, Math.floor((Date.now() - new Date(v.check_in_at)) / 1000));
      $('osTimer').textContent = Math.floor(s / 3600) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60);
    };
    clearInterval(timerT); tick(); timerT = setInterval(tick, 1000);
    osThumbs(); setChip();
  }
  async function osThumbs() { if (OS) $('osThumbs').innerHTML = await thumbsOf(OS.id); }
  var saveNotes;
  $('osNotes').addEventListener('input', function () {
    clearTimeout(saveNotes); var v = OS, val = this.value;
    saveNotes = setTimeout(function () { if (v) idb.patch('visits', v.id, function (x) { if (!x.check_out_at) x.notes = val; }); }, 400);
  });
  $('osPhoto').addEventListener('click', function () { if (OS) addPhoto(OS, osThumbs); });
  $('osLeave').addEventListener('click', async function () {
    if (!OS) return; var id = OS.id, btn = this;
    btn.disabled = true; btn.textContent = 'Getting your location…';
    var r = await locateOnce(25000, function (f) { if (f) btn.textContent = 'Getting your location… ±' + f.acc + ' m'; });
    if (!r.fix && !confirm(locHelp(r.err) + '\n\nEnd the visit without a location? The report will show the location as missing.')) { btn.disabled = false; btn.textContent = 'End visit'; return; }
    clearTimeout(saveNotes);
    var out = new Date().toISOString(), notes = $('osNotes').value.trim(), v;
    try {
      v = await idb.patch('visits', id, function (x) {
        if (x.check_out_at) return;
        x.check_out_at = out; x.notes = notes; x.s_out = false;
        x.check_out_lat = r.fix ? r.fix.lat : null; x.check_out_lng = r.fix ? r.fix.lng : null; x.check_out_acc = r.fix ? r.fix.acc : null;
      });
    } catch (e) { toast('The visit could not be saved. Try again.'); btn.disabled = false; btn.textContent = 'End visit'; return; }
    OS = null;
    if (!v) return home();
    toast('Visit ended at ' + hm(v.check_out_at) + '. Time on site: ' + dur(v.check_in_at, v.check_out_at) + '.');
    report(v.id); sync();
  });
  $('osSync').addEventListener('click', function () { sync(true); });

  // ----- visit report
  var RP = null;
  function radio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function setRadio(name, val) { Array.prototype.forEach.call(document.querySelectorAll('input[name="' + name + '"]'), function (i) { i.checked = i.value === val; }); }
  function rpRender() {
    var o = radio('rpO'), fu = o === 'proceed' || o === 'in_progress';
    Array.prototype.forEach.call(document.querySelectorAll('#sReport .opts label'), function (l) { l.classList.toggle('on', l.querySelector('input').checked); });
    $('rpFollow').hidden = !fu; $('rpWhen').hidden = !(fu && radio('rpF') === 'yes');
  }
  async function rpThumbs() { if (RP) $('rpThumbs').innerHTML = await thumbsOf(RP.id); }
  async function report(id) {
    var v = await idb.get('visits', id); if (!v || !v.check_out_at) return home();
    show('sReport'); RP = v;
    $('rpSite').textContent = v.site_name || 'Site';
    $('rpTime').textContent = day(v.check_in_at) + ', ' + hm(v.check_in_at) + ' to ' + hm(v.check_out_at) + ' (' + dur(v.check_in_at, v.check_out_at) + ')';
    setRadio('rpO', v.outcome || ''); setRadio('rpF', v.reported_at && v.outcome !== 'no_business' ? (v.follow_up ? 'yes' : 'no') : '');
    $('rpDate').value = v.follow_up_on || ''; $('rpDate').min = ymd(new Date());
    $('rpNotes').value = v.notes || ''; $('rpMsg').textContent = '';
    rpRender(); rpThumbs();
  }
  $('reportForm').addEventListener('change', rpRender);
  $('rpPhoto').addEventListener('click', function () { if (RP) addPhoto(RP, rpThumbs); });
  $('reportForm').addEventListener('submit', async function (e) {
    e.preventDefault(); if (!RP) return;
    var o = radio('rpO'), fu = o === 'proceed' || o === 'in_progress', f = radio('rpF'), m = $('rpMsg');
    if (!o) { m.textContent = 'Choose how the visit went.'; return; }
    if (fu && !f) { m.textContent = 'Choose whether a follow-up is needed.'; return; }
    var follow = fu && f === 'yes', when = follow && $('rpDate').value ? $('rpDate').value : null, notes = $('rpNotes').value.trim();
    try {
      await idb.patch('visits', RP.id, function (x) {
        x.outcome = o; x.follow_up = follow; x.follow_up_on = when; x.notes = notes;
        if (!follow) x.follow_up_done_at = null;
        x.reported_at = x.reported_at || new Date().toISOString();
        x.rev = (x.rev || 0) + 1; x.s_rep = false;
      });
    } catch (err) { m.textContent = 'The report could not be saved on this phone. Try again.'; return; }
    toast(follow ? 'Report saved. Your follow-up is on the home screen.' : 'Report saved.');
    home(); sync();
  });
  // follow-up reminder as a calendar entry for the phone's own calendar (all-day, with an alert at 9:00)
  function calendar(v) {
    var n = new Date(v.follow_up_on + 'T00:00:00'); n.setDate(n.getDate() + 1);
    var ics = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\r?\n/g, '\\n'); };
    var title = 'Follow up: ' + (v.site_name || 'site visit');
    var text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stravik//Site Visits//EN', 'BEGIN:VEVENT', 'UID:' + v.id + '@stravikparts.com',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), 'DTSTART;VALUE=DATE:' + v.follow_up_on.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + ymd(n).replace(/-/g, ''),
      'SUMMARY:' + ics(title), 'DESCRIPTION:' + ics(v.notes || ''), 'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:' + ics(title), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var file; try { file = new File([text], 'follow-up.ics', { type: 'text/calendar' }); } catch (e) { file = new Blob([text], { type: 'text/calendar' }); }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: title }).catch(function () {}); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'follow-up.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Open the downloaded file to add it to your calendar.');
  }

  // ---------------------------------------------------------------- sending to the company
  var syncing = false, again = false;
  async function pending() {
    if (!user) return 0;
    var n = 0;
    (await idb.all('sites')).forEach(function (s) { if (s.synced === false && mine(s)) n++; });
    (await idb.all('visits')).forEach(function (v) { if (mine(v) && (!v.s_in || (v.check_out_at && !v.s_out) || (v.reported_at && v.s_rep === false))) n++; });
    (await idb.all('photos')).forEach(function (p) { if (mine(p) && !p.synced) n++; });
    return n;
  }
  async function setChip() {
    var n = await pending(), chip = $('syncChip'), text, cls = '';
    if (syncing) { text = 'Sending…'; cls = 'wait'; }
    else if (!n) text = 'All sent';
    else if (!navigator.onLine) { text = n + ' waiting, offline'; cls = 'off'; }
    else if (needLogin) { text = 'Sign in to send'; cls = 'bad'; }
    else { text = n + ' waiting'; cls = lastSyncError ? 'bad' : 'wait'; }
    chip.className = 'chip ' + cls; $('syncText').textContent = text;
    $('osSync').textContent = n ? text + (syncing ? '' : '. Tap to send now.') : 'Everything is saved to the company system.';
  }
  var dup = function (r) { return r.error && r.error.code === '23505'; };
  async function sync(manual) {
    if (!user) return;
    if (syncing) { again = true; return; }
    syncing = true; lastSyncError = null; setChip();
    try {
      if (!navigator.onLine) { if (manual) toast('No connection. Visits are saved on this phone and will be sent later.'); return; }
      var gs = await sb.auth.getSession(), s = gs.data.session;
      if (!s) { needLogin = !gs.error || !/fetch|network|retry/i.test((gs.error.name || '') + (gs.error.message || '')); if (manual) { if (needLogin) showLogin('Sign in again to send your visits. Nothing is lost.'); else toast('No connection. Visits will be sent later.'); } return; }
      if (s.user.id !== user.id) return;
      needLogin = false;

      var r, i;
      var sites = (await idb.all('sites')).filter(function (x) { return x.synced === false && mine(x); });
      for (i = 0; i < sites.length; i++) {
        var st = sites[i];
        r = await sb.from('stravik_visit_sites').insert({ id: st.id, name: st.name, country: st.country, city: st.city, contact_name: st.contact_name, contact_phone: st.contact_phone });
        if (r.error && !dup(r)) throw r.error;
        await idb.patch('sites', st.id, function (x) { x.synced = true; });
      }

      var visits = (await idb.all('visits')).filter(mine), sent = {};
      for (i = 0; i < visits.length; i++) {
        var v = visits[i];
        if (!v.s_in) {
          r = await sb.from('stravik_visits').insert({ id: v.id, site_id: v.site_id, check_in_at: v.check_in_at, check_in_lat: v.check_in_lat, check_in_lng: v.check_in_lng, check_in_accuracy_m: v.check_in_acc, notes: v.notes || null });
          if (r.error && !dup(r)) throw r.error;
          await idb.patch('visits', v.id, function (x) { x.s_in = true; });
        }
        if (v.check_out_at && !v.s_out) {
          r = await sb.from('stravik_visits').update({ check_out_at: v.check_out_at, check_out_lat: v.check_out_lat, check_out_lng: v.check_out_lng, check_out_accuracy_m: v.check_out_acc, notes: v.notes || null }).eq('id', v.id);
          if (r.error) throw r.error;
          await idb.patch('visits', v.id, function (x) { x.s_out = true; });
        }
        if (v.reported_at && v.s_rep === false) {
          r = await sb.from('stravik_visits').update({ outcome: v.outcome || null, follow_up: !!v.follow_up, follow_up_on: v.follow_up_on || null, follow_up_done_at: v.follow_up_done_at || null, reported_at: v.reported_at, notes: v.notes || null }).eq('id', v.id);
          if (r.error) throw r.error;
          await idb.patch('visits', v.id, (function (rev) { return function (x) { if ((x.rev || 0) === rev) x.s_rep = true; }; })(v.rev || 0));   // only if the report was not changed meanwhile
        }
        sent[v.id] = true;
      }

      var photos = (await idb.all('photos')).filter(function (p) { return mine(p) && !p.synced && sent[p.visit_id]; });
      for (i = 0; i < photos.length; i++) {
        var p = photos[i], path = user.id + '/' + p.visit_id + '/' + p.id + '.jpg';
        if (p.blob) {
          var up = await sb.storage.from(BUCKET).upload(path, p.blob, { contentType: 'image/jpeg', upsert: false });
          if (up.error && !/exist|duplicate/i.test(up.error.message || '') && String(up.error.statusCode || up.error.status || '') !== '409') throw up.error;
        }
        r = await sb.from('stravik_visit_photos').insert({ id: p.id, visit_id: p.visit_id, storage_path: path, kind: p.kind, taken_at: p.taken_at, lat: p.lat, lng: p.lng, accuracy_m: p.acc });
        if (r.error && !dup(r)) throw r.error;
        await idb.patch('photos', p.id, function (x) { x.synced = true; delete x.blob; });
      }
      await pull();
      if (manual) toast('Everything is sent.');
    } catch (e) {
      console.error(e); lastSyncError = e;
      if (manual) toast('Could not send right now. The app will keep trying. (' + ((e && e.message) || 'connection problem') + ')');
    } finally {
      syncing = false; await setChip();
      if (!$('sHome').hidden && !$('app').hidden) { sitesCache = await idb.all('sites'); renderSites(); renderTodo(); renderHistory(); }
      if (again) { again = false; sync(); }
    }
  }
  // the shared site list, and this person's recent visits (so a visit or report started on another phone can be finished here)
  async function pull() {
    var r = await sb.from('stravik_visit_sites').select('id,name,country,city').order('name').limit(5000);
    if (!r.error) {
      var keep = {}, local = await idb.all('sites'), i;
      for (i = 0; i < r.data.length; i++) { keep[r.data[i].id] = true; r.data[i].synced = true; await idb.put('sites', r.data[i]); }
      for (i = 0; i < local.length; i++) if (local[i].synced !== false && !keep[local[i].id]) await idb.del('sites', local[i].id);
    }
    var names = {}; (await idb.all('sites')).forEach(function (s) { names[s.id] = s.name; });
    var v = await sb.from('stravik_visits').select('id,site_id,check_in_at,check_in_lat,check_in_lng,check_in_accuracy_m,check_out_at,notes,outcome,follow_up,follow_up_on,follow_up_done_at,reported_at').eq('user_id', user.id).order('check_in_at', { ascending: false }).limit(30);
    if (v.error) return;
    var have = {}; (await idb.all('visits')).forEach(function (x) { have[x.id] = x; });
    var rep = function (x, row) { x.outcome = row.outcome; x.follow_up = row.follow_up; x.follow_up_on = row.follow_up_on; x.follow_up_done_at = row.follow_up_done_at; x.reported_at = row.reported_at; x.notes = row.notes || ''; x.s_rep = true; };
    for (var j = 0; j < v.data.length; j++) {
      var row = v.data[j], loc = have[row.id];
      if (!loc) {
        var nv = { id: row.id, user_id: user.id, site_id: row.site_id, site_name: names[row.site_id] || 'Site', check_in_at: row.check_in_at, check_in_lat: row.check_in_lat, check_in_lng: row.check_in_lng, check_in_acc: row.check_in_accuracy_m, check_out_at: row.check_out_at, notes: row.notes || '', rev: 0, s_in: true, s_out: !!row.check_out_at };
        if (row.reported_at) rep(nv, row);
        await idb.put('visits', nv);
      } else if ((!loc.check_out_at && row.check_out_at) || (!loc.reported_at && row.reported_at)) {
        await idb.patch('visits', row.id, (function (row) { return function (x) {
          if (!x.check_out_at && row.check_out_at) { x.check_out_at = row.check_out_at; x.s_out = true; }
          if (!x.reported_at && row.reported_at) rep(x, row);
        }; })(row));
      }
    }
    if (OS && !$('sOnSite').hidden) { var mineNow = await openVisit(); if (!mineNow) { OS = null; home(); } }
  }
  $('syncChip').addEventListener('click', function () { sync(true); });
  window.addEventListener('online', function () { sync(); });
  window.addEventListener('offline', setChip);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
  setInterval(function () { if (user && !document.hidden) pending().then(function (n) { if (n) sync(); }); }, 60000);

  // ---------------------------------------------------------------- menu, install
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; });
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  $('menuBtn').addEventListener('click', function () {
    $('menuUser').textContent = 'Signed in as ' + (user ? user.email : '');
    $('mInstall').hidden = !installEvt;
    $('mIos').hidden = standalone || !!installEvt || !/iphone|ipad|ipod/i.test(navigator.userAgent);
    $('menu').hidden = false;
  });
  $('menu').addEventListener('click', function (e) { if (e.target === $('menu')) $('menu').hidden = true; });
  $('mClose').addEventListener('click', function () { $('menu').hidden = true; });
  $('mSync').addEventListener('click', function () { $('menu').hidden = true; sync(true); });
  $('mInstall').addEventListener('click', function () { $('menu').hidden = true; if (installEvt) { installEvt.prompt(); installEvt = null; } });
  $('mOut').addEventListener('click', async function () {
    var n = await pending();
    if (n && !confirm(n + ' item' + (n === 1 ? ' has' : 's have') + ' not been sent yet. They stay on this phone and will be sent the next time you sign in here. Sign out anyway?')) return;
    $('menu').hidden = true;
    try { await sb.auth.signOut(); } catch (e) {}
    LS.del('sv_visits_user'); user = null; showLogin();
  });

  // ---------------------------------------------------------------- sign in
  function showLogin(msg) { show('sLogin'); $('lMsg').className = 'msg' + (msg ? ' err' : ''); $('lMsg').textContent = msg || ''; }
  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var m = $('lMsg'), em = $('lEmail').value.trim(), pw = $('lPass').value;
    if (!em || !pw) { m.className = 'msg err'; m.textContent = 'Enter your email and password.'; return; }
    m.className = 'msg'; m.textContent = 'Signing in…'; $('lBtn').disabled = true;
    var r; try { r = await sb.auth.signInWithPassword({ email: em, password: pw }); } catch (err) { r = { error: err }; }
    $('lBtn').disabled = false;
    if (r.error) { m.className = 'msg err'; m.textContent = r.error.message === 'Invalid login credentials' ? 'Email or password is wrong.' : /fetch|network/i.test(r.error.message || '') ? 'No connection. You need internet to sign in the first time.' : r.error.message; return; }
    $('lPass').value = ''; m.textContent = ''; boot();
  });
  $('forgot').addEventListener('click', async function () {
    var em = $('lEmail').value.trim(), m = $('lMsg');
    if (!em) { m.className = 'msg err'; m.textContent = 'Type your email first, then tap "Forgot password?".'; return; }
    var r = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + '/admin/' });
    m.className = r.error ? 'msg err' : 'msg ok'; m.textContent = r.error ? r.error.message : 'If this email has a staff account, a reset link is on its way.';
  });

  async function boot() {
    var cached = LS.get('sv_visits_user'), s = null, gs = null;
    try { gs = await sb.auth.getSession(); s = gs.data.session; } catch (e) { gs = { error: e }; }
    if (s) {
      var access, failed = false;
      try { var r = await sb.rpc('my_visit_access'); if (r.error) throw r.error; access = r.data; } catch (e) { failed = true; }
      if (failed) {
        if (cached && cached.id === s.user.id) user = cached;
        else return showLogin('Your account could not be checked. Connect to the internet and try again.');
      } else if (!access) {
        try { await sb.auth.signOut(); } catch (e) {}
        LS.del('sv_visits_user');
        return showLogin(s.user.email + ' is not on the staff list. Ask the data team to add you.');
      } else { user = { id: s.user.id, email: s.user.email }; LS.set('sv_visits_user', user); }
    } else if (cached && (!navigator.onLine || (gs && gs.error && /fetch|network|retry/i.test((gs.error.name || '') + (gs.error.message || ''))))) {
      user = cached;   // offline with an expired sign-in: keep working, send after the next sign-in
    } else return showLogin();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    await home(); setChip(); sync();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/visits/sw.js').catch(function () {});
  boot().catch(function (e) { console.error(e); showLogin('The app could not start: ' + ((e && e.message) || e)); });
})();
