/* App: My visits. Each person's own customer site visits and visit reports, written with the phone app (/visits/).
   Shows the report side only: site, date, time on site, outcome, follow-up, summary and the photos added to the report.
   Every staff member has this app and sees only their own visits: the list is filtered to the signed-in person, and row
   level security enforces it. Positions, distances and checks are not shown here; they are in the Site visits app.
   Read-only: reports are written and changed in the phone app. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.myvisits = { text: '', active: {}, offset: 0 };
  var BASE = L.href('myvisits'), BUCKET = 'stravik-visit-photos';
  var FIELDS = 'id,site_id,check_in_at,check_out_at,notes,outcome,follow_up,follow_up_on,follow_up_done_at,reported_at,site:stravik_visit_sites(name,country,city)';
  var OUT = { proceed: ['Moving forward', 'Won'], in_progress: ['In discussion', 'Quoted'], no_business: ['Not at this time', 'Lost'] };   // label, pill colour
  var FILTERS = [
    { key: 'o_proceed', label: 'Moving forward', group: 'Outcome' }, { key: 'o_in_progress', label: 'In discussion', group: 'Outcome' }, { key: 'o_no_business', label: 'Not at this time', group: 'Outcome' },
    { key: 'norep', label: 'Report to complete', group: 'Report' }, { key: 'fu', label: 'Follow-up open', group: 'Report' },
    { key: 'd7', label: 'Last 7 days', group: 'Date', single: true }, { key: 'd30', label: 'Last 30 days', group: 'Date', single: true }, { key: 'd90', label: 'Last 90 days', group: 'Date', single: true }
  ];

  async function me() { var s = (await sb.auth.getSession()).data.session; if (!s) throw new Error('Please sign in again.'); return s.user.id; }
  function mins(v) { return v.check_out_at ? Math.max(0, Math.round((new Date(v.check_out_at) - new Date(v.check_in_at)) / 60000)) : null; }
  function durText(m) { return m == null ? '' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 < 10 ? '0' : '') + (m % 60) + ' min'; }
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
    L.cp({ crumbs: [['My visits']], buttons: '<button type="button" class="btn ghost" id="mvXls">Download</button>' });
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
      L.content(rows.length ? L.listView(COLS, rows, function (v) { return L.href('myvisits', [v.id]); })
        : L.empty('No visits found', S.text || Object.keys(S.active).length ? 'Try a different search or remove a filter.' : 'Your visits appear here after you start one in the phone app at <b>' + esc(location.host) + '/visits/</b>.'));
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

  async function visit(id) {
    try {
      var uid = await me();
      var v = L.must(await sb.from('stravik_visits').select(FIELDS).eq('id', id).eq('user_id', uid).maybeSingle());
      if (!v) { L.cp({ crumbs: [['My visits', BASE], ['Not found']] }); return L.content(L.empty('Visit not found', 'It is not one of your visits, or it has been removed.')); }
      var photos = L.must(await sb.from('stravik_visit_photos').select('id,storage_path,taken_at').eq('visit_id', id).eq('user_id', uid).neq('kind', 'check_in').order('taken_at'));
      var name = v.site ? v.site.name : 'Site';
      var sheet = '<h1>' + esc(name) + '</h1><p class="muted">' + esc(where(v)) + '</p><div class="o-groups">' +
        L.group('Visit', [['Started', esc(L.dt(v.check_in_at))], ['Ended', v.check_out_at ? esc(L.dt(v.check_out_at)) : L.pill('In progress', 'New')], ['Time on site', esc(durText(mins(v)))]]) +
        L.group('Visit report', v.reported_at ? [['Outcome', outcome(v)], ['Follow-up needed', v.outcome === 'no_business' ? '' : v.follow_up ? 'Yes' : 'No'], ['Follow-up date', esc(fuDate(v.follow_up_on))],
          ['Follow-up done', v.follow_up_done_at ? esc(L.dt(v.follow_up_done_at)) : ''], ['Report written', esc(L.dt(v.reported_at))]]
          : [['Outcome', outcome(v)], ['Report', '<span class="muted">Write it in the phone app, under "Reports to complete".</span>']]) +
        '</div><div class="o-group-title">Summary and comments</div><p style="white-space:pre-wrap;max-width:70ch">' + (v.notes ? esc(v.notes) : '<span class="muted">Nothing written yet.</span>') + '</p>' +
        '<div class="o-group-title">Photos (' + photos.length + ')</div><div id="mvPhotos" class="mv-photos">' + (photos.length ? '<p class="muted">Loading photos…</p>' : '<p class="muted">No photos were added to this report.</p>') + '</div>';
      L.form({ crumbs: [['My visits', BASE], [name]], sheet: sheet });
      if (photos.length) {
        var signed = L.must(await sb.storage.from(BUCKET).createSignedUrls(photos.map(function (p) { return p.storage_path; }), 3600)), box = $('mvPhotos'); if (!box) return;
        box.innerHTML = photos.map(function (p, i) {
          var u = signed[i] && signed[i].signedUrl;
          return '<figure>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Visit photo" loading="lazy"></a>' : '<p class="muted">Photo not available</p>') + '<figcaption>' + esc(L.dt(p.taken_at)) + '</figcaption></figure>';
        }).join('');
      }
    } catch (e) { L.fail(e); }
  }

  if (!document.getElementById('mvCss')) {
    var st = document.createElement('style'); st.id = 'mvCss';
    st.textContent = '.mv-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:8px 0 4px}.mv-photos figure{margin:0}' +
      '.mv-photos img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #e1e4e1;background:#f2f3f2}.mv-photos figcaption{font-size:.82rem;color:var(--sv-grey);margin-top:5px}';
    document.head.appendChild(st);
  }

  L.register({
    key: 'myvisits', name: 'My visits', color: '#2f6b4f',
    icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    menus: [{ label: 'My visits', href: BASE }],
    route: function (r) { if (r.parts[0]) visit(r.parts[0]); else list(); }
  });
})(window.LS);
