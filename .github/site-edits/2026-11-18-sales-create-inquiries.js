// Site edit, 18 Nov 2026: the sales team can create inquiries ("New from a list" in Inquiries, and "Create inquiry from
// this list" in Number Lookup), as well as the data team. Who may is set per person (staff.creates_inquiries; editors
// always may) and checked by the database (function stravik_create_inquiry).
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
edit("admin/core.js", "  L.isEditor = function () { return L.ROLE === 'editor'; };",
  "  L.isEditor = function () { return L.ROLE === 'editor'; };\n" +
  "  L.canCreateInquiry = function () { return L.isEditor() || !!L.INQ; };   // staff.creates_inquiries (function can_create_inquiry)");
edit("admin/core.js", "      L.APPS = L.must(await sb.rpc('my_admin_apps')) || null;",
  "      L.APPS = L.must(await sb.rpc('my_admin_apps')) || null;\n" +
  "      L.INQ = !!L.must(await sb.rpc('can_create_inquiry'));");
edit("admin/m-inquiries.js", "menus: [{ label: 'Inquiries', href: BASE }, { label: 'New from a list', action: 'new', editor: true }],",
  "menus: [{ label: 'Inquiries', href: BASE }, { label: 'New from a list', action: 'new', show: function () { return L.canCreateInquiry(); } }],");
edit("admin/m-inquiries.js", "'Customers\\' lists are added with \"New from a list\"' + (L.isEditor() ? '.' : ' by the data team.')",
  "'Customers\\' lists are added with \"New from a list\"' + (L.canCreateInquiry() ? '.' : ' by the data team.')");
edit("admin/m-lookup.js", "<button type=\"button\" class=\"btn editor-only\" id=\"lkInq\">",
  "<button type=\"button\" class=\"btn' + (L.canCreateInquiry() ? '' : ' editor-only') + '\" id=\"lkInq\">");
for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
