#!/usr/bin/env node
// Builds one static, indexable page per catalogue part, plus sitemap.xml and robots.txt.
//   /part/<Stravik no.>/    steering & suspension (from steering-suspension.json)
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
const { ICONS, FICON, SS_TYPES, MKL } = ctx;
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
  strip: cut('<div class="strip">', "</div></div>"),
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
${SHELL.strip}
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
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${SS.length} steering & suspension pages and ${F.items.length} filter pages (${urls.length + 1} URLs in sitemap.xml).`);
