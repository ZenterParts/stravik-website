/* App: Site visits. Customer site visits logged by field sales from the phone app (/visits/):
   start and end time and GPS position, photos taken with the live camera, and the visit report the salesperson writes
   afterwards (outcome, follow-up with an optional date, summary).
   Tables public.stravik_visit_sites, stravik_visits, stravik_visit_photos; photos in the private bucket stravik-visit-photos.
   The database works out the distance from the site and the flags (outside the country, far from the site, weak GPS, wrong phone clock).
   Who sees this app: only staff with staff.sees_visits (public.my_visit_access() = 'manager' or 'viewer'); the tile is not
   registered for anyone else, and row level security returns nothing but a person's own visits to them.
   'manager' (sees_visits + editor) can also correct, reset and merge sites. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.visits = { text: '', active: {}, offset: 0, stext: '', soffset: 0 };
  var BASE = L.href('visits'), SBASE = L.href('visits', ['sites']);
  var BUCKET = 'stravik-visit-photos';
  var ACCESS = null, STAFF = null;
  var FLAGS = { outside_country: "Checked in outside the site's country", far_from_site: 'Checked in far from the site', checkout_far_from_site: 'Checked out far from the site', low_gps_accuracy: 'Weak GPS signal', clock_mismatch: 'Phone clock was wrong' };
  var OUT = { proceed: ['Moving forward', 'Won'], in_progress: ['In discussion', 'Quoted'], no_business: ['No business for now', 'Lost'] };   // label, pill colour
  var FILTERS = [
    { key: 'flag', label: 'Needs a check', group: 'Status' }, { key: 'open', label: 'Still on site', group: 'Status' },
    { key: 'o_proceed', label: 'Moving forward', group: 'Outcome' }, { key: 'o_in_progress', label: 'In discussion', group: 'Outcome' }, { key: 'o_no_business', label: 'No business for now', group: 'Outcome' },
    { key: 'norep', label: 'No report yet', group: 'Report' }, { key: 'fu', label: 'Follow-up open', group: 'Report' },
    { key: 'd1', label: 'Today', group: 'Date', single: true }, { key: 'd7', label: 'Last 7 days', group: 'Date', single: true }, { key: 'd30', label: 'Last 30 days', group: 'Date', single: true }
  ];
  var isManager = function () { return ACCESS === 'manager'; };

  if (!document.getElementById('svVisitsCss')) {
    var st = document.createElement('style'); st.id = 'svVisitsCss';
    st.textContent = '.sv-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:8px 0 4px}' +
      '.sv-photos figure{margin:0}.sv-photos a{display:block}.sv-photos img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #e1e4e1;background:#f2f3f2}' +
      '.sv-photos figcaption{font-size:.82rem;color:var(--sv-grey);margin-top:5px}.sv-why{margin:0 0 14px;padding:10px 14px;border-radius:4px;background:#fde4e1;color:#7a1a12}.sv-why ul{margin:4px 0 0;padding-left:18px}';
    document.head.appendChild(st);
  }

  async function staff() {
    if (!STAFF) { STAFF = {}; try { L.must(await sb.from('staff').select('email,full_name,team')).forEach(function (s) { STAFF[s.email] = s; }); } catch (e) { STAFF = {}; } }
    return STAFF;
  }
  var who = function (email) { var s = STAFF && STAFF[email]; return s && s.full_name ? s.full_name : (email || ''); };
  function mins(v) { return v.check_out_at ? Math.max(0, Math.round((new Date(v.check_out_at) - new Date(v.check_in_at)) / 60000)) : null; }
  function durText(m) { return m == null ? '' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 < 10 ? '0' : '') + (m % 60) + ' min'; }
  function metres(m) { return m == null ? '' : m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m'; }
  function mapLink(lat, lng, text) { return lat == null ? '' : '<a href="https://www.google.com/maps?q=' + lat + ',' + lng + '" target="_blank" rel="noopener">' + esc(text || (Number(lat).toFixed(5) + ', ' + Number(lng).toFixed(5))) + '</a>'; }
  function flagPills(v) { return (v.flag_reasons || []).map(function (f) { return L.pill(FLAGS[f] || f, 'warn'); }).join(' '); }
  function since(days) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1)); return d.toISOString(); }
  function fuDate(d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function outcome(v) { return v.outcome && OUT[v.outcome] ? L.pill(OUT[v.outcome][0], OUT[v.outcome][1]) : v.check_out_at ? '<span class="muted">No report yet</span>' : ''; }
  function followUp(v) {
    if (!v.follow_up) return '';
    if (v.follow_up_done_at) return '<span class="muted">Done</span>';
    if (!v.follow_up_on) return 'Needed, no date';
    return v.follow_up_on < L.today() ? L.pill('Was due ' + fuDate(v.follow_up_on), 'warn') : esc(fuDate(v.follow_up_on));
  }

  // ------------------------------------------------------------ visits list
  async function match(text) {   // search by salesperson (name or email) or by site (name, town, country)
    var s = String(text || '').replace(/[,()*%\\"]/g, ' ').trim(); if (!s) return null;
    var low = s.toLowerCase(), emails = Object.keys(await staff()).filter(function (e) { return e.indexOf(low) >= 0 || String(STAFF[e].full_name || '').toLowerCase().indexOf(low) >= 0; });
    var ids = L.must(await sb.from('stravik_visit_sites').select('id').or(L.orSearch(['name', 'city', 'country'], s)).limit(300)).map(function (r) { return r.id; });
    var parts = ['staff_email.ilike.*' + s + '*'];
    if (emails.length) parts.push('staff_email.in.(' + emails.map(function (e) { return '"' + e + '"'; }).join(',') + ')');
    if (ids.length) parts.push('site_id.in.(' + ids.join(',') + ')');
    return parts.join(',');
  }
  function query(or, opts) {
    var q = sb.from('stravik_visits').select('*, site:stravik_visit_sites(name,country,city)', opts).order('check_in_at', { ascending: false });
    if (S.active.flag) q = q.eq('flagged', true);
    if (S.active.open) q = q.is('check_out_at', null);
    var outs = ['proceed', 'in_progress', 'no_business'].filter(function (o) { return S.active['o_' + o]; }); if (outs.length) q = q.in('outcome', outs);
    if (S.active.norep) q = q.is('reported_at', null).not('check_out_at', 'is', null);
    if (S.active.fu) q = q.eq('follow_up', true).is('follow_up_done_at', null);
    var d = S.active.d1 ? 1 : S.active.d7 ? 7 : S.active.d30 ? 30 : 0; if (d) q = q.gte('check_in_at', since(d));
    if (or) q = q.or(or);
    return q;
  }
  async function photoCounts(ids) {
    var n = {}, chunks = L.chunks(ids, 150);
    for (var i = 0; i < chunks.length; i++) L.must(await sb.from('stravik_visit_photos').select('visit_id').in('visit_id', chunks[i]).limit(5000)).forEach(function (p) { n[p.visit_id] = (n[p.visit_id] || 0) + 1; });
    return n;
  }
  var COLS = [
    { label: 'Checked in', render: function (v) { return esc(L.dt(v.check_in_at)); } },
    { label: 'Salesperson', render: function (v) { return esc(who(v.staff_email)); } },
    { label: 'Site', render: function (v) { return '<b>' + esc(v.site ? v.site.name : '') + '</b>'; } },
    { label: 'Country', render: function (v) { return esc(v.site ? [v.site.city, v.site.country].filter(Boolean).join(', ') : ''); } },
    { label: 'Outcome', render: outcome },
    { label: 'Follow-up', render: followUp },
    { label: 'Checked out', render: function (v) { return v.check_out_at ? esc(L.dt(v.check_out_at)) : L.pill('Still on site', 'New'); } },
    { label: 'Time on site', num: true, render: function (v) { return esc(durText(mins(v))); } },
    { label: 'From the site', num: true, render: function (v) { return v.check_in_distance_m == null ? '<span class="muted">first visit</span>' : esc(metres(v.check_in_distance_m)); } },
    { label: 'Photos', num: true, render: function (v) { return String(v._photos || 0); } },
    { label: 'Check', render: function (v) { return v.flagged ? flagPills(v) : '<span class="muted">OK</span>'; } }
  ];
  var listRun = 0;
  function list() {
    L.cp({ crumbs: [['Site visits']], buttons: '<button type="button" class="btn ghost" id="vXls">Download</button>' });
    L.searchBar({ placeholder: 'Search salesperson, site, town or country…', text: S.text, filters: FILTERS, active: S.active, onChange: function (st) { S.text = st.text; S.active = st.active; S.offset = 0; load(); } });
    $('vXls').addEventListener('click', download);
    load();
  }
  async function load() {
    var run = ++listRun;
    try {
      await staff();
      var or = await match(S.text);
      var res = await query(or, { count: 'exact' }).range(S.offset, S.offset + L.PAGE - 1);
      var rows = L.must(res); if (run !== listRun) return;
      var n = rows.length ? await photoCounts(rows.map(function (r) { return r.id; })) : {}; if (run !== listRun) return;
      rows.forEach(function (r) { r._photos = n[r.id] || 0; });
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; load(); });
      L.content(rows.length ? L.listView(COLS, rows, function (v) { return L.href('visits', ['v', v.id]); })
        : L.empty('No visits found', S.text || Object.keys(S.active).length ? 'Try a different search or remove a filter.' : 'Visits appear here as soon as a salesperson starts one with the phone app at <b>' + esc(location.host) + '/visits/</b>.'));
    } catch (e) { L.fail(e); }
  }
  async function download() {
    try {
      L.toast('Preparing the download…');
      await staff();
      var or = await match(S.text), rows = await L.fetchAll(function () { return query(or); });
      var n = rows.length ? await photoCounts(rows.map(function (r) { return r.id; })) : {};
      await L.saveXlsx([{ name: 'Site visits',
        widths: [18, 22, 30, 30, 16, 16, 18, 12, 20, 12, 14, 14, 40, 12, 12, 12, 14, 12, 12, 12, 14, 8, 36, 18],
        head: ['Checked in', 'Salesperson', 'Email', 'Site', 'Country', 'Town', 'Checked out', 'Minutes on site', 'Outcome', 'Follow-up needed', 'Follow-up date', 'Follow-up done', 'Summary and comments',
          'Check-in latitude', 'Check-in longitude', 'Check-in GPS accuracy (m)', 'Check-in distance from site (m)', 'Check-out latitude', 'Check-out longitude', 'Check-out GPS accuracy (m)', 'Check-out distance from site (m)',
          'Photos', 'Needs a check', 'Received'],
        rows: rows.map(function (v) {
          var r = function (x) { return x == null ? '' : Math.round(x); };
          return [L.dt(v.check_in_at), who(v.staff_email), v.staff_email || '', v.site ? v.site.name : '', v.site ? v.site.country || '' : '', v.site ? v.site.city || '' : '', v.check_out_at ? L.dt(v.check_out_at) : '', mins(v) == null ? '' : mins(v),
            v.outcome && OUT[v.outcome] ? OUT[v.outcome][0] : '', !v.reported_at || v.outcome === 'no_business' ? '' : v.follow_up ? 'Yes' : 'No', fuDate(v.follow_up_on), v.follow_up_done_at ? L.dt(v.follow_up_done_at) : '', v.notes || '',
            v.check_in_lat, v.check_in_lng, r(v.check_in_accuracy_m), r(v.check_in_distance_m), v.check_out_lat == null ? '' : v.check_out_lat, v.check_out_lng == null ? '' : v.check_out_lng, r(v.check_out_accuracy_m), r(v.check_out_distance_m),
            n[v.id] || 0, (v.flag_reasons || []).map(function (f) { return FLAGS[f] || f; }).join('; '), L.dt(v.received_at)];
        }) }], 'Stravik_site_visits_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // ------------------------------------------------------------ one visit
  var KIND = { check_in: 'Arrival photo', check_out: 'Departure photo', other: 'Visit photo' };
  async function visit(id) {
    try {
      await staff();
      var v = L.must(await sb.from('stravik_visits').select('*, site:stravik_visit_sites(*)').eq('id', id).maybeSingle());
      if (!v) { L.cp({ crumbs: [['Site visits', BASE], ['Not found']] }); return L.content(L.empty('Visit not found', 'It may have been deleted.')); }
      var photos = L.must(await sb.from('stravik_visit_photos').select('*').eq('visit_id', id).order('taken_at'));
      var site = v.site || {}, m = mins(v), late = (new Date(v.received_at) - new Date(v.check_in_at)) / 60000;
      var why = v.flagged ? '<div class="sv-why"><b>This visit needs a check</b><ul>' + (v.flag_reasons || []).map(function (f) {
        return '<li>' + esc(FLAGS[f] || f) + (f === 'outside_country' ? ': the phone was not in ' + esc(site.country || 'that country') + ' at check-in.' : f === 'far_from_site' ? ': ' + esc(metres(v.check_in_distance_m)) + ' from where this site was first recorded.' : f === 'checkout_far_from_site' ? ': ' + esc(metres(v.check_out_distance_m)) + ' from the site.' :
          f === 'low_gps_accuracy' ? ': the phone could only place itself within ' + esc(metres(v.check_in_accuracy_m)) + '.' : f === 'clock_mismatch' ? ': the check-in time is later than the time the server received it.' : '') + '</li>';
      }).join('') + '</ul></div>' : '';
      var sheet = why + '<h1>' + esc(site.name || 'Site') + '</h1><p class="muted">' + esc(who(v.staff_email)) + ', ' + esc(L.dt(v.check_in_at)) + '</p><div class="o-groups">' +
        L.group('Visit', [['Salesperson', esc(who(v.staff_email))], ['Email', esc(v.staff_email || '')], ['Site', '<a href="' + L.href('visits', ['sites', v.site_id]) + '">' + esc(site.name || '') + '</a>'],
          ['Town, country', esc([site.city, site.country].filter(Boolean).join(', '))], ['Time on site', v.check_out_at ? esc(durText(m)) : L.pill('Still on site', 'New')]]) +
        L.group('Visit report', v.reported_at ? [['Outcome', outcome(v)], ['Follow-up needed', v.outcome === 'no_business' ? '' : v.follow_up ? 'Yes' : 'No'], ['Follow-up date', esc(fuDate(v.follow_up_on))],
          ['Follow-up done', v.follow_up_done_at ? esc(L.dt(v.follow_up_done_at)) : ''], ['Report written', esc(L.dt(v.reported_at))], ['Summary and comments', esc(v.notes || '')]]
          : [['Outcome', '<span class="muted">No report yet</span>'], ['Notes', esc(v.notes || '')]]) +
        L.group('Check-in', [['Time', esc(L.dt(v.check_in_at))], ['Position', mapLink(v.check_in_lat, v.check_in_lng)], ['GPS accuracy', esc(metres(v.check_in_accuracy_m))],
          ['Distance from site', v.check_in_distance_m == null ? '<span class="muted">First visit: this check-in set the site\'s position</span>' : esc(metres(v.check_in_distance_m))],
          ['Received', esc(L.dt(v.received_at)) + (late > 30 ? ' <span class="muted">(sent ' + esc(durText(Math.round(late))) + ' after check-in: the phone was offline)</span>' : '')]]) +
        L.group('Check-out', v.check_out_at ? [['Time', esc(L.dt(v.check_out_at))], ['Position', v.check_out_lat == null ? '<span class="muted">No location at check-out</span>' : mapLink(v.check_out_lat, v.check_out_lng)],
          ['GPS accuracy', esc(metres(v.check_out_accuracy_m))], ['Distance from site', esc(metres(v.check_out_distance_m))]] : [['Time', '<span class="muted">Not checked out yet</span>']]) +
        '</div><div class="o-group-title">Photos (' + photos.length + ')</div><div id="vPhotos" class="sv-photos">' + (photos.length ? '<p class="muted">Loading photos…</p>' : '<p class="muted">No photos have arrived for this visit yet.</p>') + '</div>';
      L.form({ crumbs: [['Site visits', BASE], [site.name || 'Visit']], sheet: sheet });
      if (photos.length) {
        var signed = L.must(await sb.storage.from(BUCKET).createSignedUrls(photos.map(function (p) { return p.storage_path; }), 3600)), box = $('vPhotos'); if (!box) return;
        box.innerHTML = photos.map(function (p, i) {
          var u = signed[i] && signed[i].signedUrl;
          return '<figure>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="' + esc(KIND[p.kind] || 'Photo') + '" loading="lazy"></a>' : '<p class="muted">Photo not available</p>') +
            '<figcaption>' + esc(KIND[p.kind] || 'Photo') + ', ' + esc(L.dt(p.taken_at)) + (p.lat != null ? ' · ' + mapLink(p.lat, p.lng, 'map') : '') + '</figcaption></figure>';
        }).join('');
      }
    } catch (e) { L.fail(e); }
  }

  // ------------------------------------------------------------ sites
  var SCOLS = [
    { label: 'Site', render: function (s) { return '<b>' + esc(s.name) + '</b>'; } },
    { label: 'Country', render: function (s) { return esc(s.country || ''); } },
    { label: 'Town', render: function (s) { return esc(s.city || ''); } },
    { label: 'Position', render: function (s) { return s.lat == null ? '<span class="muted">Set at the first visit</span>' : mapLink(s.lat, s.lng, 'On the map'); } },
    { label: 'Contact', render: function (s) { return esc([s.contact_name, s.contact_phone].filter(Boolean).join(', ')); } },
    { label: 'Added by', render: function (s) { return esc(who(s.created_by_email)); } },
    { label: 'Added', render: function (s) { return esc(L.dt(s.created_at)); } }
  ];
  var sRun = 0;
  function sites() {
    L.cp({ crumbs: [['Site visits', BASE], ['Sites']] });
    L.searchBar({ placeholder: 'Search site, town or country…', text: S.stext, onChange: function (st) { S.stext = st.text; S.soffset = 0; sLoad(); } });
    sLoad();
  }
  async function sLoad() {
    var run = ++sRun;
    try {
      await staff();
      var q = sb.from('stravik_visit_sites').select('*', { count: 'exact' }).order('name'), or = L.orSearch(['name', 'city', 'country'], S.stext); if (or) q = q.or(or);
      var res = await q.range(S.soffset, S.soffset + L.PAGE - 1), rows = L.must(res); if (run !== sRun) return;
      L.pager(S.soffset, res.count || 0, function (o) { S.soffset = o; sLoad(); });
      L.content(rows.length ? L.listView(SCOLS, rows, function (s) { return L.href('visits', ['sites', s.id]); }) : L.empty('No sites found', 'Salespeople add sites from the phone app before they start a visit.'));
    } catch (e) { L.fail(e); }
  }
  async function site(id) {
    try {
      await staff();
      var s = L.must(await sb.from('stravik_visit_sites').select('*').eq('id', id).maybeSingle());
      if (!s) { L.cp({ crumbs: [['Site visits', BASE], ['Sites', SBASE], ['Not found']] }); return L.content(L.empty('Site not found', 'It may have been merged into another site.')); }
      var visits = L.must(await sb.from('stravik_visits').select('*').eq('site_id', id).order('check_in_at', { ascending: false }).limit(100));
      var cols = COLS.filter(function (c) { return c.label !== 'Site' && c.label !== 'Country' && c.label !== 'Photos'; });
      L.form({ crumbs: [['Site visits', BASE], ['Sites', SBASE], [s.name]],
        buttons: isManager() ? '<button type="button" class="btn" id="sEdit">Edit</button> <button type="button" class="btn ghost" id="sMerge">Merge into another site</button>' + (s.lat != null ? ' <button type="button" class="btn ghost" id="sReset">Reset position</button>' : '') : '',
        sheet: '<h1>' + esc(s.name) + '</h1><div class="o-groups">' +
          L.group('Site', [['Country', esc(s.country || '')], ['Town', esc(s.city || '')], ['Contact person', esc(s.contact_name || '')], ['Contact phone', esc(s.contact_phone || '')], ['Notes', esc(s.notes || '')]]) +
          L.group('Record', [['Position', s.lat == null ? '<span class="muted">Not set yet: the next check-in with a good GPS signal sets it</span>' : mapLink(s.lat, s.lng)], ['Position set', esc(L.dt(s.location_set_at))], ['Added by', esc(who(s.created_by_email))], ['Added', esc(L.dt(s.created_at))]]) +
          '</div><div class="o-group-title">Visits (' + visits.length + (visits.length === 100 ? '+' : '') + ')</div>' +
          (visits.length ? L.listView(cols, visits, function (v) { return L.href('visits', ['v', v.id]); }) : '<p class="muted">No visits to this site yet.</p>') });
      if (!isManager()) return;
      $('sEdit').addEventListener('click', function () { editSite(s); });
      $('sMerge').addEventListener('click', function () { mergeSite(s, visits.length); });
      if ($('sReset')) $('sReset').addEventListener('click', async function () {
        if (!confirm('Reset the position of "' + s.name + '"? The next check-in with a good GPS signal will set it again.')) return;
        try { L.must(await sb.from('stravik_visit_sites').update({ lat: null, lng: null, location_set_at: null }).eq('id', s.id)); L.toast('Position reset.'); site(s.id); } catch (e) { L.fail(e); }
      });
    } catch (e) { L.fail(e); }
  }
  function editSite(s) {
    var f = function (id, label, val) { return '<label>' + label + '<input type="text" id="' + id + '" value="' + esc(val || '') + '"></label>'; };
    L.modal('Edit site', '<form id="seForm">' + f('seName', 'Site or company name', s.name) + f('seCountry', 'Country', s.country) + f('seCity', 'Town', s.city) + f('seContact', 'Contact person', s.contact_name) + f('sePhone', 'Contact phone', s.contact_phone) +
      '<label>Notes<textarea id="seNotes" rows="3">' + esc(s.notes || '') + '</textarea></label><p><button class="btn" type="submit">Save</button></p></form>');
    $('seForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var v = function (id) { return $(id).value.replace(/\s+/g, ' ').trim() || null; };
      if (!v('seName')) return L.toast('The site needs a name.');
      try {
        L.must(await sb.from('stravik_visit_sites').update({ name: v('seName'), country: v('seCountry'), city: v('seCity'), contact_name: v('seContact'), contact_phone: v('sePhone'), notes: $('seNotes').value.trim() || null }).eq('id', s.id));
        L.closeModal(); L.toast('Site saved.'); site(s.id);
      } catch (err) { L.fail(err); }
    });
  }
  async function mergeSite(s, n) {
    try {
      var all = (await L.fetchAll(function () { return sb.from('stravik_visit_sites').select('id,name,city,country').order('name'); })).filter(function (x) { return x.id !== s.id; });
      if (!all.length) return L.toast('There is no other site to merge into.');
      L.modal('Merge into another site', '<p>Use this when the same place was added twice. All visits of <b>' + esc(s.name) + '</b> move to the site you choose, and <b>' + esc(s.name) + '</b> is removed. This cannot be undone.</p>' +
        '<label>Keep this site<select id="smTarget"><option value="">Choose a site</option>' + all.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name + ([x.city, x.country].filter(Boolean).length ? ' (' + [x.city, x.country].filter(Boolean).join(', ') + ')' : '')) + '</option>'; }).join('') + '</select></label>' +
        '<p><button class="btn danger" type="button" id="smGo">Merge</button></p>');
      $('smGo').addEventListener('click', async function () {
        var t = $('smTarget').value; if (!t) return L.toast('Choose the site to keep.');
        try {
          L.must(await sb.from('stravik_visits').update({ site_id: t }).eq('site_id', s.id));
          L.must(await sb.from('stravik_visit_sites').delete().eq('id', s.id));
          L.closeModal(); L.toast('Merged.'); L.go(L.href('visits', ['sites', t]));
        } catch (err) { L.fail(err); }
      });
    } catch (e) { L.fail(e); }
  }

  // ------------------------------------------------------------ the app, registered only for people with visit access
  var APP = {
    key: 'visits', name: 'Site visits', color: '#1f5c7a',
    icon: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
    menus: [{ label: 'Visits', href: BASE }, { label: 'Sites', href: SBASE }],
    route: function (r) {
      if (r.parts[0] === 'sites') { if (r.parts[1]) site(r.parts[1]); else sites(); }
      else if (r.parts[0] === 'v' && r.parts[1]) visit(r.parts[1]);
      else list();
    }
  };
  var checking = false, recheck = false;
  async function access() {
    if (checking) { recheck = true; return; } checking = true;
    try {
      var s = (await sb.auth.getSession()).data.session, a = null;
      if (s) { var r = await sb.rpc('my_visit_access'); a = r.error ? null : r.data; }
      ACCESS = a; STAFF = null;
      var ok = a === 'manager' || a === 'viewer', i = L.apps.indexOf(APP);
      if (ok && i < 0) L.apps.push(APP); else if (!ok && i >= 0) L.apps.splice(i, 1); else return;
      if (L.ROLE && (!L.route().app || L.route().app === 'visits')) L.render();   // show (or remove) the tile on the home screen
    } catch (e) { /* no tile without a confirmed access level */ } finally { checking = false; if (recheck) { recheck = false; access(); } }
  }
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'INITIAL_SESSION' || ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(access, 0); });
  access();
})(window.LS);
