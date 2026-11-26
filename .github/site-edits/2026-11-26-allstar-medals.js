// All Star: medals instead of the words Bronze, Silver and Gold (the store's tier, the three steps, the month table), and the
// store's top 5 products with "See all" and a download in detail.
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
  "\n// ---- charts (plain SVG): a donut for \"how the total is split\", columns for the quarter month by month\n",
  "\n// ---- medals (SVG): ribbon and coin with a star, in bronze, silver or gold; \"none\" is a grey outline\nconst MEDAL={bronze:[\"#e0a068\",\"#b8733a\",\"#7a4417\"],silver:[\"#ffffff\",\"#9ea9b3\",\"#5d6874\"],gold:[\"#f6dc7a\",\"#c99a1c\",\"#7a5a00\"],none:[\"#f1f1ef\",\"#d5d8dc\",\"#9aa1a8\"]};\nfunction medal(k,size,title){\n  const c=MEDAL[k]||MEDAL.none,id=\"md\"+k,s=size||40;\n  return `<svg class=\"md md-${k}\" width=\"${s}\" height=\"${Math.round(s*1.25)}\" viewBox=\"0 0 40 50\" role=\"img\" aria-label=\"${esc(title||k)}\"><title>${esc(title||k)}</title>\n    <defs><radialGradient id=\"${id}\" cx=\"35%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"${c[0]}\"/><stop offset=\"1\" stop-color=\"${c[1]}\"/></radialGradient></defs>\n    <path d=\"M10 2h8l5 15h-8z\" fill=\"${k===\"none\"?\"#c9cdd2\":\"#0b203d\"}\"/><path d=\"M30 2h-8l-5 15h8z\" fill=\"${k===\"none\"?\"#b7bcc2\":\"#c99a1c\"}\"/>\n    <circle cx=\"20\" cy=\"31\" r=\"15\" fill=\"url(#${id})\" stroke=\"${c[2]}\" stroke-width=\"1.6\"/>\n    <circle cx=\"20\" cy=\"31\" r=\"11\" fill=\"none\" stroke=\"${c[2]}\" stroke-opacity=\".45\" stroke-width=\"1\"/>\n    <path d=\"M20 23.6l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z\" fill=\"${c[2]}\" fill-opacity=\"${k===\"none\"?\".5\":\".85\"}\"/></svg>`;\n}\n\n// ---- charts (plain SVG): a donut for \"how the total is split\", columns for the quarter month by month\n"
 ],
 [
  "const O={staff:null,store:\"\",panel:null,edit:null,how:false,hzp:\"quarter\",hzOpen:null,pics:{}};\n",
  "const O={staff:null,store:\"\",panel:null,edit:null,how:false,allParts:false,hzp:\"quarter\",hzOpen:null,pics:{}};\n"
 ],
 [
  "  const tierAt=p=>{const t=TIERS.filter(x=>p>=x.at).pop();return t?`<span class=\"hz-tier ${t.k}\">${t.name}</span>`:`<span class=\"ab-dim\">–</span>`;};\n",
  "  const tierAt=p=>{const t=TIERS.filter(x=>p>=x.at).pop();return t?`<span class=\"hz-tier ${t.k}\">${medal(t.k,18,t.name)}${t.name}</span>`:`<span class=\"ab-dim\">–</span>`;};\n"
 ],
 [
  "    <div class=\"as-cardh\"><span class=\"as-kicker\">Your store · ${esc(qName(Q.start))}</span><span class=\"as-tier\">${reached?`<i class=\"as-medal ${reached.k}\"></i>${reached.name}`:\"Not yet Bronze\"}</span></div>\n",
  "    <div class=\"as-cardh\"><span class=\"as-kicker\">Your store · ${esc(qName(Q.start))}</span><span class=\"as-tier md-pill${reached?\"\":\" none\"}\">${reached?medal(reached.k,46,reached.name+\" tier reached\"):`${medal(\"none\",34,\"Not yet Bronze\")}<span>Not yet Bronze</span>`}</span></div>\n"
 ],
 [
  "        <div class=\"as-steps\">${TIERS.map(t=>`<div class=\"as-step ${pct>=t.at?\"on\":\"\"} ${t.k}\"><i class=\"as-medal ${t.k}\"></i><b>${t.name}</b><span>${esc(rand0(t.at/100*T))}</span><span>${Math.round(t.rate*100)}% reward</span></div>`).join(\"\")}</div>\n",
  "        <div class=\"as-steps\">${TIERS.map(t=>`<div class=\"as-step ${pct>=t.at?\"on\":\"\"} ${t.k}\">${medal(t.k,30,t.name)}<b>${t.name}</b><span>${esc(rand0(t.at/100*T))}</span><span>${Math.round(t.rate*100)}% reward</span></div>`).join(\"\")}</div>\n"
 ],
 [
  "      ${(B.parts||[]).length?`<h3 class=\"as-h3\">By part</h3><div class=\"ab-scroll\"><table class=\"ab-table\"><thead><tr><th>Part</th><th>Range</th><th class=\"n\">Units</th><th class=\"n\">Product value</th></tr></thead><tbody>${B.parts.map(p=>\n        `<tr><td><b>${esc(p.pn)}</b> <span class=\"ab-dim\">${esc((p.desc||\"\").slice(0,60))}</span></td><td>${esc(p.range||\"\")}</td><td class=\"n\">${num(p.units)}</td><td class=\"n\">${esc(rand(p.value))}</td></tr>`).join(\"\")}</tbody></table></div>`:\"\"}\n",
  "      ${(B.parts||[]).length?`<h3 class=\"as-h3\">${O.allParts||B.parts.length<=5?\"Your Stravik products\":\"Your top products\"}</h3><div class=\"ab-scroll\"><table class=\"ab-table hz-top5\"><thead><tr><th class=\"n\">#</th><th>Part</th><th>Range</th><th class=\"n\">Units</th><th class=\"n\">Product value</th><th class=\"n\">Share</th></tr></thead><tbody>${(O.allParts?B.parts:B.parts.slice(0,5)).map((p,i)=>\n        `<tr class=\"${i<3?\"t\"+(i+1):\"\"}\"><td class=\"n\">${i<3?medal([\"gold\",\"silver\",\"bronze\"][i],20,\"No. \"+(i+1)):i+1}</td><td><b>${esc(p.pn)}</b> <span class=\"ab-dim\">${esc((p.desc||\"\").slice(0,60))}</span></td><td>${esc(p.range||\"\")}</td><td class=\"n\">${num(p.units)}</td><td class=\"n\">${esc(rand(p.value))}</td><td class=\"n\">${v?(Number(p.value)/v*100<0.5&&Number(p.value)>0?\"<1%\":(Number(p.value)/v*100).toFixed(0)+\"%\"):\"\"}</td></tr>`).join(\"\")}</tbody></table></div>\n      <p class=\"hz-more\">${B.parts.length>5?`<button type=\"button\" class=\"linkbtn\" id=\"hzall\">${O.allParts?\"Show the top 5 only\":`See all ${num(B.parts.length)} products`}</button>`:\"\"}<button type=\"button\" class=\"linkbtn\" id=\"hzxls2\">Download in detail (Excel)</button></p>`:\"\"}\n"
 ],
 [
  "  app.querySelector(\"#hzxls\").onclick=downloadBreakdown;\n  app.querySelectorAll(\"[data-hzp]\").forEach(b=>b.onclick=()=>{O.hzp=b.dataset.hzp;O.hzOpen=null;owner(email);});\n",
  "  app.querySelector(\"#hzxls\").onclick=downloadBreakdown;\n  const x2=app.querySelector(\"#hzxls2\");if(x2)x2.onclick=downloadBreakdown;\n  const al=app.querySelector(\"#hzall\");if(al)al.onclick=()=>{O.allParts=!O.allParts;owner(email);const h=app.querySelector(\".hz-top5\");if(h)h.scrollIntoView({block:\"nearest\"});};\n  app.querySelectorAll(\"[data-hzp]\").forEach(b=>b.onclick=()=>{O.hzp=b.dataset.hzp;O.hzOpen=null;owner(email);});\n"
 ]
]);
edit("assets/allstar.css", [
 [
  "@media (prefers-reduced-motion:reduce){.dn-seg,.mc-col{animation:none}}\n",
  "@media (prefers-reduced-motion:reduce){.dn-seg,.mc-col{animation:none}}\n\n/* ---- medals instead of words, and the top products */\n.md{display:inline-block;vertical-align:middle;flex:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.18))}\n.as-tier.md-pill{padding:0;border:0;background:none;gap:8px;font-weight:600;color:var(--muted)}\n.as-tier.md-pill .md{animation:md-in .6s cubic-bezier(.2,.8,.2,1) both}\n@keyframes md-in{0%{transform:scale(.4) rotate(-20deg);opacity:0}70%{transform:scale(1.1) rotate(4deg)}100%{transform:none}}\n.as-step .md{margin-bottom:4px;opacity:.4;filter:grayscale(.6)}\n.as-step.on .md{opacity:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.18));animation:as-shine 2.4s ease-in-out infinite}\n.hz-tier{display:inline-flex;align-items:center;gap:5px}\n.hz-tier .md{filter:none}\n.hz-top5 td:first-child{width:42px}\n.hz-top5 tr.t1 td{background:rgba(201,154,28,.08)}\n.hz-top5 .md{filter:none}\n.hz-more{display:flex;flex-wrap:wrap;gap:6px 20px;margin:8px 0 4px}\n@media (prefers-reduced-motion:reduce){.as-tier.md-pill .md,.as-step.on .md{animation:none}}\n"
 ]
]);
edit("allstar/index.html", [['/assets/allstar.css?v=5"', '/assets/allstar.css?v=6"'], ['/assets/allstar.js?v=11"', '/assets/allstar.js?v=12"']]);
