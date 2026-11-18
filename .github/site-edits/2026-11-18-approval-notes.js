// Site edit, 18 Nov 2026: customer approval notes follow the account through the approval steps.
// The pricing approver sees the sales note; the final approver sees the sales and pricing notes (in the approval box),
// and the Approval section of the customer page shows each step's note. Goes with the database change of the same day
// (stravik_dealers.sales_note / pricing_note / final_note, kept by stravik_dealer_approve).
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
const D = "admin/m-dealers.js";
// customer page, Approval section: each step with its note
edit(D, "L.group('Approval', [['1. Sales team', by(d.sales_approved_by, d.sales_approved_at)], ['2. Pricing team', by(d.pricing_approved_by, d.pricing_approved_at, d.pricing_approved_at && d.price_group ? ' · ' + esc(gname(d.price_group)) : '')], ['3. Final approval', by(d.final_approved_by, d.final_approved_at)]])",
  "L.group('Approval', [['1. Sales team', by(d.sales_approved_by, d.sales_approved_at) + stepNote(d.sales_note)], ['2. Pricing team', by(d.pricing_approved_by, d.pricing_approved_at, d.pricing_approved_at && d.price_group ? ' · ' + esc(gname(d.price_group)) : '') + stepNote(d.pricing_note)], ['3. Final approval', by(d.final_approved_by, d.final_approved_at) + stepNote(d.final_note)]])");
// approval box: the notes of the earlier steps, and the note is for the next approver
edit(D, "L.modal(STEPNAME[STEP] + ': ' + (d.trading_name || d.company_name), intro +",
  "L.modal(STEPNAME[STEP] + ': ' + (d.trading_name || d.company_name), intro + earlierNotes(d, STEP) +");
edit(D, "[['Note (internal, optional)', '<textarea id=\"apN\"></textarea>']]",
  "[[STEP === 'final' ? 'Note (internal, optional)' : 'Note for the next approver (internal, optional)', '<textarea id=\"apN\"></textarea>']]");
// the two helpers, before the module's first function
edit(D, "(function (L) {\n  'use strict';",
  "(function (L) {\n  'use strict';\n" +
  "  // approval notes (stravik_dealers.sales_note / pricing_note / final_note): shown on the customer page and to the next approvers\n" +
  "  function stepNote(n) { return n ? '<div class=\"small\" style=\"margin-top:4px;white-space:pre-wrap\"><b>Note:</b> ' + L.esc(n) + '</div>' : ''; }\n" +
  "  function earlierNotes(d, step) {\n" +
  "    if (step === 'sales') return '';\n" +
  "    var n = [['Sales team', d.sales_approved_by, d.sales_note]].concat(step === 'final' ? [['Pricing team', d.pricing_approved_by, d.pricing_note]] : []).filter(function (x) { return x[2]; });\n" +
  "    return n.length ? '<div class=\"notice\"><b>Notes from the earlier approval steps</b>' + n.map(function (x) { return '<div style=\"margin-top:6px\"><b>' + L.esc(x[0]) + '</b>' + (x[1] ? ' (' + L.esc(x[1]) + ')' : '') + ': <span style=\"white-space:pre-wrap\">' + L.esc(x[2]) + '</span></div>'; }).join('') + '</div>'\n" +
  "      : '<p class=\"muted small\">No notes from the earlier approval steps.</p>';\n" +
  "  }");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
