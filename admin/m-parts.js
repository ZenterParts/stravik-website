/* App: Parts & prices (Stravik). Everyone on the staff list views and downloads; the data team edits and uploads.
   Tables: stravik_parts, stravik_specs, stravik_oe_numbers, stravik_cross_refs, stravik_applications, stravik_packaging,
   stravik_prices (FOB, cost build-up, margin per region) and the view stravik_price_list (landed cost and regional prices, calculated).
   Every change is written to stravik_part_history by the database. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.parts = { range: '', text: '', active: {}, offset: 0, counts: null };
  var BASE = L.href('parts');
  var STATUSES = ['Proposed', 'Active', 'Inactive'];
  var BASE_FILTERS = [
    { key: 'st_Proposed', label: 'Proposed', group: 'Status', single: true }, { key: 'st_Active', label: 'Active', group: 'Status', single: true }, { key: 'st_Inactive', label: 'Inactive', group: 'Status', single: true },
    { key: 'web_on', label: 'On the website', group: 'Website', single: true }, { key: 'web_off', label: 'Hidden from the website', group: 'Website', single: true },
    { key: 'pr_with', label: 'With FOB price', group: 'Price', single: true }, { key: 'pr_without', label: 'Without FOB price', group: 'Price', single: true }
  ];
  var SEARCH = {
    stravik_filters_full: ['sv_pn', 'description', 'website_description', 'oe_numbers', 'cross_references', 'supplier_pn', 'vehicle_makes', 'vehicles', 'source_inquiry'],
    stravik_steering_suspension_full: ['sv_pn', 'description', 'position', 'ctr_number', 'old_ctr_numbers', 'oe_numbers', 'vehicle_makes'],
    stravik_shock_absorbers_full: ['sv_pn', 'description', 'position', 'external_no', 'oe_numbers', 'vehicle_makes']
  };
  var REGIONS = [['north_africa', 'North Africa'], ['east_africa', 'East Africa'], ['west_africa', 'West Africa'], ['central_africa', 'Central Africa'],
    ['southern_africa', 'Southern Africa'], ['ocean_islands', 'Indian Ocean Islands'], ['gcc', 'GCC'], ['middle_east', 'Middle East']];
  var COSTS = [['c_cons', 'Consolidation'], ['c_finance', 'Finance'], ['c_ship', 'Shipping'], ['c_ins', 'Insurance'], ['c_whs', 'Warehousing'], ['c_war', 'Warranty'],
    ['c_mark', 'Marketing'], ['c_roy', 'Royalty'], ['c_customer_disc', 'Customer discount']];
  var PACK = [['net_weight_kg', 'Net weight (kg)', 1], ['gross_weight_kg', 'Gross weight (kg)', 1], ['dimensions_mm', 'Product dimensions (mm)'], ['packaging', 'Packaging'],
    ['units_per_box', 'Units per box', 1], ['units_per_carton', 'Units per carton', 1], ['carton_dims_mm', 'Carton dimensions (mm)'], ['cartons_per_pallet', 'Cartons per pallet', 1],
    ['units_per_pallet', 'Units per pallet', 1], ['pallet_dims_mm', 'Pallet dimensions (mm)'], ['pallet_gross_kg', 'Pallet gross weight (kg)', 1]];
  var GEN = [['short_desc', 'Description'], ['web_desc', 'Website description'], ['long_desc', 'Long description'], ['brand', 'Brand'], ['supplier_pn', 'Supplier PN'], ['manufacturer', 'Supplier / manufacturer'],
    ['origin', 'Origin'], ['barcode', 'Barcode'], ['gtin', 'GTIN / UPC'], ['hs_code', 'HS code'], ['base_no', 'Base no. (pairs)'], ['side', 'Side'], ['source_inquiry', 'Source inquiry']];
  var LISTS = {
    specs: { table: 'stravik_specs', cols: [['attribute', 'Attribute'], ['value', 'Value']], req: 'attribute' },
    oe: { table: 'stravik_oe_numbers', cols: [['oe_number', 'OE number'], ['oe_brand', 'Vehicle brand']], req: 'oe_number' },
    comp: { table: 'stravik_cross_refs', cols: [['comp_brand', 'Brand (CTR, GUD, MANN…)'], ['comp_number', 'Number']], req: 'comp_number' }
  };
  var money4 = function (v) { return v == null || v === '' ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); };
  var pctIn = function (v) { return v == null || v === '' ? '' : String(+(Number(v) * 100).toFixed(4)); };

  function cat() { return L.cat(S.range) || L.CATS[0]; }
  function filtersFor(c) {
    return BASE_FILTERS.concat(L.typesOf(c.subcategory_key).map(function (t) { return { key: 'ty_' + t.code, label: t.name_plural || t.name, group: 'Type' }; }));
  }
  function query(c, opts) {
    var q = sb.from(c.view_name).select('*', opts), A = S.active;
    STATUSES.forEach(function (st) { if (A['st_' + st]) q = q.eq('status', st); });
    if (A.web_on) q = q.eq('on_website', true);
    if (A.web_off) q = q.eq('on_website', false);
    if (A.pr_with) q = q.not('fob_usd', 'is', null);
    if (A.pr_without) q = q.is('fob_usd', null);
    var types = L.typesOf(c.subcategory_key).filter(function (t) { return A['ty_' + t.code]; }).map(function (t) { return t.name; });
    if (types.length) q = q.in('type', types);
    var s = L.orSearch(SEARCH[c.view_name] || ['sv_pn', 'description', 'oe_numbers'], S.text); if (s) q = q.or(s);
    return q.order('sv_pn');
  }

  // ---------- list with the range side panel ----------
  async function list(r) {
    if (r.q.range && L.cat(r.q.range)) { if (S.range !== r.q.range) { S.offset = 0; Object.keys(S.active).forEach(function (k) { if (k.indexOf('ty_') === 0) delete S.active[k]; }); } S.range = r.q.range; }
    var c = cat(); S.range = c.subcategory_key;
    L.cp({ crumbs: [['Parts & prices', BASE], [c.name]],
      buttons: '<button type="button" class="btn editor-only" id="ptNew">New</button><button type="button" class="btn ghost" id="ptXls">Download</button>' });
    L.searchBar({ placeholder: 'Search Stravik no., description, OE, CTR or cross-reference number…', text: S.text, filters: filtersFor(c), active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; S.offset = 0; load(); } });
    $('ptNew').onclick = function () { addPart(); };
    $('ptXls').onclick = exportRange;
    if (!S.counts) { try { S.counts = {}; L.must(await sb.from('stravik_category_overview').select('subcategory_key,item_count').eq('status', 'live')).forEach(function (x) { S.counts[x.subcategory_key] = x.item_count; }); } catch (e) { S.counts = null; } }
    L.content('<div class="o-with-panel"><nav class="o-panel"><div class="o-panel-title">Range</div>' + L.CATS.map(function (x) {
      return '<a href="' + L.href('parts', [], { range: x.subcategory_key }) + '" class="' + (x === c ? 'on' : '') + '">' + esc(x.name) + '<small>' + (S.counts && S.counts[x.subcategory_key] != null ? Number(S.counts[x.subcategory_key]).toLocaleString() : '') + '</small></a>';
    }).join('') + '</nav><div id="ptList"></div></div>');
    load();
  }
  function cols(rows) { return Object.keys(rows[0]); }
  async function load() {
    var c = cat();
    try {
      var res = await query(c, { count: 'exact' }).range(S.offset, S.offset + L.PAGE - 1), rows = L.must(res);
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; load(); });
      if (!rows.length) { $('ptList').innerHTML = L.empty('No parts', 'Nothing matches the search and filters.'); return; }
      $('ptList').innerHTML = L.listView(cols(rows).map(function (k) { return { key: k, label: L.label(k), num: L.NUMCOLS.test(k) || L.PCTCOLS.test(k), render: L.NUMCOLS.test(k) || L.PCTCOLS.test(k) ? function (r) { return L.cell(k, r[k]).replace(/^<td[^>]*>|<\/td>$/g, ''); } : null }; }),
        rows, function (r) { return L.href('parts', ['p', r.sv_pn]); });
    } catch (e) { L.fail(e); }
  }
  async function exportRange() {
    var c = cat(); L.toast('Preparing ' + c.name + '…');
    try {
      var rows = await L.fetchAll(function () { return query(c); });
      if (!rows.length) return L.toast('Nothing to download');
      var k = cols(rows);
      await L.saveXlsx([{ name: c.name, head: k.map(L.label), rows: rows.map(function (r) { return k.map(function (x) { var v = r[x]; return v == null ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : (L.NUMCOLS.test(x) || L.PCTCOLS.test(x)) ? Number(v) : v; }); }) }],
        'Stravik_' + c.name.replace(/[^A-Za-z0-9]+/g, '_') + '_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // ---------- part form ----------
  function inp(id, v, attrs) { return '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (L.isEditor() ? '' : ' readonly') + (attrs || '') + '>'; }
  function rowHtml(key, it) {
    return '<div class="row" data-id="' + esc(it.id || '') + '">' + LISTS[key].cols.map(function (c) { return '<input data-f="' + c[0] + '" placeholder="' + c[1] + '" value="' + esc(it[c[0]] == null ? '' : it[c[0]]) + '"' + (L.isEditor() ? '' : ' readonly') + '>'; }).join('') +
      (key === 'comp' && it.is_current === false ? '<span class="pill" title="Older number, kept for searches">old</span>' : '') +
      '<button type="button" class="x editor-only" title="Remove">×</button></div>';
  }
  function rowsHtml(key, items) { return '<div class="rows" id="rows-' + key + '">' + items.map(function (it) { return rowHtml(key, it); }).join('') + '</div><button type="button" class="btn ghost small editor-only" data-add="' + key + '" style="margin-top:10px">+ Add a line</button>' + (items.length ? '' : '<p class="muted small viewer-note">None recorded.</p>'); }
  function readRows(key) {
    return Array.from(document.querySelectorAll('#rows-' + key + ' .row')).map(function (r) { var o = { id: r.dataset.id ? Number(r.dataset.id) : null }; LISTS[key].cols.forEach(function (c) { o[c[0]] = r.querySelector('[data-f="' + c[0] + '"]').value.trim(); }); return o; });
  }
  function pricesTab(pr, pl, ed) {
    var cost = '<tr><td>FOB (USD)</td><td class="num">' + (ed ? '<input id="g_fob_usd" inputmode="decimal" value="' + esc(pr.fob_usd == null ? '' : pr.fob_usd) + '" style="width:110px;text-align:right">' : money4(pr.fob_usd)) + '</td></tr>' +
      COSTS.map(function (c) { return '<tr><td>' + esc(c[1]) + '</td><td class="num">' + (ed ? '<input id="g_' + c[0] + '" inputmode="decimal" value="' + esc(pctIn(pr[c[0]])) + '" style="width:80px;text-align:right"> %' : esc(pctIn(pr[c[0]])) + (pr[c[0]] == null ? '' : '%')) + '</td></tr>'; }).join('') +
      '<tr><td><b>Landed cost (USD)</b></td><td class="num"><b>' + money4(pl.landed_cost) + '</b></td></tr>';
    var reg = REGIONS.map(function (g) {
      return '<tr><td>' + esc(g[1]) + '</td><td class="num">' + (ed ? '<input id="g_m_' + g[0] + '" inputmode="decimal" value="' + esc(pctIn(pr['margin_' + g[0]])) + '" style="width:70px;text-align:right"> %' : esc(pctIn(pr['margin_' + g[0]])) + (pr['margin_' + g[0]] == null ? '' : '%')) +
        '</td><td class="num"><b>' + L.money(pl['price_' + g[0]]) + '</b></td></tr>';
    }).join('');
    return '<p class="muted small">Landed cost = FOB × (1 + the cost percentages). Regional price = landed cost ÷ (1 − margin), rounded to 0.1. Sales price = the highest regional price. Change the FOB, a cost or a margin and save: the prices recalculate. Prices are internal and never shown on the Stravik website.</p>' +
      '<div style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start"><div><h3 style="margin:0 0 6px">Cost build-up</h3><table class="grid compact"><tbody>' + cost + '</tbody></table></div>' +
      '<div><h3 style="margin:0 0 6px">Prices by region (USD)</h3><table class="grid compact"><thead><tr><th>Region</th><th class="num">Margin</th><th class="num">Price</th></tr></thead><tbody>' + reg +
      '<tr><td><b>Sales price</b></td><td></td><td class="num"><b>' + L.money(pl.sales_price) + '</b></td></tr></tbody></table></div>' +
      '<div style="min-width:260px">' + L.group('', [['Price list', inp('g_price_list', pr.price_list)], ['MOQ', inp('g_moq', pr.moq, ' inputmode="numeric"')], ['Price source', inp('g_price_source', pr.price_source)]]) +
      '<div class="o-group-title" style="margin-top:10px">Pricing and supplier notes</div><textarea id="g_notes" rows="3"' + (ed ? '' : ' readonly') + '>' + esc(pr.notes || '') + '</textarea>' +
      (pr.updated_at ? '<p class="muted small">Last changed ' + esc(L.dt(pr.updated_at)) + (pr.updated_by ? ' by ' + esc(pr.updated_by) : '') + '</p>' : '') + '</div></div>';
  }

  async function partForm(pn) {
    try {
      var r = await Promise.all([
        sb.from('stravik_parts').select('*').eq('sv_pn', pn).maybeSingle(),
        sb.from('stravik_prices').select('*').eq('sv_pn', pn).maybeSingle(),
        sb.from('stravik_price_list').select('*').eq('sv_pn', pn).maybeSingle(),
        sb.from('stravik_specs').select('*').eq('sv_pn', pn).order('id'),
        sb.from('stravik_oe_numbers').select('*').eq('sv_pn', pn).order('seq', { nullsFirst: false }).order('id'),
        sb.from('stravik_cross_refs').select('*').eq('sv_pn', pn).order('comp_brand').order('is_current', { ascending: false }).order('seq', { nullsFirst: false }),
        sb.from('stravik_applications').select('*', { count: 'exact' }).eq('sv_pn', pn).order('seq', { nullsFirst: false }).order('make').order('model').limit(500),
        sb.from('stravik_packaging').select('*').eq('sv_pn', pn).maybeSingle(),
        sb.from('stravik_inventory').select('*').eq('sv_pn', pn).order('warehouse'),
        sb.from('stravik_part_history').select('*', { count: 'exact' }).eq('sv_pn', pn).order('at', { ascending: false }).order('id', { ascending: false }).limit(300)
      ]);
      var p = L.must(r[0]);
      if (!p) {
        var alt = L.must(await sb.from('stravik_parts').select('sv_pn').eq('pn_clean', L.clean(pn)).maybeSingle());
        if (alt) return L.openPart(alt.sv_pn);
        L.cp({ crumbs: [['Parts & prices', BASE], [pn]] }); return L.content(L.empty('Part not found', esc(pn) + ' is not in the Stravik database.'));
      }
      var pr = L.must(r[1]) || {}, pl = L.must(r[2]) || {}, specs = L.must(r[3]), oe = L.must(r[4]), comp = L.must(r[5]),
        apps = L.must(r[6]), appCount = r[6].count || apps.length, pack = L.must(r[7]) || {}, stock = L.must(r[8]), ed = L.isEditor();
      var orig = { specs: specs, oe: oe, comp: comp }, c = L.cat(p.subcategory) || { name: p.subcategory }, ty = L.type(p.part_type);
      var avail = stock.reduce(function (s, x) { return s + Number(x.qty_on_hand) - Number(x.qty_reserved); }, 0);
      var ean = p.barcode && L.ean13Valid && L.ean13Valid(p.barcode) ? L.ean13Svg(p.barcode, 24) : '';
      var typeSel = '<select id="p_part_type"' + (ed ? '' : ' disabled') + '><option value="">—</option>' + L.typesOf(p.subcategory).map(function (t) { return '<option value="' + esc(t.code) + '"' + (t.code === p.part_type ? ' selected' : '') + '>' + esc(t.name) + ' (' + esc(t.code) + ')</option>'; }).join('') + '</select>';
      var tabs = [];
      tabs.push({ key: 'specs', label: 'Specifications <span class="muted">(' + specs.length + ')</span>', html: rowsHtml('specs', specs) });
      tabs.push({ key: 'oe', label: 'OE numbers <span class="muted">(' + oe.length + ')</span>', html: rowsHtml('oe', oe) });
      tabs.push({ key: 'comp', label: 'Cross references <span class="muted">(' + comp.length + ')</span>', html: rowsHtml('comp', comp) });
      tabs.push({ key: 'veh', label: 'Vehicles <span class="muted">(' + appCount + ')</span>', html:
        (appCount > apps.length ? '<p class="muted small">First ' + apps.length + ' of ' + appCount + ' shown.</p>' : '') +
        '<div class="o-list"><table class="grid" id="appsTable"><thead><tr><th>Make</th><th>Model</th><th>Model / engine code</th><th>Engine</th><th>Years</th><th>Position</th><th>Details</th><th class="editor-only"></th></tr></thead><tbody>' +
        apps.map(function (a) { return '<tr><td>' + esc(a.make) + '</td><td>' + esc(a.model) + '</td><td>' + esc(a.model_code) + '</td><td>' + esc(a.engine_code) + '</td><td>' + esc(a.years) + '</td><td>' + esc(a.position) + '</td><td class="clip">' + esc(a.description) + '</td><td class="editor-only"><button class="link" data-delapp="' + a.id + '">Remove</button></td></tr>'; }).join('') +
        '</tbody></table></div><div class="editor-only"><div class="o-group-title" style="margin-top:14px">Add a vehicle</div><div class="cols2" id="newApp">' + [['make', 'Make'], ['model', 'Model'], ['model_code', 'Model / engine code'], ['engine_code', 'Engine'], ['years', 'Years'], ['position', 'Position'], ['description', 'Details']].map(function (f) { return '<label>' + f[1] + '<input data-f="' + f[0] + '"></label>'; }).join('') +
        '</div><div class="o-footer"><button type="button" class="btn ghost" id="addApp">Add vehicle</button></div></div>' });
      tabs.push({ key: 'price', label: 'Prices', html: pricesTab(pr, pl, ed) });
      tabs.push({ key: 'pack', label: 'Packaging', html: '<div class="o-groups">' + L.group('', PACK.slice(0, 6).map(function (f) { return [f[1], inp('k_' + f[0], pack[f[0]], f[2] ? ' inputmode="decimal"' : '')]; })) + L.group('', PACK.slice(6).map(function (f) { return [f[1], inp('k_' + f[0], pack[f[0]], f[2] ? ' inputmode="decimal"' : '')]; })) + '</div>' });
      tabs.push({ key: 'stock', label: 'Stock <span class="muted">(' + L.qty(avail) + ')</span>', html: stock.length ?
        '<table class="grid compact"><thead><tr><th>Warehouse</th><th>Bin</th><th class="num">On hand</th><th class="num">Reserved</th><th class="num">Available</th><th>Updated</th></tr></thead><tbody>' +
        stock.map(function (s) { return '<tr><td>' + esc(s.warehouse) + '</td><td>' + esc(s.bin || '') + '</td><td class="num">' + L.qty(s.qty_on_hand) + '</td><td class="num">' + L.qty(s.qty_reserved) + '</td><td class="num">' + L.qty(s.qty_on_hand - s.qty_reserved) + '</td><td class="small">' + esc(L.dt(s.updated_at)) + '</td></tr>'; }).join('') + '</tbody></table>' :
        '<p class="muted">No stock recorded.</p>' + '<p><a href="' + L.href('inventory', [pn]) + '">Open in Inventory →</a></p>' });
      var hist = r[9].data || [], histN = r[9].count || hist.length;
      tabs.push({ key: 'hist', label: 'History <span class="muted">(' + histN + ')</span>', html: (histN > hist.length ? '<p class="muted small">Latest ' + hist.length + ' of ' + histN + ' changes. <a href="' + L.href('parts', ['history'], { q: pn }) + '">See all in the change log →</a></p>' : '') + histTable(hist, false) });
      tabs.push({ key: 'notes', label: 'Notes', html: '<textarea id="p_notes" rows="5"' + (ed ? '' : ' readonly') + '>' + esc(p.notes || '') + '</textarea>' });

      L.form({
        crumbs: [['Parts & prices', BASE], [c.name, L.href('parts', [], { range: p.subcategory })], [p.sv_pn]],
        buttons: '<button type="button" class="btn editor-only" id="pSave">Save</button><button type="button" class="btn ghost editor-only" id="pDiscard">Discard</button>',
        actions: '<a class="btn ghost" href="' + L.href('inventory', [pn]) + '">Stock</a>' + (p.barcode ? '' : '<a class="btn ghost" href="' + L.href('barcodes', ['parts'], { range: p.subcategory }) + '">Barcode</a>'),
        status: { steps: STATUSES, current: p.status, clickable: ed, onClick: async function (s) {
          if (!confirm('Set ' + pn + ' to ' + s + '?' + (s === 'Inactive' ? ' It stays in the database but is removed from the website.' : ''))) return;
          try { L.must(await sb.from('stravik_parts').update({ status: s }).eq('sv_pn', pn)); L.toast(pn + ' is now ' + s.toLowerCase()); partForm(pn); } catch (e) { L.fail(e); } } },
        sheet: '<div class="o-title"><h1 class="mono">' + esc(p.sv_pn) + '</h1>' + L.pill(p.status, p.status === 'Proposed' ? 'New' : p.status) + (p.on_website ? L.pill('Website') : L.pill('Not on website', 'warn')) + '</div>' +
          '<div class="o-subtitle">' + esc(p.short_desc) + ' · ' + esc(c.name) + (ty ? ' · ' + esc(ty.name) : '') + (p.source_inquiry ? ' · created for inquiry <b>' + esc(p.source_inquiry) + '</b>' : '') + (p.updated_by ? ' · last changed ' + esc(L.dt(p.updated_at)) + ' by ' + esc(p.updated_by) : '') + '</div>' +
          '<div class="o-groups">' + L.group('General', [['Type', typeSel]].concat(GEN.map(function (f) { return [f[1], inp('p_' + f[0], p[f[0]]) + (f[0] === 'barcode' && ean ? '<div style="margin-top:6px">' + ean + '</div>' : '')]; })).concat([
            ['Show on the Stravik website', '<label class="check" style="margin:0"><input type="checkbox" id="p_on_website"' + (p.on_website ? ' checked' : '') + (ed ? '' : ' disabled') + '> ' + (p.on_website ? 'Yes' : 'No') + '</label>']])) +
          L.group('Price', [['FOB USD', money4(pl.fob_usd)], ['Landed cost USD', money4(pl.landed_cost)], ['Sales price USD', '<b>' + L.money(pl.sales_price) + '</b>'], ['GCC USD', L.money(pl.price_gcc)], ['Available stock', L.qty(avail)]]) + '</div>' +
          L.notebook(tabs, 'specs')
      });
      $('content').querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { var k = b.dataset.add; $('rows-' + k).insertAdjacentHTML('beforeend', rowHtml(k, {})); $('rows-' + k).lastElementChild.querySelector('input').focus(); }; });
      if (!ed) return;
      $('pDiscard').onclick = function () { partForm(pn); };
      $('addApp').onclick = async function () {
        var o = { sv_pn: pn, source: 'manual' }, any = false;
        $('newApp').querySelectorAll('[data-f]').forEach(function (i) { var v = i.value.trim(); o[i.dataset.f] = v || null; if (v) any = true; });
        if (!any) return L.toast('Fill in at least the make');
        try { L.must(await sb.from('stravik_applications').insert(o)); L.toast('Vehicle added'); partForm(pn); } catch (e) { L.fail(e); }
      };
      $('appsTable').onclick = async function (e) {
        var b = e.target.closest('[data-delapp]'); if (!b || !confirm('Remove this vehicle from ' + pn + '?')) return;
        try { L.must(await sb.from('stravik_applications').delete().eq('id', Number(b.dataset.delapp))); b.closest('tr').remove(); L.toast('Vehicle removed'); } catch (e) { L.fail(e); }
      };
      $('pSave').onclick = async function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Saving…';
        try {
          var up = { notes: $('p_notes').value.trim() || null, part_type: $('p_part_type').value || null, on_website: $('p_on_website').checked };
          GEN.forEach(function (f) { var v = $('p_' + f[0]).value.trim(); up[f[0]] = v === '' ? null : v; });
          if (!up.short_desc) throw new Error('Description is required');
          if (!up.brand) up.brand = 'Stravik';
          var changed = {}; Object.keys(up).forEach(function (k) { if ((up[k] == null ? null : up[k]) !== (p[k] == null ? null : p[k])) changed[k] = up[k]; });
          if (Object.keys(changed).length) L.must(await sb.from('stravik_parts').update(changed).eq('sv_pn', pn));
          // prices
          var pv = {}, any = false, num = function (id, label, pct) { var v = $(id).value.trim(); if (v === '') return null; var n = L.num(v); if (Number.isNaN(n)) throw new Error(label + ' must be a number'); any = true; return pct ? Math.round(n * 1e6) / 1e8 : n; };
          pv.fob_usd = num('g_fob_usd', 'FOB');
          COSTS.forEach(function (c2) { var v = num('g_' + c2[0], c2[1] + ' %', true); if (v != null) pv[c2[0]] = v; else if (pr.sv_pn) pv[c2[0]] = 0; });
          REGIONS.forEach(function (g) { pv['margin_' + g[0]] = num('g_m_' + g[0], g[1] + ' margin', true); });
          var mq = num('g_moq', 'MOQ'); pv.moq = mq == null ? null : Math.round(mq);
          ['price_list', 'price_source'].forEach(function (k) { var v = $('g_' + k).value.trim(); pv[k] = v || null; if (v) any = true; });
          pv.notes = $('g_notes').value.trim() || null; if (pv.notes) any = true;
          if (pr.sv_pn) {
            var pch = {}; Object.keys(pv).forEach(function (k) { var a = pv[k], b0 = pr[k] == null ? null : (typeof a === 'number' ? Number(pr[k]) : pr[k]); if (!(a === b0 || (typeof a === 'number' && b0 != null && Math.abs(a - b0) < 1e-9))) pch[k] = a; });
            if (Object.keys(pch).length) L.must(await sb.from('stravik_prices').update(pch).eq('sv_pn', pn));
          } else if (any) {
            var ins = { sv_pn: pn }; Object.keys(pv).forEach(function (k) { if (pv[k] != null) ins[k] = pv[k]; });
            L.must(await sb.from('stravik_prices').insert(ins));   // empty margins / costs take the Stravik standard values
          }
          // packaging
          var kv = { sv_pn: pn }, kany = false;
          PACK.forEach(function (f) { var v = $('k_' + f[0]).value.trim(); if (v === '') { kv[f[0]] = null; return; } if (f[2]) { var n = L.num(v); if (Number.isNaN(n)) throw new Error(f[1] + ' must be a number'); kv[f[0]] = n; } else kv[f[0]] = v; kany = true; });
          var kdiff = PACK.some(function (f) { return String(kv[f[0]] == null ? '' : kv[f[0]]) !== String(pack[f[0]] == null ? '' : pack[f[0]]); });
          if (kdiff && (kany || pack.sv_pn)) L.must(await sb.from('stravik_packaging').upsert(kv, { onConflict: 'sv_pn' }));
          // specifications, OE numbers, cross references
          for (var key in LISTS) {
            var d = LISTS[key], now = readRows(key);
            var keep = now.filter(function (x) { return x.id; }).map(function (x) { return x.id; });
            var gone = orig[key].filter(function (o) { return keep.indexOf(o.id) < 0; }).map(function (o) { return o.id; });
            if (gone.length) L.must(await sb.from(d.table).delete().in('id', gone));
            for (var i = 0; i < now.length; i++) {
              var x = now[i], row = { sv_pn: pn }; d.cols.forEach(function (cc) { row[cc[0]] = x[cc[0]] || null; });
              if (!row[d.req]) { if (x.id) L.must(await sb.from(d.table).delete().eq('id', x.id)); continue; }
              if (key === 'comp' && !row.comp_brand) row.comp_brand = 'Cross-reference';
              if (x.id) { var o = orig[key].find(function (z) { return z.id === x.id; }); if (d.cols.some(function (cc) { return (o[cc[0]] || '') !== (row[cc[0]] || ''); })) L.must(await sb.from(d.table).update(row).eq('id', x.id)); }
              else L.must(await sb.from(d.table).insert(row));
            }
          }
          L.toast('Saved ' + pn); partForm(pn);
        } catch (e) { L.fail(e); btn.disabled = false; btn.textContent = 'Save'; }
      };
    } catch (e) { L.fail(e); }
  }

  // ---------- wizards (data team) ----------
  function typeOptions(sub, sel) { return '<option value="">—</option>' + L.typesOf(sub).map(function (t) { return '<option value="' + esc(t.code) + '"' + (t.code === sel ? ' selected' : '') + '>' + esc(t.name) + ' (' + esc(t.code) + ')</option>'; }).join(''); }
  function addPart(prefill) {
    prefill = prefill || {};
    var c = prefill.subcategory ? L.cat(prefill.subcategory) : cat();
    L.modal('New part', '<p class="muted">After creating it you can add its prices, specifications, OE numbers, cross references and vehicles.</p><div class="o-groups">' +
      L.group('', [['Stravik part no.', '<input id="aPn" value="' + esc(prefill.sv_pn || '') + '" placeholder="e.g. SV-OFL-0132-00">'], ['Range', '<select id="aRange">' + L.rangeOptions(false, c && c.subcategory_key) + '</select>'],
        ['Type', '<select id="aType">' + typeOptions(c.subcategory_key, prefill.part_type) + '</select>'], ['Description', '<input id="aDesc" value="' + esc(prefill.short_desc || '') + '">'],
        ['Status', '<select id="aStatus">' + STATUSES.map(function (s) { return '<option' + (s === (prefill.status || 'Active') ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>']]) +
      L.group('', [['Brand', '<input id="aBrand" value="' + esc(prefill.brand || 'Stravik') + '">'], ['Supplier PN', '<input id="aSup" value="' + esc(prefill.supplier_pn || '') + '">'], ['Origin', '<input id="aOrigin" value="' + esc(prefill.origin || '') + '">'], ['Source inquiry', '<input id="aInq" value="' + esc(prefill.source_inquiry || '') + '" placeholder="e.g. Kenya CU-009">'],
        ['Show on website', '<label class="check" style="margin:0"><input type="checkbox" id="aWeb" checked> Yes</label>']]) + '</div>' +
      '<label>OE numbers (one per line)<textarea id="aOe" rows="3">' + esc((prefill.oe || []).join('\n')) + '</textarea></label>' +
      '<div class="o-footer"><button class="btn" id="aSave">Create part</button><button class="btn ghost" id="aCancel">Cancel</button></div>');
    $('aCancel').onclick = L.closeModal;
    $('aRange').onchange = function () { $('aType').innerHTML = typeOptions(this.value); };
    $('aSave').onclick = async function () {
      var pn = L.pnNorm($('aPn').value), cc = L.cat($('aRange').value), d = $('aDesc').value.trim();
      if (!pn || !d) return L.toast('Part number and description are required');
      if (!/^SV[A-Z0-9-]{3,}$/.test(pn)) return L.toast('A Stravik part number starts with SV (letters, digits and hyphens only)');
      try {
        var ex = L.must(await sb.from('stravik_parts').select('sv_pn').eq('pn_clean', L.clean(pn)).maybeSingle());
        if (ex) { L.toast(ex.sv_pn + ' already exists'); L.closeModal(); return L.openPart(ex.sv_pn); }
        L.must(await sb.from('stravik_parts').insert({ sv_pn: pn, category: cc.group_name, subcategory: cc.subcategory_key, part_type: $('aType').value || null, short_desc: d, status: $('aStatus').value,
          on_website: $('aWeb').checked, brand: $('aBrand').value.trim() || 'Stravik', supplier_pn: $('aSup').value.trim() || null, origin: $('aOrigin').value.trim() || null, source_inquiry: $('aInq').value.trim() || null }));
        var oe = $('aOe').value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (oe.length) L.must(await sb.from('stravik_oe_numbers').upsert(oe.map(function (n, i) { return { sv_pn: pn, oe_number: n, is_primary: i === 0, seq: i + 1 }; }), { onConflict: 'sv_pn,oe_number', ignoreDuplicates: true }));
        S.counts = null; L.closeModal(); L.toast(pn + ' created'); L.openPart(pn);
      } catch (e) { L.fail(e); }
    };
  }
  L.addPartForm = addPart;

  /* Upload parts: one sheet can create new parts and enrich existing ones.
     Columns: Stravik PN, Range, Type (code or name), Description, Website description, Status, Source inquiry, Brand, Origin, Barcode, Supplier PN, HS code, Notes,
     OE numbers ("123, 456 (Ford)"), Vehicle makes ("TOYOTA, LEXUS"), "Cross ref: <BRAND>" (one column per brand), "Spec: <attribute>".
     Numbers, cross references and makes are only added (never removed); specifications are set. */
  var SPLIT = /[,;\n]+/;
  function splitList(s) { return String(s || '').split(SPLIT).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean); }
  function oeOf(s) { var m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(s); return m ? { n: m[1].trim(), b: m[2].trim() } : { n: s, b: null }; }
  async function importParts(f) {
    L.modal('Upload parts', '<p class="muted">Reading ' + esc(f.name) + '…</p>', true);
    try {
      var all = await L.readRows(f); if (all.length < 2) return L.modal('Upload parts', '<p class="flag">The sheet is empty.</p>');
      var heads = all[0].map(function (h) { return String(h || '').replace(/\s+/g, ' ').trim(); }), norm = heads.map(L.normHead);
      var specCols = [], xrefCols = [];
      heads.forEach(function (h, i) {
        var m = /^spec(?:ification)?\s*[:\-]\s*(.+)$/i.exec(h); if (m) specCols.push({ i: i, attr: m[1].trim() });
        var x = /^(?:cross\s*ref(?:erence)?s?|xref)\s*[:\-]\s*(.+)$/i.exec(h); if (x) xrefCols.push({ i: i, brand: x[1].trim().toUpperCase() });
      });
      var byKey = {}, bad = [];
      L.CATS.forEach(function (c) { byKey[c.subcategory_key.toLowerCase()] = c; byKey[c.name.toLowerCase()] = c; });
      var rows = all.slice(1).map(function (r, i) {
        var o = {}; norm.forEach(function (h, j) { if (h && o[h] == null) o[h] = String(r[j] == null ? '' : r[j]).trim(); });
        var rg = L.pick(o, ['range', 'subcategory', 'category', 'productrange', 'productline']);
        return { line: i + 2, sv_pn: L.pnNorm(L.pick(o, L.PN_COLS)), cat: rg ? byKey[rg.toLowerCase()] : null, rangeText: rg, typeText: L.pick(o, ['type', 'parttype', 'producttype', 'typecode']),
          short_desc: L.pick(o, ['description', 'shortdesc', 'desc', 'shortdescription']), web_desc: L.pick(o, ['websitedescription', 'webdescription', 'website']), status: L.pick(o, ['status']),
          brand: L.pick(o, ['brand']), origin: L.pick(o, ['origin', 'countryoforigin']), barcode: L.pick(o, ['barcode', 'ean']), notes: L.pick(o, ['notes', 'note', 'remarks']),
          supplier_pn: L.pick(o, ['supplierpn', 'supplierpartnumber']), hs_code: L.pick(o, ['hscode', 'hs']), source_inquiry: L.pick(o, ['sourceinquiry', 'inquiry', 'enquiry', 'createdforinquiry', 'forinquiry']),
          oe: splitList(L.pick(o, ['oenumbers', 'oenumber', 'oe'])).map(oeOf), makes: splitList(L.pick(o, ['vehiclemakes', 'makes', 'vehiclemake', 'make'])),
          xref: xrefCols.flatMap(function (c) { return splitList(r[c.i]).map(function (n) { return { n: n, b: c.brand }; }); }),
          specs: specCols.map(function (c) { return { a: c.attr, v: String(r[c.i] == null ? '' : r[c.i]).replace(/\s+/g, ' ').trim() }; }).filter(function (s) { return s.v; }) };
      }).filter(function (r) { return r.sv_pn; });
      if (!rows.length) return L.modal('Upload parts', '<p class="flag">No rows with a "Stravik PN" column were found.</p>');
      // part numbers typed without hyphens are matched to the stored number
      var rmap = await L.resolvePns(rows.map(function (r) { return r.sv_pn; })); rows.forEach(function (r) { if (rmap[r.sv_pn]) r.sv_pn = rmap[r.sv_pn]; });
      var pns = rows.map(function (r) { return r.sv_pn; }), existing = {}, exOe = {}, exX = {}, exMk = {};
      for (var ch of L.chunks(pns, 200)) {
        L.must(await sb.from('stravik_parts').select('*').in('sv_pn', ch)).forEach(function (p) { existing[p.sv_pn] = p; });
        L.must(await sb.from('stravik_oe_numbers').select('sv_pn,oe_number').in('sv_pn', ch)).forEach(function (x) { exOe[x.sv_pn + '|' + L.clean(x.oe_number)] = 1; });
        L.must(await sb.from('stravik_cross_refs').select('sv_pn,comp_number,comp_brand').in('sv_pn', ch)).forEach(function (x) { exX[x.sv_pn + '|' + String(x.comp_brand || '').toUpperCase() + '|' + L.clean(x.comp_number)] = 1; });
        L.must(await sb.from('stravik_applications').select('sv_pn,make').in('sv_pn', ch)).forEach(function (x) { if (x.make) exMk[x.sv_pn + '|' + x.make.toUpperCase()] = 1; });
      }
      var seen = {};
      rows.forEach(function (r) {
        var ex = existing[r.sv_pn], sub = r.cat ? r.cat.subcategory_key : ex ? ex.subcategory : null;
        if (seen[r.sv_pn]) bad.push('Row ' + r.line + ': ' + r.sv_pn + ' appears twice (also row ' + seen[r.sv_pn] + ')'); seen[r.sv_pn] = r.line;
        if (!ex && !/^SV[A-Z0-9-]{3,}$/.test(r.sv_pn)) bad.push('Row ' + r.line + ': ' + r.sv_pn + ' is not a Stravik part number (it must start with SV)');
        if (r.rangeText && !r.cat) bad.push('Row ' + r.line + ': range "' + r.rangeText + '" is not one of ' + L.CATS.map(function (c) { return c.name; }).join(', '));
        else if (!ex && !r.cat) bad.push('Row ' + r.line + ': ' + r.sv_pn + ' is new, so it needs a range');
        else if (!ex && !r.short_desc) bad.push('Row ' + r.line + ': ' + r.sv_pn + ' is new, so it needs a description');
        if (ex && r.cat && ex.subcategory !== r.cat.subcategory_key) bad.push('Row ' + r.line + ': ' + r.sv_pn + ' is already in ' + ex.subcategory + ', not ' + r.cat.name);
        if (r.status && !/^(proposed|active|inactive)$/i.test(r.status)) bad.push('Row ' + r.line + ': status must be Proposed, Active or Inactive');
        r.part_type = null;
        if (r.typeText && sub) {
          var t = L.typesOf(sub).find(function (x) { return x.code.toLowerCase() === r.typeText.toLowerCase() || x.name.toLowerCase() === r.typeText.toLowerCase() || String(x.name_plural || '').toLowerCase() === r.typeText.toLowerCase(); });
          if (t) r.part_type = t.code; else bad.push('Row ' + r.line + ': type "' + r.typeText + '" is not one of ' + L.typesOf(sub).map(function (x) { return x.name + ' (' + x.code + ')'; }).join(', '));
        }
      });
      var addOe = [], addX = [], addMk = [], setSp = [], k = {};
      rows.forEach(function (r) {
        r.oe.forEach(function (o) { var key = r.sv_pn + '|' + L.clean(o.n); if (!L.clean(o.n) || exOe[key] || k[key]) return; k[key] = 1; addOe.push({ sv_pn: r.sv_pn, oe_number: o.n, oe_brand: o.b }); });
        r.xref.forEach(function (x) { var key = r.sv_pn + '|' + x.b + '|' + L.clean(x.n); if (!L.clean(x.n) || exX[key] || k[key]) return; k[key] = 1; addX.push({ sv_pn: r.sv_pn, comp_number: x.n, comp_brand: x.b }); });
        r.makes.forEach(function (m) { var key = r.sv_pn + '|' + m.toUpperCase(); if (exMk[key] || k[key]) return; k[key] = 1; addMk.push({ sv_pn: r.sv_pn, make: m, source: 'upload' }); });
        r.specs.forEach(function (s) { setSp.push({ sv_pn: r.sv_pn, attribute: s.a, value: s.v }); });
      });
      var nNew = rows.filter(function (r) { return !existing[r.sv_pn]; }).length;
      var colsRead = ['Stravik PN', 'Range', 'Type', 'Description', 'Website description', 'Status', 'Source inquiry', 'Brand', 'Origin', 'Barcode', 'Supplier PN', 'HS code', 'Notes', 'OE numbers', 'Vehicle makes'].concat(xrefCols.map(function (c) { return 'Cross ref: ' + c.brand; }), specCols.map(function (c) { return 'Spec: ' + c.attr; }));
      L.modal('Upload parts', '<p>' + esc(f.name) + ': <b>' + rows.length + '</b> rows: <b>' + nNew + '</b> new parts, <b>' + (rows.length - nNew) + '</b> existing parts updated. Blank cells leave the current value unchanged.</p>' +
        '<table class="grid small" style="width:auto;margin:8px 0"><tbody>' +
        [['OE numbers to add', addOe.length], ['Cross references to add', addX.length], ['Vehicle makes to add', addMk.length], ['Specifications to set', setSp.length]].map(function (x) { return '<tr><td>' + x[0] + '</td><td class="num"><b>' + x[1].toLocaleString() + '</b></td></tr>'; }).join('') + '</tbody></table>' +
        (bad.length ? '<div class="notice bad"><b>Fix these first (' + bad.length + '):</b><ul>' + bad.slice(0, 40).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<p class="muted small">Columns read: ' + colsRead.map(esc).join(', ') + '. Numbers, cross references and makes are only added, never removed. Changes go on the Stravik website at the next publish (Parts &amp; prices → Website).</p>' +
        '<div class="o-footer"><button class="btn" id="impGo"' + (bad.length ? ' disabled' : '') + '>Upload ' + rows.length + ' parts</button><button class="btn ghost" id="impX">Cancel</button></div>', true);
      $('impX').onclick = L.closeModal;
      $('impGo').onclick = async function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Uploading…';
        try {
          var F = ['short_desc', 'web_desc', 'status', 'brand', 'origin', 'barcode', 'notes', 'supplier_pn', 'hs_code', 'source_inquiry'];
          var up = rows.map(function (r) {
            var ex = existing[r.sv_pn] || {}, o = { sv_pn: r.sv_pn, category: r.cat ? r.cat.group_name : ex.category, subcategory: r.cat ? r.cat.subcategory_key : ex.subcategory, part_type: r.part_type || ex.part_type || null };
            F.forEach(function (k2) { var v = r[k2]; if (k2 === 'status' && v) v = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(); o[k2] = v !== '' ? v : (ex[k2] != null ? ex[k2] : (k2 === 'status' ? 'Active' : k2 === 'brand' ? 'Stravik' : null)); });
            return o;
          });
          for (var c of L.chunks(up, 500)) L.must(await sb.from('stravik_parts').upsert(c, { onConflict: 'sv_pn' }));
          for (var c2 of L.chunks(addOe, 500)) L.must(await sb.from('stravik_oe_numbers').upsert(c2, { onConflict: 'sv_pn,oe_number', ignoreDuplicates: true }));
          for (var c3 of L.chunks(addX, 500)) L.must(await sb.from('stravik_cross_refs').upsert(c3, { onConflict: 'sv_pn,comp_number,comp_brand', ignoreDuplicates: true }));
          for (var c4 of L.chunks(setSp, 500)) L.must(await sb.from('stravik_specs').upsert(c4, { onConflict: 'sv_pn,attribute' }));
          for (var c5 of L.chunks(addMk, 500)) L.must(await sb.from('stravik_applications').insert(c5));
          S.counts = null; L.closeModal();
          L.toast('Uploaded ' + rows.length + ' parts: ' + addOe.length + ' OE, ' + addX.length + ' cross references, ' + setSp.length + ' specifications, ' + addMk.length + ' vehicle makes');
          L.render();
        } catch (e) { L.fail(e); btn.disabled = false; btn.textContent = 'Try again'; }
      };
    } catch (e) { L.fail(e); }
  }

  // ---------- change log (written automatically by the database) ----------
  var FIELD = { short_desc: 'Description', web_desc: 'Website description', long_desc: 'Long description', source_inquiry: 'Source inquiry', subcategory: 'Range', category: 'Group', part_type: 'Type',
    on_website: 'On website', price_list: 'Price list', fob_usd: 'FOB USD', moq: 'MOQ', price_source: 'Price source' };
  COSTS.forEach(function (c) { FIELD[c[0]] = c[1] + ' %'; });
  REGIONS.forEach(function (g) { FIELD['margin_' + g[0]] = 'Margin ' + g[1]; });
  PACK.forEach(function (f) { FIELD[f[0]] = f[1]; });
  function fieldName(f) { return FIELD[f] || L.label(f || ''); }
  function whatText(h) {
    if (h.action === 'created') return '<b>Created</b>' + (h.source_inquiry ? ' for inquiry <b>' + esc(h.source_inquiry) + '</b>' : '');
    if (h.action === 'deleted') return '<b>Deleted</b> the part';
    if (h.action === 'changed') return 'Changed <b>' + esc(h.area === 'part' || h.area === 'price' || h.area === 'packaging' ? fieldName(h.field) : (h.area + (h.field ? ' ' + h.field : ''))) + '</b>';
    return (h.action === 'added' ? 'Added ' : 'Removed ') + esc(h.area) + (h.field ? ' <b>' + esc(h.field) + '</b>' : '');
  }
  function histTable(rows, withPn) {
    if (!rows.length) return '<p class="muted">No changes recorded yet.</p>';
    return '<div class="o-list"><table class="grid compact"><thead><tr><th>When</th>' + (withPn ? '<th>Part</th>' : '') + '<th>Who</th><th>What</th><th>Before</th><th>After</th></tr></thead><tbody>' +
      rows.map(function (h) {
        return '<tr><td class="small" style="white-space:nowrap">' + esc(L.dt(h.at)) + '</td>' + (withPn ? '<td><a class="mono" href="' + L.href('parts', ['p', h.sv_pn]) + '">' + esc(h.sv_pn) + '</a></td>' : '') +
          '<td class="small">' + esc(h.by_email || '') + '</td><td>' + whatText(h) + '</td><td class="clip"><s class="muted">' + esc(h.old_value || '') + '</s></td><td class="clip">' + esc(h.new_value || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  var HS = L.state.history = { text: '', active: {}, offset: 0 };
  var HFILT = [
    { key: 'a_part', label: 'Parts created / changed', group: 'What' }, { key: 'a_price', label: 'Prices', group: 'What' }, { key: 'a_oe', label: 'OE numbers', group: 'What' },
    { key: 'a_comp', label: 'Cross references', group: 'What' }, { key: 'a_spec', label: 'Specifications', group: 'What' }, { key: 'a_veh', label: 'Vehicles', group: 'What' }, { key: 'a_pack', label: 'Packaging', group: 'What' },
    { key: 'd_1', label: 'Today', group: 'When', single: true }, { key: 'd_7', label: 'Last 7 days', group: 'When', single: true }, { key: 'd_30', label: 'Last 30 days', group: 'When', single: true },
    { key: 'x_created', label: 'New parts only', group: 'Kind', single: true }
  ];
  var AREA = { a_part: 'part', a_price: 'price', a_oe: 'OE number', a_comp: 'cross reference', a_spec: 'specification', a_veh: 'vehicle', a_pack: 'packaging' };
  function histQuery(opts) {
    var q = sb.from('stravik_part_history').select('*', opts), A = HS.active;
    var areas = Object.keys(AREA).filter(function (k) { return A[k]; }).map(function (k) { return AREA[k]; });
    if (areas.length) q = q.in('area', areas);
    var days = A.d_1 ? 1 : A.d_7 ? 7 : A.d_30 ? 30 : 0;
    if (days) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days + 1); q = q.gte('at', d.toISOString()); }
    if (A.x_created) q = q.eq('action', 'created');
    var s = L.orSearch(['sv_pn', 'by_email', 'source_inquiry', 'old_value', 'new_value', 'field'], HS.text); if (s) q = q.or(s);
    return q.order('at', { ascending: false }).order('id', { ascending: false });
  }
  function historyPage(r) {
    if (r.q.q != null) { HS.text = r.q.q; HS.offset = 0; }
    L.cp({ crumbs: [['Parts & prices', BASE], ['Change log']], buttons: '<button type="button" class="btn ghost" id="hXls">Download</button>' });
    L.searchBar({ placeholder: 'Search part no., person, inquiry or value…', text: HS.text, filters: HFILT, active: HS.active, onChange: function (s) { HS.text = s.text; HS.active = s.active; HS.offset = 0; load(); } });
    L.content('<p class="muted small">Every change to a Stravik part is recorded here automatically: who made it, when, and what it was before and after. This includes new parts (with the inquiry they were created for), edits, OE numbers, cross references, specifications, vehicles, packaging and prices. Changes made directly in Supabase show as "Supabase dashboard / SQL".</p><div id="hList"></div>');
    $('hXls').onclick = async function () {
      try {
        L.toast('Preparing…');
        var rows = L.must(await histQuery().limit(10000));
        await L.saveXlsx([{ name: 'Change log', widths: [18, 16, 30, 10, 18, 22, 40, 40, 16], head: ['When', 'Stravik PN', 'Who', 'Action', 'Area', 'Field', 'Before', 'After', 'Source inquiry'],
          rows: rows.map(function (h) { return [L.dt(h.at), h.sv_pn, h.by_email || '', h.action, h.area, h.field ? fieldName(h.field) : '', h.old_value || '', h.new_value || '', h.source_inquiry || '']; }) }], 'Stravik_change_log_' + L.today() + '.xlsx');
      } catch (e) { L.fail(e); }
    };
    async function load() {
      try {
        var res = await histQuery({ count: 'exact' }).range(HS.offset, HS.offset + L.PAGE - 1), rows = L.must(res);
        L.pager(HS.offset, res.count || 0, function (o) { HS.offset = o; load(); });
        $('hList').innerHTML = histTable(rows, true);
      } catch (e) { L.fail(e); }
    }
    load();
  }

  // ---------- parts by inquiry ----------
  async function inquiryPage(r) {
    var name = r.q.name;
    L.cp({ crumbs: name ? [['Parts & prices', BASE], ['Parts by inquiry', L.href('parts', ['inquiries'])], [name]] : [['Parts & prices', BASE], ['Parts by inquiry']],
      buttons: name ? '<button type="button" class="btn ghost" id="iqXls">Download</button>' : '' });
    try {
      var rows = await L.fetchAll(function () { var q = sb.from('stravik_parts').select('sv_pn,subcategory,short_desc,status,source_inquiry,created_at,updated_by').not('source_inquiry', 'is', null); if (name) q = q.eq('source_inquiry', name); return q.order('sv_pn'); });
      if (!name) {
        var by = {}; rows.forEach(function (p) { var b = by[p.source_inquiry] = by[p.source_inquiry] || { name: p.source_inquiry, n: 0, ranges: {}, first: p.created_at }; b.n++; b.ranges[p.subcategory] = (b.ranges[p.subcategory] || 0) + 1; if (p.created_at < b.first) b.first = p.created_at; });
        var list = Object.values(by).sort(function (a, b) { return b.first < a.first ? -1 : 1; });
        L.content('<p class="muted small">Parts created for a customer inquiry or market. Set it with "Source inquiry" on the part, in New part, or as a column in Upload parts.</p>' + (list.length ? L.listView([
          { label: 'Inquiry', render: function (x) { return '<b>' + esc(x.name) + '</b>'; } }, { label: 'Parts', num: true, render: function (x) { return L.qty(x.n); } },
          { label: 'Ranges', render: function (x) { return esc(Object.keys(x.ranges).map(function (k) { return k + ' ' + x.ranges[k]; }).join(', ')); } },
          { label: 'Created', render: function (x) { return '<span class="small">' + esc(L.dt(x.first)) + '</span>'; } }
        ], list, function (x) { return L.href('parts', ['inquiries'], { name: x.name }); }) : L.empty('No inquiries yet', 'Parts get an inquiry when "Source inquiry" is filled in.')));
        return;
      }
      L.content(L.listView([
        { label: 'Stravik PN', cls: 'pn', render: function (p) { return esc(p.sv_pn); } }, { label: 'Range', render: function (p) { return esc(p.subcategory); } },
        { label: 'Description', cls: 'clip', render: function (p) { return esc(p.short_desc); } }, { label: 'Status', render: function (p) { return L.pill(p.status); } },
        { label: 'Created', render: function (p) { return '<span class="small">' + esc(L.dt(p.created_at)) + '</span>'; } }, { label: 'Last changed by', render: function (p) { return '<span class="small">' + esc(p.updated_by || '') + '</span>'; } }
      ], rows, function (p) { return L.href('parts', ['p', p.sv_pn]); }) + '<p class="small"><a href="' + L.href('parts', ['history'], { q: name }) + '">See the change log for ' + esc(name) + ' →</a></p>');
      $('iqXls').onclick = function () {
        L.saveXlsx([{ name: name.slice(0, 30), widths: [16, 22, 40, 10, 18, 28], head: ['Stravik PN', 'Range', 'Description', 'Status', 'Created', 'Last changed by'], rows: rows.map(function (p) { return [p.sv_pn, p.subcategory, p.short_desc, p.status, L.dt(p.created_at), p.updated_by || '']; }) }], 'Stravik_parts_' + name.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 60) + '.xlsx').catch(L.fail);
      };
    } catch (e) { L.fail(e); }
  }

  L.importParts = importParts;   // also used by Part numbers → Many at once when the sheet already has Stravik PNs
  function partsTemplate() {
    var head = ['Stravik PN', 'Range', 'Type', 'Description', 'Website description', 'Status', 'Source inquiry', 'OE numbers', 'Vehicle makes', 'Cross ref: GUD', 'Cross ref: MANN', 'Cross ref: CTR', 'Spec: Dimensions', 'Spec: Position', 'Brand', 'Origin', 'Barcode', 'Supplier PN', 'HS code', 'Notes'];
    var ex = ['SV-OFL-0132-00', 'Filters', 'OFL', 'Spin-on oil filter', 'Oil filter, spin-on, 1.5L', 'Proposed', 'Kenya CU-009', '90915-YZZJ3 (Toyota), 90915-10003', 'Toyota, Lexus', 'Z418', 'W 68/3', '', '76×68×68', '', 'Stravik', 'China', '', '', '', ''];
    var help = [['Column', 'How to fill it'], ['Stravik PN', 'Required. New number = new part; existing number = the part is updated. Hyphens may be left out for existing parts (SVAFL000100 = SV-AFL-0001-00).'],
      ['Range', 'Required for new parts: ' + L.CATS.map(function (c) { return c.name; }).join(', ')],
      ['Type', 'Part type, by code or name: ' + L.CATS.map(function (c) { return c.name + ': ' + L.typesOf(c.subcategory_key).map(function (t) { return t.code; }).join(', '); }).join('; ')],
      ['Description', 'Required for new parts. Internal description.'], ['Website description', 'Optional short description shown on the Stravik website (filters).'],
      ['Status', 'Proposed (number not yet approved), Active or Inactive (removed from the website). Blank = Active for new parts.'], ['Source inquiry', 'The customer inquiry or market the part was created for. Shown under Parts by inquiry.'],
      ['OE numbers', 'Several separated by commas or new lines. Add the car brand in brackets if you like: "BK2Q-6714-AA (Ford)".'], ['Vehicle makes', 'Makes the part fits, separated by commas.'],
      ['Cross ref: BRAND', 'One column per brand (CTR, GUD, MANN, BOSCH…). Several numbers separated by commas.'], ['Spec: NAME', 'One column per specification, with the unit: "Spec: Dimensions" = "76×68×68".'],
      ['Adding only', 'OE numbers, cross references and makes are only added, never removed. Remove them on the part itself.']];
    L.saveXlsx([{ name: 'Parts', widths: head.map(function (h) { return Math.max(12, h.length + 2); }), head: head, rows: [ex] }, { name: 'How to fill', widths: [18, 110], head: help[0], rows: help.slice(1) }], 'Stravik_parts_upload_template.xlsx').catch(L.fail);
  }

  // ---------- prices: upload and coverage ----------
  async function uploadPrices(f) {
    L.modal('Upload prices', '<p class="muted">Reading ' + esc(f.name) + '…</p>', true);
    try {
      var raw = await L.readSheet(f), bad = [];
      var rows = raw.map(function (o, i) {
        return { line: i + 2, sv_pn: L.pnNorm(L.pick(o, L.PN_COLS)), fob: L.num(L.pick(o, ['fobusd', 'fob', 'fobprice', 'fobpriceusd', 'fobusdprice'])), moq: L.num(L.pick(o, ['moq', 'minimumorderquantity'])), list: L.pick(o, ['pricelist', 'pricelistname', 'list']), src: L.pick(o, ['pricesource', 'source']) };
      }).filter(function (r) { return r.sv_pn && (r.fob != null || r.list || r.moq != null); });
      if (!rows.length) return L.modal('Upload prices', '<p class="flag">No rows with a Stravik PN and a price were found. Columns: "Stravik PN" and "FOB USD" (optional "MOQ", "Price list", "Price source").</p>');
      var rmap = await L.resolvePns(rows.map(function (r) { return r.sv_pn; })); rows.forEach(function (r) { if (rmap[r.sv_pn]) r.sv_pn = rmap[r.sv_pn]; });
      rows.forEach(function (r) { if (Number.isNaN(r.fob) || Number.isNaN(r.moq)) bad.push('Row ' + r.line + ' (' + r.sv_pn + '): not a number'); else if (r.fob != null && r.fob < 0) bad.push('Row ' + r.line + ': negative price'); });
      var known = {}, cur = {};
      for (var ch of L.chunks(rows.map(function (r) { return r.sv_pn; }), 300)) {
        L.must(await sb.from('stravik_parts').select('sv_pn,short_desc').in('sv_pn', ch)).forEach(function (p) { known[p.sv_pn] = p.short_desc; });
        L.must(await sb.from('stravik_prices').select('sv_pn,fob_usd,moq,price_list,price_source').in('sv_pn', ch)).forEach(function (p) { cur[p.sv_pn] = p; });
      }
      var unknown = rows.filter(function (r) { return !(r.sv_pn in known); });
      var ok = rows.filter(function (r) { return r.sv_pn in known && !Number.isNaN(r.fob) && !Number.isNaN(r.moq); });
      var changed = ok.filter(function (r) { var c = cur[r.sv_pn]; if (!c) return true; return (r.fob != null && Number(c.fob_usd) !== r.fob) || (r.moq != null && Number(c.moq) !== r.moq) || (r.list && r.list !== c.price_list) || (r.src && r.src !== c.price_source); });
      L.modal('Upload prices', '<p>' + esc(f.name) + ': <b>' + rows.length + '</b> rows, <b>' + changed.length + '</b> will change, ' + (ok.length - changed.length) + ' unchanged' + (unknown.length ? ', <span class="flag">' + unknown.length + ' part numbers not in the database (skipped)</span>' : '') + '. Blank cells never remove a value. Parts priced for the first time get the standard Stravik costs and margins.</p>' +
        (bad.length ? '<div class="notice bad"><b>Fix these first:</b><ul>' + bad.slice(0, 30).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        (unknown.length ? '<p class="small muted">Not found: ' + esc(unknown.slice(0, 40).map(function (r) { return r.sv_pn; }).join(', ')) + (unknown.length > 40 ? '…' : '') + '</p>' : '') +
        (changed.length ? '<div class="o-list"><table class="grid"><thead><tr><th>Stravik PN</th><th>Description</th><th class="num">FOB now</th><th class="num">FOB new</th><th class="num">MOQ</th><th>Price list</th></tr></thead><tbody>' +
          changed.slice(0, 300).map(function (r) { var c = cur[r.sv_pn] || {}; return '<tr><td class="pn">' + esc(r.sv_pn) + '</td><td class="clip">' + esc(known[r.sv_pn]) + '</td><td class="num">' + money4(c.fob_usd) + '</td><td class="num"><b>' + (r.fob == null ? money4(c.fob_usd) : money4(r.fob)) + '</b></td><td class="num">' + L.qty(r.moq != null ? r.moq : c.moq) + '</td><td>' + esc(r.list || c.price_list || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
        '<div class="o-footer"><button class="btn" id="prApply"' + (bad.length || !changed.length ? ' disabled' : '') + '>Update ' + changed.length + ' prices</button><button class="btn ghost" id="prX">Cancel</button></div>', true);
      $('prX').onclick = L.closeModal;
      $('prApply').onclick = async function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Updating…';
        try {
          for (var r of changed) {
            var c = cur[r.sv_pn], v = {};
            if (r.fob != null) v.fob_usd = r.fob; if (r.moq != null) v.moq = Math.round(r.moq); if (r.list) v.price_list = r.list; if (r.src) v.price_source = r.src;
            if (c) L.must(await sb.from('stravik_prices').update(v).eq('sv_pn', r.sv_pn));
            else L.must(await sb.from('stravik_prices').insert(Object.assign({ sv_pn: r.sv_pn }, v)));
          }
          L.closeModal(); L.toast('Updated ' + changed.length + ' prices'); L.render();
        } catch (e) { L.fail(e); btn.disabled = false; btn.textContent = 'Try again'; }
      };
    } catch (e) { L.fail(e); }
  }
  async function template(sub, onlyMissing) {
    var c = L.cat(sub);
    var res = await Promise.all([L.fetchAll(function () { return sb.from('stravik_parts').select('sv_pn,short_desc,status,supplier_pn').eq('subcategory', sub).order('sv_pn'); }), L.fetchAll(function () { return sb.from('stravik_prices').select('sv_pn,fob_usd,moq,price_list').order('sv_pn'); })]);
    var pr = {}; res[1].forEach(function (p) { pr[p.sv_pn] = p; });
    var rows = res[0].filter(function (p) { return p.status !== 'Inactive' && (!onlyMissing || !pr[p.sv_pn] || pr[p.sv_pn].fob_usd == null); });
    if (!rows.length) return L.toast('Every ' + c.name.toLowerCase() + ' part already has an FOB price');
    await L.saveXlsx([{ name: 'Prices', widths: [16, 60, 20, 18, 10, 8, 16], head: ['Stravik PN', 'Description', 'Supplier PN', 'Range', 'FOB USD', 'MOQ', 'Price list'],
      rows: rows.map(function (p) { var x = pr[p.sv_pn] || {}; return [p.sv_pn, p.short_desc, p.supplier_pn || '', c.name, x.fob_usd == null ? '' : Number(x.fob_usd), x.moq == null ? '' : Number(x.moq), x.price_list || '']; }) }], 'Stravik_prices_' + c.name.replace(/[^A-Za-z0-9]+/g, '_') + '.xlsx');
  }
  async function coverage() {
    L.cp({ crumbs: [['Parts & prices', BASE], ['Price coverage']], buttons: '<button type="button" class="btn editor-only" id="cvUp">Upload prices</button>' });
    $('cvUp').onclick = function () { L.pickFile(uploadPrices); };
    L.content('<div class="o-list" style="max-height:none;margin-bottom:16px"><table class="grid" id="cvTable"><tbody><tr><td class="empty">Loading…</td></tr></tbody></table></div>' +
      '<div class="card"><h2>Price list template</h2><p class="muted small">Download a range with its current prices, fill in FOB USD (and MOQ if you have it), then use "Upload prices". Landed cost and regional prices are calculated from the FOB.</p>' +
      '<div class="o-bar"><select id="cvRange" style="width:auto">' + L.rangeOptions(false, S.range) + '</select><label class="check"><input type="checkbox" id="cvMissing" checked> Only parts without an FOB price</label><button class="btn ghost" id="cvTpl">Download template</button></div></div>');
    $('cvTpl').onclick = function () { template($('cvRange').value, $('cvMissing').checked).catch(L.fail); };
    try {
      var res = await Promise.all([L.fetchAll(function () { return sb.from('stravik_parts').select('sv_pn,subcategory,status').order('sv_pn'); }), L.fetchAll(function () { return sb.from('stravik_prices').select('sv_pn,fob_usd').order('sv_pn'); })]);
      var price = {}; res[1].forEach(function (p) { price[p.sv_pn] = p; });
      var by = {}; res[0].forEach(function (p) { if (p.status === 'Inactive') return; var b = by[p.subcategory] = by[p.subcategory] || { n: 0, fob: 0 }; b.n++; var x = price[p.sv_pn]; if (x && x.fob_usd != null) b.fob++; });
      var tot = { n: 0, fob: 0 };
      $('cvTable').innerHTML = '<thead><tr><th>Range</th><th class="num">Parts in use</th><th class="num">With FOB price</th><th class="num">Missing FOB</th><th class="num">Coverage</th></tr></thead><tbody>' +
        L.CATS.map(function (c) { var b = by[c.subcategory_key] || { n: 0, fob: 0 }; tot.n += b.n; tot.fob += b.fob;
          return '<tr class="click" data-href="' + esc(L.href('parts', [], { range: c.subcategory_key })) + '"><td>' + esc(c.name) + '</td><td class="num">' + b.n.toLocaleString() + '</td><td class="num">' + b.fob.toLocaleString() + '</td><td class="num">' + (b.n - b.fob ? '<span class="flag">' + (b.n - b.fob).toLocaleString() + '</span>' : '0') + '</td><td class="num">' + (b.n ? Math.round(b.fob / b.n * 100) : 0) + '%</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td>Total</td><td class="num">' + tot.n.toLocaleString() + '</td><td class="num">' + tot.fob.toLocaleString() + '</td><td class="num">' + (tot.n - tot.fob).toLocaleString() + '</td><td class="num">' + (tot.n ? Math.round(tot.fob / tot.n * 100) : 0) + '%</td></tr></tfoot>';
    } catch (e) { L.fail(e); }
  }

  // ---------- website publishing ----------
  var PUBST = { requested: ['Waiting', 'New'], running: ['Publishing…', 'Quoted'], published: ['Published', 'Won'], no_changes: ['Nothing to change', 'Closed'], failed: ['Failed', 'warn'], blocked: ['Stopped: check', 'warn'] };
  var pubTimer = null;
  async function publishPage() {
    clearTimeout(pubTimer);
    L.cp({ crumbs: [['Parts & prices', BASE], ['Website publishing']], buttons: '<button type="button" class="btn editor-only" id="pubGo">Publish to website</button>' });
    $('pubGo').onclick = requestPublish;
    try {
      var rows = L.must(await sb.from('stravik_publish_log').select('*').order('id', { ascending: false }).limit(50));
      var waiting = rows.find(function (r) { return r.status === 'requested' || r.status === 'running'; });
      var last = rows.find(function (r) { return r.status === 'published'; });
      var intro = '<div class="card"><p>The Stravik website <a href="https://stravikautomotiveparts.com" target="_blank" rel="noopener">stravikautomotiveparts.com</a> is rebuilt from these tables: the filter, steering &amp; suspension and shock absorber catalogues, their part pages and the sitemap. ' +
        'Published: parts with status Proposed or Active that are set to show on the website, with their description, type, specifications, OE and cross-reference numbers and vehicles. Inactive parts and parts hidden from the website are taken off. Prices, supplier numbers, inquiries and notes are never published.</p>' +
        '<p class="muted small">Every hour the website picks up changes automatically. Press <b>Publish to website</b> (data team) to do it now: it starts within about 10 minutes and takes a minute or two. A publish that would shrink a catalogue by more than 20% stops and changes nothing.</p>' +
        (waiting ? '<div class="notice">' + L.pill(PUBST[waiting.status][0], PUBST[waiting.status][1]) + ' requested ' + esc(L.dt(waiting.requested_at)) + (waiting.requested_by ? ' by ' + esc(waiting.requested_by) : '') + '. This page refreshes by itself.</div>' : '') +
        (last ? '<p class="small">Last published: <b>' + esc(L.dt(last.finished_at)) + '</b></p>' : '') + '</div>';
      var list = rows.length ? L.listView([
        { label: 'When', render: function (r) { return '<span class="small">' + esc(L.dt(r.finished_at || r.started_at || r.requested_at)) + '</span>'; } },
        { label: 'Started by', render: function (r) { return esc(r.requested_by || (r.source === 'hourly' ? 'Automatic (hourly)' : r.source === 'button' ? 'Publish button' : r.source)); } },
        { label: 'Status', render: function (r) { var s = PUBST[r.status] || [r.status, '']; return L.pill(s[0], s[1]); } },
        { label: 'Catalogues', render: function (r) { var sm = r.summary || {}; return '<span class="small">' + esc(['filters', 'steering', 'shock'].filter(function (k) { return sm[k]; }).map(function (k) { return k + ' ' + sm[k]; }).join(', ')) + '</span>'; } },
        { label: '', render: function (r) { return r.summary && r.summary.run ? '<a class="small" href="' + esc(r.summary.run) + '" target="_blank" rel="noopener">details</a>' : ''; } }
      ], rows) : L.empty('Nothing published yet', 'The first automatic publish runs within the hour.');
      L.content(intro + list);
      if (waiting) pubTimer = setTimeout(function () { if (/publish/.test(location.hash)) publishPage(); }, 20000);
    } catch (e) { L.fail(e); }
  }
  async function requestPublish() {
    var b = $('pubGo'); if (b) { b.disabled = true; b.textContent = 'Requesting…'; }
    try {
      var res = await sb.functions.invoke('stravik-publish', { body: { action: 'request' } });
      if (res.error) {
        var msg = res.error.message;
        try { var j = await res.error.context.json(); if (j && j.error) msg = j.error; } catch (e2) { /* keep message */ }
        throw new Error(msg);
      }
      L.toast(res.data && res.data.dispatched ? 'Publishing now. The website updates in a minute or two.' : 'Publish requested. The website updates within about 10 minutes.');
      L.go(L.href('parts', ['publish']));
    } catch (e) { L.fail(e); if (b) { b.disabled = false; b.textContent = 'Publish to website'; } }
  }

  L.register({
    key: 'parts', name: 'Parts & Prices', color: '#0b203d',
    icon: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
    menus: [{ label: 'Parts', href: BASE }, { label: 'Price coverage', href: L.href('parts', ['coverage']) }, { label: 'Website', href: L.href('parts', ['publish']) },
      { label: 'History', children: [{ label: 'Change log', href: L.href('parts', ['history']) }, { label: 'Parts by inquiry', href: L.href('parts', ['inquiries']) }] },
      { label: 'Data', editor: true, children: [{ label: 'New part', action: 'new' }, { label: 'Upload parts', action: 'imp' }, { label: 'Parts upload template', action: 'tpl' }, { label: 'Upload prices', action: 'prices' }, { label: 'Price list template', href: L.href('parts', ['coverage']) }, { label: 'Publish to website', action: 'publish' }] }],
    actions: { new: function () { addPart(); }, imp: function () { L.pickFile(importParts); }, tpl: partsTemplate, prices: function () { L.pickFile(uploadPrices); }, publish: requestPublish },
    route: function (r) { if (r.parts[0] === 'p' && r.parts[1]) partForm(r.parts[1]); else if (r.parts[0] === 'coverage') coverage(); else if (r.parts[0] === 'publish') publishPage(); else if (r.parts[0] === 'history') historyPage(r); else if (r.parts[0] === 'inquiries') inquiryPage(r); else list(r); }
  });
})(window.LS);
