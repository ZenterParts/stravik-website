// Site edit, 18 Nov 2026: the "My visits" admin app is hidden for now, until the visits app is approved for all staff.
// Only staff who see all visits (staff.sees_visits: Faaz, Rineesh, Pedro, Arlin) get the tile. The phone app at /visits/
// stays online. To show "My visits" to every staff member again, set ALL_STAFF to true in admin/m-myvisits.js and
// remove the hidden attribute from #seeAll in visits/index.html (see the note in visits/app.js).
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

// ---- admin/m-myvisits.js: register the app only for staff with visit access (for now)
const M = "admin/m-myvisits.js";
edit(M, "  L.register({\n    key: 'myvisits',", "  var APP = {\n    key: 'myvisits',");
edit(M, "else overview(); }\n  });\n})(window.LS);",
  "else overview(); }\n  };\n" +
  "  // Hidden for now, until the visits app is approved for all staff: only staff who see all visits (staff.sees_visits)\n" +
  "  // get this tile. Set ALL_STAFF to true to show it to every staff member again.\n" +
  "  var ALL_STAFF = false, checking = false, recheck = false;\n" +
  "  async function access() {\n" +
  "    if (checking) { recheck = true; return; } checking = true;\n" +
  "    try {\n" +
  "      var ok = ALL_STAFF;\n" +
  "      if (!ok) { var s = (await sb.auth.getSession()).data.session; if (s) { var r = await sb.rpc('my_visit_access'); ok = !r.error && (r.data === 'manager' || r.data === 'viewer'); } }\n" +
  "      var i = L.apps.indexOf(APP);\n" +
  "      if (ok && i < 0) L.apps.push(APP); else if (!ok && i >= 0) L.apps.splice(i, 1); else return;\n" +
  "      if (L.ROLE && (!L.route().app || L.route().app === 'myvisits')) L.render();\n" +
  "    } catch (e) { /* no tile without a confirmed access level */ } finally { checking = false; if (recheck) { recheck = false; access(); } }\n" +
  "  }\n" +
  "  sb.auth.onAuthStateChange(function (ev) { if (ev === 'INITIAL_SESSION' || ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(access, 0); });\n" +
  "  access();\n" +
  "})(window.LS);");

// ---- the phone app: "See all my visits" (it opens My visits) only for the same people, for now
edit("visits/index.html", "<p style=\"margin:18px 0 0; text-align:center\"><a class=\"link\" href=\"/admin/#/myvisits\"",
  "<p id=\"seeAll\" hidden style=\"margin:18px 0 0; text-align:center\"><a class=\"link\" href=\"/admin/#/myvisits\"");
edit("visits/app.js", "} else { user = { id: s.user.id, email: s.user.email }; LS.set('sv_visits_user', user); }",
  "} else { user = { id: s.user.id, email: s.user.email }; LS.set('sv_visits_user', user); }\n" +
  "      // \"See all my visits\" opens the admin's My visits, which is shown only to staff who see all visits for now\n" +
  "      $('seeAll').hidden = !(access === 'manager' || access === 'viewer');");

for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
