// 1. Adds the Networks app (admin/m-networks.js) to the admin site: store networks such as Autobarn, their head office
//    account, store list, classes, targets and suggested prices. tools/build-pages.js then stamps the file's version.
// 2. New version of the South Africa home page files (product list for network stores), so browsers fetch them again.
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
edit("admin/index.html", [
  ['<script src="/admin/m-pricing.js', '<script src="/admin/m-networks.js"></script>\n<script src="/admin/m-pricing.js'],
]);
edit("index.html", [
  ['/assets/sa-home.js?v=2"', '/assets/sa-home.js?v=3"'],
  ['/assets/sa-home.css?v=2"', '/assets/sa-home.css?v=3"'],
]);
