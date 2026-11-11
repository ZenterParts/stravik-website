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
  var S = L.state.pricing = { range: '', region: '', text: '', offset: 0, costs: false, key: '', data: null, moves: loadMoves(), cols: loadCols(), colOpen: false, allReg: false, allTier: 't1' };
  // the price moves a salesperson chose (region|Stravik PN -> move, e.g. -0.01), kept in this browser so they survive a reload
  // the list's columns: each person picks what to look at (kept in this browser). Tech info starts hidden:
  // the standard description already carries it.
  var COL_DEFAULT_HIDDEN = { 'Tech info': true };
  function loadCols() { try { return JSON.parse(localStorage.getItem('stravik.priceCols') || '{}') || {}; } catch (e) { return {}; } }
  function colHidden(label) { var h = S.cols[label]; return h == null ? !!COL_DEFAULT_HIDDEN[label] : h; }
  function colPick(cols, again) {
    var box = $('prCols'), opt = cols.filter(function (c) { return c.label !== 'Stravik PN'; });
    if (box) {
      var off = opt.filter(function (c) { return colHidden(c.label); }).length;
      box.innerHTML = '<details class="colpick"' + (S.colOpen ? ' open' : '') + '><summary>Columns' + (off ? ' <span class="muted">(' + off + ' hidden)</span>' : '') + '</summary><div class="colpick-menu">' +
        opt.map(function (c) { return '<label><input type="checkbox" data-col="' + esc(c.label) + '"' + (colHidden(c.label) ? '' : ' checked') + '> ' + esc(c.label) + '</label>'; }).join('') +
        '<button type="button" class="btn ghost small" id="pcReset">Default columns</button></div></details>';
      var d = box.querySelector('details');
      d.ontoggle = function () { S.colOpen = d.open; };
      box.onchange = function (e) { var i = e.target.closest('[data-col]'); if (!i) return; S.cols[i.dataset.col] = !i.checked; saveCols(); again(); };
      $('pcReset').onclick = function () { S.cols = {}; saveCols(); again(); };
    }
    return cols.filter(function (c) { return c.label === 'Stravik PN' || !colHidden(c.label); });
  }
  function saveCols() { try { localStorage.setItem('stravik.priceCols', JSON.stringify(S.cols)); } catch (e) { /* private mode */ } }
  function loadMoves() { try { return JSON.parse(localStorage.getItem('stravik.priceMoves') || '{}') || {}; } catch (e) { return {}; } }
  function saveMoves() { try { localStorage.setItem('stravik.priceMoves', JSON.stringify(S.moves)); } catch (e) { /* private mode: moves last until the page closes */ } }
  function getMove(pn, regCode) { var m = S.moves[(regCode || S.data.region.code) + '|' + pn]; return typeof m === 'number' && L.bandSteps(L.BAND).indexOf(m) >= 0 ? m : 0; }
  function setMove(pn, m) { var k = S.data.region.code + '|' + pn; if (m) S.moves[k] = m; else delete S.moves[k]; saveMoves(); }
  function hasMoves(regCode) { var p = regCode + '|'; return Object.keys(S.moves).some(function (k) { return k.indexOf(p) === 0; }); }
  // New (N) and remanufactured (R) parts of one Stravik PN are priced apart: the SKU is the Stravik PN + N or R
  function cnd(x) { return x && x.cond === 'R' ? 'R' : 'N'; }
  function mk(x) { return cnd(x) === 'R' ? x.sv_pn + 'R' : x.sv_pn; }   // key for moves and list cells: new parts keep the plain PN, so earlier moves stay
  function hasR(v) { return ((v || S.data || {}).rows || []).some(function (x) { return x.cond === 'R'; }); }
  function condName(x) { return cnd(x) === 'R' ? 'Reman' : 'New'; }
  function badge(x, on) { return on ? ' <span class="cond cond-' + cnd(x) + '" title="' + (cnd(x) === 'R' ? 'Remanufactured' : 'New') + '">' + cnd(x) + '</span>' : ''; }
  function pnCell(x) { return '<span class="pn">' + esc(x.sv_pn) + '</span>' + badge(x, hasR()); }
  function partHref(x, q) { q = Object.assign({ range: S.range }, q || {}); if (cnd(x) === 'R') q.cond = 'R'; return L.href('pricing', ['part', x.sv_pn], q); }
  function countTxt() {
    var a = S.data.rows || [], r = a.filter(function (x) { return x.cond === 'R'; }).length;
    return r ? a.length.toLocaleString() + ' prices (' + (a.length - r).toLocaleString() + ' new, ' + r.toLocaleString() + ' reman)' : a.length.toLocaleString() + ' parts priced';
  }
  // New + reman / New / Reman: only for a range that has reman prices
  function condBar(again) {
    var box = $('prCond'); if (!box) return;
    if (!hasR()) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<span class="chips">' + [['', 'New + reman'], ['N', 'New'], ['R', 'Reman']].map(function (c) { return '<button type="button" class="chip' + ((S.cond || '') === c[0] ? ' on' : '') + '" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('') +
      '</span><span class="small muted">N = new · R = remanufactured</span>';
    box.onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; S.cond = b.dataset.c; S.offset = 0; again(); };
  }
  var ME = null, meP = null;
  function me() {
    if (ME) return Promise.resolve(ME);
    return meP || (meP = Promise.all([sb.rpc('stravik_price_me'), sb.rpc('stravik_price_coverage').then(null, function () { return {}; })]).then(function (r) {
      ME = L.must(r[0]) || { sees_costs: false, regions: [], tiers: [], ranges: [] };
      if (ME.band) L.BAND = { lo: Number(ME.band.lo), hi: Number(ME.band.hi), step: Number(ME.band.step) };
      // which regions each range has prices for (Filters and Ignition Coils have no South Africa price, so South Africa is not offered there)
      ME.cover = null;
      if (r[1] && !r[1].error && Array.isArray(r[1].data)) { ME.cover = {}; r[1].data.forEach(function (c) { ME.cover[c.subcategory] = c.regions || {}; }); }
      meP = null; L.refreshNav(); return ME;
    }, function (e) { meP = null; throw e; }));
  }
  // the regions to offer for a range: only those with prices in it (all of them while a range has none yet, or if the counts could not be read)
  function regsFor(sub) {
    var all = ME.regions || [], c = ME.cover && ME.cover[sub];
    if (!c) return all;
    var has = all.filter(function (r) { return Number(c[r.code] || 0) > 0; });
    return has.length ? has : all;
  }
  var costs = function () { return !!(ME && ME.sees_costs); };
  var region = function () { var rs = regsFor(S.range); return rs.find(function (r) { return r.code === S.region; }) || rs[0] || ME.regions[0]; };
  var sym = function (cur) { return cur === 'ZAR' ? 'R' : cur === 'USD' ? '$' : cur + ' '; };
  var money = function (v, cur) { return v == null || v === '' ? '' : sym(cur) + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var r2 = function (v) { return v == null || v === '' ? null : Math.round(Number(v) * 100) / 100; };
  // incl. VAT from the price rounded to cents, as the website and the orders do (excl. + VAT add up on an invoice)
  var incl = function (v, vat) { return v == null ? null : Math.round(Math.round(Number(v) * 100) / 100 * (1 + vat) * 100) / 100; };
  var pct = function (v) { return v == null || v === '' ? '' : (Math.round(Number(v) * 10000) / 100) + '%'; };
  var dmy = function (d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  var TIER = [['t1', 'T1'], ['t2', 'T2'], ['t3', 'T3'], ['t4', 'T4'], ['t5', 'T5'], ['retail', 'Retail']];
  var single = function (reg) { return reg && reg.pricing === 'single'; };   // USD regions: one price for every customer (landed cost / (1 - margin))
  var USDREG = function () { return (ME.regions || []).filter(single); };
  var tierName = function (col) { var t = (ME.tiers || []).find(function (x) { return x.col === col; }); return t ? t.name : col.toUpperCase(); };
  function noAccess() {
    L.cp({ crumbs: [['Pricing']] });
    L.content(L.empty('No price access', 'Prices are shown to the sales team for the regions they serve and to the pricing team. Ask Arlin or the data team if you need access.'));
  }

  // ======================================================================== price list
  async function load() {
    var reg = region(), key = S.range + '|' + (S.allReg ? '*' : reg.code);
    if (S.data && S.key === key) return S.data;
    S.data = L.must(await (S.allReg ? sb.rpc('stravik_price_view_all', { p_sub: S.range }) : sb.rpc('stravik_price_view', { p_sub: S.range, p_region: reg.code }))); S.key = key;
    return S.data;
  }
  async function list(r) {
    try {
      await me();
      if (!ME.regions.length) return noAccess();
      if (r.q.range) { S.range = r.q.range; S.offset = 0; }
      if (r.q.region) { if (r.q.region === 'all') S.allReg = true; else { S.region = r.q.region; S.allReg = false; } S.offset = 0; }
      if (!S.range || !ME.ranges.some(function (x) { return x.subcategory === S.range; })) S.range = ME.ranges.length ? ME.ranges[0].subcategory : '';
      if (!S.region) S.region = ME.regions[0].code;
      if (!costs()) S.costs = false;
      var reg = region(), regs = regsFor(S.range);
      S.region = reg.code;
      if (regs.length < 2) S.allReg = false;   // "All regions" needs two or more
      L.cp({ crumbs: [['Pricing', BASE], [(S.allReg ? 'All regions' : reg.name) + ' · ' + (S.range || 'no price lists yet')]],
        buttons: (costs() ? '<button type="button" class="btn" id="prUp">Upload price list</button>' : '') + '<button type="button" class="btn ghost" id="prXls">Download</button>' + (ME.ranges.length > 1 ? '<button type="button" class="btn ghost" id="prXlsAll">Download all ranges</button>' : '') +
          (regs.length > 1 ? '<select id="prReg" style="width:auto"><option value="all"' + (S.allReg ? ' selected' : '') + '>All regions</option>' + regs.map(function (x) { return '<option value="' + esc(x.code) + '"' + (!S.allReg && x.code === reg.code ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '') +
          (costs() ? '<span class="chips" style="margin-left:6px"><button type="button" class="chip' + (S.costs ? '' : ' on') + '" data-v="0">Prices</button><button type="button" class="chip' + (S.costs ? ' on' : '') + '" data-v="1">Costing</button></span>' : '') });
      L.searchBar({ placeholder: 'Search Stravik PN, OE ref or description…', text: S.text, filters: [], onChange: function (s) { S.text = s.text; S.offset = 0; paint(); } });
      L.content('<div class="o-with-panel"><nav class="o-panel"><div class="o-panel-title">Range</div>' +
        (ME.ranges.length ? ME.ranges.map(function (x) { return '<a href="' + L.href('pricing', [], { range: x.subcategory }) + '" class="' + (x.subcategory === S.range ? 'on' : '') + '">' + esc(x.subcategory) + '</a>'; }).join('') : '<p class="small muted" style="padding:6px 14px">No price lists yet.</p>') +
        '</nav><div><div class="pr-tools"><div id="prCond" class="cond-bar" hidden></div><div id="prCols"></div></div><div id="prNote" class="small muted" style="margin:0 0 10px"></div><div id="prBand"></div><div id="prList"><p class="muted">Loading…</p></div></div></div>');
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
    var c = hasR() ? S.cond : '';
    return (S.data.rows || []).filter(function (x) {
      if (c && cnd(x) !== c) return false;
      if (!t) return true;
      if (L.clean(x.sv_pn + cnd(x)).indexOf(t) >= 0 || L.clean(x.oe_ref).indexOf(t) >= 0) return true;
      var d = String(x.short_desc || '').toLowerCase(); return words.every(function (w) { return d.indexOf(w) >= 0; });
    });
  }
  // the sell prices: from the costing row (pricing team) or the sales row
  function sell(x, col) { var px = S.data.region.prefix; return S.data.costs ? x[px + '_' + col] : x[col]; }
  function paint() {
    if (S.data.all) return paintAll();
    var reg = S.data.region, vat = Number(reg.vat), all = rows(), page = all.slice(S.offset, S.offset + L.PAGE), px = reg.prefix, cur = reg.currency;
    var eff = single(reg) ? null : (S.data.rows || []).map(function (x) { return S.data.costs ? x[px + '_effective'] : x.effective; }).filter(Boolean).sort().pop();
    $('prNote').innerHTML = esc(reg.name) + ' · ' + esc(S.range) + ' · ' + countTxt() + (eff ? ' · effective ' + esc(dmy(eff)) : '') + ' · prices in ' + esc(cur) +
      (single(reg) ? ' · one price for every customer in the region' + (S.costs ? ' · costing view (pricing team only)' : '') : S.costs ? ' · costing view (pricing team only)' : ' · first line excl. VAT, second line incl. ' + esc(pct(vat)) + ' VAT');
    condBar(paint);
    L.pager(S.offset, all.length, function (o) { S.offset = o; paint(); });
    if (!all.length) { $('prList').innerHTML = L.empty(S.text ? 'Nothing matches' : 'No prices in this range yet'); return; }
    // South Africa: the price excl. VAT; incl. VAT shows on hover
    var two = function (v) { return v == null ? '' : '<b class="vat" title="Incl. ' + esc(pct(vat)) + ' VAT: ' + esc(money(incl(v, vat), cur)) + '">' + esc(money(v, cur)) + '</b>'; };
    var cols = [{ label: 'Stravik PN', render: pnCell },
      { label: 'Description', cls: 'clip', render: function (x) { return esc(x.short_desc || ''); } }];
    if (single(reg)) {
      // USD regions: Stravik PN · OE ref · Standard description · Tech info · (costs) · FOB China · MOQ · Customer MOQ
      var n0 = function (v) { return v == null || v === '' ? '' : esc(String(v)); };
      cols = [cols[0],
        { label: 'OE ref', cls: 'clip', render: function (x) { return n0(x.oe_ref); } },
        { label: 'Standard description', cls: 'clip', render: function (x) { return n0(x.short_desc); } },
        { label: 'Tech info', cls: 'clip', render: function (x) { return x.tech_info ? '<span class="small">' + esc(x.tech_info) + '</span>' : ''; } }];
      if (S.costs) cols = cols.concat([
        { label: 'Cost FOB / EXW USD', num: true, render: function (x) { return esc(money(x.fob_usd, 'USD')) + '<div class="small muted">' + esc(x.price_basis || '') + '</div>'; } },
        { label: 'Landed USD', num: true, render: function (x) { return esc(money(x.cif_usd, 'USD')); } },
        { label: 'Margin', num: true, render: function (x) { return esc(pct(x[px + '_margin'])); } }]);
      cols = cols.concat([{ label: 'FOB China', num: true, render: function (x) { return '<b>' + esc(money(S.data.costs ? x[px + '_price'] : x.price, cur)) + '</b>'; } }])
        .concat(bandCols()).concat([
        { label: 'MOQ', num: true, render: function (x) { return n0(x.moq); } },
        { label: 'Customer MOQ', num: true, render: function (x) { return n0(x.customer_moq); } }]);
    } else if (S.costs) {
      cols = cols.concat([
        { label: 'FOB / EXW USD', num: true, render: function (x) { return esc(money(x.fob_usd, 'USD')) + '<div class="small muted">' + esc(x.price_basis || '') + '</div>'; } },
        { label: 'CIF USD', num: true, render: function (x) { return esc(money(x.cif_usd, 'USD')); } },
        { label: 'CIF ' + cur, num: true, render: function (x) { return esc(money(x[px + '_cif_zar'], cur)); } },
        { label: 'Landed', num: true, render: function (x) { return esc(money(x[px + '_landed'], cur)); } },
        { label: 'Gross sales', num: true, render: function (x) { return esc(money(x[px + '_gross'], cur)); } }
      ]).concat(TIER.map(function (t) {
        var up = t[0] === 'retail' ? px + '_retail_margin' : px + '_' + t[0] + '_uplift';
        return { label: t[1], num: true, render: function (x) { return '<b>' + esc(money(x[px + '_' + t[0]], cur)) + '</b><div class="small muted">+' + esc(pct(x[up])) + '</div>'; } };
      })).concat([{ label: 'Market', num: true, render: function (x) { return esc(x[px + '_market_price'] || ''); } }]).concat(bandCols());
    } else {
      cols = cols.concat(TIER.map(function (t) { return { label: t[1], num: true, render: function (x) { return two(sell(x, t[0])); } }; }))
        .concat([{ label: 'Market', num: true, render: function (x) { return esc((S.data.costs ? x[px + '_market_price'] : x.market_price) || ''); } }]).concat(bandCols());
    }
    cols = colPick(cols, paint);
    var cents = (S.data.rows || []).some(function (x) { var v = Number(sell(x, 'price')); return isFinite(v) && Math.abs(v * 10 - Math.round(v * 10)) > 1e-6; });
    $('prList').innerHTML = L.listView(cols, page, function (x) { return partHref(x); }) +
      (single(reg) ? '<p class="small muted" style="margin-top:8px">FOB China = landed cost ÷ (1 − margin), rounded to ' + (cents ? '0.01' : '0.1') + '.</p>' : '<p class="small muted" style="margin-top:8px">' + TIER.map(function (t) { return '<b>' + t[1] + '</b> ' + esc(tierName(t[0])); }).join(' · ') + '</p>');
    bandBar(all);
    $('prList').onchange = function (e) {
      var sel = e.target.closest('select[data-mv]'); if (!sel) return;
      var pn = sel.dataset.mv, x = (S.data.rows || []).find(function (y) { return mk(y) === pn; });
      setMove(pn, Number(sel.value)); if (x) bandCells(x); bandBar(rows());
    };
  }

  // ---------------------------------------------------------------- price band in the list
  // Move and Your price on every line, so the sales team can set prices without opening each part.
  // the band is for the USD regions (one price per region); South Africa sells on its tier prices and has no band
  function bandBase(x) { return r2(sell(x, 'price')); }
  function bandLanded(x) { if (!S.data.costs) return null; var v = x.cif_usd; return v == null ? null : Number(v); }
  function gpTxt(p, lc) { return p && lc != null ? (Math.round((p - lc) / p * 1000) / 10).toFixed(1) + '%' : ''; }
  function bandCols() {
    if (!single(S.data.region)) return [];
    var cur = S.data.region.currency, withGp = S.costs && S.data.costs;
    var c = [{ label: 'Move', render: function (x) {
        var b = bandBase(x), m = getMove(mk(x)); if (b == null) return '';
        return '<select class="move" data-mv="' + esc(mk(x)) + '" aria-label="Price move for ' + esc(mk(x)) + '" style="background:' + L.bandColor(m) + '">' +
          L.bandSteps(L.BAND).map(function (s) { return '<option value="' + s + '"' + (s === m ? ' selected' : '') + '>' + esc(L.bandPct(s)) + '</option>'; }).join('') + '</select>';
      } },
      { label: 'Your price', num: true, render: function (x) { return '<b data-yp="' + esc(mk(x)) + '">' + esc(money(L.bandPrice(bandBase(x), getMove(mk(x))), cur)) + '</b>'; } }];
    if (withGp) c.push({ label: 'GP', num: true, render: function (x) { return '<span data-gp="' + esc(mk(x)) + '">' + esc(gpTxt(L.bandPrice(bandBase(x), getMove(mk(x))), bandLanded(x))) + '</span>'; } });
    return c;
  }
  // update one line after its move changed (no full repaint, so the list keeps its scroll and focus)
  function bandCells(x) {
    var pn = mk(x), m = getMove(pn), p = L.bandPrice(bandBase(x), m), cur = S.data.region.currency, q = function (a) { return $('prList').querySelector('[' + a + '="' + CSS.escape(pn) + '"]'); };
    var sel = q('data-mv'), yp = q('data-yp'), gp = q('data-gp');
    if (sel) { sel.value = String(m); sel.style.background = L.bandColor(m); }
    if (yp) yp.textContent = money(p, cur);
    if (gp) gp.textContent = gpTxt(p, bandLanded(x));
  }
  // the bar above the list: move every part shown, clear (USD regions only)
  function bandBar(shown) {
    var reg = S.data.region, n = 0;
    if (!single(reg)) { $('prBand').innerHTML = ''; return; }
    (S.data.rows || []).forEach(function (x) { if (getMove(mk(x))) n++; });
    $('prBand').innerHTML = '<div class="inq-price"><b>Price band</b>' +
      '<span>Move every part shown (' + shown.length.toLocaleString() + ') to</span><select id="pbAllV" class="move">' + L.bandSteps(L.BAND).map(function (s) { return '<option value="' + s + '"' + (s === 0 ? ' selected' : '') + '>' + esc(L.bandPct(s)) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn ghost small" id="pbAll">Apply</button>' +
      (n ? '<button type="button" class="btn ghost small" id="pbClear">Clear all moves (' + n.toLocaleString() + ')</button>' : '') +
      '<span class="small muted">From ' + esc(L.bandPct(L.BAND.lo)) + ' to ' + esc(L.bandPct(L.BAND.hi)) + ' of the recommended price · your moves are kept in this browser and go into the Download</span></div>';
    $('pbAll').onclick = function () { var m = Number($('pbAllV').value); shown.forEach(function (x) { if (bandBase(x) != null) setMove(mk(x), m); }); paint(); L.toast(shown.length.toLocaleString() + ' parts moved to ' + L.bandPct(m)); };
    if ($('pbClear')) $('pbClear').onclick = function () { (S.data.rows || []).forEach(function (x) { setMove(mk(x), 0); }); paint(); L.toast('Moves cleared for ' + reg.name + ' · ' + S.range); };
  }

  // ---------------------------------------------------------------- All regions: one column per region
  var shortName = function (g) { return g.name.replace(/\s*\(.*\)$/, ''); };
  // the regions to show for a range: those it has prices for (from the coverage counts)
  function allRegs(v) {
    var cover = ME.cover && ME.cover[v.subcategory];
    var rs = (v.regions || []).filter(function (g) { return !cover || Number(cover[g.code] || 0) > 0; });
    return rs.length ? rs : (v.regions || []);
  }
  var allPrice = function (x, g, tier) { return (x.p || {})[g.pricing === 'single' ? g.code : g.code + '_' + (tier || S.allTier)]; };
  function paintAll() {
    var regs = allRegs(S.data), all = rows(), page = all.slice(S.offset, S.offset + L.PAGE), cv = S.costs && S.data.costs;
    var sa = regs.filter(function (g) { return g.pricing !== 'single'; });
    $('prNote').innerHTML = 'All regions · ' + esc(S.range) + ' · ' + countTxt() + ' · one column per region' +
      (sa.length ? ' · ' + esc(sa.map(shortName).join(', ')) + ' in ' + esc(sa[0].currency) + ' excl. VAT' : '') + ' · the price band is in each region\'s own list' + (cv ? ' · costing view (pricing team only)' : '');
    $('prBand').innerHTML = sa.length ? '<div class="inq-price"><b>' + esc(sa.map(shortName).join(', ')) + ' column</b><select id="pbAllTier">' + TIER.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === S.allTier ? ' selected' : '') + '>' + esc(tierName(t[0])) + '</option>'; }).join('') + '</select></div>' : '';
    if ($('pbAllTier')) $('pbAllTier').onchange = function () { S.allTier = this.value; paintAll(); };
    condBar(paintAll);
    L.pager(S.offset, all.length, function (o) { S.offset = o; paintAll(); });
    if (!all.length) { $('prList').innerHTML = L.empty(S.text ? 'Nothing matches' : 'No prices in this range yet'); return; }
    var n0 = function (v) { return v == null || v === '' ? '' : esc(String(v)); };
    var cols = [{ label: 'Stravik PN', render: pnCell },
      { label: 'Description', cls: 'clip', render: function (x) { return esc(x.short_desc || ''); } },
      { label: 'OE ref', cls: 'clip', render: function (x) { return n0(x.oe_ref); } }];
    if (cv) cols.push({ label: 'Cost FOB / EXW USD', num: true, render: function (x) { return esc(money(x.fob_usd, 'USD')) + '<div class="small muted">' + esc(x.price_basis || '') + '</div>'; } },
      { label: 'Landed USD', num: true, render: function (x) { return esc(money(x.cif_usd, 'USD')); } });
    regs.forEach(function (g) {
      cols.push({ label: shortName(g) + (g.pricing === 'single' ? '' : ' ' + S.allTier.toUpperCase()), num: true, render: function (x) {
        var v = allPrice(x, g), m = cv && g.pricing === 'single' ? (x.m || {})[g.code] : null;
        return v == null ? '' : '<b>' + esc(money(r2(v), g.currency)) + '</b>' + (m != null ? '<div class="small muted">' + esc(pct(m)) + '</div>' : '');
      } });
    });
    cols.push({ label: 'MOQ', num: true, render: function (x) { return n0(x.moq); } });
    cols = colPick(cols, paintAll);
    var usd = regs.filter(single);
    $('prList').innerHTML = L.listView(cols, page, function (x) {
      var g = usd.find(function (y) { return allPrice(x, y) != null; }) || regs[0];
      return partHref(x, { region: g ? g.code : '' });
    }) + '<p class="small muted" style="margin-top:8px">Open a part, or choose one region in the list above, to use the price band.</p>';
    $('prList').onchange = null;
  }
  // Excel: one row per part, the regions side by side (pricing team: with FOB, landed cost and each region's margin)
  function exportAllRegions(views) {
    views = views.filter(function (v) { return v && v.rows && v.rows.length; });
    if (!views.length) return [];
    var withCost = views.every(function (v) { return v.costs; }), regs = [];
    views.forEach(function (v) { allRegs(v).forEach(function (g) { if (!regs.some(function (y) { return y.code === g.code; })) regs.push(g); }); });
    var order = (views[0].regions || []).map(function (g) { return g.code; });
    regs.sort(function (a, b) { return order.indexOf(a.code) - order.indexOf(b.code); });
    var cc = views.some(hasR), head = ['Stravik PN'].concat(cc ? ['Condition'] : []).concat(['OE ref', 'Description', 'Range']), widths = [14].concat(cc ? [10] : []).concat([24, 46, 16]);
    if (withCost) { head.push('FOB / EXW USD', 'Basis', 'Landed USD'); widths.push(13, 7, 12); }
    regs.forEach(function (g) {
      if (g.pricing === 'single') { head.push(shortName(g) + ' USD'); widths.push(14); if (withCost) { head.push(shortName(g) + ' margin'); widths.push(10); } }
      else TIER.forEach(function (t) { head.push(shortName(g) + ' ' + tierName(t[0]) + ' ' + g.currency + ' excl. VAT'); widths.push(18); });
    });
    head.push('MOQ', 'Customer MOQ'); widths.push(8, 13);
    var e = function (y) { return y == null ? '' : y; }, out = [];
    views.forEach(function (v) { v.rows.forEach(function (x) {
      var o = [x.sv_pn].concat(cc ? [condName(x)] : []).concat([e(x.oe_ref), e(x.short_desc), v.subcategory]);
      if (withCost) o.push(e(r2(x.fob_usd)), e(x.price_basis), x.cif_usd == null ? '' : Math.round(x.cif_usd * 1e4) / 1e4);
      regs.forEach(function (g) {
        if (g.pricing === 'single') { o.push(e(r2(allPrice(x, g)))); if (withCost) { var m = (x.m || {})[g.code]; o.push(m == null ? '' : Number(m)); } }
        else TIER.forEach(function (t) { o.push(e(r2(allPrice(x, g, t[0])))); });
      });
      o.push(e(x.moq), e(x.customer_moq)); out.push(o);
    }); });
    return [{ name: 'All regions', head: head, widths: widths, rows: out,
      top: [['All regions · ' + views.map(function (v) { return v.subcategory; }).join(', ') + ' · USD regions in USD, ' + regs.filter(function (g) { return g.pricing !== 'single'; }).map(function (g) { return shortName(g) + ' in ' + g.currency + ' excl. VAT'; }).join(', ')]] }];
  }

  // one part: the price band for everyone with access to the region, and the full costing for the pricing team
  async function part(r) {
    try {
      await me();
      if (!ME.regions.length) return noAccess();
      if (r.q.range) S.range = r.q.range;
      if (r.q.region) S.region = r.q.region;
      if (!S.region) S.region = ME.regions[0].code;
      S.region = region().code;
      var wasAll = S.allReg; S.allReg = false;   // a part page is always one region; the list keeps "All regions"
      try { await load(); } finally { S.allReg = wasAll; }
      var pn = r.parts[1], cond = r.q.cond === 'R' ? 'R' : 'N', both = hasR(), reg = S.data.region;
      var x = (S.data.rows || []).find(function (y) { return y.sv_pn === pn && cnd(y) === cond; });
      var other = (S.data.rows || []).find(function (y) { return y.sv_pn === pn && cnd(y) !== cond; });
      var sa = (ME.regions || []).find(function (g) { return g.code === 'south_africa'; }) || { prefix: 'sa', currency: 'ZAR', vat: 0.15 }, px = sa.prefix, cur = sa.currency, vat = Number(sa.vat);
      var crumbs = [['Pricing', BASE], [S.range, L.href('pricing', [], { range: S.range })], [pn + (both || cond === 'R' ? ' ' + cond : '')]];
      if (!x) { L.cp({ crumbs: crumbs }); return L.content(L.empty('No ' + (cond === 'R' ? 'reman ' : '') + 'price for ' + pn, 'This part is not in the ' + S.range + ' price list' + (cond === 'R' ? ' as reman' : '') + '.')); }
      var otherBtn = other ? '<a class="btn ghost" href="' + partHref(other) + '">' + (cnd(other) === 'R' ? 'Reman price' : 'New price') + '</a>' : '';
      var head = '<div class="o-title"><h1>' + esc(pn) + badge(x, both) + '</h1>' + (both ? '<span class="muted">' + (cond === 'R' ? 'Remanufactured' : 'New') + '</span>' : '') + '</div><div class="o-subtitle">' + esc(x.short_desc || '') + '</div>';
      if (!S.data.costs) {
        var n0 = function (v) { return v == null || v === '' ? '' : esc(String(v)); };
        L.form({ crumbs: crumbs, buttons: otherBtn + '<button type="button" class="btn ghost" id="pcPart">Open the part</button>',
          sheet: head + bandHtml() + '<div class="o-groups">' + L.group(single(reg) ? 'Part' : 'Prices (' + reg.currency + ', excl. VAT)', single(reg) ? [['OE ref', n0(x.oe_ref)], ['Tech info', n0(x.tech_info)], ['MOQ', n0(x.moq)], ['Customer MOQ', n0(x.customer_moq)]]
            : TIER.map(function (t) { var v = x[t[0]]; return [tierName(t[0]), v == null ? '' : '<b class="vat" title="Incl. ' + esc(pct(Number(reg.vat))) + ' VAT: ' + esc(money(incl(v, Number(reg.vat)), reg.currency)) + '">' + esc(money(v, reg.currency)) + '</b>']; })
              .concat([['Market price', n0(x.market_price)], ['Effective', esc(dmy(x.effective))]])) + '</div>' });
        bandMount(x, pn);
        $('pcPart').onclick = function () { L.openPart(pn); };
        return;
      }
      var hist = L.must(await sb.from('stravik_price_history').select('at,by_email,action,changes,source,cond').eq('sv_pn', pn).or(cond === 'R' ? 'cond.eq.R' : 'cond.is.null,cond.eq.N').order('at', { ascending: false }).limit(30));
      var line = function (label, pctKey, valKey, valCur) { return [label, (pctKey ? '<span class="muted">' + esc(pct(x[pctKey])) + '</span> ' : '') + (valKey ? '<b>' + esc(money(x[valKey], valCur)) + '</b>' : '')]; };
      L.form({ crumbs: crumbs, buttons: otherBtn + '<button type="button" class="btn ghost" id="pcPart">Open the part</button>',
        sheet: head + bandHtml() +
          '<div class="o-groups">' +
          L.group('Supplier and Zenter Parts costs (USD)', [[(x.price_basis || 'FOB') + ' price', '<b>' + esc(money(x.fob_usd, 'USD')) + '</b>' + (x.fob_port ? ' <span class="muted">' + esc(x.fob_port) + '</span>' : '')],
            line('Consolidation', 'c_cons'), line('Finance', 'c_finance'), line('Customer rebate / discount', 'c_customer_rebate'), line('Shipping', 'c_ship'), line('Insurance', 'c_ins'),
            line('Warehousing', 'c_whs'), line('Warranty', 'c_warr'), line('Marketing', 'c_mar'), line('Royalty', 'c_roy'), line('ZP margin', 'zp_mar'), line('CIF Zenter Parts / landed cost', null, 'cif_usd', 'USD'),
            ['MOQ', esc(x.moq == null ? '' : String(x.moq))], ['Customer MOQ', esc(x.customer_moq == null ? '' : String(x.customer_moq))], ['Price source', esc(x.price_source || '')], ['Remarks', esc(x.remarks || '')]]) +
          (USDREG().some(function (g) { return x[g.prefix + '_price'] != null; }) ? L.group('USD regions (one price per region)', USDREG().map(function (g) {
            return [g.name, '<span class="muted">' + esc(pct(x[g.prefix + '_margin'])) + '</span> <b>' + esc(money(x[g.prefix + '_price'], 'USD')) + '</b>'];
          })) : '') +
          (x.sa_t1 == null && single(reg) ? '' : L.group('South Africa (ZAR, excl. VAT)', [['Exchange rate', esc(String(x[px + '_fx_rate'] || '')) + ' + ' + esc(pct(x[px + '_fx_buffer'])) + ' buffer = <b>' + esc(x[px + '_exchange'] == null ? '' : String(Math.round(x[px + '_exchange'] * 10000) / 10000)) + '</b>'],
            line('CIF ' + cur, null, px + '_cif_zar', cur), line('Clearance', px + '_clearance'), line('Duties', px + '_duties'), line('Ancillary fluctuations', px + '_ancillary'), line('Finance', px + '_finance'),
            line('Excise', px + '_excise'), line('Anti-dumping', px + '_anti_dumping'), line('DPW margin', px + '_dpw_margin'), line('Landed cost', null, px + '_landed', cur),
            line('Distribution', px + '_c_dist'), line('COD discount', px + '_c_cod'), line('Gross sales', null, px + '_gross', cur)]) +
          L.group('Sell prices (' + cur + ')', TIER.map(function (t) {
            var up = t[0] === 'retail' ? px + '_retail_margin' : px + '_' + t[0] + '_uplift', v = x[px + '_' + t[0]];
            return [tierName(t[0]), '<span class="muted">+' + esc(pct(x[up])) + '</span> <b class="vat" title="Incl. ' + esc(pct(vat)) + ' VAT: ' + esc(money(incl(v, vat), cur)) + '">' + esc(money(v, cur)) + '</b>'];
          }).concat([['Market price', esc(x[px + '_market_price'] || '')], ['Effective', esc(dmy(x[px + '_effective']))], ['Source', esc(x[px + '_source'] || '')]]))) +
          L.group('', [['Last change', esc(L.dt(x.updated_at)) + ' · ' + esc(x.updated_by || '')]]) +
          '</div>' +
          '<h3 style="margin-top:22px">History</h3>' + historyTable(hist, false)
      });
      bandMount(x, pn);
      $('pcPart').onclick = function () { L.openPart(pn); };
    } catch (e) { L.fail(e); }
  }

  // ---------------------------------------------------------------- price band
  // The recommended price in the region, moved from the band's lowest to highest step (−2% to +2% in 0.5% steps).
  // The sales team sees prices only; the pricing team also sees landed cost, GP margin and gross profit.
  function bandHtml() { return '<div class="band" id="pbBand"></div>'; }
  function bandMount(x, pn) {
    var reg = S.data.region, cur = reg.currency, withCost = !!S.data.costs;
    var key = mk(x), st = { move: getMove(key), qty: Number(x.customer_moq || x.moq) || 1 }, regs = regsFor(S.range), steps = L.bandSteps(L.BAND), box = $('pbBand');
    var regSel = regs.length > 1 ? '<select id="bReg">' + regs.map(function (g) { return '<option value="' + esc(g.code) + '"' + (g.code === reg.code ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>' : '<span class="muted">' + esc(reg.name) + '</span>';
    var onReg = function () { if ($('bReg')) $('bReg').onchange = function () { L.go(partHref(x, { region: this.value })); }; };
    if (!single(reg)) {   // South Africa: tier prices, no band (only the region picker, when the range has USD regions too)
      if (regs.length < 2) { box.remove(); return; }
      box.innerHTML = '<div class="band-head"><h2>Price band</h2>' + regSel + '<span class="small muted">' + esc(reg.name) + ' sells on its tier prices, so there is no price band. Choose a USD region to use the band.</span></div>';
      onReg(); return;
    }
    var base = function () { return r2(sell(x, 'price')); };
    var landed = function () { var v = withCost ? x.cif_usd : null; return v == null ? null : Number(v); };
    var m2 = function (v) { return v == null ? '–' : money(v, cur); };
    var sum = [['Recommended price', 'bRec'], ['Lowest price', 'bLo'], ['Highest price', 'bHi'], ['Qty (units)', 'bQty'], ['Selected move', 'bMove'], ['Selected price', 'bPrice']]
      .concat(withCost ? [['GP margin', 'bGp'], ['Gross profit', 'bGpv']] : []).concat([['Revenue', 'bRev'], ['Status', 'bStatus']]);
    if (withCost) sum.unshift(['Landed cost', 'bLanded']);
    box.innerHTML = '<div class="band-head"><h2>Price band</h2>' + regSel +
      '<span class="small muted">' + esc(cur) + ' · move the price from ' + esc(L.bandPct(L.BAND.lo)) + ' to ' + esc(L.bandPct(L.BAND.hi)) + '</span></div>' +
      '<div class="o-list"><table class="grid band-sum"><thead><tr>' + sum.map(function (c) { return '<th class="num">' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
      sum.map(function (c) { return '<td class="num" id="' + c[1] + '">' + (c[1] === 'bQty' ? '<input id="bQtyIn" type="number" min="1" step="1" value="' + st.qty + '">' : '') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<div class="band-steps" id="bSteps" role="radiogroup" aria-label="Price move">' + steps.map(function (m) {
        return '<button type="button" role="radio" data-m="' + m + '" style="background:' + L.bandColor(m) + '"><span class="band-pct">' + esc(L.bandPct(m)) + '</span><span class="band-px" data-px></span></button>';
      }).join('') + '</div><div id="bNone" class="small flag" hidden></div>';
    function draw() {
      var b = base(), p = L.bandPrice(b, st.move), lc = landed(), q = st.qty, set = function (id, h) { var e = $(id); if (e) e.innerHTML = h; };
      $('bNone').hidden = b != null; $('bNone').textContent = b == null ? 'No price for ' + pn + ' in ' + reg.name + '.' : '';
      set('bLanded', esc(lc == null ? '–' : money(Math.round(lc * 1000) / 1000, cur)));
      set('bRec', '<b>' + esc(m2(b)) + '</b>'); set('bLo', esc(m2(L.bandPrice(b, L.BAND.lo)))); set('bHi', esc(m2(L.bandPrice(b, L.BAND.hi))));
      set('bMove', '<b>' + esc(L.bandPct(st.move)) + '</b>');
      set('bPrice', '<b>' + esc(m2(p)) + '</b>');
      set('bRev', esc(p == null ? '–' : money(p * q, cur)));
      if (withCost) {
        set('bGp', esc(p && lc != null ? (Math.round((p - lc) / p * 1000) / 10).toFixed(1) + '%' : '–'));
        set('bGpv', esc(p != null && lc != null ? money((p - lc) * q, cur) : '–'));
      }
      set('bStatus', esc(b == null ? '' : L.bandStatus(st.move)));
      $('bSteps').querySelectorAll('[data-m]').forEach(function (e) {
        var m = Number(e.dataset.m), on = m === st.move;
        e.classList.toggle('on', on); e.setAttribute('aria-checked', on ? 'true' : 'false'); e.tabIndex = on ? 0 : -1;
        e.querySelector('[data-px]').textContent = b == null ? '' : money(L.bandPrice(b, m), cur);
      });
    }
    $('bSteps').onclick = function (e) { var t = e.target.closest('[data-m]'); if (t) { st.move = Number(t.dataset.m); setMove(key, st.move); draw(); t.focus(); } };
    $('bSteps').onkeydown = function (e) {
      var i = steps.indexOf(st.move), j = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? i - 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? i + 1 : -2;
      if (j === -2 || j < 0 || j >= steps.length) return;
      e.preventDefault(); st.move = steps[j]; setMove(key, st.move); draw(); $('bSteps').querySelector('[data-m="' + st.move + '"]').focus();
    };
    $('bQtyIn').oninput = function () { var v = Math.floor(Number(this.value)); st.qty = v > 0 ? v : 0; draw(); };
    onReg();
    draw();
  }

  // ======================================================================== Excel download (what the person may see)
  // Sheets for a download: "Prices" (every tier, excl. and incl. VAT) and, for the pricing team, "Costing" (the whole build-up).
  // views = stravik_price_view results (one per range); keep(row) filters the rows.
  function exportSheets(views, keep) {
    views = views.filter(function (v) { return v && v.rows; });
    if (!views.length) return [];
    var reg = views[0].region, px = reg.prefix, cur = reg.currency, vat = Number(reg.vat), withCost = views.every(function (v) { return v.costs; });
    if (single(reg)) return exportSingle(views, keep, withCost);
    var sell_ = function (v, x, col) { return v.costs ? x[px + '_' + col] : x[col]; };
    var cc = views.some(hasR), head = ['Stravik PN'].concat(cc ? ['Condition'] : []).concat(['Description', 'Range']), widths = [14].concat(cc ? [10] : []).concat([46, 16]);
    TIER.forEach(function (t) { head.push(tierName(t[0]) + ' ' + cur + ' excl. VAT', tierName(t[0]) + ' ' + cur + ' incl. VAT'); widths.push(16, 16); });
    head.push('Market price', 'Effective'); widths.push(16, 12);
    var all = [];
    views.forEach(function (v) { v.rows.forEach(function (x) { if (!keep || keep(x, v)) all.push([v, x]); }); });
    var sheets = [{ name: 'Prices', head: head, widths: widths, top: [[reg.name + ' · ' + views.map(function (v) { return v.subcategory; }).join(', ') + ' · ' + cur + ' · excl. VAT and incl. ' + pct(vat) + ' VAT']],
      rows: all.map(function (p) {
        var v = p[0], x = p[1], o = [x.sv_pn].concat(cc ? [condName(x)] : []).concat([x.short_desc || '', v.subcategory]);
        TIER.forEach(function (t) { var y = sell_(v, x, t[0]); o.push(r2(y), incl(y, vat)); });
        o.push((v.costs ? x[px + '_market_price'] : x.market_price) || '', (v.costs ? x[px + '_effective'] : x.effective) || '');
        return o;
      }) }];
    if (withCost) {
      var C = [['sv_pn', 'Stravik PN']].concat(cc ? [['_cond', 'Condition']] : []).concat([['_range', 'Range']]).concat([['price_basis', 'Basis'], ['fob_port', 'FOB port'], ['fob_usd', 'FOB / EXW USD'], ['c_cons', 'C_CONS'], ['c_finance', 'C_FINANCE'], ['c_customer_rebate', 'C_CUSTOMER REBATE'], ['c_ship', 'C_SHIP'], ['c_ins', 'C_INS'],
        ['c_whs', 'C_WHS'], ['c_warr', 'C_WARR'], ['c_mar', 'C_MAR'], ['c_roy', 'C_ROY'], ['zp_mar', 'ZP MAR'], ['cif_usd', 'CIF ZENTER PARTS'], [px + '_fx_rate', 'USD → ' + cur + ' rate'], [px + '_fx_buffer', 'FX buffer'], [px + '_exchange', 'EXCHANGE ' + cur],
        [px + '_cif_zar', 'CIF ZENTER PARTS ' + cur], [px + '_clearance', 'CLEARANCE'], [px + '_duties', 'DUTIES'], [px + '_ancillary', 'ANCILIARY FLUCTUATIONS'], [px + '_finance', 'FINANCE'], [px + '_excise', 'EXCISE'], [px + '_anti_dumping', 'ANTI DUMPING'],
        [px + '_dpw_margin', 'DPW MARGIN'], [px + '_landed', 'LANDED COST DPW'], [px + '_c_dist', 'C_DIST'], [px + '_c_cod', 'C_COD DISCOUNT'], [px + '_gross', 'GROSS SALES'],
        [px + '_t1_uplift', 'T1 UPLIFT'], [px + '_t1', 'T1 DISTRIBUTOR/WHOLESALER'], [px + '_t2_uplift', 'T2 CHAIN UPLIFT'], [px + '_t2', 'T2 CHAIN PRICES'], [px + '_t3_uplift', 'T3 UPLIFT BIG RETAILERS'], [px + '_t3', 'BIG RETAILERS'],
        [px + '_t4_uplift', 'T4 UPLIFT TO MEDIUM RETAILERS'], [px + '_t4', 'T4 MEDIUM RETAILERS'], [px + '_t5_uplift', 'T5 UPLIFT TO SMALL RETAILERS'], [px + '_t5', 'T5 SMALL RETAILERS'], [px + '_retail_margin', 'SALES MARGIN RETAIL PRICE'], [px + '_retail', 'RETAIL PRICE'],
        [px + '_market_price', 'MARKET PRICE ' + cur], ['remarks', 'REMARKS'], [px + '_effective', 'Effective'], [px + '_source', 'Source']]);
      sheets.push({ name: 'Costing', head: C.map(function (c) { return c[1]; }), rows: all.map(function (p) {
        return C.map(function (c) { var y = c[0] === '_range' ? p[0].subcategory : c[0] === '_cond' ? condName(p[1]) : p[1][c[0]]; return y == null ? '' : typeof y === 'number' ? Math.round(y * 1e6) / 1e6 : y; });
      }) });
    }
    return sheets;
  }
  // USD region download: one price per part; for the pricing team also the cost build-up and every USD region
  function exportSingle(views, keep, withCost) {
    var reg = views[0].region, px = reg.prefix, all = [];
    views.forEach(function (v) { v.rows.forEach(function (x) { if (!keep || keep(x, v)) all.push([v, x]); }); });
    var mv = hasMoves(reg.code), cc = views.some(hasR);   // the salesperson's moves: Move and Your price columns
    var sheets = [{ name: 'Prices', head: ['Stravik PN'].concat(cc ? ['Condition'] : []).concat(['OE ref', 'Standard description', 'Tech info', 'Range', 'FOB China USD']).concat(mv ? ['Move', 'Your price USD'] : []).concat(['MOQ', 'Customer MOQ']), widths: [14].concat(cc ? [10] : []).concat([28, 46, 40, 16, 14]).concat(mv ? [8, 14] : []).concat([8, 13]),
      top: [[reg.name + ' · ' + views.map(function (v) { return v.subcategory; }).join(', ') + ' · USD · one price for every customer']],
      rows: all.map(function (p) { var v = p[0], x = p[1], e = function (y) { return y == null ? '' : y; }, base = r2(v.costs ? x[px + '_price'] : x.price), m = getMove(mk(x), reg.code);
        return [x.sv_pn].concat(cc ? [condName(x)] : []).concat([e(x.oe_ref), e(x.short_desc), e(x.tech_info), v.subcategory, base]).concat(mv ? [base == null ? '' : L.bandPct(m), e(L.bandPrice(base, m))] : []).concat([e(x.moq), e(x.customer_moq)]); }) }];
    if (withCost) {
      var C = [['sv_pn', 'Stravik PN']].concat(cc ? [['_cond', 'CONDITION']] : []).concat([['_range', 'Range'], ['price_basis', 'Basis'], ['fob_usd', 'FOB / EXW USD'], ['c_cons', 'C_CONS'], ['c_finance', 'C_FINANCE'], ['c_customer_rebate', 'C_CUSTOMER DISCOUNT'], ['c_ship', 'C_SHIP'], ['c_ins', 'C_INS'],
        ['c_whs', 'C_WHS'], ['c_warr', 'C_WARR'], ['c_mar', 'C_MAR'], ['c_roy', 'C_ROY'], ['zp_mar', 'ZP MAR'], ['cif_usd', 'LANDED COST USD'], ['moq', 'MOQ'], ['customer_moq', 'CUSTOMER MOQ']]);
      USDREG().forEach(function (g) { C.push([g.prefix + '_margin', 'MARGIN ' + g.name.toUpperCase()], [g.prefix + '_price', 'PRICE ' + g.name.toUpperCase()]); });
      C.push(['price_source', 'PRICE SOURCE'], ['remarks', 'REMARKS']);
      sheets.push({ name: 'Costing', head: C.map(function (c) { return c[1]; }), rows: all.map(function (p) {
        return C.map(function (c) { var y = c[0] === '_range' ? p[0].subcategory : c[0] === '_cond' ? condName(p[1]) : p[1][c[0]]; return y == null ? '' : typeof y === 'number' ? Math.round(y * 1e6) / 1e6 : y; });
      }) });
    }
    return sheets;
  }
  // ---- The pricing team's download: one sheet per range in the costing sheet's own layout (title rows, exchange rate,
  // COSTING BUILD-UP + PRICE PER UNIT, the same headings and live formulas), so it can be edited and uploaded again.
  var COLS = [   // [key, heading, kind]   kind: id | text | usd | pct | rate | zar | f_* (formula)
    ['sv_pn', 'STRAVIK PART NUMBER', 'id'], ['short_desc', 'DESCRIPTION', 'id'],
    ['fob_port', 'FOB PORT', 'text'], ['fob_usd', 'FOB PRICE (USD/PC)', 'usd'], ['remarks', 'REMARKS', 'text'],
    ['c_cons', 'C_CONS', 'pct'], ['c_finance', 'C_FINANCE', 'pct'], ['c_customer_rebate', 'C_CUSTOMER REBATE', 'pct'], ['c_ship', 'C_SHIP', 'pct'], ['c_ins', 'C_INS', 'pct'],
    ['c_whs', 'C_WHS', 'pct'], ['c_warr', 'C_WARR', 'pct'], ['c_mar', 'C_MAR', 'pct'], ['c_roy', 'C_ROY', 'pct'], ['zp_mar', 'ZP MAR', 'pct'],
    ['cif_usd', 'CIF ZENTER PARTS', 'f_usd'], ['_exchange', 'EXCHANGE ZAR', 'f_rate'], ['_cif_zar', 'CIF ZENTER PARTS ZAR', 'f_zar'],
    ['_clearance', 'CLEARANCE', 'pct'], ['_duties', 'DUTIES', 'pct'], ['_ancillary', 'ANCILIARY FLUCTUATIONS', 'pct'], ['_finance', 'FINANCE', 'pct'], ['_excise', 'EXCISE', 'pct'],
    ['_anti_dumping', 'ANTI DUMPING', 'pct'], ['_dpw_margin', 'DPW MARGIN', 'pct'], ['_landed', 'LANDED COST DPW', 'f_zar'], ['_c_dist', 'C_DIST', 'pct'], ['_c_cod', 'C_COD DISCOUNT', 'pct'], ['_gross', 'GROSS SALES', 'f_zar'],
    ['_t1_uplift', 'T1 DISTRIBUTOR/WHOLESALER', 'pct'], ['_t1', 'T1 DISTRIBUTOR/ WHOLESALER', 'f_zar'], ['_t2_uplift', 'T2 CHAIN UPLIFT', 'pct'], ['_t2', 'T2 CHAIN PRICES', 'f_zar'],
    ['_t3_uplift', 'T3 UPLIFT BIG RETAILERS', 'pct'], ['_t3', 'BIG RETAILERS', 'f_zar'], ['_t4_uplift', 'T4 UPLIFT TO MEDIUM RETAILERS', 'pct'], ['_t4', 'T4 MEDIUM RETAILERS', 'f_zar'],
    ['_t5_uplift', 'T5 UPLIFT TO SMALL RETAILERS', 'pct'], ['_t5', 'T5 SMALL RETAILERS', 'f_zar'], ['_retail_margin', 'SALES MARGIN RETAIL PRICE', 'pct'], ['_retail', 'RETAIL PRICE', 'f_zar'],
    ['_market_price', 'MARKET PRICE ZAR', 'text'], ['_check', 'PRICE CHECK', 'f_text']];
  async function costingXlsx(views, keep, opts, name) {
    opts = opts || {};
    var X = await L.loadExcel(), wb = new X.Workbook(), logo = null;
    try { var lr = await fetch('/admin/img/stravik-excel-logo.png'); if (lr.ok) logo = wb.addImage({ buffer: new Uint8Array(await lr.arrayBuffer()), extension: 'png' }); } catch (e) { /* no logo */ }
    wb.creator = 'Stravik';
    var NAVY = 'FF0B203D', GOLD = 'FF8A6326', GREY = 'FF5B6475', TINT = 'FFF5ECDD', font = { name: 'Arial', size: 10, color: { argb: 'FF1B2430' } };
    var L_ = function (n) { var t = ''; n++; while (n > 0) { var m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };   // 0-based index -> column letter
    var col = {}; COLS.forEach(function (c, i) { col[c[0]] = L_(i); });
    var FMT = { usd: '"$"#,##0.00', f_usd: '"$"#,##0.00', zar: '"R" #,##0.00', f_zar: '"R" #,##0.00', pct: '0.00%', rate: '0.000', f_rate: '0.000' };
    var HL = opts.highlight ? col['_' + opts.highlight] : null;
    views.forEach(function (v) {
      var reg = v.region, px = reg.prefix, vat = Number(reg.vat), rows = v.rows.filter(function (x) { return !keep || keep(x, v); });
      if (!rows.length) return;
      var ws = wb.addWorksheet(String(v.subcategory).slice(0, 31), { properties: { defaultRowHeight: 15 }, views: [{ state: 'frozen', xSplit: 1, ySplit: 11, showGridLines: false }] });
      var val = function (x, k) { return k.charAt(0) === '_' ? x[px + k] : x[k]; };
      var basis = rows.some(function (x) { return x.price_basis === 'EXW'; }) && !rows.some(function (x) { return x.price_basis === 'FOB'; }) ? 'EXW' : 'FOB';
      var head = COLS.map(function (c) { return c[0] === 'fob_usd' && basis === 'EXW' ? 'C_EXW/USD' : c[1]; });
      COLS.forEach(function (c, i) { var w = c[2] === 'id' ? (c[0] === 'short_desc' ? 46 : 18) : c[2] === 'text' ? 16 : c[1].length > 18 ? 16 : 13; ws.getColumn(i + 1).width = w; ws.getColumn(i + 1).font = font; });
      // title block (as in the costing sheets)
      var first = rows[0], eff = rows.map(function (x) { return val(x, '_effective'); }).filter(Boolean).sort().pop();
      var effTxt = eff ? new Date(eff + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      for (var r = 1; r <= 9; r++) ws.getRow(r).height = r <= 4 ? 21 : 18;
      if (logo != null) ws.addImage(logo, { tl: { col: 0.1, row: 0.3 }, ext: { width: 320, height: 71 }, editAs: 'absolute' });
      var put = function (addr, v_, f, fill) { var c = ws.getCell(addr); c.value = v_; if (f) c.font = Object.assign({ name: 'Arial', size: 10 }, f); if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; return c; };
      put(col.fob_port + '2', 'PRICE LIST · ' + String(reg.name).toUpperCase(), { bold: true, size: 13, color: { argb: GOLD } });
      if (effTxt) put(col.fob_port + '3', 'Effective ' + effTxt, { color: { argb: GREY } });
      put(col.fob_port + '4', 'All prices in ' + (reg.currency === 'ZAR' ? 'South African Rand (ZAR)' : reg.currency) + ', per unit, excl. VAT', { color: { argb: GREY } });
      put('B7', v.subcategory, { bold: true, size: 13, color: { argb: NAVY } });
      if (opts.note) put('B8', opts.note, { bold: true, color: { argb: GOLD } });
      var RL = col.cif_usd, RV = col._exchange;
      put(RL + '7', 'USD → ZAR rate', { bold: true, color: { argb: GOLD } }); put(RV + '7', Number(val(first, '_fx_rate')) || null, { bold: true, color: { argb: NAVY } }, TINT);
      put(RL + '8', 'FX buffer', { bold: true, color: { argb: GOLD } }); put(RV + '8', Number(val(first, '_fx_buffer')) || 0, { bold: true, color: { argb: NAVY } }, TINT).numFmt = '0.00%';
      put(RL + '9', 'VAT (for the price check)', { bold: true, color: { argb: GOLD } }); put(RV + '9', vat, { bold: true, color: { argb: NAVY } }, TINT).numFmt = '0%';
      // section row 10 and headings row 11
      var cs = COLS.findIndex(function (c) { return c[0] === 'fob_port'; }), ce = COLS.findIndex(function (c) { return c[0] === '_gross'; }), ps = ce + 1, pe = COLS.length - 1;
      ws.mergeCells(10, cs + 1, 10, ce + 1); ws.mergeCells(10, ps + 1, 10, pe + 1);
      put(L_(cs) + '10', 'COSTING BUILD-UP', { bold: true, color: { argb: 'FFFFFFFF' } }, GREY).alignment = { horizontal: 'center' };
      put(L_(ps) + '10', 'PRICE PER UNIT (' + reg.currency + ')', { bold: true, color: { argb: 'FFFFFFFF' } }, GOLD).alignment = { horizontal: 'center' };
      var hr = ws.getRow(11); hr.height = 30;
      head.forEach(function (h, i) {
        var c = hr.getCell(i + 1), k = COLS[i][0], fill = i < cs ? NAVY : i <= ce ? GREY : k === '_retail' ? 'FFD3A864' : GOLD;
        if (HL && L_(i) === HL) fill = NAVY;
        c.value = h; c.font = { name: 'Arial', size: 10, bold: true, color: { argb: k === '_retail' && !(HL && L_(i) === HL) ? NAVY : 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; c.alignment = { vertical: 'middle', wrapText: true };
      });
      // data with live formulas (and their values, so the file shows numbers before Excel recalculates)
      rows.forEach(function (x, n) {
        var rn = 12 + n, R = ws.getRow(rn), a = function (k) { return col[k] + rn; };
        var sum = function (base, keys) { return base + keys.map(function (k) { return '+(' + base + '*' + a(k) + ')'; }).join(''); };
        COLS.forEach(function (c, i) {
          var k = c[0], cell = R.getCell(i + 1), y = k === '_check' ? null : k === 'sv_pn' ? mk(x) : val(x, k), f = null;
          if (k === 'cif_usd') f = sum(a('fob_usd'), ['c_cons', 'c_finance', 'c_customer_rebate', 'c_ship', 'c_ins', 'c_whs', 'c_warr', 'c_mar', 'c_roy', 'zp_mar']);
          else if (k === '_exchange') f = '$' + RV + '$7+($' + RV + '$7*$' + RV + '$8)';
          else if (k === '_cif_zar') f = a('cif_usd') + '*' + a('_exchange');
          else if (k === '_landed') f = sum(a('_cif_zar'), ['_clearance', '_duties', '_ancillary', '_finance', '_excise', '_anti_dumping', '_dpw_margin']);
          else if (k === '_gross') f = sum(a('_landed'), ['_c_dist', '_c_cod']);
          else if (/^_t\d$|^_retail$/.test(k)) { var prev = { _t1: '_gross', _t2: '_t1', _t3: '_t2', _t4: '_t3', _t5: '_t4', _retail: '_t5' }[k], up = k === '_retail' ? '_retail_margin' : k + '_uplift'; f = a(prev) + '+(' + a(prev) + '*' + a(up) + ')'; }
          else if (k === '_check') {
            var mk = a('_market_price'), lo = 'VALUE(TRIM(SUBSTITUTE(SUBSTITUTE(LEFT(' + mk + ',FIND("–",' + mk + '&"–")-1),"R",""),",","")))', hi = 'IFERROR(VALUE(TRIM(SUBSTITUTE(SUBSTITUTE(MID(' + mk + ',FIND("–",' + mk + ')+1,99),"R",""),",",""))),' + lo + ')';
            f = 'IF(' + mk + '="","no market price",IFERROR(IF(' + a('_retail') + '*(1+$' + RV + '$9)<=(' + lo + '+' + hi + ')/2,"ok","not ok"),"check"))';
            var mkv = val(x, '_market_price'), nums = String(mkv || '').replace(/–/g, '-').split('-').map(function (t) { return Number(t.replace(/[^0-9.]/g, '')); }).filter(function (t) { return t > 0; });
            y = !mkv ? 'no market price' : !nums.length ? 'check' : (val(x, '_retail') * (1 + vat) <= (nums[0] + (nums[1] || nums[0])) / 2 ? 'ok' : 'not ok');
          }
          if (y != null && typeof y === 'number') y = Math.round(y * 1e8) / 1e8;
          if (f) cell.value = { formula: f, result: y == null ? undefined : y };
          else cell.value = y == null || y === '' ? null : (c[2] === 'pct' || c[2] === 'usd') ? Number(y) : y;
          if (FMT[c[2]]) cell.numFmt = FMT[c[2]];
          if (HL && L_(i) === HL) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6EFE4' } };
          if (k === 'sv_pn') cell.font = { name: 'Arial', size: 10, bold: true };
        });
      });
      var last = 11 + rows.length;
      ws.autoFilter = { from: { row: 11, column: 1 }, to: { row: last, column: COLS.length } };
      put('A' + (last + 2), rows.length + ' items  ·  Prices per unit in ' + reg.currency + ', excl. VAT. Costing and pricing columns are live formulas; change the exchange rate above to update.', { italic: true, color: { argb: GREY } });
      put('A' + (last + 3), 'stravikautomotiveparts.com', { color: { argb: GOLD } });
    });
    if (!wb.worksheets.length) throw new Error('Nothing to download');
    var buf = await wb.xlsx.writeBuffer();
    L.download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
  }
  // Download for other apps (Customers > pricing approval): every range (or the ones given) of a region, filtered by keep(row, view).
  // Pricing team: the costing-sheet layout (opts.highlight = tier column to mark, opts.note = line under the range name); others: prices only.
  L.pricingDownload = async function (regionCode, ranges, keep, extraFirst, name, opts) {
    var me_ = await me(); regionCode = regionCode || (me_.regions[0] || {}).code;
    if (!regionCode) throw new Error('No price region available');
    var subs = (ranges && ranges.length ? ranges : me_.ranges.map(function (r) { return r.subcategory; }));
    var views = await Promise.all(subs.map(function (sub) { return sb.rpc('stravik_price_view', { p_sub: sub, p_region: regionCode }).then(L.must); }));
    if (views.length && views.every(function (v) { return v.costs && !single(v.region); })) return costingXlsx(views, keep, opts, name || ('Stravik_prices_' + regionCode + '_' + L.today() + '.xlsx'));
    await L.saveXlsx((extraFirst || []).concat(exportSheets(views, keep)), name || ('Stravik_prices_' + regionCode + '_' + L.today() + '.xlsx'));
  };
  async function excel() {
    try {
      if (!S.data) return;
      L.toast('Preparing the download…');
      var keep = {}; rows().forEach(function (x) { keep[mk(x)] = 1; });
      if (S.data.all) {
        var v = Object.assign({}, S.data, { rows: (S.data.rows || []).filter(function (x) { return keep[mk(x)]; }) });
        return await L.saveXlsx(exportAllRegions([v]), 'Stravik_prices_all_regions_' + S.range.replace(/\W+/g, '_') + '_' + L.today() + '.xlsx');
      }
      var name = 'Stravik_prices_' + S.data.region.name.replace(/\W+/g, '_') + '_' + S.range.replace(/\W+/g, '_') + '_' + L.today() + '.xlsx';
      if (S.data.costs && !single(S.data.region)) await costingXlsx([S.data], function (x) { return keep[mk(x)]; }, null, name);
      else await L.saveXlsx(exportSheets([S.data], function (x) { return keep[mk(x)]; }), name);
    } catch (e) { L.fail(e); }
  }
  async function excelAll() {
    try {
      L.toast('Preparing all ranges…');
      if (S.allReg) {
        var views = await Promise.all(ME.ranges.map(function (x) { return sb.rpc('stravik_price_view_all', { p_sub: x.subcategory }).then(L.must); }));
        return await L.saveXlsx(exportAllRegions(views), 'Stravik_prices_all_regions_all_ranges_' + L.today() + '.xlsx');
      }
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
  var TEXT = { sv_pn: 1, cond: 1, _lucas: 1, fob_port: 1, remarks: 1, sa_market_price: 1, price_source: 1 };
  MAP.moq = 'moq'; MAP.customermoq = 'customer_moq'; MAP.moqcustomer = 'customer_moq'; MAP.pricesource = 'price_source'; MAP.landedcostusd = 'cif_usd'; MAP.cwar = 'c_warr'; MAP.cmark = 'c_mar'; MAP.condition = 'cond'; MAP.cond = 'cond'; MAP.newreman = 'cond';
  // USD regions: "MARGIN NORTH AFRICA" / "PRICE NORTH AFRICA" (also "margin_north_africa", "North Africa margin")
  function regionHeads() {
    USDREG().forEach(function (g) {
      [g.name, g.name.replace(/\s*\(.*\)$/, ''), g.code].forEach(function (n) { var h = L.normHead(n);
        MAP['margin' + h] = g.prefix + '_margin'; MAP[h + 'margin'] = g.prefix + '_margin'; MAP['price' + h] = g.prefix + '_price'; MAP[h + 'price'] = g.prefix + '_price'; });
    });
  }
  function numOf(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return null;
    var p = /%$/.test(s); s = s.replace(/[R$\s,%]/g, '');
    var n = Number(s); return isFinite(n) ? (p ? n / 100 : n) : NaN;
  }
  async function readPriceSheet(f) {
    regionHeads();
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
      var hasSA = sh.rows.some(function (o) { return Object.keys(o).some(function (k) { return /^sa_/.test(k) && k !== 'sa_market_price'; }); });
      var regs = USDREG().filter(function (g) { return sh.rows.some(function (o) { return o[g.prefix + '_margin'] != null || o[g.prefix + '_price'] != null; }); });
      var noFx = hasSA && !sh.info.fx;
      L.modal('Upload price list', '<p>' + esc(f.name) + ': <b>' + sh.rows.length.toLocaleString() + '</b> rows' +
          (sh.info.eff ? ', effective <b>' + esc(dmy(sh.info.eff)) + '</b>' : '') + (sh.info.fx ? ', USD → ZAR <b>' + esc(String(sh.info.fx)) + '</b>' + (sh.info.buf != null ? ' + ' + esc(pct(sh.info.buf)) + ' buffer' : '') : '') + '.</p>' +
        (noFx ? '<div class="notice bad">South Africa columns but no exchange rate above the table ("USD → ZAR rate" with the rate in the next cell).</div>' : '') +
        (sh.bad.length ? '<div class="notice bad"><b>Fix these first:</b><ul>' + sh.bad.slice(0, 20).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        L.group('', [['Range', '<select id="puRange">' + L.CATS.map(function (x) { return '<option' + (x.subcategory_key === range ? ' selected' : '') + '>' + esc(x.subcategory_key) + '</option>'; }).join('') + '</select>'],
          ['Regions in the file', esc((hasSA ? ['South Africa (ZAR)'] : []).concat(regs.map(function (g) { return g.name + ' (USD)'; })).join(', ') || 'costs only (FOB and cost build-up)')]]) +
        (sh.ignored.length ? '<p class="small muted">Not price columns, ignored: ' + esc(sh.ignored.join(', ')) + '</p>' : '') +
        '<div id="puRes"></div><div class="o-footer"><button class="btn" id="puCheck"' + (sh.bad.length || noFx ? ' disabled' : '') + '>Check</button><button class="btn ghost" id="puX">Cancel</button></div>', true);
      $('puX').onclick = L.closeModal;
      var payload = function () {
        return sh.rows.map(function (o) {
          var x = Object.assign({}, o); delete x._lucas;
          if (hasSA) {
            x.sa_fx_rate = sh.info.fx; if (sh.info.buf != null) x.sa_fx_buffer = sh.info.buf;
            if (sh.info.eff) x.sa_effective = sh.info.eff;
            x.sa_source = f.name + (sh.info.eff ? ' (effective ' + sh.info.eff + ')' : '');
          } else if (!x.price_source) x.price_source = f.name;
          if (sh.basis) x.price_basis = sh.basis;
          return x;
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
              S.data = null; ME = null; S.range = sub; L.go(L.href('pricing', [], { range: sub }));
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
      (res.changes.length ? '<div class="o-list"><table class="grid compact"><thead><tr><th>Stravik PN</th><th class="num">Landed USD now</th><th class="num">Landed USD new</th><th class="num">T1 now</th><th class="num">T1 new</th><th class="num">Retail now</th><th class="num">Retail new</th><th>Changed</th></tr></thead><tbody>' +
        res.changes.slice(0, 200).map(function (c) { return '<tr><td class="pn">' + esc(c.pn) + '</td><td class="num">' + (c.new ? '<span class="muted">new</span>' : esc(c.landed_was == null ? '' : String(c.landed_was))) + '</td><td class="num"><b>' + esc(c.landed == null ? '' : String(c.landed)) + '</b></td><td class="num">' + (c.new ? '' : esc(c.t1_was == null ? '' : L.money(c.t1_was))) + '</td><td class="num"><b>' + esc(c.t1 == null ? '' : L.money(c.t1)) + '</b></td><td class="num">' + (c.new || c.retail_was == null ? '' : esc(L.money(c.retail_was))) + '</td><td class="num"><b>' + esc(c.retail == null ? '' : L.money(c.retail)) + '</b></td><td class="small">' + esc((c.columns || []).join(', ')) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (res.changes.length > 200 ? '<p class="small muted">First 200 shown.</p>' : '') : '');
  }
  async function uploadPage() {
    await me();
    if (!costs()) return L.go(BASE);
    L.cp({ crumbs: [['Pricing', BASE], ['Upload']], buttons: '<button type="button" class="btn" id="upGo">Choose the Excel file</button>' });
    L.content('<div class="o-sheet" style="max-width:860px"><h2>Upload a price list</h2><p>Upload the costing sheet as you keep it (one range per file), for example <i>Bulbs.xlsx</i>. Above the table it should have the range name, ' +
      '“Effective 30 October 2026”, “USD → ZAR rate” and “FX buffer”; the table starts at the row with <b>STRAVIK PART NUMBER</b>.</p>' +
      '<ul><li>South Africa sheets need the exchange rate above the table. Files for the USD regions only need STRAVIK PART NUMBER, FOB and the cost columns, with MARGIN &lt;region&gt; (for example MARGIN NORTH AFRICA): the price is landed cost ÷ (1 − margin), rounded to 0.1 (to 0.01 for ignition coils).</li>' +
      '<li>Every price is recalculated from the costs with the sheet\'s own formulas. Values that differ by more than a cent (typed over, or a broken formula) are listed before anything is saved.</li>' +
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
    var PCT = /^(c_|zp_mar|[a-z]{2,4}_margin$|sa_(clearance|duties|ancillary|finance|excise|anti_dumping|dpw_margin|c_dist|c_cod|fx_buffer|t\d_uplift|retail_margin)$)/, PLAIN = /^sa_(fx_rate|exchange)$/;
    var show = function (k, v) { return v == null ? '—' : typeof v !== 'number' ? String(v) : PCT.test(k) ? pct(v) : PLAIN.test(k) ? String(Math.round(v * 10000) / 10000) : L.money(v); };
    return '<div class="o-list"><table class="grid compact"><thead><tr><th>When</th><th>By</th>' + (withPart ? '<th>Part</th><th>Range</th>' : '') + '<th>What</th><th>Source</th></tr></thead><tbody>' + rows.map(function (h) {
      var what = h.action === 'insert' ? 'Added' + (h.changes && h.changes.sa_t1 != null ? ' · T1 ' + esc(L.money(h.changes.sa_t1)) + ', retail ' + esc(L.money(h.changes.sa_retail)) : '') : h.action === 'delete' ? 'Removed' :
        Object.keys(h.changes || {}).map(function (k) { var c = h.changes[k]; return '<b>' + esc(k) + '</b> ' + esc(show(k, c[0])) + ' → ' + esc(show(k, c[1])); }).join('<br>');
      return '<tr><td class="small">' + esc(L.dt(h.at)) + '</td><td class="small">' + esc(h.by_email || '') + '</td>' + (withPart ? '<td class="pn"><a href="' + L.href('pricing', ['part', h.sv_pn], h.cond === 'R' ? { range: TBL[h.table_name] || '', cond: 'R' } : { range: TBL[h.table_name] || '' }) + '">' + esc(h.sv_pn) + '</a>' + (h.cond === 'R' ? ' <span class="cond cond-R" title="Remanufactured">R</span>' : '') + '</td><td>' + esc(TBL[h.table_name] || h.table_name) + '</td>' : '') +
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
        var q = sb.from('stravik_price_history').select('at,by_email,table_name,sv_pn,cond,action,changes,source').order('at', { ascending: false }).limit(200);
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
        '<h2 style="margin-top:22px">Sales: sell prices by region</h2><p class="small muted">South Africa: T1–T5 and retail, excl. and incl. VAT, and the market price. USD regions: the region\'s price. Never costs, uplifts or margins.</p>' +
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
