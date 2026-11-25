// The All Star page (/allstar/): the Stravik All Star programme for the stores of a group (Autobarn).
//   - not signed in: counter staff sign in with their mobile number and the 6-digit PIN their store owner set;
//     store owners sign in with their email and password
//   - counter staff: their own page (their Stravik sales and share are added with the monthly sales reports)
//   - store owner (an approved store account on a group's store list): the store's counter staff, with add, change name,
//     new PIN and switch off/on
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
  app.innerHTML=head(title)+`<div class="wrap ab-note"><div class="dnote">${html}</div><p><button class="btn line" type="button" id="asout">Sign out</button></p></div>`;
  app.querySelector("#asout").onclick=signOut;
}

// ---------------------------------------------------------------------------------------------------------------
// counter staff: their own page
// ---------------------------------------------------------------------------------------------------------------
function counter(me){
  document.title="Stravik All Star | "+me.name;
  if(!me.active)return note(me.name,"Your All Star access is switched off. Please speak to your store owner.");
  app.innerHTML=head("Hello, "+me.name.split(" ")[0],`${esc(me.store)}${me.town?", "+esc(me.town):""}${me.is_test?" (test store)":""}`)+
  `<div class="wrap ab-note">
    <div class="ab-empty" style="text-align:left"><h3>Your All Star</h3>
      <p>Each month your store reports its Stravik sales. The counter team earns 2% of the store's Stravik sales, split by salesperson. Here you will see your Stravik sales, your share, the credit note it was paid in, and when your store paid you.</p>
      <p>Nothing has been reported for your store yet. Your figures appear after the first monthly report.</p></div>
    <p class="dhint">Signed in with ${esc(showMobile(me.mobile))}. <button type="button" class="linkbtn" id="asout">Sign out</button></p>
  </div>`;
  app.querySelector("#asout").onclick=signOut;
}

// ---------------------------------------------------------------------------------------------------------------
// store owner: counter staff
// ---------------------------------------------------------------------------------------------------------------
const O={data:null,edit:null};
async function call(body){
  const r=await C.functions.invoke("stravik-staff",{body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context.json();if(j&&j.error)m=j.error;}catch(e){}throw new Error(m);}
  if(r.data&&r.data.error)throw new Error(r.data.error);
  return r.data;
}
async function load(){O.data=must(await C.rpc("stravik_my_staff"));}
function owner(email){
  document.title="Stravik All Star | "+O.data.store;
  const S=O.data.staff,act=S.filter(s=>s.active).length;
  app.innerHTML=head(O.data.store,"Your counter team on Stravik All Star. Add each person who sells at your counter, with their mobile number and a 6-digit PIN. They sign in on this page and see their Stravik sales and share.","Stravik All Star")+
  `<section class="ab-stats" aria-label="Counter team"><div class="wrap"><div class="ab-stat"><b>${act}</b><span>${act===1?"counter person registered":"counter staff registered"}</span></div><div class="ab-stat"><b>${S.filter(s=>s.last_login_at).length}</b><span>have signed in</span></div></div></section>
   <div class="wrap ab-dash">
     <div class="ab-tabs" role="tablist"><button type="button" aria-selected="true">Counter staff</button></div>
     <div id="abpane"></div>
     <p class="dhint ab-foot">Signed in as ${esc(email)}. <a class="linkbtn" href="/">Your products and prices</a> · <button type="button" class="linkbtn" id="asout">Sign out</button></p>
   </div>`;
  app.querySelector("#asout").onclick=signOut;
  paneStaff();
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
