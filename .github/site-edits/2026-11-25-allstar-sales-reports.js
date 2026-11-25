// All Star, step 2: the monthly sales report tab on /allstar/ (assets/allstar.js is committed with this script).
// This script adds the styles for it and gives the All Star page the new file versions.
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [from, to] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(`${file}: expected the text once, found it ${n} times: ${from.slice(0, 70)}`); process.exit(1); }
    s = s.replace(from, () => to);
  }
  fs.writeFileSync(file, s);
  console.log(file + ": updated");
}
{
  const f = "assets/autobarn.css";
  const s = fs.readFileSync(f, "utf8");
  if (s.includes(".as-up{")) { console.error(f + ": sales report styles already there"); process.exit(1); }
  fs.writeFileSync(f, s + "\n/* All Star: monthly sales reports */\n" +
    ".as-up{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 14px;margin:4px 0 8px}\n" +
    ".as-up label{display:grid;gap:5px;font-size:13.5px;font-weight:600;color:var(--muted)}\n" +
    ".as-up select{font:inherit;font-size:15px;padding:9px 11px;border:1.5px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)}\n" +
    ".as-sel{font:inherit;font-size:14.5px;padding:7px 9px;border:1.5px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);width:100%;max-width:440px}\n" +
    ".ab-dash .dnote{margin:14px 0}\n" +
    ".ab-save button:disabled{opacity:.5;cursor:default}\n");
  console.log(f + ": updated");
}
edit("allstar/index.html", [['/assets/autobarn.css?v=4"', '/assets/autobarn.css?v=5"'], ['/assets/allstar.js?v=3"', '/assets/allstar.js?v=4"']]);
