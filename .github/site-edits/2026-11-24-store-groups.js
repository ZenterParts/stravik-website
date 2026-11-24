// Store groups (networks such as Autobarn):
// 1. Registration form: "Does your store belong to a group?" (assets/dealer.js). The Autobarn page's "Register your
//    store" link chooses Autobarn in that field (assets/autobarn.js).
// 2. Admin > Customers > Accounts: choose a group to see its head office, then its stores; a Group column; and on an
//    account, which group it is in and the link to its row on the group's store list (admin/m-dealers.js).
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

edit("assets/dealer.js", [
  // remember the group a registration link names (?g=autobarn), also across the email confirmation
  ['async function page(app,parts){\n',
   'async function page(app,parts){\n  try{const g=/[?&]g=([a-z0-9-]+)/.exec(location.hash);if(g)localStorage.setItem("stravik-reg-group",g[1]);}catch(e){}\n'],
  ['${inp("years_trading","Years trading",{req:1})}\n   </div></fieldset>',
   '${inp("years_trading","Years trading",{req:1})}\n     <div class="full"><label for="r_network">Does your store belong to a group?</label><select id="r_network"><option value="">No, we are independent</option></select><small class="dhint">If your store is part of a group such as Autobarn, choose it here so we link your account to your head office.</small></div>\n   </div></fieldset>'],
  ['  app.querySelector("#rout2").onclick=()=>signOut(c);\n',
   '  app.querySelector("#rout2").onclick=()=>signOut(c);\n' +
   '  // the groups a store can belong to (Autobarn): the answer tells us which head office the store is under\n' +
   '  c.rpc("stravik_network_names").then(r=>{const s=f.querySelector("#r_network");if(!s||r.error||!r.data)return;\n' +
   '    let want=d.network_claim||(d.network&&d.network.code)||"";if(!want&&!me.dealer){try{want=localStorage.getItem("stravik-reg-group")||"";}catch(e){}}\n' +
   '    s.insertAdjacentHTML("beforeend",r.data.map(n=>`<option value="${esc(n.code)}"${n.code===want?" selected":""}>${esc(n.name)}</option>`).join(""));});\n'],
  ['p.ranges_interest=picked();', 'p.ranges_interest=picked();p.network=val("network");'],
]);

edit("assets/autobarn.js", [
  ['href="/#/dealer?m=new"', 'href="/#/dealer?m=new&g=${esc(NET)}"'],
]);
edit("autobarn/index.html", [
  ['/assets/autobarn.js?v=1"', '/assets/autobarn.js?v=2"'],
]);

edit("admin/m-dealers.js", [
  // the list: a group to choose, the head office first and then its stores
  ["    L.content('<div class=\"cards\" id=\"dStats\" style=\"margin-bottom:14px\"></div><div id=\"dListBox\"></div>');\n    $('dXls').onclick = dExcel;\n",
   "    L.content('<div class=\"cards\" id=\"dStats\" style=\"margin-bottom:14px\"></div><div id=\"dGroupBar\" style=\"display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 12px\"></div><div id=\"dListBox\"></div>');\n    $('dXls').onclick = dExcel;\n    dGroupBar();\n"],
  ["  function dQuery(opts) {\n",
   "  // groups (networks such as Autobarn): choose one to see its head office first, then its stores, then the accounts that\n" +
   "  // chose the group when they registered and are not linked to the store list yet\n" +
   "  async function dGroupBar() {\n" +
   "    try {\n" +
   "      var nets = L.must(await sb.from('stravik_networks').select('code,name,is_test').order('is_test').order('name'));\n" +
   "      if (!nets.length || !$('dGroupBar')) return;\n" +
   "      var on = S.group && S.group !== '-';\n" +
   "      $('dGroupBar').innerHTML = '<label for=\"dGroupSel\"><b>Group</b></label><select id=\"dGroupSel\" style=\"width:auto;margin:0\"><option value=\"\">All customers</option>' +\n" +
   "        nets.map(function (n) { return '<option value=\"' + esc(n.code) + '\"' + (n.code === S.group ? ' selected' : '') + '>' + esc(n.name) + ': head office and stores</option>'; }).join('') +\n" +
   "        '<option value=\"-\"' + (S.group === '-' ? ' selected' : '') + '>Not in a group</option></select>' +\n" +
   "        (on ? '<a class=\"btn ghost small\" href=\"' + L.href('networks', [S.group]) + '\">Open the store list</a><span class=\"small muted\">The head office first, then its stores, then accounts that chose this group and are not linked yet.</span>' : '');\n" +
   "      $('dGroupSel').onchange = function () { S.group = this.value; S.offset = 0; if (S.group) S.active = {}; dList(); };\n" +
   "    } catch (e) { /* the list works without it */ }\n" +
   "  }\n" +
   "  function dQuery(opts) {\n"],
  ["    return q.order('submitted_at', { ascending: false });\n  }\n  async function dStats() {",
   "    if (S.group === '-') q = q.is('network', null); else if (S.group) q = q.eq('network', S.group);\n" +
   "    if (S.group && S.group !== '-') return q.order('network_sort').order('company_name');\n" +
   "    return q.order('submitted_at', { ascending: false });\n  }\n  async function dStats() {"],
  ["        { label: 'Status', render: function (x) { return pill(x.stage || x.status); } }, { label: 'Price group'",
   "        { label: 'Group', render: function (x) { return x.network_name ? esc(x.network_name) + '<div class=\"small ' + (x.network_role === 'Not linked yet' ? 'flag' : 'muted') + '\">' + esc(x.network_role || '') + (x.store_class ? ', class ' + esc(x.store_class) : '') + '</div>' : ''; } },\n" +
   "        { label: 'Status', render: function (x) { return pill(x.stage || x.status); } }, { label: 'Price group'"],
  // the account: its group, and the link to its row on the group's store list
  ["L.group('Our side', [['Price group', t(gname(d.price_group))],",
   "L.group('Our side', [['Group', '<div id=\"dGrpBox\"><span class=\"muted\">…</span></div>'], ['Price group', t(gname(d.price_group))],"],
  ["      $('content').querySelectorAll('[data-doc]').forEach(function (b) {\n",
   "      dGroupBox(d);\n      $('content').querySelectorAll('[data-doc]').forEach(function (b) {\n"],
  ["  async function dForm(id) {\n",
   "  // on an account: the group it is in. An account that chose a group when it registered is linked here to its row on\n" +
   "  // the group's store list (or added to the list), which puts it under the head office.\n" +
   "  async function dGroupBox(d) {\n" +
   "    var box = $('dGrpBox'); if (!box) return;\n" +
   "    try {\n" +
   "      var x = L.must(await sb.from('stravik_dealer_list').select('network,network_name,network_role,network_store,store_class').eq('id', d.id).maybeSingle()) || {};\n" +
   "      if (!x.network) { box.innerHTML = '<span class=\"muted\">Not in a group</span>'; return; }\n" +
   "      var open = ' <a class=\"small\" href=\"' + L.href('networks', [x.network]) + '\">Open the store list</a>';\n" +
   "      if (x.network_role === 'Head office') { box.innerHTML = '<b>' + esc(x.network_name) + '</b>: head office.' + open; return; }\n" +
   "      if (x.network_role === 'Store') { box.innerHTML = '<b>' + esc(x.network_name) + '</b>: store' + (x.network_store ? ' \"' + esc(x.network_store) + '\"' : '') + (x.store_class ? ', class ' + esc(x.store_class) : '') + '.' + open; return; }\n" +
   "      var html = 'Chose <b>' + esc(x.network_name) + '</b> when registering. <span class=\"flag\">Not linked to the store list yet.</span>' + open;\n" +
   "      if (L.isEditor()) {\n" +
   "        var free = await L.fetchAll(function () { return sb.from('stravik_network_stores').select('id,store_name,town,store_class').eq('network', x.network).is('dealer_id', null).order('store_name'); });\n" +
   "        var nm = (d.trading_name || d.company_name || '').toLowerCase(), city = (d.city || '').toLowerCase();\n" +
   "        var guess = free.find(function (s) { return s.store_name.toLowerCase() === nm; }) || free.find(function (s) { return nm && (s.store_name.toLowerCase().indexOf(nm) >= 0 || nm.indexOf(s.store_name.toLowerCase()) >= 0); }) || free.find(function (s) { return city && (s.town || '').toLowerCase().indexOf(city) >= 0; });\n" +
   "        html += '<div style=\"display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px\"><select id=\"dGrpStore\" style=\"width:auto;max-width:100%;margin:0\"><option value=\"\">Choose its row on the store list…</option>' +\n" +
   "          free.map(function (s) { return '<option value=\"' + s.id + '\"' + (guess && guess.id === s.id ? ' selected' : '') + '>' + esc(s.store_name + (s.town ? ', ' + s.town : '') + (s.store_class ? ' (class ' + s.store_class + ')' : '')) + '</option>'; }).join('') +\n" +
   "          '<option value=\"new\">Not on the list: add it as a new store</option></select><button type=\"button\" class=\"btn small\" id=\"dGrpLink\">Link</button></div>';\n" +
   "      }\n" +
   "      box.innerHTML = html;\n" +
   "      if ($('dGrpLink')) $('dGrpLink').onclick = async function () {\n" +
   "        try {\n" +
   "          var v = $('dGrpStore').value; if (!v) throw new Error('Choose the store\\'s row on the list, or add it as a new store');\n" +
   "          if (v === 'new') L.must(await sb.from('stravik_network_stores').insert({ network: x.network, store_name: d.trading_name || d.company_name, town: d.city || null, province: d.province || null, country: d.country || 'South Africa', phone: d.phone || d.mobile || null, dealer_id: d.id }));\n" +
   "          else L.must(await sb.from('stravik_network_stores').update({ dealer_id: d.id }).eq('id', v).is('dealer_id', null));\n" +
   "          L.toast('Linked to ' + x.network_name); dGroupBox(d);\n" +
   "        } catch (e) { L.fail(e); }\n" +
   "      };\n" +
   "    } catch (e) { box.innerHTML = '<span class=\"muted\">Could not read the group</span>'; }\n" +
   "  }\n\n" +
   "  async function dForm(id) {\n"],
]);
