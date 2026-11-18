// Site edit, 18 Nov 2026: battery e-catalogue search. A SAB code on its own ("652", "SAB 652", "652L") lists exactly the
// batteries with that SAB number, without the batteries of vehicles whose recommended SAB matches. Any other search
// (part numbers, cases, capacities, vehicles) works as before, as does a SAB code no battery has.
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
const E = "assets/ecat.js";
edit(E, "  let vset=null;\n  if(tk.length&&tk.join(\"\").length>=3){",
  "  // a SAB code on its own (\"652\", \"sab 652\"): exactly the batteries with that SAB number\n" +
  "  const sq=tk.filter(t=>t!==\"sab\"),sabQ=sq.length===1&&/^\\d{3}[a-z]?$/.test(sq[0])?sq[0].toUpperCase():null,sabHit=!!sabQ&&CAT.some(r=>r.sabs.includes(sabQ));\n" +
  "  let vset=null;\n  if(!sabHit&&tk.length&&tk.join(\"\").length>=3){");
edit(E, "    if(tk.length){const own=tk.every(t=>r._t.includes(t));if(!own&&!(vset&&vset.has(r.pn)))return false;}",
  "    if(sabHit){if(!r.sabs.includes(sabQ))return false;}\n" +
  "    else if(tk.length){const own=tk.every(t=>r._t.includes(t));if(!own&&!(vset&&vset.has(r.pn)))return false;}");
edit(E, "+(vset&&tk.length?` · includes batteries listed for vehicles matching",
  "+(sabHit?` · SAB ${esc(sabQ)}`:vset&&tk.length?` · includes batteries listed for vehicles matching");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
