// Orders in the admin site: the approval chain (sales, finance, supply chain) before an order is released to DP World
// InSync, and the list of DP World InSync people who may use its portal (/insync/). Database: stravik_order_approve(),
// stravik_order_my_steps(), stravik_partner_users. Emails: edge function stravik-dealer-mail, action "order-step".
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [from, to] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(`${file}: expected the text once, found it ${n} times: ${from.slice(0, 70)}`); process.exit(1); }
    s = s.replace(from, () => to);
  }
  fs.writeFileSync(file, s);
  console.log(file + ": updated");
}

edit("admin/m-dealers.js", [
  // stages and filters
  ["  var OFILTERS = OSTAT.map(function (s) { return { key: 'st_' + s, label: s, group: 'Status' }; }).concat([",
   "  // an order is approved by sales, then finance, then supply chain; the third approval releases it to DP World InSync\n" +
   "  var OSTAGES = ['Sales approval', 'Finance approval', 'Supply chain approval'], OSTEPS = OSTAGES.concat(['With DPW', 'Invoiced', 'Dispatched', 'Delivered']);\n" +
   "  var ostage = function (o) { return o.status !== 'Submitted' ? o.status : !o.sales_approved_at ? OSTAGES[0] : !o.finance_approved_at ? OSTAGES[1] : !o.supply_approved_at ? OSTAGES[2] : 'With DPW'; };\n" +
   "  var OFILTERS = OSTAGES.map(function (s, i) { return { key: 'sg_' + i, label: 'Waiting for ' + s.toLowerCase(), group: 'Approval' }; }).concat(OSTAT.map(function (s) { return { key: 'st_' + s, label: s === 'Submitted' ? 'Being approved' : s === 'With DPW' ? 'With DP World InSync' : s, group: 'Status' }; })).concat(["],
  ["    var st = OSTAT.filter(function (s) { return O.active['st_' + s]; }); if (st.length) q = q.in('status', st);\n",
   "    var st = OSTAT.filter(function (s) { return O.active['st_' + s]; }); if (st.length) q = q.in('status', st);\n" +
   "    var sg = OSTAGES.filter(function (s, i) { return O.active['sg_' + i]; }); if (sg.length) q = q.in('stage', sg);\n"],
  ["{ label: 'Customer', render: function (o) { return esc(o.company_name) + '<div class=\"small muted\">' + esc(gname(o.price_group)) + '</div>'; } }, { label: 'Status', render: function (o) { return pill(o.status); } },",
   "{ label: 'Customer', render: function (o) { return esc(o.trading_name || o.company_name) + '<div class=\"small muted\">' + esc((o.network_name ? o.network_name + ' · ' : '') + gname(o.price_group)) + '</div>'; } }, { label: 'Status', render: function (o) { return pill(o.stage || o.status); } },"],
  ["Submitted: 'New', 'With DPW': 'Quoted',", "Submitted: 'New', 'Finance approval': 'New', 'Supply chain approval': 'New', 'With DPW': 'Quoted',"],
  ["    menus: [{ label: 'Orders', href: OB }, { label: 'Customers', href: DB }],\n    route: function (r) { if (r.parts[0]) oForm(r.parts[0]); else oList(); }",
   "    menus: [{ label: 'Orders', href: OB }, { label: 'DP World InSync users', href: L.href('orders', ['insync-users']) }, { label: 'Customers', href: DB }],\n    route: function (r) { if (r.parts[0] === 'insync-users') pUsers(); else if (r.parts[0]) oForm(r.parts[0]); else oList(); }"],
  // the order: approval buttons, the chain, and the wording
  ["      var items = L.must(r[0]), d = L.must(r[1]), ed = L.isEditor(), ro = ed ? '' : ' readonly';\n",
   "      var items = L.must(r[0]), d = L.must(r[1]), ed = L.isEditor(), ro = ed ? '' : ' readonly';\n" +
   "      var stg = ostage(o), mine = []; try { mine = L.must(await sb.rpc('stravik_order_my_steps', { p_country: d.country })) || []; } catch (e) { mine = []; }\n" +
   "      var STEPKEY = { 'Sales approval': 'sales', 'Finance approval': 'finance', 'Supply chain approval': 'supply' }[stg], canStep = !!STEPKEY && mine.indexOf(STEPKEY) >= 0;\n" +
   "      var oby = function (who, at, note) { return at ? esc(who || '') + ' <span class=\"small muted\">' + esc(L.dt(at)) + '</span>' + stepNote(note) : '<span class=\"muted\">waiting</span>'; };\n" +
   "      var stepDialog = function (step, title) {\n" +
   "        var rej = step === 'reject';\n" +
   "        L.modal(title, '<p>' + (rej ? 'The order is cancelled and the customer is emailed your reason.' : step === 'supply' ? 'This is the last approval: the order is released to DP World InSync for pick, pack, invoice and delivery.' : 'The order moves to the next approval, and the people who give it are emailed.') + '</p>' +\n" +
   "          '<label for=\"osNote\">' + (rej ? 'Reason for the customer' : 'Note for the next step (optional)') + '</label><textarea id=\"osNote\" rows=\"3\" style=\"width:100%\"></textarea>' +\n" +
   "          '<div class=\"o-footer\"><button class=\"btn\" id=\"osGo\">' + (rej ? 'Cancel the order' : 'Approve') + '</button><button class=\"btn ghost\" id=\"osX\">Close</button></div>');\n" +
   "        $('osX').onclick = L.closeModal;\n" +
   "        $('osGo').onclick = async function () {\n" +
   "          var b = this; b.disabled = true;\n" +
   "          try {\n" +
   "            L.must(await sb.rpc('stravik_order_approve', { p_order_no: o.order_no, p_step: step, p_note: $('osNote').value.trim() || null }));\n" +
   "            L.closeModal(); L.toast((rej ? 'Order cancelled. ' : 'Approved. ') + await mail({ action: 'order-step', order_no: o.order_no })); oForm(no);\n" +
   "          } catch (e) { L.fail(e); b.disabled = false; }\n" +
   "        };\n" +
   "      };\n"],
  ["        actions: (ed ? '<button type=\"button\" class=\"btn ghost\" id=\"oMail\">'",
   "        actions: (canStep ? '<button type=\"button\" class=\"btn\" id=\"oApprove\">' + esc(stg) + '</button>' : '') + (STEPKEY && (mine.length || ed) ? '<button type=\"button\" class=\"btn ghost\" id=\"oReject\">Cancel the order</button>' : '') +\n" +
   "          (STEPKEY && !canStep ? '<span class=\"small muted\" style=\"align-self:center\">Waiting for the ' + esc(stg.toLowerCase()) + '.</span>' : '') + (ed ? '<button type=\"button\" class=\"btn ghost\" id=\"oMail\">'"],
  ["        status: { steps: OSTAT, current: o.status, clickable: ed, onClick: async function (s) { try {",
   "        status: { steps: OSTEPS.concat(!STEPKEY ? ['Cancelled'] : []), current: stg, clickable: ed && !STEPKEY, onClick: async function (s) { if (/approval$/.test(s)) return L.toast('The approvals are given with the approval button, in order.'); try {"],
  ["Email to DP World SA and us: <b>", "Latest email, to whoever acts next: <b>"],
  ["'<div class=\"o-groups\">' + L.group('Order', [['Customer PO'",
   "'<div class=\"o-groups\">' + L.group('Approval', [['1. Sales', oby(o.sales_approved_by, o.sales_approved_at, o.sales_note)], ['2. Finance', oby(o.finance_approved_by, o.finance_approved_at, o.finance_note)], ['3. Supply chain', oby(o.supply_approved_by, o.supply_approved_at, o.supply_note)],\n" +
   "            ['Released to DP World InSync', o.released_at ? esc(L.dt(o.released_at)) : '<span class=\"muted\">after the three approvals</span>']].concat(o.status === 'Cancelled' && o.reject_note ? [['Cancelled', esc(o.rejected_by || '') + stepNote(o.reject_note)]] : [])) +\n" +
   "          L.group('Order', [['Customer PO'"],
  ["L.group('From DP World SA', [", "L.group('From DP World InSync' + (o.dpw_updated_by ? ' (last updated by ' + o.dpw_updated_by + ')' : ''), ["],
  ["      if (!ed) return;\n      $('oSave').onclick = async function () {",
   "      if ($('oApprove')) $('oApprove').onclick = function () { stepDialog(STEPKEY, stg); };\n" +
   "      if ($('oReject')) $('oReject').onclick = function () { stepDialog('reject', 'Cancel the order'); };\n" +
   "      if (!ed) return;\n      $('oSave').onclick = async function () {"],
  // DP World InSync users
  ["  async function oForm(no) {\n",
   "  // the people at DP World InSync who may sign in to its portal (/insync/)\n" +
   "  async function pUsers() {\n" +
   "    L.cp({ crumbs: [['Orders', OB], ['DP World InSync users']], buttons: '' }); $('cpSearch').innerHTML = '';\n" +
   "    try {\n" +
   "      var rows = L.must(await sb.from('stravik_partner_users').select('*').order('is_test').order('email')), ed = L.isEditor();\n" +
   "      L.content('<p class=\"small muted\" style=\"margin:0 0 10px\">These people sign in at <b>/insync/</b> with their own email. They see the orders released to DP World InSync, with the store, the delivery details and the parts, and fill in their reference, the invoice, the waybill and the dates. They see no costs and no price lists. A new person creates a password on that page with \"First time here?\".</p>' +\n" +
   "        (ed ? '<div style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px\"><input id=\"puEmail\" type=\"email\" placeholder=\"name@company.com\" style=\"width:280px;margin:0\"><input id=\"puName\" placeholder=\"Name\" style=\"width:220px;margin:0\"><button type=\"button\" class=\"btn\" id=\"puAdd\">Add</button></div>' : '') +\n" +
   "        (rows.length ? '<div class=\"o-list\"><table class=\"grid\"><thead><tr><th>Email</th><th>Name</th><th>Sees</th><th>Access</th><th></th></tr></thead><tbody>' + rows.map(function (u) {\n" +
   "          return '<tr><td>' + esc(u.email) + '</td><td>' + esc(u.full_name || '') + '</td><td>' + (u.is_test ? L.pill('Test orders only', 'warn') : 'Real orders') + '</td><td>' + (u.active ? '<span class=\"ok\">Active</span>' : '<span class=\"flag\">Off</span>') + '</td><td>' + (ed ? '<button class=\"link\" data-pu=\"' + esc(u.email) + '\" data-on=\"' + (u.active ? '1' : '') + '\">' + (u.active ? 'Switch off' : 'Switch on') + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'\n" +
   "          : L.empty('No DP World InSync users yet', 'Add the email addresses of the people at DP World InSync who handle Stravik orders.')));\n" +
   "      if (!ed) return;\n" +
   "      $('puAdd').onclick = async function () {\n" +
   "        try {\n" +
   "          var e = $('puEmail').value.trim().toLowerCase(); if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e)) throw new Error('Enter an email address');\n" +
   "          L.must(await sb.from('stravik_partner_users').upsert({ email: e, full_name: $('puName').value.trim() || null, active: true }, { onConflict: 'email' })); L.toast('Added ' + e); pUsers();\n" +
   "        } catch (x) { L.fail(x); }\n" +
   "      };\n" +
   "      $('content').querySelectorAll('[data-pu]').forEach(function (b) { b.onclick = async function () { try { L.must(await sb.from('stravik_partner_users').update({ active: !b.dataset.on }).eq('email', b.dataset.pu)); pUsers(); } catch (x) { L.fail(x); } }; });\n" +
   "    } catch (e) { L.fail(e); }\n" +
   "  }\n" +
   "  async function oForm(no) {\n"],
]);

// The DP World InSync portal page (/insync/): the same shell as the Autobarn page, with its own script (assets/insync.js).
edit("assets/autobarn.css", [
  ["#otable > tbody > tr.ab-o > td:first-child{white-space:nowrap}\n",
   "#otable > tbody > tr.ab-o > td:first-child{white-space:nowrap}\n" +
   "\n/* DP World InSync portal (assets/insync.js): the opened order */\n" +
   ".is-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 30px;padding:8px 0 12px;font-size:14.5px}\n" +
   ".is-grid h3,.is-form h3{font-size:16px;margin:0 0 4px}\n" +
   ".is-grid p{margin:0 0 8px;color:var(--muted)}\n" +
   ".is-grid p b{color:var(--ink)}\n" +
   ".is-form{margin-top:14px;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:6px}\n" +
   ".is-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 14px;margin-top:8px}\n" +
   ".is-fields label{display:grid;gap:4px;font-size:13.5px;font-weight:600;color:var(--muted);align-content:start}\n" +
   ".is-fields label.wide{grid-column:1/-1}\n" +
   ".is-fields input,.is-fields textarea{font:inherit;font-size:15px;padding:8px 10px;border:1.5px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);width:100%;min-width:0}\n" +
   ".is-fields input:focus,.is-fields textarea:focus{border-color:var(--gold);outline:none}\n" +
   ".is-form .dhint{margin:8px 0 10px}\n" +
   "@media (max-width:900px){.is-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.is-grid{grid-template-columns:1fr}}\n" +
   "@media (max-width:520px){.is-fields{grid-template-columns:1fr}}\n"],
]);
edit("autobarn/index.html", [
  ['/assets/autobarn.css?v=1"', '/assets/autobarn.css?v=2"'],
]);
{
  let s = fs.readFileSync("autobarn/index.html", "utf8");
  const swap = [
    ["<title>Autobarn | Stravik</title>", "<title>DP World InSync | Stravik</title>"],
    ['content="Stravik for Autobarn stores: sign in to see your range and prices, order online and follow your orders."', 'content="Stravik orders for DP World InSync: released orders, invoices and deliveries."'],
    ["https://stravikparts.com/autobarn/", "https://stravikparts.com/insync/"],
    ['<body data-network="autobarn" data-network-name="Autobarn">', "<body>"],
    ["/assets/autobarn.js?v=2", "/assets/insync.js?v=1"],
  ];
  for (const [from, to] of swap) {
    if (s.split(from).length - 1 !== 1) { console.error("autobarn/index.html: expected the text once: " + from.slice(0, 60)); process.exit(1); }
    s = s.replace(from, () => to);
  }
  fs.mkdirSync("insync", { recursive: true });
  fs.writeFileSync("insync/index.html", s);
  console.log("insync/index.html: written");
}
