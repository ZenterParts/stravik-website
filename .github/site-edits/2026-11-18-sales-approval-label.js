// Site edit, 18 Nov 2026: the sales approval (step 1) is given by the sales agent for the customer's country
// (staff.customer_scope, database function stravik_sales_agents). The "Sales team" approval list in Customers > Settings
// is now only for countries without an agent; its label says so.
// Run once from the repository root by .github/workflows/apply-site-edits.yml, which then deletes this file.
"use strict";
const fs = require("fs"), f = "admin/m-dealers.js";
let s = fs.readFileSync(f, "utf8");
const from = "approvers_sales: '1. Sales team'", to = "approvers_sales: '1. Sales (countries with no regional agent)'";
const n = s.split(from).length - 1;
if (n !== 1) throw new Error(`${f}: expected the text once, found it ${n} times`);
fs.writeFileSync(f, s.replace(from, () => to));
console.log("Edited: " + f);
