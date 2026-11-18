// Site edit, 18 Nov 2026: catalogues for approved customers only, the filters "About the range" page, About us boxes.
// Run once from the repository root by .github/workflows/apply-site-edits.yml, which then deletes this file.
// Each change replaces one exact piece of text and stops with an error if that text is not found exactly once,
// so nothing is changed unless every edit fits the current files.
"use strict";
const fs = require("fs");
const files = {};
const get = f => files[f] !== undefined ? files[f] : (files[f] = fs.readFileSync(f, "utf8"));
function edit(f, from, to) {
  const s = get(f), n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${f}: expected the text once, found it ${n} times: ${from.slice(0, 80)}`);
  files[f] = s.replace(from, () => to);
}

// ---- assets/app.js: the catalogue routes, part search, price requests and the cart are for approved customers
edit("assets/app.js", "function route(){\n  const raw=location.hash",
  "// approved customers only (assets/gate.js): the catalogues, part search, price requests and the cart\n" +
  "const LOCKED=[\"find\",\"request\",\"cart\",\"steering\",\"shock-absorbers\",\"brakes\",\"gas-springs\"];\n" +
  "const lockedRoute=p=>LOCKED.includes(p)||!!(p&&window.StdCat&&StdCat.has(p));\n" +
  "function route(){\n  const raw=location.hash");
edit("assets/app.js", "const parts=path.split(\"/\").filter(Boolean);\n  // a signed-in customer: the pages that list catalogues",
  "const parts=path.split(\"/\").filter(Boolean);\n" +
  "  const G=window.StravikGate;\n" +
  "  if(G&&lockedRoute(parts[0])){const st=G.state();\n" +
  "    if(st!==\"ok\"){const at=location.hash;app.innerHTML=G.html(st);document.title=(st===\"wait\"?\"Loading\":\"Register to see our catalogues\")+\" | Stravik\";\n" +
  "      ddSet(false);nav.classList.remove(\"open\");menuBtn.setAttribute(\"aria-expanded\",\"false\");window.scrollTo(0,0);\n" +
  "      if(st===\"wait\")G.check().then(()=>{if(location.hash===at)route();});\n" +
  "      return;}}\n" +
  "  // a signed-in customer: the pages that list catalogues");
edit("assets/app.js", "addEventListener(\"hashchange\",route);route();",
  "addEventListener(\"hashchange\",route);route();\n" +
  "// signed in or out while the \"register to see our catalogues\" panel is showing: draw the page again\n" +
  "document.addEventListener(\"stravik-prices\",()=>{if(app.querySelector(\"[data-gate]\"))route();});");
// the Filters card on the Products page: "About the range" opens the new landing page
edit("assets/app.js", "href=\"/filters/\">About the range</a>", "href=\"/range/filters/\">About the range</a>");

// ---- assets/dealer.js: /#/dealer?m=new opens on "Create account"
edit("assets/dealer.js", "if(!session)return signIn(app,c);",
  "if(!session)return signIn(app,c,/[?&]m=new\\b/.test(location.hash)?\"new\":\"in\");");

// ---- index.html: load the lock before the page scripts
edit("index.html", "<script src=\"/assets/stdcat.js", "<script src=\"/assets/gate.js\"></script>\n<script src=\"/assets/stdcat.js");

// ---- tools/build-pages.js: lock the catalogue and part pages, keep them out of search engines and the sitemap
edit("tools/build-pages.js", "\"fcat.js\", \"fcat.css\"];", "\"fcat.js\", \"fcat.css\", \"gate.js\"];");
edit("tools/build-pages.js", String.raw`stdcat-ranges\.js|app\.js)(\?v=`, String.raw`stdcat-ranges\.js|app\.js|gate\.js)(\?v=`);
edit("tools/build-pages.js", "function page({ url, title, desc, jsonld, body, type, scripts }) {",
  "// the catalogue and part pages are for approved customers (assets/gate.js): locked, and not for search engines\n" +
  "const LOCKED = u => /\\/(part|filter)\\/|\\/filters\\/$|\\/batteries\\/catalogue\\/$/.test(u);\n" +
  "function page({ url, title, desc, jsonld, body, type, scripts }) {");
edit("tools/build-pages.js", "<link rel=\"stylesheet\" href=\"${V[\"site.css\"]}\">\n</head>",
  "<link rel=\"stylesheet\" href=\"${V[\"site.css\"]}\">\n${LOCKED(url) ? `<meta name=\"robots\" content=\"noindex\">\\n<script src=\"${V[\"gate.js\"]}\" data-lock></script>\\n` : \"\"}</head>");
edit("tools/build-pages.js", "// ================= sitemap and robots =================\n",
  "// ================= sitemap and robots =================\n" +
  "// locked pages are left out; the range landing pages (/range/<range>/) are added\n" +
  "const RANGE_PAGES = fs.existsSync(path.join(ROOT, \"range\")) ? fs.readdirSync(path.join(ROOT, \"range\")).filter(d => fs.existsSync(path.join(ROOT, \"range\", d, \"index.html\"))).map(d => `${SITE}/range/${d}/`) : [];\n");
edit("tools/build-pages.js", "${urls.map(u => `<url><loc>${u}</loc></url>`).join(\"\\n\")}",
  "${urls.filter(u => !LOCKED(u)).concat(RANGE_PAGES).map(u => `<url><loc>${u}</loc></url>`).join(\"\\n\")}");

// ---- assets/site.css: About us, the two boxes stand side by side on the same line, neither covering the other
edit("assets/site.css", ".about-lead .pics{position:relative;height:420px}", ".about-lead .pics{display:flex;align-items:flex-end;justify-content:center;gap:5%;padding-bottom:18px}");
edit("assets/site.css", ".about-lead .pics img{position:absolute;filter:drop-shadow(0 20px 26px rgba(0,0,0,.2))}", ".about-lead .pics img{display:block;height:auto;filter:drop-shadow(0 18px 22px rgba(0,0,0,.18))}");
edit("assets/site.css", ".about-lead .pics .p1{width:72%;left:0;top:0}", ".about-lead .pics .p1{width:54%}");
edit("assets/site.css", ".about-lead .pics .p2{width:66%;right:0;bottom:0}", ".about-lead .pics .p2{width:41%}");
edit("assets/site.css", ".about-lead .pics{height:340px}", ".about-lead .pics{padding-bottom:12px}");

for (const f of Object.keys(files)) fs.writeFileSync(f, files[f]);
console.log("Edited: " + Object.keys(files).join(", "));
