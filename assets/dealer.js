// Stravik buyer accounts: sign in, registration for review, prices for approved buyers, and order requests to the fulfilment centre.
// Loaded on every page after common.js. Visitors who never signed in download nothing extra: the Supabase
// library is only fetched once someone opens a dealer page or already has a session in this browser.
// Data: Supabase "Master Data" (functions stravik_dealer_*, stravik_place_order; edge function stravik-dealer-mail).
(function(){
const SB_URL="https://kyegujgvlsbttyrlibgn.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZWd1amd2bHNidHR5cmxpYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTQ4NjUsImV4cCI6MjEwNjgzMDg2NX0.qw8n7Y9l8zO-npZ4BDlqK9PvksRQpEVg6BxqEo_MnWs";
const LIB="/admin/vendor/supabase-2.57.4.min.js";
const STORE="stravik-buyer-auth";          // separate from the admin site's session
const SITE=location.origin;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const usd=v=>v==null||v===""?"":"$"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
// South Africa first, then the rest of our region (Africa, Middle East, Indian Ocean islands)
const COUNTRIES=["South Africa","Algeria","Angola","Bahrain","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Cape Verde","Central African Republic","Chad","Comoros","Congo (Brazzaville)","Congo (DRC)","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Iraq","Jordan","Kenya","Kuwait","Lebanon","Lesotho","Liberia","Libya","Madagascar","Malawi","Maldives","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Oman","Qatar","Réunion","Rwanda","São Tomé and Príncipe","Saudi Arabia","Senegal","Seychelles","Sierra Leone","Somalia","South Sudan","Sudan","Syria","Tanzania","Togo","Tunisia","Uganda","United Arab Emirates","Yemen","Zambia","Zimbabwe","Other"];
const isSA=c=>!c||c==="South Africa";
const PROVINCES=["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];
const RANGES=["Batteries","Brakes","Filters","Steering & Suspension","Shock Absorbers","Gas Springs"];
const DOCS=[["CIPC certificate","Company registration certificate (CIPC in South Africa)"],["VAT certificate","VAT registration certificate"],["Proof of address","Proof of business address"],["Bank letter","Bank confirmation letter (optional)"]];
const toast=m=>window.STV&&STV.toast(m);
const hasSession=()=>{try{return !!localStorage.getItem(STORE);}catch(e){return false;}};

// ---------- Supabase client (loaded on demand) ----------
let clientP=null;
function client(){
  return clientP||(clientP=new Promise((res,rej)=>{
    if(window.supabase)return res();
    const s=document.createElement("script");s.src=LIB;s.onload=()=>res();s.onerror=()=>rej(new Error("Could not load the sign-in library"));document.head.appendChild(s);
  }).then(()=>{
    const c=window.supabase.createClient(SB_URL,SB_KEY,{auth:{storageKey:STORE,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
    c.auth.onAuthStateChange((ev)=>{
      if(ev==="PASSWORD_RECOVERY")location.hash="#/dealer/password";
      if(ev==="SIGNED_OUT"){S.me=null;S.prices=null;paintAll();}
    });
    return c;
  }));
}
const must=r=>{if(r.error)throw r.error;return r.data;};
const msg=e=>{const m=String(e&&(e.message||e.error_description)||e);
  if(/signups? not allowed/i.test(m))return "New buyer accounts aren't open yet. Please contact us and we'll set you up.";
  if(/invalid login credentials/i.test(m))return "The email or password is wrong.";
  if(/rate limit/i.test(m))return "Too many attempts. Please wait a few minutes and try again.";
  return m.replace(/^.*?Missing: /,"Please fill in: ").replace(/_/g," ");};

// ---------- state ----------
const S={me:null,prices:null,loading:null};
const D=()=>S.me&&S.me.dealer;
const approved=()=>!!(D()&&D().status==="Approved");
async function refresh(){
  const c=await client();
  const {data:{session}}=await c.auth.getSession();
  if(!session){S.me=null;S.prices=null;paintAll();return null;}
  S.me=must(await c.rpc("stravik_dealer_me"));
  if(approved()){const p=must(await c.rpc("stravik_dealer_prices"));S.prices=p?Object.assign(p,{map:new Map((p.prices||[]).map(x=>[x[0],x[1]]))}):null;}else S.prices=null;
  paintAll();return S.me;
}
function ensure(){return S.loading||(S.loading=refresh().catch(e=>{console.error(e);return null;}));}

// ---------- header link and price tags ----------
function paintNav(){
  const nav=document.getElementById("mainnav");if(!nav)return;
  let a=nav.querySelector("a[data-nav=dealer]");
  if(!a){a=document.createElement("a");a.dataset.nav="dealer";a.href="/#/dealer";a.className="nav-ic nav-dealer";
    const ref=nav.querySelector('a[data-nav=contact]');nav.insertBefore(a,ref||null);}
  const d=D();
  const label=d?(d.trading_name||d.company_name):S.me?"My account":"Buyer login";
  a.title=d?"Your buyer account":"Sign in for buyer prices and ordering";
  a.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span class="nav-l">${esc(label.length>22?label.slice(0,21)+"…":label)}</span>`;
}
function tag(pn){const m=S.prices&&S.prices.map;if(!m)return null;return m.has(pn)?usd(m.get(pn)):null;}
function paintPrices(root){
  if(!S.prices)return;
  (root||document).querySelectorAll("button[data-cart-key],button[data-add-qty]").forEach(b=>{
    let pn=b.dataset.cartKey;if(!pn){try{pn=JSON.parse(b.dataset.item).no;}catch(e){}}
    const t=pn&&tag(pn);if(!t)return;
    const prev=b.previousElementSibling;
    if(prev&&prev.classList.contains("dprice")){prev.textContent=t;return;}
    const s=document.createElement("span");s.className="dprice"+(b.dataset.addQty?" big":"");s.textContent=t;s.title="Your price ("+S.prices.group_name+", USD, excl. VAT)";
    b.parentNode.insertBefore(s,b);
  });
}
function clearPrices(){document.querySelectorAll(".dprice").forEach(x=>x.remove());}
function paintAll(){paintNav();if(S.prices)paintPrices();else clearPrices();}
let raf=0;new MutationObserver(()=>{if(!S.prices||raf)return;raf=requestAnimationFrame(()=>{raf=0;paintPrices();});}).observe(document.body,{childList:true,subtree:true});

// =====================================================================
// pages: #/dealer, #/dealer/register, #/dealer/password
// =====================================================================
const head=(title,lead,crumb)=>`<div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span>${crumb?`<a href="#/dealer">Buyer account</a><span>/</span><span>${esc(crumb)}</span>`:"<span>Buyer account</span>"}</div><h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:""}</div></div>`;
async function page(app,parts){
  app.innerHTML=head("Buyer account","Loading…")+`<div class="wrap dwrap"></div>`;
  let c;try{c=await client();}catch(e){app.querySelector(".dwrap").innerHTML=`<p class="dnote bad">${esc(e.message)}. Check your connection and reload the page.</p>`;return;}
  const {data:{session}}=await c.auth.getSession();
  if(parts[0]==="password")return pwPage(app,c,session);
  if(!session)return signIn(app,c);
  S.loading=null;const me=await ensure();
  if(!me)return signIn(app,c);
  if(me.staff&&!me.dealer){app.innerHTML=head("Buyer account")+`<div class="wrap dwrap"><p class="dnote">You're signed in as <b>${esc(me.email)}</b>, a staff account. Buyer accounts are for our customers; manage them in the <a href="/admin/#/dealers">admin site</a>.</p><p><button class="btn line" type="button" id="dout">Sign out</button></p></div>`;app.querySelector("#dout").onclick=()=>signOut(c);return;}
  if(!me.dealer||(parts[0]==="register"&&["Pending","Rejected"].includes(me.dealer.status)))return regForm(app,c,me);
  return account(app,c,me);
}

// ---------- sign in / create account / forgot password ----------
function signIn(app,c,mode){
  mode=mode||"in";
  app.innerHTML=head(mode==="new"?"Create a buyer account":"Buyer login","Approved Stravik buyers see their prices in the catalogue and order online. New to Stravik? Create an account and register your business; we'll review it and email you.")+
  `<div class="wrap dwrap"><div class="dauth">
    <div class="dtabs" role="tablist"><button type="button" role="tab" data-m="in" aria-selected="${mode==="in"}">Sign in</button><button type="button" role="tab" data-m="new" aria-selected="${mode==="new"}">Create an account</button></div>
    <form class="enq" id="dauth" novalidate>
      <div class="full"><label for="de">Email</label><input id="de" type="email" autocomplete="email" required></div>
      <div class="full"><label for="dp">Password</label><input id="dp" type="password" autocomplete="${mode==="new"?"new-password":"current-password"}" minlength="8" required>${mode==="new"?`<small class="dhint">At least 8 characters.</small>`:""}</div>
      ${mode==="new"?`<div class="full"><label for="dp2">Repeat the password</label><input id="dp2" type="password" autocomplete="new-password" minlength="8" required></div>`:""}
      <div class="full"><button class="btn gold" type="submit" id="dgo">${mode==="new"?"Create account":"Sign in"}</button>${mode==="in"?` <button type="button" class="linkbtn" id="dforgot">Forgot your password?</button>`:""}</div>
      <div class="status" id="dst" role="alert"></div>
    </form></div>
    <aside class="dside"><h2>Why register?</h2><ul><li>See your buyer prices on every catalogue page</li><li>Send order requests online; our fulfilment centre delivers and invoices</li><li>Track your orders and their invoices</li></ul><p class="dhint">Accounts are reviewed by our team before prices are shown.</p></aside></div>`;
  app.querySelectorAll(".dtabs button").forEach(b=>b.onclick=()=>signIn(app,c,b.dataset.m));
  const f=app.querySelector("#dauth"),st=f.querySelector("#dst"),btn=f.querySelector("#dgo");
  const say=(h,good)=>{st.innerHTML=h;st.classList.add("show");st.classList.toggle("ok",!!good);};
  const fg=f.querySelector("#dforgot");
  if(fg)fg.onclick=async()=>{const e=f.querySelector("#de").value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter your email address first, then click “Forgot your password?” again.");f.querySelector("#de").focus();return;}
    const r=await c.auth.resetPasswordForEmail(e,{redirectTo:SITE+"/#/dealer/password"});say(r.error?esc(msg(r.error)):"If an account exists for <b>"+esc(e)+"</b>, we've emailed a link to choose a new password.",!r.error);};
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();const e=f.querySelector("#de").value.trim(),p=f.querySelector("#dp").value;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter an email address like name@company.co.za.");return;}
    if(p.length<8){say("The password needs at least 8 characters.");return;}
    if(mode==="new"&&p!==f.querySelector("#dp2").value){say("The two passwords don't match.");return;}
    btn.disabled=true;st.classList.remove("show");
    try{
      if(mode==="new"){
        const r=await c.auth.signUp({email:e,password:p,options:{emailRedirectTo:SITE+"/#/dealer/register"}});
        if(r.error)throw r.error;
        if(r.data.session){S.loading=null;location.hash="#/dealer/register";page(app,["register"]);return;}
        app.querySelector(".dwrap").innerHTML=`<section class="thanks"><h2>Check your inbox</h2><p>We've sent a confirmation link to <b>${esc(e)}</b>. Open it to confirm your email, then fill in your business details.</p><p class="dhint">No email after a few minutes? Check spam, or <a href="#/contact">contact us</a>.</p></section>`;
      }else{
        const r=await c.auth.signInWithPassword({email:e,password:p});
        if(r.error)throw r.error;
        S.loading=null;page(app,[]);
      }
    }catch(err){say(/confirm/i.test(err.message)?"Please confirm your email first: open the link we sent to "+esc(e)+".":esc(msg(err)));btn.disabled=false;}
  });
}
async function signOut(c){await c.auth.signOut();S.me=null;S.prices=null;S.loading=null;paintAll();go("#/dealer");}
// go to a dealer page, redrawing it even when the address is already the same
function go(h){if(location.hash===h){S.loading=null;page(document.getElementById("app"),h.replace(/^#\/dealer\/?/,"").split("/").filter(Boolean));}else location.hash=h;}
function pwPage(app,c,session){
  app.innerHTML=head("Choose a new password",null,"Password")+`<div class="wrap dwrap"><div class="dauth">${session?`<form class="enq" id="dpw" novalidate>
    <div class="full"><label for="np1">New password</label><input id="np1" type="password" minlength="8" autocomplete="new-password" required></div>
    <div class="full"><label for="np2">Repeat it</label><input id="np2" type="password" minlength="8" autocomplete="new-password" required></div>
    <div class="full"><button class="btn gold" type="submit">Save password</button></div><div class="status" id="pst" role="alert"></div></form>`:`<p class="dnote">This link has expired or was opened in a different browser. <a href="#/dealer">Sign in</a> and use “Forgot your password?” again.</p>`}</div></div>`;
  const f=app.querySelector("#dpw");if(!f)return;
  f.addEventListener("submit",async ev=>{ev.preventDefault();const a=f.querySelector("#np1").value,b=f.querySelector("#np2").value,st=f.querySelector("#pst");
    if(a.length<8||a!==b){st.textContent=a.length<8?"At least 8 characters.":"The two passwords don't match.";st.classList.add("show");return;}
    const r=await c.auth.updateUser({password:a});if(r.error){st.textContent=msg(r.error);st.classList.add("show");return;}
    toast("Password saved");go("#/dealer");});
}

// ---------- registration form ----------
function regForm(app,c,me){
  const d=me.dealer||{},v=k=>esc(d[k]||"");
  const sel=(id,opts,cur,blank)=>`<select id="${id}">${blank?`<option value="">${blank}</option>`:""}${opts.map(o=>`<option${o===cur?" selected":""}>${esc(o)}</option>`).join("")}</select>`;
  const inp=(id,label,o={})=>`<div class="${o.full?"full":""}"><label for="r_${id}">${esc(label)}${o.req?' <span class="req" aria-hidden="true">*</span>':""}</label>${o.area?`<textarea id="r_${id}" rows="3">${v(id)}</textarea>`:`<input id="r_${id}" ${o.type?`type="${o.type}"`:""} ${o.ac?`autocomplete="${o.ac}"`:""} ${o.ph?`placeholder="${esc(o.ph)}"`:""} value="${id==="email"?esc(me.email):v(id)}"${id==="email"?" readonly":""}>`}${o.hint?`<small class="dhint">${o.hint}</small>`:""}<div class="err">Required.</div></div>`;
  const editing=!!me.dealer;
  app.innerHTML=head(editing?"Update your registration":"Register your business",editing?"Change anything that's wrong and send it again for review.":"Tell us about your business. Our team reviews every registration; once approved you'll see your prices and can order online.",editing?"Update registration":"Register")+
  `<div class="wrap dwrap"><p class="dwho"><span>Signed in as <b>${esc(me.email)}</b>. Not you?</span> <button type="button" class="btn line small" id="rout2">Sign out</button></p><form class="dreg" id="dreg" novalidate>
   <fieldset><legend>Business</legend><div class="enq">
     <div class="full"><label for="r_country">Country where the business is registered <span class="req" aria-hidden="true">*</span></label>${sel("r_country",COUNTRIES,d.country||"South Africa")}<small class="dhint">The registration and address fields below follow this choice.</small></div>
     ${inp("company_name","Registered company name",{req:1,ac:"organization"})}${inp("trading_name","Trading (store) name, if different")}
     ${inp("cipc_no","CIPC registration number",{ph:"2015/123456/07"})}${inp("vat_no","VAT number",{ph:"4123456789"})}
     <div><label for="r_business_type">Type of business</label>${sel("r_business_type",["Distributor","Dealer / parts store","Workshop","Fleet operator","Other"],d.business_type,"Choose…")}</div>${inp("years_trading","Years trading")}
   </div></fieldset>
   <fieldset><legend>Contacts</legend><div class="enq">
     ${inp("owner_name","Owner or director")}${inp("contact_name","Main contact person",{req:1,ac:"name"})}
     ${inp("contact_role","Their role",{ph:"e.g. Buyer, Store manager"})}${inp("email","Email (your login)",{type:"email"})}
     ${inp("mobile","Mobile / WhatsApp",{req:1,type:"tel",ac:"tel",ph:"+27 82 123 4567"})}${inp("phone","Office phone",{type:"tel"})}
     ${inp("accounts_email","Accounts email for invoices",{type:"email",full:1})}
   </div></fieldset>
   <fieldset><legend>Address</legend><div class="enq">
     <div id="provBox"></div>${inp("city","City / town",{req:1,ac:"address-level2"})}
     ${inp("store_address","Store address",{req:1,full:1,area:1,ac:"street-address"})}${inp("postal_code","Postal code",{ac:"postal-code"})}<div></div>
     ${inp("delivery_address","Delivery address, if different",{full:1,area:1})}
     ${inp("receiving_hours","Receiving hours",{ph:"e.g. Mon–Fri 08:00–16:30"})}${inp("truck_access","Truck access / delivery notes",{ph:"e.g. no trucks over 8 t"})}
   </div></fieldset>
   <fieldset><legend>What you buy</legend><div class="enq">
     <div class="full"><span class="lbl">Ranges you're interested in</span><div class="dchecks">${RANGES.map(r=>`<label><input type="checkbox" name="rng" value="${esc(r)}"${(d.ranges_interest||[]).indexOf(r)>=0?" checked":""}> ${esc(r)}</label>`).join("")}</div></div>
     ${inp("monthly_volume","Expected monthly volume",{ph:"e.g. 200 batteries"})}<div></div>
     ${inp("comments","Anything else we should know",{full:1,area:1})}
   </div></fieldset>
   <fieldset><legend>Documents</legend><p class="dhint">PDF, JPG or PNG, up to 10 MB each. You can also email them to us later.</p>
     ${(d.documents&&d.documents.length)?`<ul class="ddocs">${d.documents.map(x=>`<li><b>${esc(x.kind)}</b> · ${esc(x.file_name)}</li>`).join("")}</ul>`:""}
     <div class="enq">${DOCS.map(([k,l])=>`<div><label for="f_${esc(k.replace(/\s/g,""))}">${esc(l)}</label><input type="file" id="f_${esc(k.replace(/\s/g,""))}" data-kind="${esc(k)}" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>`).join("")}</div>
   </fieldset>
   <fieldset><legend>Consent</legend>
     <label class="dcheck"><input type="checkbox" id="r_terms"${d.accepted_terms?" checked":""}> I confirm these details are correct and that I'm authorised to register this business with Stravik.</label>
     <label class="dcheck"><input type="checkbox" id="r_popia"${d.accepted_popia?" checked":""}> I agree that Stravik (Zenter Parts) may store and use these details and documents to review this application and handle our orders, in line with South Africa's Protection of Personal Information Act (POPIA).</label>
   </fieldset>
   <div class="dsubmit"><button class="btn gold" type="submit" id="rgo">${editing?"Send for review again":"Send for review"}</button>${editing?` <a class="btn line" href="#/dealer">Cancel</a>`:` <button type="button" class="linkbtn" id="rout">Sign out</button>`}</div>
   <div class="status" id="rst" role="alert"></div>
  </form></div>`;
  const f=app.querySelector("#dreg"),st=f.querySelector("#rst"),btn=f.querySelector("#rgo");
  // the address and business-number fields follow the country
  const setLabel=(id,text,ph)=>{const l=f.querySelector('label[for="r_'+id+'"]');if(l)l.firstChild.nodeValue=text;const i=f.querySelector("#r_"+id);if(i)i.placeholder=ph||"";};
  const byCountry=()=>{
    const c=f.querySelector("#r_country").value,sa=isSA(c),cur=(f.querySelector("#r_province")||{}).value||d.province||"";
    f.querySelector("#provBox").innerHTML=sa?`<label for="r_province">Province <span class="req" aria-hidden="true">*</span></label>${sel("r_province",PROVINCES,PROVINCES.indexOf(cur)>=0?cur:"","Choose…")}<div class="err">Required.</div>`
      :`<label for="r_province">Region / state / province</label><input id="r_province" value="${esc(PROVINCES.indexOf(cur)>=0?"":cur)}" autocomplete="address-level1">`;
    setLabel("cipc_no",sa?"CIPC registration number":"Company registration number",sa?"2015/123456/07":"");
    setLabel("vat_no",sa?"VAT number":"VAT / tax number",sa?"4123456789":"");
    setLabel("mobile","Mobile / WhatsApp ",sa?"+27 82 123 4567":"Include the country code, e.g. +254 712 345 678");
  };
  f.querySelector("#r_country").addEventListener("change",byCountry);byCountry();
  const ro=f.querySelector("#rout");if(ro)ro.onclick=()=>signOut(c);
  app.querySelector("#rout2").onclick=()=>signOut(c);
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();st.classList.remove("show");
    const val=id=>{const el=f.querySelector("#r_"+id);return el?el.value.trim():"";};
    const req=["company_name","contact_name","mobile","city","store_address"].concat(isSA(val("country"))?["province"]:[]);let first=null;
    req.forEach(id=>{const el=f.querySelector("#r_"+id),bad=!el.value.trim();el.classList.toggle("invalid",bad);if(bad&&!first)first=el;});
    if(first){first.focus();return;}
    if(!f.querySelector("#r_terms").checked||!f.querySelector("#r_popia").checked){st.textContent="Please tick both consent boxes.";st.classList.add("show");return;}
    const files=[...f.querySelectorAll("input[type=file]")].filter(i=>i.files[0]);
    const big=files.find(i=>i.files[0].size>10485760);if(big){st.textContent=big.files[0].name+" is larger than 10 MB.";st.classList.add("show");return;}
    const p={};["company_name","trading_name","cipc_no","vat_no","business_type","years_trading","owner_name","contact_name","contact_role","mobile","phone","accounts_email","country","province","city","store_address","postal_code","delivery_address","receiving_hours","truck_access","monthly_volume","comments"].forEach(k=>p[k]=val(k));
    p.ranges_interest=[...f.querySelectorAll("input[name=rng]:checked")].map(x=>x.value);p.accepted_terms=true;p.accepted_popia=true;
    btn.disabled=true;btn.textContent="Sending…";
    try{
      const me2=must(await c.rpc("stravik_dealer_save",{p}));
      const {data:{user}}=await c.auth.getUser();
      for(const i of files){
        const file=i.files[0],safe=file.name.replace(/[^A-Za-z0-9._-]+/g,"_").slice(-80),path=user.id+"/"+Date.now()+"-"+safe;
        btn.textContent="Uploading "+file.name+"…";
        must(await c.storage.from("stravik-dealer-docs").upload(path,file,{contentType:file.type||undefined,upsert:false}));
        must(await c.rpc("stravik_dealer_add_document",{p_kind:i.dataset.kind,p_path:path,p_file_name:file.name,p_size:file.size}));
      }
      c.functions.invoke("stravik-dealer-mail",{body:{action:"registered"}}).catch(()=>{});
      S.me=me2;paintAll();toast("Registration sent for review");go("#/dealer");
    }catch(err){st.textContent=msg(err);st.classList.add("show");btn.disabled=false;btn.textContent=editing?"Send for review again":"Send for review";}
  });
}

// ---------- account page ----------
async function account(app,c,me){
  const d=me.dealer,cats=d.categories;
  const badge={Pending:"Waiting for review",Approved:"Approved",Rejected:"Needs changes",Suspended:"On hold"}[d.status]||d.status;
  let body="";
  if(d.status==="Pending")body=`<div class="dstat pending"><h2>Thanks, your registration is with our team</h2><p>We review every application and will email <b>${esc(d.email)}</b> once your account is approved. Sent ${esc(new Date(d.submitted_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}))}.</p>${d.review_note?`<p class="dnote">${esc(d.review_note)}</p>`:""}<p><a class="btn line" href="#/dealer/register">Update your details or add documents</a></p></div>`;
  else if(d.status==="Rejected")body=`<div class="dstat bad"><h2>We need a few changes</h2>${d.review_note?`<p class="dnote">${esc(d.review_note)}</p>`:"<p>Please check your details and documents.</p>"}<p><a class="btn gold" href="#/dealer/register">Update and send again</a></p></div>`;
  else if(d.status==="Suspended")body=`<div class="dstat bad"><h2>Your account is on hold</h2><p>Ordering is paused for now. Please <a href="#/contact">contact us</a> if you have questions.</p></div>`;
  else{
    const n=S.prices?S.prices.map.size:0;
    const where=cats&&cats.length===1&&cats[0]==="Batteries"?`<a class="btn gold" href="#/batteries">Open the battery catalogue</a>`:`<a class="btn gold" href="#/products">Browse the catalogue</a>`;
    body=`<div class="dstat ok"><h2>Your prices are switched on</h2><p>You're a <b>${esc(d.group_name)}</b>${cats?` for <b>${esc(cats.join(", "))}</b>`:""}. Your prices (USD, excl. VAT) show next to each part in the catalogue${n?"":", as soon as our team has loaded them"}. Add parts to your cart and send your order request from there: it goes straight to our fulfilment centre, who confirm it, deliver and invoice you.</p><p>${where} <a class="btn line" href="#/cart">Your cart</a></p></div>
    <section class="dorders"><h2>Your orders</h2><div id="dord"><p class="dhint">Loading…</p></div></section>`;
  }
  app.innerHTML=head(d.trading_name||d.company_name,null)+`<div class="wrap dwrap"><div class="dacc">
    <div>${body}</div>
    <aside class="dcard"><span class="dbadge ${esc(d.status.toLowerCase())}">${esc(badge)}</span>
      <dl><dt>Company</dt><dd>${esc(d.company_name)}</dd>${d.cipc_no?`<dt>${isSA(d.country)?"CIPC":"Reg. no."}</dt><dd>${esc(d.cipc_no)}</dd>`:""}<dt>Contact</dt><dd>${esc(d.contact_name)}</dd><dt>Email</dt><dd>${esc(d.email)}</dd><dt>Mobile</dt><dd>${esc(d.mobile||"")}</dd><dt>Location</dt><dd>${esc([d.city,d.province,isSA(d.country)?"":d.country].filter(Boolean).join(", "))}</dd>${d.group_name?`<dt>Price list</dt><dd>${esc(d.group_name)}</dd>`:""}</dl>
      <button class="btn line" type="button" id="dout">Sign out</button></aside></div></div>`;
  app.querySelector("#dout").onclick=()=>signOut(c);
  const box=app.querySelector("#dord");if(!box)return;
  try{
    const os=must(await c.rpc("stravik_dealer_orders"));
    box.innerHTML=!os.length?`<p class="dhint">No orders yet.</p>`:os.map(o=>`<details class="dorder"><summary><b>${esc(o.order_no)}</b><span>${esc(new Date(o.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}))}</span><span>${o.lines} line${o.lines===1?"":"s"}, ${o.units} units</span><span>${o.total_usd==null?"":usd(o.total_usd)}</span><span class="dbadge s">${esc(o.status==="With DPW"?"With fulfilment centre":o.status)}</span></summary>
      <div class="dorder-b">${o.po_ref?`<p>Your PO: <b>${esc(o.po_ref)}</b></p>`:""}<p>Deliver to: ${esc(o.delivery_address||"")}</p>${o.invoice_no?`<p>Invoice: <b>${esc(o.invoice_no)}</b></p>`:""}${o.waybill_no?`<p>Waybill: <b>${esc(o.waybill_no)}</b></p>`:""}
      <table class="ctable"><thead><tr><th>Part</th><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${(o.items||[]).map(i=>`<tr><td class="no"><a href="/part/${esc(i.pn)}/">${esc(i.pn)}</a></td><td class="dsc">${esc(i.description||"")}</td><td>${i.qty}</td><td>${i.price==null?"on request":usd(i.price)}</td><td>${usd(i.total)}</td></tr>`).join("")}</tbody></table></div></details>`).join("");
  }catch(e){box.innerHTML=`<p class="dnote bad">${esc(msg(e))}</p>`;}
}

// =====================================================================
// cart page: "Send order request" (to the fulfilment centre) for approved buyers
// =====================================================================
async function cart(app){
  if(!hasSession())return;
  const me=await ensure();if(!me||!me.dealer)return;
  const wrap=app.querySelector(".cartwrap");if(!wrap)return;
  const d=me.dealer;
  if(!STV.Cart.items().some(i=>i.no))return;
  let sec=wrap.querySelector("#dorderp");
  if(!sec){sec=document.createElement("section");sec.className="panel dorderp";sec.id="dorderp";wrap.insertBefore(sec,wrap.children[1]||null);}
  if(d.status!=="Approved"){sec.innerHTML=`<div class="panel-head"><h2>Ordering</h2></div><p class="dpad">Your buyer account is <b>${esc({Pending:"waiting for review",Rejected:"waiting for changes",Suspended:"on hold"}[d.status]||d.status)}</b>. Once it's approved you can order these parts here. <a href="#/dealer">Your account</a></p>`;return;}
  const items=STV.Cart.items().filter(i=>i.no);
  if(!items.length){sec.remove();return;}
  const c=await client();
  let chk;try{chk=must(await c.rpc("stravik_dealer_check",{pns:items.map(i=>i.no)}));}catch(e){sec.innerHTML=`<p class="dpad dnote bad">${esc(msg(e))}</p>`;return;}
  const by={};chk.forEach(x=>by[x.pn]=x);
  const ok=items.filter(i=>by[i.no]&&by[i.no].allowed),no=items.filter(i=>!(by[i.no]&&by[i.no].allowed));
  const addr=d.delivery_address||[d.store_address,d.city,d.province,d.postal_code,isSA(d.country)?"":d.country].filter(Boolean).join(", ");
  sec.innerHTML=`<div class="panel-head"><h2>Send order request</h2><span class="muted">${esc(d.group_name)} · USD</span></div>
    ${ok.length?`<table class="ctable dot"><thead><tr><th>Part</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody id="dotb"></tbody><tfoot><tr><td colspan="3">Total (excl. VAT)</td><td id="dott"></td></tr></tfoot></table>`:""}
    ${no.length?`<p class="dpad dnote">${no.length} part${no.length===1?" is":"s are"} not in your price list (${esc(no.map(i=>i.no).join(", "))})${d.categories?`: your account orders ${esc(d.categories.join(", "))} only`:""}. Send ${no.length===1?"it":"them"} with the request for price form instead.</p>`:""}
    ${ok.length?`<form class="enq" id="dof" novalidate>
      <div><label for="o_po">Your order / PO reference</label><input id="o_po" maxlength="60"></div>
      <div><label for="o_cn">Contact name</label><input id="o_cn" value="${esc(d.contact_name)}" required><div class="err">Required.</div></div>
      <div class="full"><label for="o_ph">Contact phone</label><input id="o_ph" type="tel" value="${esc(d.mobile||d.phone||"")}" required><div class="err">Required.</div></div>
      <div class="full"><label for="o_ad">Deliver to</label><textarea id="o_ad" rows="3" required>${esc(addr)}</textarea><div class="err">Required.</div></div>
      <div class="full"><label for="o_no">Notes for the fulfilment centre (optional)</label><textarea id="o_no" rows="2"></textarea></div>
      <div class="full"><button class="btn gold" type="submit" id="o_go">Send order request</button></div>
      <p class="note">Your order request goes to our fulfilment centre, who confirm it, deliver and invoice you. Prices are in US dollars, excluding VAT.</p>
      <div class="status" id="o_st" role="alert"></div></form>`:""}`;
  const paint=()=>{const tb=sec.querySelector("#dotb");if(!tb)return;let tot=0,anyNull=false;
    const cur=STV.Cart.items();
    tb.innerHTML=ok.map(i=>{const q=(cur.find(x=>x.key===i.key)||i).qty||1,p=by[i.no].price,t=p==null?null:p*q;if(t==null)anyNull=true;else tot+=t;
      return `<tr><td class="no">${esc(i.no)}<div class="dsc">${esc(by[i.no].description||i.desc||"")}</div></td><td>${q}</td><td>${p==null?'<span class="dhint">on request</span>':usd(p)}</td><td>${t==null?"":usd(t)}</td></tr>`;}).join("");
    sec.querySelector("#dott").textContent=usd(tot)+(anyNull?" + lines on request":"");};
  paint();
  const ci=app.querySelector("#citems");if(ci)ci.addEventListener("change",()=>setTimeout(paint,0));
  const f=sec.querySelector("#dof");if(!f)return;
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();const st=f.querySelector("#o_st"),btn=f.querySelector("#o_go");st.classList.remove("show");
    let first=null;["o_cn","o_ph","o_ad"].forEach(id=>{const el=f.querySelector("#"+id),bad=!el.value.trim();el.classList.toggle("invalid",bad);if(bad&&!first)first=el;});if(first){first.focus();return;}
    const cur=STV.Cart.items(),lines=ok.map(i=>({pn:i.no,qty:(cur.find(x=>x.key===i.key)||i).qty||1}));
    btn.disabled=true;btn.textContent="Sending…";
    try{
      const r=must(await c.rpc("stravik_place_order",{p:{items:lines,po_ref:f.querySelector("#o_po").value,contact_name:f.querySelector("#o_cn").value,contact_phone:f.querySelector("#o_ph").value,delivery_address:f.querySelector("#o_ad").value,notes:f.querySelector("#o_no").value}}));
      let mail=null;try{mail=(await c.functions.invoke("stravik-dealer-mail",{body:{action:"order",order_no:r.order_no}})).data;}catch(e){}
      ok.forEach(i=>STV.Cart.remove(i.key));
      done(app,r.order_no,mail);
    }catch(err){st.textContent=msg(err);st.classList.add("show");btn.disabled=false;btn.textContent="Send order request";}
  });
}
function done(app,no,mail){
  const sent=mail&&mail.status==="sent";
  app.innerHTML=`<div class="wrap"><section class="thanks" aria-labelledby="dty"><div class="tick" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h1 id="dty" tabindex="-1">Order request sent</h1><p>${sent?"Your order request has gone to our fulfilment centre. You'll get a copy by email.":"Your order request is saved and we'll pass it to our fulfilment centre."}</p>
    <div class="refbox"><span>Your order number</span><strong>${esc(no)}</strong></div>
    <p>The fulfilment centre will contact you to confirm delivery and invoicing. Quote this number in any correspondence.</p>
    <div class="row"><a class="btn gold" href="#/dealer">Your orders</a><a class="btn line" href="#/products">Back to the catalogue</a></div></section></div>`;
  window.scrollTo(0,0);app.querySelector("#dty").focus();
}

// ---------- start ----------
paintNav();
if(hasSession()||/[?&]code=/.test(location.search))ensure().then(()=>{if(/[?&]code=/.test(location.search))history.replaceState(null,"",location.pathname+location.hash);});
window.StravikDealer={page,cart,refresh:()=>{S.loading=null;return ensure();},state:S};
})();
