// All Star page: a store owner keeps the normal site menu (Products, account menu with "Your products and prices",
// cart, orders, sign out) and the Stravik logo goes to their home page. Counter staff keep the page without the public menu.
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
edit("assets/allstar.js", [
  ["function owner(email){\n  document.title=\"Stravik All Star | \"+O.data.store;\n",
   "// a store owner is a normal customer of the site: show the site menu and send the logo home\n" +
   "function siteMenu(on){document.body.classList.toggle(\"portal\",!on);const b=document.querySelector(\"a.brand\");if(b)b.href=on?\"/\":\"/allstar/\";}\n" +
   "function owner(email){\n  siteMenu(true);\n  document.title=\"Stravik All Star | \"+O.data.store;\n"],
  ["async function signOut(){try{await C.auth.signOut();}catch(e){}", "async function signOut(){siteMenu(false);try{await C.auth.signOut();}catch(e){}"],
  ["head(O.data.store,\"Your counter team on Stravik All Star. Add each person who sells at your counter, with their mobile number and a 6-digit PIN. They sign in on this page and see their Stravik sales and share.\",\"Stravik All Star\")",
   "head(O.data.store,\"Your counter team on Stravik All Star. Add each person who sells at your counter, with their mobile number and a 6-digit PIN. They sign in on this page and see their Stravik sales and share.\",\"Stravik All Star\").replace(\"</h1>\",\"</h1><p><a class=\\\"btn line small\\\" href=\\\"/\\\">← Back to your products and prices</a></p>\")"],
]);
edit("allstar/index.html", [['/assets/allstar.js?v=1"', '/assets/allstar.js?v=2"']]);
