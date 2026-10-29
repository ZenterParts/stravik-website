/* App: Inquiries. Customers' lists (OE, CTR, cross-reference or Stravik numbers) matched to Stravik parts and priced at FOB and sales price */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.inq = { text: '', active: {}, offset: 0 };
  var BASE = L.href('inquiries');
  var FILTERS = [
    { key: 'st_New', label: 'New', group: 'Status' }, { key: 'st_Quoted', label: 'Quoted', group: 'Status' }, { key: 'st_Won', label: 'Won', group: 'Status' },
    { key: 'st_Lost', label: 'Lost', group: 'Status' }, { key: 'st_Closed', label: 'Closed', group: 'Status' },
    { key: 'src_Website', label: 'Website', group: 'Source' }, { key: 'src_Email / list', label: 'Email / list', group: 'Source' },
    { key: 'att_any', label: 'Needs attention', group: 'Lines' }, { key: 'att_nf', label: 'Has numbers not found', group: 'Lines' }
  ];
  var STEPS = ['New', 'Quoted', 'Won', 'Lost', 'Closed'];

  // ---------- list ----------
  async function list() {
    L.cp({ crumbs: [['Inquiries']], buttons: '<button type="button" class="btn editor-only" id="iqNew">New from a list</button>' });
    L.searchBar({ placeholder: 'Search inquiry no., company, name or email…', text: S.text, filters: FILTERS, active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; S.offset = 0; load(); } });
    $('iqNew').onclick = function () { wizard(); };
    load();
  }
  async function load() {
    try {
      var q = sb.from('stravik_inquiry_summary').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(S.offset, S.offset + L.PAGE - 1);
      var st = STEPS.filter(function (s) { return S.active['st_' + s]; }); if (st.length) q = q.in('status', st);
      var src = ['Website', 'Email / list'].filter(function (s) { return S.active['src_' + s]; }); if (src.length) q = q.in('source', src);
      if (S.active.att_any) q = q.gt('lines_flagged', 0);
      if (S.active.att_nf) q = q.gt('not_found', 0);
      var s = L.orSearch(['ref', 'company', 'name', 'email'], S.text); if (s) q = q.or(s);
      var res = await q, rows = L.must(res);
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; load(); });
      if (!rows.length) return L.content(L.empty('No inquiries', S.text || Object.keys(S.active).length ? 'Nothing matches the search.' : 'Customers\' lists are added with "New from a list"' + (L.isEditor() ? '.' : ' by the data team.')));
      L.content(L.listView([
        { label: 'Received', render: function (r) { return esc(L.dt(r.created_at)); } },
        { label: 'Inquiry no.', cls: 'pn', render: function (r) { return esc(r.ref); } },
        { label: 'Source', render: function (r) { return L.pill(r.source, r.source === 'Website' ? 'Website' : ''); } },
        { label: 'Company', render: function (r) { return esc(r.company); } },
        { label: 'Name', render: function (r) { return esc(r.name); } },
        { label: 'Country', render: function (r) { return esc(r.country); } },
        { label: 'Lines', num: true, render: function (r) { return L.qty(r.lines); } },
        { label: 'Pieces', num: true, render: function (r) { return L.qty(r.pieces); } },
        { label: 'Total FOB USD', num: true, render: function (r) { return L.money(r.total_fob_usd); } },
        { label: 'Needs attention', render: function (r) { var a = []; if (r.not_found) a.push(r.not_found + ' not found'); if (r.lines_flagged - r.not_found > 0) a.push((r.lines_flagged - r.not_found) + ' other'); return a.length ? '<span class="flag">' + a.join(', ') + '</span>' : ''; } },
        { label: 'Status', render: function (r) { return L.pill(r.status); } }
      ], rows, function (r) { return L.href('inquiries', [r.ref]); }));
    } catch (e) { L.fail(e); }
  }

  // ---------- form ----------
  async function form(ref, filter) {
    try {
      var h = L.must(await sb.from('stravik_inquiries').select('*').eq('ref', ref).single());
      var lines = await L.fetchAll(function () { return sb.from('stravik_inquiry_lines').select('*').eq('ref', ref).order('line'); });
      var total = 0, sales = 0, pcs = 0, c = { all: lines.length, att: 0, nf: 0, sev: 0, np: 0 };
      lines.forEach(function (l) { total += Number(l.line_fob_usd) || 0; sales += Number(l.line_sales_usd) || 0; pcs += l.qty; if (l.flag) c.att++; if (l.flag === 'Not found') c.nf++; if (/^Several/.test(l.flag || '')) c.sev++; if (l.flag === 'No FOB price') c.np++; });
      var ed = L.isEditor();
      L.form({
        crumbs: [['Inquiries', BASE], [h.ref]],
        actions: '<button type="button" class="btn" id="fXls">Download Excel with prices</button>',
        status: { steps: STEPS, current: h.status, clickable: ed, onClick: async function (s) { try { L.must(await sb.from('stravik_inquiries').update({ status: s }).eq('ref', h.ref)); L.toast('Status: ' + s); form(ref, filter); } catch (e) { L.fail(e); } } },
        sheet: '<div class="o-title"><h1>' + esc(h.ref) + '</h1>' + L.pill(h.source, h.source === 'Website' ? 'Website' : '') + '</div>' +
          '<div class="o-subtitle">' + esc(h.company || h.name || '') + '</div>' +
          '<div class="o-groups">' +
            L.group('Customer', [['Company', esc(h.company)], ['Contact', esc(h.name)], ['Email', h.email ? '<a href="mailto:' + esc(h.email) + '">' + esc(h.email) + '</a>' : ''], ['Phone', esc(h.phone)], ['Country', esc(h.country)], ['Customer type', esc(h.customer_type)]]) +
            L.group('Inquiry', [['Received', esc(L.dt(h.created_at))], ['Source', esc(h.source)], ['Added by', esc(h.created_by || '')], ['Lines', L.qty(lines.length)], ['Pieces', L.qty(pcs)], ['Total FOB USD', '<b>' + L.money(total) + '</b>' + (c.att ? ' <span class="muted small">(lines with a price only)</span>' : '')], ['Total sales price USD', L.money(sales)]]) +
          '</div>' +
          L.notebook([
            { key: 'lines', label: 'Lines <span class="muted">(' + L.qty(lines.length) + ')</span>', html: linesTab(lines, c, filter || 'all') },
            { key: 'msg', label: 'Customer message', html: h.message ? '<p style="white-space:pre-wrap">' + esc(h.message) + '</p>' : '<p class="muted">No message.</p>' },
            { key: 'notes', label: 'Internal notes', html: '<textarea id="fNotes"' + (ed ? '' : ' readonly') + ' rows="5">' + esc(h.staff_notes || '') + '</textarea>' + (ed ? '<div class="o-footer"><button type="button" class="btn" id="fSaveNotes">Save notes</button></div>' : '') }
          ], 'lines')
      });
      $('fXls').onclick = function () { excel(h, lines, total, pcs, sales).catch(L.fail); };
      $('fFilter').onclick = function (e) { var b = e.target.closest('[data-f]'); if (b) { $('fLinesWrap').innerHTML = linesTable(lines, b.dataset.f); $('fFilter').querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === b); }); } };
      if (!ed) return;
      $('fSaveNotes').onclick = async function () { try { L.must(await sb.from('stravik_inquiries').update({ staff_notes: $('fNotes').value }).eq('ref', h.ref)); L.toast('Notes saved'); } catch (e) { L.fail(e); } };
      $('fLinesWrap').addEventListener('change', async function (e) {
        var s = e.target.closest('select[data-item], input.pnfix'); if (!s) return;
        var pn = L.clean(s.value) || null;
        try { L.must(await sb.rpc('stravik_choose_inquiry_match', { item_id: Number(s.dataset.item), pn: pn })); L.toast(pn ? 'Line set to ' + pn : 'Line cleared'); form(ref); } catch (err) { L.fail(err); }
      });
    } catch (e) { L.fail(e); }
  }
  function linesTab(lines, c, filter) {
    return '<div class="chips" id="fFilter" style="margin-bottom:10px">' +
      L.chip('All ' + c.all, filter === 'all' ? 'on' : '', 'all') + L.chip('Priced ' + (c.all - c.att), 'good' + (filter === 'ok' ? ' on' : ''), 'ok') +
      (c.att ? L.chip('Needs attention ' + c.att, 'warn', 'att') : '') + (c.nf ? L.chip('Not found ' + c.nf, 'warn', 'nf') : '') +
      (c.sev ? L.chip('Several matches ' + c.sev, 'warn', 'sev') : '') + (c.np ? L.chip('No FOB price ' + c.np, 'warn', 'np') : '') + '</div>' +
      '<div id="fLinesWrap">' + linesTable(lines, filter) + '</div>';
  }
  function linesTable(lines, f) {
    var ed = L.isEditor(), MAX = 1500;
    var shown = lines.filter(function (l) { return f === 'all' || (f === 'att' && l.flag) || (f === 'nf' && l.flag === 'Not found') || (f === 'sev' && /^Several/.test(l.flag || '')) || (f === 'np' && l.flag === 'No FOB price') || (f === 'ok' && !l.flag); });
    if (!shown.length) return '<p class="muted">No lines.</p>';
    return '<div class="o-list"><table class="grid"><thead><tr><th>#</th><th>Requested</th><th>Matched as</th><th>Stravik PN</th><th>Description</th><th>Type</th><th class="num">Qty</th><th class="num">FOB USD</th><th class="num">Line FOB USD</th><th class="num">Sales price USD</th><th class="num">Available</th><th>Note</th></tr></thead><tbody>' +
      shown.slice(0, MAX).map(function (l) {
        var pn = l.sv_pn ? '<a href="' + L.href('parts', ['p', l.sv_pn]) + '">' + esc(l.sv_pn) + '</a>' : '';
        if (ed && l.candidates && l.candidates.length) pn = '<select data-item="' + l.item_id + '"><option value="">Choose…</option>' + l.candidates.map(function (x) { return '<option' + (x === l.sv_pn ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>';
        else if (ed && !l.sv_pn) pn = '<input class="pnfix" data-item="' + l.item_id + '" placeholder="Stravik PN" size="14">';
        else if (!l.sv_pn && l.candidates) pn = '<span class="muted">' + esc(l.candidates.join(', ')) + '</span>';
        return '<tr><td>' + l.line + '</td><td>' + esc(l.requested_no) + '</td><td class="clip small" title="' + esc(l.matched_via || '') + '">' + esc(l.matched_via || '') + '</td><td class="pn">' + pn + '</td><td class="clip">' + esc(l.description) + '</td><td>' + esc(l.part_type || l.subcategory || '') +
          '</td><td class="num">' + L.qty(l.qty) + '</td><td class="num">' + L.money(l.fob_usd) + '</td><td class="num">' + L.money(l.line_fob_usd) + '</td><td class="num">' + L.money(l.sales_price) + '</td><td class="num">' + L.qty(l.available) + '</td><td>' + (l.flag ? '<span class="flag">' + esc(l.flag) + '</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (shown.length > MAX ? '<p class="muted small">Showing the first ' + MAX + ' of ' + shown.length + ' lines. The Excel download has all of them.</p>' : '');
  }
  function excel(h, lines, total, pcs, sales) {
    var head = ['#', 'Requested', 'Matched as', 'Stravik PN', 'Description', 'Range', 'Type', 'Qty', 'FOB USD', 'Line FOB USD', 'Sales price USD', 'Line sales USD', 'Available', 'Note', 'Other possible parts'];
    var n = function (v) { return v == null ? '' : Number(v); };
    var row = function (l) { return [l.line, l.requested_no, l.matched_via || '', l.sv_pn || '', l.description || '', l.subcategory || '', l.part_type || '', l.qty, n(l.fob_usd), n(l.line_fob_usd), n(l.sales_price), n(l.line_sales_usd), n(l.available), l.flag || '', (l.candidates || []).join(', ')]; };
    var w = [6, 18, 30, 16, 50, 18, 18, 8, 10, 12, 12, 12, 10, 24, 30];
    var sheets = [{ name: 'Inquiry', widths: w, top: [['Inquiry ' + h.ref], ['Source', h.source || ''], ['Received', L.dt(h.created_at)], ['Company', h.company || ''], ['Name', h.name || ''], ['Email', h.email || ''], ['Phone', h.phone || ''], ['Country', h.country || ''], []],
      head: head, rows: lines.map(row), foot: [['', '', '', '', 'Total (priced lines)', '', '', pcs, '', Math.round(total * 100) / 100, '', Math.round((sales || 0) * 100) / 100]] }];
    var att = lines.filter(function (l) { return l.flag; });
    if (att.length) sheets.push({ name: 'Needs attention', widths: w, head: head, rows: att.map(row) });
    return L.saveXlsx(sheets, h.ref + '_Stravik_prices.xlsx');
  }

  // ---------- wizard: new inquiry from a customer's list ----------
  function wizard(prefill, prefillBest) {
    var items = prefill || null, best = prefillBest || null;
    L.modal('New inquiry from a list',
      '<p class="muted">For customers who send a list of OE, CTR, cross-reference or Stravik numbers. Every number is matched to a Stravik part, priced at FOB and sales price, and flagged if it isn\'t found.</p>' +
      '<div class="o-groups">' + L.group('Customer', [['Company', '<input id="nCompany">'], ['Contact', '<input id="nName">'], ['Email', '<input id="nEmail" type="email">'], ['Phone', '<input id="nPhone">'], ['Country', '<input id="nCountry">']]) +
        L.group('Inquiry', [['Customer type', '<select id="nType"><option></option><option>Distributor</option><option>Retailer</option><option>Workshop / garage</option><option>Fleet</option><option>Other</option></select>'], ['Received by', '<select id="nSource"><option>Email / list</option><option>WhatsApp</option><option>Phone</option><option>Visit</option></select>'], ['Notes', '<textarea id="nMsg" rows="3"></textarea>']]) + '</div>' +
      '<div class="o-group-title">Parts list</div>' +
      (items ? '<p><b>' + items.length.toLocaleString() + '</b> numbers taken from Number lookup.</p>' :
        '<div class="cols2"><label>Paste numbers (one row per line; several numbers for a row separated by |, quantity after ;)<textarea id="nPaste" class="mono" rows="7" placeholder="04C121004E ; 10&#10;90915-YZZJ3 | WE01-13-Z40 ; 2"></textarea></label>' +
        '<div><label>Or upload Excel / CSV<input type="file" id="nFile" accept=".xlsx,.csv"></label><p class="muted small" id="nInfo"></p></div></div>') +
      '<div id="nPreview"></div><div class="o-footer"><button class="btn" id="nCreate" disabled>Create inquiry</button><button class="btn ghost" id="nCheck">Check list</button><button class="btn ghost" id="nCancel">Cancel</button></div>', true);
    var current = function () { return items || L.parseListText($('nPaste').value); };
    $('nCancel').onclick = L.closeModal;
    if (!items) {
      $('nFile').onchange = async function () { var f = this.files[0]; if (!f) return; try { var r = await L.parseListFile(f); $('nPaste').value = L.listToText(r.items); $('nInfo').textContent = r.info; best = null; $('nCreate').disabled = true; } catch (e) { L.fail(e); } };
      $('nPaste').oninput = function () { best = null; $('nCreate').disabled = true; };
    }
    $('nCheck').onclick = async function () {
      var list = current(); if (!list.length) return L.toast('The list is empty');
      if (list.length > 10000) return L.toast('Up to 10,000 lines per inquiry');
      var btn = this; btn.disabled = true;
      try {
        var lr = await L.lookupItems(list, function (d, t) { btn.textContent = 'Checking ' + d.toLocaleString() + ' / ' + t.toLocaleString(); });
        best = lr.best;
        var seen = {}, c = { Found: 0, 'Several matches': 0, 'Not found': 0 }, res = lr.rows;
        res.forEach(function (r) { if (!seen[r.ord]) { seen[r.ord] = 1; c[r.result]++; } });
        $('nPreview').innerHTML = '<div class="notice"><b>' + list.length.toLocaleString() + '</b> lines: <span class="ok">' + c.Found + ' found</span>, ' + c['Several matches'] + ' with several possible parts (choose after creating), <span class="flag">' + c['Not found'] + ' not found</span>.</div>';
        $('nCreate').disabled = false;
      } catch (e) { L.fail(e); }
      btn.disabled = false; btn.textContent = 'Check list';
    };
    $('nCreate').onclick = async function () {
      var list = current(); if (!list.length) return;
      var btn = this; btn.disabled = true; btn.textContent = 'Creating…';
      try {
        var ref = L.must(await sb.rpc('stravik_create_inquiry', {
          header: { company: $('nCompany').value, name: $('nName').value, email: $('nEmail').value, phone: $('nPhone').value, country: $('nCountry').value, type: $('nType').value, message: $('nMsg').value, source: $('nSource').value },
          // the number that matched is sent (OE or reference); all of the customer's numbers are kept in the line's description
          lines: list.map(function (i, k) { var alts = i.alts || [i.no]; return { no: (best && best[k]) || i.no, qty: i.qty || 1, desc: [i.desc || ''].concat(alts.length > 1 ? [alts.join(' / ')] : []).filter(Boolean).join(' · ') }; })
        }));
        L.closeModal(); L.toast('Inquiry ' + ref + ' created'); L.go(L.href('inquiries', [ref]));
      } catch (e) { L.fail(e); btn.disabled = false; btn.textContent = 'Create inquiry'; }
    };
  }
  L.newInquiry = wizard;

  L.register({
    key: 'inquiries', name: 'Inquiries', color: '#a97c42',
    icon: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    menus: [{ label: 'Inquiries', href: BASE }, { label: 'New from a list', action: 'new', editor: true }],
    actions: { new: function () { wizard(); } },
    route: function (r) { if (r.parts[0]) form(r.parts[0]); else list(); }
  });
})(window.LS);
