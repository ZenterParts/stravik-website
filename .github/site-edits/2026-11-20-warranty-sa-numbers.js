// Site edit: the warranty form finds the vehicle list of a regional battery number through the part it is the same as.
// The South Africa SVS... battery numbers (container 1) are not in the public catalogue; stravik_serial_check returns
// app_pn (for example SVSDH002 -> SVPDH002) and the form uses that part's application list and description.
"use strict";
const fs = require("fs"), p = "assets/warranty.js";
let s = fs.readFileSync(p, "utf8");
const edits = [
  ["if(EXP&&j.pn!==EXP){", "if(EXP&&j.pn!==EXP&&j.app_pn!==EXP){"],
  ["const b=BAT&&BAT[j.pn];SN={ok:true,", "const b=BAT&&BAT[j.app_pn||j.pn];SN={ok:true,"],
  ["const b=BAT&&BAT[j.pn],cov=cover(j)", "const b=SN.b,cov=cover(j)"],
  ["// (batteries.json). The fitment test", "// (batteries.json; a regional number such as the South Africa SVS... numbers uses the list of the part it is the same as, app_pn).\n// The fitment test"]];
for (const [a, b] of edits) {
  if (s.split(a).length !== 2) { console.error("Text not found once in " + p + ": " + a); process.exit(1); }
  s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log("Warranty form: regional battery numbers use the linked part's vehicle list");
