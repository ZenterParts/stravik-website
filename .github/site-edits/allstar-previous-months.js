// All Star "Month by month" chart: key "Previous months" (plural: in month 3 the lower part holds two months).
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, found ${n}: ${a}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, s);
}
edit("assets/allstar.js", [
  ['<i class="mc-before"></i>Previous month</span>', '<i class="mc-before"></i>Previous months</span>'],
]);
edit("allstar/index.html", [
  ['/assets/allstar.js?v=15"', '/assets/allstar.js?v=16"'],
]);
console.log("All Star chart key: Previous months");
