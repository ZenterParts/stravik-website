// South Africa dealer dashboard: wires assets/sa-home.js and assets/sa-home.css into the site.
// 1. dealer.js shares its Supabase client, so the dashboard can ask for South African stock.
// 2. app.js: the home route asks the dashboard first; it draws the general home page when the dashboard says no.
// 3. index.html loads the two new files (sa-home.js before app.js).
const fs = require("fs");
function edit(file, from, to) {
  const s = fs.readFileSync(file, "utf8"), n = s.split(from).length - 1;
  if (n !== 1) { console.error(file + ": expected the text once, found it " + n + " times: " + from.slice(0, 60)); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, () => to));
}
for (const f of ["assets/sa-home.js", "assets/sa-home.css"]) if (!fs.existsSync(f)) { console.error("Missing " + f); process.exit(1); }
edit("assets/dealer.js", "window.StravikDealer={page,cart,tag,", "window.StravikDealer={page,cart,tag,client,");
edit("assets/app.js", "  if(!parts.length)home();\n",
  "  // an approved South African customer gets the South Africa dashboard (assets/sa-home.js); everyone else the home page\n  if(!parts.length){if(!(window.StravikSA&&StravikSA.home(app,route)))home();}\n");
edit("index.html", '<link rel="stylesheet" href="/assets/home-motion.css?v=1">',
  '<link rel="stylesheet" href="/assets/home-motion.css?v=1">\n<link rel="stylesheet" href="/assets/sa-home.css?v=1">');
edit("index.html", '<script src="/assets/stdcat.js', '<script src="/assets/sa-home.js?v=1"></script>\n<script src="/assets/stdcat.js');
