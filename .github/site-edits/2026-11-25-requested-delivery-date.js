// Requested delivery date (RDD) on orders: an optional date in the cart's order form (from tomorrow), shown on the
// store's own orders, the head office dashboard, the DP World InSync portal (and its Excel download) and the admin order.
// Database: stravik_orders.requested_delivery, checked and saved by stravik_place_order().
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
const DAY = "(x=>x?new Date(x+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'')";
edit("assets/dealer.js", [
  ['      <div><label for="o_po">Your order / PO reference</label><input id="o_po" maxlength="60"></div>\n',
   '      <div><label for="o_po">Your order / PO reference</label><input id="o_po" maxlength="60"></div>\n' +
   '      <div><label for="o_rd">Requested delivery date (optional)</label><input id="o_rd" type="date" min="${new Date(Date.now()+864e5).toISOString().slice(0,10)}"></div>\n'],
  ['po_ref:f.querySelector("#o_po").value,', 'po_ref:f.querySelector("#o_po").value,requested_delivery:f.querySelector("#o_rd").value,'],
  // the confirmation after ordering: orders are approved by sales first, then go to the fulfilment centre
  ['${sent?"Your order request has gone to our fulfilment centre. You\'ll get a confirmation by email.":"Your order request is saved and we\'ll pass it to our fulfilment centre."}',
   '${sent?"Your order request has gone to our team. Once approved it goes to our fulfilment centre, and you\'ll get a confirmation by email.":"Your order request is saved. Once approved by our team it goes to our fulfilment centre."}'],
  ['<div class="dorder-b">${o.po_ref?`<p>Your PO: <b>${esc(o.po_ref)}</b></p>`:""}',
   '<div class="dorder-b">${o.po_ref?`<p>Your PO: <b>${esc(o.po_ref)}</b></p>`:""}${o.requested_delivery?`<p>Requested delivery: <b>${esc(' + DAY + '(o.requested_delivery))}</b></p>`:""}'],
]);
edit("assets/autobarn.js", [
  ['o.po_ref?"Store PO: <b>"+esc(o.po_ref)+"</b>":"",', 'o.po_ref?"Store PO: <b>"+esc(o.po_ref)+"</b>":"",o.requested_delivery?"Requested delivery: <b>"+esc(day(o.requested_delivery))+"</b>":"",'],
]);
edit("assets/insync.js", [
  ['<p>${esc(o.contact_name||"")}${o.contact_phone?", "+esc(o.contact_phone):""}', '<p>${o.requested_delivery?"Requested delivery: <b>"+esc(day(o.requested_delivery))+"</b><br>":""}${esc(o.contact_name||"")}${o.contact_phone?", "+esc(o.contact_phone):""}'],
  ['"Store PO","Deliver to"', '"Store PO","Requested delivery","Deliver to"'],
  ['o.po_ref||"",o.delivery_address||"",', 'o.po_ref||"",o.requested_delivery||"",o.delivery_address||"",'],
]);
edit("admin/m-dealers.js", [
  ["L.group('Order', [['Customer PO', esc(o.po_ref || '')]", "L.group('Order', [['Customer PO', esc(o.po_ref || '')], ['Requested delivery', o.requested_delivery ? '<b>' + esc(" + DAY + "(o.requested_delivery)) + '</b>' : '<span class=\"muted\">not given</span>']"],
]);
edit("autobarn/index.html", [['/assets/autobarn.js?v=4"', '/assets/autobarn.js?v=5"'], ['/assets/dealer.js?v=3"', '/assets/dealer.js?v=4"']]);
edit("insync/index.html", [['/assets/insync.js?v=3"', '/assets/insync.js?v=4"'], ['/assets/dealer.js?v=3"', '/assets/dealer.js?v=4"']]);
