// Prices in every view of the filter and battery catalogues: the filter catalogue's Table and List views and the battery
// catalogue's list view get the signed-in customer's price, as the card views already have. The price column is hidden
// for visitors and customers without prices. Prices come from dealer.js (StravikDealer.tag), as on the cards.
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
const HAS = "const D0=window.StravikDealer,has=!!(D0&&D0.state&&D0.state.prices&&D0.state.prices.map&&D0.state.prices.map.size);";

edit("assets/fcat.js", [
  ['function prices(){const D=window.StravikDealer,t=D&&D.tag;root.querySelectorAll("[data-p]")',
   'function prices(){' + HAS + 'const g=root.getElementById("grid");if(g)g.classList.toggle("np",!has);const D=window.StravikDealer,t=D&&D.tag;root.querySelectorAll("[data-p]")'],
  ["<thead><tr><th>Stravik PN</th><th>Description</th><th>H</th>", "<thead><tr><th>Stravik PN</th><th>Description</th><th class=\"num\">Your price</th><th>H</th>"],
  ["<td>${esc(p.d.split('–')[0].trim())}</td>\n   <td class=\"num\">${D(p,'Height')}</td>",
   "<td>${esc(p.d.split('–')[0].trim())}</td><td class=\"num\"><span class=\"eprice\" data-p=\"${p.pn}\"></span></td>\n   <td class=\"num\">${D(p,'Height')}</td>"],
  ["(p.makes.length>4?' +'+(p.makes.length-4):''):''}</span></span></div>`;}",
   "(p.makes.length>4?' +'+(p.makes.length-4):''):''}</span></span><span class=\"eprice lprice\" data-p=\"${p.pn}\"></span></div>`;}"],
]);
{
  const f = "assets/fcat.css";
  let s = fs.readFileSync(f, "utf8");
  // the OE column moves one place right
  const a = ".ptab td:nth-child(9){max-width:200px;overflow:hidden;text-overflow:ellipsis}";
  if (s.split(a).length - 1 !== 1) { console.error(f + ": OE column rule not found once"); process.exit(1); }
  s = s.replace(a, ".ptab td:nth-child(10){max-width:200px;overflow:hidden;text-overflow:ellipsis}");
  s += "\n/* prices in the Table and List views (hidden for visitors: .np on #grid) */\n" +
       ".ptab .eprice{font-size:15px}\n" +
       ".np .ptab th:nth-child(3),.np .ptab td:nth-child(3){display:none}\n" +
       ".lrow .lprice{grid-column:3;grid-row:1;font-size:16px;white-space:nowrap;text-align:right}\n";
  fs.writeFileSync(f, s); console.log(f + ": updated");
}

edit("assets/ecat.js", [
  ['function prices(){const D=window.StravikDealer,t=D&&D.tag;$$("[data-p]")',
   'function prices(){' + HAS + 'const o=$("#out");if(o)o.classList.toggle("np",!has);const D=window.StravikDealer,t=D&&D.tag;$$("[data-p]")'],
  ['["pn","Part no."],', '["pn","Part no."],["","Your price","n"],'],
  ["<td><span class=\"pnl\">${esc(r.pn)}</span></td>", "<td><span class=\"pnl\">${esc(r.pn)}</span></td><td class=\"n\"><span class=\"eprice\" data-p=\"${esc(r.pn)}\"></span></td>"],
]);
{
  const f = "assets/ecat.css";
  const s = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, s + "\n/* the price column of the list view (hidden for visitors: .np on #out) */\n" +
    "table.list .eprice{font-size:15px;white-space:nowrap}\n" +
    ".np table.list th:nth-child(3),.np table.list td:nth-child(3){display:none}\n");
  console.log(f + ": updated");
}
