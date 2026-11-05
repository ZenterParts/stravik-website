/* App: Pricing. Stravik price lists per range and region (South Africa first; prices in the region's currency, stored excl. VAT).
   Who sees what is decided by the database, not by this page:
   - pricing team (staff.sees_costs: data owners, Arlin, Tiago, Pedro): the whole costing (FOB/EXW, cost build-up, CIF, landed cost,
     gross sales, uplifts) and every region; they upload price lists, see the history and choose who sees which region;
   - sales (a row in stravik_price_access for the region): T1-T5 and retail, excl. and incl. VAT, and the market price; never costs or uplifts;
   - everyone else: nothing.
   Tables: stravik_prices_<range> (one per range; sa_* = South Africa), stravik_price_regions, stravik_price_access, stravik_price_history.
   Functions: stravik_price_me, stravik_price_view (what the person may see), stravik_price_upload (checks the sheet against its formulas, then saves),
   stravik_price_add_range. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var BASE = L.href('pricing');
  var S = L.state.pricing = { range: '', region: '', text: '', offset: 0, costs: false, key: '', data: null };
  var ME = null, meP = null;
  function me() {
    if (ME) return Promise.resolve(ME);
    return meP || (meP = sb.rpc('stravik_price_me').then(function (r) { ME = L.must(r) || { sees_costs: false, regions: [], tiers: [], ranges: [] }; meP = null; L.refreshNav(); return ME; }, function (e) { meP = null; throw e; }));
  }
  var costs = function () { return !!(ME && ME.sees_costs); };
  var region = function () { return (ME.regions || []).find(function (r) { return r.code === S.region; }) || ME.regions[0]; };
  var sym = function (cur) { return cur === 'ZAR' ? 'R' : cur === 'USD' ? '$' : cur + ' '; };
  var money = function (v, cur) { return v == null || v === '' ? '' : sym(cur) + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var r2 = function (v) { return v == null || v === '' ? null : Math.round(Number(v) * 100) / 100; };
  // incl. VAT from the price rounded to cents, as the website and the orders do (excl. + VAT add up on an invoice)
  var incl = function (v, vat) { return v == null ? null : Math.round(Math.round(Number(v) * 100) / 100 * (1 + vat) * 100) / 100; };
  var pct = function (v) { return v == null || v === '' ? '' : (Math.round(Number(v) * 10000) / 100) + '%'; };
  var dmy = function (d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  var TIER = [['t1', 'T1'], ['t2', 'T2'], ['t3', 'T3'], ['t4', 'T4'], ['t5', 'T5'], ['retail', 'Retail']];
  var tierName = function (col) { var t = (ME.tiers || []).find(function (x) { return x.col === col; }); return t ? t.name : col.toUpperCase(); };
  function noAccess() {
    L.cp({ crumbs: [['Pricing']] });
    L.content(L.empty('No price access', 'Prices are shown to the sales team for the regions they serve and to the pricing team. Ask Arlin or the data team if you need access.'));
  }

  // ======================================================================== price list
  async function load() {
    var reg = region(), key = S.range + '|' + reg.code;
    if (S.data && S.key === key) return S.data;
    S.data = L.must(await sb.rpc('stravik_price_view', { p_sub: S.range, p_region: reg.code })); S.key = key;
    return S.data;
  }
  async function list(r) {
    try {
      await me();
      if (!ME.regions.length) return noAccess();
      if (r.q.range) { S.range = r.q.range; S.offset = 0; }
      if (r.q.region) { S.region = r.q.region; S.offset = 0; }
      if (!S.range || !ME.ranges.some(function (x) { return x.subcategory === S.range; })) S.range = ME.ranges.length ? ME.ranges[0].subcategory : '';
      if (!S.region) S.region = ME.regions[0].code;
      if (!costs()) S.costs = false;
      var reg = region();
      L.cp({ crumbs: [['Pricing', BASE], [reg.name + ' · ' + (S.range || 'no price lists yet')]],
        buttons: (costs() ? '<button type="button" class="btn" id="prUp">Upload price list</button>' : '') + '<button type="button" class="btn ghost" id="prXls">Download</button>' + (ME.ranges.length > 1 ? '<button type="button" class="btn ghost" id="prXlsAll">Download all ranges</button>' : '') +
          (ME.regions.length > 1 ? '<select id="prReg" style="width:auto">' + ME.regions.map(function (x) { return '<option value="' + esc(x.code) + '"' + (x.code === reg.code ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '') +
          (costs() ? '<span class="chips" style="margin-left:6px"><button type="button" class="chip' + (S.costs ? '' : ' on') + '" data-v="0">Prices</button><button type="button" class="chip' + (S.costs ? ' on' : '') + '" data-v="1">Costing</button></span>' : '') });
      L.searchBar({ placeholder: 'Search Stravik PN, Lucas PN or description…', text: S.text, filters: [], onChange: function (s) { S.text = s.text; S.offset = 0; paint(); } });
      L.content('<div class="o-with-panel"><nav class="o-panel"><div class="o-panel-title">Range</div>' +
        (ME.ranges.length ? ME.ranges.map(function (x) { return '<a href="' + L.href('pricing', [], { range: x.subcategory }) + '" class="' + (x.subcategory === S.range ? 'on' : '') + '">' + esc(x.subcategory) + '</a>'; }).join('') : '<p class="small muted" style="padding:6px 14px">No price lists yet.</p>') +
        '</nav><div><div id="prNote" class="small muted" style="margin:0 0 10px"></div><div id="prList"><p class="muted">Loading…</p></div></div></div>');
      if ($('prUp')) $('prUp').onclick = function () { L.pickFile(upload); };
      $('prXls').onclick = excel;
      if ($('prXlsAll')) $('prXlsAll').onclick = excelAll;
      if ($('prReg')) $('prReg').onchange = function () { L.go(L.href('pricing', [], { region: this.value })); };
      var ch = $('cpButtons').querySelector('.chips');
      if (ch) ch.onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; S.costs = b.dataset.v === '1'; S.offset = 0; list({ q: {} }); };
      if (!S.range) { $('prList').innerHTML = L.empty('No price lists yet', costs() ? 'Upload a range\'s price list to start.' : ''); return; }
      await load(); paint();
    } catch (e) { L.fail(e); }
  }
  function rows() {
    var t = L.clean(S.text), words = String(S.text || '').toLowerCase().split(/\s+/).filter(Boolean);
    return (S.data.rows || []).filter(function (x) {
      if (!t) return true;
      if (L.clean(x.sv_pn).indexOf(t) >= 0 || L.clean(x.lucas_pn).indexOf(t) >= 0) return true;
      var d = String(x.short_desc || '').toLowerCase(); return words.every(function (w) { return d.indexOf(w) >= 0; });
    });
  }
  // the sell prices: from the costing row (pricing team) or the sales row
  function sell(x, col) { var px = S.data.region.prefix; return S.data.costs ? x[px + '_' + col] : x[col]; }
  function paint() {
    var reg = S.data.region, vat = Number(reg.vat), all = rows(), page = all.slice(S.offset, S.offset + L.PAGE), px = reg.prefix, cur = reg.currency;
    var eff = (S.data.rows || []).map(function (x) { return S.data.costs ? x[px + '_effective'] : x.effective; }).filter(Boolean).sort().pop();
    $('prNote').innerHTML = esc(reg.name) + ' · ' + esc(S.range) + ' · ' + (S.data.rows || []).length.toLocaleString() + ' parts priced' + (eff ? ' · effective ' + esc(dmy(eff)) : '') + ' · prices in ' + esc(cur) +
      (S.costs ? ' · costing view (pricing team only)' : ' · first line excl. VAT, second line incl. ' + esc(pct(vat)) + ' VAT');
    L.pager(S.offset, all.length, function (o) { S.offset = o; paint(); });
    if (!all.length) { $('prList').innerHTML = L.empty(S.text ? 'Nothing matches' : 'No prices in this range yet'); return; }
    var two = function (v) { return v == null ? '' : '<b>' + esc(money(v, cur)) + '</b><div class="small muted">' + esc(money(incl(v, vat), cur)) + '</div>'; };
    var cols = [{ label: 'Stravik PN', render: function (x) { return '<span class="pn">' + esc(x.sv_pn) + '</span>' + (x.lucas_pn ? '<div class="small muted">' + esc(x.lucas_pn) + '</div>' : ''); } },
      { label: 'Description', cls: 'clip', render: function (x) { return esc(x.short_desc || ''); } }];
    if (S.costs) {
      cols = cols.concat([
        { label: 'FOB / EXW USD', num: true, render: function (x) { return esc(money(x.fob_usd, 'USD')) + '<div class="small muted">' + esc(x.price_basis || '') + '</div>'; } },
        { label: 'CIF USD', num: true, render: function (x) { return esc(money(x.cif_usd, 'USD')); } },
        { label: 'CIF ' + cur, num: true, render: function (x) { return esc(money(x[px + '_cif_zar'], cur)); } },
        { label: 'Landed', num: true, render: function (x) { return esc(money(x[px + '_landed'], cur)); } },
        { label: 'Gross sales', num: true, render: function (x) { return esc(money(x[px + '_gross'], cur)); } }
      ]).concat(TIER.map(function (t) {
        var up = t[0] === 'retail' ? px + '_retail_margin' : px + '_' + t[0] + '_uplift';
        return { label: t[1], num: true, render: function (x) { return '<b>' + esc(money(x[px + '_' + t[0]], cur)) + '</b><div class="small muted">+' + esc(pct(x[up])) + '</div>'; } };
      })).concat([{ label: 'Market', num: true, render: function (x) { return esc(x[px + '_market_price'] || ''); } }]);
    } else {
      cols = cols.concat(TIER.map(function (t) { return { label: t[1], num: true, render: function (x) { return two(sell(x, t[0])); } }; }))
        .concat([{ label: 'Market', num: true, render: function (x) { return esc((S.data.costs ? x[px + '_market_price'] : x.market_price) || ''); } }]);
    }
    $('prList').innerHTML = L.listView(cols, page, costs() ? function (x) { return L.href('pricing', ['part', x.sv_pn], { range: S.range }); } : null) +
      '<p class="small muted" style="margin-top:8px">' + TIER.map(function (t) { return '<b>' + t[1] + '</b> ' + esc(tierName(t[0])); }).join(' · ') + '</p>';
  }

  // one part's full costing (pricing team)
  async function part(r) {
    try {
      await me();
      if (!costs()) return L.go(BASE);
      if (r.q.range) S.range = r.q.range;
      if (!S.region) S.region = ME.regions[0].code;
      await load();
      var pn = r.parts[1], x = (S.data.rows || []).find(function (y) { return y.sv_pn === pn; }), reg = S.data.region, px = reg.prefix, cur = reg.currency, vat = Number(reg.vat);
      var crumbs = [['Pricing', BASE], [S.range, L.href('pricing', [], { range: S.range })], [pn]];
      if (!x) { L.cp({ crumbs: crumbs }); return L.content(L.empty('No price for ' + pn, 'This part is not in the ' + S.range + ' price list.')); }
      var hist = L.must(await sb.from('stravik_price_history').select('at,by_email,action,changes,source').eq('sv_pn', pn).order('at', { ascending: false }).limit(30));
      var line = function (label, pctKey, valKey, valCur) { return [label, (pctKey ? '<span class="muted">' + esc(pct(x[pctKey])) + '</span> ' : '') + (valKey ? '<b>' + esc(money(x[valKey], valCur)) + '</b>' : '')]; };
      L.form({ crumbs: crumbs, buttons: '<button type="button" class="btn ghost" id="pcPart">Open the part</button>',
        sheet: '<div class="o-title"><h1>' + esc(pn) + '</h1></div><div class="o-subtitle">' + esc(x.short_desc || '') + (x.lucas_pn ? ' · Lucas ' + esc(x.lucas_pn) : '') + '</div>' +
          '<div class="o-groups">' +
          L.group('Supplier and Zenter Parts costs (USD)', [[(x.price_basis || 'FOB') + ' price', '<b>' + esc(money(x.fob_usd, 'USD')) + '</b>' + (x.fob_port ? ' <span class="muted">' + esc(x.fob_port) + '</span>' : '')],
            line('Consolidation', 'c_cons'), line('Finance', 'c_finance'), line('Customer rebate / discount', 'c_customer_rebate'), line('Shipping', 'c_ship'), line('Insurance', 'c_ins'),
            line('Warehousing', 'c_whs'), line('Warranty', 'c_warr'), line('Marketing', 'c_mar'), line('Royalty', 'c_roy'), line('ZP margin', 'zp_mar'), line('CIF Zenter Parts', null, 'cif_usd', 'USD'), ['Remarks', esc(x.remarks || '')]]) +
          L.group(reg.name + ' (' + cur + ', excl. VAT)', [['Exchange rate', esc(String(x[px + '_fx_rate'] || '')) + ' + ' + esc(pct(x[px + '_fx_buffer'])) + ' buffer = <b>' + esc(x[px + '_exchange'] == null ? '' : String(Math.round(x[px + '_exchange'] * 10000) / 10000)) + '</b>'],
            line('CIF ' + cur, null, px + '_cif_zar', cur), line('Clearance', px + '_clearance'), line('Duties', px + '_duties'), line('Ancillary fluctuations', px + '_ancillary'), line('Finance', px + '_finance'),
            line('Excise', px + '_excise'), line('Anti-dumping', px + '_anti_dumping'), line('DPW margin', px + '_dpw_margin'), line('Landed cost', null, px + '_landed', cur),
            line('Distribution', px + '_c_dist'), line('COD discount', px + '_c_cod'), line('Gross sales', null, px + '_gross', cur)]) +
          L.group('Sell prices (' + cur + ')', TIER.map(function (t) {
            var up = t[0] === 'retail' ? px + '_retail_margin' : px + '_' + t[0] + '_uplift', v = x[px + '_' + t[0]];
            return [tierName(t[0]), '<span class="muted">+' + esc(pct(x[up])) + '</span> <b>' + esc(money(v, cur)) + '</b> <span class="muted">· incl. VAT ' + esc(money(incl(v, vat), cur)) + '</span>'];
          }).concat([['Market price', esc(x[px + '_market_price'] || '')], ['Effective', esc(dmy(x[px + '_effective']))], ['Source', esc(x[px + '_source'] || '')], ['Last change', esc(L.dt(x.updated_at)) + ' · ' + esc(x.updated_by || '')]])) +
          '</div>' +
          '<h3 style="margin-top:22px">History</h3>' + historyTable(hist, false)
      });
      $('pcPart').onclick = function () { L.openPart(pn); };
    } catch (e) { L.fail(e); }
  }

  // ======================================================================== Excel download (what the person may see)
  // Sheets for a download: "Prices" (every tier, excl. and incl. VAT) and, for the pricing team, "Costing" (the whole build-up).
  // views = stravik_price_view results (one per range); keep(row) filters the rows.
  function exportSheets(views, keep) {
    views = views.filter(function (v) { return v && v.rows; });
    if (!views.length) return [];
    var reg = views[0].region, px = reg.prefix, cur = reg.currency, vat = Number(reg.vat), withCost = views.every(function (v) { return v.costs; });
    var sell_ = function (v, x, col) { return v.costs ? x[px + '_' + col] : x[col]; };
    var head = ['Stravik PN', 'Lucas PN', 'Description', 'Range'], widths = [14, 14, 46, 16];
    TIER.forEach(function (t) { head.push(tierName(t[0]) + ' ' + cur + ' excl. VAT', tierName(t[0]) + ' ' + cur + ' incl. VAT'); widths.push(16, 16); });
    head.push('Market price', 'Effective'); widths.push(16, 12);
    var all = [];
    views.forEach(function (v) { v.rows.forEach(function (x) { if (!keep || keep(x, v)) all.push([v, x]); }); });
    var sheets = [{ name: 'Prices', head: head, widths: widths, top: [[reg.name + ' · ' + views.map(function (v) { return v.subcategory; }).join(', ') + ' · ' + cur + ' · excl. VAT and incl. ' + pct(vat) + ' VAT']],
      rows: all.map(function (p) {
        var v = p[0], x = p[1], o = [x.sv_pn, x.lucas_pn || '', x.short_desc || '', v.subcategory];
        TIER.forEach(function (t) { var y = sell_(v, x, t[0]); o.push(r2(y), incl(y, vat)); });
        o.push((v.costs ? x[px + '_market_price'] : x.market_price) || '', (v.costs ? x[px + '_effective'] : x.effective) || ''); return o;
      }) }];
    if (withCost) {
      var C = [['sv_pn', 'Stravik PN'], ['_range', 'Range'], ['price_basis', 'Basis'], ['fob_port', 'FOB port'], ['fob_usd', 'FOB / EXW USD'], ['c_cons', 'C_CONS'], ['c_finance', 'C_FINANCE'], ['c_customer_rebate', 'C_CUSTOMER REBATE'], ['c_ship', 'C_SHIP'], ['c_ins', 'C_INS'],
        ['c_whs', 'C_WHS'], ['c_warr', 'C_WARR'], ['c_mar', 'C_MAR'], ['c_roy', 'C_ROY'], ['zp_mar', 'ZP MAR'], ['cif_usd', 'CIF ZENTER PARTS'], [px + '_fx_rate', 'USD → ' + cur + ' rate'], [px + '_fx_buffer', 'FX buffer'], [px + '_exchange', 'EXCHANGE ' + cur],
        [px + '_cif_zar', 'CIF ZENTER PARTS ' + cur], [px + '_clearance', 'CLEARANCE'], [px + '_duties', 'DUTIES'], [px + '_ancillary', 'ANCILIARY FLUCTUATIONS'], [px + '_finance', 'FINANCE'], [px + '_excise', 'EXCISE'], [px + '_anti_dumping', 'ANTI DUMPING'],
        [px + '_dpw_margin', 'DPW MARGIN'], [px + '_landed', 'LANDED COST DPW'], [px + '_c_dist', 'C_DIST'], [px + '_c_cod', 'C_COD DISCOUNT'], [px + '_gross', 'GROSS SALES'],
        [px + '_t1_uplift', 'T1 UPLIFT'], [px + '_t1', 'T1 DISTRIBUTOR/WHOLESALER'], [px + '_t2_uplift', 'T2 CHAIN UPLIFT'], [px + '_t2', 'T2 CHAIN PRICES'], [px + '_t3_uplift', 'T3 UPLIFT BIG RETAILERS'], [px + '_t3', 'BIG RETAILERS'],
        [px + '_t4_uplift', 'T4 UPLIFT TO MEDIUM RETAILERS'], [px + '_t4', 'T4 MEDIUM RETAILERS'], [px + '_t5_uplift', 'T5 UPLIFT TO SMALL RETAILERS'], [px + '_t5', 'T5 SMALL RETAILERS'], [px + '_retail_margin', 'SALES MARGIN RETAIL PRICE'], [px + '_retail', 'RETAIL PRICE'],
        [px + '_market_price', 'MARKET PRICE ' + cur], ['remarks', 'REMARKS'], [px + '_effective', 'Effective'], [px + '_source', 'Source']];
      sheets.push({ name: 'Costing', head: C.map(function (c) { return c[1]; }), rows: all.map(function (p) {
        return C.map(function (c) { var y = c[0] === '_range' ? p[0].subcategory : p[1][c[0]]; return y == null ? '' : typeof y === 'number' ? Math.round(y * 1e6) / 1e6 : y; });
      }) });
    }
    return sheets;
  }
  // Download for other apps (Customers > pricing approval): every range (or the ones given) of a region, filtered by keep(row, view)
  L.pricingDownload = async function (regionCode, ranges, keep, extraFirst, name) {
    var me_ = await me(); regionCode = regionCode || (me_.regions[0] || {}).code;
    if (!regionCode) throw new Error('No price region available');
    var subs = (ranges && ranges.length ? ranges : me_.ranges.map(function (r) { return r.subcategory; }));
    var views = await Promise.all(subs.map(function (sub) { return sb.rpc('stravik_price_view', { p_sub: sub, p_region: regionCode }).then(L.must); }));
    var sheets = (extraFirst || []).concat(exportSheets(views, keep));
    await L.saveXlsx(sheets, name || ('Stravik_prices_' + regionCode + '_' + L.today() + '.xlsx'));
  };
  async function excel() {
    try {
      if (!S.data) return;
      L.toast('Preparing the download…');
      var keep = {}; rows().forEach(function (x) { keep[x.sv_pn] = 1; });
      await L.saveXlsx(exportSheets([S.data], function (x) { return keep[x.sv_pn]; }), 'Stravik_prices_' + S.data.region.name.replace(/\W+/g, '_') + '_' + S.range.replace(/\W+/g, '_') + '_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }
  async function excelAll() {
    try {
      L.toast('Preparing all ranges…');
      var reg = region();
      await L.pricingDownload(reg.code, null, null, null, 'Stravik_prices_' + reg.name.replace(/\W+/g, '_') + '_all_ranges_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // ======================================================================== upload (pricing team)
  // Reads the costing sheet as the pricing team keeps it: title rows (range name, "Effective 30 October 2026", "USD → ZAR rate", "FX buffer"),
  // then the header row starting with STRAVIK PART NUMBER. Unknown columns (make, model, OE …) are ignored.
  var MAP = { stravikpartnumber: 'sv_pn', lucaspartnumber: '_lucas', cexwusd: 'fob_usd', fobpriceusdpc: 'fob_usd', fobpriceusd: 'fob_usd', fobusd: 'fob_usd', fobport: 'fob_port', remarks: 'remarks',
    ccons: 'c_cons', cfinance: 'c_finance', ccustomerrebate: 'c_customer_rebate', ccustomerdiscount: 'c_customer_rebate', cship: 'c_ship', cins: 'c_ins', cwhs: 'c_whs', cwarr: 'c_warr', cmar: 'c_mar', croy: 'c_roy', zpmar: 'zp_mar',
    cifzenterparts: 'cif_usd', exchangezar: 'sa_exchange', cifzenterpartszar: 'sa_cif_zar', clearance: 'sa_clearance', duties: 'sa_duties', anciliaryfluctuations: 'sa_ancillary', ancillaryfluctuations: 'sa_ancillary',
    finance: 'sa_finance', excise: 'sa_excise', antidumping: 'sa_anti_dumping', dpwmargin: 'sa_dpw_margin', landedcost: 'sa_landed', landedcostdpw: 'sa_landed', cdist: 'sa_c_dist', ccoddiscount: 'sa_c_cod', grosssales: 'sa_gross',
    t1uplift: 'sa_t1_uplift', t2chainuplift: 'sa_t2_uplift', t2chainprices: 'sa_t2', t3upliftbigretailers: 'sa_t3_uplift', bigretailers: 'sa_t3', t3bigretailers: 'sa_t3', t4uplifttomediumretailers: 'sa_t4_uplift', t4mediumretailers: 'sa_t4',
    t5uplifttosmallretailers: 'sa_t5_uplift', t5smallretailers: 'sa_t5', salesmarginretailprice: 'sa_retail_margin', retailprice: 'sa_retail', marketpricezar: 'sa_market_price', marketprice: 'sa_market_price' };
  var TEXT = { sv_pn: 1, _lucas: 1, fob_port: 1, remarks: 1, sa_market_price: 1 };
  function numOf(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return null;
    var p = /%$/.test(s); s = s.replace(/[R$\s,%]/g, '');
    var n = Number(s); return isFinite(n) ? (p ? n / 100 : n) : NaN;
  }
  async function readPriceSheet(f) {
    var rows = await L.readRows(f), hi = rows.findIndex(function (r) { return r.some(function (c) { return L.normHead(c) === 'stravikpartnumber'; }); });
    if (hi < 0) throw new Error('No "STRAVIK PART NUMBER" column found in the first sheet.');
    var info = { fx: null, buf: null, eff: null, title: null };
    rows.slice(0, hi).forEach(function (r) {
      r.forEach(function (c, i) {
        var h = L.normHead(c);
        if (/^usd.*(zar|rate)/.test(h) || h === 'usdzarrate') info.fx = numOf(r[i + 1]);
        if (h === 'fxbuffer') info.buf = numOf(r[i + 1]);
        var m = /^effective\s+(.+)$/i.exec(String(c || '').trim()); if (m) { var d = new Date(m[1]); if (!isNaN(d)) info.eff = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        if (!info.title && L.CATS.some(function (x) { return x.name.toLowerCase() === String(c || '').trim().toLowerCase(); })) info.title = L.CATS.find(function (x) { return x.name.toLowerCase() === String(c || '').trim().toLowerCase(); }).subcategory_key;
      });
    });
    var cols = [], seenT1 = 0, unknownHeads = [];
    rows[hi].forEach(function (c, i) {
      var h = L.normHead(c), k = MAP[h];
      if (h === 't1distributorwholesaler') { k = seenT1++ ? 'sa_t1' : 'sa_t1_uplift'; }   // the sheet uses the same heading for the T1 uplift and the T1 price
      if (k) cols.push({ i: i, k: k, basis: h === 'cexwusd' ? 'EXW' : h.indexOf('fob') === 0 && k === 'fob_usd' ? 'FOB' : null });
      else if (h) unknownHeads.push(String(c));
    });
    var basis = (cols.find(function (c) { return c.basis; }) || {}).basis || null;
    var out = [], bad = [];
    rows.slice(hi + 1).forEach(function (r, n) {
      var o = {}, any = false;
      cols.forEach(function (c) {
        var v = r[c.i];
        if (TEXT[c.k]) { v = String(v == null ? '' : v).trim(); if (v) { o[c.k] = c.k === 'sv_pn' || c.k === '_lucas' ? L.pnNorm(v) : v; any = true; } }
        else { var x = numOf(v); if (x === null) return; if (Number.isNaN(x)) bad.push('Row ' + (n + hi + 2) + ': "' + v + '" is not a number (' + c.k + ')'); else { o[c.k] = x; any = true; } }
      });
      var isPn = function (v) { return /^[A-Z0-9][A-Z0-9-]{3,}$/.test(v || ''); };   // skips notes below the table ("65 items · …")
      if (!isPn(o.sv_pn)) delete o.sv_pn;
      if (!isPn(o._lucas)) delete o._lucas;
      if (any && (o.sv_pn || o._lucas)) out.push(o);
    });
    return { info: info, rows: out, bad: bad, basis: basis, ignored: unknownHeads };
  }
  async function upload(f) {
    L.modal('Upload price list', '<p class="muted">Reading ' + esc(f.name) + '…</p>', true);
    try {
      await me();
      var sh = await readPriceSheet(f);
      // part numbers left empty (a formula without its saved result): find them from the Lucas number
      var need = sh.rows.filter(function (o) { return !o.sv_pn && o._lucas; }).map(function (o) { return L.clean(o._lucas); });
      if (need.length) {
        var by = {};
        for (var ch of L.chunks(need, 300)) L.must(await sb.from('stravik_cross_refs').select('sv_pn,clean_key').eq('comp_brand', 'Lucas').in('clean_key', ch)).forEach(function (x) { by[x.clean_key] = x.sv_pn; });
        sh.rows.forEach(function (o) { if (!o.sv_pn && o._lucas) o.sv_pn = by[L.clean(o._lucas)] || o._lucas; });
      }
      var range = sh.info.title || S.range || '';
      L.modal('Upload price list', '<p>' + esc(f.name) + ': <b>' + sh.rows.length.toLocaleString() + '</b> rows' +
          (sh.info.eff ? ', effective <b>' + esc(dmy(sh.info.eff)) + '</b>' : '') + (sh.info.fx ? ', USD → ZAR <b>' + esc(String(sh.info.fx)) + '</b>' + (sh.info.buf != null ? ' + ' + esc(pct(sh.info.buf)) + ' buffer' : '') : '') + '.</p>' +
        (!sh.info.fx ? '<div class="notice bad">No exchange rate found above the table ("USD → ZAR rate" with the rate in the next cell).</div>' : '') +
        (sh.bad.length ? '<div class="notice bad"><b>Fix these first:</b><ul>' + sh.bad.slice(0, 20).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        L.group('', [['Range', '<select id="puRange">' + L.CATS.map(function (x) { return '<option' + (x.subcategory_key === range ? ' selected' : '') + '>' + esc(x.subcategory_key) + '</option>'; }).join('') + '</select>'],
          ['Region', '<select id="puReg"><option value="south_africa">South Africa (ZAR)</option></select>']]) +
        (sh.ignored.length ? '<p class="small muted">Not price columns, ignored: ' + esc(sh.ignored.join(', ')) + '</p>' : '') +
        '<div id="puRes"></div><div class="o-footer"><button class="btn" id="puCheck"' + (sh.bad.length || !sh.info.fx ? ' disabled' : '') + '>Check</button><button class="btn ghost" id="puX">Cancel</button></div>', true);
      $('puX').onclick = L.closeModal;
      var payload = function () {
        return sh.rows.map(function (o) {
          var x = Object.assign({}, o); delete x._lucas;
          x.sa_fx_rate = sh.info.fx; if (sh.info.buf != null) x.sa_fx_buffer = sh.info.buf;
          if (sh.info.eff) x.sa_effective = sh.info.eff;
          if (sh.basis) x.price_basis = sh.basis;
          x.sa_source = f.name + (sh.info.eff ? ' (effective ' + sh.info.eff + ')' : ''); return x;
        });
      };
      $('puCheck').onclick = async function () {
        var b = this, sub = $('puRange').value; b.disabled = true; b.textContent = 'Checking…';
        try {
          if (!ME.ranges.some(function (x) { return x.subcategory === sub; })) { L.must(await sb.rpc('stravik_price_add_range', { p_sub: sub })); ME = null; await me(); }
          var res = L.must(await sb.rpc('stravik_price_upload', { p_sub: sub, p_rows: payload(), p_dry_run: true }));
          $('puRes').innerHTML = report(res);
          b.textContent = 'Check again'; b.disabled = false;
          var go = document.createElement('button'); go.className = 'btn'; go.id = 'puGo'; go.textContent = 'Save ' + (res.added + res.changed) + ' parts';
          go.disabled = !(res.added + res.changed); $('puX').before(go);
          go.onclick = async function () {
            go.disabled = true; go.textContent = 'Saving…';
            try {
              var done = L.must(await sb.rpc('stravik_price_upload', { p_sub: sub, p_rows: payload(), p_dry_run: false }));
              L.closeModal(); L.toast('Saved: ' + done.added + ' added, ' + done.changed + ' changed, ' + done.unchanged + ' unchanged');
              S.data = null; S.range = sub; L.go(L.href('pricing', [], { range: sub }));
            } catch (e) { L.fail(e); go.disabled = false; go.textContent = 'Try again'; }
          };
          b.remove();
        } catch (e) { L.fail(e); b.disabled = false; b.textContent = 'Check'; }
      };
    } catch (e) { L.modal('Upload price list', '<p class="flag">' + esc(e.message || e) + '</p>'); }
  }
  function report(res) {
    var li = function (a, f) { return '<ul>' + a.slice(0, 25).map(function (x) { return '<li>' + f(x) + '</li>'; }).join('') + (a.length > 25 ? '<li>… and ' + (a.length - 25) + ' more</li>' : '') + '</ul>'; };
    return '<div class="notice' + (res.mismatches.length || res.problems.length ? ' bad' : ' good') + '"><b>' + res.added + '</b> new, <b>' + res.changed + '</b> changed, <b>' + res.unchanged + '</b> unchanged.</div>' +
      (res.unknown.length ? '<div class="notice bad"><b>' + res.unknown.length + ' part numbers not found</b> (skipped): ' + esc(res.unknown.slice(0, 30).join(', ')) + (res.unknown.length > 30 ? '…' : '') + '</div>' : '') +
      (res.wrong_range.length ? '<div class="notice bad"><b>' + res.wrong_range.length + ' parts are in another range</b> (skipped): ' + esc(res.wrong_range.slice(0, 20).join(', ')) + '</div>' : '') +
      (res.problems.length ? '<div class="notice bad"><b>Check these</b>' + li(res.problems, function (p) { return '<b>' + esc(p.pn) + '</b>: ' + esc(p.problem); }) + '</div>' : '') +
      (res.mismatches.length ? '<div class="notice bad"><b>' + res.mismatches.length + ' values in the sheet differ from its own formulas</b> (typed over, or a broken formula). The formula value is saved:' +
        li(res.mismatches, function (m) { return '<b>' + esc(m.pn) + '</b> ' + esc(m.column) + ': sheet ' + esc(String(m.sheet)) + ', formula ' + esc(String(m.formula)); }) + '</div>' : '') +
      (res.above_market.length ? '<div class="notice"><b>' + res.above_market.length + ' retail prices incl. VAT are above the market price</b> (for information):' +
        li(res.above_market, function (m) { return '<b>' + esc(m.pn) + '</b> retail incl. VAT R' + esc(L.money(m.retail_incl_vat)) + ', market ' + esc(m.market); }) + '</div>' : '') +
      (res.changes.length ? '<div class="o-list"><table class="grid compact"><thead><tr><th>Stravik PN</th><th class="num">T1 now</th><th class="num">T1 new</th><th class="num">Retail now</th><th class="num">Retail new</th><th>Changed</th></tr></thead><tbody>' +
        res.changes.slice(0, 200).map(function (c) { return '<tr><td class="pn">' + esc(c.pn) + '</td><td class="num">' + (c.new ? '<span class="muted">new</span>' : esc(L.money(c.t1_was))) + '</td><td class="num"><b>' + esc(L.money(c.t1)) + '</b></td><td class="num">' + (c.new ? '' : esc(L.money(c.retail_was))) + '</td><td class="num"><b>' + esc(L.money(c.retail)) + '</b></td><td class="small">' + esc((c.columns || []).join(', ')) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (res.changes.length > 200 ? '<p class="small muted">First 200 shown.</p>' : '') : '');
  }
  async function uploadPage() {
    await me();
    if (!costs()) return L.go(BASE);
    L.cp({ crumbs: [['Pricing', BASE], ['Upload']], buttons: '<button type="button" class="btn" id="upGo">Choose the Excel file</button>' });
    L.content('<div class="o-sheet" style="max-width:860px"><h2>Upload a price list</h2><p>Upload the costing sheet as you keep it (one range per file), for example <i>Bulbs.xlsx</i>. Above the table it should have the range name, ' +
      '“Effective 30 October 2026”, “USD → ZAR rate” and “FX buffer”; the table starts at the row with <b>STRAVIK PART NUMBER</b>.</p>' +
      '<ul><li>Every price is recalculated from the costs with the sheet\'s own formulas. Values that differ by more than a cent (typed over, or a broken formula) are listed before anything is saved.</li>' +
      '<li>You see what is new and what changes, then save. Every change is kept in the history.</li>' +
      '<li>A file with only some columns (e.g. Stravik PN and FOB) changes only those, and recalculates the prices from the part\'s other stored costs.</li>' +
      '<li>Parts listed twice (one row per vehicle) must have the same costs and margins; the market price may be on just one of the rows.</li>' +
      '<li>Prices are kept excl. VAT; the 15% VAT for South Africa is added when they are shown.</li></ul></div>');
    $('upGo').onclick = function () { L.pickFile(upload); };
  }

  // ======================================================================== history (pricing team)
  var TBL = {};
  function historyTable(rows, withPart) {
    if (!rows.length) return '<p class="muted">No changes yet.</p>';
    var PCT = /^(c_|zp_mar|sa_(clearance|duties|ancillary|finance|excise|anti_dumping|dpw_margin|c_dist|c_cod|fx_buffer|t\d_uplift|retail_margin)$)/, PLAIN = /^sa_(fx_rate|exchange)$/;
    var show = function (k, v) { return v == null ? '—' : typeof v !== 'number' ? String(v) : PCT.test(k) ? pct(v) : PLAIN.test(k) ? String(Math.round(v * 10000) / 10000) : L.money(v); };
    return '<div class="o-list"><table class="grid compact"><thead><tr><th>When</th><th>By</th>' + (withPart ? '<th>Part</th><th>Range</th>' : '') + '<th>What</th><th>Source</th></tr></thead><tbody>' + rows.map(function (h) {
      var what = h.action === 'insert' ? 'Added' + (h.changes && h.changes.sa_t1 != null ? ' · T1 ' + esc(L.money(h.changes.sa_t1)) + ', retail ' + esc(L.money(h.changes.sa_retail)) : '') : h.action === 'delete' ? 'Removed' :
        Object.keys(h.changes || {}).map(function (k) { var c = h.changes[k]; return '<b>' + esc(k) + '</b> ' + esc(show(k, c[0])) + ' → ' + esc(show(k, c[1])); }).join('<br>');
      return '<tr><td class="small">' + esc(L.dt(h.at)) + '</td><td class="small">' + esc(h.by_email || '') + '</td>' + (withPart ? '<td class="pn"><a href="' + L.href('pricing', ['part', h.sv_pn], { range: TBL[h.table_name] || '' }) + '">' + esc(h.sv_pn) + '</a></td><td>' + esc(TBL[h.table_name] || h.table_name) + '</td>' : '') +
        '<td class="small">' + what + '</td><td class="small muted">' + esc(h.source || '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  async function history() {
    try {
      await me();
      if (!costs()) return L.go(BASE);
      ME.ranges.forEach(function (x) { TBL[x.table] = x.subcategory; });
      L.cp({ crumbs: [['Pricing', BASE], ['History']] });
      L.searchBar({ placeholder: 'Search a Stravik PN…', text: S.htext || '', filters: [], onChange: function (s) { S.htext = s.text; go(); } });
      L.content('<div id="hBox"><p class="muted">Loading…</p></div>');
      var go = async function () {
        var q = sb.from('stravik_price_history').select('at,by_email,table_name,sv_pn,action,changes,source').order('at', { ascending: false }).limit(200);
        if (S.htext) q = q.ilike('sv_pn', '%' + L.pnNorm(S.htext).replace(/[%_]/g, '') + '%');
        $('hBox').innerHTML = '<p class="small muted">Latest 200 changes.</p>' + historyTable(L.must(await q), true);
      };
      await go();
    } catch (e) { L.fail(e); }
  }

  // ======================================================================== access (pricing team)
  async function access() {
    try {
      await me();
      if (!costs()) return L.go(BASE);
      var r = await Promise.all([sb.from('staff').select('email,full_name,team,role,active,sees_costs').order('full_name'), sb.from('stravik_price_access').select('*').order('email'), sb.from('stravik_price_regions').select('*').order('sort')]);
      var staff = L.must(r[0]), acc = L.must(r[1]), regs = L.must(r[2]).filter(function (x) { return x.col_prefix; });
      var nm = function (e) { var s = staff.find(function (x) { return x.email === e; }); return s ? (s.full_name || e) + ' <span class="small muted">' + esc(e) + (s.team ? ' · ' + esc(s.team) : '') + '</span>' : esc(e); };
      L.cp({ crumbs: [['Pricing', BASE], ['Access']] });
      L.content('<div class="o-sheet" style="max-width:980px">' +
        '<h2>Pricing team: sees all costs and every region</h2><p class="small muted">FOB / EXW, the cost build-up, landed cost, gross sales and uplifts; uploads price lists. Changed by the data team (staff.sees_costs).</p>' +
        '<ul>' + staff.filter(function (s) { return s.sees_costs && s.active; }).map(function (s) { return '<li>' + nm(s.email) + '</li>'; }).join('') + '</ul>' +
        '<h2 style="margin-top:22px">Sales: sell prices by region</h2><p class="small muted">T1–T5 and retail, excl. and incl. VAT, and the market price. Never costs or uplifts.</p>' +
        '<div class="o-list"><table class="grid compact"><thead><tr><th>Person</th><th>Region</th><th>Note</th><th></th></tr></thead><tbody>' +
        (acc.length ? acc.map(function (a) { return '<tr><td>' + nm(a.email) + '</td><td>' + esc((regs.find(function (x) { return x.code === a.region; }) || {}).name || a.region) + '</td><td class="small">' + esc(a.note || '') + '</td><td><button type="button" class="btn small ghost" data-del="' + esc(a.email + '|' + a.region) + '">Remove</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="muted">Nobody yet.</td></tr>') +
        '</tbody></table></div>' +
        '<div class="o-group" style="margin-top:14px"><div class="o-group-title">Give someone access</div><div class="o-field"><label>Person</label><div class="o-val"><select id="acE">' +
        staff.filter(function (s) { return s.active && !s.sees_costs; }).map(function (s) { return '<option value="' + esc(s.email) + '">' + esc((s.full_name || s.email) + (s.team ? ' (' + s.team + ')' : '')) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="o-field"><label>Region</label><div class="o-val"><select id="acR">' + regs.map(function (x) { return '<option value="' + esc(x.code) + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="o-field"><label>Note</label><div class="o-val"><input id="acN" placeholder="optional"></div></div><div class="o-footer"><button type="button" class="btn" id="acAdd">Add</button></div></div>' +
        '<p class="small muted">Someone who isn\'t in the list needs an admin login first (ask the data team).</p></div>');
      $('acAdd').onclick = async function () {
        try { L.must(await sb.from('stravik_price_access').upsert({ email: $('acE').value, region: $('acR').value, note: $('acN').value.trim() || null })); L.toast('Saved'); access(); } catch (e) { L.fail(e); }
      };
      $('content').querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = async function () { var p = b.dataset.del.split('|'); try { L.must(await sb.from('stravik_price_access').delete().eq('email', p[0]).eq('region', p[1])); L.toast('Removed'); access(); } catch (e) { L.fail(e); } };
      });
    } catch (e) { L.fail(e); }
  }

  L.register({
    key: 'pricing', name: 'Pricing', color: '#8a5a1f',
    icon: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.6"/>',
    menus: [{ label: 'Price list', href: BASE }, { label: 'Upload', href: L.href('pricing', ['upload']), show: costs }, { label: 'History', href: L.href('pricing', ['history']), show: costs }, { label: 'Access', href: L.href('pricing', ['access']), show: costs }],
    route: function (r) {
      var p = r.parts[0];
      if (p === 'part') part(r); else if (p === 'upload') uploadPage(); else if (p === 'history') history(); else if (p === 'access') access(); else list(r);
    }
  });
})(window.LS);
