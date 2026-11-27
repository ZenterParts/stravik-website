// All Star "Month by month" chart: call the lower part of each column "Previous month" (was "Before the month").
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
  ['<i class="mc-before"></i>Before the month</span>', '<i class="mc-before"></i>Previous month</span>'],
]);
edit("allstar/index.html", [
  ['/assets/allstar.js?v=14"', '/assets/allstar.js?v=15"'],
]);
console.log("All Star chart key: Previous month");
