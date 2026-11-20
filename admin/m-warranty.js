/* App: Warranty. Stravik battery warranty registrations from the website (/warranty/battery/, opened from the QR code on each battery)
   and the battery serial numbers. Serials are made per production batch (public.stravik_serial_generate, editors) and sent to the
   factory, which prints on each battery its serial as text and its own QR code, /warranty/battery/?s=<serial> (policy V1.1).
   The fitter scans it and registers the fitment; a serial can be registered once (public.stravik_fitment_register). Format <Stravik no.>-<YYMM made>-<5 random characters>. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.war = { text: '', active: {}, offset: 0 };
  var BASE = L.href('warranty');
  var STEPS = ['Registered', 'Claim received', 'Claim approved', 'Claim rejected', 'Closed'];
  var FILTERS = STEPS.map(function (s) { return { key: 'st_' + s, label: s, group: 'Status' }; }).concat([{ key: 'ns', label: 'No serial number', group: 'Serial' }]);
  var SITE = 'https://stravikparts.com';
  var qrUrl = function (pn) { return SITE + '/warranty/battery/?pn=' + encodeURIComponent(pn); };   // battery page link (model)
  var snUrl = function (sn) { return SITE + '/warranty/battery/?s=' + encodeURIComponent(sn); };   // policy V1.1: each battery's own QR code opens the form with its serial
  // months between the production month and the purchase date: the warranty policy refuses a battery that sat in stock over 6 months
  function stockMonths(made, bought) {
    if (!made || !bought) return null;
    var a = new Date(made), b = new Date(bought); return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  }
  // policy V1.1: charging 14.8 V or below (13.8 to 14.7 V on a conventional alternator); V1.0 registrations used 13.4 to 14.4 V
  var voltOk = function (v, r) { v = Number(v); return r && r.policy_version ? v <= 14.8 : v >= 13.4 && v <= 14.4; };
  var PHOTOS = [['invoice', 'Invoice'], ['plate_vin', 'Plate or VIN'], ['ocv_reading', 'Battery voltage before fitting'], ['crank_reading', 'Cranking voltage'], ['charging_reading', 'Charging voltage'], ['tester_connected', 'Tester connected'], ['battery_fitted', 'Battery fitted'],   // form of 20 Nov 2026: a photo next to each field
    ['tester_result', 'Tester result'], ['rest_reading', 'Resting voltage reading'], ['alternator_reading', 'Alternator reading'], ['installed', 'Battery fitted'], ['serial_label', 'Serial label']];   // older registrations
  var RANGE = { resting_voltage: [12.4, 12.9], cranking_voltage: [9.6, 13.0] };
  var COLS = [['ref', 'Registration no.'], ['created_at', 'Registered'], ['policy_version', 'Policy'], ['review_flags', 'To check'], ['sv_pn', 'Stravik no.'], ['serial', 'Serial no.'], ['serial_source', 'Serial entered by'], ['made_month', 'Made'], ['ean', 'Barcode'],
    ['country', 'Country of sale'], ['city', 'City'], ['market', 'Market'], ['tier', 'Tier'], ['use_type', 'Use'], ['replaces_ref', 'Replaces'], ['cover_start', 'Cover from'], ['free_months', 'Free months'], ['free_until', 'Free until'], ['half_months', '50% months'], ['warranty_months', 'Warranty months'], ['expires_on', 'Warranty until'],
    ['seller', 'Seller'], ['seller_branch', 'Seller branch'], ['seller_contact', 'Seller contact'], ['invoice_no', 'Invoice no.'], ['purchase_date', 'Invoice date'], ['vat_no', 'VAT number'], ['invoice_file', 'Invoice photo'],
    ['fitted_by', 'Fitted by'], ['fitter_technician', 'Technician'], ['fitted_at', 'Fitted on'], ['photos', 'Photos'],
    ['vehicle', 'Vehicle'], ['vehicle_years', 'Application list years'], ['reg_no', 'Vehicle reg.'], ['chassis_no', 'VIN'], ['odometer', 'Odometer'], ['odometer_unit', 'Odometer unit'], ['start_stop', 'Start-stop or smart charging'],
    ['tester_type', 'Test equipment'], ['battery_test', 'Battery test'], ['resting_voltage', 'Battery V before fitting'], ['starting_test', 'Starting test'], ['cranking_voltage', 'Lowest cranking V'], ['charging_test', 'Charging test'], ['alt_voltage', 'Charging V'], ['loads_on_check', 'Loads-on check'], ['maker_spec', 'Maker charging spec'], ['ripple', 'Ripple'], ['bms_registration', 'Battery management registration'],
    ['voltage_flags', 'Readings outside range'], ['taxi_fleet', 'Taxi / fleet'], ['terms_version', 'Terms accepted'],
    ['name', 'Customer'], ['company', 'Company'], ['phone', 'WhatsApp'], ['email', 'Email'], ['status', 'Status'], ['staff_notes', 'Staff notes']];
  var LBL = { private: 'Private', taxi: 'Taxi', commercial: 'Commercial', qr: 'QR scan', typed: 'Typed', tester: 'Tester', voltmeter: 'Voltmeter', good: 'Good', normal: 'Normal', pass: 'Pass', not_measured: 'Not measured (voltmeter)',
    done: 'Done', not_required: 'Not required', rose: 'Rose into the normal range with the loads on', tester_normal: 'Tester Normal with the loads on', maker_spec: "Within the vehicle maker's specification", low: 'Low', ZA: 'South Africa', INT: 'International', km: 'km', hours: 'Engine hours' };

  function query(opts) {
    var q = sb.from('stravik_battery_warranty').select('*', opts).order('created_at', { ascending: false });
    var st = STEPS.filter(function (s) { return S.active['st_' + s]; }); if (st.length) q = q.in('status', st);
    var s = L.orSearch(['ref', 'sv_pn', 'serial', 'ean', 'name', 'email', 'phone', 'vat_no', 'seller', 'invoice_no', 'reg_no', 'chassis_no', 'fitted_by', 'replaces_ref'], S.text); if (s) q = q.or(s);
    if (S.active.ns) q = q.is('serial', null);
    return q;
  }
  function list(open) {
    L.cp({ crumbs: [['Warranty', BASE], ['Battery registrations']], buttons: '<button type="button" class="btn ghost" id="wXls">Download</button>' });
    L.searchBar({ placeholder: 'Search registration no., serial, battery, barcode, name, email, invoice…', text: S.text, filters: FILTERS, active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; S.offset = 0; load(); } });
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
        { label: 'Serial no.', cls: 'pn', render: function (r) { return r.serial ? esc(r.serial) : '<span class="muted small">none</span>'; } },
        { label: 'Fitted', render: function (r) { var d = r.fitted_at ? String(r.fitted_at).slice(0, 10) : r.purchase_date, m = stockMonths(r.made_month, d); return esc(d || '') + (m != null && m > 9 ? ' <span class="pill warn" title="Fitted ' + m + ' months after the batch date">' + m + ' mo in stock</span>' : ''); } },
        { label: 'To check', render: function (r) { var n = (r.review_flags || []).length; return n ? '<span class="pill warn" title="' + esc(r.review_flags.join(' ')) + '">' + n + '</span>' : ''; } },
        { label: 'Warranty until', render: function (r) { return r.expires_on ? esc(r.expires_on) + (r.expires_on < L.today() ? ' <span class="pill">expired</span>' : '') + (r.replaces_ref ? ' <span class="pill">replacement</span>' : '') + (r.use_type && r.use_type !== 'private' ? ' <span class="pill warn">' + esc(LBL[r.use_type]) + '</span>' : r.taxi_fleet ? ' <span class="pill warn">taxi/fleet</span>' : '') : ''; } },
        { label: 'Readings', render: function (r) { var n = (r.voltage_flags || []).length; return n ? '<span class="pill warn" title="' + esc(r.voltage_flags.join(' ')) + '">' + n + ' outside range</span>' : r.resting_voltage != null ? '<span class="muted small">OK</span>' : ''; } },
        { label: 'Charging', num: true, render: function (r) { return r.alt_voltage == null ? '' : voltOk(r.alt_voltage, r) ? esc(r.alt_voltage) + ' V' : '<span class="pill warn" title="Outside the charging limit: the warranty does not cover it">' + esc(r.alt_voltage) + ' V</span>'; } },
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
        COLS.filter(function (c) { return c[0] !== 'status' && c[0] !== 'staff_notes' && (c[0] === 'photos' ? Object.keys(r.photos || {}).length : c[0] === 'voltage_flags' || c[0] === 'review_flags' ? (r[c[0]] || []).length : r[c[0]] || r[c[0]] === false || r[c[0]] === 0); }).map(function (c) {
          var v = c[0] === 'created_at' || c[0] === 'fitted_at' ? L.dt(r[c[0]]) : c[0] === 'made_month' ? String(r[c[0]]).slice(0, 7) : r[c[0]];
          if (LBL[v] && typeof v === 'string') v = LBL[v];
          if (c[0] === 'start_stop') v = r.start_stop ? 'Yes' : 'No';
          if (c[0] === 'review_flags') v = r.review_flags.join(' ');
          if (c[0] === 'resting_voltage' || c[0] === 'cranking_voltage') v = v + ' V';
          if (c[0] === 'replaces_ref') return '<dt class="muted">' + esc(c[1]) + '</dt><dd style="margin:0"><a href="' + L.href('warranty', [r.replaces_ref]) + '">' + esc(r.replaces_ref) + '</a></dd>';
          if (c[0] === 'taxi_fleet') { if (r.use_type) return ''; v = r[c[0]] ? 'Yes (6-month warranty)' : 'No'; }
          if (c[0] === 'terms_version' && r.terms_accepted_at) v = v + ', ' + L.dt(r.terms_accepted_at);
          if (c[0] === 'alt_voltage') v = v + ' V' + (voltOk(v, r) ? '' : r.policy_version ? ' (above 14.8 V: not covered)' : ' (outside 13.4–14.4 V: not covered)');
          if (RANGE[c[0]] && !r.policy_version) v = v + ' V' + (Number(r[c[0]]) >= RANGE[c[0]][0] && Number(r[c[0]]) <= RANGE[c[0]][1] ? '' : ' (outside ' + RANGE[c[0]][0] + '–' + RANGE[c[0]][1] + ' V)');
          if (c[0] === 'voltage_flags') v = r.voltage_flags.join(' ') + (r.voltage_ack ? ' The customer ticked that they read the warning.' : '');
          if (c[0] === 'photos') return '<dt class="muted">' + esc(c[1]) + '</dt><dd style="margin:0;display:flex;gap:8px;flex-wrap:wrap">' + PHOTOS.filter(function (p) { return r.photos[p[0]]; }).map(function (p) { var t = (r.photo_times || {})[p[0]]; return '<button type="button" class="btn ghost small" data-photo="' + esc(r.photos[p[0]]) + '"' + (t ? ' title="Taken ' + esc(L.dt(t)) + '"' : '') + '>' + esc(p[1]) + '</button>'; }).join('') + '</dd>';
          if (c[0] === 'invoice_file') return '<dt class="muted">' + esc(c[1]) + '</dt><dd style="margin:0"><button type="button" class="btn ghost small" id="wInv">Open the invoice</button></dd>';
          if (c[0] === 'purchase_date' && !r.policy_version) { var m = stockMonths(r.made_month, r.purchase_date); if (m != null) v += ' (' + m + ' month' + (m === 1 ? '' : 's') + ' after it was made' + (m > 6 ? ': over the 6-month stock limit' : '') + ')'; }
          return '<dt class="muted">' + esc(c[1]) + '</dt><dd style="margin:0"' + (c[0] === 'review_flags' ? ' class="small"' : '') + '>' + (c[0] === 'serial' ? '<a href="' + L.href('warranty', ['serials'], { q: v }) + '">' + esc(v) + '</a>' : c[0] === 'sv_pn' ? '<a href="/part/' + encodeURIComponent(v) + '/" target="_blank" rel="noopener">' + esc(v) + '</a>' : c[0] === 'email' ? '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>' : esc(v)) + '</dd>';
        }).join('') + '</dl>' +
        '<label for="wSt">Status</label><select id="wSt">' + STEPS.map(function (s) { return '<option' + (s === r.status ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<label for="wNote">Staff notes</label><textarea id="wNote" rows="4" style="width:100%">' + esc(r.staff_notes || '') + '</textarea>' +
        '<div style="margin-top:14px;display:flex;gap:10px"><button type="button" class="btn" id="wSave">Save</button></div>');
      var openFile = async function (name) {
        try { var u = L.must(await sb.storage.from('stravik-warranty-invoices').createSignedUrl(name, 300)); window.open(u.signedUrl, '_blank', 'noopener'); } catch (e) { L.fail(e); }
      };
      if ($('wInv')) $('wInv').onclick = function () { openFile(r.invoice_file); };
      document.querySelectorAll('[data-photo]').forEach(function (b) { b.onclick = function () { openFile(b.getAttribute('data-photo')); }; });
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
        rows: rows.map(function (r) { return COLS.map(function (c) { return c[0] === 'photos' ? PHOTOS.filter(function (p) { return (r.photos || {})[p[0]]; }).map(function (p) { return p[1]; }).join(', ') : c[0] === 'voltage_flags' || c[0] === 'review_flags' ? (r[c[0]] || []).join(' ') : c[0] === 'taxi_fleet' ? (r[c[0]] == null ? '' : r[c[0]] ? 'Yes' : 'No') : c[0] === 'created_at' ? L.dt(r[c[0]]) : c[0] === 'made_month' && r[c[0]] ? String(r[c[0]]).slice(0, 7) : r[c[0]] == null ? '' : r[c[0]]; }); }) }], 'Stravik_battery_warranty_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // ===================== serial numbers =====================
  var SS = L.state.serials = { text: '', offset: 0 };
  var SBASE = L.href('warranty', ['serials']);
  var ym = function (d) { return d ? String(d).slice(0, 7) : ''; };
  function serials(batchId, q) {
    if (q && q.q) SS.text = q.q;
    L.cp({ crumbs: [['Warranty', BASE], ['Serial numbers']], buttons: L.isEditor() ? '<button type="button" class="btn" id="snNew">New batch</button>' : '' });
    L.searchBar({ placeholder: 'Search a serial number, battery or order…', text: SS.text, onChange: function (s) { SS.text = s.text; SS.offset = 0; loadSerials(); } });
    if ($('snNew')) $('snNew').onclick = newBatch;
    loadSerials().then(function () { if (batchId) batch(Number(batchId)); });
  }
  async function loadSerials() {
    try {
      var t = SS.text.trim(), html = '', key = L.clean(t);
      // a serial number: show that battery
      if (/^SV[A-Z0-9]{6}\d{4}[A-Z0-9]{1,5}$/.test(key)) {
        var like = key.slice(0, 8) + '-' + key.slice(8, 12) + '-' + key.slice(12) + '%';
        var hits = L.must(await sb.from('stravik_battery_serials').select('*').like('serial', like).limit(20));
        html += '<h3 style="margin:4px 0 10px">Serial numbers</h3>' + (hits.length ? L.listView([
          { label: 'Serial no.', cls: 'pn', render: function (r) { return esc(r.serial); } },
          { label: 'Battery', cls: 'pn', render: function (r) { return esc(r.sv_pn); } },
          { label: 'Made', render: function (r) { return esc(ym(r.made_month)); } },
          { label: 'Status', render: function (r) { return L.pill(r.status); } },
          { label: 'Registration', render: function (r) { return r.warranty_ref ? '<a href="' + L.href('warranty', [r.warranty_ref]) + '">' + esc(r.warranty_ref) + '</a>' : ''; } },
          { label: '', render: function (r) { return L.isEditor() && r.status === 'Issued' ? '<button type="button" class="btn ghost small" data-void="' + esc(r.serial) + '">Void</button>' : L.isEditor() && r.status === 'Void' ? '<button type="button" class="btn ghost small" data-unvoid="' + esc(r.serial) + '">Reissue</button>' : ''; } }
        ], hits, function (r) { return L.href('warranty', ['serials', String(r.batch_id)], { q: SS.text }); }) : '<p class="muted">No serial number starts with ' + esc(like.slice(0, -1)) + '.</p>') + '<h3 style="margin:22px 0 10px">Batches</h3>';
      }
      var bq = sb.from('stravik_serial_batch_summary').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (t && !html) { var o = L.orSearch(['sv_pn', 'order_ref', 'supplier', 'short_desc'], t); if (o) bq = bq.or(o); }
      var res = await bq.range(SS.offset, SS.offset + L.PAGE - 1), rows = L.must(res);
      L.pager(SS.offset, res.count || 0, function (o) { SS.offset = o; loadSerials(); });
      html += rows.length ? L.listView([
        { label: 'Created', render: function (r) { return esc(L.dt(r.created_at)); } },
        { label: 'Battery', cls: 'pn', render: function (r) { return esc(r.sv_pn); } },
        { label: 'Description', cls: 'clip', render: function (r) { return esc(r.short_desc || ''); } },
        { label: 'Made', render: function (r) { return esc(ym(r.made_month)); } },
        { label: 'Serials', num: true, render: function (r) { return Number(r.issued).toLocaleString(); } },
        { label: 'Registered', num: true, render: function (r) { return Number(r.registered).toLocaleString() + (r.voided > 0 ? ' <span class="muted small">(' + r.voided + ' void)</span>' : ''); } },
        { label: 'Order', render: function (r) { return esc(r.order_ref || ''); } },
        { label: 'Supplier', render: function (r) { return esc(r.supplier || ''); } }
      ], rows, function (r) { return L.href('warranty', ['serials', String(r.id)]); }) :
        L.empty('No serial numbers yet', 'Create a batch for each production order: choose the battery, the quantity and the month it is made. Send the file to the factory to print a serial number on each battery, next to the QR code.');
      L.content(html);
      $('content').onclick = async function (e) {
        var v = e.target.closest('[data-void],[data-unvoid]'); if (!v) return;
        var sn = v.dataset.void || v.dataset.unvoid;
        try { L.must(await sb.from('stravik_battery_serials').update({ status: v.dataset.void ? 'Void' : 'Issued', updated_at: new Date().toISOString(), updated_by: L.EMAIL || null }).eq('serial', sn).neq('status', 'Registered')); L.toast(v.dataset.void ? sn + ' voided: it can no longer be registered' : sn + ' can be registered again'); loadSerials(); } catch (err) { L.fail(err); }
      };
    } catch (e) { L.fail(e); }
  }
  async function newBatch() {
    try {
      var bats = await L.fetchAll(function () { return sb.from('stravik_parts').select('sv_pn,short_desc').eq('subcategory', 'Batteries').eq('status', 'Active').order('sv_pn'); });
      var d = new Date(), mon = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      L.modal('New batch of serial numbers',
        '<p class="small muted" style="margin-top:0">One batch per battery model and production order. Each battery gets its own serial, for example <b>SVPDH003-2611-7K3M9</b>: the Stravik number, the month it is made (YYMM) and 5 random characters. Each battery also gets its own QR code with its serial, which opens the fitment registration with the serial filled in; each serial can be registered once.</p>' +
        '<label for="snPn">Battery</label><select id="snPn" style="width:100%">' + bats.map(function (b) { return '<option value="' + esc(b.sv_pn) + '">' + esc(b.sv_pn + ' · ' + (b.short_desc || '')) + '</option>'; }).join('') + '</select>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><label for="snQty">Quantity</label><input id="snQty" type="number" min="1" max="50000" step="1" style="width:100%"></div>' +
        '<div><label for="snMade">Month made</label><input id="snMade" type="month" value="' + mon + '" style="width:100%"></div>' +
        '<div><label for="snOrd">Order / PO number</label><input id="snOrd" maxlength="60" style="width:100%"></div>' +
        '<div><label for="snSup">Supplier</label><input id="snSup" maxlength="80" style="width:100%"></div></div>' +
        '<label for="snNote">Note</label><input id="snNote" maxlength="200" style="width:100%">' +
        '<div style="margin-top:14px;display:flex;gap:10px;align-items:center"><button type="button" class="btn" id="snGo">Create serial numbers</button><span class="small muted" id="snMsg"></span></div>');
      $('snGo').onclick = async function () {
        var qty = Number($('snQty').value), made = $('snMade').value;
        if (!(qty >= 1 && qty <= 50000 && Math.floor(qty) === qty)) { $('snMsg').textContent = 'Enter a quantity from 1 to 50,000.'; return; }
        if (!/^\d{4}-\d{2}$/.test(made)) { $('snMsg').textContent = 'Choose the month the batteries are made.'; return; }
        this.disabled = true; $('snMsg').textContent = 'Creating ' + qty.toLocaleString() + ' serial numbers…';
        try {
          var r = L.must(await sb.rpc('stravik_serial_generate', { p_sv_pn: $('snPn').value, p_qty: qty, p_made: made + '-01', p_order: $('snOrd').value, p_supplier: $('snSup').value, p_note: $('snNote').value }));
          L.closeModal(); L.toast(Number(r.qty).toLocaleString() + ' serial numbers created for ' + r.sv_pn); SS.text = ''; L.go(L.href('warranty', ['serials', String(r.batch)]));
        } catch (e) { this.disabled = false; $('snMsg').textContent = ''; L.fail(e); }
      };
    } catch (e) { L.fail(e); }
  }
  async function batch(id) {
    try {
      var b = L.must(await sb.from('stravik_serial_batch_summary').select('*').eq('id', id).single());
      var sample = L.must(await sb.from('stravik_battery_serials').select('serial').eq('batch_id', id).order('serial').limit(3));
      L.modal('Batch ' + b.sv_pn + ' · ' + ym(b.made_month),
        '<dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:0 0 14px">' +
        [['Battery', esc(b.sv_pn + ' · ' + (b.short_desc || ''))], ['Barcode', esc(b.barcode || '')], ['Made', esc(ym(b.made_month))], ['Serial numbers', Number(b.issued).toLocaleString()],
         ['Registered', Number(b.registered).toLocaleString() + (b.voided ? ' · ' + b.voided + ' void' : '')], ['Order / PO', esc(b.order_ref || '')], ['Supplier', esc(b.supplier || '')], ['Note', esc(b.note || '')],
         ['Created', esc(L.dt(b.created_at) + (b.created_by ? ' by ' + b.created_by : ''))], ['Example', sample.map(function (s) { return '<code>' + esc(s.serial) + '</code>'; }).join(' ')]]
          .filter(function (p) { return p[1]; }).map(function (p) { return '<dt class="muted">' + p[0] + '</dt><dd style="margin:0">' + p[1] + '</dd>'; }).join('') + '</dl>' +
        '<p class="small muted">The factory file has one row per battery: the serial number to print and its own QR code content, for example <code>' + esc(snUrl(sample.length ? sample[0].serial : b.sv_pn)) + '</code>. Scanning it opens the fitment registration with that serial filled in.</p>' +
        '<div style="display:flex;gap:10px"><button type="button" class="btn" id="snXls">Download for the factory</button></div>', true);
      $('snXls').onclick = function () { factoryFile(b); };
    } catch (e) { L.fail(e); }
  }
  async function factoryFile(b) {
    try {
      L.toast('Preparing ' + Number(b.issued).toLocaleString() + ' serial numbers…');
      var rows = await L.fetchAll(function () { return sb.from('stravik_battery_serials').select('serial,status').eq('batch_id', b.id).order('serial'); });
      await L.saveXlsx([
        { name: 'Serial numbers', widths: [26, 62, 12, 40, 16, 9, 14],
          top: [['Stravik battery serial numbers', ''], ['Battery', b.sv_pn + ' · ' + (b.short_desc || '')], ['Made', ym(b.made_month)], ['Order / PO', b.order_ref || ''], ['Quantity', rows.length], ['QR code', 'One per battery: the QR content in column B, never the same on two batteries']],
          head: ['Serial number (print as text)', 'QR code content (this battery only)', 'Stravik no.', 'Battery', 'Barcode (EAN)', 'Made', 'Status'],
          rows: rows.map(function (r) { return [r.serial, snUrl(r.serial), b.sv_pn, b.short_desc || '', b.barcode || '', ym(b.made_month), r.status]; }) },
        { name: 'Printing instructions', widths: [110], head: ['How to print the serial number'],
          rows: [['Print one serial number per battery, each serial once only. Do not reuse or copy serial numbers between batteries.'],
            ['Print the serial number as clear, readable text (for example SVPDH003-2611-7K3M9), at least 3 mm high, in a plain font where every character is easy to read.'],
            ['Print a QR code for each battery with the content in column B of its row. Each QR code holds that battery\'s own serial number: never print the same QR code on two batteries.'],
            ['Print the serial number as text right next to its QR code, labelled "Serial no.", so it can be typed if the QR code is damaged.'],
            ['Place it on the top or front of the battery, where it can be read after the battery is fitted, and where it will not be covered by the hold-down clamp.'],
            ['Serial format: Stravik battery number, month made (YYMM), 5 characters. The 5 characters never use the letters O or I or the digits 0 or 1.'],
            ['Return any unused or damaged labels\' serial numbers to Zenter Parts so they can be voided.']] }
      ], 'Stravik_serials_' + b.sv_pn + '_' + ym(b.made_month) + '_batch' + b.id + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  L.register({
    key: 'warranty', name: 'Warranty', color: '#2f6f4f',
    icon: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    menus: [{ label: 'Battery registrations', href: BASE }, { label: 'Serial numbers', href: SBASE }],
    route: function (r) { if (r.parts[0] === 'serials') serials(r.parts[1], r.q); else list(r.parts[0]); }
  });
})(window.LS);
