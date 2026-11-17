/* App: My visits. Each person's own customer site visits and visit reports, written with the phone app (/visits/).
   Overview: a dashboard of the person's own visits since a chosen date (visits, sites, time on site, outcomes, visits over
   time, by country, most visited sites) plus what is waiting for them (reports to complete, open follow-ups).
   Visits: the list and one visit, report side only: site, date, time on site, outcome, follow-up, summary, report photos.
   Every staff member has this app and sees only their own visits: every query is filtered to the signed-in person, and row
   level security enforces it. Positions, distances and checks are not shown here; they are in the Site visits app.
   Read-only here: "New visit" opens the phone app (/visits/, same sign-in), where visits are started and reports are written. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.myvisits = { text: '', active: {}, offset: 0, preset: 'd30', since: '' };
  var BASE = L.href('myvisits'), LIST = L.href('myvisits', ['list']), BUCKET = 'stravik-visit-photos';
  var NEWBTN = '<a class="btn" href="/visits/" target="_blank" rel="noopener">New visit</a>';
  var FIELDS = 'id,site_id,check_in_at,check_out_at,notes,outcome,follow_up,follow_up_on,follow_up_done_at,reported_at,site:stravik_visit_sites(name,country,city)';
  var OUT = { proceed: ['Moving forward', 'Won'], in_progress: ['In discussion', 'Quoted'], no_business: ['Not at this time', 'Lost'] };   // label, pill colour
  var FILTERS = [
    { key: 'o_proceed', label: 'Moving forward', group: 'Outcome' }, { key: 'o_in_progress', label: 'In discussion', group: 'Outcome' }, { key: 'o_no_business', label: 'Not at this time', group: 'Outcome' },
    { key: 'norep', label: 'Report to complete', group: 'Report' }, { key: 'fu', label: 'Follow-up open', group: 'Report' },
    { key: 'd7', label: 'Last 7 days', group: 'Date', single: true }, { key: 'd30', label: 'Last 30 days', group: 'Date', single: true }, { key: 'd90', label: 'Last 90 days', group: 'Date', single: true }
  ];

  async function me() { var s = (await sb.auth.getSession()).data.session; if (!s) throw new Error('Please sign in again.'); return s.user.id; }
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  function ymd(d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function mins(v) { return v.check_out_at ? Math.max(0, Math.round((new Date(v.check_out_at) - new Date(v.check_in_at)) / 60000)) : null; }
  function durText(m) { return m == null ? '' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + two(m % 60) + ' min'; }
  function since(days) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1)); return d.toISOString(); }
  function fuDate(d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function where(v) { return v.site ? [v.site.city, v.site.country].filter(Boolean).join(', ') : ''; }
  function outcome(v) {
    if (v.outcome && OUT[v.outcome]) return L.pill(OUT[v.outcome][0], OUT[v.outcome][1]);
    return v.check_out_at ? L.pill('Report to complete', 'warn') : L.pill('In progress', 'New');
  }
  function followUp(v) {
    if (!v.follow_up) return '';
    if (v.follow_up_done_at) return '<span class="muted">Done</span>';
    if (!v.follow_up_on) return 'Needed, no date';
    return v.follow_up_on < L.today() ? L.pill('Was due ' + fuDate(v.follow_up_on), 'warn') : esc(fuDate(v.follow_up_on));
  }
  function short(s) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 90 ? s.slice(0, 88) + '…' : s; }

  // ------------------------------------------------------------ overview (dashboard)
  var PRESETS = [['week', 'This week'], ['month', 'This month'], ['d30', 'Last 30 days'], ['d90', 'Last 90 days'], ['year', 'This year'], ['all', 'All time']];
  function presetDate(k) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (k === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Monday
    else if (k === 'month') d.setDate(1);
    else if (k === 'd30') d.setDate(d.getDate() - 29);
    else if (k === 'd90') d.setDate(d.getDate() - 89);
    else if (k === 'year') d.setMonth(0, 1);
    else return '';
    return ymd(d);
  }
  S.since = presetDate(S.preset);
  function overview() {
    L.cp({ crumbs: [['My visits']], buttons: NEWBTN + ' <a class="btn ghost" href="' + LIST + '">All my visits</a>' });
    L.content('<div class="mv-dash"><div class="mv-range"><label for="mvSince">Visits since</label><input type="date" id="mvSince" value="' + esc(S.since) + '" max="' + ymd(new Date()) + '">' +
      '<div class="chips" id="mvPresets">' + PRESETS.map(function (p) { return '<button type="button" class="chip' + (S.preset === p[0] ? ' on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="mvBody"><p class="muted">Loading…</p></div></div>');
    $('mvSince').addEventListener('change', function () { S.since = this.value; S.preset = this.value ? '' : 'all'; marks(); draw(); });
    $('mvPresets').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; S.preset = b.dataset.p; S.since = presetDate(S.preset); $('mvSince').value = S.since; marks(); draw(); });
    draw();
  }
  function marks() { Array.prototype.forEach.call(document.querySelectorAll('#mvPresets .chip'), function (c) { c.classList.toggle('on', c.dataset.p === S.preset); }); }
  var drun = 0;
  async function draw() {
    var r = ++drun;
    try {
      var uid = await me();
      var rows = await L.fetchAll(function () {
        var q = sb.from('stravik_visits').select(FIELDS).eq('user_id', uid).order('check_in_at', { ascending: false });
        return S.since ? q.gte('check_in_at', new Date(S.since + 'T00:00:00').toISOString()) : q;
      });
      // waiting for this person, whatever the date
      var rep = await sb.from('stravik_visits').select('id', { count: 'exact', head: true }).eq('user_id', uid).is('reported_at', null).not('check_out_at', 'is', null); if (rep.error) throw rep.error;
      var fus = L.must(await sb.from('stravik_visits').select('follow_up_on').eq('user_id', uid).eq('follow_up', true).is('follow_up_done_at', null).limit(1000));
      if (r !== drun || !$('mvBody')) return;
      $('mvBody').innerHTML = dash(rows, rep.count || 0, fus);
    } catch (e) { L.fail(e); }
  }
  function tile(label, value, sub, extra) { return '<' + (extra && extra.href ? 'a href="' + extra.href + '" data-f="' + extra.f + '"' : 'div') + ' class="mv-tile' + (extra ? ' todo' : '') + '"><span class="l">' + esc(label) + '</span><b>' + esc(value) + '</b><span class="s' + (extra && extra.bad ? ' bad' : '') + '">' + esc(sub || '') + '</span></' + (extra && extra.href ? 'a' : 'div') + '>'; }
  function hours(m) { return m < 60 ? m + ' min' : (Math.round(m / 6) / 10).toLocaleString() + ' h'; }
  function buckets(rows) {   // visits per day (up to 2 weeks), per week (up to about 4 months) or per month
    var end = new Date(); end.setHours(0, 0, 0, 0);
    var start = S.since ? new Date(S.since + 'T00:00:00') : new Date(rows[rows.length - 1].check_in_at); start.setHours(0, 0, 0, 0);
    var days = Math.round((end - start) / 864e5) + 1, unit = days <= 14 ? 'day' : days <= 120 ? 'week' : 'month';
    function key(d) { d = new Date(d); d.setHours(0, 0, 0, 0); if (unit === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); else if (unit === 'month') d.setDate(1); return d; }
    var counts = {}; rows.forEach(function (v) { var k = ymd(key(v.check_in_at)); counts[k] = (counts[k] || 0) + 1; });
    var list = [], d = key(start), guard = 0;
    while (d <= end && guard++ < 500) {
      list.push({ n: counts[ymd(d)] || 0, label: unit === 'month' ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
      d = new Date(d); if (unit === 'day') d.setDate(d.getDate() + 1); else if (unit === 'week') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
    }
    return { unit: unit, list: list };
  }
  function dash(rows, toReport, fus) {
    var today = L.today(), late = fus.filter(function (f) { return f.follow_up_on && f.follow_up_on < today; }).length;
    var todo = tile('Reports to complete', String(toReport), toReport ? 'all dates, open the list' : 'all dates, nothing waiting', { href: LIST, f: 'norep' }) +
      tile('Follow-ups open', String(fus.length), fus.length ? (late ? late + ' overdue' : 'none overdue') : 'all dates, nothing waiting', { href: LIST, f: 'fu', bad: late > 0 });
    var label = S.since ? 'since ' + fuDate(S.since) : 'all time';
    if (!rows.length) return '<div class="mv-tiles">' + tile('Visits', '0', label) + todo + '</div>' + L.empty('No visits ' + esc(label), 'Choose an earlier date, or press <b>New visit</b> to start one.');
    var sites = {}, byC = {}, o = { proceed: 0, in_progress: 0, no_business: 0 }, norep = 0, open = 0, total = 0, done = 0, reported = 0;
    rows.forEach(function (v) {
      var m = mins(v), c = (v.site && v.site.country) || 'No country', s = sites[v.site_id] = sites[v.site_id] || { name: v.site ? v.site.name : 'Site', where: where(v), n: 0, last: v };   // rows are newest first
      s.n++;
      var b = byC[c] = byC[c] || { n: 0, sites: {}, fwd: 0 }; b.n++; b.sites[v.site_id] = 1;
      if (m != null) { total += m; done++; } else open++;
      if (v.outcome && o[v.outcome] != null) { o[v.outcome]++; reported++; if (v.outcome === 'proceed') b.fwd++; } else if (v.check_out_at) norep++;
    });
    var nSites = Object.keys(sites).length;
    var tiles = tile('Visits', rows.length.toLocaleString(), label) +
      tile('Sites visited', nSites.toLocaleString(), rows.length > nSites ? (rows.length - nSites) + ' repeat visit' + (rows.length - nSites === 1 ? '' : 's') : 'each visited once') +
      tile('Time on site', hours(total), done ? 'average ' + durText(Math.round(total / done)) + ' per visit' : '') +
      tile('Moving forward', String(o.proceed), reported ? 'of ' + reported + ' report' + (reported === 1 ? '' : 's') + ' (' + Math.round(100 * o.proceed / reported) + '%)' : 'no reports yet') + todo;
    // how the visits went
    var bars = [['Moving forward', o.proceed, 'a'], ['In discussion', o.in_progress, 'b'], ['Not at this time', o.no_business, 'c'], ['Report to complete', norep, 'd']];
    if (open) bars.push(['In progress', open, 'e']);
    var max = Math.max.apply(null, bars.map(function (x) { return x[1]; })) || 1;
    var went = '<div class="mv-bars">' + bars.map(function (x) { return '<div class="r"><span class="l">' + x[0] + '</span><span class="t"><i class="' + x[2] + '" style="width:' + (100 * x[1] / max) + '%"></i></span><span class="n">' + x[1] + '</span></div>'; }).join('') + '</div>';
    // visits over time
    var bk = buckets(rows), bmax = Math.max.apply(null, bk.list.map(function (x) { return x.n; })) || 1, step = Math.ceil(bk.list.length / 12);
    var time = '<div class="mv-cols">' + bk.list.map(function (x, i) {
      return '<div class="c" title="' + esc(x.label) + ': ' + x.n + '"><span class="n">' + (x.n || '') + '</span><i style="height:' + (x.n ? Math.max(4, 100 * x.n / bmax) : 0) + '%"></i><span class="l">' + (i % step === 0 ? esc(x.label) : '') + '</span></div>';
    }).join('') + '</div>';
    var unit = { day: 'Visits per day', week: 'Visits per week (weeks start on Monday)', month: 'Visits per month' }[bk.unit];
    // by country, and the sites visited most
    var cs = Object.keys(byC).sort(function (a, b) { return byC[b].n - byC[a].n || a.localeCompare(b); });
    var country = '<table class="grid"><thead><tr><th>Country</th><th class="num">Visits</th><th class="num">Sites</th><th class="num">Moving forward</th></tr></thead><tbody>' +
      cs.map(function (c) { return '<tr><td>' + esc(c) + '</td><td class="num">' + byC[c].n + '</td><td class="num">' + Object.keys(byC[c].sites).length + '</td><td class="num">' + byC[c].fwd + '</td></tr>'; }).join('') + '</tbody></table>';
    var top = Object.keys(sites).map(function (k) { return sites[k]; }).sort(function (a, b) { return b.n - a.n || (a.last.check_in_at < b.last.check_in_at ? 1 : -1); }).slice(0, 8);
    var most = '<table class="grid"><thead><tr><th>Site</th><th>Town, country</th><th class="num">Visits</th><th>Last visit</th><th>Last outcome</th></tr></thead><tbody>' +
      top.map(function (s) { return '<tr class="click" data-href="' + esc(L.href('myvisits', ['v', s.last.id])) + '"><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.where) + '</td><td class="num">' + s.n + '</td><td>' + esc(fuDate(ymd(new Date(s.last.check_in_at)))) + '</td><td>' + outcome(s.last) + '</td></tr>'; }).join('') + '</tbody></table>';
    return '<div class="mv-tiles">' + tiles + '</div>' +
      '<div class="mv-grid"><section class="mv-card"><h3>How the visits went</h3>' + went + '</section><section class="mv-card"><h3>' + unit + '</h3>' + time + '</section>' +
      '<section class="mv-card"><h3>By country</h3>' + country + '</section><section class="mv-card"><h3>Sites visited most</h3>' + most + '</section></div>';
  }
  // a "to do" tile opens the list with its filter switched on; a row of "Sites visited most" opens that site's latest visit
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.mv-tile[data-f]'), row = e.target.closest('.mv-dash tr[data-href]');
    if (t) { S.active = {}; S.active[t.dataset.f] = true; S.text = ''; S.offset = 0; }
    else if (row) L.go(row.dataset.href);
  });

  // ------------------------------------------------------------ visits list
  async function match(text) {   // search by site (name, town, country) or by words in the summary
    var s = String(text || '').replace(/[,()*%\\"]/g, ' ').trim(); if (!s) return null;
    var ids = L.must(await sb.from('stravik_visit_sites').select('id').or(L.orSearch(['name', 'city', 'country'], s)).limit(300)).map(function (r) { return r.id; });
    return 'notes.ilike.*' + s + '*' + (ids.length ? ',site_id.in.(' + ids.join(',') + ')' : '');
  }
  function query(uid, or, opts) {
    var q = sb.from('stravik_visits').select(FIELDS, opts).eq('user_id', uid).order('check_in_at', { ascending: false });
    var outs = ['proceed', 'in_progress', 'no_business'].filter(function (o) { return S.active['o_' + o]; }); if (outs.length) q = q.in('outcome', outs);
    if (S.active.norep) q = q.is('reported_at', null).not('check_out_at', 'is', null);
    if (S.active.fu) q = q.eq('follow_up', true).is('follow_up_done_at', null);
    var d = S.active.d7 ? 7 : S.active.d30 ? 30 : S.active.d90 ? 90 : 0; if (d) q = q.gte('check_in_at', since(d));
    if (or) q = q.or(or);
    return q;
  }
  var COLS = [
    { label: 'Date', render: function (v) { return esc(L.dt(v.check_in_at)); } },
    { label: 'Site', render: function (v) { return '<b>' + esc(v.site ? v.site.name : '') + '</b>'; } },
    { label: 'Town, country', render: function (v) { return esc(where(v)); } },
    { label: 'Time on site', num: true, render: function (v) { return esc(durText(mins(v))); } },
    { label: 'Outcome', render: outcome },
    { label: 'Follow-up', render: followUp },
    { label: 'Summary', render: function (v) { return esc(short(v.notes)); } }
  ];
  var run = 0;
  function list() {
    L.cp({ crumbs: [['My visits', BASE], ['Visits']], buttons: NEWBTN + ' <button type="button" class="btn ghost" id="mvXls">Download</button>' });
    L.searchBar({ placeholder: 'Search site, town, country or summary…', text: S.text, filters: FILTERS, active: S.active, onChange: function (st) { S.text = st.text; S.active = st.active; S.offset = 0; load(); } });
    $('mvXls').addEventListener('click', download);
    load();
  }
  async function load() {
    var r = ++run;
    try {
      var uid = await me(), or = await match(S.text);
      var res = await query(uid, or, { count: 'exact' }).range(S.offset, S.offset + L.PAGE - 1), rows = L.must(res); if (r !== run) return;
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; load(); });
      L.content(rows.length ? L.listView(COLS, rows, function (v) { return L.href('myvisits', ['v', v.id]); })
        : L.empty('No visits found', S.text || Object.keys(S.active).length ? 'Try a different search or remove a filter.' : 'Press <b>New visit</b> to start one. Your visits appear here afterwards.'));
    } catch (e) { L.fail(e); }
  }
  async function download() {
    try {
      L.toast('Preparing the download…');
      var uid = await me(), or = await match(S.text), rows = await L.fetchAll(function () { return query(uid, or); });
      await L.saveXlsx([{ name: 'My visits', widths: [18, 30, 16, 16, 18, 12, 18, 14, 14, 16, 60],
        head: ['Started', 'Site', 'Country', 'Town', 'Ended', 'Minutes on site', 'Outcome', 'Follow-up needed', 'Follow-up date', 'Follow-up done', 'Summary and comments'],
        rows: rows.map(function (v) {
          return [L.dt(v.check_in_at), v.site ? v.site.name : '', v.site ? v.site.country || '' : '', v.site ? v.site.city || '' : '', v.check_out_at ? L.dt(v.check_out_at) : '', mins(v) == null ? '' : mins(v),
            v.outcome && OUT[v.outcome] ? OUT[v.outcome][0] : '', !v.reported_at || v.outcome === 'no_business' ? '' : v.follow_up ? 'Yes' : 'No', fuDate(v.follow_up_on), v.follow_up_done_at ? L.dt(v.follow_up_done_at) : '', v.notes || ''];
        }) }], 'My_site_visits_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // ------------------------------------------------------------ one visit
  async function visit(id) {
    try {
      var uid = await me();
      var v = L.must(await sb.from('stravik_visits').select(FIELDS).eq('id', id).eq('user_id', uid).maybeSingle());
      if (!v) { L.cp({ crumbs: [['My visits', BASE], ['Visits', LIST], ['Not found']] }); return L.content(L.empty('Visit not found', 'It is not one of your visits, or it has been removed.')); }
      var photos = L.must(await sb.from('stravik_visit_photos').select('id,storage_path,taken_at').eq('visit_id', id).eq('user_id', uid).neq('kind', 'check_in').order('taken_at'));
      var name = v.site ? v.site.name : 'Site';
      var sheet = '<h1>' + esc(name) + '</h1><p class="muted">' + esc(where(v)) + '</p><div class="o-groups">' +
        L.group('Visit', [['Started', esc(L.dt(v.check_in_at))], ['Ended', v.check_out_at ? esc(L.dt(v.check_out_at)) : L.pill('In progress', 'New')], ['Time on site', esc(durText(mins(v)))]]) +
        L.group('Visit report', v.reported_at ? [['Outcome', outcome(v)], ['Follow-up needed', v.outcome === 'no_business' ? '' : v.follow_up ? 'Yes' : 'No'], ['Follow-up date', esc(fuDate(v.follow_up_on))],
          ['Follow-up done', v.follow_up_done_at ? esc(L.dt(v.follow_up_done_at)) : ''], ['Report written', esc(L.dt(v.reported_at))]]
          : [['Outcome', outcome(v)], ['Report', '<a href="/visits/" target="_blank" rel="noopener">Write the report</a> <span class="muted">(it is listed under "Reports to complete")</span>']]) +
        '</div><div class="o-group-title">Summary and comments</div><p style="white-space:pre-wrap;max-width:70ch">' + (v.notes ? esc(v.notes) : '<span class="muted">Nothing written yet.</span>') + '</p>' +
        '<div class="o-group-title">Photos (' + photos.length + ')</div><div id="mvPhotos" class="mv-photos">' + (photos.length ? '<p class="muted">Loading photos…</p>' : '<p class="muted">No photos were added to this report.</p>') + '</div>';
      L.form({ crumbs: [['My visits', BASE], ['Visits', LIST], [name]], sheet: sheet });
      if (photos.length) {
        var signed = L.must(await sb.storage.from(BUCKET).createSignedUrls(photos.map(function (p) { return p.storage_path; }), 3600)), box = $('mvPhotos'); if (!box) return;
        box.innerHTML = photos.map(function (p, i) {
          var u = signed[i] && signed[i].signedUrl;
          return '<figure>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Visit photo" loading="lazy"></a>' : '<p class="muted">Photo not available</p>') + '<figcaption>' + esc(L.dt(p.taken_at)) + '</figcaption></figure>';
        }).join('');
      }
    } catch (e) { L.fail(e); }
  }

  // coming back from the visits app: show the new visit without a manual refresh
  document.addEventListener('visibilitychange', function () {
    var r = L.route(); if (document.hidden || r.app !== 'myvisits') return;
    if (r.parts[0] === 'list' && $('mvXls')) load(); else if (!r.parts[0] && $('mvBody')) draw();
  });

  if (!document.getElementById('mvCss')) {
    var st = document.createElement('style'); st.id = 'mvCss';
    st.textContent = '.mv-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:8px 0 4px}.mv-photos figure{margin:0}' +
      '.mv-photos img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #e1e4e1;background:#f2f3f2}.mv-photos figcaption{font-size:.82rem;color:var(--sv-grey);margin-top:5px}' +
      '.mv-dash{max-width:1180px}.mv-range{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap;margin:0 0 14px}.mv-range label{font-weight:600;margin:0}.mv-range input{width:auto;margin:0}' +
      '.mv-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 12px}' +
      '.mv-tile{display:block;background:#fff;border:1px solid #e1e4e1;border-radius:4px;padding:14px 16px 12px;color:var(--sv-ink);text-decoration:none}' +
      '.mv-tile .l{display:block;font-weight:700;text-transform:uppercase;font-size:.74rem;letter-spacing:.02em;color:var(--sv-grey)}' +
      '.mv-tile b{display:block;font:700 2.1rem/1.15 var(--sv-display);color:var(--sv-navy);margin:4px 0 2px}.mv-tile .s{display:block;font-size:.84rem;color:var(--sv-grey);min-height:1.2em}.mv-tile .s.bad{color:#b42318;font-weight:600}' +
      '.mv-tile.todo{border-left:3px solid var(--sv-gold)}a.mv-tile:hover{border-color:var(--sv-navy);border-left-color:var(--sv-gold)}' +
      '.mv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media (max-width:900px){.mv-grid{grid-template-columns:1fr}}.mv-card{background:#fff;border:1px solid #e1e4e1;border-radius:4px;padding:14px 16px 16px;min-width:0;overflow-x:auto}' +
      '.mv-card h3{margin:0 0 12px;font:700 .78rem var(--sv-font);text-transform:uppercase;letter-spacing:.02em;color:var(--sv-grey)}.mv-card table.grid{width:100%}' +
      '.mv-bars .r{display:grid;grid-template-columns:150px 1fr 40px;align-items:center;gap:10px;margin:0 0 9px;font-size:.92rem}.mv-bars .t{height:16px;background:#f2f3f2;border-radius:2px;overflow:hidden}' +
      '.mv-bars i{display:block;height:100%;border-radius:2px}.mv-bars .a{background:var(--sv-gold)}.mv-bars .b{background:#3b6ea5}.mv-bars .c{background:#8a929e}.mv-bars .d{background:#d98c84}.mv-bars .e{background:#c9cdd3}' +
      '.mv-bars .n{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}' +
      '.mv-cols{display:flex;align-items:flex-end;gap:3px;height:170px;padding-top:4px}.mv-cols .c{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}' +
      '.mv-cols .n{font-size:.74rem;font-weight:700;color:var(--sv-ink);line-height:1.3}.mv-cols i{display:block;width:100%;max-width:38px;background:var(--sv-navy);border-radius:2px 2px 0 0}' +
      '.mv-cols .l{height:18px;margin-top:4px;font-size:.7rem;color:var(--sv-grey);white-space:nowrap;border-top:1px solid #e1e4e1;width:100%;text-align:center;overflow:visible}';
    document.head.appendChild(st);
  }

  L.register({
    key: 'myvisits', name: 'My visits', color: '#2f6b4f',
    icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    menus: [{ label: 'Overview', href: BASE }, { label: 'Visits', href: LIST }],
    route: function (r) { if (r.parts[0] === 'list') list(); else if (r.parts[0] === 'v' && r.parts[1]) visit(r.parts[1]); else overview(); }
  });
})(window.LS);
