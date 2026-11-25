// All Star, step 1: counter staff. New page /allstar/ (assets/allstar.js): counter staff sign in with mobile number and
// PIN and see their own page; a store owner adds and manages the store's counter staff there. The main site sends a
// counter person to /allstar/ after signing in, adds "All Star" to the account menu of group stores and "Your All Star"
// for counter staff, and points counter staff from the sign-in page to /allstar/. Edge function: stravik-staff.
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
edit("assets/dealer.js", [
  ["  if(!d&&me.partner&&!me.staff)return \"/insync/\";\n", "  if(!d&&me.partner&&!me.staff)return \"/insync/\";\n  if(!d&&me.counter&&!me.staff)return \"/allstar/\";\n"],
  ["  if(me.partner)it.push([\"/insync/\",\"DP World InSync portal\"]);",
   "  if(d&&d.status===\"Approved\"&&d.network&&d.account_type!==\"head_office\")it.push([\"/allstar/\",\"All Star\"]);\n  if(!d&&me.counter)it.push([\"/allstar/\",\"Your All Star\"]);\n  if(me.partner)it.push([\"/insync/\",\"DP World InSync portal\"]);"],
  ["  if(!me.dealer&&me.partner&&!me.staff){location.href=\"/insync/\";return;}", "  if(!me.dealer&&me.partner&&!me.staff){location.href=\"/insync/\";return;}\n  if(!me.dealer&&me.counter&&!me.staff){location.href=\"/allstar/\";return;}"],
  ["<p class=\"dhint\">Accounts are reviewed by our team before prices are shown.</p>", "<p class=\"dhint\">Accounts are reviewed by our team before prices are shown.</p><p class=\"dhint\">Counter staff on Stravik All Star: <a href=\"/allstar/\">sign in with your mobile number</a>.</p>"],
]);
edit("assets/autobarn.css", [
  ["@media (max-width:520px){.is-fields{grid-template-columns:1fr}}\n",
   "@media (max-width:520px){.is-fields{grid-template-columns:1fr}}\n" +
   "\n/* All Star page (assets/allstar.js) */\n" +
   ".ab-switch{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:6px}\n" +
   ".ab-switch button{font:inherit;font-weight:600;background:none;border:0;padding:10px 14px;color:var(--muted);border-bottom:3px solid transparent;margin-bottom:-1px}\n" +
   ".ab-switch button[aria-selected=\"true\"]{color:var(--ink);border-bottom-color:var(--gold)}\n" +
   ".as-form{padding:14px 16px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:6px}\n" +
   ".ab-od .as-form{margin:6px 0}\n" +
   ".as-form .dhint{margin:8px 0 10px}\n" +
   ".as-acts{white-space:nowrap}\n" +
   ".as-acts .linkbtn+.linkbtn{margin-left:14px}\n"],
]);
edit("autobarn/index.html", [['/assets/autobarn.css?v=3"', '/assets/autobarn.css?v=4"'], ['/assets/dealer.js?v=4"', '/assets/dealer.js?v=5"']]);
edit("insync/index.html", [['/assets/autobarn.css?v=3"', '/assets/autobarn.css?v=4"'], ['/assets/dealer.js?v=4"', '/assets/dealer.js?v=5"']]);
{
  let s = fs.readFileSync("autobarn/index.html", "utf8");
  const swap = [
    ["<title>Autobarn | Stravik</title>", "<title>Stravik All Star</title>"],
    ['content="Stravik for Autobarn stores: sign in to see your range and prices, order online and follow your orders."', 'content="Stravik All Star: sign in as counter staff with your mobile number, or as store owner."'],
    ["https://stravikparts.com/autobarn/", "https://stravikparts.com/allstar/"],
    ['<body class="portal" data-network="autobarn" data-network-name="Autobarn">', '<body class="portal">'],
    ['<a class="brand" href="/autobarn/" aria-label="Stravik for Autobarn">', '<a class="brand" href="/allstar/" aria-label="Stravik All Star">'],
    ["/assets/autobarn.js?v=5", "/assets/allstar.js?v=1"],
  ];
  for (const [from, to] of swap) {
    if (s.split(from).length - 1 !== 1) { console.error("autobarn/index.html: expected the text once: " + from.slice(0, 60)); process.exit(1); }
    s = s.replace(from, () => to);
  }
  fs.mkdirSync("allstar", { recursive: true });
  fs.writeFileSync("allstar/index.html", s);
  console.log("allstar/index.html: written");
}
