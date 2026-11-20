// Customers app: "Edit details" on an account now also has the Catalogues tick-boxes (the ranges the customer may see
// and order), the same ones as in "Change price group". Shown once the account has a price group.
const fs = require("fs");
const file = "admin/m-dealers.js";
function edit(from, to) {
  const s = fs.readFileSync(file, "utf8"), n = s.split(from).length - 1;
  if (n !== 1) { console.error(file + ": expected the text once, found it " + n + " times: " + from.slice(0, 70)); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, () => to));
}
edit(".concat([['Test account', '<label><input type=\"checkbox\" id=\"edT\"'",
  ".concat(d.price_group ? [['Catalogues', '<div id=\"edKw\">' + catBoxes('edK', d.categories, d.price_group) + '</div>']] : []).concat([['Test account', '<label><input type=\"checkbox\" id=\"edT\"'");
edit("          var p = { is_test: $('edT').checked };\n",
  "          var p = { is_test: $('edT').checked };\n" +
  "          if ($('edK')) { var pick = catPick('edK'); if (pick === false) return L.toast('Tick at least one catalogue'); p.categories = pick; }\n");
