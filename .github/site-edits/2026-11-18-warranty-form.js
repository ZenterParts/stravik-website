// Site edit, 18 Nov 2026: battery warranty registration form.
// - serial number from the QR code on the battery: filled in and locked (assets/warranty.js);
// - "Bought from" replaced by "VAT number" (optional); "Invoice or receipt number" and "Fitted by" removed;
// - a photo of the multimeter for each test reading (resting, cranking, alternator); the Photos section removed;
// - admin Warranty app: VAT number and the three reading photos (older registrations keep their fields and photos).
// The new assets/warranty.js comes in .github/site-edits/warranty-new.txt, which this edit moves into place.
// Goes with the database change of the same day (function stravik_warranty_register, column vat_no).
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
function cut(f, startText, endText) {   // remove from startText up to and including endText
  const s = get(f), a = s.indexOf(startText), b = s.indexOf(endText, a);
  if (a < 0 || b < 0 || s.indexOf(startText, a + 1) >= 0) throw new Error(`${f}: section not found once: ${startText.slice(0, 60)}`);
  files[f] = s.slice(0, a) + s.slice(b + endText.length);
}
const B = "tools/build-pages.js";
edit(B, 'desc = "Register your Stravik battery for warranty: serial number, invoice, vehicle, test readings at fitment and photos.";',
  'desc = "Register your Stravik battery for warranty: serial number, vehicle and the test readings at fitment, with a photo of each reading.";');
edit(B, '<div><label for="w_seller">Bought from</label><input id="w_seller" required placeholder="Shop, dealer or workshop" maxlength="160"><div class="err">Enter where you bought the battery.</div></div>',
  '<div><label for="w_vat">VAT number <span class="opt">(optional)</span></label><input id="w_vat" maxlength="40" autocapitalize="characters" spellcheck="false"><div class="err">Check the VAT number.</div></div>');
edit(B, '<div><label for="w_inv">Invoice or receipt number</label><input id="w_inv" required maxlength="60"><div class="err">Enter the invoice or receipt number.</div></div>\n', '');
edit(B, '<div><label for="w_fit">Fitted by</label><input id="w_fit" required placeholder="Workshop name, or yourself" maxlength="160"><div class="err">Enter who fitted the battery.</div></div>\n', '');
edit(B, '<p class="wsub">Measured with a multimeter by the workshop that fitted the battery.</p>',
  '<p class="wsub">Measured with a multimeter by the workshop that fitted the battery. Add a clear photo of the multimeter showing each reading (up to 8 MB each). Only Stravik staff can see the photos.</p>');
const photo = (id, key, what) => `\n<div><label for="${id}">Photo: multimeter showing the ${what}</label><input id="${id}" type="file" required accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-key="${key}"><div class="err">Add a photo of the reading, up to 8 MB.</div></div>`;
edit(B, 'Engine off, before starting. Healthy: 12.4 to 12.9 V.</div></div>', 'Engine off, before starting. Healthy: 12.4 to 12.9 V.</div></div>' + photo("w_rest_ph", "rest_reading", "resting voltage"));
edit(B, 'Lowest reading while the engine is cranking. Healthy: 9.6 to 13.0 V.</div></div>', 'Lowest reading while the engine is cranking. Healthy: 9.6 to 13.0 V.</div></div>' + photo("w_crank_ph", "crank_reading", "cranking voltage"));
edit(B, 'Engine running. Must be 13.4 to 14.4 V.</div></div>', 'Engine running. Must be 13.4 to 14.4 V.</div></div>' + photo("w_volt_ph", "alternator_reading", "alternator voltage"));
cut(B, '<div class="full wsep"><h2>Photos</h2>', 'data-key="alternator_reading"><div class="err">Choose a photo under 8 MB.</div></div>\n');

// the serial number from the QR code is locked
const C = "assets/site.css";
get(C); files[C] = files[C].replace(/\s*$/, "\n") + "/* warranty form: the serial number from the QR code on the battery is locked */\nform.enq input.locked{cursor:not-allowed;opacity:.85;border-style:dashed}\n";

// admin Warranty app
const W = "admin/m-warranty.js";
edit(W, "var PHOTOS = [['installed', 'Battery fitted'], ['serial_label', 'Serial label'], ['alternator_reading', 'Alternator reading']];",
  "var PHOTOS = [['rest_reading', 'Resting voltage reading'], ['crank_reading', 'Cranking voltage reading'], ['alternator_reading', 'Alternator reading'], ['installed', 'Battery fitted'], ['serial_label', 'Serial label']];   // the first three since 18 Nov 2026");
edit(W, "['purchase_date', 'Bought on'], ['seller', 'Bought from']", "['purchase_date', 'Bought on'], ['vat_no', 'VAT number'], ['seller', 'Bought from']");
edit(W, "'phone', 'seller', 'invoice_no',", "'phone', 'vat_no', 'seller', 'invoice_no',");
edit(W, "{ label: 'Bought from', render: function (r) { return esc(r.seller); } },", "{ label: 'VAT number', render: function (r) { return esc(r.vat_no || ''); } },");

// the new form script
const NEW = ".github/site-edits/warranty-new.txt";
files["assets/warranty.js"] = fs.readFileSync(NEW, "utf8");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
fs.unlinkSync(NEW);
console.log("Edited: " + Object.keys(files).join(", "));
