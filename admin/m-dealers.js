/* Apps: Customers and Orders.
   Customers: accounts that registered on the Stravik website. Approval in three steps (function stravik_dealer_approve):
   1 sales team, 2 pricing team (chooses the price group), 3 final approval (Pedro); who may do each step is set under Settings
   (stravik_settings approvers_sales / _pricing / _final; empty = the data team). Also reject, suspend, the price lists per group
   (Preferred distributor = batteries only; T1 Distributor / Wholesaler … T5 Small retailer; Retail), and the email settings.
   Orders: orders placed by approved customers; they go to DP World SA and to us by email. DP World SA's invoice and delivery details are kept here.
   Tables: stravik_dealers, stravik_dealer_documents, stravik_price_groups, stravik_group_prices, stravik_orders, stravik_order_items, stravik_settings.
   Emails: edge function stravik-dealer-mail (Resend). */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var DB = L.href('dealers'), OB = L.href('orders');
  var STATUSES = ['Pending', 'Approved', 'Rejected', 'Suspended'];
  var STAGES = ['Sales approval', 'Pricing approval', 'Final approval'];
  var stage = function (d) { return d.status !== 'Pending' ? d.status : !d.sales_approved_at ? 'Sales approval' : !d.pricing_approved_at ? 'Pricing approval' : 'Final approval'; };
  var gopt = function (g) { return (/^T\d$/.test(g.code) && g.name.indexOf(g.code) < 0 ? g.code + ' · ' : '') + g.name + (g.categories ? ' (' + g.categories.join(', ') + ' only)' : ''); };
  var GROUPS = [];
  // orders are in the order's currency: ZAR (excl. VAT, VAT added) for South African tier customers, USD for the older groups
  var omoney = function (v, cur) { return v == null || v === '' ? '' : (cur || 'USD') + ' ' + L.money(v); };
  async function groups() { if (!GROUPS.length) GROUPS = L.must(await sb.from('stravik_group_price_counts').select('*').order('sort')); return GROUPS; }
  var gname = function (code) { var g = GROUPS.find(function (x) { return x.code === code; }); return g ? g.name : (code || ''); };
  // Pricing approval / change of group: exactly what the customer would see with the chosen group (their country decides the region)
  async function tierPreview(box, dealerId, code, d0name) {
    if (!code) { box.innerHTML = '<p class="small muted">Choose a price group to see the prices this customer will get.</p>'; return; }
    box.innerHTML = '<p class="small muted">Loading the prices…</p>';
    try {
      var v = L.must(await sb.rpc('stravik_tier_preview', { p_dealer: dealerId, p_group: code })), cur = v.currency, vat = v.vat ? Number(v.vat) : 0;
      var m = function (x) { return x == null ? '' : (cur === 'ZAR' ? 'R' : cur === 'USD' ? '$' : cur + ' ') + L.money(x); };
      var rows = v.rows || [];
      box.innerHTML = '<div class="notice' + (rows.length ? ' good' : ' bad') + '"><b>' + esc(v.group_name) + '</b> · ' + esc(v.note) + ' · ' + (rows.length ? rows.length.toLocaleString() + ' parts priced' : 'no prices yet: every part shows “on request”') +
          (v.ranges.length ? '<div class="small">' + v.ranges.map(function (r) { return esc(r.range) + ' ' + r.parts; }).join(' · ') + '</div>' : '') + '</div>' +
        (rows.length ? '<div style="display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap"><select id="tpR" style="width:auto;min-width:180px"><option value="">All ranges</option>' +
            v.ranges.map(function (r) { return '<option>' + esc(r.range) + '</option>'; }).join('') + '</select>' +
            '<input type="search" id="tpQ" placeholder="Search part no. or description…" style="flex:1;min-width:220px">' +
            '<button type="button" class="btn ghost" id="tpX">Download</button></div>' +
          '<div class="o-list" style="max-height:340px;overflow:auto"><table class="grid compact" style="width:100%"><thead><tr><th>Stravik PN</th><th>Description</th><th>Range</th><th class="num">' + esc(cur) + (vat ? ' excl. VAT' : '') + '</th>' + (vat ? '<th class="num">incl. ' + Math.round(vat * 100) + '% VAT</th>' : '') + '</tr></thead><tbody id="tpB"></tbody></table></div><p class="small muted" id="tpN"></p>' : '');
      if (!rows.length) return;
      var hits = function () {
        var q = String($('tpQ').value || '').toLowerCase().trim(), k = L.clean(q), rg = $('tpR').value;
        return rows.filter(function (r) { return (!rg || r[2] === rg) && (!q || L.clean(r[0]).indexOf(k) >= 0 || String(r[1] || '').toLowerCase().indexOf(q) >= 0); });
      };
      var paint = function () {
        var hit = hits();
        $('tpB').innerHTML = hit.slice(0, 150).map(function (r) { return '<tr><td class="pn">' + esc(r[0]) + '</td><td class="clip">' + esc(r[1] || '') + '</td><td class="small">' + esc(r[2]) + '</td><td class="num"><b>' + esc(m(r[3])) + '</b></td>' + (vat ? '<td class="num">' + esc(m(r[4])) + '</td>' : '') + '</tr>'; }).join('');
        $('tpN').textContent = hit.length > 150 ? 'First 150 of ' + hit.length.toLocaleString() + ' shown; search or choose a range to narrow it down.' : hit.length + ' shown.';
      };
      $('tpQ').oninput = L.debounce(paint, 150); $('tpR').onchange = paint; paint();
      // Download: this customer's prices (as filtered), then every tier and, for the pricing team, the whole costing of the same parts
      $('tpX').onclick = async function () {
        var b = this; b.disabled = true; b.textContent = 'Preparing…';
        try {
          var hit = hits(), keep = {}; hit.forEach(function (r) { keep[r[0]] = 1; });
          var head = ['Stravik PN', 'Description', 'Range', v.group_name + ' ' + cur + (vat ? ' excl. VAT' : '')].concat(vat ? [v.group_name + ' ' + cur + ' incl. VAT'] : []);
          var first = [{ name: 'Customer prices', head: head, widths: [14, 46, 16, 22, 22], top: [[v.group_name + ' · ' + v.note + (v.country ? ' · ' + v.country : '')]],
            rows: hit.map(function (r) { return [r[0], r[1] || '', r[2], r[3] == null ? '' : Number(r[3])].concat(vat ? [r[4] == null ? '' : Number(r[4])] : []); }) }];
          var name = 'Stravik_price_check_' + String(v.group_name).replace(/\W+/g, '_') + '_' + L.today() + '.xlsx';
          if (v.region_code && L.pricingDownload) {
            var rg = $('tpR').value;
            // pricing team: the costing-sheet layout with the chosen group's price column marked; others: these prices only
            var hl = /^T\d$/.test(v.group) ? v.group.toLowerCase() : v.group === 'RETAIL' ? 'retail' : null;
            await L.pricingDownload(v.region_code, rg ? [rg] : v.ranges.map(function (r) { return r.range; }), function (x) { return keep[x.sv_pn]; }, first, name,
              { highlight: hl, note: 'Price check: ' + (d0name || '') + ' · ' + v.group_name });
          } else await L.saveXlsx(first, name);
        } catch (e) { L.fail(e); }
        b.disabled = false; b.textContent = 'Download';
      };
    } catch (e) { box.innerHTML = '<p class="flag">' + esc(e.message || e) + '</p>'; }
  }
  async function mail(body) {
    try {
      var r = await sb.functions.invoke('stravik-dealer-mail', { body: body });
      var d = r.data || {};
      if (r.error) return 'Email not sent: ' + (r.error.message || r.error);
      if (d.status === 'not configured') return 'Email not sent: Resend is not set up yet (RESEND_API_KEY).';
      if (!d.ok) return 'Email not sent: ' + (d.error || d.status || 'unknown error');
      return 'Email sent.';
    } catch (e) { return 'Email not sent: ' + (e.message || e); }
  }
  var pillCls = { Pending: 'New', 'Sales approval': 'New', 'Pricing approval': 'New', 'Final approval': 'Quoted', Approved: 'Active', Rejected: 'warn', Suspended: 'Inactive', Submitted: 'New', 'With DPW': 'Quoted', Invoiced: 'Quoted', Dispatched: 'Won', Delivered: 'Won', Cancelled: 'Inactive' };
  var pill = function (s) { return L.pill(s, pillCls[s] || ''); };

  // =================================================================== customers list
  var S = L.state.dealers = { text: '', active: { st_Pending: true }, offset: 0 };
  var DFILTERS = STATUSES.map(function (s) { return { key: 'st_' + s, label: s === 'Pending' ? 'Waiting for approval' : s, group: 'Status' }; }).concat(STAGES.map(function (s, i) { return { key: 'sg_' + i, label: 'Waiting for ' + s.toLowerCase(), group: 'Approval step' }; })).concat([{ key: 'test', label: 'Test accounts', group: 'Other' }, { key: 'real', label: 'Real accounts', group: 'Other' }]);
  async function dList() {
    await groups();
    L.cp({ crumbs: [['Customers', DB], ['Accounts']], buttons: '<button type="button" class="btn ghost" id="dXls">Download</button>' });
    L.searchBar({ placeholder: 'Search company, contact, email, reg. no., country…', text: S.text, filters: DFILTERS, active: S.active, onChange: function (s) { S.text = s.text; S.active = s.active; S.offset = 0; dLoad(); } });
    L.content('<div class="cards" id="dStats" style="margin-bottom:14px"></div><div id="dListBox"></div>');
    $('dXls').onclick = dExcel;
    dStats(); dLoad();
  }
  function dQuery(opts) {
    var q = sb.from('stravik_dealer_list').select('*', opts);
    var st = STATUSES.filter(function (s) { return S.active['st_' + s]; }); if (st.length) q = q.in('status', st);
    var sg = STAGES.filter(function (s, i) { return S.active['sg_' + i]; }); if (sg.length) q = q.in('stage', sg);
    if (S.active.test && !S.active.real) q = q.eq('is_test', true);
    if (S.active.real && !S.active.test) q = q.eq('is_test', false);
    var s = L.orSearch(['company_name', 'trading_name', 'contact_name', 'email', 'cipc_no', 'vat_no', 'city', 'country'], S.text); if (s) q = q.or(s);
    return q.order('submitted_at', { ascending: false });
  }
  async function dStats() {
    try {
      var rows = L.must(await sb.from('stravik_dealer_list').select('status,stage,price_group,is_test'));
      var c = function (f) { return rows.filter(f).length; };
      $('dStats').innerHTML = STAGES.map(function (s) { return [c(function (r) { return r.stage === s; }), 'waiting for ' + s.toLowerCase()]; }).concat([[c(function (r) { return r.status === 'Approved' && r.price_group === 'PREF'; }), 'approved preferred distributors'],
        [c(function (r) { return r.status === 'Approved' && r.price_group !== 'PREF'; }), 'other approved customers'], [c(function (r) { return r.status === 'Rejected' || r.status === 'Suspended'; }), 'rejected or on hold']])
        .map(function (s) { return '<div class="card"><div class="stat">' + s[0] + '</div><div class="stat-l">' + esc(s[1]) + '</div></div>'; }).join('');
    } catch (e) { /* informative only */ }
  }
  async function dLoad() {
    try {
      var res = await dQuery({ count: 'exact' }).range(S.offset, S.offset + L.PAGE - 1), rows = L.must(res);
      L.pager(S.offset, res.count || 0, function (o) { S.offset = o; dLoad(); });
      if (!rows.length) { $('dListBox').innerHTML = L.empty(S.active.st_Pending ? 'No registrations waiting' : 'No accounts', 'Customers register on the website under "Customer login". New registrations appear here for review.'); return; }
      $('dListBox').innerHTML = L.listView([
        { label: 'Company', render: function (x) { return '<b>' + esc(x.trading_name || x.company_name) + '</b>' + (x.trading_name ? '<div class="small muted">' + esc(x.company_name) + '</div>' : '') + (x.is_test ? ' ' + L.pill('Test', 'warn') : ''); } },
        { label: 'Status', render: function (x) { return pill(x.stage || x.status); } }, { label: 'Price group', render: function (x) { return esc(x.group_name || ''); } },
        { label: 'Contact', render: function (x) { return esc(x.contact_name) + '<div class="small muted">' + esc(x.email) + '</div>'; } }, { label: 'Location', render: function (x) { return esc([x.city, x.province, x.country === 'South Africa' ? '' : x.country].filter(Boolean).join(', ')); } },
        { label: 'Reg. no.', render: function (x) { return esc(x.cipc_no || ''); } }, { label: 'Docs', num: true, render: function (x) { return x.documents; } }, { label: 'Orders', num: true, render: function (x) { return x.orders; } },
        { label: 'Registered', render: function (x) { return '<span class="small">' + esc(L.dt(x.submitted_at)) + '</span>'; } }
      ], rows, function (x) { return L.href('dealers', [x.id]); });
    } catch (e) { L.fail(e); }
  }
  async function dExcel() {
    try {
      var rows = await L.fetchAll(function () { return sb.from('stravik_dealers').select('*').order('company_name'); });
      var cols = ['status', 'price_group', 'company_name', 'trading_name', 'cipc_no', 'vat_no', 'business_type', 'years_trading', 'owner_name', 'contact_name', 'contact_role', 'email', 'mobile', 'phone', 'accounts_email', 'country', 'province', 'city', 'store_address', 'postal_code', 'delivery_address', 'receiving_hours', 'truck_access', 'ranges_interest', 'monthly_volume', 'dpw_customer_code', 'review_note', 'submitted_at', 'sales_approved_by', 'sales_approved_at', 'pricing_approved_by', 'pricing_approved_at', 'final_approved_by', 'final_approved_at', 'reviewed_at', 'reviewed_by', 'is_test'];
      await L.saveXlsx([{ name: 'Customers', head: cols.map(L.label), rows: rows.map(function (r) { return cols.map(function (k) { var v = r[k]; return Array.isArray(v) ? v.join(', ') : v == null ? '' : v; }); }) }], 'Stravik_customers_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }

  // =================================================================== customer form
  async function dForm(id) {
    try {
      await groups();
      var r = await Promise.all([sb.from('stravik_dealers').select('*').eq('id', id).maybeSingle(), sb.from('stravik_dealer_documents').select('*').eq('dealer_id', id).order('id'), sb.from('stravik_order_list').select('*').eq('dealer_id', id).order('created_at', { ascending: false })]);
      var d = L.must(r[0]), docs = L.must(r[1]), orders = L.must(r[2]), ed = L.isEditor();
      if (!d) { L.cp({ crumbs: [['Customers', DB], ['Not found']] }); return L.content(L.empty('Account not found', '')); }
      var t = function (v) { return v == null || v === '' ? '' : esc(v); };
      var act = '', stg = stage(d), STEP = { 'Sales approval': 'sales', 'Pricing approval': 'pricing', 'Final approval': 'final' }[stg];
      var STEPNAME = { sales: 'Sales approval', pricing: 'Pricing approval', final: 'Final approval' };
      if (STEP) act += '<button type="button" class="btn" id="dApprove">' + STEPNAME[STEP] + '</button><button type="button" class="btn ghost" id="dReject">Ask for changes / reject</button>';
      if (ed) {
        if (d.status === 'Approved') act += '<button type="button" class="btn ghost" id="dGroup">Change price group</button><button type="button" class="btn ghost" id="dSuspend">Put on hold</button>';
        if (d.status === 'Suspended') act += '<button type="button" class="btn" id="dReinstate">Reinstate</button>';
        if (d.status === 'Rejected') act += '<button type="button" class="btn ghost" id="dReopen">Reopen for approval</button>';
        act += '<button type="button" class="btn ghost" id="dEdit">Edit details</button>';
      }
      var by = function (who, at, extra) { return at ? esc(who || '') + ' <span class="small muted">' + esc(L.dt(at)) + '</span>' + (extra || '') : '<span class="muted">waiting</span>'; };
      L.form({
        crumbs: [['Customers', DB], [d.trading_name || d.company_name]],
        actions: act,
        status: { steps: STAGES.concat(['Approved']).concat(d.status === 'Rejected' || d.status === 'Suspended' ? [d.status] : []), current: stg, clickable: false },
        sheet: '<div class="o-title"><h1>' + esc(d.trading_name || d.company_name) + '</h1>' + (d.is_test ? L.pill('Test account', 'warn') : '') + (d.group_name || d.price_group ? L.pill(gname(d.price_group), 'Website') : '') + '</div>' +
          '<div class="o-subtitle">' + esc(d.company_name) + ' · registered ' + esc(L.dt(d.submitted_at)) + (d.reviewed_at ? ' · reviewed ' + esc(L.dt(d.reviewed_at)) + ' by ' + esc(d.reviewed_by || '') : '') + '</div>' +
          (d.review_note ? '<div class="notice"><b>Note to the customer:</b> ' + esc(d.review_note) + '</div>' : '') +
          '<div class="o-groups">' +
          L.group('Approval', [['1. Sales team', by(d.sales_approved_by, d.sales_approved_at)], ['2. Pricing team', by(d.pricing_approved_by, d.pricing_approved_at, d.pricing_approved_at && d.price_group ? ' · ' + esc(gname(d.price_group)) : '')], ['3. Final approval', by(d.final_approved_by, d.final_approved_at)]]) +
          L.group('Business', [['Company', t(d.company_name)], ['Trading as', t(d.trading_name)], [d.country && d.country !== 'South Africa' ? 'Company reg. no.' : 'CIPC no.', t(d.cipc_no)], ['VAT no.', t(d.vat_no)], ['Type', t(d.business_type)], ['Years trading', t(d.years_trading)]]) +
          L.group('Contacts', [['Owner / director', t(d.owner_name)], ['Contact', t(d.contact_name) + (d.contact_role ? ' <span class="muted">(' + esc(d.contact_role) + ')</span>' : '')], ['Email (login)', '<a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a>'], ['Mobile', t(d.mobile)], ['Phone', t(d.phone)], ['Accounts email', t(d.accounts_email)]]) +
          L.group('Address', [['Country', t(d.country)], [d.country && d.country !== 'South Africa' ? 'Region' : 'Province', t(d.province)], ['City', t(d.city)], ['Store address', t(d.store_address)], ['Postal code', t(d.postal_code)], ['Delivery address', t(d.delivery_address)], ['Receiving hours', t(d.receiving_hours)], ['Truck access', t(d.truck_access)]]) +
          L.group('Our side', [['Price group', t(gname(d.price_group))], ['DPW customer code', t(d.dpw_customer_code)], ['Ranges of interest', t((d.ranges_interest || []).join(', '))], ['Monthly volume', t(d.monthly_volume)], ['Comments', t(d.comments)], ['Internal notes', t(d.internal_notes)], ['Consent', d.accepted_terms && d.accepted_popia ? 'Details confirmed, POPIA consent given ' + esc(L.dt(d.consent_at)) : '<span class="flag">Missing</span>']]) +
          '</div>' +
          L.notebook([
            { key: 'docs', label: 'Documents (' + docs.length + ')', html: docs.length ? '<table class="grid compact"><thead><tr><th>Document</th><th>File</th><th>Uploaded</th><th></th></tr></thead><tbody>' + docs.map(function (x) { return '<tr><td>' + esc(x.kind) + '</td><td>' + esc(x.file_name) + ' <span class="small muted">' + (x.size_bytes ? Math.round(x.size_bytes / 1024) + ' KB' : '') + '</span></td><td class="small">' + esc(L.dt(x.uploaded_at)) + '</td><td><button type="button" class="btn ghost small" data-doc="' + esc(x.path) + '">Open</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">No documents uploaded. Ask the customer to email them, or to upload them under “Update your details”.</p>' },
            { key: 'orders', label: 'Orders (' + orders.length + ')', html: orders.length ? L.listView([{ label: 'Order', render: function (o) { return '<b>' + esc(o.order_no) + '</b>'; } }, { label: 'Date', render: function (o) { return esc(L.dt(o.created_at)); } }, { label: 'Status', render: function (o) { return pill(o.status); } }, { label: 'Lines', num: true, render: function (o) { return o.lines; } }, { label: 'Total', num: true, render: function (o) { var t = o.total != null ? o.total : o.total_usd; return t == null ? '' : esc(omoney(t, o.currency)); } }, { label: 'Invoice', render: function (o) { return esc(o.invoice_no || ''); } }], orders, function (o) { return L.href('orders', [o.order_no]); }) : '<p class="muted">No orders yet.</p>' }
          ])
      });
      $('content').querySelectorAll('[data-doc]').forEach(function (b) {
        b.onclick = async function () { try { var u = L.must(await sb.storage.from('stravik-dealer-docs').createSignedUrl(b.dataset.doc, 300)); window.open(u.signedUrl, '_blank', 'noopener'); } catch (e) { L.fail(e); } };
      });
      var opt = function (sel) { return GROUPS.map(function (g) { return '<option value="' + esc(g.code) + '"' + (g.code === sel ? ' selected' : '') + '>' + esc(gopt(g)) + '</option>'; }).join(''); };
      var approve = async function (step, group, note) {
        L.must(await sb.rpc('stravik_dealer_approve', { p_id: id, p_step: step, p_price_group: group || null, p_note: note || null }));
        var m = step === 'final' || step === 'reject' ? await mail({ action: 'dealer-status', dealer_id: id }) : '';
        if (step === 'sales' || step === 'pricing') { try { await sb.functions.invoke('stravik-dealer-mail', { body: { action: 'approval-step', dealer_id: id } }); } catch (e) { /* the next approver also sees it in the list */ } }
        L.closeModal(); L.toast({ sales: 'Sales approval done · next: pricing team', pricing: 'Pricing approval done · next: final approval', final: 'Approved', reject: 'Sent back to the customer' }[step] + (m ? ' · ' + m : '')); GROUPS = []; dForm(id);
      };
      if ($('dApprove')) $('dApprove').onclick = function () {
        var intro = { sales: '<p>Step 1 of 3. Confirm the business details and documents are in order. Next, the pricing team chooses the price group.</p>',
          pricing: '<p>Step 2 of 3. Choose the price list this customer gets. Then it goes for final approval.</p>',
          final: '<p>Step 3 of 3. Price group: <b>' + esc(gname(d.price_group)) + '</b>. Once approved, the customer gets an email, sees these prices in the catalogue and can send order requests.</p>' }[STEP];
        L.modal(STEPNAME[STEP] + ': ' + (d.trading_name || d.company_name), intro +
          L.group('', (STEP === 'pricing' ? [['Price group', '<select id="apG"><option value="">Choose a price group…</option>' + opt(d.price_group || '') + '</select>']] : []).concat([['Note (internal, optional)', '<textarea id="apN"></textarea>']])) +
          (STEP === 'pricing' || STEP === 'final' ? '<div id="apP"></div>' : '') +
          '<div class="o-footer"><button class="btn" id="apGo"' + (STEP === 'pricing' && !d.price_group ? ' disabled' : '') + '>' + (STEP === 'final' ? 'Approve customer' : 'Approve') + '</button><button class="btn ghost" id="apX">Cancel</button></div>', STEP === 'pricing' || STEP === 'final');
        $('apX').onclick = L.closeModal;
        if ($('apP')) tierPreview($('apP'), id, STEP === 'pricing' ? $('apG').value : d.price_group, d.trading_name || d.company_name);
        if ($('apG')) $('apG').onchange = function () { $('apGo').disabled = !this.value; tierPreview($('apP'), id, this.value, d.trading_name || d.company_name); };
        $('apGo').onclick = function () { var b = this; b.disabled = true; approve(STEP, $('apG') ? $('apG').value : null, $('apN').value.trim()).catch(function (e) { b.disabled = false; L.fail(e); }); };
      };
      if ($('dReject')) $('dReject').onclick = function () {
        L.modal('Ask for changes or reject', '<p>The customer sees this note on their account page and gets it by email. When they update their details and send them again, the approval starts again from the sales team.</p><textarea id="rjN" rows="4" placeholder="e.g. Please upload your CIPC certificate and VAT certificate.">' + esc(d.review_note || '') + '</textarea>' +
          '<div class="o-footer"><button class="btn" id="rjGo">Send</button><button class="btn ghost" id="rjX">Cancel</button></div>');
        $('rjX').onclick = L.closeModal;
        $('rjGo').onclick = function () { var b = this; if (!$('rjN').value.trim()) return L.toast('Write a note for the customer'); b.disabled = true; approve('reject', null, $('rjN').value.trim()).catch(function (e) { b.disabled = false; L.fail(e); }); };
      };
      if (!ed) return;
      var setStatus = async function (patch, label) {
        L.must(await sb.from('stravik_dealers').update(patch).eq('id', id));
        var m = patch.status && patch.status !== d.status && patch.status !== 'Pending' ? await mail({ action: 'dealer-status', dealer_id: id }) : '';
        L.closeModal(); L.toast(label + (m ? ' · ' + m : '')); GROUPS = []; dForm(id);
      };
      if ($('dReinstate')) $('dReinstate').onclick = function () { if (confirm('Reinstate this account? The customer sees their prices and can order again.')) setStatus({ status: 'Approved' }, 'Reinstated').catch(L.fail); };
      if ($('dReopen')) $('dReopen').onclick = function () { if (confirm('Reopen this account for approval? It starts again at the sales team.')) setStatus({ status: 'Pending', sales_approved_at: null, sales_approved_by: null, pricing_approved_at: null, pricing_approved_by: null, final_approved_at: null, final_approved_by: null }, 'Reopened').catch(L.fail); };
      if ($('dSuspend')) $('dSuspend').onclick = function () { if (confirm('Put this account on hold? The customer can no longer see prices or order.')) setStatus({ status: 'Suspended' }, 'On hold').catch(L.fail); };
      if ($('dGroup')) $('dGroup').onclick = function () {
        L.modal('Change price group', L.group('', [['Price group', '<select id="cgG">' + opt(d.price_group) + '</select>'], ['DPW customer code', '<input id="cgC" value="' + esc(d.dpw_customer_code || '') + '">']]) + '<div id="cgP"></div><div class="o-footer"><button class="btn" id="cgGo">Save</button><button class="btn ghost" id="cgX">Cancel</button></div>', true);
        $('cgX').onclick = L.closeModal;
        tierPreview($('cgP'), id, $('cgG').value, d.trading_name || d.company_name); $('cgG').onchange = function () { tierPreview($('cgP'), id, this.value, d.trading_name || d.company_name); };
        $('cgGo').onclick = function () { setStatus({ price_group: $('cgG').value, dpw_customer_code: $('cgC').value.trim() || null }, 'Saved').catch(L.fail); };
      };
      $('dEdit').onclick = function () {
        var F = [['company_name', 'Company'], ['trading_name', 'Trading as'], ['cipc_no', 'CIPC no.'], ['vat_no', 'VAT no.'], ['contact_name', 'Contact'], ['mobile', 'Mobile'], ['phone', 'Phone'], ['accounts_email', 'Accounts email'], ['province', 'Province'], ['city', 'City'], ['store_address', 'Store address'], ['delivery_address', 'Delivery address'], ['receiving_hours', 'Receiving hours'], ['truck_access', 'Truck access'], ['dpw_customer_code', 'DPW customer code'], ['internal_notes', 'Internal notes']];
        L.modal('Edit ' + (d.trading_name || d.company_name), L.group('', F.map(function (f) { return [f[1], /address|notes/.test(f[0]) ? '<textarea data-k="' + f[0] + '">' + esc(d[f[0]] || '') + '</textarea>' : '<input data-k="' + f[0] + '" value="' + esc(d[f[0]] || '') + '">']; }).concat([['Test account', '<label><input type="checkbox" id="edT"' + (d.is_test ? ' checked' : '') + '> mark as a test (orders are tagged [TEST])</label>']])) +
          '<div class="o-footer"><button class="btn" id="edGo">Save</button><button class="btn ghost" id="edX">Cancel</button></div>', true);
        $('edX').onclick = L.closeModal;
        $('edGo').onclick = async function () {
          var p = { is_test: $('edT').checked };
          $('modalBody').querySelectorAll('[data-k]').forEach(function (i) { p[i.dataset.k] = i.value.trim() || null; });
          if (!p.company_name || !p.contact_name) return L.toast('Company and contact are required');
          try { L.must(await sb.from('stravik_dealers').update(p).eq('id', id)); L.closeModal(); L.toast('Saved'); dForm(id); } catch (e) { L.fail(e); }
        };
      };
    } catch (e) { L.fail(e); }
  }

  // =================================================================== prices per group
  async function prices() {
    try {
      GROUPS = []; await groups();
      L.cp({ crumbs: [['Customers', DB], ['Prices']], buttons: '<button type="button" class="btn editor-only" id="pUp">Upload prices</button><button type="button" class="btn ghost" id="pTpl">Download price list</button>' });
      L.content('<p class="muted" style="max-width:820px"><b>South African customers on T1–T5 or Retail</b> see their tier\'s price in rand from the <a href="#/pricing">Pricing</a> price lists, excl. and incl. 15% VAT, and order in rand. The USD prices below are for the battery preferred distributors (batteries only), and for tier customers outside a priced region. A part without a price for the group shows “on request” and can still be ordered. ' +
        'Download the list, fill in or change the prices per group, and upload it again. An empty cell leaves the price as it is; type <b>0</b> only for a free part, or <b>-</b> to remove a price.</p>' +
        '<div class="o-list"><table class="grid compact"><thead><tr><th>Group</th><th>Ranges</th><th class="num">Parts with a price</th><th class="num">Approved accounts</th></tr></thead><tbody>' +
        GROUPS.map(function (g) { return '<tr><td><b>' + esc(g.name) + '</b>' + (g.description ? '<div class="small muted">' + esc(g.description) + '</div>' : '') + '</td><td>' + esc(g.categories ? g.categories.join(', ') : 'All ranges') + '</td><td class="num">' + Number(g.priced_parts).toLocaleString() + '</td><td class="num">' + g.approved_accounts + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="small muted" style="margin-top:12px">Download options: all ranges, or one range (choose below).</p><select id="pRange" style="max-width:320px">' + L.rangeOptions(true, 'Batteries') + '</select>');
      $('pTpl').onclick = function () { priceList($('pRange').value); };
      $('pUp').onclick = function () { L.pickFile(priceUpload); };
    } catch (e) { L.fail(e); }
  }
  async function priceList(range) {
    try {
      L.toast('Preparing the price list…');
      var parts = await L.fetchAll(function () { var q = sb.from('stravik_parts').select('sv_pn,short_desc,subcategory,part_type').eq('on_website', true).neq('status', 'Inactive').order('subcategory').order('sv_pn'); return range ? q.eq('subcategory', range) : q; });
      var gp = await L.fetchAll(function () { return sb.from('stravik_group_prices').select('sv_pn,group_code,price_usd').order('sv_pn'); });
      var by = {}; gp.forEach(function (x) { (by[x.sv_pn] = by[x.sv_pn] || {})[x.group_code] = Number(x.price_usd); });
      var lc = {}; (await L.fetchAll(function () { return sb.from('stravik_price_list').select('sv_pn,fob_usd,landed_cost').eq('cond', 'N').order('sv_pn'); })).forEach(function (x) { lc[x.sv_pn] = x; });
      var head = ['Stravik PN', 'Description', 'Range', 'Type', 'FOB USD', 'Landed cost USD'].concat(GROUPS.map(function (g) { return g.name + ' USD'; }));
      await L.saveXlsx([{ name: 'Prices', widths: [14, 50, 18, 8, 10, 14].concat(GROUPS.map(function () { return 14; })), head: head,
        rows: parts.map(function (p) { var b = by[p.sv_pn] || {}, c = lc[p.sv_pn] || {}; return [p.sv_pn, p.short_desc, p.subcategory, p.part_type, c.fob_usd == null ? '' : Number(c.fob_usd), c.landed_cost == null ? '' : Number(c.landed_cost)].concat(GROUPS.map(function (g) { return b[g.code] == null ? '' : b[g.code]; })); }) }],
        'Stravik_customer_prices' + (range ? '_' + range.replace(/\W+/g, '_') : '') + '_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }
  async function priceUpload(f) {
    L.modal('Upload prices', '<p class="muted">Reading ' + esc(f.name) + '…</p>', true);
    try {
      await groups();
      var rows = await L.readRows(f); if (rows.length < 2) return L.modal('Upload prices', '<p class="flag">The file is empty.</p>');
      var head = rows[0].map(L.normHead), pi = head.findIndex(function (h) { return L.PN_COLS.indexOf(h) >= 0; });
      if (pi < 0) return L.modal('Upload prices', '<p class="flag">No "Stravik PN" column found.</p>');
      var gcols = GROUPS.map(function (g) { var k = L.normHead(g.name), i = head.findIndex(function (h) { return h === k + 'usd' || h === k || h === L.normHead(g.code); }); return { g: g, i: i }; }).filter(function (x) { return x.i >= 0; });
      if (!gcols.length) return L.modal('Upload prices', '<p class="flag">No price columns found. Use the headings from the downloaded list, e.g. "Preferred distributor USD", "Tier 1 USD".</p>');
      var pns = rows.slice(1).map(function (r) { return L.pnNorm(r[pi]); }).filter(Boolean), rmap = await L.resolvePns(pns);
      var parts = {}; for (var ch of L.chunks(Object.values(rmap), 300)) L.must(await sb.from('stravik_parts').select('sv_pn,subcategory').in('sv_pn', ch)).forEach(function (p) { parts[p.sv_pn] = p; });
      var cur = {}; (await L.fetchAll(function () { return sb.from('stravik_group_prices').select('sv_pn,group_code,price_usd'); })).forEach(function (x) { cur[x.sv_pn + '|' + x.group_code] = Number(x.price_usd); });
      var up = [], del = [], bad = [], unknown = [], skipped = 0;
      rows.slice(1).forEach(function (r, n) {
        var raw = L.pnNorm(r[pi]); if (!raw) return; var pn = rmap[raw];
        if (!pn) { unknown.push(raw); return; }
        gcols.forEach(function (c) {
          var v = String(r[c.i] == null ? '' : r[c.i]).trim(), k = pn + '|' + c.g.code;
          if (v === '') return;
          if (c.g.categories && parts[pn] && c.g.categories.indexOf(parts[pn].subcategory) < 0) { skipped++; return; }
          if (v === '-') { if (cur[k] != null) del.push({ sv_pn: pn, group_code: c.g.code }); return; }
          var x = L.num(v); if (Number.isNaN(x) || x < 0) { bad.push('Row ' + (n + 2) + ' (' + pn + '), ' + c.g.name + ': "' + v + '" is not a price'); return; }
          x = Math.round(x * 100) / 100; if (cur[k] !== x) up.push({ sv_pn: pn, group_code: c.g.code, price_usd: x, old: cur[k] });
        });
      });
      L.modal('Upload prices', '<p>' + esc(f.name) + ': price columns ' + gcols.map(function (c) { return '<b>' + esc(c.g.name) + '</b>'; }).join(', ') + '. <b>' + up.length + '</b> prices will be added or changed' + (del.length ? ', <b>' + del.length + '</b> removed' : '') + '.' +
        (unknown.length ? ' <span class="flag">' + unknown.length + ' part numbers not found (skipped): ' + esc(unknown.slice(0, 8).join(', ')) + (unknown.length > 8 ? '…' : '') + '</span>' : '') +
        (skipped ? ' <span class="muted">' + skipped + ' prices outside a group\'s ranges ignored (e.g. non-battery prices for preferred distributors).</span>' : '') + '</p>' +
        (bad.length ? '<div class="notice bad"><b>Fix these first:</b><ul>' + bad.slice(0, 30).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' : '') +
        (up.length ? '<div class="o-list"><table class="grid"><thead><tr><th>Stravik PN</th><th>Group</th><th class="num">Now</th><th class="num">New</th></tr></thead><tbody>' + up.slice(0, 300).map(function (x) { return '<tr><td class="pn">' + esc(x.sv_pn) + '</td><td>' + esc(gname(x.group_code)) + '</td><td class="num">' + L.money(x.old) + '</td><td class="num"><b>' + L.money(x.price_usd) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' + (up.length > 300 ? '<p class="small muted">…and ' + (up.length - 300) + ' more.</p>' : '') : '') +
        '<div class="o-footer"><button class="btn" id="puGo"' + (bad.length || !(up.length || del.length) ? ' disabled' : '') + '>Save ' + (up.length + del.length) + ' changes</button><button class="btn ghost" id="puX">Cancel</button></div>', true);
      $('puX').onclick = L.closeModal;
      $('puGo').onclick = async function () {
        var b = this; b.disabled = true; b.textContent = 'Saving…';
        try {
          for (var c of L.chunks(up.map(function (x) { return { sv_pn: x.sv_pn, group_code: x.group_code, price_usd: x.price_usd }; }), 500)) L.must(await sb.from('stravik_group_prices').upsert(c, { onConflict: 'sv_pn,group_code' }));
          for (var x of del) L.must(await sb.from('stravik_group_prices').delete().eq('sv_pn', x.sv_pn).eq('group_code', x.group_code));
          L.closeModal(); L.toast('Saved ' + (up.length + del.length) + ' price changes'); prices();
        } catch (e) { L.fail(e); b.disabled = false; b.textContent = 'Try again'; }
      };
    } catch (e) { L.fail(e); }
  }

  // =================================================================== order email settings
  async function settings() {
    try {
      var ORD = ['approvers_sales', 'approvers_pricing', 'approvers_final', 'order_email_team', 'order_email_dpw', 'order_email_from', 'site_url'], rank = function (k) { var i = ORD.indexOf(k); return i < 0 ? 99 : i; };
      var rows = L.must(await sb.from('stravik_settings').select('*').order('key')).sort(function (x, y) { return rank(x.key) - rank(y.key); }), ed = L.isEditor();
      L.cp({ crumbs: [['Customers', DB], ['Settings']], buttons: ed ? '<button type="button" class="btn" id="seSave">Save</button>' : '' });
      L.content('<div class="o-sheet" style="max-width:820px"><p class="muted">Approvers: the staff who may give each approval step, by their admin login email (several separated by commas). They also need a staff login. Emails go out through Resend.</p>' +
        rows.map(function (r) { return '<div class="o-field" style="grid-template-columns:200px minmax(0,1fr)"><label for="se_' + esc(r.key) + '">' + esc(({ approvers_sales: '1. Sales team', approvers_pricing: '2. Pricing team', approvers_final: '3. Final approval (Pedro)', order_email_dpw: 'Fulfilment centre email (DP World SA)', order_email_team: 'Our team email', order_email_from: 'Sender', site_url: 'Website address' })[r.key] || L.label(r.key)) + '</label><div class="o-val"><input id="se_' + esc(r.key) + '" data-k="' + esc(r.key) + '" value="' + esc(r.value || '') + '"' + (ed ? '' : ' readonly') + '><div class="small muted">' + esc(r.description || '') + '</div></div></div>'; }).join('') + '</div>');
      if (!ed) return;
      $('seSave').onclick = async function () {
        try { for (var i of Array.from($('content').querySelectorAll('[data-k]'))) L.must(await sb.from('stravik_settings').update({ value: i.value.trim() }).eq('key', i.dataset.k)); L.toast('Saved'); } catch (e) { L.fail(e); }
      };
    } catch (e) { L.fail(e); }
  }

  L.register({
    key: 'dealers', name: 'Customers', color: '#2f7d5b',
    icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.4 3.2-5.2 6-5.2s5.2 1.8 6 5.2"/><path d="M16 6.5a3 3 0 0 1 0 5.6M18 14.6c1.6.7 2.6 2.4 3 5.4"/>',
    menus: [{ label: 'Accounts', href: DB }, { label: 'Prices', href: L.href('dealers', ['prices']) }, { label: 'Settings', href: L.href('dealers', ['settings']) }, { label: 'Orders', href: OB }],
    route: function (r) { var p = r.parts[0]; if (p === 'prices') prices(); else if (p === 'settings') settings(); else if (p) dForm(p); else dList(); }
  });

  // =================================================================== orders
  var O = L.state.orders = { text: '', active: {}, offset: 0 };
  var OSTAT = ['Submitted', 'With DPW', 'Invoiced', 'Dispatched', 'Delivered', 'Cancelled'];
  var OFILTERS = OSTAT.map(function (s) { return { key: 'st_' + s, label: s, group: 'Status' }; }).concat([{ key: 'mailbad', label: 'Email not sent', group: 'Email' }, { key: 'real', label: 'Hide test orders', group: 'Other' }]);
  async function oList() {
    await groups();
    L.cp({ crumbs: [['Orders', OB]], buttons: '<button type="button" class="btn ghost" id="oXls">Download</button>' });
    L.searchBar({ placeholder: 'Search order no., company, PO, invoice…', text: O.text, filters: OFILTERS, active: O.active, onChange: function (s) { O.text = s.text; O.active = s.active; O.offset = 0; oLoad(); } });
    L.content('<div id="oListBox"></div>');
    $('oXls').onclick = oExcel; oLoad();
  }
  function oQuery(opts) {
    var q = sb.from('stravik_order_list').select('*', opts);
    var st = OSTAT.filter(function (s) { return O.active['st_' + s]; }); if (st.length) q = q.in('status', st);
    if (O.active.mailbad) q = q.neq('email_status', 'sent');
    if (O.active.real) q = q.eq('is_test', false);
    var s = L.orSearch(['order_no', 'company_name', 'po_ref', 'invoice_no', 'waybill_no'], O.text); if (s) q = q.or(s);
    return q.order('created_at', { ascending: false });
  }
  async function oLoad() {
    try {
      var res = await oQuery({ count: 'exact' }).range(O.offset, O.offset + L.PAGE - 1), rows = L.must(res);
      L.pager(O.offset, res.count || 0, function (o) { O.offset = o; oLoad(); });
      if (!rows.length) { $('oListBox').innerHTML = L.empty('No orders yet', 'Approved customers place orders from their cart on the website. Each order is emailed to DP World SA and to us, and shows up here.'); return; }
      $('oListBox').innerHTML = L.listView([
        { label: 'Order', render: function (o) { return '<b>' + esc(o.order_no) + '</b>' + (o.is_test ? ' ' + L.pill('Test', 'warn') : ''); } }, { label: 'Date', render: function (o) { return '<span class="small">' + esc(L.dt(o.created_at)) + '</span>'; } },
        { label: 'Customer', render: function (o) { return esc(o.company_name) + '<div class="small muted">' + esc(gname(o.price_group)) + '</div>'; } }, { label: 'Status', render: function (o) { return pill(o.status); } },
        { label: 'PO', render: function (o) { return esc(o.po_ref || ''); } }, { label: 'Lines', num: true, render: function (o) { return o.lines; } }, { label: 'Units', num: true, render: function (o) { return o.units; } },
        { label: 'Total', num: true, render: function (o) { var t = o.total != null ? o.total : o.total_usd; return t == null ? '' : esc(omoney(t, o.currency)) + (o.vat_amount ? '<div class="small muted">incl. VAT</div>' : ''); } }, { label: 'Email', render: function (o) { return o.email_status === 'sent' ? '<span class="ok">Sent</span>' : '<span class="flag">' + esc(o.email_status) + '</span>'; } },
        { label: 'DPW invoice', render: function (o) { return esc(o.invoice_no || '') + (o.invoice_amount != null ? ' <span class="small muted">' + L.money(o.invoice_amount) + '</span>' : ''); } }
      ], rows, function (o) { return L.href('orders', [o.order_no]); });
    } catch (e) { L.fail(e); }
  }
  async function oExcel() {
    try {
      var os = await L.fetchAll(function () { return oQuery(); });
      var items = await L.fetchAll(function () { return sb.from('stravik_order_items').select('order_id,line,sv_pn,description,qty,unit_price,line_total,unit_price_usd,line_total_usd').order('order_id').order('line'); });
      var byId = {}; os.forEach(function (o) { byId[o.id] = o; });
      await L.saveXlsx([
        { name: 'Orders', head: ['Order', 'Date', 'Customer', 'Price group', 'Status', 'PO', 'Lines', 'Units', 'Currency', 'Subtotal excl. VAT', 'VAT', 'Total', 'Email', 'DPW invoice', 'Invoice amount', 'Waybill', 'Test'], rows: os.map(function (o) { return [o.order_no, L.dt(o.created_at), o.company_name, gname(o.price_group), o.status, o.po_ref || '', o.lines, o.units, o.currency || 'USD', o.subtotal != null ? Number(o.subtotal) : o.total_usd == null ? '' : Number(o.total_usd), o.vat_amount == null ? '' : Number(o.vat_amount), o.total != null ? Number(o.total) : o.total_usd == null ? '' : Number(o.total_usd), o.email_status, o.invoice_no || '', o.invoice_amount == null ? '' : Number(o.invoice_amount), o.waybill_no || '', o.is_test ? 'Yes' : '']; }) },
        { name: 'Order lines', head: ['Order', 'Customer', 'Line', 'Stravik PN', 'Description', 'Qty', 'Currency', 'Unit price excl. VAT', 'Line total excl. VAT'], rows: items.filter(function (i) { return byId[i.order_id]; }).map(function (i) { var o = byId[i.order_id]; return [o.order_no, o.company_name, i.line, i.sv_pn, i.description, i.qty, o.currency || 'USD', (i.unit_price != null ? i.unit_price : i.unit_price_usd) == null ? '' : Number(i.unit_price != null ? i.unit_price : i.unit_price_usd), (i.line_total != null ? i.line_total : i.line_total_usd) == null ? '' : Number(i.line_total != null ? i.line_total : i.line_total_usd)]; }) }
      ], 'Stravik_orders_' + L.today() + '.xlsx');
    } catch (e) { L.fail(e); }
  }
  async function oForm(no) {
    try {
      await groups();
      var o = L.must(await sb.from('stravik_orders').select('*').eq('order_no', no).maybeSingle());
      if (!o) { L.cp({ crumbs: [['Orders', OB], [no]] }); return L.content(L.empty('Order not found', '')); }
      var r = await Promise.all([sb.from('stravik_order_items').select('*').eq('order_id', o.id).order('line'), sb.from('stravik_dealers').select('id,company_name,trading_name,email,cipc_no,dpw_customer_code,country').eq('id', o.dealer_id).single()]);
      var items = L.must(r[0]), d = L.must(r[1]), ed = L.isEditor(), ro = ed ? '' : ' readonly';
      var inp = function (k, type) { return '<input data-k="' + k + '"' + (type ? ' type="' + type + '"' : '') + ' value="' + esc(o[k] == null ? '' : o[k]) + '"' + ro + '>'; };
      L.form({
        crumbs: [['Orders', OB], [o.order_no]],
        buttons: ed ? '<button type="button" class="btn" id="oSave">Save</button>' : '',
        actions: (ed ? '<button type="button" class="btn ghost" id="oMail">' + (o.email_status === 'sent' ? 'Send the email again' : 'Send the email') + '</button>' : '') + '<a class="btn ghost" href="' + L.href('dealers', [d.id]) + '">Open customer</a>',
        status: { steps: OSTAT, current: o.status, clickable: ed, onClick: async function (s) { try { L.must(await sb.from('stravik_orders').update({ status: s }).eq('id', o.id)); L.toast('Status: ' + s); oForm(no); } catch (e) { L.fail(e); } } },
        sheet: '<div class="o-title"><h1>' + esc(o.order_no) + '</h1>' + (o.is_test ? L.pill('Test', 'warn') : '') + '</div><div class="o-subtitle">' + esc(d.trading_name || d.company_name) + ' · ' + esc(gname(o.price_group)) + ' · ' + esc(L.dt(o.created_at)) + '</div>' +
          '<div class="notice' + (o.email_status === 'sent' ? ' good' : ' bad') + '">Email to DP World SA and us: <b>' + esc(o.email_status) + '</b>' + (o.email_sent_at ? ' · ' + esc(L.dt(o.email_sent_at)) : '') + (o.email_error ? '<div class="small">' + esc(o.email_error) + '</div>' : '') + '</div>' +
          '<div class="o-groups">' + L.group('Order', [['Customer PO', esc(o.po_ref || '')], ['Contact', esc(o.contact_name || '') + ' · ' + esc(o.contact_phone || '')], ['Deliver to', esc(o.delivery_address || '')], ['Notes', esc(o.notes || '')], ['Company reg. no.', esc(d.cipc_no || '')], ['DPW customer code', esc(d.dpw_customer_code || '')]]) +
          L.group('From DP World SA', [['DPW reference', inp('dpw_ref')], ['Invoice no.', inp('invoice_no')], ['Invoice date', inp('invoice_date', 'date')], ['Invoice amount', inp('invoice_amount')], ['Invoice currency', inp('invoice_currency')], ['Dispatched', inp('dispatched_at', 'date')], ['Waybill no.', inp('waybill_no')], ['Delivered', inp('delivered_at', 'date')], ['Notes', '<textarea data-k="dpw_notes"' + ro + '>' + esc(o.dpw_notes || '') + '</textarea>']]) + '</div>' +
          L.notebook([{ key: 'lines', label: 'Parts (' + items.length + ')', html: '<table class="grid"><thead><tr><th>#</th><th>Stravik PN</th><th>Description</th><th>Range</th><th class="num">Qty</th><th class="num">Unit ' + esc(o.currency || 'USD') + (o.vat_rate ? ' excl. VAT' : '') + '</th><th class="num">Total ' + esc(o.currency || 'USD') + (o.vat_rate ? ' excl. VAT' : '') + '</th></tr></thead><tbody>' +
            items.map(function (i) { return '<tr><td>' + i.line + '</td><td class="pn"><a href="' + L.href('parts', ['p', i.sv_pn]) + '">' + esc(i.sv_pn) + '</a></td><td>' + esc(i.description || '') + '</td><td>' + esc(i.subcategory || '') + '</td><td class="num">' + i.qty + '</td><td class="num">' + ((i.unit_price != null ? i.unit_price : i.unit_price_usd) == null ? '<span class="muted">on request</span>' : L.money(i.unit_price != null ? i.unit_price : i.unit_price_usd)) + '</td><td class="num">' + L.money(i.line_total != null ? i.line_total : i.line_total_usd) + '</td></tr>'; }).join('') +
            '</tbody><tfoot>' + (o.vat_rate ? '<tr><td colspan="6">Subtotal excl. VAT</td><td class="num">' + L.money(o.subtotal) + '</td></tr><tr><td colspan="6">VAT ' + Math.round(o.vat_rate * 100) + '%</td><td class="num">' + L.money(o.vat_amount) + '</td></tr>' : '') +
            '<tr><td colspan="4">' + o.lines + ' lines</td><td class="num">' + o.units + '</td><td>' + (o.vat_rate ? 'Total incl. VAT' : '') + '</td><td class="num"><b>' + esc(omoney(o.total != null ? o.total : o.total_usd, o.currency)) + '</b></td></tr></tfoot></table>' }])
      });
      if (!ed) return;
      $('oSave').onclick = async function () {
        var p = {};
        $('content').querySelectorAll('[data-k]').forEach(function (i) { p[i.dataset.k] = i.value.trim() || null; });
        if (p.invoice_amount != null) { var n = L.num(p.invoice_amount); if (Number.isNaN(n)) return L.toast('Invoice amount must be a number'); p.invoice_amount = n; }
        try { L.must(await sb.from('stravik_orders').update(p).eq('id', o.id)); L.toast('Saved'); oForm(no); } catch (e) { L.fail(e); }
      };
      $('oMail').onclick = async function () { this.disabled = true; L.toast(await mail({ action: 'order', order_no: o.order_no })); oForm(no); };
    } catch (e) { L.fail(e); }
  }
  L.register({
    key: 'orders', name: 'Orders', color: '#8a6326',
    icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>',
    menus: [{ label: 'Orders', href: OB }, { label: 'Customers', href: DB }],
    route: function (r) { if (r.parts[0]) oForm(r.parts[0]); else oList(); }
  });
})(window.LS);
