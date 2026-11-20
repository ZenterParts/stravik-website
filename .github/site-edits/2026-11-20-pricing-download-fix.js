// Pricing app: the costing download stopped with "mk is not a function". Inside the row writer a local variable
// called mk (the market price cell) hid the function mk() that gives each part its number. The variable is renamed.
const fs = require("fs");
const file = "admin/m-pricing.js";
const s = fs.readFileSync(file, "utf8");
const start = "var mk = a('_market_price'), lo = ", end = "var mkv = val(x, '_market_price')";
const i = s.indexOf(start), j = s.indexOf(end, i);
if (i < 0 || j < 0 || s.indexOf(start, i + 1) >= 0) { console.error(file + ": the market price lines were not found exactly once"); process.exit(1); }
const fixed = s.slice(i, j).replace(/\bmk\b/g, "mkt");
fs.writeFileSync(file, s.slice(0, i) + fixed + s.slice(j));
