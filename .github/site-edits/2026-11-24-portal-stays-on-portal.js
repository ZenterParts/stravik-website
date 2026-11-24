// The Autobarn page (/autobarn/) and the DP World InSync portal (/insync/) keep people on the portal:
// 1. the Stravik logo on those pages opens the portal itself, not the public home page, and the public menu, the cart
//    button and the footer links are not shown there;
// 2. the browser remembers the portal, so the main site shows a link back to it in the menu, and choosing a new
//    password ("Forgot your password?") returns to the portal instead of the customer account page.
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
edit("autobarn/index.html", [
  ['<body data-network="autobarn" data-network-name="Autobarn">', '<body class="portal" data-network="autobarn" data-network-name="Autobarn">'],
  ['<a class="brand" href="/#/" aria-label="Stravik home">', '<a class="brand" href="/autobarn/" aria-label="Stravik for Autobarn">'],
  ['/assets/autobarn.css?v=2"', '/assets/autobarn.css?v=3"'],
  ['/assets/autobarn.js?v=2"', '/assets/autobarn.js?v=3"'],
]);
edit("insync/index.html", [
  ["<body>", '<body class="portal">'],
  ['<a class="brand" href="/#/" aria-label="Stravik home">', '<a class="brand" href="/insync/" aria-label="Stravik for DP World InSync">'],
  ['/assets/autobarn.css?v=2"', '/assets/autobarn.css?v=3"'],
  ['/assets/insync.js?v=1"', '/assets/insync.js?v=2"'],
]);
edit("assets/autobarn.css", [
  ["@media (max-width:520px){.is-fields{grid-template-columns:1fr}}\n",
   "@media (max-width:520px){.is-fields{grid-template-columns:1fr}}\n" +
   "\n/* Portal pages (/autobarn/, /insync/): no public menu, cart button or footer links, so nobody leaves the portal by accident */\n" +
   "body.portal header.site nav.main,body.portal header.site .menu-btn,body.portal #fcart,body.portal footer.site .cols > div:not(.about),body.portal footer.site .staff{display:none !important}\n" +
   "body.portal footer.site .cols{display:block}\n"],
]);
edit("assets/autobarn.js", [
  ['"use strict";\n', '"use strict";\ntry{localStorage.setItem("stravik-portal","/autobarn/");}catch(e){}   // the main site then shows a link back to this page\n'],
]);
edit("assets/insync.js", [
  ['"use strict";\n', '"use strict";\ntry{localStorage.setItem("stravik-portal","/insync/");}catch(e){}   // the main site then shows a link back to this page\n'],
]);
edit("assets/dealer.js", [
  // someone who came in through a portal page gets a link back to it in the menu of the main site
  ["const ref=nav.querySelector('a[data-nav=contact]');nav.insertBefore(a,ref||null);}\n",
   "const ref=nav.querySelector('a[data-nav=contact]');nav.insertBefore(a,ref||null);}\n" +
   "  let portal=\"\";try{portal=localStorage.getItem(\"stravik-portal\")||\"\";}catch(e){}\n" +
   "  if((portal===\"/autobarn/\"||portal===\"/insync/\")&&!nav.querySelector(\"a[data-nav=portal]\")){const p=document.createElement(\"a\");p.dataset.nav=\"portal\";p.href=portal;p.textContent=portal===\"/insync/\"?\"DP World InSync portal\":\"Autobarn portal\";nav.insertBefore(p,a);}\n"],
  // a new password chosen from a portal's \"Forgot your password?\" goes back to that portal
  ['toast("Password saved");go("#/dealer");',
   'toast("Password saved");let portal="";try{portal=localStorage.getItem("stravik-portal")||"";}catch(e){}if(portal==="/autobarn/"||portal==="/insync/"){location.href=portal;return;}go("#/dealer");'],
]);
