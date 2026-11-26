// All Star redesign: the store owner's page in two halves (the store's reward, the All Stars Heroes' rewards), the
// Heroes' own page with badges and milestones, bronze/silver/gold colours. assets/allstar.js and assets/allstar.css are
// committed with this script; this links the new stylesheet on the All Star page and gives it the new file versions.
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
edit("allstar/index.html", [
  ['<link rel="stylesheet" href="/assets/autobarn.css?v=6">', '<link rel="stylesheet" href="/assets/autobarn.css?v=6">\n<link rel="stylesheet" href="/assets/allstar.css?v=1">'],
  ['/assets/allstar.js?v=5"', '/assets/allstar.js?v=6"'],
]);
