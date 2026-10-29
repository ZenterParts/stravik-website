#!/usr/bin/env node
// Builds one static, indexable page per catalogue part, plus sitemap.xml and robots.txt.
//   /part/<Stravik no.>/    steering & suspension (steering-suspension.json), shock absorbers (shock-absorbers.json), brakes (brakes.json) and batteries (batteries.json)
//   /filter/<Stravik no.>/  filters (from filters.json)
// Header, footer and styles come from index.html and /assets, so pages always match the site.
// Run: node tools/build-pages.js   (the GitHub Action runs it whenever the catalogue data changes)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://stravikautomotiveparts.com";
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");

// ---- shared constants from the site's own catalogue script
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(rd("assets/catalog.js").replace(/^const /gm, "var "), ctx);
const { ICONS, FICON, SS_TYPES, SA_TYPES, MKL } = ctx;
const icon = k => '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[k] || ICONS.kit) + "</svg>";
const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ssCase = t => { t = String(t || "").replace(/[A-Z]{3,}/g, w => w.toLowerCase()); return t.charAt(0).toUpperCase() + t.slice(1); };
const SSI = {}; SS_TYPES.forEach(t => SSI[t[0]] = { code: t[0], one: t[1], many: t[2], group: t[3], icon: t[4], slug: slug(t[2]) });
const uniq = a => [...new Set(a.filter(Boolean))];
const list = (a, n) => a.slice(0, n).join(", ") + (a.length > n ? ` and ${a.length - n} more` : "");

// ---- page shell from index.html
// ---- cache-busting: stamp each shared asset with a short content hash so browsers fetch the new file after every change
const crypto = require("crypto");
const ASSETS = ["site.css", "catalog.js", "common.js", "app.js"];
const V = {}; ASSETS.forEach(f => V[f] = "/assets/" + f + "?v=" + crypto.createHash("sha1").update(rd("assets/" + f)).digest("hex").slice(0, 10));
{ const before = rd("index.html"), after = before.replace(/\/assets\/(site\.css|catalog\.js|common\.js|app\.js)(\?v=[0-9a-f]+)?/g, (m, f) => V[f]);
  if (after !== before) { fs.writeFileSync(path.join(ROOT, "index.html"), after); console.log("index.html: asset versions updated"); } }
const index = rd("index.html");
const cut = (a, b) => { const i = index.indexOf(a), j = index.indexOf(b, i); if (i < 0 || j < 0) throw new Error("index.html: missing " + a); return index.slice(i, j + b.length); };
const SHELL = {
  icons: index.split("\n").filter(l => /rel="(icon|apple-touch-icon)"/.test(l)).join("\n"),
  fonts: cut('<link rel="preconnect" href="https://fonts.googleapis.com">', 'display=swap" rel="stylesheet">'),
  header: cut('<header class="site">', "</header>").replace('class="dd-btn" aria-expanded="false"', 'class="dd-btn" aria-current="page" aria-expanded="false"'),
  fcart: cut('<a href="/#/cart" class="fcart"', "</a>"),
  toast: cut('<div class="toast"', "</div>"),
  footer: cut('<footer class="site">', "</footer>"),
};
function page({ url, title, desc, jsonld, body }) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${SHELL.icons}
<meta name="theme-color" content="#0b203d">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Stravik">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
${SHELL.fonts}
<link rel="stylesheet" href="${V["site.css"]}">
</head>
<body>
${SHELL.header}
<main id="app" tabindex="-1">
${body}
</main>
${SHELL.fcart}
${SHELL.toast}
${SHELL.footer}
<script src="${V["catalog.js"]}"></script>
<script src="${V["common.js"]}"></script>
</body>
</html>
`;
}
const crumbs = c => `<div class="crumbs">${c.map(([h, t], k) => k < c.length - 1 ? `<a href="${h}">${esc(t)}</a><span>/</span>` : `<span>${esc(t)}</span>`).join("")}</div>`;
const buyBox = item => `<div class="buy"><div><label for="bq">Quantity</label><input id="bq" type="number" min="1" max="99999" value="1" inputmode="numeric"></div><button type="button" class="btn gold" data-add-qty="bq" data-item="${esc(JSON.stringify(item))}">Add to cart</button></div>`;
const cantFind = `<section class="block"><div class="wrap"><aside class="cantfind"><div><h3>Not the right part?</h3><p>Send us the vehicle and the OE number and we'll find the matching Stravik part, or add it to the range.</p></div><a class="btn gold" href="/#/request">Request a part</a></aside></div></section>`;
const productLd = (url, name, pn, category, desc, img) => ({ "@context": "https://schema.org", "@type": "Product", name, sku: pn, mpn: pn, brand: { "@type": "Brand", name: "Stravik" }, category, description: desc, url, image: SITE + img });

// ---- output folders (rebuilt from scratch so removed parts disappear)
for (const d of ["part", "filter"]) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
const write = (rel, html) => { const f = path.join(ROOT, rel, "index.html"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const urls = [];

// ================= steering & suspension =================
const raw = JSON.parse(rd("steering-suspension.json"));
const makes = raw.makes.map(m => ({ name: m[0], label: MKL[m[0]] || m[0] }));
const SS = raw.parts.map(p => ({ pn: p[0], t: p[1], ctr: p[2] || "", old: p[3] || [], pos: p[4] || "", oe: p[5] || [], hid: p[6] || 0, apps: (p[7] || []).map(a => ({ mk: a[0], veh: a[1] || "", mc: a[2] || "", yr: a[3] || "" })) }));
const byVeh = new Map();
SS.forEach(i => uniq(i.apps.map(a => a.mk + "|" + a.veh)).forEach(k => { if (!byVeh.has(k)) byVeh.set(k, []); byVeh.get(k).push(i); }));
const ssPos = i => ssCase(i.pos);
const ssDesc = i => (SSI[i.t] ? SSI[i.t].one : "Part") + (i.pos ? ", " + ssPos(i).replace(/^./, c => c.toLowerCase()) : "");
const ssMakes = i => uniq(i.apps.map(a => makes[a.mk] && makes[a.mk].label));
const ssVehs = i => uniq(i.apps.map(a => ssCase(a.veh)));
const lc1 = s => s.charAt(0).toLowerCase() + s.slice(1);
const SIDE = { L: "Left", R: "Right", K: "Kit (left and right)" };

function ssRelated(i) {
  const score = new Map();
  uniq(i.apps.map(a => a.mk + "|" + a.veh)).forEach(k => (byVeh.get(k) || []).forEach(x => { if (x !== i && x.pn.slice(0, 8) !== i.pn.slice(0, 8)) score.set(x, (score.get(x) || 0) + 1); }));
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].pn.localeCompare(b[0].pn)).map(e => e[0]);
  const out = [], seenT = new Set();
  for (const x of ranked) { if (!seenT.has(x.t)) { out.push(x); seenT.add(x.t); } if (out.length >= 8) break; }
  for (const x of ranked) { if (out.length >= 8) break; if (!out.includes(x)) out.push(x); }
  return out;
}
const ssCard = x => { const T = SSI[x.t] || { one: "Part", icon: "kit" }, mk = ssMakes(x), vh = ssVehs(x);
  return `<div class="fcell"><a class="fcard" href="/part/${esc(x.pn)}/"><span class="ic">${icon(T.icon)}</span><span class="pn">${esc(x.pn)}</span><span class="ty">${esc(ssDesc(x))}</span><span class="veh"><b>Fits</b> ${esc(list(mk, 2))}${vh.length ? ": " + esc(list(vh, 2)) : ""}</span></a></div>`; };

const groups = new Map(); SS.forEach(i => { const k = i.pn.slice(0, 8); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
for (const i of SS) {
  const T = SSI[i.t] || { one: "Part", many: "Parts", group: "", icon: "kit", slug: "" };
  const url = `${SITE}/part/${i.pn}/`, mk = ssMakes(i), vh = ssVehs(i);
  const side = SIDE[i.pn.slice(-1)] || "";
  const sibs = groups.get(i.pn.slice(0, 8)).filter(x => x !== i);
  const rows = [["Stravik number", i.pn], ["Part type", T.one], ["Group", T.group], ["Position", ssPos(i)], ["Side", side], ["CTR number", i.ctr], ["Previous CTR numbers", i.old.join(", ")]].filter(r => r[1]);
  const byMk = [...new Set(i.apps.map(a => a.mk))].filter(ix => makes[ix]).map(ix => ({ m: makes[ix], apps: i.apps.filter(a => a.mk === ix && (a.veh || a.mc || a.yr)) }));
  const nApps = byMk.reduce((s, g) => s + g.apps.length, 0);
  const title = `Stravik ${i.pn} ${ssDesc(i)}${mk.length ? " | " + list(mk.slice(0, 2), 2) : ""}`;
  const desc = `Stravik ${lc1(ssDesc(i))} ${i.pn}.` + (i.ctr ? ` CTR ${i.ctr}.` : "") + (i.oe.length ? ` Replaces OE ${list(i.oe, 3)}.` : "") + (mk.length ? ` Fits ${list(mk, 3)}${vh.length ? ": " + list(vh, 3) : ""}.` : "");
  const item = { key: i.pn, no: i.pn, cat: "Steering & Suspension", desc: ssDesc(i), link: `/part/${i.pn}/`, kind: "ss" };
  const rel = ssRelated(i);
  const body = `<div class="pagehead fhead"><div class="wrap">${crumbs([["/#/", "Home"], ["/#/products", "Products"], ["/#/products/steering-suspension", "Steering & suspension"], [`/#/steering/${T.slug}`, T.many], ["", i.pn]])}<h1>${esc(i.pn)}</h1><p>Stravik ${esc(lc1(ssDesc(i)))}</p></div></div>
<div class="wrap detail fdetail"><div class="visual"><span class="tag">${esc(T.one)}</span><div class="big">${icon(T.icon)}</div></div>
<div class="info"><div class="type">Stravik ${esc(T.one.toLowerCase())}</div>
<dl class="specs">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
${sibs.length ? `<p class="sib">Also available: ${sibs.map(x => `<a href="/part/${esc(x.pn)}/">${esc(x.pn)}</a> (${esc(({ L: "left", R: "right", K: "kit" })[x.pn.slice(-1)] || "no side")})`).join(", ")}</p>` : ""}
${i.oe.length ? `<h2 class="nums-h">OE numbers</h2><div class="chips">${i.oe.map(n => `<span>${esc(n)}</span>`).join("")}</div>${i.hid ? `<p class="sib">${i.hid} more OE ${i.hid === 1 ? "number isn't" : "numbers aren't"} listed here. Send us your OE number and we'll confirm the match.</p>` : ""}` : ""}
<div class="replace"><b>Before you order</b><span>Check the vehicle, model code and years below against the original part, or send us the OE number and we'll confirm the fit.</span></div>
${buyBox(item)}
<div class="actions"><a class="btn line" href="/#/contact?part=${encodeURIComponent(T.one)}&amp;ref=${encodeURIComponent(i.pn)}">Ask about this part</a><a class="btn line" href="/#/steering/${T.slug}">More ${esc(T.many.toLowerCase())}</a></div>
<div class="boxshot"><img src="/assets/img/ss-box.webp" alt="Stravik steering and suspension box" loading="lazy" width="120" height="90"><div><b>Supplied in the Stravik box</b><span>Steering and suspension parts come in the Navy and Bronze Stravik box.</span></div></div>
</div></div>
<section class="block paper"><div class="wrap"><h2 class="apph">Vehicles it fits<span>${nApps} ${nApps === 1 ? "application" : "applications"}, ${byMk.length} ${byMk.length === 1 ? "make" : "makes"}</span></h2>
${nApps ? `<div class="ftable-wrap"><table class="ctable apps"><thead><tr><th>Vehicle</th><th>Model code</th><th>Years</th></tr></thead><tbody>${byMk.map(g => `<tr class="catrow"><td colspan="3">${esc(g.m.label)}</td></tr>` + g.apps.map(a => `<tr><td>${esc(a.veh)}</td><td class="mc">${esc(a.mc)}</td><td class="yr">${esc(a.yr)}</td></tr>`).join("")).join("")}</tbody></table></div>` : `<p class="sib">Listed under ${esc(byMk.map(g => g.m.label).join(", "))}. Ask us for the exact vehicle.</p>`}
</div></section>
${rel.length ? `<section class="block related"><div class="wrap"><h2>Related parts for the same vehicles</h2><p class="pp-note">Other Stravik steering and suspension parts that fit the vehicles above.</p><div class="fgrid">${rel.map(ssCard).join("")}</div></div></section>` : ""}
${cantFind}`;
  write(`part/${i.pn}`, page({ url, title, desc, jsonld: productLd(url, `Stravik ${ssDesc(i)} ${i.pn}`, i.pn, T.one, desc, "/assets/img/ss-box.webp"), body }));
  urls.push(url);
}

// ================= shock absorbers =================
const SAR = JSON.parse(rd("shock-absorbers.json"));
const mp = t => String(t).replace(/macpherson/gi, "MacPherson");   // keep the brand-style capital P when lower-casing
const saLabel = m => MKL[m] || String(m).toLowerCase().replace(/(^|[\s/-])[a-z]/g, c => c.toUpperCase());
const samk = SAR.makes.map(m => ({ name: m, label: saLabel(m) }));
const SAT = {}; SA_TYPES.forEach(t => SAT[t[0]] = { code: t[0], one: t[1], many: t[2], icon: t[3], slug: slug(t[2]) });
const SA = SAR.parts.map(p => ({ pn: p[0], t: p[1], d: p[2] || "", pos: p[3] || "", fp: p[4] || "", ty: p[5] || "", sy: p[6] || "", um: p[7] || "", lm: p[8] || "", inc: p[9] || "", k: p[10] || "", x: p[11] || "", nw: !!p[12], oe: p[13] || [],
  apps: (p[14] || []).map(a => ({ mk: a[0], mo: a[1] || "", mc: a[2] || "", yr: a[3] || "", pos: a[4] || "" })) }));
{ const ssPn = new Set(SS.map(i => i.pn)); const clash = SA.filter(i => ssPn.has(i.pn)).map(i => i.pn); if (clash.length) throw new Error("Shock absorber numbers also used in steering & suspension: " + clash.slice(0, 5).join(", ")); }
const saBy = {}; SA.forEach(i => saBy[i.pn] = i);
const saDesc = i => (SAT[i.t] ? SAT[i.t].one : "Part") + (i.pos ? ", " + ssCase(i.pos).toLowerCase() : "");
const saMakes = i => uniq(i.apps.map(a => samk[a.mk] && samk[a.mk].label));
const saVehs = i => uniq(i.apps.map(a => a.mo));
const SA_SIDE = { "1": "Right", "2": "Left", "4": "Right", "5": "Left", "8": "Right", "9": "Left" };
const SA_OTHER = { "1": "2", "2": "1", "4": "5", "5": "4", "8": "9", "9": "8" };
const saByVeh = new Map();
SA.forEach(i => uniq(i.apps.map(a => a.mk + "|" + a.mo)).forEach(k => { if (!saByVeh.has(k)) saByVeh.set(k, []); saByVeh.get(k).push(i); }));
function saRelated(i) {
  const score = new Map();
  uniq(i.apps.map(a => a.mk + "|" + a.mo)).forEach(k => (saByVeh.get(k) || []).forEach(x => { if (x !== i && x.pn.slice(0, 8) !== i.pn.slice(0, 8)) score.set(x, (score.get(x) || 0) + 1); }));
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].pn.localeCompare(b[0].pn)).map(e => e[0]);
  const out = [], seen = new Set();
  for (const x of ranked) { const k = x.t + x.pos; if (!seen.has(k)) { out.push(x); seen.add(k); } if (out.length >= 8) break; }
  for (const x of ranked) { if (out.length >= 8) break; if (!out.includes(x)) out.push(x); }
  return out;
}
const saCard = x => { const T = SAT[x.t] || { one: "Part", icon: "shock" }, mk = saMakes(x), vh = saVehs(x);
  return `<div class="fcell"><a class="fcard" href="/part/${esc(x.pn)}/"><span class="ic">${icon(T.icon)}</span><span class="pn">${esc(x.pn)}</span><span class="ty">${esc(saDesc(x))}</span><span class="veh"><b>Fits</b> ${esc(list(mk, 2))}${vh.length ? ": " + esc(list(vh, 2)) : ""}</span></a></div>`; };
for (const i of SA) {
  const T = SAT[i.t] || { one: "Part", many: "Parts", icon: "shock", slug: "" };
  const url = `${SITE}/part/${i.pn}/`, mk = saMakes(i), vh = saVehs(i);
  const last = i.pn.slice(-1), pair = SA_OTHER[last] ? saBy[i.pn.slice(0, 8) + SA_OTHER[last]] : null;
  const rows = [["Stravik number", i.pn], ["Part type", T.one], ["Description", mp(ssCase(i.d))], ["Position", ssCase(i.pos)], ["Side", SA_SIDE[last] || ""], ["Fitting position", i.fp],
    ["External number", i.k], ["Type", i.ty], ["System", i.sy], ["Upper mount", i.um], ["Lower mount", i.lm], ["Supplied with", i.inc.replace(/^Supplied with /i, "")], ["Availability", i.x + (i.nw ? (i.x ? ", " : "") + "new to the range" : "")]].filter(r => r[1]);
  const byMk = [...new Set(i.apps.map(a => a.mk))].filter(ix => samk[ix]).map(ix => ({ m: samk[ix], apps: i.apps.filter(a => a.mk === ix) }));
  const nApps = i.apps.length;
  const title = `Stravik ${i.pn} ${saDesc(i)}${mk.length ? " | " + list(mk.slice(0, 2), 2) : ""}`;
  const desc = `Stravik ${mp(lc1(saDesc(i)))} ${i.pn}.` + (i.k ? ` External no. ${i.k}.` : "") + (i.oe.length ? ` Replaces OE ${list(i.oe, 3)}.` : "") + (mk.length ? ` Fits ${list(mk, 3)}${vh.length ? ": " + list(vh, 3) : ""}.` : "");
  const item = { key: i.pn, no: i.pn, cat: "Shock Absorbers", desc: saDesc(i), link: `/part/${i.pn}/`, kind: "sa" };
  const rel = saRelated(i);
  const body = `<div class="pagehead fhead"><div class="wrap">${crumbs([["/#/", "Home"], ["/#/products", "Products"], ["/#/products/shock-absorbers", "Shock absorbers"], [`/#/shock-absorbers/${T.slug}`, T.many], ["", i.pn]])}<h1>${esc(i.pn)}</h1><p>Stravik ${esc(mp(lc1(saDesc(i))))}</p></div></div>
<div class="wrap detail fdetail"><div class="visual"><span class="tag">${esc(T.one)}</span><div class="big">${icon(T.icon)}</div></div>
<div class="info"><div class="type">Stravik ${esc(mp(T.one.toLowerCase()))}</div>
<dl class="specs">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
${pair ? `<p class="sib">Other side: <a href="/part/${esc(pair.pn)}/">${esc(pair.pn)}</a> (${esc((SA_SIDE[pair.pn.slice(-1)] || "").toLowerCase())})</p>` : ""}
${i.oe.length ? `<h2 class="nums-h">OE numbers</h2><div class="chips">${i.oe.map(n => `<span>${esc(n)}</span>`).join("")}</div>` : ""}
<div class="replace"><b>Before you order</b><span>Check the vehicle, model code and years below against the original part, or send us the OE number and we'll confirm the fit.</span></div>
${buyBox(item)}
<div class="actions"><a class="btn line" href="/#/contact?part=${encodeURIComponent(T.one)}&amp;ref=${encodeURIComponent(i.pn)}">Ask about this part</a><a class="btn line" href="/#/shock-absorbers/${T.slug}">More ${esc(mp(T.many.toLowerCase()))}</a></div>
</div></div>
<section class="block paper"><div class="wrap"><h2 class="apph">Vehicles it fits<span>${nApps} ${nApps === 1 ? "application" : "applications"}, ${byMk.length} ${byMk.length === 1 ? "make" : "makes"}</span></h2>
${nApps ? `<div class="ftable-wrap"><table class="ctable apps"><thead><tr><th>Model</th><th>Model / engine</th><th>Years</th><th>Position</th></tr></thead><tbody>${byMk.map(g => `<tr class="catrow"><td colspan="4">${esc(g.m.label)}</td></tr>` + g.apps.map(a => `<tr><td>${esc(a.mo)}</td><td class="mc">${esc(a.mc)}</td><td class="yr">${esc(a.yr)}</td><td>${esc(ssCase(a.pos))}</td></tr>`).join("")).join("")}</tbody></table></div>` : `<p class="sib">Vehicle details to follow. Send us the vehicle and we'll confirm the fit.</p>`}
</div></section>
${rel.length ? `<section class="block related"><div class="wrap"><h2>Related parts for the same vehicles</h2><p class="pp-note">Other Stravik shock absorbers and struts that fit the vehicles above.</p><div class="fgrid">${rel.map(saCard).join("")}</div></div></section>` : ""}
${cantFind}`;
  write(`part/${i.pn}`, page({ url, title, desc, jsonld: productLd(url, `Stravik ${saDesc(i)} ${i.pn}`, i.pn, T.one, desc, "/assets/og.jpg"), body }));
  urls.push(url);
}

// ================= brakes =================
const BRR = JSON.parse(rd("brakes.json"));
const { BR_TYPES, BR_MKL, BR_BRANDS } = ctx;
const brLabel = m => BR_MKL[m] || MKL[m] || String(m).toLowerCase().replace(/(^|[\s/-])[a-z]/g, c => c.toUpperCase());
const brmk = BRR.makes.map(m => ({ name: m, label: brLabel(m), cv: m === "COMMERCIAL VEHICLES", brand: BR_BRANDS.includes(m) }));
const BRT = {}; BR_TYPES.forEach(t => BRT[t[0]] = { code: t[0], one: t[1], many: t[2], icon: t[3], slug: slug(t[2]) });
const BR = BRR.parts.map(p => ({ pn: p[0], t: p[1], pos: p[2] || "", sz: p[3] || "", dt: p[4] || "", k: p[5] || "", oe: p[6] || [], wva: p[7] || [],
  apps: (p[8] || []).map(a => ({ mk: a[0], mo: a[1] || "", yr: a[2] || "", pos: a[3] || "", ds: a[4] || "" })) }));
{ const used = new Set(SS.map(i => i.pn).concat(SA.map(i => i.pn))); const clash = BR.filter(i => used.has(i.pn)).map(i => i.pn); if (clash.length) throw new Error("Brake numbers also used in another catalogue: " + clash.slice(0, 5).join(", ")); }
const brDesc = i => (BRT[i.t] ? BRT[i.t].one : "Brake part") + (i.pos ? ", " + i.pos.toLowerCase() : "") + (i.dt ? ", " + i.dt.toLowerCase() : "");
const brMakes = i => uniq(i.apps.map(a => brmk[a.mk] && !brmk[a.mk].cv && brmk[a.mk].label));
const brVehs = i => uniq(i.apps.map(a => a.mo));
// pads sold in more than one version share the external number root (KD2004Y-EC, KD2004Y-ET)
const brRoot = i => i.k ? i.k.replace(/-[A-Z]{2}$/, "") : i.pn;
const brVersions = new Map(); BR.forEach(i => { const r = brRoot(i); if (!brVersions.has(r)) brVersions.set(r, []); brVersions.get(r).push(i); });
const brByVeh = new Map();
BR.forEach(i => uniq(i.apps.filter(a => !brmk[a.mk].cv).map(a => a.mk + "|" + a.mo)).forEach(k => { if (!brByVeh.has(k)) brByVeh.set(k, []); brByVeh.get(k).push(i); }));
function brRelated(i) {
  const score = new Map();
  uniq(i.apps.map(a => a.mk + "|" + a.mo)).forEach(k => (brByVeh.get(k) || []).forEach(x => { if (x !== i && brRoot(x) !== brRoot(i)) score.set(x, (score.get(x) || 0) + 1); }));
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].pn.localeCompare(b[0].pn)).map(e => e[0]);
  const out = [], seen = new Set();
  for (const x of ranked) { const k = x.t + x.pos; if (!seen.has(k)) { out.push(x); seen.add(k); } if (out.length >= 8) break; }
  for (const x of ranked) { if (out.length >= 8) break; if (!out.includes(x)) out.push(x); }
  return out;
}
const brCard = x => { const T = BRT[x.t] || { one: "Brake part", icon: "pad" }, mk = brMakes(x), vh = brVehs(x);
  return `<div class="fcell"><a class="fcard" href="/part/${esc(x.pn)}/"><span class="ic">${icon(T.icon)}</span><span class="pn">${esc(x.pn)}</span><span class="ty">${esc(brDesc(x))}</span>${x.sz ? `<span class="veh"><b>Size</b> ${esc(x.sz)}</span>` : ""}<span class="veh"><b>Fits</b> ${esc(list(mk, 2))}${vh.length ? ": " + esc(list(vh, 2)) : ""}</span></a></div>`; };
for (const i of BR) {
  const T = BRT[i.t] || { one: "Brake part", many: "Brake parts", icon: "pad", slug: "" };
  const url = `${SITE}/part/${i.pn}/`, mk = brMakes(i), vh = brVehs(i), cv = i.t === "CVP";
  const rows = [["Stravik number", i.pn], ["Part type", T.one], ["Position", i.pos], ["Disc type", i.dt], ["Size", i.sz], ["External number", i.k], ["WVA numbers", i.wva.join(", ")]].filter(r => r[1]);
  const byMk = [...new Set(i.apps.map(a => a.mk))].filter(ix => brmk[ix]).map(ix => ({ m: brmk[ix], apps: i.apps.filter(a => a.mk === ix) }));
  const nApps = i.apps.length;
  const title = `Stravik ${i.pn} ${brDesc(i)}${mk.length ? " | " + list(mk.slice(0, 2), 2) : cv && vh.length ? " | " + list(vh.slice(0, 2), 2) : ""}`.slice(0, 120);
  const desc = `Stravik ${lc1(brDesc(i))} ${i.pn}.` + (i.sz ? ` Size ${i.sz}.` : "") + (i.k ? ` External no. ${i.k}.` : "") + (i.oe.length ? ` Replaces OE ${list(i.oe, 3)}.` : "") + (i.wva.length ? ` WVA ${list(i.wva, 3)}.` : "") + (mk.length ? ` Fits ${list(mk, 3)}${vh.length ? ": " + list(vh, 3) : ""}.` : cv && vh.length ? ` Fits ${list(vh, 3)}.` : "");
  const item = { key: i.pn, no: i.pn, cat: "Brakes", desc: brDesc(i), link: `/part/${i.pn}/`, kind: "br" };
  const rel = brRelated(i), vers = brVersions.get(brRoot(i)).filter(x => x !== i);
  const appRows = cv
    ? i.apps.map(a => `<tr><td colspan="3">${esc(a.mo)}</td><td>${esc(a.pos)}</td></tr>`).join("")
    : byMk.map(g => `<tr class="catrow"><td colspan="4">${esc(g.m.label)}</td></tr>` + g.apps.map(a => `<tr><td colspan="2">${esc(a.mo)}</td><td class="yr">${esc(a.yr)}</td><td>${esc(a.ds || a.pos)}</td></tr>`).join("")).join("");
  const body = `<div class="pagehead fhead"><div class="wrap">${crumbs([["/#/", "Home"], ["/#/products", "Products"], ["/#/products/braking-system", "Braking"], [`/#/brakes/${T.slug}`, T.many], ["", i.pn]])}<h1>${esc(i.pn)}</h1><p>Stravik ${esc(lc1(brDesc(i)))}</p></div></div>
<div class="wrap detail fdetail"><div class="visual"><span class="tag">${esc(T.one)}</span><div class="big">${icon(T.icon)}</div></div>
<div class="info"><div class="type">Stravik ${esc(T.one.toLowerCase())}</div>
<dl class="specs">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
${vers.length ? `<p class="sib">Also available as ${vers.map(x => `<a href="/part/${esc(x.pn)}/">${esc(x.pn)}</a> (external no. ${esc(x.k)})`).join(", ")}</p>` : ""}
${i.oe.length ? `<h2 class="nums-h">OE numbers</h2><div class="chips">${i.oe.map(n => `<span>${esc(n)}</span>`).join("")}</div>` : ""}
<div class="replace"><b>Before you order</b><span>${i.t === "DSC" ? "Check the diameter, thickness and bolt pattern against the old disc" : "Check the size against the old part"}, and the vehicle and years below, or send us the OE number and we'll confirm the fit.</span></div>
${buyBox(item)}
<div class="actions"><a class="btn line" href="/#/contact?part=${encodeURIComponent(T.one)}&amp;ref=${encodeURIComponent(i.pn)}">Ask about this part</a><a class="btn line" href="/#/brakes/${T.slug}">More ${esc(T.many.toLowerCase())}</a></div>
</div></div>
<section class="block paper"><div class="wrap"><h2 class="apph">${cv ? "Applications" : "Vehicles it fits"}<span>${nApps} ${nApps === 1 ? "application" : "applications"}${cv ? "" : `, ${byMk.length} ${byMk.length === 1 ? "make" : "makes"}`}</span></h2>
${nApps ? `<div class="ftable-wrap"><table class="ctable apps"><thead><tr><th colspan="2">${cv ? "Axle or vehicle" : "Model"}</th><th>${cv ? "" : "Years"}</th><th>Position</th></tr></thead><tbody>${appRows}</tbody></table></div>` : `<p class="sib">Vehicle details to follow. Send us your OE number and we'll confirm the match.</p>`}
</div></section>
${rel.length ? `<section class="block related"><div class="wrap"><h2>Matching brake parts for the same vehicles</h2><p class="pp-note">Other Stravik pads, discs and shoes that fit the vehicles above.</p><div class="fgrid">${rel.map(brCard).join("")}</div></div></section>` : ""}
${cantFind}`;
  write(`part/${i.pn}`, page({ url, title, desc, jsonld: productLd(url, `Stravik ${brDesc(i)} ${i.pn}`, i.pn, T.one, desc, "/assets/img/braking-box.webp"), body }));
  urls.push(url);
}

// ================= batteries =================
const BTR = JSON.parse(rd("batteries.json"));
const { BAT_TYPES, BAT_DWG, BAT_PHOTO } = ctx;
const BTT = {}; BAT_TYPES.forEach(t => BTT[t[0]] = { code: t[0], one: t[1], many: t[2], icon: t[3], slug: slug(t[2]) });
const BT = BTR.parts.map(p => ({ pn: p[0], t: p[1], ser: p[2] || "", grp: p[3] || "", box: p[4] || "", ah: p[5], cca: p[6], l: p[7], w: p[8], h: p[9], lay: p[10] || "", hd: p[11] || "", dwg: p[12] || "", org: p[13] || "", sab: p[14] || [],
  apps: (p[15] || []).map(a => ({ mk: BTR.makes[a[0]], mo: a[1] || "", yr: a[2] || "", sb: a[3] || "", sg: a[4] || "" })) }));
{ const used = new Set(SS.map(i => i.pn).concat(SA.map(i => i.pn), BR.map(i => i.pn))); const clash = BT.filter(i => used.has(i.pn)).map(i => i.pn); if (clash.length) throw new Error("Battery numbers also used in another catalogue: " + clash.slice(0, 5).join(", ")); }
const btDesc = i => (BTT[i.t] ? BTT[i.t].one : "Battery") + " 12V " + i.ah + "Ah " + i.cca + "A (EN)";
const btLc = t => t.replace(/^Heavy duty/, "heavy duty");   // keep SMF, EFB and AGM in capitals
const BT_GRP = { "DIN (European) cases": "European (DIN) case", "JIS (Asian) cases": "Asian (JIS) case", "Heavy duty": "heavy duty case" };
const btOrigin = o => o === "Hungary" ? "EU" : o;
const btPhoto = i => { const k = BAT_PHOTO.exact[i.pn] || BAT_PHOTO.rep[i.ser + "|" + i.t]; return k ? "/assets/img/batteries/" + k + ".webp" : ""; };
const btMakes = i => uniq(i.apps.map(a => a.mk));
const btBySab = new Map(); BT.forEach(i => i.sab.forEach(s => { if (!btBySab.has(s)) btBySab.set(s, []); btBySab.get(s).push(i); }));
const btCard = x => { const T = BTT[x.t] || { one: "Battery" }, ph = btPhoto(x);
  return `<div class="fcell"><a class="fcard bcard" href="/part/${esc(x.pn)}/"><span class="bph">${ph ? `<img src="${ph}" alt="" loading="lazy">` : `<span class="ic">${icon("battery")}</span>`}</span><span class="pn">${esc(x.pn)}</span><span class="ty">${esc(T.one)}, ${esc(x.ser)}</span><span class="veh"><b>${esc(x.ah)} Ah · ${esc(x.cca)} A (EN)</b> · case ${esc(x.box)} · made in ${esc(btOrigin(x.org))}</span></a></div>`; };
const SEG_ORDER = ["Passenger Cars & SUVs", "Light Commercial Vehicles", "Commercial Vehicles", "Tractors & Fork Lifts"];
for (const i of BT) {
  const T = BTT[i.t] || { one: "Battery", many: "Batteries", icon: "battery", slug: "" };
  const url = `${SITE}/part/${i.pn}/`, mk = btMakes(i), ph = btPhoto(i), D = BAT_DWG[i.dwg];
  const rows = [["Stravik number", i.pn], ["Battery type", T.one], ["Series", i.ser], ["Voltage", "12 V"], ["Capacity", i.ah + " Ah"], ["Cold cranking amps", i.cca + " A (EN)"],
    ["Case", i.box + (BT_GRP[i.grp] ? ", " + BT_GRP[i.grp] : "")], ["Dimensions (L × W × H)", `${i.l} × ${i.w} × ${i.h} mm`], ["Terminal layout", i.lay], ["Hold-down", i.hd],
    ["SAB number", i.sab.join(" / ")], ["Case drawing", D ? `${i.dwg} (${D[0]})` : ""], ["Origin", "Made in " + btOrigin(i.org)]].filter(r => r[1]);
  const alts = uniq(i.sab.flatMap(s => (btBySab.get(s) || []).filter(x => x !== i).map(x => x.pn))).map(pn => BT.find(x => x.pn === pn)).slice(0, 8);
  const segs = SEG_ORDER.map(sg => ({ sg, apps: i.apps.filter(a => a.sg === sg) })).filter(g => g.apps.length);
  const nApps = i.apps.length;
  const title = `Stravik ${i.pn} ${btDesc(i)} | ${i.box} case`.slice(0, 120);
  const desc = `Stravik ${btLc(btDesc(i))}, ${i.ser}, case ${i.box} (${i.l} × ${i.w} × ${i.h} mm).` + (i.sab.length ? ` SAB ${i.sab.join(" / ")}.` : "") + (mk.length ? ` Fits ${list(mk, 4)}.` : "");
  const item = { key: i.pn, no: i.pn, cat: "Batteries", desc: btDesc(i).replace(" 12V", "") + ", " + i.box + " case", link: `/part/${i.pn}/`, kind: "bat" };
  const body = `<div class="pagehead fhead"><div class="wrap">${crumbs([["/#/", "Home"], ["/#/products", "Products"], ["/#/products/batteries", "Batteries"], [`/#/batteries/${T.slug}`, T.many], ["", i.pn]])}<h1>${esc(i.pn)}</h1><p>Stravik ${esc(btLc(btDesc(i)))}, ${esc(i.ser)}</p></div></div>
<div class="wrap detail fdetail"><div class="visual"><span class="tag">${esc(T.one)}</span>${ph ? `<img class="bphoto" src="${ph}" alt="Stravik ${esc(btLc(T.one))}, ${esc(i.ser)}">` : `<div class="big">${icon("battery")}</div>`}</div>
<div class="info"><div class="type">Stravik ${esc(btLc(T.one))}</div>
<dl class="specs">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
${ph && !BAT_PHOTO.exact[i.pn] ? `<p class="sib">The photo shows a battery from the same range; labels differ by size.</p>` : ""}
<div class="replace"><b>Before you order</b><span>Check the SAB number, case size, terminal layout and hold-down against the old battery, or send us the vehicle and we'll confirm the fit.</span></div>
${buyBox(item)}
<div class="actions"><a class="btn line" href="/#/contact?part=${encodeURIComponent(T.one)}&amp;ref=${encodeURIComponent(i.pn)}">Ask about this battery</a><a class="btn line" href="/#/batteries/${T.slug}">More ${esc(btLc(T.many))}</a></div>
${D ? `<figure class="dwfig"><a href="/assets/img/batteries/dwg/${i.dwg}.jpg" target="_blank" rel="noopener"><img src="/assets/img/batteries/dwg/${i.dwg}-thumb.webp" alt="Case drawing ${esc(i.dwg)}, ${esc(D[0])}" loading="lazy"></a><figcaption>Case drawing ${esc(i.dwg)}, ${esc(D[0])}: ${D[1].join(" × ")} mm. Select to enlarge.</figcaption></figure>` : ""}
</div></div>
<section class="block paper"><div class="wrap"><h2 class="apph">Vehicles it fits<span>${nApps} ${nApps === 1 ? "vehicle" : "vehicles"}, ${mk.length} ${mk.length === 1 ? "make" : "makes"} (South African applications, SABAT)</span></h2>
${nApps ? segs.map((g, k) => `<details class="segd"${k === 0 ? " open" : ""}><summary class="segh">${esc(g.sg)} <span>${g.apps.length}</span></summary><div class="ftable-wrap"><table class="ctable apps"><thead><tr><th>Make</th><th>Model</th><th>Years</th><th>Battery size</th></tr></thead><tbody>${g.apps.map(a => `<tr><td>${esc(a.mk)}</td><td>${esc(a.mo)}</td><td class="yr">${esc(a.yr)}</td><td class="mc">${esc(a.sb)}</td></tr>`).join("")}</tbody></table></div></details>`).join("") : `<p class="sib">This battery fits by SAB size and case. Send us the vehicle and we'll confirm the fit.</p>`}
</div></section>
${alts.length ? `<section class="block related"><div class="wrap"><h2>Other Stravik batteries in the same size</h2><p class="pp-note">Batteries with the same SAB number, in other series and origins.</p><div class="fgrid">${alts.map(btCard).join("")}</div></div></section>` : ""}
${cantFind}`;
  write(`part/${i.pn}`, page({ url, title, desc, jsonld: productLd(url, `Stravik ${btDesc(i)} ${i.pn}`, i.pn, T.one, desc, ph || "/assets/og.jpg"), body }));
  urls.push(url);
}

// ================= filters =================
const F = JSON.parse(rd("filters.json"));
const FT = {}; F.types.forEach(t => FT[t[0]] = { code: t[0], slug: t[1], name: t[2], one: t[3] });
const fdesc = i => FT[i.t].one + (i.d ? ", " + i.d.charAt(0).toLowerCase() + i.d.slice(1) : "");
const models = i => uniq(String(i.mo || "").split(/[;,/]/).map(s => s.trim().toLowerCase()));
function fRelated(i) {
  const mo = models(i), mk = (i.mk || []).map(s => s.toLowerCase());
  const cand = F.items.filter(x => x !== i && (x.mk || []).some(m => mk.includes(m.toLowerCase())));
  const sc = x => (x.t !== i.t ? 2 : 0) + models(x).filter(m => mo.includes(m)).length * 3;
  return cand.map(x => [x, sc(x)]).filter(e => e[1] >= 3).sort((a, b) => b[1] - a[1] || a[0].pn.localeCompare(b[0].pn)).slice(0, 8).map(e => e[0]);
}
const fCard = x => `<div class="fcell"><a class="fcard" href="/filter/${esc(x.pn)}/"><span class="ic">${icon(FICON[x.t])}</span><span class="pn">${esc(x.pn)}</span><span class="ty">${esc(fdesc(x))}</span><span class="veh"><b>Fits</b> ${esc([(x.mk || []).join(", "), x.mo, x.y].filter(Boolean).join(" · "))}</span></a></div>`;
for (const i of F.items) {
  const T = FT[i.t], url = `${SITE}/filter/${i.pn}/`;
  const rows = [["Stravik number", i.pn], ["Filter type", T.one], ["Description", i.d], ["Vehicle make", (i.mk || []).join(", ")], ["Models", i.mo], ["Years", i.y], ["Engine", i.e], ["Dimensions (mm)", i.s]].filter(r => r[1]);
  const veh = [(i.mk || []).join(", "), i.mo].filter(Boolean).join(" ");
  const title = `Stravik ${i.pn} ${T.one}${veh ? " | " + veh : ""}`.slice(0, 110);
  const desc = `Stravik ${lc1(fdesc(i))} ${i.pn}.` + ((i.n || []).length ? ` OE and cross-references ${list(i.n, 3)}.` : "") + (veh ? ` Fits ${veh}${i.y ? " " + i.y : ""}.` : "");
  const item = { key: i.pn, no: i.pn, cat: "Filters", desc: fdesc(i), link: `/filter/${i.pn}/`, kind: "filter" };
  const rel = fRelated(i);
  const body = `<div class="pagehead fhead"><div class="wrap">${crumbs([["/#/", "Home"], ["/#/products", "Products"], ["/#/products/filters", "Filtration"], [`/#/filters/${T.slug}`, T.name], ["", i.pn]])}<h1>${esc(i.pn)}</h1><p>Stravik ${esc(lc1(fdesc(i)))}</p></div></div>
<div class="wrap detail fdetail"><div class="visual"><span class="tag">${esc(T.one)}</span><div class="big">${icon(FICON[i.t])}</div></div>
<div class="info"><div class="type">Stravik ${esc(T.one.toLowerCase())}</div>
<dl class="specs">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
${(i.n || []).length ? `<h2 class="nums-h">OE and cross-reference numbers</h2><div class="chips">${i.n.map(n => `<span>${esc(n)}</span>`).join("")}</div>` : ""}
<div class="replace"><b>Before you order</b><span>Match the OE number on the old filter or in the service book. Send us the vehicle details if you're not sure.</span></div>
${buyBox(item)}
<div class="actions"><a class="btn line" href="/#/contact?part=${encodeURIComponent(T.name)}&amp;ref=${encodeURIComponent(i.pn)}">Ask about this filter</a><a class="btn line" href="/#/filters/${T.slug}">More ${esc(T.name.toLowerCase())}</a></div>
</div></div>
${rel.length ? `<section class="block paper related"><div class="wrap"><h2>Other Stravik filters for the same vehicles</h2><p class="pp-note">Matching air, oil, fuel and cabin filters, so you can supply the full service.</p><div class="fgrid">${rel.map(fCard).join("")}</div></div></section>` : ""}
${cantFind}`;
  write(`filter/${i.pn}`, page({ url, title, desc, jsonld: productLd(url, `Stravik ${fdesc(i)} ${i.pn}`, i.pn, T.one, desc, "/assets/og.jpg"), body }));
  urls.push(url);
}

// ================= sitemap and robots =================
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}/</loc></url>\n${urls.map(u => `<url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${SS.length} steering & suspension pages, ${SA.length} shock absorber pages, ${BR.length} brake pages, ${BT.length} battery pages and ${F.items.length} filter pages (${urls.length + 1} URLs in sitemap.xml).`);
