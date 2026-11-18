#!/usr/bin/env node
// Builds the range landing pages (/range/<range>/index.html) in one standard layout (styles: assets/range.css).
// Section order: hero > 01 About the range (what the part does) > Why Stravik > The range > coverage band >
// signs and fitting tips > catalogue band ("Find your …", or "Register with us to see our catalogues").
// Content lives in CONTENT below. A range without written copy yet gets a short page from its catalogue data only
// (counts, types, main makes); add its copy here when it is ready and run the script again.
// Counts come from the published catalogue files (<range>.json), so run this after big catalogue changes.
// Run: node tools/range-pages.js      (the "Apply site edits" workflow runs it when a site edit asks for it)
// Voice: Stravik brand standards (plain UK English, workshop language, proof over promise, no superlatives).
// Never use the phrase "Matched to OE fit" (Rineesh Devassy, 17 Nov 2026). Never publish figures still marked [to confirm].
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://stravikparts.com";
const IMG = "https://kyegujgvlsbttyrlibgn.supabase.co/storage/v1/object/public/stravik-site/ranges";   // photos supplied for the landing pages
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = n => Number(n).toLocaleString("en-GB");

// =====================================================================================================================
// CONTENT. Text is written as plain text (it is escaped); figures in stats and cover may use {parts}, {makes}, {apps},
// {refs} and {types}, filled from the catalogue data.
// =====================================================================================================================
const CONTENT = {
  "filters": {
    data: "filters.json", catalogue: "/filters/", find: "Find your filter",
    eyebrow: "Filtration", name: "Stravik filters", short: "filter",
    title: "Stravik filters: oil, air, cabin, fuel and coolant filters",
    intro: "Oil, air, cabin, fuel and coolant filters for passenger cars, bakkies, trucks and equipment, each referenced to its OE number.",
    hero: [`${IMG}/filters/hero.webp`, "Stravik air, cabin, oil and fuel filters"],
    stats: [["{parts}", "Filters"], ["{makes}", "Vehicle makes"], ["6,300+", "Cross-references"]],
    about: {
      h: "What filters do",
      lead: "An engine burns thousands of litres of air for every litre of fuel, and every drop of oil and fuel passes through tight clearances. Filters keep dust, soot, metal particles and water out of the engine, the fuel system and the cabin.",
      jobs: [["Oil filter", "Removes wear particles and soot from the engine oil. Where an anti-drain valve is fitted, it keeps oil in the filter so pressure builds quickly on a cold start."],
        ["Air filter", "Stops dust and sand reaching the cylinders, where they wear the rings, liners and turbo."],
        ["Fuel filter", "Removes dirt and, on diesel engines, water before it reaches the injection pump and injectors."],
        ["Cabin filter", "Cleans the air coming into the cabin. Activated carbon versions also reduce odours and exhaust gases."],
        ["Coolant filter", "Removes scale and debris from the cooling system on heavy-duty engines."]],
      shot: [`${IMG}/filters/about.webp`, "Stravik air, cabin and oil filters", "Filtration", "Oil, air and cabin filters from the Stravik range"]
    },
    whyTitle: "Why Stravik filters",
    why: [["Right fit, first time.", "Each filter is matched to its original equipment part, with the OE reference recorded for every number."],
      ["One search, any number.", "Enter a Stravik, OE or competitor part number (GUD, MANN, MAHLE, FRAM, Bosch, Donaldson and others), or pick the vehicle, and the matching filter comes up."],
      ["Sizes listed.", "Height, diameters, thread, gasket size and valve details are shown for each part, so you can check fit before ordering."],
      ["Simple part numbers.", "The code shows the filter type: OR oil spin-on, OE oil element, AP air panel, AC air round, H/HC cabin, DR/DE/DL diesel, GL/GE petrol, R coolant, J kits."],
      ["One range, one look.", "The same pack, label and part number system across every filter type, so a fitter knows what they are holding before they open the box."]],
    cards: [[`${IMG}/filters/air.webp`, "Stravik panel and round air filters", "AP · AC", "Air filters", "Panel, round, heavy-duty primary and safety elements.", "463 filters"],
      [`${IMG}/filters/cabin.webp`, "Stravik pollen and activated carbon cabin filters", "H · HC", "Cabin filters", "Pollen and activated carbon.", "240 filters"],
      [`${IMG}/filters/oil.webp`, "Stravik spin-on oil filter and oil filter element", "OR · OE", "Oil filters", "Spin-on and cartridge elements, including metal-free.", "209 filters"],
      [`${IMG}/filters/diesel.webp`, "Stravik diesel spin-on fuel filter with water separator bowl, and fuel filter element", "DR · DE · DL", "Diesel fuel filters", "Spin-on, element, in-line and water separators.", "151 filters"],
      [`${IMG}/filters/petrol.webp`, "Stravik metal and plastic in-line petrol fuel filters", "GL · GE", "Petrol fuel filters", "In-line and element.", "49 filters"],
      [`${IMG}/filters/coolant.webp`, "Stravik spin-on coolant filter", "R", "Coolant filters", "Spin-on coolant filters for heavy-duty engines.", "1 filter"]],
    band: [`${IMG}/filters/kits.webp`, "Stravik filter kit: air, oil, cabin and oil element filters", "J", "Filter kits", "The filters a vehicle needs at its service, such as oil, air, fuel and cabin filters, in one pack under one Stravik part number. Each kit lists the filters it contains.", "6 kits"],
    cover: [["{parts}", "Part numbers"], ["7", "Filter types"], ["30,000+", "Vehicle application lines"], ["6,300+", "OE and cross-reference numbers"]],
    coverNote: "Passenger cars, bakkies, light commercials, trucks and off-highway equipment. Main makes: Toyota, Isuzu, Hino, Nissan, Fuso, UD Trucks, Mazda, Honda, Mitsubishi, Suzuki, Subaru, Daihatsu and Lexus, plus European makes and heavy equipment.",
    signs: ["The service interval is reached (change the oil filter at every oil change)", "Loss of power, poor throttle response or higher fuel use", "Hard starting, misfiring or a water warning light on a diesel", "A low oil pressure warning", "Weak airflow, misted windows or odours in the cabin", "The filter is dirty, damaged or soaked"],
    signsTitle: "Signs a filter needs replacing",
    tips: ["Change the oil filter every time you change the oil, and replace the sump plug washer.", "Lightly oil the gasket of a spin-on filter, and tighten by hand to the torque printed on the filter.", "Fit air and cabin filters with the airflow arrow the right way round, and clean the housing first.", "After changing a diesel fuel filter, bleed the air out of the fuel system as the vehicle maker specifies.", "Check for leaks after a short run."],
    catTitle: "The Stravik filter catalogue",
    catText: "Search by Stravik, OE or cross-reference number, or by vehicle. Every filter is listed with its sizes, OE numbers and the vehicles it fits."
  },

  // Copy: "Stravik water pumps – website About the range copy" (draft, 17 Nov 2026). Left out until confirmed: seal
  // material, warranty and factory certification. Counts from water-pumps.json (the draft said 73 makes; the data has 72).
  "water-pumps": {
    data: "water-pumps.json", catalogue: "/#/water-pumps", find: "Find your water pump",
    eyebrow: "Engine cooling", name: "Stravik water pumps", short: "water pump",
    title: "Stravik water pumps: mechanical and electric water pumps",
    intro: "Over 1,250 mechanical and electric water pumps for passenger cars, light commercials and hybrids, covering more than 70 vehicle makes.",
    hero: ["/assets/img/water-pumps/photo.webp", "Stravik water pumps"],
    stats: [["{parts}", "Water pumps"], ["{makes}", "Vehicle makes"], ["14,500+", "Vehicle applications"]],
    about: {
      h: "What a water pump does",
      paras: ["The water pump keeps coolant moving between the engine, the radiator and the heater. Without that flow, engine heat builds up quickly, leading to overheating, a warped cylinder head or a failed head gasket.",
        "Most pumps are driven by the engine through the timing belt or the auxiliary (V-ribbed) belt. Newer engines also use electric pumps, which a control unit switches on and off as needed. They can keep coolant moving after the engine stops and also cool the turbo, the EGR system and hybrid batteries."],
      shot: ["/assets/img/water-pumps/card.webp", "Stravik water pumps", "Engine cooling", "Mechanical and electric water pumps from the Stravik range"]
    },
    whyTitle: "Why Stravik water pumps",
    why: [["Referenced to OE numbers.", "Each pump is referenced to its OE numbers and cross-checked against the main aftermarket brands."],
      ["Ready to fit.", "Gaskets or O-rings are supplied where the application needs them, and pulleys where the OE pump has one fitted."],
      ["Built for heat and pressure.", "Aluminium or cast-iron housings, metal or plastic impellers to the OE design, and a sealed bearing with a mechanical face seal."],
      ["Easy to find.", "Every pump has one Stravik part number (for example SCWP0002), with OE and cross-reference numbers in the catalogue."]],
    table: { head: ["Type", "What it is", "Typical use"], rows: [
      ["Mechanical – timing belt driven", "Driven by the timing belt; usually replaced together with the belt", "Many petrol and diesel engines from European and Asian makes"],
      ["Mechanical – V-ribbed / V-belt driven", "Driven by the auxiliary drive belt", "Wide use across cars and LCVs"],
      ["Mechanical – switchable", "Vacuum-controlled pump that stays off while the engine warms up, so it reaches temperature faster", "Newer VAG and other downsized engines"],
      ["Electric – main coolant pump", "Electrically driven main pump, controlled by the engine ECU", "Modern petrol, diesel and hybrid engines"],
      ["Electric – auxiliary / after-run", "Extra 12 V pump for the turbo, EGR or heater circuit and for after-run cooling", "Turbocharged and premium vehicles"],
      ["Electric – parking heater", "Circulates coolant for the auxiliary or parking heater", "Vehicles with heater systems"],
      ["Electric – battery cooling", "Cools the battery and power electronics", "Hybrid and electric vehicles"]] },
    cover: [["{parts}", "Part numbers"], ["1,009", "Mechanical"], ["248", "Electric"], ["{makes}", "Vehicle makes"]],
    coverNote: "14,500+ vehicle applications. Main makes: Ford, Audi, Toyota, BMW, Mercedes-Benz, Opel, Volkswagen, Nissan, Fiat, Peugeot, Hyundai, Renault, Skoda and Mitsubishi.",
    signsTitle: "Signs a water pump needs replacing",
    signs: ["Coolant leaking from the pump's weep hole or the gasket face", "Rising engine temperature or overheating", "Whining or grinding from the bearing", "Play or wobble in the pulley shaft", "Low heater output", "Warning light or fault code for an electric pump"],
    tips: ["Replace the timing belt, tensioner and idlers when you replace a timing-belt-driven pump.", "Flush the cooling system and fill with the coolant type the vehicle maker specifies.", "Use only the gasket or sealant method the vehicle maker specifies.", "Bleed the air out of the system after filling.", "Check the bearing and seal after a short run."],
    catTitle: "The Stravik water pump catalogue",
    catText: "Search by Stravik, OE or cross-reference number, or by vehicle make, model, year and engine."
  },

  // Short pages from the catalogue data until the copy is written. The intro is the range's text on the Products page.
  "spark-plugs": { data: "spark-plugs.json", catalogue: "/#/spark-plugs", find: "Find your spark plug", eyebrow: "Ignition", name: "Stravik spark plugs", short: "spark plug",
    intro: "Nickel copper, platinum and iridium spark plugs, each with its plug type, electrode gap, NGK and OE numbers and the vehicles it fits." },
  "ignition-coils": { data: "ignition-coils.json", catalogue: "/#/ignition-coils", find: "Find your ignition coil", eyebrow: "Ignition", name: "Stravik ignition coils", short: "ignition coil",
    intro: "Ignition coils, coil packs and pencil coils for cars, bakkies and motorcycles, each with its connector, OE numbers and vehicles." },
  "alternators": { data: "alternators.json", catalogue: "/#/alternators", find: "Find your alternator", eyebrow: "Electrical", name: "Stravik alternators", short: "alternator",
    intro: "Alternators and alternator parts (bearings, brushes, pulleys, regulators, rotors, stators), with vehicle fitment and OE numbers." },
  "starters": { data: "starters.json", catalogue: "/#/starters", find: "Find your starter motor", eyebrow: "Electrical", name: "Stravik starter motors", short: "starter motor",
    intro: "12 V and 24 V starter motors for cars, pickups and light commercials, with vehicle fitment and OE numbers." },
  "clutch-kits": { data: "clutch-kits.json", catalogue: "/#/clutch-kits", find: "Find your clutch kit", eyebrow: "Clutch", name: "Stravik clutch kits", short: "clutch kit",
    intro: "Clutch kits and clutch discs for cars, bakkies and light commercials, each with its kit type, OD, splines, OE and cross-reference numbers." },
  "horns": { data: "horns.json", catalogue: "/#/horns", find: "Find your horn", eyebrow: "Electrical", name: "Stravik horns", short: "horn",
    intro: "Disc and trumpet horns for 12 V and 24 V, single or as high and low tone sets, with their Bosch, Fiamm and Hella numbers." },
  "bulbs": { data: "bulbs.json", catalogue: "/#/bulbs", find: "Find your bulb", eyebrow: "Lighting", name: "Stravik bulbs", short: "bulb",
    intro: "Halogen, miniature, LED and HID xenon bulbs, each with its bulb type, base, voltage and wattage." },
  "wiper-blades": { data: "wiper-blades.json", catalogue: "/#/wiper-blades", find: "Find your wiper blade", eyebrow: "Wiper systems", name: "Stravik wiper blades", short: "wiper blade",
    intro: "Conventional, flat, hybrid, rear and truck and bus wiper blades from 10\" to 40\", with their OE and Bosch, Denso and Valeo numbers." }
};

// =====================================================================================================================
// catalogue figures
// =====================================================================================================================
function figures(c) {
  const d = JSON.parse(rd(c.data));
  if (Array.isArray(d.items)) {   // filters.json
    const makes = d.makes.length, refs = d.items.reduce((s, i) => s + (i.n || []).length, 0), apps = d.items.reduce((s, i) => s + (i.a || []).length, 0);
    return { parts: d.items.length, makes, refs, apps, types: [], top: [] };
  }
  const P = d.parts, per = new Map();
  let apps = 0, refs = 0;
  for (const p of P) {
    const ap = p.ap || []; apps += ap.length; refs += (p.oe || []).length + (p.xr || []).length;
    for (const m of new Set(ap.map(a => a && a[0]).filter(x => x != null))) per.set(m, (per.get(m) || 0) + 1);
  }
  const names = new Map((d.types || []).map(t => [t[0], t[2]])), count = new Map();
  for (const p of P) count.set(p.t, (count.get(p.t) || 0) + 1);
  const types = [...count].sort((a, b) => b[1] - a[1]).map(([t, n]) => [names.get(t) || t, n]);
  const top = [...per].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([m]) => typeof m === "number" ? d.makes[m] : m).filter(Boolean);
  return { parts: P.length, makes: per.size, refs, apps, types, top };
}
const fill = (s, f) => String(s).replace(/\{(parts|makes|apps|refs)\}/g, (m, k) => num(f[k]));
const list = a => a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "";

// =====================================================================================================================
// page parts
// =====================================================================================================================
const index = rd("index.html");
const cut = (a, b) => { const i = index.indexOf(a), j = index.indexOf(b, i); if (i < 0 || j < 0) throw new Error("index.html: missing " + a); return index.slice(i, j + b.length); };
const SHELL = {
  icons: index.split("\n").filter(l => /rel="(icon|apple-touch-icon)"/.test(l)).join("\n"),
  fonts: cut("<!-- fonts -->", "<!-- /fonts -->"),
  header: cut('<header class="site">', "</header>"),
  fcart: cut('<a href="/#/cart" class="fcart"', "</a>"),
  toast: cut('<div class="toast"', "</div>"),
  footer: cut('<footer class="site">', "</footer>")
};
const V = f => "/assets/" + f + "?v=" + crypto.createHash("sha1").update(rd("assets/" + f)).digest("hex").slice(0, 10);
const abs = u => /^https?:/.test(u) ? u : SITE + u;

function page(slug, c) {
  const f = figures(c), url = `${SITE}/range/${slug}/`;
  const stats = c.stats || [["{parts}", "Part numbers"]].concat(f.makes ? [["{makes}", "Vehicle makes"]] : []).concat(f.refs ? [["{refs}", "OE and cross-reference numbers"]] : []);
  const cover = c.cover || [["{parts}", "Part numbers"]].concat(f.types.length > 1 ? [[String(f.types.length), "Types"]] : []).concat(f.makes ? [["{makes}", "Vehicle makes"]] : []).concat(f.apps ? [["{apps}", "Vehicle applications"]] : []).concat(f.refs && !f.makes ? [["{refs}", "Cross-references"]] : []);
  const coverNote = c.coverNote || (f.top.length ? `Main makes: ${list(f.top.slice(0, 10))}.` : "");
  const hero = c.hero || [`/assets/img/${slug}/photo.webp`, c.name];
  const desc = c.desc || c.intro;
  const title = (c.title || c.name) + " | Stravik";
  const sec = (n, k) => `<div class="rl-sec-head"><span class="rl-tag">${n}</span><span class="k">${esc(k)}</span><span class="r"></span></div>`;
  const dash = a => `<ul class="rl-dash">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const catText = c.catText || `Search by Stravik${f.refs ? ", OE or cross-reference" : ""} number${f.makes ? ", or by vehicle" : ""}. Every ${c.short} is listed with its details${f.refs ? " and reference numbers" : ""}.`;

  let about = "";
  if (c.about) {
    const a = c.about, text = a.lead || a.jobs
      ? (a.lead ? `<p class="rl-lead">${esc(a.lead)}</p>` : "") + (a.jobs ? `<dl class="rl-jobs">${a.jobs.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>` : "")
      : `<div class="rl-text">${a.paras.map(p => `<p>${esc(p)}</p>`).join("")}</div>`;
    about = `<h2 class="rl-sec" id="about-h">${esc(a.h)}</h2>
  <div class="rl-intro${a.shot ? "" : " solo"}"><div>${text}</div>${a.shot ? `<figure class="rl-shot"><img src="${a.shot[0]}" alt="${esc(a.shot[1])}" loading="lazy" width="1376" height="768"><figcaption><span class="k">${esc(a.shot[2])}</span><span>${esc(a.shot[3])}</span></figcaption></figure>` : ""}</div>`;
  } else about = `<h2 class="rl-sec" id="about-h">What's in the range</h2>
  <div class="rl-intro solo"><div><p class="rl-lead">${esc(c.intro)}</p></div></div>`;

  const why = c.why ? `<h3 class="rl-sub">${esc(c.whyTitle || "Why Stravik")}</h3><div class="rl-why">${c.why.map(([b, p]) => `<div><b>${esc(b)}</b><p>${esc(p)}</p></div>`).join("")}</div>` : "";
  let range = "";
  if (c.cards) range = `<h3 class="rl-sub">The range</h3><div class="rl-range">${c.cards.map(([img, alt, code, h, p, n]) => `<article class="rl-rc"><div class="rl-rc-media"><img src="${img}" alt="${esc(alt)}" loading="lazy" width="1100" height="614"></div><div class="rl-rc-body"><span class="rl-code">${esc(code)}</span><h4>${esc(h)}</h4><p>${esc(p)}</p><span class="rl-n">${esc(n)}</span></div></article>`).join("")}</div>` +
    (c.band ? `<article class="rl-band"><div class="rl-band-media"><img src="${c.band[0]}" alt="${esc(c.band[1])}" loading="lazy" width="1100" height="614"></div><div class="rl-band-body"><span class="rl-code">${esc(c.band[2])}</span><h4>${esc(c.band[3])}</h4><p>${esc(c.band[4])}</p><span class="rl-n">${esc(c.band[5])}</span></div></article>` : "");
  else if (c.table) range = `<h3 class="rl-sub">The range</h3><div class="rl-tablebox"><table class="rl-table"><thead><tr>${c.table.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${c.table.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  else if (f.types.length > 1) range = `<h3 class="rl-sub">The range</h3><div class="rl-tablebox"><table class="rl-table"><thead><tr><th>Type</th><th>Part numbers</th></tr></thead><tbody>${f.types.map(([t, n]) => `<tr><td>${esc(t)}</td><td>${num(n)}</td></tr>`).join("")}</tbody></table></div>`;
  const coverHtml = `<div class="rl-cover${cover.length === 3 ? " three" : ""}">${cover.map(([v, l]) => `<div><b>${esc(fill(v, f))}</b><span>${esc(l)}</span></div>`).join("")}${coverNote ? `<p>${esc(coverNote)}</p>` : ""}</div>`;
  const two = c.signs || c.tips ? `<div class="rl-two">${c.signs ? `<div><h3 class="rl-sub">${esc(c.signsTitle || "Signs it needs replacing")}</h3>${dash(c.signs)}</div>` : ""}${c.tips ? `<div><h3 class="rl-sub">Fitting tips</h3>${dash(c.tips)}</div>` : ""}</div>` : "";
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: c.name, description: desc, url, isPartOf: { "@type": "WebSite", name: "Stravik", url: SITE + "/" } };

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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stravik">
<meta property="og:title" content="${esc(c.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(abs(hero[0]))}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
${SHELL.fonts}
<link rel="stylesheet" href="${V("site.css")}">
<link rel="stylesheet" href="${V("range.css")}">
</head>
<body>
<!-- Range landing page, built by tools/range-pages.js from its CONTENT entry. Edit the content there, not here. -->
${SHELL.header}
<main id="app" tabindex="-1" class="rl">
<section class="rl-hero" aria-label="${esc(c.name)}">
  <div class="rl-hero-grid">
    <div class="rl-hero-copy"><div class="rl-hero-text">
      <div class="rl-crumbs"><a href="/#/">Home</a><span>/</span><a href="/#/products">Products</a><span>/</span><span>${esc(c.name.replace(/^Stravik /, "").replace(/^./, s => s.toUpperCase()))}</span></div>
      <div class="rl-eyebrow">${esc(c.eyebrow)}</div>
      <h1>${esc(c.name)}</h1>
      <p>${esc(c.intro)}</p>
      <div class="rl-stats">${stats.map(([v, l]) => `<div><b>${esc(fill(v, f))}</b><span>${esc(l)}</span></div>`).join("")}</div>
      <div class="rl-hero-cta"><a class="rl-btn gold" href="/#/dealer" data-rl-open data-cat="${esc(c.catalogue)}">${esc(c.find)}</a><a class="rl-btn ghost" href="#about">About the range</a></div>
    </div></div>
    <div class="rl-hero-media"><img src="${esc(hero[0])}" alt="${esc(hero[1])}" fetchpriority="high"></div>
  </div>
</section>

<div class="rl-wrap rl-main">
<section id="about" aria-labelledby="about-h">
  ${sec("01", "About the range")}
  ${about}
  ${why}
  ${range}
  ${coverHtml}
  ${two}
  <div class="rl-cat" id="catalogue">
    <div><h3>${esc(c.catTitle || `The Stravik ${c.short} catalogue`)}</h3><p>${esc(catText)}</p></div>
    <div class="rl-cat-actions"><a class="rl-btn" href="/#/dealer" data-rl-open data-cat="${esc(c.catalogue)}">${esc(c.find)}</a></div>
    <div class="rl-gate" id="rl-gate"><div><b>Register with us to see our catalogues</b><span id="rl-gate-t">Create a customer account to open the Stravik catalogues, see your prices and order online.</span></div><a class="rl-btn line" href="/#/dealer?m=new">Register or sign in</a></div>
  </div>
</section>
</div>
</main>
${SHELL.fcart}
${SHELL.toast}
${SHELL.footer}
<script src="${V("catalog.js")}"></script>
<script src="${V("common.js")}"></script>
<script src="${V("dealer.js")}"></script>
<script src="${V("gate.js")}"></script>
</body>
</html>
`;
}

for (const [slug, c] of Object.entries(CONTENT)) {
  const f = path.join(ROOT, "range", slug, "index.html");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, page(slug, c));
}
console.log(`Built ${Object.keys(CONTENT).length} range landing pages: ${Object.keys(CONTENT).join(", ")}`);
