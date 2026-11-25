// All Star page: the normal site menu and a logo that goes to the home page for everyone, except a signed-in counter
// person, whose page has no public menu (they only need their own page). Before, the signed-out page had no way back.
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
  ["function signIn(mode){\n", "function signIn(mode){\n  siteMenu(true);\n"],
  ["async function signOut(){siteMenu(false);try{", "async function signOut(){try{"],
  ["function note(title,html){\n", "function note(title,html){\n  siteMenu(true);\n"],
  ["function counter(me){\n", "function counter(me){\n  siteMenu(false);\n"],
]);
edit("allstar/index.html", [
  ['<body class="portal">', "<body>"],
  ['<a class="brand" href="/allstar/" aria-label="Stravik All Star">', '<a class="brand" href="/" aria-label="Stravik home">'],
  ['/assets/allstar.js?v=2"', '/assets/allstar.js?v=3"'],
]);
