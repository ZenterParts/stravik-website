// All Star notifications: the store page asks the email function to tell the Stravik team (allstar_notify: Charles and
// Faaz) when a report is sent or changed or a correction is asked; the admin site shows a count on the All Star app and
// a "Waiting for you" notice. Database: stravik_as_admin_todo(); email function stravik-dealer-mail (allstar-report, allstar-correction).
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
edit("assets/allstar.js", [
 [
  "const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));\n// how a report's status reads for the store\n",
  "const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));\n// tell the Stravik team by email (stravik-dealer-mail): a report sent or changed, or a correction asked; it never blocks the store\nconst notify=(action,id)=>{try{C.functions.invoke(\"stravik-dealer-mail\",{body:{action,report_id:id}}).catch(()=>{});}catch(e){}};\n// how a report's status reads for the store\n"
 ],
 [
  "  try{const r=must(await C.rpc(\"stravik_sales_submit\",{p:{period:Q.period,file_name:\"Entered on the portal\",lines}}));\n    R.quick=null;await refreshOwner();\n",
  "  try{const r=must(await C.rpc(\"stravik_sales_submit\",{p:{period:Q.period,file_name:\"Entered on the portal\",lines}}));\n    notify(\"allstar-report\",r.id);\n    R.quick=null;await refreshOwner();\n"
 ],
 [
  "  try{const r=must(await C.rpc(\"stravik_sales_submit\",{p:{period:D.period,file_name:D.file,lines}}));\n    R.draft=null;await refreshOwner();\n",
  "  try{const r=must(await C.rpc(\"stravik_sales_submit\",{p:{period:D.period,file_name:D.file,lines}}));\n    notify(\"allstar-report\",r.id);\n    R.draft=null;await refreshOwner();\n"
 ],
 [
  "      try{must(await C.rpc(\"stravik_sales_correction\",{p_id:r.id,p_note:note}));await loadAll();toast(\"Sent. Your Stravik sales manager will look at it.\");paneView();}catch(e){toast(msg(e));b.disabled=false;}});\n",
  "      try{must(await C.rpc(\"stravik_sales_correction\",{p_id:r.id,p_note:note}));notify(\"allstar-correction\",r.id);await loadAll();toast(\"Sent. Your Stravik sales manager will look at it.\");paneView();}catch(e){toast(msg(e));b.disabled=false;}});\n"
 ]
]);
edit("admin/core.js", [
 [
  "        return '<a class=\"o-app\" href=\"' + L.href(a.key) + '\"><span class=\"o-app-icon\" style=\"background:' + a.color + '\">' + icon(a, 40) + '</span><span class=\"o-app-name\">' + esc(a.name) + '</span></a>';\n",
  "        return '<a class=\"o-app\" data-app=\"' + esc(a.key) + '\" href=\"' + L.href(a.key) + '\"><span class=\"o-app-icon\" style=\"background:' + a.color + '\">' + icon(a, 40) + '</span><span class=\"o-app-name\">' + esc(a.name) + '</span></a>';\n"
 ],
 [
  "      }).join('') + '</div></div>');\n  }\n",
  "      }).join('') + '</div></div>');\n    // a count of what waits for this person, on the apps that give one (badge: async function returning {n, title})\n    L.apps.filter(function (a) { return a.badge && allowed(a); }).forEach(function (a) {\n      Promise.resolve().then(a.badge).then(function (b) {\n        var t = document.querySelector('.o-app[data-app=\"' + a.key + '\"] .o-app-icon');\n        if (t && b && b.n > 0) t.insertAdjacentHTML('beforeend', '<span class=\"o-badge\" title=\"' + esc(b.title || '') + '\">' + (b.n > 99 ? '99+' : b.n) + '</span>');\n      }).catch(function () { /* a badge is only a hint */ });\n    });\n  }\n"
 ]
]);
edit("admin/m-allstar.js", [
 [
  "\n  // ---------- the month: every store of the programme\n",
  "\n  // ---------- what waits for the signed-in person\n  async function todo() { return L.must(await sb.rpc('stravik_as_admin_todo')); }\n  function todoParts(t, test) {\n    var p = test ? 'test_' : '', out = [];\n    if (t.can_check && t[p + 'to_check']) out.push(t[p + 'to_check'] + ' to check');\n    if (t.can_check && t[p + 'corrections']) out.push(t[p + 'corrections'] + ' correction request' + (t[p + 'corrections'] === 1 ? '' : 's'));\n    if (t.can_approve && t[p + 'to_approve']) out.push(t[p + 'to_approve'] + ' to approve');\n    return out;\n  }\n  async function notice() {\n    try {\n      var t = await todo(), el = $('asTodo'); if (!t || !el) return;\n      var a = todoParts(t, false), b = todoParts(t, true);\n      el.innerHTML = a.length || b.length ? '<div class=\"notice\"><b>Waiting for you:</b> ' + esc(a.length ? a.join(', ') : 'nothing in the stores') + (b.length ? ' <span class=\"small muted\">· test stores: ' + esc(b.join(', ')) + '</span>' : '') +\n        (t.oldest ? ' <span class=\"small muted\">· oldest: ' + esc(monthName(t.oldest)) + '</span>' : '') + '</div>' : '';\n    } catch (e) { /* only a hint */ }\n  }\n\n  // ---------- the month: every store of the programme\n"
 ],
 [
  "    L.content('<div class=\"cards\" id=\"asStats\" style=\"margin-bottom:14px\"></div><div id=\"asList\"><p class=\"muted\">Loading…</p></div>');\n",
  "    L.content('<div id=\"asTodo\"></div><div class=\"cards\" id=\"asStats\" style=\"margin-bottom:14px\"></div><div id=\"asList\"><p class=\"muted\">Loading…</p></div>');\n    notice();\n"
 ],
 [
  "    menus: [{ label: 'Monthly reports', href: BASE }],\n    route: function (r) { if (r.parts[0] === 'r' && r.parts[1]) return report(r.parts[1]); return home(r); }\n",
  "    menus: [{ label: 'Monthly reports', href: BASE }],\n    // the count on the app's tile: what this person has to check or approve (test stores included)\n    badge: async function () {\n      var t = await todo(); if (!t) return null;\n      var n = (t.can_check ? t.to_check + t.corrections + t.test_to_check + t.test_corrections : 0) + (t.can_approve ? t.to_approve + t.test_to_approve : 0);\n      return { n: n, title: todoParts(t, false).concat(todoParts(t, true).map(function (x) { return x + ' (test)'; })).join(', ') };\n    },\n    route: function (r) { if (r.parts[0] === 'r' && r.parts[1]) return report(r.parts[1]); return home(r); }\n"
 ]
]);
{ const f = "admin/admin.css", s = fs.readFileSync(f, "utf8"); if (s.includes(".o-badge{")) { console.error(f + ": already there"); process.exit(1); } fs.writeFileSync(f, s + "\n/* a count on an app tile (core.js home: app.badge) */\n.o-app-icon{position:relative;}\n.o-badge{position:absolute; top:-6px; right:-8px; min-width:24px; height:24px; padding:0 7px; border-radius:12px; background:#b42318; color:#fff; font:700 .8rem/24px inherit; text-align:center; box-shadow:0 0 0 3px #fff;}\n"); console.log(f + ": updated"); }
edit("allstar/index.html", [['/assets/allstar.js?v=8"', '/assets/allstar.js?v=9"']]);
