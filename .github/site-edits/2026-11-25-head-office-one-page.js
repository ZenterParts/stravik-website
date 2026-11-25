// A head office has one page: its dashboard (/autobarn/). The home page (the Stravik logo) sends a head office account
// there instead of showing the store product list, and its account menu offers the dashboard and its account only.
// The dashboard's Price list tab already shows every part with the head office's prices.
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
edit("assets/sa-home.js", [
  ["  const data=stock();if(!data)return false;\n",
   "  const hq=dealer();if(hq&&hq.status===\"Approved\"&&hq.account_type===\"head_office\"){wait(app);location.replace(\"/autobarn/\");return true;}   // a head office's home is its dashboard\n" +
   "  const data=stock();if(!data)return false;\n"],
]);
edit("assets/dealer.js", [
  ["  if(d&&d.status===\"Approved\"){\n    if(d.account_type===\"head_office\")it.push([\"/autobarn/\",\"Head office dashboard\"]);\n",
   "  if(d&&d.status===\"Approved\"&&d.account_type===\"head_office\")it.push([\"/autobarn/\",\"Head office dashboard\"],[\"/#/dealer\",\"Your account\"]);\n" +
   "  else if(d&&d.status===\"Approved\"){\n"],
]);
edit("index.html", [
  ['/assets/sa-home.js?v=3"', '/assets/sa-home.js?v=4"'],
]);
edit("autobarn/index.html", [['/assets/dealer.js?v=2"', '/assets/dealer.js?v=3"']]);
edit("insync/index.html", [['/assets/dealer.js?v=2"', '/assets/dealer.js?v=3"']]);
