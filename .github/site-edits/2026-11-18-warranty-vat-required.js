// Site edit, 18 Nov 2026: warranty registration, the VAT number is required (with the database function of the same day).
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
edit("tools/build-pages.js", '<div><label for="w_vat">VAT number <span class="opt">(optional)</span></label><input id="w_vat" maxlength="40" autocapitalize="characters" spellcheck="false"><div class="err">Check the VAT number.</div></div>',
  '<div><label for="w_vat">VAT number</label><input id="w_vat" required maxlength="40" autocapitalize="characters" spellcheck="false"><div class="err">Enter the VAT number.</div></div>');
edit("assets/warranty.js", 'const vat=$("w_vat").value.trim();bad("w_vat",!!vat&&vat.replace(/[^A-Za-z0-9]/g,"").length<4);',
  'const vat=$("w_vat").value.trim();bad("w_vat",vat.replace(/[^A-Za-z0-9]/g,"").length<4);');
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
