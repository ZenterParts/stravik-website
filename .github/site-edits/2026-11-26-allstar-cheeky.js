// All Star: cheekier messages at every stage for the store (from "Ready, set, sell!" to "WOW, Gold!" and "Unstoppable!",
// with a nudge in the last two weeks of a quarter) and for the Heroes' badges and ranking.
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
  "    line=k>=0.85?`<b>You're almost there!</b> Only ${num(gap)} more ${gap===1?\"part\":\"parts\"} for the <b>${esc(next.name)}</b> badge.`:\n      units>0?`${num(gap)} more Stravik ${gap===1?\"part\":\"parts\"} this quarter for the <b>${esc(next.name)}</b> badge.`:\"Sell your first Stravik part this quarter to earn your first badge.\";}\n  else line=\"<b>Legend!</b> You have every badge this quarter.\";\n",
  "    const more=`${num(gap)} more ${gap===1?\"part\":\"parts\"}`;\n    line=units<=0?`<b>Your first badge is waiting! ⭐</b> Sell one Stravik part to grab it.`:\n      k>=0.85?`<b>Almost there! 🔥</b> Just ${more} for the <b>${esc(next.name)}</b> badge.`:\n      k>=0.5?`<b>You're on fire!</b> ${more} for the <b>${esc(next.name)}</b> badge.`:\n      `<b>Nice start!</b> ${more} for the <b>${esc(next.name)}</b> badge.`;}\n  else line=\"<b>Legend! 🏆</b> Every badge this quarter. The counter is yours.\";\n"
 ],
 [
  "      ${last.heroes>1&&last.rank<=3?`<div class=\"as-rank r${last.rank}\"><span>${last.rank===1?\"1st\":last.rank===2?\"2nd\":\"3rd\"}</span>${last.rank===1?`Top Hero at your store in ${esc(monthName(last.period).split(\" \")[0])}!`:`${last.rank===2?\"Second\":\"Third\"} of ${num(last.heroes)} Heroes at your store in ${esc(monthName(last.period).split(\" \")[0])}`}</div>`:\"\"}\n",
  "      ${last.heroes>1&&last.rank<=3?`<div class=\"as-rank r${last.rank}\"><span>${last.rank===1?\"1st\":last.rank===2?\"2nd\":\"3rd\"}</span>${last.rank===1?`Top Hero at your store in ${esc(monthName(last.period).split(\" \")[0])}! Take a bow 👏`:`${last.rank===2?\"Second\":\"Third\"} of ${num(last.heroes)} Heroes in ${esc(monthName(last.period).split(\" \")[0])}. The top spot is in sight!`}</div>`:\"\"}\n"
 ],
 [
  "\n// ---- top: the store's reward this quarter, and how it got there\n",
  "\n// the store's milestone message: cheeky, by where it stands between two medals (and a nudge in the last two weeks)\nfunction cheer(v,T,pct,left){\n  const reached=TIERS.filter(t=>pct>=t.at).pop(),next=TIERS.find(t=>pct<t.at),R=x=>esc(rand0(x));\n  if(!next)return pct>=200?`<b>Unstoppable! 🚀</b> Double your target and still going. Gold all the way: 3% on every Stravik sale this quarter.`:\n    `<b>WOW, Gold! 🥇</b> You're a true All Star. 3% on every Stravik sale this quarter, so keep that till ringing!`;\n  const from=reached?reached.at:0,gap=next.at/100*T-v,k=(pct-from)/(next.at-from),m={bronze:\"🥉\",silver:\"🥈\",gold:\"🥇\"}[next.k];\n  const hurry=left<=14?` <span class=\"as-hurry\">⏱ ${num(left)} ${left===1?\"day\":\"days\"} left in the quarter: sprint!</span>`:\"\";\n  let t;\n  if(v<=0)t=`<b>Ready, set, sell!</b> Your first Stravik sale starts the climb to Bronze ${m}.`;\n  else if(k>=0.85)t=`<b>So close you can taste it!</b> Just ${R(gap)} more and ${next.name} ${m} is yours.`;\n  else if(reached&&k<0.25)t=reached.k===\"bronze\"?`<b>Bronze in the bag! 🥉</b> Nice one. Silver is next: ${R(gap)} to go.`:`<b>Silver unlocked! 🥈</b> Look at you go. Gold is ${R(gap)} away. Go get it!`;\n  else if(k>=0.5)t=`<b>Look at you go!</b> More than halfway to ${next.name} ${m}: ${R(gap)} to go.`;\n  else t=reached?`<b>Keep those parts moving!</b> ${R(gap)} more for ${next.name} ${m}.`:`<b>Off the starting line!</b> ${R(gap)} more for Bronze ${m}. Every part counts.`;\n  return t+hurry;\n}\n// ---- top: the store's reward this quarter, and how it got there\n"
 ],
 [
  "  let say;\n  if(!next)say=`<b>Gold!</b> The top tier: 3% on every Stravik sale this quarter. Keep going, every sale adds to your reward.`;\n  else{const gap=next.at/100*T-v,k=pct/next.at;\n    say=k>=0.85?`<b>You're almost there!</b> Only ${esc(rand0(gap))} more product value for <b>${next.name}</b>.`:\n      k>=0.5?`Halfway to <b>${next.name}</b>: ${esc(rand0(gap))} to go.`:\n      v>0?`On your way to <b>${next.name}</b>: ${esc(rand0(gap))} to go.`:`Your climb to <b>Bronze</b> starts with your first Stravik sale this quarter.`;}\n",
  "  const say=cheer(v,T,pct,Q.left);\n"
 ]
]);
{ const f = "assets/allstar.css", s = fs.readFileSync(f, "utf8"); if (s.includes(".as-hurry{")) { console.error(f + ": already there"); process.exit(1); } fs.writeFileSync(f, s + "\n/* the last-two-weeks nudge in the store's message */\n.as-hurry{display:inline-block;margin-top:4px;padding:2px 10px;border-radius:999px;background:rgba(201,154,28,.18);font-weight:600;font-size:14px}\n"); console.log(f + ": updated"); }
edit("allstar/index.html", [['/assets/allstar.css?v=6"', '/assets/allstar.css?v=7"'], ['/assets/allstar.js?v=12"', '/assets/allstar.js?v=13"']]);
