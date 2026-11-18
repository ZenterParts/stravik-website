// Site edit, 18 Nov 2026: hide the "Site visits" and "My visits" tiles from all staff until the visits app is approved.
// Nothing is taken offline: the phone app (/visits/) keeps working, and staff with visit access (staff.sees_visits) can
// still open the admin screens directly at /admin/#/visits and /admin/#/myvisits. To show the tiles again, remove
// "hidden: true" from the app in admin/m-visits.js and admin/m-myvisits.js.
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
// the home screen leaves out apps marked hidden (they still open from a direct link)
edit("admin/core.js", "L.apps.map(function (a) {", "L.apps.filter(function (a) { return !a.hidden; }).map(function (a) {");
edit("admin/m-visits.js", "key: 'visits', name: 'Site visits',", "key: 'visits', name: 'Site visits', hidden: true,   // tile hidden until approval; /admin/#/visits still opens\n   ");
edit("admin/m-myvisits.js", "key: 'myvisits', name: 'My visits',", "key: 'myvisits', name: 'My visits', hidden: true,   // tile hidden until approval; /admin/#/myvisits still opens\n   ");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
