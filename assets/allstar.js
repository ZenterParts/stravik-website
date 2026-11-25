// The All Star page (/allstar/): the Stravik All Star programme for the stores of a group (Autobarn).
//   - not signed in: counter staff sign in with their mobile number and the 6-digit PIN their store owner set;
//     store owners sign in with their email and password
//   - counter staff: their own page (their Stravik sales and share are added with the monthly sales reports)
//   - store owner (an approved store account on a group's store list): the store's counter staff, with add, change name,
//     new PIN and switch off/on
//     and the monthly sales report: upload the POS export, match the store's own part codes and salespeople once
//     (remembered), send; and the reports sent, by salesperson and by part (stravik_sales_setup/_submit/_report)
// Data: stravik_counter_me(), stravik_my_staff() and the edge function stravik-staff (creates and changes the logins).
// A counter login is a user with the email m<mobile digits>@counter.stravikparts.com and a password built from the PIN
// and the mobile number (the edge function builds it the same way). Styles: assets/autobarn.css.
(function(){
"use strict";
const app=document.getElementById("app");
const SD=()=>window.StravikDealer;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const day=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
const must=r=>{if(r.error)throw r.error;return r.data;};
const toast=m=>window.STV&&STV.toast(m);
const msg=e=>{const m=String(e&&(e.message||e.error_description)||e);
  if(/invalid login credentials/i.test(m))return "The mobile number or PIN is wrong, or your access is switched off. Ask your store owner if you have forgotten your PIN.";
  if(/banned/i.test(m))return "Your access is switched off. Please speak to your store owner.";
  if(/rate limit|too many/i.test(m))return "Too many attempts. Wait a few minutes and try again.";
  return m;};
const head=(title,lead,eyebrow)=>`<div class="pagehead ab-head"><div class="wrap"><div class="eyebrow-d">${esc(eyebrow||"Stravik All Star")}</div><h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:""}</div></div>`;
let C=null;

// a mobile number as E.164; South African numbers may be typed as 082 123 4567
function e164(raw){
  const s=String(raw||"").trim(),d=s.replace(/\D/g,"");
  if(s.startsWith("+")||s.startsWith("00")){const x=s.startsWith("00")?d.slice(2):d;return /^[1-9]\d{7,14}$/.test(x)?"+"+x:null;}
  if(/^0[6-8]\d{8}$/.test(d))return "+27"+d.slice(1);
  if(/^27[6-8]\d{8}$/.test(d))return "+"+d;
  return null;
}
const showMobile=m=>/^\+27\d{9}$/.test(m||"")?"0"+m.slice(3,5)+" "+m.slice(5,8)+" "+m.slice(8):(m||"");
const loginEmail=m=>"m"+m.replace(/\D/g,"")+"@counter.stravikparts.com";
const loginPassword=(m,pin)=>"stravik-allstar:"+pin+":"+m.replace(/\D/g,"");

// ---------------------------------------------------------------------------------------------------------------
// sign in: counter staff (mobile + PIN) or store owner (email + password)
// ---------------------------------------------------------------------------------------------------------------
function signIn(mode){
  siteMenu(true);
  mode=mode||"staff";
  document.title="Stravik All Star | Sign in";
  app.innerHTML=head("All Star","Rewards for the stores that sell Stravik and the counter teams who recommend it.")+
  `<div class="wrap ab-in">
    <form class="enq ab-card" id="asf" novalidate>
      <div class="full ab-switch" role="tablist"><button type="button" data-m="staff" aria-selected="${mode==="staff"}">Counter staff</button><button type="button" data-m="owner" aria-selected="${mode==="owner"}">Store owner</button></div>
      ${mode==="staff"?`
      <div class="full"><label for="asm">Mobile number</label><input id="asm" type="tel" inputmode="tel" autocomplete="tel" placeholder="082 123 4567" required></div>
      <div class="full"><label for="asp">PIN</label><input id="asp" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" placeholder="6 digits" required><small class="dhint">Your store owner gives you your PIN. Forgotten it? Ask your store owner to set a new one.</small></div>`:`
      <div class="full"><label for="ase">Email</label><input id="ase" type="email" autocomplete="email" required></div>
      <div class="full"><label for="asp">Password</label><input id="asp" type="password" autocomplete="current-password" minlength="8" required></div>`}
      <div class="full ab-row"><button class="btn gold" type="submit" id="asgo">Sign in</button>${mode==="owner"?`<a class="linkbtn" href="/#/dealer">Forgot your password?</a>`:""}</div>
      <div class="status" id="asst" role="alert"></div>
    </form>
    <aside class="ab-side">
      <h2>How All Star works</h2>
      <ul><li>Each month your store reports its Stravik sales here.</li><li>The counter team earns 2% of the store's Stravik sales, split by salesperson, paid by your store through payroll.</li><li>The store owner earns a quarterly rebate of 1%, 2% or 3%, depending on the store's sales against its target.</li></ul>
      <p>Counter staff: you can see your Stravik sales, your share and when it was paid. Your store owner adds you and sets your PIN.</p>
    </aside>
  </div>`;
  app.querySelectorAll(".ab-switch button").forEach(b=>b.onclick=()=>signIn(b.dataset.m));
  const f=app.querySelector("#asf"),stE=f.querySelector("#asst"),btn=f.querySelector("#asgo");
  const say=h=>{stE.innerHTML=h;stE.classList.add("show");};
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();stE.classList.remove("show");
    let email,pw;
    if(mode==="staff"){
      const m=e164(f.querySelector("#asm").value),pin=f.querySelector("#asp").value.trim();
      if(!m){say("Enter your mobile number, such as 082 123 4567.");return;}
      if(!/^\d{6}$/.test(pin)){say("The PIN has 6 digits.");return;}
      email=loginEmail(m);pw=loginPassword(m,pin);
    }else{
      email=f.querySelector("#ase").value.trim();pw=f.querySelector("#asp").value;
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){say("Enter your email address.");return;}
    }
    btn.disabled=true;
    try{const r=await C.auth.signInWithPassword({email,password:pw});if(r.error)throw r.error;start();}
    catch(err){say(esc(msg(err)));btn.disabled=false;}
  });
}
async function signOut(){try{await C.auth.signOut();}catch(e){}try{await SD().refresh();}catch(e){}signIn();}
function note(title,html){
  siteMenu(true);
  app.innerHTML=head(title)+`<div class="wrap ab-note"><div class="dnote">${html}</div><p><button class="btn line" type="button" id="asout">Sign out</button></p></div>`;
  app.querySelector("#asout").onclick=signOut;
}

// ---------------------------------------------------------------------------------------------------------------
// counter staff: their own page
// ---------------------------------------------------------------------------------------------------------------
function counter(me){
  siteMenu(false);
  document.title="Stravik All Star | "+me.name;
  if(!me.active)return note(me.name,"Your All Star access is switched off. Please speak to your store owner.");
  app.innerHTML=head("Hello, "+me.name.split(" ")[0],`${esc(me.store)}${me.town?", "+esc(me.town):""}${me.is_test?" (test store)":""}`)+
  `<div class="wrap ab-note">
    <div class="ab-empty" style="text-align:left"><h3>Your All Star</h3>
      <p>Each month your store reports its Stravik sales. The counter team earns 2% of the store's Stravik sales, split by salesperson. Here you will see your Stravik sales, your share, the credit note it was paid in, and when your store paid you.</p>
      <div id="asmine"><p>Nothing has been reported for your store yet. Your figures appear after the first monthly report.</p></div></div>
    <p class="dhint">Signed in with ${esc(showMobile(me.mobile))}. <button type="button" class="linkbtn" id="asout">Sign out</button></p>
  </div>`;
  app.querySelector("#asout").onclick=signOut;
  C.rpc("stravik_as_counter").then(r=>{const L=r.data||[],el=app.querySelector("#asmine");if(!el||!L.length)return;
    el.innerHTML=`<div class="ab-scroll"><table class="ab-table"><thead><tr><th>Month</th><th class="n">Your units</th><th class="n">Your Stravik sales</th><th class="n">Your share</th><th>Status</th></tr></thead><tbody>${L.map(m=>
      `<tr><td><b>${esc(monthName(m.period))}</b></td><td class="n">${num(m.units)}</td><td class="n">${esc(rand(m.value))}</td><td class="n"><b>${esc(rand(m.share))}</b>${m.booster?` <span class="ab-dim">4%</span>`:""}</td><td>${m.status==="Approved"?"Approved":"Being checked"}</td></tr>`).join("")}</tbody></table></div>
      <p class="dhint">Your sales are counted at your store's buy price, for the parts covered by its invoices. Your share is paid by your store through payroll once the month is approved.</p>`;});
}

// ---------------------------------------------------------------------------------------------------------------
// store owner: counter staff
// ---------------------------------------------------------------------------------------------------------------
const O={data:null,edit:null,tab:/staff/.test(location.hash)?"staff":"reports"};
async function call(body){
  const r=await C.functions.invoke("stravik-staff",{body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context.json();if(j&&j.error)m=j.error;}catch(e){}throw new Error(m);}
  if(r.data&&r.data.error)throw new Error(r.data.error);
  return r.data;
}
async function load(){O.data=must(await C.rpc("stravik_my_staff"));}
// a store owner is a normal customer of the site: show the site menu and send the logo home
function siteMenu(on){document.body.classList.toggle("portal",!on);const b=document.querySelector("a.brand");if(b)b.href=on?"/":"/allstar/";}
function owner(email){
  siteMenu(true);
  document.title="Stravik All Star | "+O.data.store;
  const S=O.data.staff,act=S.filter(s=>s.active).length;
  app.innerHTML=head(O.data.store,"Stravik All Star for your store: send your monthly Stravik sales report, and manage the counter staff who sign in to see their share.","Stravik All Star").replace("</h1>","</h1><p><a class=\"btn line small\" href=\"/\">← Back to your products and prices</a></p>")+
  `<section class="ab-stats" aria-label="Counter team"><div class="wrap"><div class="ab-stat"><b>${act}</b><span>${act===1?"counter person registered":"counter staff registered"}</span></div><div class="ab-stat"><b>${S.filter(s=>s.last_login_at).length}</b><span>have signed in</span></div></div></section>
   <div class="wrap ab-dash">
     <div class="ab-tabs" role="tablist"><button type="button" data-tab="reports" aria-selected="${O.tab==="reports"}">Sales reports</button><button type="button" data-tab="staff" aria-selected="${O.tab==="staff"}">Counter staff</button></div>
     <div id="abpane"></div>
     <p class="dhint ab-foot">Signed in as ${esc(email)}. <a class="linkbtn" href="/">Your products and prices</a> · <button type="button" class="linkbtn" id="asout">Sign out</button></p>
   </div>`;
  app.querySelector("#asout").onclick=signOut;
  app.querySelectorAll(".ab-tabs button").forEach(b=>b.onclick=()=>{if(R.draft&&!confirm("Leave this report without sending it?"))return;R.draft=null;R.view=null;O.tab=b.dataset.tab;history.replaceState(null,"","#"+O.tab);owner(email);});
  (O.tab==="staff"?paneStaff:paneReports)();
}
function paneStaff(){
  const P=app.querySelector("#abpane"),S=O.data.staff;
  P.innerHTML=`<p class="ab-lead">Registering your counter staff is one of the conditions for your quarterly owner rebate. Use each person's own mobile number. "Name in sales report" is how the person appears in your POS system, so their sales can be matched to them; leave it empty if it is the same as their name.</p>
    ${S.length?`<div class="ab-scroll"><table class="ab-table"><thead><tr><th>Name</th><th>Mobile</th><th>Name in sales report</th><th>Access</th><th>PIN set</th><th>Last signed in</th><th></th></tr></thead><tbody>${S.map(s=>
      `<tr><td><b>${esc(s.name)}</b></td><td>${esc(showMobile(s.mobile))}</td><td>${esc(s.pos_name||"")}</td><td>${s.active?`<span class="ab-pill ok">On</span>`:`<span class="ab-pill">Off</span>`}</td><td>${esc(day(s.pin_set_at))}</td><td>${s.last_login_at?esc(day(s.last_login_at)):`<span class="ab-dim">Not yet</span>`}</td>
       <td class="as-acts"><button type="button" class="linkbtn" data-edit="${s.id}">Edit</button><button type="button" class="linkbtn" data-pin="${s.id}">New PIN</button><button type="button" class="linkbtn" data-act="${s.id}" data-on="${s.active?"":"1"}">${s.active?"Switch off":"Switch on"}</button></td></tr>`+
      (O.edit&&O.edit.id===s.id?`<tr class="ab-od"><td colspan="7">${form(O.edit.mode,s)}</td></tr>`:"")).join("")}</tbody></table></div>`:
     `<div class="ab-empty"><h3>No counter staff yet</h3><p>Add the people who sell at your counter. Each one gets their own sign-in with their mobile number and a PIN you choose.</p></div>`}
    <h2 class="ab-h">Add a counter person</h2>${form("add",null)}`;
  wire(P);
}
function form(mode,s){
  const id=s?s.id:"new";
  if(mode==="pin")return `<form class="as-form" data-f="pin" data-id="${id}" novalidate><div class="is-fields"><label>New PIN for ${esc(s.name)}<input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="new-password"></label></div><p class="dhint">Give the new PIN to ${esc(s.name.split(" ")[0])} in person. Their old PIN stops working straight away.</p><div class="ab-row"><button class="btn gold" type="submit">Save PIN</button><button type="button" class="linkbtn" data-cancel>Cancel</button></div></form>`;
  return `<form class="as-form" data-f="${mode}" data-id="${id}" novalidate><div class="is-fields">
    <label>Name<input name="name" maxlength="80" value="${esc(s?s.name:"")}" autocomplete="off"></label>
    ${mode==="add"?`<label>Mobile number<input name="mobile" type="tel" inputmode="tel" placeholder="082 123 4567" autocomplete="off"></label>`:""}
    <label>Name in sales report (optional)<input name="pos_name" maxlength="80" value="${esc(s?s.pos_name||"":"")}" autocomplete="off"></label>
    ${mode==="add"?`<label>PIN<input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="new-password"></label>`:""}</div>
    ${mode==="add"?`<p class="dhint">The person signs in at stravikparts.com/allstar/ with this mobile number and PIN. Give them the PIN in person.</p>`:""}
    <div class="ab-row"><button class="btn gold" type="submit">${mode==="add"?"Add":"Save"}</button>${mode==="edit"?`<button type="button" class="linkbtn" data-cancel>Cancel</button>`:""}</div></form>`;
}
function wire(P){
  P.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{O.edit={id:b.dataset.edit,mode:"edit"};paneStaff();});
  P.querySelectorAll("[data-pin]").forEach(b=>b.onclick=()=>{O.edit={id:b.dataset.pin,mode:"pin"};paneStaff();const i=P.querySelector('[data-f="pin"] input');if(i)i.focus();});
  P.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{O.edit=null;paneStaff();});
  P.querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{
    const s=O.data.staff.find(x=>x.id===b.dataset.act),on=!!b.dataset.on;
    if(!on&&!confirm("Switch off "+s.name+"? They can no longer sign in. Their past sales and payments stay on record."))return;
    b.disabled=true;try{await call({action:"active",id:s.id,active:on});await load();owner(SD().state.me.email);toast(s.name+(on?" can sign in again.":" is switched off."));}catch(e){toast(msg(e));b.disabled=false;}
  });
  P.querySelectorAll("form.as-form").forEach(f=>f.addEventListener("submit",async ev=>{
    ev.preventDefault();
    const v=n=>{const i=f.querySelector(`[name=${n}]`);return i?i.value.trim():"";},mode=f.dataset.f,btn=f.querySelector("button[type=submit]");
    let body;
    if(mode==="pin"){if(!/^\d{6}$/.test(v("pin"))){toast("The PIN must be 6 digits.");return;}body={action:"pin",id:f.dataset.id,pin:v("pin")};}
    else if(mode==="edit"){if(v("name").length<2){toast("Enter the person's name.");return;}body={action:"update",id:f.dataset.id,name:v("name"),pos_name:v("pos_name")};}
    else{
      if(v("name").length<2){toast("Enter the person's name.");return;}
      if(!e164(v("mobile"))){toast("Enter a mobile number such as 082 123 4567, or with the country code (+264 ...).");return;}
      if(!/^\d{6}$/.test(v("pin"))){toast("The PIN must be 6 digits.");return;}
      body={action:"add",name:v("name"),mobile:v("mobile"),pos_name:v("pos_name"),pin:v("pin")};
    }
    btn.disabled=true;
    try{await call(body);O.edit=null;await load();owner(SD().state.me.email);
      toast(mode==="add"?body.name+" is added and can sign in now.":mode==="pin"?"New PIN saved.":"Saved.");}
    catch(e){toast(msg(e));btn.disabled=false;}
  }));
}

// ---------------------------------------------------------------------------------------------------------------
// store owner: monthly sales reports (export from the POS, upload, match codes once, submit)
// ---------------------------------------------------------------------------------------------------------------
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthName=p=>{const m=/^(\d{4})-(\d{2})/.exec(p||"");return m?MONTHS[+m[2]-1]+" "+m[1]:"";};
const rand=v=>v==null||v===""?"":"R"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=n=>Number(n||0).toLocaleString("en-US");
const R={setup:null,draft:null,view:null,period:null};
async function loadSetup(){const r=await Promise.all([C.rpc("stravik_sales_setup"),C.rpc("stravik_as_owner")]);R.setup=must(r[0]);R.calc=must(r[1]);}
const qName=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||"");return m?"Q"+(Math.floor((+m[2]-1)/3)+1)+" "+m[1]:"";};
const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));
// the quarter so far: checked sales against the quarterly target T, the tier reached and what the next one needs
function rewards(){
  const A=R.calc;if(!A||!A.quarterly_target)return "";
  const n=new Date(),cq=n.getFullYear()+"-"+String(Math.floor(n.getMonth()/3)*3+1).padStart(2,"0")+"-01";
  const q=(A.quarters||[]).find(x=>x.quarter===cq)||{value_checked:0,reports:0,reports_due:0,staff_ok:A.counter_staff>0,award:0};
  const T=Number(A.quarterly_target),v=Number(q.value_checked||0),pct=T?v/T*100:0;
  const tiers=[[60,"Bronze","1%"],[100,"Silver","2%"],[150,"Gold","3%"]],reached=tiers.filter(t=>pct>=t[0]).pop(),next=tiers.find(t=>pct<t[0]);
  const pool=(A.months||[]).filter(m=>m.period>=cq&&m.period<new Date(n.getFullYear(),Math.floor(n.getMonth()/3)*3+3,1).toISOString().slice(0,10)).reduce((a,m)=>a+Number(m.pool||0),0);
  return `<div class="as-q"><div class="as-qh"><h2 class="ab-h">${esc(qName(cq))} so far</h2><span>${reached?`<span class="ab-pill ok">${reached[1]}: ${reached[2]} owner rebate</span>`:`<span class="ab-pill">Not yet Bronze</span>`}</span></div>
    <div class="as-bar" role="img" aria-label="${pct.toFixed(1)}% of the quarterly target"><i style="width:${Math.min(100,pct/150*100).toFixed(1)}%"></i>${tiers.map(t=>`<b style="left:${(t[0]/150*100).toFixed(1)}%"><span>${t[1]}</span></b>`).join("")}</div>
    <p><b>${esc(rand(v))}</b> of your quarterly target ${esc(rand(T))} (${pct.toFixed(1)}%), counted at your buy price and covered by your invoices.${next?` ${esc(rand(next[0]/100*T-v))} more for ${next[1]} (${next[2]} on all your Stravik sales of the quarter).`:" You have reached Gold."}</p>
    <p class="dhint">Counter pool so far this quarter: <b>${esc(rand(pool))}</b>. Rebate conditions: monthly reports ${q.reports_due?`${num(Math.min(q.reports,q.reports_due))} of ${num(q.reports_due)} sent`:"sent each month"} · counter staff registered: ${A.counter_staff?num(A.counter_staff):"none yet"} · core range on shelf and account in good standing are checked by your Stravik field team.${A.first_delivery?"":" Your first delivery has not arrived yet."}</p>
    ${q.award?`<p class="dhint">You are leading your class for <b>Store of the Quarter</b> (R2,500 extra for your counter team), confirmed when the quarter ends.</p>`:""}</div>`;
}
// the months a report can be for: the last 12 ended months (a test store may also report the current month)
function periods(){
  const n=new Date(),out=[];
  for(let i=R.setup&&R.setup.is_test?0:1;i<=12;i++){const d=new Date(n.getFullYear(),n.getMonth()-i,1);out.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
  return out;
}
// headings that a POS export may use for each column
const HEAD={date:/^(invoice|inv|document|doc|trans(action)?|sale)?\s*date$|^date$/,invoice:/^(invoice|inv|document|doc)\s*(no|number|nr|#|ref(erence)?)?$|^reference$/,
  code:/^(part|item|stock|product|article)?\s*(no|number|nr|code|#)$|^(part|item|sku|stravik\s*(pn|part\s*number)?)$/,qty:/^(quantity|qty|units?|qty\s*sold)$/,
  value:/^(value|amount|nett?|line\s*total|total|sales)(\s*\(?excl\.?\s*vat\)?)?$|^value\s*excl\.?\s*vat$/,person:/^(sales\s*person|salesperson|salesman|sales\s*rep|rep|cashier|user|operator|served\s*by)$/};
const norm=s=>String(s==null?"":s).toLowerCase().replace(/[._]/g," ").replace(/\s+/g," ").trim();
function cellText(v){if(v==null)return "";if(v instanceof Date)return v;if(typeof v==="object")return v.result!=null?v.result:v.text!=null?v.text:v.richText?v.richText.map(t=>t.text).join(""):"";return v;}
function isoDate(v){
  if(v instanceof Date&&!isNaN(v))return v.getFullYear()+"-"+String(v.getMonth()+1).padStart(2,"0")+"-"+String(v.getDate()).padStart(2,"0");
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10);}
  const s=String(v||"").trim();let m;
  if((m=/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s)))return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  if((m=/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s))){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");}
  return "";
}
function numberOf(v){if(typeof v==="number")return v;const s=String(v||"").replace(/\s/g,"").replace(/^R/i,"");if(!s)return null;const x=Number(/,\d{1,2}$/.test(s)&&!/\./.test(s)?s.replace(",","."):s.replace(/,/g,""));return isFinite(x)?x:null;}
function csvRows(text){
  const first=text.split(/\r?\n/)[0]||"",sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":(first.includes("\t")?"\t":",");
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
    else if(c==='"')q=true;else if(c===sep){row.push(cur);cur="";}else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cur);rows.push(row);row=[];cur="";}else cur+=c;}
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows.filter(r=>r.some(x=>String(x).trim()!==""));
}
async function readRows(file){
  if(/\.csv$|\.txt$/i.test(file.name))return csvRows(await file.text());
  const X=await excel(),wb=new X.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const ws=wb.worksheets.find(w=>w.actualRowCount>0)||wb.worksheets[0];if(!ws)throw new Error("The file has no sheet.");
  const rows=[];ws.eachRow({includeEmpty:false},r=>{const a=[];for(let i=1;i<=r.cellCount;i++)a.push(cellText(r.getCell(i).value));rows.push(a);});
  return rows;
}
let XP=null;
const excel=()=>XP||(XP=new Promise((res,rej)=>{if(window.ExcelJS)return res(window.ExcelJS);const s=document.createElement("script");s.src="/admin/vendor/exceljs.min.js";s.onload=()=>res(window.ExcelJS);s.onerror=()=>{XP=null;rej(new Error("The Excel library did not load. Check your connection and try again."));};document.head.appendChild(s);}));
// turn the file's rows into report lines, using the headings
function parse(rows){
  let h=-1,col={};
  for(let i=0;i<Math.min(rows.length,15)&&h<0;i++){
    const c={};rows[i].forEach((v,j)=>{const t=norm(v);for(const k in HEAD)if(c[k]==null&&HEAD[k].test(t))c[k]=j;});
    if(c.code!=null&&c.qty!=null){h=i;col=c;}
  }
  if(h<0)throw new Error("The file needs at least a part number column and a quantity column, with headings such as \"Part number\" and \"Quantity\". Download the template to see the columns.");
  const out=[];
  for(let i=h+1;i<rows.length;i++){
    const r=rows[i],g=k=>col[k]==null?"":cellText(r[col[k]]);
    const code=String(g("code")).trim().toUpperCase();if(!code)continue;
    out.push({row:i+1,code,qty:numberOf(g("qty")),date:isoDate(g("date")),invoice:String(g("invoice")).trim(),value:numberOf(g("value")),person:String(g("person")).trim()});
  }
  return {lines:out,cols:col};
}
function partOf(code){
  const S=R.setup,P=R.parts||(R.parts=new Map(S.parts.map(p=>[p[0],p])));
  const c=code.replace(/\s+/g,"");
  if(P.has(code))return code;if(P.has(c))return c;
  if(code in S.codes)return S.codes[code];        // remembered: a Stravik PN or null (= not a Stravik part)
  if(R.draft&&code in R.draft.map)return R.draft.map[code];
  return undefined;                               // to be matched
}
function personOf(name){
  if(!name)return "";
  const n=name.toLowerCase().trim(),S=R.setup;
  const st=S.staff.find(s=>s.name.toLowerCase()===n||(s.pos_name||"").toLowerCase()===n);if(st)return st.id;
  if(n in S.people)return S.people[n];
  if(R.draft&&n in R.draft.people)return R.draft.people[n];
  return undefined;
}

function paneReports(){
  const P=app.querySelector("#abpane"),S=R.setup;
  if(!S){P.innerHTML=`<p class="loading">Loading…</p>`;loadSetup().then(paneReports).catch(e=>{P.innerHTML=`<p class="dnote bad">${esc(msg(e))}</p>`;});return;}
  if(R.draft)return paneDraft();
  if(R.view)return paneView();
  const ps=periods();if(!R.period||ps.indexOf(R.period)<0)R.period=ps[0];
  const done=new Map(S.reports.map(r=>[r.period.slice(0,7),r]));
  P.innerHTML=`<p class="ab-lead">By the 5th of each month, upload last month's Stravik sales, exported from your POS system: invoice date, invoice number, part number, quantity, value and salesperson. Your rebate and the counter team's share are worked out from these sales at your buy price.</p>
    <div class="as-up">
      <label>Month<select id="rper">${ps.map(p=>`<option value="${p}"${p===R.period?" selected":""}>${monthName(p)}${done.has(p)?" (sent)":""}</option>`).join("")}</select></label>
      <button type="button" class="btn gold" id="rup">Upload the sales report</button><input type="file" id="rfile" accept=".xlsx,.csv,.txt" hidden>
      <button type="button" class="btn line small" id="rtpl">Download the template</button>
    </div>
    <p class="dhint">Excel (.xlsx) or CSV. Part numbers can be Stravik numbers or your own codes: your own codes are matched to Stravik numbers once, and remembered. Sending a month again replaces that month's report until it is approved.</p>
    ${rewards()}
    <h2 class="ab-h">Your reports</h2>
    ${S.reports.length?`<div class="ab-scroll"><table class="ab-table" id="rtab"><thead><tr><th>Month</th><th>Status</th><th class="n">Lines</th><th class="n">Units</th><th class="n">Value at your buy price</th><th class="n">Covered by your invoices</th><th class="n">Counter pool</th><th>Sent</th></tr></thead><tbody>${S.reports.map(r=>{const c=calcOf(r.id)||{};return `<tr class="ab-o" data-r="${r.id}" tabindex="0"><td class="no">${esc(monthName(r.period))}</td><td><span class="ab-pill ${r.status==="Approved"?"ok":""}">${esc(r.status)}</span>${r.late?` <span class="ab-dim">late</span>`:""}</td><td class="n">${num(r.lines)}</td><td class="n">${num(r.units)}</td><td class="n">${esc(rand(r.value_credited))}</td><td class="n"><b>${esc(rand(c.value_checked))}</b></td><td class="n">${esc(rand(c.pool))}${c.booster?` <span class="ab-dim">4%</span>`:""}</td><td>${esc(day(r.submitted_at))}</td></tr>`;}).join("")}</tbody></table></div>`:
      `<div class="ab-empty"><h3>No reports yet</h3><p>Your first report is due by the 5th of the month after your first Stravik delivery.</p></div>`}`;
  P.querySelector("#rper").onchange=e=>{R.period=e.target.value;};
  const file=P.querySelector("#rfile");P.querySelector("#rup").onclick=()=>{R.period=P.querySelector("#rper").value;file.click();};
  file.onchange=async()=>{const f=file.files[0];file.value="";if(!f)return;
    try{toast("Reading "+f.name+"…");const {lines,cols}=parse(await readRows(f));if(!lines.length)throw new Error("No lines with a part number were found in the file.");
      R.draft={file:f.name,period:R.period,lines,cols,map:{},people:{}};paneDraft();}catch(e){toast(msg(e));}};
  P.querySelector("#rtpl").onclick=template;
  const tb=P.querySelector("#rtab");if(tb){const open=id=>openReport(id);tb.onclick=e=>{const tr=e.target.closest("tr[data-r]");if(tr)open(tr.dataset.r);};tb.onkeydown=e=>{if(e.key==="Enter"){const tr=e.target.closest("tr[data-r]");if(tr)open(tr.dataset.r);}};}
}
// the uploaded file before it is sent: codes and salespeople to match, problems, totals
function paneDraft(){
  const P=app.querySelector("#abpane"),D=R.draft,S=R.setup,price=new Map(S.parts.map(p=>[p[0],p[1]]));
  const unk=new Map(),pun=new Map(),probs=[];let units=0,val=0,stravik=0,other=0;
  const lo=D.period+"-01",hi=D.period+"-31";let outside=0;
  D.lines.forEach(l=>{
    const pn=partOf(l.code);
    if(pn===undefined){const u=unk.get(l.code)||{n:0,q:0,row:l.row};u.n++;u.q+=l.qty||0;unk.set(l.code,u);}
    else if(pn===null)other++;
    else{stravik++;if(!Number.isInteger(l.qty)||l.qty===0)probs.push(`Row ${l.row}: quantity "${l.qty==null?"":l.qty}"`);else{units+=l.qty;val+=l.qty*(price.get(pn)||0);}
      if(l.date&&(l.date<lo||l.date>hi))outside++;
      if(l.person&&personOf(l.person)===undefined){const k=l.person.toLowerCase().trim(),u=pun.get(k)||{name:l.person,n:0};u.n++;pun.set(k,u);}}
  });
  const opts=S.parts.map(p=>`<option value="${esc(p[0])}">${esc(p[0]+" – "+(p[2]||"").slice(0,70))}</option>`).join("");
  const ready=!unk.size&&!pun.size&&!probs.length&&stravik>0;
  P.innerHTML=`<p class="ab-lead"><b>${esc(D.file)}</b> for <b>${esc(monthName(D.period))}</b>: ${num(D.lines.length)} lines read, ${num(stravik)} Stravik ${stravik===1?"line":"lines"}${other?`, ${num(other)} ${other===1?"line":"lines"} not Stravik (left out)`:""}.</p>
    ${unk.size?`<h2 class="ab-h">Match your part codes (${unk.size})</h2><p class="dhint">These codes are not Stravik numbers. Choose the Stravik part for each one, or "Not a Stravik part". Your choice is remembered for the next reports.</p>
      <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Your code</th><th class="n">Lines</th><th class="n">Units</th><th>Stravik part</th></tr></thead><tbody>${Array.from(unk).map(([c,u])=>
        `<tr><td class="no">${esc(c)}</td><td class="n">${num(u.n)}</td><td class="n">${num(u.q)}</td><td><select class="as-sel" data-code="${esc(c)}"><option value="">Choose…</option><option value="-">Not a Stravik part</option>${opts}</select></td></tr>`).join("")}</tbody></table></div>`:""}
    ${pun.size?`<h2 class="ab-h">Match your salespeople (${pun.size})</h2><p class="dhint">These names are not on your counter staff list. Choose who each one is, or "No counter person": those sales count for the store, and you split their share by name later.</p>
      <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Name in the report</th><th class="n">Lines</th><th>Counter person</th></tr></thead><tbody>${Array.from(pun).map(([k,u])=>
        `<tr><td><b>${esc(u.name)}</b></td><td class="n">${num(u.n)}</td><td><select class="as-sel" data-person="${esc(k)}"><option value="">Choose…</option><option value="-">No counter person</option>${S.staff.filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`:""}
    ${probs.length?`<div class="dnote bad"><b>Fix these lines in the file and upload it again:</b> ${esc(probs.slice(0,10).join("; "))}${probs.length>10?" and "+(probs.length-10)+" more":""}.</div>`:""}
    ${outside?`<div class="dnote">${num(outside)} ${outside===1?"line has an invoice date":"lines have invoice dates"} outside ${esc(monthName(D.period))}. Check you chose the right month.</div>`:""}
    <div class="ab-save" id="rsave"><span>${ready?`${num(units)} units, ${esc(rand(val))} at your buy price excl. VAT`:`Match the codes${pun.size?" and salespeople":""} above to send the report`}</span><button type="button" class="btn gold" id="rgo"${ready?"":" disabled"}>Send the report for ${esc(monthName(D.period))}</button><button type="button" class="linkbtn" id="rcancel">Cancel</button></div>`;
  P.querySelectorAll("select[data-code]").forEach(s=>s.onchange=()=>{if(!s.value)return;D.map[s.dataset.code]=s.value==="-"?null:s.value;paneDraft();});
  P.querySelectorAll("select[data-person]").forEach(s=>s.onchange=()=>{if(!s.value)return;D.people[s.dataset.person]=s.value==="-"?"":s.value;paneDraft();});
  P.querySelector("#rcancel").onclick=()=>{R.draft=null;paneReports();};
  P.querySelector("#rgo").onclick=send;
}
async function send(){
  const D=R.draft,btn=app.querySelector("#rgo");btn.disabled=true;btn.textContent="Sending…";
  const lines=D.lines.map(l=>{const pn=partOf(l.code),pid=l.person?personOf(l.person):"";
    return {invoice_date:l.date,invoice_no:l.invoice,code:l.code,pn:pn==null?null:pn,qty:l.qty,value:l.value==null?"":String(l.value),salesperson:l.person,staff_id:pid||null};});
  try{const r=must(await C.rpc("stravik_sales_submit",{p:{period:D.period,file_name:D.file,lines}}));
    R.draft=null;await loadSetup();paneReports();
    toast(`Report for ${monthName(D.period)} sent: ${num(r.lines)} lines, ${rand(r.value_credited)} at your buy price.${r.replaced?" It replaces the one sent before.":""}${r.late?" It was sent after the 5th.":""}`);
  }catch(e){toast(msg(e));btn.disabled=false;btn.textContent="Send the report for "+monthName(D.period);}
}
async function openReport(id){
  try{R.view=must(await C.rpc("stravik_sales_report",{p_id:Number(id)}));paneView();}catch(e){toast(msg(e));}
}
function paneView(){
  const P=app.querySelector("#abpane"),V=R.view,r=V.report,L=V.lines;
  const by=(k,lbl)=>{const m=new Map();L.forEach(l=>{const key=k(l);let x=m.get(key);if(!x)m.set(key,x={key,label:lbl(l),u:0,v:0});x.u+=l.qty;x.v+=Number(l.credited||0);});return Array.from(m.values()).sort((a,b)=>b.v-a.v);};
  const parts=by(l=>l.pn,l=>l.pn+" – "+(l.desc||"")),people=by(l=>l.staff||"",l=>l.staff||"No counter person");
  P.innerHTML=`<p><button type="button" class="linkbtn" id="rback">← All reports</button></p>
    <h2 class="ab-h">${esc(monthName(r.period))} <span class="ab-pill ${r.status==="Approved"?"ok":""}">${esc(r.status)}</span></h2>
    <p class="ab-lead">${esc(r.file_name||"")} · sent ${esc(day(r.submitted_at))}${r.late?" (after the 5th)":""} · ${num(r.lines)} ${r.lines===1?"line":"lines"}, ${num(r.units)} ${r.units===1?"unit":"units"}, <b>${esc(rand(r.value_credited))}</b> at your buy price excl. VAT (${esc(rand(r.value_reported))} in your POS).</p>
    ${(()=>{const c=calcOf(r.id);if(!c)return "";const nc=Number(c.not_covered||0);
      return `<div class="as-q"><p>Covered by your invoices: <b>${esc(rand(c.value_checked))}</b>${nc>0.004?` · <span class="flag">${esc(rand(nc))} not covered</span>: more units reported than invoiced to your store for these parts, so they are not paid`:""}. Counter pool: <b>${esc(rand(c.pool))}</b> (${c.booster?"4% launch booster in your first 60 days":"2%"} of the covered value).</p>
        <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Counter person</th><th class="n">Units</th><th class="n">Covered value</th><th class="n">Share of the pool</th></tr></thead><tbody>${(c.people||[]).map(p=>`<tr><td>${p.name?esc(p.name):`<span class="ab-dim">Not assigned: you split this by name</span>`}</td><td class="n">${num(p.units)}</td><td class="n">${esc(rand(p.value))}</td><td class="n"><b>${esc(rand(p.share))}</b></td></tr>`).join("")}</tbody></table></div>
        ${c.award?`<p class="dhint">Your store leads its class for <b>Store of the Month</b> with ${esc(String(c.pct))}% of its monthly target: R1,000 extra for the counter team, confirmed when the month is approved.</p>`:""}</div>`;})()}
    <h2 class="ab-h">By salesperson (as reported)</h2><div class="ab-scroll"><table class="ab-table"><thead><tr><th>Counter person</th><th class="n">Units</th><th class="n">Value at your buy price</th></tr></thead><tbody>${people.map(x=>`<tr><td>${esc(x.label)}</td><td class="n">${num(x.u)}</td><td class="n">${esc(rand(x.v))}</td></tr>`).join("")}</tbody></table></div>
    <h2 class="ab-h">By part</h2><div class="ab-scroll"><table class="ab-table"><thead><tr><th>Part</th><th class="n">Units</th><th class="n">Value at your buy price</th></tr></thead><tbody>${parts.map(x=>`<tr><td>${esc(x.label)}</td><td class="n">${num(x.u)}</td><td class="n">${esc(rand(x.v))}</td></tr>`).join("")}</tbody></table></div>
    <p><button type="button" class="btn line small" id="rxls">Download the lines</button></p>`;
  P.querySelector("#rback").onclick=()=>{R.view=null;paneReports();};
  P.querySelector("#rxls").onclick=()=>xlsx([{name:"Lines",head:["Invoice date","Invoice","Your code","Stravik PN","Description","Quantity","Value in your POS","Salesperson","Counter person","Your buy price","Value at your buy price"],
    widths:[12,14,14,12,46,9,14,18,20,12,16],rows:L.map(l=>[l.date||"",l.invoice||"",l.code,l.pn,l.desc||"",l.qty,l.value==null?"":Number(l.value),l.salesperson||"",l.staff||"",Number(l.price||0),Number(l.credited||0)])}],
    "Stravik_sales_report_"+r.period.slice(0,7)+".xlsx");
}
async function xlsx(sheets,name){
  try{const X=await excel(),wb=new X.Workbook();
    sheets.forEach(sh=>{const ws=wb.addWorksheet(sh.name);ws.addRow(sh.head).font={bold:true};sh.rows.forEach(r=>ws.addRow(r));(sh.widths||[]).forEach((w,i)=>{ws.getColumn(i+1).width=w;});ws.views=[{state:"frozen",ySplit:1}];});
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){toast(msg(e));}
}
function template(){
  const S=R.setup;
  xlsx([{name:"Sales",head:["Invoice date","Invoice number","Part number","Quantity","Value excl. VAT","Salesperson"],widths:[14,16,16,10,16,22],rows:[]},
    {name:"Your Stravik parts",head:["Stravik PN","Description","Range","Your buy price excl. VAT"],widths:[14,60,16,16],rows:S.parts.map(p=>[p[0],p[2]||"",p[3]||"",Number(p[1])])},
    {name:"Counter staff",head:["Name","Name in sales report"],widths:[28,28],rows:S.staff.filter(s=>s.active).map(s=>[s.name,s.pos_name||""])}],"Stravik_All_Star_sales_template.xlsx");
}

// ---------------------------------------------------------------------------------------------------------------
async function start(){
  app.innerHTML=head("All Star","Loading…")+`<div class="wrap ab-note"></div>`;
  try{C=await SD().client();}catch(e){app.querySelector(".ab-note").innerHTML=`<p class="dnote bad">${esc(msg(e))}. Check your connection and reload the page.</p>`;return;}
  const {data:{session}}=await C.auth.getSession();
  if(!session)return signIn();
  try{
    const cm=must(await C.rpc("stravik_counter_me"));
    if(cm)return counter(cm);
    const me=await SD().refresh();if(!me)return signIn();
    const d=me.dealer;
    if(d&&d.status==="Approved"&&d.account_type!=="head_office"){
      O.data=must(await C.rpc("stravik_my_staff"));
      if(O.data)return owner(me.email);
      return note(d.trading_name||d.company_name,"All Star is for the stores of a group taking part in the programme, such as Autobarn. Your store is not part of it yet. Please contact your Stravik sales manager.");
    }
    if(d&&d.account_type==="head_office")return note(d.trading_name||d.company_name,`All Star is run by each store. Your stores' figures will appear on your <a href="/autobarn/">head office dashboard</a>.`);
    if(me.partner&&!me.staff){location.href="/insync/";return;}
    if(me.staff)return note("All Star",`You are signed in as <b>${esc(me.email)}</b>, a staff account. All Star is managed in the <a href="/admin/">admin site</a>.`);
    return note("All Star",`You are signed in as <b>${esc(me.email)}</b>, which is not part of All Star.`);
  }catch(e){note("All Star",esc(msg(e)));}
}
start();
})();
