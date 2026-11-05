/* App: Warranty. Stravik battery warranty registrations from the website (/warranty/battery/, opened from the QR code on each battery) */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.war = { text: '', active: {}, offset: 0 };
  var BASE = L.href('warranty');
  var STEPS = ['Registered', 'Claim received', 'Claim approved', 'Claim rejected', 'Closed'];
  var FILTERS = STEPS.map(function (s) { return { key: 'st_' + s, label: s, group: 'Status' }; });
  var COLS = [['ref', 'Registration no.'], ['created_at', 'Registered'], ['sv_pn', 'Stravik no.'], ['ean', 'Barcode'], ['purchase_date', 'Bought on'], ['seller', 'Bought from'], ['invoice_no', 'Invoice no.'],
    ['fitted_by', 'Fitted by'], ['vehicle', 'Vehicle'], ['reg_no', 'Vehicle reg.'], ['name', 'Name'], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['country', 'Country'], ['city', 'City'], ['status', 'Status'], ['staff_notes', 'Staff notes']];

  function query(opts) {
    var q = sb.from('stravik_battery_warranty').select('*', opts).order('created_at', { ascending: false });
    var st = STEPS.filter(function (s) { return S.active['st_' + s]; }); if (st.length) q = q.in('status', st);
    var s = L.orSearch(['ref', 'sv_pn', 'ean', 'name', 'email', 'phone', 'seller', 'invoice_no', 'reg_no'], S.text); if (s) q = q.or(s);
    return q;
  }
  function list(open) {
    L.cp({ crumbs: [['Warranty', BASE], ['Battery registrations']], buttons: '<button type="button" class="btn ghost" id="wXls">Download</button>' });
    L.searchBar({ placeholder: 'Search registration no., battery, barcode, name, email, invoice…', text: S.text, filters: FILTERS, active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; S.offset = 0; load(); } });
    $('wXls').onclick = excel;
    load().then(function () { if (open) detail(open); });
  }
  async function load() {
    try {
      var res = await query({ count: 'exact' }).range(S.offset, S.offset + L.PAGE - 1), rows = L.must(res);
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; load(); });
      if (!rows.length) return L.content(L.empty('No registrations', S.text || Object.keys(S.active).length ? 'Nothing matches the search.' : 'Customers register batteries on the website, from the QR code on the battery.'));
      L.content(L.listView([
        { label: 'Registered', render: function (r) { return esc(L.dt(r.created_at)); } },
        { label: 'Registration no.', cls: 'pn', render: function (r) { return esc(r.ref); } },
        { label: 'Battery', cls: 'pn', render: function (r) { return esc(r.sv_pn); } },
        { label: 'Bought on', render: function (r) { return esc(r.purchase_date); } },
        { label: 'Bought from', render: function (r) { return esc(r.seller); } },
        { label: 'Name', render: function (r) { return esc(r.name) + (r.company ? ' · ' + esc(r.company) : ''); } },
        { label: 'Country', render: function (r) { return esc(r.country); } },
        { label: 'Status', render: function (r) { return L.pill(r.status); } }
      ], rows, function (r) { return L.href('warranty', [r.ref]); }));
    } catch (e) { L.fail(e); }
  }
  async function detail(ref) {
    try {
      var r = L.must(await sb.from('stravik_battery_warranty').select('*').eq('ref', ref).single());
      L.modal('Warranty ' + r.ref, '<dl class="kvlist" style="display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:0">' +
        COLS.filter(function (c) { return c[0] !== 'status' && c[0] !== 'staff_notes' && r[c[0]]; }).map(function (c) {
          var v = c[0] === 'created_at' ? L.dt(r[c[0]]) : r[c[0]];
          return '<dt class="muted">' + esc(c[1]) + '</dt><dd style="margin:0">' + (c[0] === 'sv_pn' ? '<a href="/part/' + encodeURIComponent(v) + '/" target="_blank" rel="noopener">' + esc(v) + '</a>' : c[0] === 'email' ? '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>' : esc(v)) + '</dd>';
        }).join('') + '</dl>' +
        '<label for="wSt">Status</label><select id="wSt">' + STEPS.map(function (s) { return '<option' + (s === r.status ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<label for="wNote">Staff notes</label><textarea id="wNote" rows="4" style="width:100%">' + esc(r.staff_notes || '') + '</textarea>' +
        '<div style="margin-top:14px;display:flex;gap:10px"><button type="button" class="btn" id="wSave">Save</button></div>');
      $('wSave').onclick = async function () {
        try {
          L.must(await sb.from('stravik_battery_warranty').update({ status: $('wSt').value, staff_notes: $('wNote').value || null, updated_at: new Date().toISOString(), updated_by: L.EMAIL || null }).eq('ref', r.ref));
          L.toast('Saved'); L.closeModal(); load();
        } catch (e) { L.fail(e); }
      };
    } catch (e) { L.fail(e); }
  }
  async function excel() {
    try {
      L.toast('Preparing registrations…');
      var rows = await L.fetchAll(function () { return query(); });
      await L.saveXlsx([{ name: 'Battery warranty', widths: COLS.map(function (c) { return c[0] === 'staff_notes' ? 40 : 16; }), head: COLS.map(function (c) { return c[1]; }),
        rows: rows.map(function (r) { return COLS.map(function (c) { return c[0] === 'created_at' ? L.dt(r[c[0]]) : r[c[0]] == null ? '' : r[c[0]]; }); }) }], 'Stravik_battery_warranty_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  L.register({
    key: 'warranty', name: 'Warranty', color: '#2f6f4f',
    icon: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    menus: [{ label: 'Battery registrations', href: BASE }],
    route: function (r) { list(r.parts[0]); }
  });
})(window.LS);
