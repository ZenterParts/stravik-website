// Orders in the admin site: one approval only, by sales. It releases the order to DP World InSync; finance and supply
// chain get an email for their information and have nothing to approve.
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
edit("admin/m-dealers.js", [
  ["  // an order is approved by sales, then finance, then supply chain; the third approval releases it to DP World InSync\n" +
   "  var OSTAGES = ['Sales approval', 'Finance approval', 'Supply chain approval'], OSTEPS",
   "  // an order needs one approval, by sales: it releases the order to DP World InSync, and finance and supply chain are told by email\n" +
   "  var OSTAGES = ['Sales approval'], OSTEPS"],
  ["var ostage = function (o) { return o.status !== 'Submitted' ? o.status : !o.sales_approved_at ? OSTAGES[0] : !o.finance_approved_at ? OSTAGES[1] : !o.supply_approved_at ? OSTAGES[2] : 'With DPW'; };",
   "var ostage = function (o) { return o.status !== 'Submitted' ? o.status : !o.sales_approved_at ? OSTAGES[0] : 'With DPW'; };"],
  ["var STEPKEY = { 'Sales approval': 'sales', 'Finance approval': 'finance', 'Supply chain approval': 'supply' }[stg],",
   "var STEPKEY = { 'Sales approval': 'sales' }[stg],"],
  ["(rej ? 'The order is cancelled and the customer is emailed your reason.' : step === 'supply' ? 'This is the last approval: the order is released to DP World InSync for pick, pack, invoice and delivery.' : 'The order moves to the next approval, and the people who give it are emailed.')",
   "(rej ? 'The order is cancelled and the customer is emailed your reason.' : 'The order is released to DP World InSync for pick, pack, invoice and delivery. Finance and supply chain get an email for their information.')"],
  ["(rej ? 'Reason for the customer' : 'Note for the next step (optional)')", "(rej ? 'Reason for the customer' : 'Note (optional)')"],
  ["if (/approval$/.test(s)) return L.toast('The approvals are given with the approval button, in order.');",
   "if (/approval$/.test(s)) return L.toast('The sales approval is given with the approval button.');"],
  ["L.group('Approval', [['1. Sales', oby(o.sales_approved_by, o.sales_approved_at, o.sales_note)], ['2. Finance', oby(o.finance_approved_by, o.finance_approved_at, o.finance_note)], ['3. Supply chain', oby(o.supply_approved_by, o.supply_approved_at, o.supply_note)],\n" +
   "            ['Released to DP World InSync', o.released_at ? esc(L.dt(o.released_at)) : '<span class=\"muted\">after the three approvals</span>']]",
   "L.group('Approval', [['Sales approval', oby(o.sales_approved_by, o.sales_approved_at, o.sales_note)],\n" +
   "            ['Released to DP World InSync', o.released_at ? esc(L.dt(o.released_at)) : '<span class=\"muted\">after the sales approval</span>'], ['Finance and supply chain', '<span class=\"muted\">' + (o.released_at ? 'told by email' : 'are told by email once sales approves') + '</span>']]"],
]);
