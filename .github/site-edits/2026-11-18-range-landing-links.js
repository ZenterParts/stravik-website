// Site edit, 18 Nov 2026: every range card (home page and Products page) opens the range's landing page first.
// No "Search the catalogue" or "Open the catalogue" on the cards; the catalogue is opened from the landing page.
// Then builds the range landing pages (tools/range-pages.js).
// Run once from the repository root by .github/workflows/apply-site-edits.yml, which then deletes this file.
"use strict";
const fs = require("fs"), { execFileSync } = require("child_process");
const files = {};
const get = f => files[f] !== undefined ? files[f] : (files[f] = fs.readFileSync(f, "utf8"));
function edit(f, from, to) {
  const s = get(f), n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${f}: expected the text once, found it ${n} times: ${from.slice(0, 80)}`);
  files[f] = s.replace(from, () => to);
}
const A = "assets/app.js";

// ---- home page, "Shop by product family": the link under each card is "About the range"
edit(A, "<a class=\"fam-cat\" href=\"${f.cat}\">${f.catText} →</a>", "<a class=\"fam-cat\" href=\"${f.href}\">About the range →</a>");
edit(A, "href:\"#/products/filters\",text:\"Air, oil", "href:\"/range/filters/\",text:\"Air, oil");

// ---- Products page: one button per range, "About the range"
const card = (from, to) => edit(A, from, to);
card("<a class=\"btn gold\" href=\"/filters/\">Open the catalogue</a><a class=\"btn line\" href=\"/range/filters/\">About the range</a>", "<a class=\"btn gold\" href=\"/range/filters/\">About the range</a>");
card("<a class=\"btn gold\" href=\"/batteries/catalogue/\">Open the catalogue</a><a class=\"btn line\" href=\"#/products/batteries\">About the range</a>", "<a class=\"btn gold\" href=\"#/products/batteries\">About the range</a>");
card("<a class=\"btn gold\" href=\"#/brakes\">Open the catalogue</a><a class=\"btn line\" href=\"#/products/braking-system\">About the range</a>", "<a class=\"btn gold\" href=\"#/products/braking-system\">About the range</a>");
card("<a class=\"btn gold\" href=\"#/steering\">Open the catalogue</a><a class=\"btn line\" href=\"#/products/steering-suspension\">About the range</a>", "<a class=\"btn gold\" href=\"#/products/steering-suspension\">About the range</a>");
card("<a class=\"btn gold\" href=\"#/shock-absorbers\">Open the catalogue</a><a class=\"btn line\" href=\"#/products/shock-absorbers\">About the range</a>", "<a class=\"btn gold\" href=\"#/products/shock-absorbers\">About the range</a>");
card("<a class=\"btn gold\" href=\"#/gas-springs\">Open the catalogue</a><a class=\"btn line\" href=\"#/products/gas-springs\">About the range</a>", "<a class=\"btn gold\" href=\"#/products/gas-springs\">About the range</a>");
for (const r of ["spark-plugs", "clutch-kits", "alternators", "starters", "ignition-coils", "water-pumps", "horns", "bulbs", "wiper-blades"])
  card(`<a class="btn gold" href="#/${r}">Open the catalogue</a>`, `<a class="btn gold" href="/range/${r}/">About the range</a>`);

// ---- "New to range" cards: open the range's landing page too
for (const [from, to] of [["#/gas-springs", "#/products/gas-springs"], ["/batteries/catalogue/", "/batteries/"], ["#/brakes", "#/products/braking-system"], ["#/steering", "#/products/steering-suspension"], ["#/filters", "/range/filters/"]])
  edit(A, `href:"${from}",cta:"Search the catalogue"`, `href:"${to}",cta:"About the range"`);

// ---- /#/products/filters (footer link, old bookmarks) opens the filters landing page; with a filter type or search it
//      still goes to that part of the catalogue
edit(A, "else if(parts[0]===\"products\"&&parts[1]===\"filters\"){filtRedirect(parts[2],params);return;}",
  "else if(parts[0]===\"products\"&&parts[1]===\"filters\"){if(!parts[2]&&!qs)location.replace(\"/range/filters/\");else filtRedirect(parts[2],params);return;}");

for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
execFileSync("node", ["tools/range-pages.js"], { stdio: "inherit" });
