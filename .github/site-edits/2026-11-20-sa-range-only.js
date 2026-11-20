// South African customers see the South African range only, across the whole site.
// dealer.js: after an approved South African customer's prices load, their price list is kept to the parts in the
// South African range (stravik_sa_stock) and treated as a priced-only list. The catalogues, the Products page, Find a
// part and the part pages already hide whatever is not on a priced-only list, so they now show only those parts.
// index.html: new versions of the South Africa home page files (welcome and range cards).
const fs = require("fs");
function edit(file, from, to) {
  const s = fs.readFileSync(file, "utf8"), n = s.split(from).length - 1;
  if (n !== 1) { console.error(file + ": expected the text once, found it " + n + " times: " + from.slice(0, 60)); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, () => to));
}
edit("assets/dealer.js", "S.prices=p?Object.assign(p,{map:pm(p.prices),rmap:pm(p.reman)}):null;}else S.prices=null;\n",
  "S.prices=p?Object.assign(p,{map:pm(p.prices),rmap:pm(p.reman)}):null;}else S.prices=null;\n" +
  "  // South African customers (country South Africa, price group T1 to T5 or PREF) see the South African range only:\n" +
  "  // their price list is kept to the parts in that range and treated as priced-only, so every catalogue hides the rest.\n" +
  "  // If the range cannot be read, or has no parts for them, nothing changes and they see what any customer sees.\n" +
  "  S.sa=null;\n" +
  "  if(S.prices&&D().country===\"South Africa\"&&[\"T1\",\"T2\",\"T3\",\"T4\",\"T5\",\"PREF\"].indexOf(D().price_group)>=0){\n" +
  "    try{const sa=must(await c.rpc(\"stravik_sa_stock\"));\n" +
  "      if(sa&&sa.parts){const keep=new Set(sa.stock.map(x=>x[0]));\n" +
  "        [S.prices.map,S.prices.rmap].forEach(m=>Array.from(m.keys()).forEach(k=>{if(!keep.has(k))m.delete(k);}));\n" +
  "        S.prices.priced_only=true;S.sa=sa;}\n" +
  "    }catch(e){console.error(e);}\n" +
  "  }\n");
edit("index.html", "/assets/sa-home.css?v=1", "/assets/sa-home.css?v=2");
edit("index.html", "/assets/sa-home.js?v=1", "/assets/sa-home.js?v=2");
