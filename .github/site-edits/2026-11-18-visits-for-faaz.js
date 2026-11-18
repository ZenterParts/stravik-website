// Site edit, 18 Nov 2026: apps marked hidden (Site visits, My visits) show only to people who have them listed in
// staff.admin_apps. "*" in that list means every app, so a list of "*", "visits" and "myvisits" means all apps plus
// the two visits apps. Used for now to show the visits apps to Faaz only.
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
edit(C, "  function allowed(a) { return !L.APPS || L.APPS.indexOf(a.key) >= 0; }",
  "  // \"*\" = every app; hidden apps (a.hidden) show only to people who have them listed by name\n" +
  "  function allowed(a) { return !L.APPS || L.APPS.indexOf('*') >= 0 || L.APPS.indexOf(a.key) >= 0; }\n" +
  "  function listed(a) { return !!(L.APPS && L.APPS.indexOf(a.key) >= 0); }");
edit(C, "L.apps.filter(function (a) { return !a.hidden && allowed(a); }).map(function (a) {",
  "L.apps.filter(function (a) { return (!a.hidden || listed(a)) && allowed(a); }).map(function (a) {");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
