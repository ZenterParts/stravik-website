// One sign-in for everyone: the person icon in the header. After signing in, each account goes to its own place:
// DP World InSync users to /insync/, a head office to its dashboard (/autobarn/), a store of a group to its product list
// (the home page), everyone else to their account page. When signed in, the person icon opens an account menu with that
// account's own links (head office dashboard, products, cart, orders, InSync portal, admin site, sign out), replacing the
// "Autobarn portal" / "DP World InSync portal" link that was shown in the main menu. stravik_dealer_me() now says whether
// the person is a DP World InSync user ("partner"). /autobarn/ and /insync/ keep working as direct addresses.
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
  // the header: no more portal link in the main menu; the person icon becomes the account menu
  ["  let portal=\"\";try{portal=localStorage.getItem(\"stravik-portal\")||\"\";}catch(e){}\n" +
   "  if((portal===\"/autobarn/\"||portal===\"/insync/\")&&!nav.querySelector(\"a[data-nav=portal]\")){const p=document.createElement(\"a\");p.dataset.nav=\"portal\";p.href=portal;p.textContent=portal===\"/insync/\"?\"DP World InSync portal\":\"Autobarn portal\";nav.insertBefore(p,a);}\n",
   "  const old=nav.querySelector(\"a[data-nav=portal]\");if(old)old.remove();\n"],
  ["  a.innerHTML=`<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"/></svg><span class=\"nav-l\">${esc(label.length>22?label.slice(0,21)+\"…\":label)}</span>`;\n}\n",
   "  a.innerHTML=`<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"/></svg><span class=\"nav-l\">${esc(label.length>22?label.slice(0,21)+\"…\":label)}</span>`;\n" +
   "  acctMenu(nav,a,label);\n}\n" +
   "// where an account belongs after signing in: DP World InSync users to their portal, a head office to its dashboard,\n" +
   "// a store of a group (Autobarn) to its product list on the home page; null = the account page\n" +
   "function homeFor(me){\n" +
   "  if(!me)return null;const d=me.dealer;\n" +
   "  if(d&&d.status===\"Approved\"&&d.account_type===\"head_office\")return \"/autobarn/\";\n" +
   "  if(!d&&me.partner&&!me.staff)return \"/insync/\";\n" +
   "  if(d&&d.status===\"Approved\"&&d.network)return \"/\";\n" +
   "  return null;\n" +
   "}\n" +
   "async function goHome(){S.loading=null;const me=await ensure();const to=homeFor(me);if(to===\"/\"){if(location.pathname===\"/\")location.hash=\"#/\";else location.href=\"/\";return true;}if(to){location.href=to;return true;}return false;}\n" +
   "// the account menu behind the person icon: the signed-in account's own links\n" +
   "function acctItems(me){\n" +
   "  const d=me.dealer,it=[],sa=d&&d.country===\"South Africa\"&&[\"T1\",\"T2\",\"T3\",\"T4\",\"T5\",\"PREF\"].indexOf(d.price_group)>=0;\n" +
   "  if(d&&d.status===\"Approved\"){\n" +
   "    if(d.account_type===\"head_office\")it.push([\"/autobarn/\",\"Head office dashboard\"]);\n" +
   "    it.push(sa?[\"/\",\"Your products and prices\"]:[\"/#/products\",\"Browse the catalogue\"]);\n" +
   "    it.push([\"/#/cart\",\"Your cart\"],[\"/#/dealer\",\"Your orders and account\"]);\n" +
   "  }else if(d)it.push([\"/#/dealer\",d.status===\"Pending\"?\"Your registration\":\"Your account\"]);\n" +
   "  if(me.partner)it.push([\"/insync/\",\"DP World InSync portal\"]);\n" +
   "  if(me.staff)it.push([\"/admin/\",\"Admin site\"]);\n" +
   "  if(!d&&!me.partner&&!me.staff)it.push([\"/#/dealer\",\"Register your business\"]);\n" +
   "  return it;\n" +
   "}\n" +
   "let acctWired=false;\n" +
   "function acctOpen(o){const m=document.getElementById(\"acctmenu\"),a=document.querySelector(\"a[data-nav=dealer]\");if(!m)return;m.hidden=!o;if(a)a.setAttribute(\"aria-expanded\",String(!!o));}\n" +
   "function acctMenu(nav,a,label){\n" +
   "  let w=a.parentElement.classList.contains(\"acct-wrap\")?a.parentElement:null,m=document.getElementById(\"acctmenu\");\n" +
   "  if(!S.me){if(m)m.remove();a.onclick=null;a.removeAttribute(\"aria-haspopup\");a.removeAttribute(\"aria-expanded\");return;}\n" +
   "  if(!w){w=document.createElement(\"span\");w.className=\"acct-wrap\";a.parentElement.insertBefore(w,a);w.appendChild(a);}\n" +
   "  if(!m){m=document.createElement(\"div\");m.id=\"acctmenu\";m.className=\"acct-menu\";m.hidden=true;w.appendChild(m);}\n" +
   "  a.setAttribute(\"aria-haspopup\",\"true\");a.setAttribute(\"aria-controls\",\"acctmenu\");a.setAttribute(\"aria-expanded\",String(!m.hidden));\n" +
   "  a.onclick=e=>{e.preventDefault();acctOpen(m.hidden);};\n" +
   "  m.innerHTML=`<div class=\"acct-who\"><b>${esc(label)}</b><span>${esc(S.me.email||\"\")}</span></div>`+acctItems(S.me).map(x=>`<a href=\"${x[0]}\">${esc(x[1])}</a>`).join(\"\")+`<button type=\"button\" class=\"acct-out\">Sign out</button>`;\n" +
   "  m.querySelectorAll(\"a\").forEach(x=>x.addEventListener(\"click\",()=>acctOpen(false)));\n" +
   "  m.querySelector(\".acct-out\").onclick=async()=>{acctOpen(false);try{const c=await client();await signOut(c);}catch(e){location.href=\"/#/dealer\";}};\n" +
   "  if(!acctWired){acctWired=true;\n" +
   "    document.addEventListener(\"click\",e=>{const mm=document.getElementById(\"acctmenu\");if(mm&&!mm.hidden&&!e.target.closest(\".acct-wrap\"))acctOpen(false);});\n" +
   "    document.addEventListener(\"keydown\",e=>{const mm=document.getElementById(\"acctmenu\");if(e.key===\"Escape\"&&mm&&!mm.hidden){acctOpen(false);const x=document.querySelector(\"a[data-nav=dealer]\");if(x)x.focus();}});}\n" +
   "}\n"],
  // after signing in: straight to the account's own place
  ["        S.loading=null;page(app,[]);\n      }\n    }catch(err){",
   "        if(await goHome())return;\n        page(app,[]);\n      }\n    }catch(err){"],
  // a DP World InSync user who opens the customer account page goes to the portal; staff who are also InSync users get a link
  ["  if(me.staff&&!me.dealer){app.innerHTML=head(\"Customer account\")+`<div class=\"wrap dwrap\"><p class=\"dnote\">You're signed in as <b>${esc(me.email)}</b>, a staff account. Customer accounts are for our trade customers; manage them in the <a href=\"/admin/#/dealers\">admin site</a>.</p>",
   "  if(!me.dealer&&me.partner&&!me.staff){location.href=\"/insync/\";return;}\n" +
   "  if(me.staff&&!me.dealer){app.innerHTML=head(\"Customer account\")+`<div class=\"wrap dwrap\"><p class=\"dnote\">You're signed in as <b>${esc(me.email)}</b>, a staff account. Customer accounts are for our trade customers; manage them in the <a href=\"/admin/#/dealers\">admin site</a>.${me.partner?` You are also a DP World InSync user: <a href=\"/insync/\">open the DP World InSync portal</a>.`:\"\"}</p>"],
  // a new password: then to the account's own place
  ["toast(\"Password saved\");let portal=\"\";try{portal=localStorage.getItem(\"stravik-portal\")||\"\";}catch(e){}if(portal===\"/autobarn/\"||portal===\"/insync/\"){location.href=portal;return;}go(\"#/dealer\");",
   "toast(\"Password saved\");if(await goHome())return;go(\"#/dealer\");"],
]);

edit("assets/autobarn.js", [
  ["try{localStorage.setItem(\"stravik-portal\",\"/autobarn/\");}catch(e){}   // the main site then shows a link back to this page\n", ""],
  ["  if(!d)return note(NAME,me.staff?", "  if(!d&&me.partner&&!me.staff){location.href=\"/insync/\";return;}   // a DP World InSync user belongs on its portal\n  if(!d)return note(NAME,me.staff?"],
]);
edit("assets/insync.js", [
  ["try{localStorage.setItem(\"stravik-portal\",\"/insync/\");}catch(e){}   // the main site then shows a link back to this page\n", ""],
  ["which is not on the ${esc(NAME)} list. Ask your Stravik contact to add this email address, then reload the page.",
   "which is not on the ${esc(NAME)} list. Ask your Stravik contact to add this email address, then reload the page. If you are a Stravik customer, <a href=\"/\">go to your account on stravikparts.com</a>."],
]);
edit("autobarn/index.html", [
  ['/assets/site.css"', '/assets/site.css?v=2"'], ['/assets/dealer.js"', '/assets/dealer.js?v=2"'], ['/assets/autobarn.js?v=3"', '/assets/autobarn.js?v=4"'],
]);
edit("insync/index.html", [
  ['/assets/site.css"', '/assets/site.css?v=2"'], ['/assets/dealer.js"', '/assets/dealer.js?v=2"'], ['/assets/insync.js?v=2"', '/assets/insync.js?v=3"'],
]);
{
  const f = "assets/site.css", add =
    "\n/* account menu behind the person icon (paintNav / acctMenu in dealer.js) */\n" +
    ".acct-wrap{position:relative;display:inline-flex}\n" +
    ".acct-menu{position:absolute;right:0;top:calc(100% + 10px);width:290px;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 22px 44px -20px rgba(21,38,74,.4);padding:8px;z-index:60}\n" +
    ".acct-menu[hidden]{display:none}\n" +
    ".acct-menu .acct-who{display:grid;gap:2px;padding:8px 12px 10px;margin-bottom:4px;border-bottom:1px solid var(--line)}\n" +
    ".acct-menu .acct-who b{font-size:15px;color:var(--ink)}\n" +
    ".acct-menu .acct-who span{font-size:13px;color:var(--muted);overflow-wrap:anywhere}\n" +
    ".acct-menu a,.acct-menu .acct-out{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:8px;font:inherit;font-weight:600;font-size:15px;color:var(--ink);text-decoration:none;background:none;border:0;cursor:pointer}\n" +
    ".acct-menu a:hover,.acct-menu .acct-out:hover{background:var(--gold-tint)}\n" +
    ".acct-menu .acct-out{margin-top:4px;border-top:1px solid var(--line);border-radius:0 0 8px 8px;color:var(--muted)}\n" +
    "@media (max-width:860px){\n" +
    "  .acct-wrap{display:block}\n" +
    "  .acct-wrap > a{font-size:16px}\n" +
    "  .acct-menu{position:static;width:auto;box-shadow:none;border:0;border-left:3px solid var(--gold);border-radius:0;margin:2px 0 8px 12px;padding:2px 0 2px 6px}\n" +
    "  .acct-menu .acct-who b{display:none}\n" +
    "}\n";
  const s = fs.readFileSync(f, "utf8");
  if (s.includes(".acct-menu{")) { console.error(f + ": account menu styles already there"); process.exit(1); }
  fs.writeFileSync(f, s + add);
  console.log(f + ": updated");
}
