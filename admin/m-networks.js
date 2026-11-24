/* App: Networks. Store networks such as Autobarn: the head office account, the store list with each store's class,
   target, field team member and customer account, and the prices head offices suggest. Everyone views and downloads,
   the data team edits. Tables: stravik_networks, stravik_network_stores, view stravik_network_targets,
   stravik_price_suggestions. Linking a store to its customer account puts that account under the head office. */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.net = { cls: '', text: '', active: {} };
  var BASE = L.href('networks');
  var FILTERS = [{ key: 'reg', label: 'Registered', group: 'Account', single: true }, { key: 'noreg', label: 'Not registered', group: 'Account', single: true }, { key: 'pilot', label: 'Pilot stores', group: 'Programme' }, { key: 'norep', label: 'No field team member', group: 'Programme' }];
  var rand = function (v) { return v == null || v === '' ? '' : 'R' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  var rand2 = function (v) { return v == null || v === '' ? '' : 'R' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var dname = function (d) { return d ? (d.trading_name || d.company_name) : ''; };
  var inp = function (id, v, attrs) { return '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (L.isEditor() ? '' : ' readonly') + (attrs ? ' ' + attrs : '') + '>'; };
  var sel = function (id, opts, v) { return '<select id="' + id + '"' + (L.isEditor() ? '' : ' disabled') + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v == null ? '' : v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };

  async function dealers() {
    return L.fetchAll(function () { return sb.from('stravik_dealers').select('id,company_name,trading_name,city,status,account_type,parent_id,is_test,email').order('company_name'); });
  }
  async function staffList() {
    try { return L.must(await sb.from('staff').select('email,full_name,team').eq('active', true).order('full_name')); } catch (e) { return []; }
  }

  // ---------- networks
  async function home() {
    L.cp({ crumbs: [['Networks']], buttons: '' }); $('cpSearch').innerHTML = '';
    try {
      var r = await Promise.all([sb.from('stravik_networks').select('*').order('is_test').order('name'), L.fetchAll(function () { return sb.from('stravik_network_stores').select('network,dealer_id,store_class,country').order('id'); }), dealers()]);
      var nets = L.must(r[0]), stores = r[1], ds = r[2];
      if (!nets.length) return L.content(L.empty('No networks yet', 'A network is a group of stores with one head office, such as Autobarn.'));
      L.content(L.listView([
        { label: 'Network', render: function (n) { return '<b>' + esc(n.name) + '</b>' + (n.is_test ? ' ' + L.pill('Test') : ''); } },
        { label: 'Head office account', render: function (n) { var d = ds.find(function (x) { return x.id === n.hq_dealer_id; }); return d ? esc(dname(d)) : '<span class="muted">Not set</span>'; } },
        { label: 'Stores', num: true, render: function (n) { return L.qty(stores.filter(function (s) { return s.network === n.code; }).length); } },
        { label: 'In the programme', num: true, render: function (n) { return L.qty(stores.filter(function (s) { return s.network === n.code && s.store_class && s.country === 'South Africa'; }).length); } },
        { label: 'Registered', num: true, render: function (n) { return L.qty(stores.filter(function (s) { return s.network === n.code && s.dealer_id; }).length); } },
        { label: 'Annual sell-out budget', num: true, render: function (n) { return rand(n.annual_sellout_budget); } },
        { label: 'Login page', render: function (n) { return n.code === 'autobarn' ? '<span class="small">/autobarn/</span>' : ''; } }
      ], nets, function (n) { return L.href('networks', [n.code]); }));
    } catch (e) { L.fail(e); }
  }

  // ---------- the stores of one network
  async function stores(code, r) {
    if (r.q.cls != null) S.cls = r.q.cls === 'all' ? '' : r.q.cls;
    try {
      var res = await Promise.all([sb.from('stravik_networks').select('*').eq('code', code).maybeSingle(), L.fetchAll(function () { return sb.from('stravik_network_targets').select('*').eq('network', code).order('store_name'); }), dealers(), staffList()]);
      var n = L.must(res[0]), all = res[1], ds = res[2], staff = res[3];
      if (!n) { L.cp({ crumbs: [['Networks', BASE], [code]] }); return L.content(L.empty('Network not found', '')); }
      var byId = {}; ds.forEach(function (d) { byId[d.id] = d; });
      var who = function (e) { var s = staff.find(function (x) { return x.email === e; }); return s ? s.full_name : e || ''; };
      var hq = byId[n.hq_dealer_id];
      L.cp({ crumbs: [['Networks', BASE], [n.name]], buttons: '<a class="btn editor-only" href="' + L.href('networks', [code, 's', 'new']) + '">New store</a><a class="btn ghost" href="' + L.href('networks', [code, 'settings']) + '">Head office and targets</a><button type="button" class="btn ghost" id="nwXls">Download</button>' });
      var draw = function () {
        var q = S.text.trim().toLowerCase();
        var rows = all.filter(function (s) {
          return (!S.cls || (S.cls === 'none' ? !s.store_class : s.store_class === S.cls)) && (!S.active.reg || s.dealer_id) && (!S.active.noreg || !s.dealer_id) && (!S.active.pilot || s.pilot) && (!S.active.norep || (!s.field_rep && s.store_class)) &&
            (!q || [s.store_name, s.town, s.province, s.country, who(s.field_rep)].join(' ').toLowerCase().indexOf(q) >= 0);
        });
        var cnt = function (c) { return all.filter(function (s) { return c === 'none' ? !s.store_class : s.store_class === c; }).length; };
        var sum = all.reduce(function (a, s) { return a + Number(s.annual_target || 0); }, 0);
        L.content('<div class="cards" style="margin-bottom:14px">' + [[all.length, 'stores'], [all.filter(function (s) { return s.store_class && s.country === 'South Africa'; }).length, 'in the programme (South Africa, with a class)'], [all.filter(function (s) { return s.dealer_id; }).length, 'registered on the portal'], [all.filter(function (s) { return s.pilot; }).length, 'pilot stores'], [rand(sum), 'annual targets in total']]
          .map(function (c) { return '<div class="card"><div class="stat">' + esc(typeof c[0] === 'number' ? c[0].toLocaleString() : c[0]) + '</div><div class="stat-l">' + esc(c[1]) + '</div></div>'; }).join('') + '</div>' +
          '<div class="o-with-panel"><nav class="o-panel"><div class="o-panel-title">Class</div>' + [['all', 'All stores', all.length], ['A', 'Class A: metro', cnt('A')], ['B', 'Class B: regional hub', cnt('B')], ['C', 'Class C: small town and rural', cnt('C')], ['none', 'No class (outside the programme)', cnt('none')]].map(function (x) {
            return '<a href="' + L.href('networks', [code], { cls: x[0] }) + '" class="' + ((S.cls || 'all') === x[0] ? 'on' : '') + '">' + esc(x[1]) + ' <span class="muted">' + x[2] + '</span></a>'; }).join('') +
          '<div class="o-panel-title" style="margin-top:14px">Head office</div><div class="small" style="padding:4px 10px">' + (hq ? esc(dname(hq)) + '<br><span class="muted">' + esc(hq.email || '') + '</span>' : '<span class="muted">No head office account yet. Set it under "Head office and targets".</span>') + '</div></nav><div>' +
          (rows.length ? L.listView([
            { label: 'Store', render: function (s) { return '<b>' + esc(s.store_name) + '</b>' + (s.pilot ? ' ' + L.pill('Pilot') : ''); } }, { label: 'Town', render: function (s) { return esc(s.town || ''); } },
            { label: 'Province', render: function (s) { return esc(s.country !== 'South Africa' ? s.country : s.province || ''); } }, { label: 'Class', render: function (s) { return s.store_class ? esc(s.store_class) : '<span class="muted">—</span>'; } },
            { label: 'Quarterly target', num: true, render: function (s) { return Number(s.quarterly_target) ? rand(s.quarterly_target) : ''; } }, { label: 'Gold at', num: true, render: function (s) { return Number(s.gold) ? rand(s.gold) : ''; } },
            { label: 'Field team', render: function (s) { return s.field_rep ? esc(who(s.field_rep)) : '<span class="muted">—</span>'; } },
            { label: 'Customer account', render: function (s) { var d = byId[s.dealer_id]; return d ? esc(dname(d)) + ' ' + L.pill(d.status) : s.dealer_id ? '<span class="muted">Outside your region</span>' : '<span class="muted">Not registered</span>'; } }
          ], rows, function (s) { return L.href('networks', [code, 's', s.id]); }) : L.empty('No stores match', 'Change the class, the filters or the search.')) + '</div></div>');
        $('nwXls').onclick = function () {
          L.saveXlsx([{ name: 'Stores', widths: [38, 24, 18, 16, 8, 8, 16, 14, 14, 14, 16, 24, 10, 34, 16], head: ['Store', 'Town', 'Province', 'Country', 'Class', 'Weight', 'Quarterly target T', 'Bronze (60%)', 'Silver (100%)', 'Gold (150%)', 'Annual target', 'Field team', 'Pilot', 'Customer account', 'Phone'],
            rows: rows.map(function (s) { var d = byId[s.dealer_id]; return [s.store_name, s.town || '', s.province || '', s.country, s.store_class || '', Number(s.weight), Number(s.quarterly_target), Number(s.bronze), Number(s.silver), Number(s.gold), Number(s.annual_target), who(s.field_rep), s.pilot ? 'Yes' : '', d ? dname(d) + ' (' + d.status + ')' : '', s.phone || '']; }) }], 'Stravik_' + n.name.replace(/\W+/g, '_') + '_stores_' + L.today() + '.xlsx');
        };
      };
      L.searchBar({ placeholder: 'Search store, town or field team…', text: S.text, filters: FILTERS, active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; draw(); } });
      draw();
    } catch (e) { L.fail(e); }
  }

  // ---------- one store
  async function storeForm(code, id) {
    try {
      var isNew = id === 'new';
      var res = await Promise.all([sb.from('stravik_networks').select('*').eq('code', code).maybeSingle(), isNew ? Promise.resolve({ data: { network: code, country: 'South Africa' } }) : sb.from('stravik_network_targets').select('*').eq('id', id).maybeSingle(),
        isNew ? Promise.resolve({ data: {} }) : sb.from('stravik_network_stores').select('notes,updated_at,updated_by').eq('id', id).maybeSingle(), dealers(), staffList(), L.fetchAll(function () { return sb.from('stravik_network_stores').select('id,dealer_id').not('dealer_id', 'is', null).order('id'); })]);
      var n = L.must(res[0]), s = L.must(res[1]), extra = L.must(res[2]) || {}, ds = res[3], staff = res[4], taken = {};
      if (!n || !s) { L.cp({ crumbs: [['Networks', BASE], [code]] }); return L.content(L.empty('Store not found', '')); }
      res[5].forEach(function (x) { if (String(x.id) !== String(id)) taken[x.dealer_id] = 1; });
      var free = ds.filter(function (d) { return d.id === s.dealer_id || (!taken[d.id] && d.account_type !== 'head_office' && !!d.is_test === !!n.is_test); });
      var ed = L.isEditor(), d = ds.find(function (x) { return x.id === s.dealer_id; });
      L.form({
        crumbs: [['Networks', BASE], [n.name, L.href('networks', [code])], [isNew ? 'New store' : s.store_name]],
        buttons: '<button type="button" class="btn editor-only" id="nsSave">Save</button><a class="btn ghost editor-only" href="' + L.href('networks', [code]) + '">Discard</a>',
        actions: (d ? '<a class="btn ghost" href="' + L.href('dealers', [d.id]) + '">Open customer account</a>' : '') + (!isNew ? '<button type="button" class="btn ghost editor-only" id="nsDel">Remove from the list</button>' : ''),
        sheet: '<div class="o-title"><h1>' + esc(isNew ? 'New store' : s.store_name) + '</h1>' + (s.pilot ? L.pill('Pilot') : '') + '</div><div class="o-subtitle">' + esc(n.name) + '</div><div class="o-groups">' +
          L.group('Store', [['Store name', inp('ns_name', s.store_name)], ['Town', inp('ns_town', s.town)], ['Province', inp('ns_prov', s.province)], ['Country', inp('ns_country', s.country)], ['Phone', inp('ns_phone', s.phone)]]) +
          L.group('Programme', [['Class', sel('ns_class', [['', 'No class (outside the programme)'], ['A', 'A: metro'], ['B', 'B: regional hub town'], ['C', 'C: small town and rural']], s.store_class)],
            ['Quarterly target', isNew ? '<span class="muted">Worked out after saving</span>' : Number(s.quarterly_target) ? '<b>' + rand(s.quarterly_target) + '</b> <span class="muted">Bronze ' + rand(s.bronze) + ', Gold ' + rand(s.gold) + '</span>' : '<span class="muted">No target</span>'],
            ['Field team member', sel('ns_rep', [['', 'Not allocated']].concat(staff.map(function (x) { return [x.email, x.full_name + (x.team ? ' (' + x.team + ')' : '')]; })), s.field_rep)],
            ['Pilot store', sel('ns_pilot', [['', 'No'], ['1', 'Yes']], s.pilot ? '1' : '')],
            ['Customer account', sel('ns_dealer', [['', 'Not registered yet']].concat(free.map(function (x) { return [x.id, dname(x) + (x.city ? ', ' + x.city : '') + ' (' + x.status + ')']; })), s.dealer_id)]]) + '</div>' +
          '<div class="o-group"><div class="o-group-title">Notes</div><textarea id="ns_notes" rows="3" style="width:100%"' + (ed ? '' : ' readonly') + '>' + esc(extra.notes || '') + '</textarea></div>' +
          '<p class="small muted">Choosing the customer account puts that account under the head office of ' + esc(n.name) + ', so head office sees its orders. The class sets the target; targets of all stores change when a class changes, because the budget is shared by weight.' + (extra.updated_by ? ' Last changed ' + esc(L.dt(extra.updated_at)) + ' by ' + esc(extra.updated_by) + '.' : '') + '</p>'
      });
      if (!ed) return;
      $('nsSave').onclick = async function () {
        try {
          var v = function (k) { return $(k).value.trim(); };
          if (!v('ns_name')) throw new Error('Enter the store name');
          var row = { network: code, store_name: v('ns_name'), town: v('ns_town') || null, province: v('ns_prov') || null, country: v('ns_country') || 'South Africa', phone: v('ns_phone') || null,
            store_class: v('ns_class') || null, field_rep: v('ns_rep') || null, pilot: v('ns_pilot') === '1', dealer_id: v('ns_dealer') || null, notes: v('ns_notes') || null };
          if (isNew) { var made = L.must(await sb.from('stravik_network_stores').insert(row).select('id').single()); L.toast('Store added'); L.go(L.href('networks', [code, 's', made.id])); }
          else { L.must(await sb.from('stravik_network_stores').update(row).eq('id', id)); L.toast('Saved ' + row.store_name); storeForm(code, id); }
        } catch (e) { L.fail(e); }
      };
      if ($('nsDel')) $('nsDel').onclick = async function () {
        if (!confirm('Remove ' + s.store_name + ' from the ' + n.name + ' store list? Its customer account, if it has one, stays but is no longer under the head office.')) return;
        try { L.must(await sb.from('stravik_network_stores').delete().eq('id', id)); L.toast('Removed'); L.go(L.href('networks', [code])); } catch (e) { L.fail(e); }
      };
    } catch (e) { L.fail(e); }
  }

  // ---------- head office account, budget and class weights
  async function settings(code) {
    try {
      var res = await Promise.all([sb.from('stravik_networks').select('*').eq('code', code).maybeSingle(), dealers(), L.fetchAll(function () { return sb.from('stravik_network_stores').select('dealer_id,store_class,country,network').order('id'); }), sb.from('stravik_networks').select('code,hq_dealer_id')]);
      var n = L.must(res[0]), ds = res[1], st = res[2], others = L.must(res[3]);
      if (!n) { L.cp({ crumbs: [['Networks', BASE], [code]] }); return L.content(L.empty('Network not found', '')); }
      var isStore = {}; st.forEach(function (s) { if (s.dealer_id) isStore[s.dealer_id] = 1; });
      var isHq = {}; others.forEach(function (o) { if (o.code !== code && o.hq_dealer_id) isHq[o.hq_dealer_id] = 1; });
      var cand = ds.filter(function (d) { return d.id === n.hq_dealer_id || (!isStore[d.id] && !isHq[d.id] && !!d.is_test === !!n.is_test); });
      var mine = st.filter(function (s) { return s.network === code && s.country === 'South Africa'; }), c = function (k) { return mine.filter(function (s) { return s.store_class === k; }).length; };
      var preview = function () {
        var b = L.num($('nt_budget').value) || 0, w = { A: L.num($('nt_a').value) || 0, B: L.num($('nt_b').value) || 0, C: L.num($('nt_c').value) || 0 }, tot = c('A') * w.A + c('B') * w.B + c('C') * w.C;
        $('ntPrev').innerHTML = '<table class="grid compact"><thead><tr><th>Class</th><th class="num">Stores</th><th class="num">Weight</th><th class="num">Annual target</th><th class="num">Quarterly target T</th><th class="num">Bronze (60%)</th><th class="num">Silver (100%)</th><th class="num">Gold (150%)</th></tr></thead><tbody>' +
          ['A', 'B', 'C'].map(function (k) { var a = tot ? b * w[k] / tot : 0; return '<tr><td>' + k + '</td><td class="num">' + c(k) + '</td><td class="num">' + w[k] + '</td><td class="num">' + rand(a) + '</td><td class="num"><b>' + rand(a / 4) + '</b></td><td class="num">' + rand(a / 4 * 0.6) + '</td><td class="num">' + rand(a / 4) + '</td><td class="num">' + rand(a / 4 * 1.5) + '</td></tr>'; }).join('') +
          '</tbody></table><p class="small muted">Total weight ' + tot + '. Store annual target = budget × store weight ÷ total weight. Quarterly target T = annual target ÷ 4.</p>';
      };
      L.form({
        crumbs: [['Networks', BASE], [n.name, L.href('networks', [code])], ['Head office and targets']],
        buttons: '<button type="button" class="btn editor-only" id="ntSave">Save</button><a class="btn ghost editor-only" href="' + L.href('networks', [code]) + '">Discard</a>',
        sheet: '<div class="o-title"><h1>' + esc(n.name) + '</h1>' + (n.is_test ? L.pill('Test') : '') + '</div><div class="o-groups">' +
          L.group('Head office', [['Network name', inp('nt_name', n.name)], ['Head office account', sel('nt_hq', [['', 'Not set']].concat(cand.map(function (x) { return [x.id, dname(x) + (x.city ? ', ' + x.city : '') + ' (' + x.status + ')']; })), n.hq_dealer_id)]]) +
          L.group('Targets', [['Annual sell-out budget (ZAR)', inp('nt_budget', Number(n.annual_sellout_budget), 'inputmode="decimal"')], ['Weight class A', inp('nt_a', Number(n.weight_a), 'inputmode="decimal"')], ['Weight class B', inp('nt_b', Number(n.weight_b), 'inputmode="decimal"')], ['Weight class C', inp('nt_c', Number(n.weight_c), 'inputmode="decimal"')]]) + '</div>' +
          '<div class="o-group"><div class="o-group-title">Targets by class</div><div id="ntPrev"></div></div>' +
          '<p class="small muted">The head office account is a customer account that has registered and been approved in the usual way. Making it the head office lets it see the orders of every store linked to it on the store list. The budget is reported sales at store buy price, at full run rate.</p>'
      });
      preview(); ['nt_budget', 'nt_a', 'nt_b', 'nt_c'].forEach(function (k) { $(k).oninput = preview; });
      if (!L.isEditor()) return;
      $('ntSave').onclick = async function () {
        try {
          var b = L.num($('nt_budget').value), w = ['nt_a', 'nt_b', 'nt_c'].map(function (k) { return L.num($(k).value); });
          if (b == null || Number.isNaN(b) || b < 0 || w.some(function (x) { return x == null || Number.isNaN(x) || x < 0; })) throw new Error('The budget and the weights must be numbers, 0 or more');
          if (!$('nt_name').value.trim()) throw new Error('Enter the network name');
          L.must(await sb.from('stravik_networks').update({ name: $('nt_name').value.trim(), hq_dealer_id: $('nt_hq').value || null, annual_sellout_budget: b, weight_a: w[0], weight_b: w[1], weight_c: w[2] }).eq('code', code));
          L.toast('Saved ' + $('nt_name').value.trim()); settings(code);
        } catch (e) { L.fail(e); }
      };
    } catch (e) { L.fail(e); }
  }

  // ---------- prices suggested by head offices
  async function suggestions() {
    L.cp({ crumbs: [['Networks', BASE], ['Suggested prices']], buttons: '<button type="button" class="btn ghost" id="sgXls">Download</button>' }); $('cpSearch').innerHTML = '';
    try {
      var res = await Promise.all([L.fetchAll(function () { return sb.from('stravik_price_suggestions').select('*').order('updated_at', { ascending: false }); }), dealers()]);
      var rows = res[0], ds = res[1], pns = Array.from(new Set(rows.map(function (x) { return x.sv_pn; }))), parts = {};
      for (var ch of L.chunks(pns, 300)) L.must(await sb.from('stravik_parts').select('sv_pn,short_desc,subcategory').in('sv_pn', ch)).forEach(function (p) { parts[p.sv_pn] = p; });
      var who = function (id) { return dname(ds.find(function (d) { return d.id === id; })) || 'Account outside your region'; };
      var diff = function (x) { return x.our_price ? (Number(x.suggested_price) / Number(x.our_price) - 1) * 100 : null; };
      var pct = function (v) { return v == null ? '' : (v > 0 ? '+' : '') + v.toFixed(1) + '%'; };
      $('sgXls').onclick = function () {
        L.saveXlsx([{ name: 'Suggested prices', widths: [30, 14, 50, 16, 16, 16, 12, 18, 30], head: ['Head office', 'Stravik PN', 'Description', 'Range', 'Their price excl. VAT', 'Suggested price excl. VAT', 'Difference %', 'Date', 'Note'],
          rows: rows.map(function (x) { var p = parts[x.sv_pn] || {}, d = diff(x); return [who(x.dealer_id), x.sv_pn, p.short_desc || '', p.subcategory || '', x.our_price == null ? '' : Number(x.our_price), Number(x.suggested_price), d == null ? '' : Math.round(d * 10) / 10, L.dt(x.updated_at), x.note || '']; }) }], 'Stravik_suggested_prices_' + L.today() + '.xlsx');
      };
      if (!rows.length) return L.content(L.empty('No suggested prices yet', 'A head office can type the price it thinks is right next to each part on its price list. The suggestions appear here. They never change a price.'));
      L.content('<p class="small muted" style="margin:0 0 10px">What head offices think the price should be, against the price on their own list when they saved it. Market research only: nothing here changes a price.</p>' + L.listView([
        { label: 'Head office', render: function (x) { return esc(who(x.dealer_id)); } }, { label: 'Stravik PN', cls: 'pn', render: function (x) { return esc(x.sv_pn); } }, { label: 'Description', cls: 'clip', render: function (x) { return esc((parts[x.sv_pn] || {}).short_desc || ''); } },
        { label: 'Range', render: function (x) { return esc((parts[x.sv_pn] || {}).subcategory || ''); } }, { label: 'Their price', num: true, render: function (x) { return rand2(x.our_price); } }, { label: 'Suggested', num: true, render: function (x) { return '<b>' + rand2(x.suggested_price) + '</b>'; } },
        { label: 'Difference', num: true, render: function (x) { var d = diff(x); return d == null ? '' : '<span class="' + (d < 0 ? 'flag' : '') + '">' + pct(d) + '</span>'; } }, { label: 'Saved', render: function (x) { return '<span class="small">' + esc(L.dt(x.updated_at)) + '</span>'; } }
      ], rows));
    } catch (e) { L.fail(e); }
  }

  L.register({
    key: 'networks', name: 'Networks', color: '#0b203d',
    icon: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="12" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v8M12 11.5H5v4M12 11.5h7v4"/>',
    menus: [{ label: 'Networks', href: BASE }, { label: 'Suggested prices', href: L.href('networks', ['suggestions']) }],
    route: function (r) {
      var p = r.parts;
      if (!p[0]) return home();
      if (p[0] === 'suggestions') return suggestions();
      if (p[1] === 'settings') return settings(p[0]);
      if (p[1] === 's' && p[2]) return storeForm(p[0], p[2]);
      return stores(p[0], r);
    }
  });
})(window.LS);
