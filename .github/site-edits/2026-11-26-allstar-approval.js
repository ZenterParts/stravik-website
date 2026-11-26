// All Star: checking and approval of the monthly reports. New admin app "All Star" (admin/m-allstar.js, committed with
// this script) and, for the store: edit a report while it can still be changed, ask for a correction when it is locked,
// and the statuses "Checked, waiting for approval", "Sent back to you", "Not accepted".
// Database: stravik_as_admin_month/_report/_action(), stravik_sales_correction(), stravik_sales_report_versions.
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
 [
  "const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));\n\n",
  "const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));\n// how a report's status reads for the store\nconst STAT={Submitted:\"Being checked\",Checked:\"Checked, waiting for approval\",Returned:\"Sent back to you\",Approved:\"Approved\",Rejected:\"Not accepted\"};\nconst statPill=r=>`<span class=\"ab-pill ${r.status===\"Approved\"?\"ok\":r.status===\"Returned\"||r.status===\"Rejected\"?\"bad\":\"\"}\">${esc(STAT[r.status]||r.status)}</span>`;\nconst sentOf=period=>R.setup&&(R.setup.reports||[]).find(r=>r.period.slice(0,7)===period);\n// a month that is locked cannot be sent again: say why\nfunction locked(period){const r=sentOf(period);if(!r||r.editable)return false;\n  toast(r.status===\"Approved\"?monthName(period)+\" is approved and final.\":r.status===\"Rejected\"?monthName(period)+\" was not accepted. Please contact your Stravik sales manager.\":monthName(period)+\" is locked. Open it under Reports sent to ask for a correction.\");return true;}\n\n"
 ],
 [
  "  P.innerHTML=`<section class=\"as-panel\"><h2 class=\"ab-h\">Send your monthly sales report</h2>\n",
  "  const backs=S.reports.filter(r=>r.status===\"Returned\");\n  P.innerHTML=`<section class=\"as-panel\">${backs.map(r=>`<div class=\"dnote bad as-back\"><b>${esc(monthName(r.period))} was sent back to you.</b> ${esc(r.return_note||\"\")} <button type=\"button\" class=\"btn gold small\" data-fix=\"${r.period.slice(0,7)}\">Correct it</button></div>`).join(\"\")}<h2 class=\"ab-h\">Send your monthly sales report</h2>\n"
 ],
 [
  "    ${S.reports.length?`<h2 class=\"ab-h\">Reports sent</h2><div class=\"ab-scroll\"><table class=\"ab-table\" id=\"rtab\"><thead><tr><th>Month</th><th>Status</th><th class=\"n\">Product value</th><th class=\"n\">Heroes' rewards</th><th>Sent</th></tr></thead><tbody>${S.reports.map(r=>{const c=calcOf(r.id)||{};return `<tr class=\"ab-o\" data-r=\"${r.id}\" tabindex=\"0\"><td class=\"no\">${esc(monthName(r.period))}</td><td><span class=\"ab-pill ${r.status===\"Approved\"?\"ok\":\"\"}\">${esc(r.status===\"Submitted\"?\"Being checked\":r.status)}</span>${r.late?` <span class=\"ab-dim\">late</span>`:\"\"}</td><td class=\"n\"><b>${esc(rand(c.value_checked))}</b></td><td class=\"n\">${esc(rand(c.pool))}</td><td>${esc(day(r.submitted_at))}</td></tr>`;}).join(\"\")}</tbody></table></div>`:\"\"}\n",
  "    ${S.reports.length?`<h2 class=\"ab-h\">Reports sent</h2><div class=\"ab-scroll\"><table class=\"ab-table\" id=\"rtab\"><thead><tr><th>Month</th><th>Status</th><th class=\"n\">Product value</th><th class=\"n\">Heroes' rewards</th><th>Sent</th></tr></thead><tbody>${S.reports.map(r=>{const c=calcOf(r.id)||{};return `<tr class=\"ab-o\" data-r=\"${r.id}\" tabindex=\"0\"><td class=\"no\">${esc(monthName(r.period))}</td><td>${statPill(r)}${r.late?` <span class=\"ab-dim\">late</span>`:\"\"}</td><td class=\"n\"><b>${esc(rand(c.value_checked))}</b></td><td class=\"n\">${esc(rand(c.pool))}</td><td>${esc(day(r.submitted_at))}</td></tr>`;}).join(\"\")}</tbody></table></div>`:\"\"}\n"
 ],
 [
  "  const file=P.querySelector(\"#rfile\");P.querySelector(\"#rup\").onclick=()=>{R.period=P.querySelector(\"#rper\").value;file.click();};\n",
  "  const file=P.querySelector(\"#rfile\");P.querySelector(\"#rup\").onclick=()=>{R.period=P.querySelector(\"#rper\").value;if(locked(R.period))return;file.click();};\n"
 ],
 [
  "  P.querySelector(\"#rquick\").onclick=()=>{R.period=P.querySelector(\"#rper\").value;openQuick(R.period);};\n",
  "  P.querySelectorAll(\"[data-fix]\").forEach(b=>b.onclick=()=>{R.period=b.dataset.fix;openQuick(R.period);});\n  P.querySelector(\"#rquick\").onclick=()=>{R.period=P.querySelector(\"#rper\").value;if(locked(R.period))return;openQuick(R.period);};\n"
 ],
 [
  "    R.period=P.querySelector(\"#rper\").value;\n",
  "    R.period=P.querySelector(\"#rper\").value;if(locked(R.period))return;\n"
 ],
 [
  "    <h2 class=\"ab-h\">${esc(monthName(r.period))} <span class=\"ab-pill ${r.status===\"Approved\"?\"ok\":\"\"}\">${esc(r.status===\"Submitted\"?\"Being checked\":r.status)}</span></h2>\n",
  "    <h2 class=\"ab-h\">${esc(monthName(r.period))} ${statPill(r)}</h2>\n"
 ],
 [
  "    <p><button type=\"button\" class=\"btn line small\" id=\"rxls\">Download the lines</button></p></section>`;\n",
  "    ${(()=>{const rs=sentOf(r.period.slice(0,7))||{};\n      if(r.status===\"Returned\")return `<div class=\"dnote bad\"><b>Sent back to you.</b> ${esc(rs.return_note||\"\")}</div>`;\n      if(r.status===\"Rejected\")return `<div class=\"dnote bad\"><b>Not accepted.</b> ${esc(rs.reject_note||\"\")}</div>`;\n      if(r.status===\"Approved\")return `<p class=\"dhint\">This month is approved and final. If something was wrong, put the correction in your next monthly report.</p>`;\n      if(rs.editable)return `<p class=\"dhint\">You can change this report until the 5th, as long as it has not been checked yet.</p>`;\n      return `<p class=\"dhint\">${r.status===\"Checked\"?\"This report has been checked and is waiting for approval.\":\"The 5th has passed, so this report is locked.\"} ${rs.correction_request?`You asked for a correction: “${esc(rs.correction_request)}”.`:\"If something is wrong, ask for a correction.\"}</p>`;})()}\n    <div class=\"ab-row as-ract\">${(()=>{const rs=sentOf(r.period.slice(0,7))||{};\n      return (rs.editable?`<button type=\"button\" class=\"btn gold\" id=\"redit\">${r.status===\"Returned\"?\"Correct this report\":\"Edit this report\"}</button>`:r.status===\"Submitted\"||r.status===\"Checked\"?`<button type=\"button\" class=\"btn line\" id=\"rask\">Ask for a correction</button>`:\"\");})()}\n      <button type=\"button\" class=\"btn line small\" id=\"rxls\">Download the lines</button></div>\n    <div id=\"raskbox\"></div></section>`;\n"
 ],
 [
  "  P.querySelector(\"#rback\").onclick=()=>{R.view=null;paneReports();};\n  P.querySelector(\"#rxls\").onclick=()=>xlsx([{name:\"Lines\",head:[\"Invoice date\",\"Invoice\",\"Your code\",\"Stravik PN\",\"Description\",\"Quantity\",\"Value in your POS\",\"Salesperson\",\"Hero\",\"Your buy price\",\"At your buy price\"],\n",
  "  P.querySelector(\"#rback\").onclick=()=>{R.view=null;paneReports();};\n  const ed=P.querySelector(\"#redit\");if(ed)ed.onclick=()=>{R.view=null;R.period=r.period.slice(0,7);openQuick(R.period);};\n  const ak=P.querySelector(\"#rask\");if(ak)ak.onclick=()=>{\n    const box=P.querySelector(\"#raskbox\");\n    box.innerHTML=`<form class=\"as-form\" id=\"raskf\" novalidate><div class=\"is-fields\"><label class=\"wide\">What needs to change?<textarea name=\"note\" rows=\"3\" maxlength=\"1000\" placeholder=\"For example: 2 of the ignition coils were sold by Nadia, not Sipho\"></textarea></label></div><p class=\"dhint\">Your Stravik sales manager reads this. If they agree, the report is sent back to you to change.</p><div class=\"ab-row\"><button class=\"btn gold\" type=\"submit\">Send</button><button type=\"button\" class=\"linkbtn\" id=\"raskx\">Cancel</button></div></form>`;\n    box.querySelector(\"textarea\").focus();box.querySelector(\"#raskx\").onclick=()=>{box.innerHTML=\"\";};\n    box.querySelector(\"#raskf\").addEventListener(\"submit\",async ev=>{ev.preventDefault();const note=box.querySelector(\"textarea\").value.trim();if(!note){toast(\"Say what needs to change.\");return;}\n      const b=box.querySelector(\"button[type=submit]\");b.disabled=true;\n      try{must(await C.rpc(\"stravik_sales_correction\",{p_id:r.id,p_note:note}));await loadAll();toast(\"Sent. Your Stravik sales manager will look at it.\");paneView();}catch(e){toast(msg(e));b.disabled=false;}});\n  };\n  P.querySelector(\"#rxls\").onclick=()=>xlsx([{name:\"Lines\",head:[\"Invoice date\",\"Invoice\",\"Your code\",\"Stravik PN\",\"Description\",\"Quantity\",\"Value in your POS\",\"Salesperson\",\"Hero\",\"Your buy price\",\"At your buy price\"],\n"
 ]
]);
{ const f = "assets/allstar.css", s = fs.readFileSync(f, "utf8"); if (s.includes(".as-ract{")) { console.error(f + ": already there"); process.exit(1); } fs.writeFileSync(f, s + "\n/* a report's actions, and a month that was sent back */\n.as-ract{gap:10px;margin-top:10px}\n.as-back{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 14px}\n.ab-pill.bad{background:#fde4e1;color:#b42318}\n#raskbox .as-form{margin-top:12px}\n#raskbox textarea{font:inherit;font-size:15px;padding:8px 10px;border:1.5px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);width:100%}\n"); console.log(f + ": updated"); }
edit("allstar/index.html", [['/assets/allstar.css?v=2"', '/assets/allstar.css?v=3"'], ['/assets/allstar.js?v=7"', '/assets/allstar.js?v=8"']]);
{ // the admin site loads the new app after Networks
  const f = "admin/index.html"; let s = fs.readFileSync(f, "utf8");
  if (s.includes("/admin/m-allstar.js")) { console.error(f + ": the All Star app is already loaded"); process.exit(1); }
  const m = s.match(/<script src="\/admin\/m-networks\.js(\?v=[0-9a-f]+)?"><\/script>\n/);
  if (!m) { console.error(f + ": the Networks app line was not found"); process.exit(1); }
  fs.writeFileSync(f, s.replace(m[0], () => m[0] + '<script src="/admin/m-allstar.js"></script>\n')); console.log(f + ": updated");
}
