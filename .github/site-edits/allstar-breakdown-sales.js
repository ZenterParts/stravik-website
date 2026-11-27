// All Star owner page, "See how you got here":
// - empty chart columns say "This month" / "Next month" (was "to come");
// - the product table is called "Top selling items";
// - the standing note under the breakdown is removed (the warning about value above the invoices stays, when it applies);
// - "Download the breakdown" adds a Sales sheet with every line reported this quarter: the same first columns as the
//   upload template (Invoice date, Invoice number, Part number, Quantity, Value excl. VAT, Salesperson), then the detail.
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, found ${n}: ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, s);
}
edit("assets/allstar.js", [
  ['${c.p<new Date().toISOString().slice(0,7)?"no report":"to come"}',
   '${(t=>c.p<t?"no report":c.p===t?"This month":"Next month")(new Date().toISOString().slice(0,7))}'],
  ['${O.allParts||B.parts.length<=5?"Your Stravik products":"Your top products"}', 'Top selling items'],
  ['<p class="dhint">Product value is the units you reported at your buy price, for the parts invoiced to your store.${notCov>0.004?` ${esc(rand(notCov))} you reported this quarter is more than was invoiced to you, so it does not count.`:""}</p>',
   '${notCov>0.004?`<p class="dhint">${esc(rand(notCov))} you reported this quarter is more than was invoiced to you, so it does not count.</p>`:""}'],
  ['function downloadBreakdown(){', 'async function downloadBreakdown(){'],
  ['  let run=0;\n  xlsx([{name:"Summary"',
   '  // every line reported this quarter (not the rejected reports), in date order\n' +
   '  const reps=((R.setup&&R.setup.reports)||[]).filter(r=>r.period>=Q.start&&r.period<Q.end&&r.status!=="Rejected").sort((a,b)=>a.period<b.period?-1:1),lines=[];\n' +
   '  try{const got=await Promise.all(reps.map(r=>C.rpc("stravik_sales_report",{p_id:r.id}).then(must)));\n' +
   '    got.forEach((g,i)=>{((g&&g.lines)||[]).forEach(l=>lines.push(Object.assign({},l,{period:reps[i].period,status:reps[i].status})));});\n' +
   '  }catch(e){toast(msg(e));return;}\n' +
   '  lines.sort((a,b)=>String(a.date||a.period).localeCompare(String(b.date||b.period))||String(a.invoice||"").localeCompare(String(b.invoice||"")));\n' +
   '  const day=d=>{if(!d)return "";const x=new Date(String(d).slice(0,10));return isNaN(x)?String(d):x;};\n' +
   '  let run=0;\n  xlsx([{name:"Summary"'],
  ['    {name:"Months",head:',
   '    {name:"Sales",head:["Invoice date","Invoice number","Part number","Quantity","Value excl. VAT","Salesperson","Month","Stravik PN","Description","Range","Hero","Your buy price","At your buy price","Report"],\n' +
   '      widths:[13,16,16,10,15,20,14,13,50,16,22,14,16,26],fmts:{1:"dd/mm/yyyy",5:"#,##0.00",12:"#,##0.00",13:"#,##0.00"},\n' +
   '      rows:lines.map(l=>[day(l.date),l.invoice||"",l.code||l.pn,Number(l.qty),l.value==null?"":Number(l.value),l.salesperson||"",monthName(l.period),l.pn,l.desc||"",l.range||"",l.staff||"Not linked to a Hero",Number(l.price||0),Number(l.credited||0),STAT[l.status]||l.status])},\n' +
   '    {name:"Months",head:'],
  ['(sh.widths||[]).forEach((w,i)=>{ws.getColumn(i+1).width=w;});',
   '(sh.widths||[]).forEach((w,i)=>{ws.getColumn(i+1).width=w;});Object.keys(sh.fmts||{}).forEach(i=>{ws.getColumn(+i).numFmt=sh.fmts[i];});'],
]);
edit("allstar/index.html", [
  ['/assets/allstar.js?v=16"', '/assets/allstar.js?v=17"'],
]);
console.log("All Star breakdown: Next month, Top selling items, note removed, Sales sheet in the download");
