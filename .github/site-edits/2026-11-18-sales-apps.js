// Site edit, 18 Nov 2026: each person sees only the admin apps listed for them in staff.admin_apps (null = all apps).
// The sales team sees five: Inquiries, Number Lookup, Customers, Orders and Pricing. Other apps are left off the home
// screen and their links open the home screen instead.
// Run once from the repository root by .github/workflows/apply-site-edits.yml, which then deletes this file.
"use strict";
const fs = require("fs");
const files = {};
const get = f => files[f] !== undefined ? files[f] : (files[f] = fs.readFileSync(f, "utf8"));
function edit(f, from, to) {
  const s = get(f), n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${f}: expected the text once, found it ${n} times: ${from.slice(0, 80)}`);
  files[f] = s.replace(from, () => to);
}
const C = "admin/core.js";
edit(C, "  function appByKey(k) { return L.apps.find(function (a) { return a.key === k; }); }",
  "  // the apps this person may use: staff.admin_apps (function my_admin_apps); null = all\n" +
  "  function allowed(a) { return !L.APPS || L.APPS.indexOf(a.key) >= 0; }\n" +
  "  L.allowedApp = function (k) { return !!L.apps.find(function (a) { return a.key === k && allowed(a); }); };\n" +
  "  function appByKey(k) { return L.apps.find(function (a) { return a.key === k && allowed(a); }); }");
edit(C, "L.apps.filter(function (a) { return !a.hidden; }).map(function (a) {", "L.apps.filter(function (a) { return !a.hidden && allowed(a); }).map(function (a) {");
edit(C, "      L.ROLE = role; document.body.classList.toggle('viewer', !L.isEditor());",
  "      L.ROLE = role; document.body.classList.toggle('viewer', !L.isEditor());\n" +
  "      L.APPS = L.must(await sb.rpc('my_admin_apps')) || null;");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
