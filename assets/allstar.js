// The All Star page (/allstar/): Stravik All Star for the stores of a group (Autobarn).
//   - not signed in: All Stars Heroes (counter staff) sign in with their mobile number and the 6-digit PIN their store
//     owner set; store owners sign in with their email and password
//   - an All Stars Hero: only their own rewards (stravik_as_counter): their photo, this month's reward, the parts they sold,
//     their rank among the store's Heroes, badges and the store's race for Store of the Month. A Hero never sees the
//     store's buy prices or product values: only parts, units and their reward.
//   - store owner (an approved store account on a group's store list): the store's reward on top (product value this
//     quarter against Bronze, Silver and Gold) with its breakdown and an Excel download; sending the monthly sales report
//     and managing the Heroes; then a card per Hero with photo, reward and how it adds up (stravik_as_owner,
//     stravik_as_owner_breakdown, stravik_sales_setup, stravik_my_staff). Photos: private bucket stravik-hero-photos.
// Rewards follow the Stravik All Star Reward Plan: owner 1%, 2% or 3% at 60%, 100% or 150% of the quarterly target;
// Heroes share 2% of the store's product value every month (4% in the first 60 days after the first delivery), split by
// salesperson; Store of the Month and Store of the Quarter per class add R1,000 and R2,500 for the Heroes.
// "Product value" = units reported x the store's buy price, for the units invoiced to the store.
// A Hero's login is a user with the email m<mobile digits>@counter.stravikparts.com and a password built from the PIN and
// the mobile number (the edge function stravik-staff builds it the same way). Styles: assets/autobarn.css, assets/allstar.css.
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
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthName=p=>{const m=/^(\d{4})-(\d{2})/.exec(p||"");return m?MONTHS[+m[2]-1]+" "+m[1]:"";};
const qName=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||"");return m?"Q"+(Math.floor((+m[2]-1)/3)+1)+" "+m[1]:"";};
const rand=v=>v==null||v===""?"":"R"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const rand0=v=>"R"+Math.round(Number(v||0)).toLocaleString("en-US");
const num=n=>Number(n||0).toLocaleString("en-US");
const first=n=>String(n||"").split(" ")[0];
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

// the quarter we are in, and how many days are left of it
function quarterNow(){
  const n=new Date(),q0=new Date(n.getFullYear(),Math.floor(n.getMonth()/3)*3,1),q1=new Date(q0.getFullYear(),q0.getMonth()+3,1);
  const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";
  return {start:iso(q0),end:iso(q1),left:Math.max(0,Math.ceil((q1-n)/864e5))};
}
// owner tiers (Reward Plan, All Star Store)
const TIERS=[{k:"bronze",name:"Bronze",at:60,rate:0.01},{k:"silver",name:"Silver",at:100,rate:0.02},{k:"gold",name:"Gold",at:150,rate:0.03}];
// a number that counts up when it appears
function countUp(root){
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.querySelectorAll("[data-count]").forEach(el=>{
    const to=Number(el.dataset.count)||0,fmt=el.dataset.fmt==="0"?rand0:rand;
    if(reduce||!to){el.textContent=fmt(to);return;}
    const t0=performance.now(),dur=900;
    const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(to*e);if(k<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  });
  // bars grow from zero
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.querySelectorAll("[data-w]").forEach(el=>{el.style.width=el.dataset.w;})));
}

// ---------------------------------------------------------------------------------------------------------------
// the site menu: shown to everyone except a signed-in Hero, who only needs their own page
// ---------------------------------------------------------------------------------------------------------------
function siteMenu(on){document.body.classList.toggle("portal",!on);const b=document.querySelector("a.brand");if(b)b.href=on?"/":"/allstar/";}
const head=(title,lead,eyebrow)=>`<div class="pagehead ab-head as-head"><div class="wrap"><div class="eyebrow-d">${esc(eyebrow||"Stravik All Star")}</div><h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:""}</div></div>`;

// ---------------------------------------------------------------------------------------------------------------
// sign in: All Stars Heroes (mobile + PIN) or store owner (email + password)
// ---------------------------------------------------------------------------------------------------------------
function signIn(mode){
  siteMenu(true);
  mode=mode||"hero";
  document.title="Stravik All Star | Sign in";
  app.innerHTML=head("All Star","Rewards for the stores that sell Stravik, and for the All Stars Heroes behind the counter.")+
  `<div class="wrap ab-in">
    <form class="enq ab-card" id="asf" novalidate>
      <div class="full ab-switch" role="tablist"><button type="button" data-m="hero" aria-selected="${mode==="hero"}">All Stars Hero</button><button type="button" data-m="owner" aria-selected="${mode==="owner"}">Store owner</button></div>
      ${mode==="hero"?`
      <div class="full"><label for="asm">Mobile number</label><input id="asm" type="tel" inputmode="tel" autocomplete="tel" placeholder="082 123 4567" required></div>
      <div class="full"><label for="asp">PIN</label><input id="asp" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" placeholder="6 digits" required><small class="dhint">Your store owner gives you your PIN. Forgotten it? Ask your store owner to set a new one.</small></div>`:`
      <div class="full"><label for="ase">Email</label><input id="ase" type="email" autocomplete="email" required></div>
      <div class="full"><label for="asp">Password</label><input id="asp" type="password" autocomplete="current-password" minlength="8" required></div>`}
      <div class="full ab-row"><button class="btn gold" type="submit" id="asgo">Sign in</button>${mode==="owner"?`<a class="linkbtn" href="/#/dealer">Forgot your password?</a>`:""}</div>
      <div class="status" id="asst" role="alert"></div>
    </form>
    <aside class="ab-side">
      <h2>How All Star works</h2>
      <ul><li><b>Your store</b> earns 1% at Bronze, 2% at Silver or 3% at Gold, on all its Stravik sales of the quarter.</li><li><b>All Stars Heroes</b>, the counter team, share 2% of the store's Stravik sales every month, by who sold what. 4% in the first 60 days.</li><li>The best store of each class wins Store of the Month and Store of the Quarter: extra rewards for its Heroes.</li></ul>
      <p>Heroes: sign in with your mobile number to see your own rewards. Your store owner adds you and sets your PIN.</p>
    </aside>
  </div>`;
  app.querySelectorAll(".ab-switch button").forEach(b=>b.onclick=()=>signIn(b.dataset.m));
  const f=app.querySelector("#asf"),stE=f.querySelector("#asst"),btn=f.querySelector("#asgo");
  const say=h=>{stE.innerHTML=h;stE.classList.add("show");};
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();stE.classList.remove("show");
    let email,pw;
    if(mode==="hero"){
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
// photos of the Heroes: private bucket, one file per Hero (<staff id>.jpg), shown through short-lived signed links
// ---------------------------------------------------------------------------------------------------------------
const PHOTOS="stravik-hero-photos";
async function photoUrls(ids){
  const out={};if(!ids.length)return out;
  try{const r=await C.storage.from(PHOTOS).createSignedUrls(ids.map(i=>i+".jpg"),3600);(r.data||[]).forEach(x=>{if(x.signedUrl&&!x.error)out[x.path.replace(/\.jpg$/,"")]=x.signedUrl;});}catch(e){}
  return out;
}
// a picture chosen on the phone or computer: cropped square, 320 x 320, saved as JPEG (no location or camera data)
function squareJpeg(file){
  return new Promise((res,rej)=>{
    if(!/^image\//.test(file.type||"image/")){rej(new Error("Choose a photo."));return;}
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{const s=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement("canvas");c.width=c.height=320;
      c.getContext("2d").drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,320,320);URL.revokeObjectURL(url);
      c.toBlob(b=>b?res(b):rej(new Error("The photo could not be read.")),"image/jpeg",0.86);};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("The photo could not be read. Try a JPEG or PNG."));};
    img.src=url;
  });
}
async function savePhoto(staffId,file){
  const blob=await squareJpeg(file);
  const up=await C.storage.from(PHOTOS).upload(staffId+".jpg",blob,{upsert:true,contentType:"image/jpeg",cacheControl:"60"});
  if(up.error)throw up.error;
  must(await C.rpc("stravik_hero_photo_set",{p_staff:staffId,p_has:true}));
}
async function removePhoto(staffId){
  const r=await C.storage.from(PHOTOS).remove([staffId+".jpg"]);if(r.error)throw r.error;
  must(await C.rpc("stravik_hero_photo_set",{p_staff:staffId,p_has:false}));
}
// a hidden file picker for one Hero; done() runs after a change
function pickPhoto(staffId,done){
  const i=document.createElement("input");i.type="file";i.accept="image/*";
  i.onchange=async()=>{const f=i.files[0];if(!f)return;toast("Saving the photo…");try{await savePhoto(staffId,f);toast("Photo saved.");done();}catch(e){toast(msg(e));}};
  i.click();
}
const initials=n=>String(n||"?").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const avatar=(name,url,cls)=>`<span class="hz-av ${cls||""}">${url?`<img src="${esc(url)}" alt="">`:`<span>${esc(initials(name))}</span>`}</span>`;

// ---- medals (SVG): ribbon and coin with a star, in bronze, silver or gold; "none" is a grey outline
const MEDAL={bronze:["#e0a068","#b8733a","#7a4417"],silver:["#ffffff","#9ea9b3","#5d6874"],gold:["#f6dc7a","#c99a1c","#7a5a00"],none:["#f1f1ef","#d5d8dc","#9aa1a8"]};
function medal(k,size,title){
  const c=MEDAL[k]||MEDAL.none,id="md"+k,s=size||40;
  return `<svg class="md md-${k}" width="${s}" height="${Math.round(s*1.25)}" viewBox="0 0 40 50" role="img" aria-label="${esc(title||k)}"><title>${esc(title||k)}</title>
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs>
    <path d="M10 2h8l5 15h-8z" fill="${k==="none"?"#c9cdd2":"#0b203d"}"/><path d="M30 2h-8l-5 15h8z" fill="${k==="none"?"#b7bcc2":"#c99a1c"}"/>
    <circle cx="20" cy="31" r="15" fill="url(#${id})" stroke="${c[2]}" stroke-width="1.6"/>
    <circle cx="20" cy="31" r="11" fill="none" stroke="${c[2]}" stroke-opacity=".45" stroke-width="1"/>
    <path d="M20 23.6l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z" fill="${c[2]}" fill-opacity="${k==="none"?".5":".85"}"/></svg>`;
}

// ---- charts (plain SVG): a donut for "how the total is split", columns for the quarter month by month
const PALETTE=["#c99a1c","#0b203d","#b8733a","#8e9aa6","#e0a068","#3d5a80","#6b5000","#d5dde4"];
// items: [{label, value, sub}]; centre: what the middle says when nothing is picked
function donut(items,centre,unit){
  const tot=items.reduce((a,x)=>a+Math.max(0,Number(x.value)||0),0),C=2*Math.PI*42;
  if(!tot)return "";
  let at=0;
  const segs=items.map((x,i)=>{const v=Math.max(0,Number(x.value)||0),len=v/tot*C,s=`<circle class="dn-seg" data-i="${i}" cx="60" cy="60" r="42" stroke="${PALETTE[i%PALETTE.length]}" style="--len:${len.toFixed(2)};--gap:${(C-len).toFixed(2)};--c:${C.toFixed(2)};stroke-dashoffset:${(-at).toFixed(2)};animation-delay:${(i*0.08).toFixed(2)}s" tabindex="0" role="img" aria-label="${esc(x.label)}: ${(v/tot*100).toFixed(0)}%"></circle>`;at+=len;return s;}).join("");
  return `<div class="dn" data-centre="${esc(centre)}" data-unit="${esc(unit||"")}" data-items='${esc(JSON.stringify(items.map(x=>({l:x.label,v:Number(x.value)||0,s:x.sub||""}))))}' data-tot="${tot}">
    <div class="dn-c"><svg viewBox="0 0 120 120" class="dn-svg"><circle cx="60" cy="60" r="42" class="dn-bg"></circle><g transform="rotate(-90 60 60)">${segs}</g></svg>
    <div class="dn-mid"><b>${esc(centre)}</b><span></span></div></div>
    <ul class="dn-legend">${items.map((x,i)=>`<li data-i="${i}" tabindex="0"><i style="background:${PALETTE[i%PALETTE.length]}"></i><b>${esc(x.label)}</b><span>${(Number(x.value)/tot*100).toFixed(0)}%</span><em>${esc(x.sub||"")}</em></li>`).join("")}</ul></div>`;
}
// hover, focus or tap a slice or a legend line: it stands out and the middle says what it is
function wireDonuts(root){
  root.querySelectorAll(".dn").forEach(d=>{
    const items=JSON.parse(d.dataset.items||"[]"),tot=Number(d.dataset.tot)||1,mid=d.querySelector(".dn-mid");
    const show=i=>{d.querySelectorAll("[data-i]").forEach(e=>e.classList.toggle("on",i!=null&&e.dataset.i===String(i)));d.classList.toggle("pick",i!=null);
      if(i==null){mid.innerHTML=`<b>${esc(d.dataset.centre)}</b><span></span>`;return;}
      const x=items[i];mid.innerHTML=`<b>${(x.v/tot*100).toFixed(0)}%</b><span>${esc(x.l)}</span>`;};
    d.querySelectorAll("[data-i]").forEach(e=>{const i=+e.dataset.i;e.addEventListener("mouseenter",()=>show(i));e.addEventListener("focus",()=>show(i));e.addEventListener("click",()=>show(i));});
    d.addEventListener("mouseleave",()=>show(null));
  });
}
// the quarter so far after each month, as columns rising towards the Bronze, Silver and Gold lines
function monthColumns(months,T,qStart){
  if(!T)return "";
  const y0=+qStart.slice(0,4),m0=+qStart.slice(5,7)-1,slots=[0,1,2].map(k=>{const d=new Date(y0,m0+k,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");});
  let run=0;const cols=slots.map(p=>{const m=months.find(x=>x.period.slice(0,7)===p);const before=run;if(m)run+=Number(m.value||0);return {p,m,before,after:run};});
  const top=Math.max(T*1.65,run*1.08),W=600,H=250,L=8,R=86,B=34,Tp=14,ch=H-B-Tp,cw=(W-L-R)/3,bw=cw*0.46;
  const y=v=>Tp+ch-(v/top)*ch;
  const lines=TIERS.map(t=>{const v=t.at/100*T,yy=y(v).toFixed(1);return `<line x1="${L}" x2="${W-R+6}" y1="${yy}" y2="${yy}" class="mc-line ${t.k}"></line><text x="${W-R+10}" y="${(+yy+4).toFixed(1)}" class="mc-tl ${t.k}">${t.name}</text>`;}).join("");
  const bars=cols.map((c,i)=>{const x=(L+cw*i+(cw-bw)/2).toFixed(1),base=Tp+ch;
    const hb=(c.before/top*ch),ha=((c.after-c.before)/top*ch);
    return `<g class="mc-col" style="animation-delay:${(i*0.12).toFixed(2)}s">
      ${c.m&&c.before>0?`<rect x="${x}" y="${(base-hb).toFixed(1)}" width="${bw.toFixed(1)}" height="${hb.toFixed(1)}" rx="3" class="mc-before"></rect>`:""}
      ${c.m?`<rect x="${x}" y="${(base-hb-ha).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(ha,0).toFixed(1)}" rx="3" class="mc-add"><title>${esc(monthName(c.p))}: +${esc(rand(c.m.value))}</title></rect>
        <text x="${(+x+bw/2).toFixed(1)}" y="${(base-hb-ha-6).toFixed(1)}" class="mc-v">${Math.round(c.after/T*100)}%</text>`:`<text x="${(+x+bw/2).toFixed(1)}" y="${(base-6).toFixed(1)}" class="mc-v dim">${(t=>c.p<t?"no report":c.p===t?"This month":"Next month")(new Date().toISOString().slice(0,7))}</text>`}
      <text x="${(+x+bw/2).toFixed(1)}" y="${H-12}" class="mc-x">${esc(MONTHS[+c.p.slice(5,7)-1].slice(0,3))}</text></g>`;}).join("");
  return `<div class="mc"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The quarter so far after each month, against the Bronze, Silver and Gold targets">${lines}<line x1="${L}" x2="${W-R+6}" y1="${Tp+ch}" y2="${Tp+ch}" class="mc-axis"></line>${bars}</svg>
    <p class="mc-key"><span><i class="mc-before"></i>Previous months</span><span><i class="mc-add"></i>Added that month</span></p></div>`;
}

// ---------------------------------------------------------------------------------------------------------------
// an All Stars Hero: only their own rewards (parts and units, never the store's prices or product values)
// ---------------------------------------------------------------------------------------------------------------
// Hero badges: milestones on the parts sold in the quarter (for fun: they do not change the reward)
const BADGES=[{at:1,name:"First Stravik sale",icon:"★"},{at:10,name:"10 parts",icon:"10"},{at:50,name:"50 parts",icon:"50"},{at:100,name:"100 parts",icon:"100"},{at:250,name:"250 parts legend",icon:"250"}];
function badgesHtml(units){
  const next=BADGES.find(b=>units<b.at);
  let line;
  if(next){const gap=next.at-units,k=units/next.at;
    const more=`${num(gap)} more ${gap===1?"part":"parts"}`;
    line=units<=0?`<b>Your first badge is waiting! ⭐</b> Sell one Stravik part to grab it.`:
      k>=0.85?`<b>Almost there! 🔥</b> Just ${more} for the <b>${esc(next.name)}</b> badge.`:
      k>=0.5?`<b>You're on fire!</b> ${more} for the <b>${esc(next.name)}</b> badge.`:
      `<b>Nice start!</b> ${more} for the <b>${esc(next.name)}</b> badge.`;}
  else line="<b>Legend! 🏆</b> Every badge this quarter. The counter is yours.";
  return `<div class="as-badges">${BADGES.map(b=>`<span class="as-badge${units>=b.at?" on":""}" title="${esc(b.name)}"><i>${esc(b.icon)}</i><span>${esc(b.name)}</span></span>`).join("")}</div>
    ${next?`<div class="as-mini"><i data-w="${Math.min(100,units/next.at*100).toFixed(1)}%"></i></div>`:""}<p class="as-say">${line}</p>`;
}
async function hero(cm){
  siteMenu(false);
  document.title="Stravik All Star | "+cm.name;
  if(!cm.active)return note(cm.name,"Your All Stars Hero access is switched off. Please speak to your store owner.");
  app.innerHTML=head("Hi, "+first(cm.name)+"!",`${esc(cm.store)}${cm.town?", "+esc(cm.town):""} · All Stars Hero`,"Stravik All Star")+`<div class="wrap ab-note"><p class="loading">Loading your rewards…</p></div>`;
  let D=null;try{D=must(await C.rpc("stravik_as_counter"));}catch(e){}
  const M=(D&&D.months)||[],last=M[0],Q=quarterNow();
  const inQ=M.filter(m=>m.period>=Q.start&&m.period<Q.end);
  const qUnits=inQ.reduce((a,m)=>a+Number(m.units||0),0),qShare=inQ.reduce((a,m)=>a+Number(m.share||0),0);
  const boost=D&&D.booster_until&&new Date(D.booster_until)>new Date();
  const pic=D&&D.photo_at?(await photoUrls([D.id]))[D.id]:null;
  app.querySelector(".ab-note").outerHTML=`<div class="wrap as-hero">
    ${boost?`<div class="as-boost"><b>Launch booster:</b> you earn 4% on your Stravik sales until ${esc(day(D.booster_until))}.</div>`:""}
    <section class="as-card as-big">
      <div class="hz-me">${avatar(cm.name,pic,"big"+(last&&last.heroes>1&&last.rank<=3?" r"+last.rank:""))}
        <button type="button" class="linkbtn" id="hzpic">${pic?"Change your photo":"Add your photo"}</button>${pic?` · <button type="button" class="linkbtn" id="hzdel">Remove</button>`:""}</div>
      ${last?`<div class="as-label">Your reward for ${esc(monthName(last.period))}</div>
      <div class="as-amount" data-count="${Number(last.share||0)}">R0.00</div>
      <p>For the <b>${num(last.units)}</b> Stravik ${last.units===1?"part":"parts"} you sold${last.booster?", with the 4% launch booster":""}. ${last.status==="Approved"?"Approved: your store pays you through payroll.":"Being checked: approved by the 10th, then your store pays you through payroll."}</p>
      ${last.heroes>1&&last.rank<=3?`<div class="as-rank r${last.rank}"><span>${last.rank===1?"1st":last.rank===2?"2nd":"3rd"}</span>${last.rank===1?`Top Hero at your store in ${esc(monthName(last.period).split(" ")[0])}! Take a bow 👏`:`${last.rank===2?"Second":"Third"} of ${num(last.heroes)} Heroes in ${esc(monthName(last.period).split(" ")[0])}. The top spot is in sight!`}</div>`:""}
      ${(last.parts||[]).length?`<details class="hz-how"><summary>How you got here</summary><ul class="hz-parts">${last.parts.map(p=>`<li><b>${esc(p.pn)}</b><span>${esc((p.desc||"").slice(0,60))}</span><em>${num(p.units)} ${p.units===1?"part":"parts"}</em></li>`).join("")}</ul>
        <p class="dhint">Your reward is ${last.booster?"4%":"2%"} of what these parts are worth to your store.</p></details>`:""}`:
      `<div class="as-label">Your rewards</div><div class="as-amount">R0.00</div><p>Nothing has been reported for you yet. Your rewards appear after your store sends its monthly Stravik sales report.</p>`}
    </section>
    <section class="as-card">
      <h2 class="ab-h">Your badges in ${esc(qName(Q.start))}</h2>
      <p class="as-sub">${num(qUnits)} Stravik ${qUnits===1?"part":"parts"} sold this quarter · ${esc(rand(qShare))} in rewards so far</p>
      ${badgesHtml(qUnits)}
    </section>
    ${last&&last.store_pct!=null?`<section class="as-card"><h2 class="ab-h">Store of the Month race</h2>
      <p>Your store reached <b>${esc(String(last.store_pct))}%</b> of its target for ${esc(monthName(last.period).split(" ")[0])}. ${last.store_award?"It is <b>leading its class</b>: R1,000 extra for its Heroes if it stays on top.":"The store with the highest % in its class wins R1,000 extra for its Heroes."}</p></section>`:""}
    ${M.length>1?`<section class="as-card"><h2 class="ab-h">Your months</h2><div class="as-hist">${M.map(m=>
      `<div><b>${esc(monthName(m.period))}</b><span>${num(m.units)} ${m.units===1?"part":"parts"}</span><span class="as-hist-r">${esc(rand(m.share))}</span></div>`).join("")}</div></section>`:""}
    ${M.some(m=>m.payout)?`<section class="as-card"><h2 class="ab-h">Your payments</h2><div class="hz-pays">${M.filter(m=>m.payout).map(m=>{const p=m.payout;
      return `<div class="hz-pay"><div><b>${esc(monthName(m.period))}</b><span>${p.paid_at?`${esc(rand(p.paid))} paid by your store on ${esc(day(p.paid_at))}`:`${esc(rand(p.calc))} approved, your store pays you through payroll`}${p.cn_no?` · credit note ${esc(p.cn_no)}`:""}</span></div>
        ${p.confirmed_at?`<span class="ab-pill ok">You confirmed</span>`:p.disputed_at?`<span class="ab-pill bad">You said not received</span><button type="button" class="linkbtn" data-pc="${p.id}" data-ok="1">I have it now</button>`:
          p.paid_at?`<span class="hz-pbtn"><button type="button" class="btn gold small" data-pc="${p.id}" data-ok="1">I received it</button><button type="button" class="linkbtn" data-pc="${p.id}" data-ok="0">Not received</button></span>`:`<span class="ab-dim">Not paid yet</span>`}</div>`;}).join("")}</div></section>`:""}
    <p class="dhint">Signed in with ${esc(showMobile(cm.mobile))}. <button type="button" class="linkbtn" id="asout">Sign out</button></p>
  </div>`;
  app.querySelector("#asout").onclick=signOut;
  const again=()=>start();
  app.querySelectorAll("[data-pc]").forEach(b=>b.onclick=async()=>{const ok=b.dataset.ok==="1";let note=null;
    if(!ok){note=prompt("What is wrong? For example: not in my pay slip yet.");if(note===null)return;}
    b.disabled=true;try{must(await C.rpc("stravik_as_payout_confirm",{p_id:Number(b.dataset.pc),p_ok:ok,p_note:note}));toast(ok?"Thank you! Payment confirmed.":"Sent: your store and Stravik will look at it.");again();}catch(e){toast(msg(e));b.disabled=false;}});
  app.querySelector("#hzpic").onclick=()=>pickPhoto(D?D.id:cm.id,again);
  const del=app.querySelector("#hzdel");if(del)del.onclick=async()=>{if(!confirm("Remove your photo?"))return;try{await removePhoto(D.id);toast("Photo removed.");again();}catch(e){toast(msg(e));}};
  countUp(app);
}

// ---------------------------------------------------------------------------------------------------------------
// store owner: the store's reward on top, the report and the Heroes' management, then the Heroes' cards
// ---------------------------------------------------------------------------------------------------------------
const O={staff:null,store:"",panel:null,edit:null,how:false,allParts:false,hzp:"quarter",hzOpen:null,pics:{}};
const R={setup:null,calc:null,draft:null,view:null,period:null};
async function call(body){
  const r=await C.functions.invoke("stravik-staff",{body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context.json();if(j&&j.error)m=j.error;}catch(e){}throw new Error(m);}
  if(r.data&&r.data.error)throw new Error(r.data.error);
  return r.data;
}
async function loadAll(){
  const r=await Promise.all([C.rpc("stravik_my_staff"),C.rpc("stravik_sales_setup"),C.rpc("stravik_as_owner"),C.rpc("stravik_as_owner_breakdown"),C.rpc("stravik_as_owner_statements")]);
  const st=must(r[0]);O.staff=st.staff;O.store=st.store;R.setup=must(r[1]);R.calc=must(r[2]);R.bd=must(r[3]);R.money=r[4].error?null:r[4].data;
  O.pics=await photoUrls((O.staff||[]).filter(x=>x.photo_at).map(x=>x.id));
}
const calcOf=id=>R.calc&&(R.calc.months||[]).find(m=>String(m.report_id)===String(id));
// tell the Stravik team by email (stravik-dealer-mail): a report sent or changed, or a correction asked; it never blocks the store
const notify=(action,id)=>{try{C.functions.invoke("stravik-dealer-mail",{body:{action,report_id:id}}).catch(()=>{});}catch(e){}};
// how a report's status reads for the store
const STAT={Submitted:"Being checked",Checked:"Checked, waiting for approval",Returned:"Sent back to you",Approved:"Approved",Rejected:"Not accepted"};
const statPill=r=>`<span class="ab-pill ${r.status==="Approved"?"ok":r.status==="Returned"||r.status==="Rejected"?"bad":""}">${esc(STAT[r.status]||r.status)}</span>`;
const sentOf=period=>R.setup&&(R.setup.reports||[]).find(r=>r.period.slice(0,7)===period);
// a month that is locked cannot be sent again: say why
function locked(period){const r=sentOf(period);if(!r||r.editable)return false;
  toast(r.status==="Approved"?monthName(period)+" is approved and final.":r.status==="Rejected"?monthName(period)+" was not accepted. Please contact your Stravik sales manager.":monthName(period)+" is locked. Open it under Reports sent to ask for a correction.");return true;}

// the store's milestone message: cheeky, by where it stands between two medals (and a nudge in the last two weeks)
function cheer(v,T,pct,left){
  const reached=TIERS.filter(t=>pct>=t.at).pop(),next=TIERS.find(t=>pct<t.at),R=x=>esc(rand0(x));
  if(!next)return pct>=200?`<b>Unstoppable! 🚀</b> Double your target and still going. Gold all the way: 3% on every Stravik sale this quarter.`:
    `<b>WOW, Gold! 🥇</b> You're a true All Star. 3% on every Stravik sale this quarter, so keep that till ringing!`;
  const from=reached?reached.at:0,gap=next.at/100*T-v,k=(pct-from)/(next.at-from),m={bronze:"🥉",silver:"🥈",gold:"🥇"}[next.k];
  const hurry=left<=14?` <span class="as-hurry">⏱ ${num(left)} ${left===1?"day":"days"} left in the quarter: sprint!</span>`:"";
  let t;
  if(v<=0)t=`<b>Ready, set, sell!</b> Your first Stravik sale starts the climb to Bronze ${m}.`;
  else if(k>=0.85)t=`<b>So close you can taste it!</b> Just ${R(gap)} more and ${next.name} ${m} is yours.`;
  else if(reached&&k<0.25)t=reached.k==="bronze"?`<b>Bronze in the bag! 🥉</b> Nice one. Silver is next: ${R(gap)} to go.`:`<b>Silver unlocked! 🥈</b> Look at you go. Gold is ${R(gap)} away. Go get it!`;
  else if(k>=0.5)t=`<b>Look at you go!</b> More than halfway to ${next.name} ${m}: ${R(gap)} to go.`;
  else t=reached?`<b>Keep those parts moving!</b> ${R(gap)} more for ${next.name} ${m}.`:`<b>Off the starting line!</b> ${R(gap)} more for Bronze ${m}. Every part counts.`;
  return t+hurry;
}
// ---- top: the store's reward this quarter, and how it got there
function storeCard(){
  const A=R.calc||{},B=R.bd||{months:[],ranges:[],parts:[]},Q=quarterNow(),T=Number(A.quarterly_target||0);
  const q=(A.quarters||[]).find(x=>x.quarter===Q.start)||{value_checked:0,reports:0,reports_due:0,award:0};
  const v=Number(q.value_checked||0),pct=T?v/T*100:0,reached=TIERS.filter(t=>pct>=t.at).pop(),next=TIERS.find(t=>pct<t.at);
  const reward=reached?v*reached.rate:0;
  const say=cheer(v,T,pct,Q.left);
  const lastM=(A.months||[])[0];
  // month by month: what each month added, and where the quarter stood after it
  let run=0;
  const months=(B.months||[]).map(m=>{run+=Number(m.value||0);return Object.assign({},m,{cum:run,cpct:T?run/T*100:0});});
  const tierAt=p=>{const t=TIERS.filter(x=>p>=x.at).pop();return t?`<span class="hz-tier ${t.k}">${medal(t.k,18,t.name)}${t.name}</span>`:`<span class="ab-dim">–</span>`;};
  const notCov=(B.months||[]).reduce((a,m)=>a+Number(m.reported||0)-Number(m.value||0),0);
  return `<section class="as-card as-store ${reached?"t-"+reached.k:"t-none"}">
    <div class="as-cardh"><span class="as-kicker">Your store · ${esc(qName(Q.start))}</span><span class="as-tier md-pill${reached?"":" none"}">${reached?medal(reached.k,46,reached.name+" tier reached"):`${medal("none",34,"Not yet Bronze")}<span>Not yet Bronze</span>`}</span></div>
    <div class="hz-top">
      <div>
        <div class="as-label">Your reward so far</div>
        <div class="as-amount" data-count="${reward}">R0.00</div>
        <p class="as-sub">${reached?`${Math.round(reached.rate*100)}% of ${esc(rand(v))} product value this quarter`:`Product value this quarter: <b>${esc(rand(v))}</b>`}</p>
        <p class="as-say">${say}</p>
      </div>
      <div>
        <div class="as-track" role="img" aria-label="${pct.toFixed(0)}% of your quarterly target">
          <span class="z bronze"></span><span class="z silver"></span><span class="z gold"></span>
          <i class="fill" data-w="${Math.min(100,pct/150*100).toFixed(1)}%"></i>
        </div>
        <div class="as-steps">${TIERS.map(t=>`<div class="as-step ${pct>=t.at?"on":""} ${t.k}">${medal(t.k,30,t.name)}<b>${t.name}</b><span>${esc(rand0(t.at/100*T))}</span><span>${Math.round(t.rate*100)}% reward</span></div>`).join("")}</div>
        <p class="as-fine">${pct.toFixed(0)}% of your quarterly target of ${esc(rand0(T))} · ${num(Q.left)} days left in ${esc(qName(Q.start))}.${lastM&&lastM.award?` Your store is leading its class for <b>Store of the Month</b>.`:""}${q.award?` And for <b>Store of the Quarter</b>.`:""}</p>
      </div>
    </div>
    <div class="hz-acts"><button type="button" class="btn line small" id="hzhow" aria-expanded="${O.how?"true":"false"}">${O.how?"Hide the breakdown":"See how you got here"}</button><button type="button" class="btn line small" id="hzxls">Download the breakdown</button></div>
    <div class="hz-break"${O.how?"":" hidden"}>
      ${months.length?`<h3 class="as-h3">Month by month</h3>${monthColumns(B.months||[],T,Q.start)}<div class="ab-scroll"><table class="ab-table"><thead><tr><th>Month</th><th class="n">Parts</th><th class="n">Product value</th><th class="n">Quarter so far</th><th class="n">% of target</th><th>Tier reached</th><th>Report</th></tr></thead><tbody>${months.map(m=>
        `<tr><td><b>${esc(monthName(m.period))}</b></td><td class="n">${num(m.units)}</td><td class="n">${esc(rand(m.value))}</td><td class="n">${esc(rand(m.cum))}</td><td class="n">${m.cpct.toFixed(0)}%</td><td>${tierAt(m.cpct)}</td><td>${statPill(m)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="dhint">No reports for this quarter yet.</p>`}
      ${(B.ranges||[]).length?`<h3 class="as-h3">By range</h3>${donut(B.ranges.map(r=>({label:r.range,value:Number(r.value),sub:num(r.units)+" parts · "+rand(r.value)})),rand0(v),"")}`:""}
      ${(B.parts||[]).length?`<h3 class="as-h3">Top selling items</h3><div class="ab-scroll"><table class="ab-table hz-top5"><thead><tr><th class="n">#</th><th>Part</th><th>Range</th><th class="n">Units</th><th class="n">Product value</th><th class="n">Share</th></tr></thead><tbody>${(O.allParts?B.parts:B.parts.slice(0,5)).map((p,i)=>
        `<tr class="${i<3?"t"+(i+1):""}"><td class="n">${i<3?medal(["gold","silver","bronze"][i],20,"No. "+(i+1)):i+1}</td><td><b>${esc(p.pn)}</b> <span class="ab-dim">${esc((p.desc||"").slice(0,60))}</span></td><td>${esc(p.range||"")}</td><td class="n">${num(p.units)}</td><td class="n">${esc(rand(p.value))}</td><td class="n">${v?(Number(p.value)/v*100<0.5&&Number(p.value)>0?"<1%":(Number(p.value)/v*100).toFixed(0)+"%"):""}</td></tr>`).join("")}</tbody></table></div>
      <p class="hz-more">${B.parts.length>5?`<button type="button" class="linkbtn" id="hzall">${O.allParts?"Show the top 5 only":`See all ${num(B.parts.length)} products`}</button>`:""}<button type="button" class="linkbtn" id="hzxls2">Download in detail (Excel)</button></p>`:""}
      ${notCov>0.004?`<p class="dhint">${esc(rand(notCov))} you reported this quarter is more than was invoiced to you, so it does not count.</p>`:""}
    </div>
  </section>`;
}
// Heroes still to be marked paid for approved months
const toPay=()=>((R.money&&R.money.payouts)||[]).filter(x=>x.staff_id&&Number(x.calc)>0&&!x.paid_at).length;
// ---- bottom: a card for each Hero
function heroesSection(){
  const B=R.bd||{heroes:[]},A=R.calc||{},staff=(O.staff||[]).filter(s=>s.active),lastM=(A.months||[])[0];
  const quarter=O.hzp!=="month";
  // the figures per Hero: the whole quarter, or the latest month reported
  const rows=staff.map(s=>{const h=(B.heroes||[]).find(x=>x.staff_id===s.id)||{};
      let units=Number(h.units||0),share=Number(h.share||0);
      if(!quarter){const mm=(h.months||[]).find(x=>lastM&&x.period===lastM.period)||{};units=Number(mm.units||0);share=Number(mm.share||0);}
      return {s,h,units,share};});
  const un=(B.heroes||[]).find(x=>!x.staff_id);
  let unUnits=0,unShare=0;if(un){if(quarter){unUnits=Number(un.units||0);unShare=Number(un.share||0);}else{const mm=(un.months||[]).find(x=>lastM&&x.period===lastM.period)||{};unUnits=Number(mm.units||0);unShare=Number(mm.share||0);}}
  rows.sort((a,b)=>b.share-a.share||a.s.name.localeCompare(b.s.name));
  const top=Math.max(1,...rows.map(r=>r.units)),total=rows.reduce((a,r)=>a+r.share,0)+unShare;
  const boost=A.first_delivery&&new Date(new Date(A.first_delivery).getTime()+60*864e5)>new Date();
  const label=quarter?qName(quarterNow().start)+" so far":(lastM?monthName(lastM.period):"Latest month");
  const card=(r,i)=>{const rank=r.share>0&&i<3?i+1:0,open=O.hzOpen===r.s.id,parts=r.h.parts||[],ms=r.h.months||[];
    return `<article class="hz-card${rank?" r"+rank:""}${r.share>0?"":" quiet"}">
      <div class="hz-head">${avatar(r.s.name,O.pics[r.s.id],rank?"r"+rank:"")}${rank?`<span class="hz-rank">${rank}</span>`:""}
        <div class="hz-name"><b>${esc(r.s.name)}</b><span>${r.units?`${num(r.units)} ${r.units===1?"part":"parts"} sold`:"No Stravik sales yet"}</span></div></div>
      <div class="hz-amt" data-count="${r.share}">R0.00</div>
      <span class="hz-bar"><i data-w="${(r.units/top*100).toFixed(1)}%"></i></span>
      <div class="hz-cacts"><button type="button" class="linkbtn" data-hzhow="${r.s.id}">${open?"Hide":"How it adds up"}</button><button type="button" class="linkbtn" data-hzpic="${r.s.id}">${O.pics[r.s.id]?"Change photo":"Add photo"}</button></div>
      ${open?`<div class="hz-detail">${ms.length?`<table><thead><tr><th>Month</th><th class="n">Parts</th><th class="n">Reward</th></tr></thead><tbody>${ms.map(m=>`<tr><td>${esc(monthName(m.period))}</td><td class="n">${num(m.units)}</td><td class="n">${esc(rand(m.share))}</td></tr>`).join("")}</tbody></table>`:""}
        ${parts.length?`<ul class="hz-parts">${parts.map(p=>`<li><b>${esc(p.pn)}</b><span>${esc((p.desc||"").slice(0,48))}</span><em>${num(p.units)}</em></li>`).join("")}</ul>`:`<p class="dhint">No Stravik sales this quarter.</p>`}
        <p class="dhint">${quarter?"This quarter.":"The cards show "+esc(label)+"; this is the whole quarter."} ${boost?"4% launch booster":"2%"} of the product value of these parts.</p></div>`:""}
    </article>`;};
  return `<section class="as-card hz-heroes">
    <div class="as-cardh"><span class="as-kicker">All Stars Heroes · ${esc(label)}</span>
      <span class="hz-switch" role="group" aria-label="Period"><button type="button" data-hzp="quarter" aria-pressed="${quarter}">This quarter</button><button type="button" data-hzp="month" aria-pressed="${!quarter}">${lastM?esc(monthName(lastM.period).split(" ")[0]):"Latest month"}</button></span></div>
    <div class="hz-sum"><div><div class="as-label">Rewards for your Heroes</div><div class="as-amount" data-count="${total}">R0.00</div>
      <p class="as-sub">${boost?"4% launch booster":"2%"} of the product value they sold${!quarter&&lastM&&lastM.award?" · <b>+R1,000</b> if you stay Store of the Month":""}. You pay your Heroes through payroll once the month is approved. Each Hero sees only their own rewards, never your prices.</p></div>
      ${donut(rows.filter(r=>r.units>0).map(r=>({label:r.s.name,value:r.units,sub:num(r.units)+" parts"})).concat(unUnits>0?[{label:"Not linked to a Hero",value:unUnits,sub:num(unUnits)+" parts"}]:[]),num(rows.reduce((a,r)=>a+r.units,0)+unUnits)+" parts","parts")}</div>
    ${staff.length?`<div class="hz-grid">${rows.map(card).join("")}
      ${unShare>0?`<article class="hz-card un"><div class="hz-head">${avatar("?",null,"")}<div class="hz-name"><b>Not linked to a Hero</b><span>${num(unUnits)} parts without a Hero's name</span></div></div><div class="hz-amt">${esc(rand(unShare))}</div><p class="dhint">Choose the Hero for these sales when you next send or correct a report.</p></article>`:""}
      <button type="button" class="hz-card hz-add" data-open="heroes"><span class="hz-av"><span>+</span></span><b>Add a Hero</b><span class="dhint">Each person who sells at your counter</span></button></div>`:
    `<div class="ab-empty"><h3>No Heroes yet</h3><p>Add the people who sell at your counter. Each one signs in with their mobile number and sees their own rewards.</p><p><button type="button" class="btn gold" data-open="heroes">Add your Heroes</button></p></div>`}
  </section>`;
}
// the breakdown as an Excel file
async function downloadBreakdown(){
  const A=R.calc||{},B=R.bd||{},Q=quarterNow(),T=Number(A.quarterly_target||0),names={};(O.staff||[]).forEach(s=>{names[s.id]=s.name;});
  const v=(B.months||[]).reduce((a,m)=>a+Number(m.value||0),0),pct=T?v/T*100:0,reached=TIERS.filter(t=>pct>=t.at).pop();
  // every line reported this quarter (not the rejected reports), in date order
  const reps=((R.setup&&R.setup.reports)||[]).filter(r=>r.period>=Q.start&&r.period<Q.end&&r.status!=="Rejected").sort((a,b)=>a.period<b.period?-1:1),lines=[];
  try{const got=await Promise.all(reps.map(r=>C.rpc("stravik_sales_report",{p_id:r.id}).then(must)));
    got.forEach((g,i)=>{((g&&g.lines)||[]).forEach(l=>lines.push(Object.assign({},l,{period:reps[i].period,status:reps[i].status})));});
  }catch(e){toast(msg(e));return;}
  lines.sort((a,b)=>String(a.date||a.period).localeCompare(String(b.date||b.period))||String(a.invoice||"").localeCompare(String(b.invoice||"")));
  const day=d=>{if(!d)return "";const x=new Date(String(d).slice(0,10));return isNaN(x)?String(d):x;};
  let run=0;
  xlsx([{name:"Summary",head:["",""],widths:[32,24],rows:[["Store",O.store],["Quarter",qName(Q.start)],["Quarterly target",T],["Product value so far",Number(v.toFixed(2))],["% of target",Number(pct.toFixed(1))],["Tier",reached?reached.name:"Not yet Bronze"],["Reward rate",reached?reached.rate:0],["Your reward so far",Number((reached?v*reached.rate:0).toFixed(2))],
      ["Bronze at",T*0.6],["Silver at",T],["Gold at",T*1.5],["Rewards for your Heroes",Number((B.heroes||[]).reduce((a,h)=>a+Number(h.share||0),0).toFixed(2))]]},
    {name:"Sales",head:["Invoice date","Invoice number","Part number","Quantity","Value excl. VAT","Salesperson","Month","Stravik PN","Description","Range","Hero","Your buy price","At your buy price","Report"],
      widths:[13,16,16,10,15,20,14,13,50,16,22,14,16,26],fmts:{1:"dd/mm/yyyy",5:"#,##0.00",12:"#,##0.00",13:"#,##0.00"},
      rows:lines.map(l=>[day(l.date),l.invoice||"",l.code||l.pn,Number(l.qty),l.value==null?"":Number(l.value),l.salesperson||"",monthName(l.period),l.pn,l.desc||"",l.range||"",l.staff||"Not linked to a Hero",Number(l.price||0),Number(l.credited||0),STAT[l.status]||l.status])},
    {name:"Months",head:["Month","Parts","Reported at your buy price","Product value","Quarter so far","% of target","Heroes' rewards","Report"],widths:[16,8,16,14,14,10,14,26],
      rows:(B.months||[]).map(m=>{run+=Number(m.value||0);return [monthName(m.period),Number(m.units),Number(m.reported),Number(m.value),Number(run.toFixed(2)),T?Number((run/T*100).toFixed(1)):"",Number(m.pool),STAT[m.status]||m.status];})},
    {name:"Ranges",head:["Range","Units","Product value"],widths:[24,10,16],rows:(B.ranges||[]).map(r=>[r.range,Number(r.units),Number(r.value)])},
    {name:"Parts",head:["Stravik PN","Description","Range","Units","Product value"],widths:[14,60,18,10,16],rows:(B.parts||[]).map(p=>[p.pn,p.desc||"",p.range||"",Number(p.units),Number(p.value)])},
    {name:"Heroes",head:["Hero","Parts","Product value","Reward"],widths:[28,10,16,12],rows:(B.heroes||[]).map(h=>[h.staff_id?names[h.staff_id]||"":"Not linked to a Hero",Number(h.units),Number(h.value),Number(h.share)])}],
    "Stravik_All_Star_"+O.store.replace(/[^A-Za-z0-9]+/g,"_")+"_"+qName(Q.start).replace(" ","_")+".xlsx");
}
function owner(email){
  siteMenu(true);
  document.title="Stravik All Star | "+O.store;
  app.innerHTML=head(O.store,"Stravik All Star: your store's reward, and your All Stars Heroes' rewards.","Stravik All Star").replace("</h1>","</h1><p><a class=\"btn line small\" href=\"/\">← Back to your products and prices</a></p>")+
  `<div class="wrap as-dash">
    ${storeCard()}
    ${heroesSection()}
    <div class="as-actions">
      <button type="button" class="as-act${O.panel==="report"?" on":""}" data-open="report"><b>Send your monthly sales report</b><span>By the 5th: last month's Stravik sales</span></button>
      <button type="button" class="as-act${O.panel==="heroes"?" on":""}" data-open="heroes"><b>Manage your Heroes</b><span>${num((O.staff||[]).filter(s=>s.active).length)} registered · add, new PIN, switch off</span></button>
      <button type="button" class="as-act${O.panel==="money"?" on":""}${toPay()?" warn":""}" data-open="money"><b>Statements and paying your Heroes</b><span>${toPay()?`${num(toPay())} ${toPay()===1?"Hero":"Heroes"} to pay`:"Credit notes, and your Heroes' payments"}</span></button>
    </div>
    <div id="aspanel"></div>
    <p class="dhint ab-foot">Signed in as ${esc(email)}. <a class="linkbtn" href="/">Your products and prices</a> · <button type="button" class="linkbtn" id="asout">Sign out</button></p>
  </div>`;
  app.querySelector("#asout").onclick=signOut;
  app.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{
    if((R.draft||(R.quick&&R.quick.dirty))&&!confirm("Leave this report without sending it?"))return;
    const p=b.dataset.open;O.panel=O.panel===p&&b.classList.contains("as-act")?null:p;R.draft=null;R.view=null;R.quick=null;owner(email);
    const el=app.querySelector("#aspanel");if(el&&O.panel)el.scrollIntoView({behavior:"smooth",block:"start"});});
  app.querySelector("#hzhow").onclick=()=>{O.how=!O.how;const br=app.querySelector(".hz-break"),b=app.querySelector("#hzhow");br.hidden=!O.how;b.textContent=O.how?"Hide the breakdown":"See how you got here";b.setAttribute("aria-expanded",O.how);if(O.how){countUp(br);br.querySelectorAll(".dn-seg,.mc-col").forEach(e=>{e.style.animation="none";void e.getBoundingClientRect();e.style.animation="";});}};
  app.querySelector("#hzxls").onclick=downloadBreakdown;
  const x2=app.querySelector("#hzxls2");if(x2)x2.onclick=downloadBreakdown;
  const al=app.querySelector("#hzall");if(al)al.onclick=()=>{O.allParts=!O.allParts;owner(email);const h=app.querySelector(".hz-top5");if(h)h.scrollIntoView({block:"nearest"});};
  app.querySelectorAll("[data-hzp]").forEach(b=>b.onclick=()=>{O.hzp=b.dataset.hzp;O.hzOpen=null;owner(email);});
  app.querySelectorAll("[data-hzhow]").forEach(b=>b.onclick=()=>{O.hzOpen=O.hzOpen===b.dataset.hzhow?null:b.dataset.hzhow;owner(email);});
  app.querySelectorAll("[data-hzpic]").forEach(b=>b.onclick=()=>{const id=b.dataset.hzpic;
    if(O.pics[id]&&confirm("Remove this photo? Press Cancel to choose a new one instead.")){removePhoto(id).then(async()=>{toast("Photo removed.");await refreshOwner();}).catch(e=>toast(msg(e)));return;}
    pickPhoto(id,()=>refreshOwner());});
  countUp(app);
  wireDonuts(app);
  panel();
}
function panel(){const P=app.querySelector("#aspanel");if(!P)return;if(O.panel==="report")paneReports();else if(O.panel==="heroes")paneHeroes();else if(O.panel==="money")paneMoney();else P.innerHTML="";}
// ---------------------------------------------------------------------------------------------------------------
// statements, credit notes and paying the Heroes (store owner)
// ---------------------------------------------------------------------------------------------------------------
const CNK={month:"Monthly statement",award:"Award",quarter:"Quarter"};
const CNS={Held:"Held",["To issue"]:"With DP World InSync",Issued:"Credit note issued",Used:"Set against an order",Expired:"Expired, not used"};
const cnPill=c=>`<span class="ab-pill ${c.status==="Held"||c.status==="Expired"?"bad":c.status==="To issue"?"":"ok"}">${esc(CNS[c.status]||c.status)}</span>`;
function paneMoney(){
  const P=app.querySelector("#aspanel"),M=R.money||{credit_notes:[],payouts:[],quarters:[]};
  const periods=Array.from(new Set(M.credit_notes.filter(c=>c.kind==="month").map(c=>c.period))).sort().reverse();
  const cnLine=c=>`<div class="mn-cn"><div class="mn-cnh"><b>${esc(CNK[c.kind]||c.kind)}</b>${cnPill(c)}<b class="mn-amt">${esc(rand(c.amount))}</b></div>
      <ul>${(c.lines||[]).map(l=>`<li><span>${esc(l.description||l.type)}</span><b>${esc(rand(l.amount))}</b></li>`).join("")}</ul>
      <p class="dhint">${c.status==="Held"?`Held: ${esc(c.hold_reason||"")}. It goes to DP World InSync as soon as this is sorted out.`:
        c.status==="To issue"?"Approved: DP World InSync issues the credit note and sets it against your next order.":
        c.status==="Issued"?`Credit note <b>${esc(c.cn_no)}</b> of ${esc(day(c.cn_date))}, set against your next order. Unused credit expires ${esc(day(c.expires_on))}.`:
        c.status==="Used"?`Credit note <b>${esc(c.cn_no)}</b> of ${esc(day(c.cn_date))}, set against ${esc(c.used_ref||"your order")} on ${esc(day(c.used_on))}.`:
        `Credit note <b>${esc(c.cn_no||"")}</b> expired on ${esc(day(c.expires_on))} without being used.`}</p></div>`;
  const month=p=>{
    const cns=M.credit_notes.filter(c=>c.period===p),pays=M.payouts.filter(x=>x.period===p),heroes=pays.filter(x=>x.staff_id),share=pays.find(x=>!x.staff_id);
    const total=pays.reduce((a,x)=>a+Number(x.calc||0),0),paid=heroes.reduce((a,x)=>a+Number(x.paid||0),0),due=pays[0]&&pays[0].due;
    const open=O.mnOpen===p,late=due&&new Date(due+"T23:59:59")<new Date()&&heroes.some(x=>!x.paid_at&&Number(x.calc)>0);
    return `<article class="mn-month as-card" data-p="${p}">
      <div class="mn-head"><h3>${esc(monthName(p))}</h3><span>${esc(rand(cns.reduce((a,c)=>a+Number(c.amount||0),0)))} credited to your store</span>
        <span class="ab-pill ${heroes.every(x=>x.confirmed_at||!Number(x.calc))&&heroes.length?"ok":late?"bad":""}">${heroes.length?(heroes.every(x=>x.confirmed_at||!Number(x.calc))?"Heroes paid and confirmed":heroes.every(x=>x.paid_at||!Number(x.calc))?"Paid, waiting for the Heroes to confirm":late?"Pay your Heroes: the 25th has passed":"Pay your Heroes by "+day(due)):""}</span>
        <button type="button" class="linkbtn" data-mn="${p}">${open?"Close":"Open"}</button></div>
      ${open?`<div class="mn-body">${cns.map(cnLine).join("")}
        <h4>Pay your Heroes</h4>
        <p class="dhint">Pay each Hero through your payroll by <b>${esc(day(due))}</b>, then mark it here. Each Hero confirms on their own page. While a payment is overdue or not confirmed, your next credit note waits.</p>
        <form class="mn-pay" data-p="${p}" novalidate><div class="ab-scroll"><table class="ab-table"><thead><tr><th>Hero</th><th class="n">Their reward</th><th class="n">You pay</th><th>Status</th></tr></thead><tbody>
          ${heroes.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td class="n">${esc(rand(x.calc))}</td><td class="n"><input class="mn-in" name="${x.staff_id}" inputmode="decimal" value="${x.paid!=null?Number(x.paid).toFixed(2):Number(x.calc).toFixed(2)}"></td>
            <td>${x.disputed_at?`<span class="ab-pill bad">Not received</span>${x.dispute_note?`<div class="ab-dim">“${esc(x.dispute_note)}”</div>`:""}`:x.confirmed_at?`<span class="ab-pill ok">Confirmed</span>`:x.paid_at?`<span class="ab-pill">Paid ${esc(day(x.paid_at))}, to confirm</span>`:`<span class="ab-dim">Not paid yet</span>`}</td></tr>`).join("")}
          ${share&&Number(share.calc)>0?`<tr class="mn-share"><td><b>To share as you choose</b><div class="ab-dim">${esc(String(share.name||"").replace(/^To share: /,""))}</div></td><td class="n">${esc(rand(share.calc))}</td><td class="n" colspan="2"><span class="ab-dim">Add it to the Heroes' amounts above</span></td></tr>`:""}
        </tbody></table></div>
        <p class="mn-tot">Total for your Heroes: <b>${esc(rand(total))}</b> · marked paid: <b>${esc(rand(paid))}</b></p>
        <div class="ab-row"><button class="btn gold" type="submit">Mark as paid</button><button type="button" class="btn line small" data-print="${p}">Print or save the statement</button></div></form></div>`:""}
    </article>`;};
  const qs=(M.quarters||[]).map(q=>`<div class="mn-q"><b>${esc(qName(q.quarter))}</b> ${q.tier?medal(q.tier.toLowerCase(),22,q.tier):""}<span>${esc(rand(q.value))} product value · ${esc(String(q.pct))}% of ${esc(rand0(q.target))}</span>
      <span>${Number(q.rebate)>0?`Owner rebate <b>${esc(rand(q.rebate))}</b>`:q.gate_note?`No owner rebate: ${esc(q.gate_note)}`:"No owner rebate"}${Number(q.award)>0?` · Store of the Quarter <b>${esc(rand(q.award))}</b> for your Heroes`:""}</span></div>`).join("");
  P.innerHTML=`<section class="as-panel"><h2 class="ab-h">Statements and paying your Heroes</h2>
    <p class="ab-lead">Each approved month becomes a statement: a credit note from DP World InSync, set against your next order, and the amounts you pay your Heroes through payroll. No cash is paid out.</p>
    ${R.money&&R.money.hold_reason?`<div class="dnote bad"><b>Your next credit note is on hold:</b> ${esc(R.money.hold_reason)}.</div>`:""}
    ${qs?`<h3 class="as-h3">Quarters</h3>${qs}`:""}
    ${periods.length?periods.map(month).join(""):`<div class="ab-empty"><h3>No statements yet</h3><p>Your first statement appears once Stravik has approved a monthly sales report.</p></div>`}</section>`;
  P.querySelectorAll("[data-mn]").forEach(b=>b.onclick=()=>{O.mnOpen=O.mnOpen===b.dataset.mn?null:b.dataset.mn;paneMoney();});
  P.querySelectorAll("form.mn-pay").forEach(f=>f.addEventListener("submit",async ev=>{ev.preventDefault();
    const rows=[...f.querySelectorAll(".mn-in")].map(i=>({staff_id:i.name,amount:Number(String(i.value).replace(/[^\d.]/g,""))}));
    if(rows.some(r=>!isFinite(r.amount))){toast("Check the amounts.");return;}
    if(!confirm("Mark these Heroes as paid for "+monthName(f.dataset.p)+"? Each one is asked to confirm."))return;
    const b=f.querySelector("button[type=submit]");b.disabled=true;
    try{must(await C.rpc("stravik_as_payout_mark",{p_period:f.dataset.p.slice(0,7),p_rows:rows}));R.money=must(await C.rpc("stravik_as_owner_statements"));toast("Marked as paid. Your Heroes are asked to confirm.");paneMoney();}
    catch(e){toast(msg(e));b.disabled=false;}}));
  P.querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>printStatement(b.dataset.print));
}
// a printable statement of one month (the browser's print dialog also saves it as a PDF)
function printStatement(p){
  const M=R.money,cns=M.credit_notes.filter(c=>c.period===p),pays=M.payouts.filter(x=>x.period===p);
  const w=window.open("","_blank");if(!w){toast("Allow pop-ups to print the statement.");return;}
  w.document.write(`<!doctype html><html><head><title>Stravik All Star statement ${esc(monthName(p))}</title><style>
    body{font:14px/1.45 Arial,sans-serif;color:#0b203d;margin:32px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 6px}
    table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #dde2e8;text-align:left}td.n,th.n{text-align:right}.muted{color:#4a5a70}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c99a1c;padding-bottom:10px}</style></head><body>
    <div class="top"><div><h1>Stravik All Star statement</h1><div class="muted">${esc(O.store)} · ${esc(monthName(p))}</div></div><div><b>STRAVIK</b><div class="muted">Own the road.</div></div></div>
    ${cns.map(c=>`<h2>${esc(CNK[c.kind]||c.kind)}: ${esc(CNS[c.status]||c.status)}${c.cn_no?", credit note "+esc(c.cn_no)+" of "+esc(day(c.cn_date)):""}</h2>
      <table>${(c.lines||[]).map(l=>`<tr><td>${esc(l.description||l.type)}</td><td class="n">${esc(rand(l.amount))}</td></tr>`).join("")}<tr><th>Total</th><th class="n">${esc(rand(c.amount))}</th></tr></table>`).join("")}
    <h2>Your All Stars Heroes</h2><table><tr><th>Hero</th><th class="n">Reward</th><th class="n">Paid</th><th>Status</th></tr>
      ${pays.map(x=>`<tr><td>${esc(x.staff_id?x.name:"To share as you choose")}</td><td class="n">${esc(rand(x.calc))}</td><td class="n">${x.paid!=null?esc(rand(x.paid)):""}</td><td>${x.staff_id?(x.confirmed_at?"Confirmed":x.disputed_at?"Not received":x.paid_at?"Paid "+esc(day(x.paid_at)):"Not paid yet"):""}</td></tr>`).join("")}</table>
    <p class="muted" style="margin-top:24px">Paid to the store as credit notes by DP World InSync and set against its next order; the store pays its Heroes through its payroll. Printed ${esc(day(new Date().toISOString()))}.</p>
    <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

async function refreshOwner(){await loadAll();owner(SD().state.me.email);}

// ---- the Heroes: add, edit, new PIN, switch off/on
function paneHeroes(){
  const P=app.querySelector("#aspanel"),S=O.staff||[];
  P.innerHTML=`<section class="as-panel"><h2 class="ab-h">Your All Stars Heroes</h2>
    <p class="ab-lead">Add each person who sells at your counter, with their own mobile number and a 6-digit PIN you give them in person. They sign in at stravikparts.com/allstar/ and see only their own rewards. "Name in sales report" is how the person appears in your POS, so their sales are matched to them.</p>
    ${S.length?`<div class="ab-scroll"><table class="ab-table"><thead><tr><th>Hero</th><th>Mobile</th><th>Name in sales report</th><th>Access</th><th>Last signed in</th><th></th></tr></thead><tbody>${S.map(s=>
      `<tr><td><b>${esc(s.name)}</b></td><td>${esc(showMobile(s.mobile))}</td><td>${esc(s.pos_name||"")}</td><td>${s.active?`<span class="ab-pill ok">On</span>`:`<span class="ab-pill">Off</span>`}</td><td>${s.last_login_at?esc(day(s.last_login_at)):`<span class="ab-dim">Not yet</span>`}</td>
       <td class="as-acts"><button type="button" class="linkbtn" data-edit="${s.id}">Edit</button><button type="button" class="linkbtn" data-pin="${s.id}">New PIN</button><button type="button" class="linkbtn" data-act="${s.id}" data-on="${s.active?"":"1"}">${s.active?"Switch off":"Switch on"}</button></td></tr>`+
      (O.edit&&O.edit.id===s.id?`<tr class="ab-od"><td colspan="6">${form(O.edit.mode,s)}</td></tr>`:"")).join("")}</tbody></table></div>`:""}
    <h2 class="ab-h">Add a Hero</h2>${form("add",null)}</section>`;
  wire(P);
}
function form(mode,s){
  const id=s?s.id:"new";
  if(mode==="pin")return `<form class="as-form" data-f="pin" data-id="${id}" novalidate><div class="is-fields"><label>New PIN for ${esc(s.name)}<input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="new-password"></label></div><p class="dhint">Give the new PIN to ${esc(first(s.name))} in person. Their old PIN stops working straight away.</p><div class="ab-row"><button class="btn gold" type="submit">Save PIN</button><button type="button" class="linkbtn" data-cancel>Cancel</button></div></form>`;
  return `<form class="as-form" data-f="${mode}" data-id="${id}" novalidate><div class="is-fields">
    <label>Name<input name="name" maxlength="80" value="${esc(s?s.name:"")}" autocomplete="off"></label>
    ${mode==="add"?`<label>Mobile number<input name="mobile" type="tel" inputmode="tel" placeholder="082 123 4567" autocomplete="off"></label>`:""}
    <label>Name in sales report (optional)<input name="pos_name" maxlength="80" value="${esc(s?s.pos_name||"":"")}" autocomplete="off"></label>
    ${mode==="add"?`<label>PIN<input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="new-password"></label>`:""}</div>
    <div class="ab-row"><button class="btn gold" type="submit">${mode==="add"?"Add Hero":"Save"}</button>${mode==="edit"?`<button type="button" class="linkbtn" data-cancel>Cancel</button>`:""}</div></form>`;
}
function wire(P){
  P.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{O.edit={id:b.dataset.edit,mode:"edit"};paneHeroes();});
  P.querySelectorAll("[data-pin]").forEach(b=>b.onclick=()=>{O.edit={id:b.dataset.pin,mode:"pin"};paneHeroes();const i=P.querySelector('[data-f="pin"] input');if(i)i.focus();});
  P.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{O.edit=null;paneHeroes();});
  P.querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{
    const s=O.staff.find(x=>x.id===b.dataset.act),on=!!b.dataset.on;
    if(!on&&!confirm("Switch off "+s.name+"? They can no longer sign in. Their past sales and rewards stay on record."))return;
    b.disabled=true;try{await call({action:"active",id:s.id,active:on});await refreshOwner();toast(s.name+(on?" can sign in again.":" is switched off."));}catch(e){toast(msg(e));b.disabled=false;}
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
    try{await call(body);O.edit=null;await refreshOwner();
      toast(mode==="add"?body.name+" is now an All Stars Hero and can sign in.":mode==="pin"?"New PIN saved.":"Saved.");}
    catch(e){toast(msg(e));btn.disabled=false;}
  }));
}

// ---------------------------------------------------------------------------------------------------------------
// the monthly sales report: export from the POS, upload, match codes once, send
// ---------------------------------------------------------------------------------------------------------------
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
  const P=app.querySelector("#aspanel"),S=R.setup;
  if(R.quick)return paneQuick();
  if(R.draft)return paneDraft();
  if(R.view)return paneView();
  const ps=periods();if(!R.period||ps.indexOf(R.period)<0)R.period=ps[0];
  const done=new Map(S.reports.map(r=>[r.period.slice(0,7),r]));
  const backs=S.reports.filter(r=>r.status==="Returned");
  P.innerHTML=`<section class="as-panel">${backs.map(r=>`<div class="dnote bad as-back"><b>${esc(monthName(r.period))} was sent back to you.</b> ${esc(r.return_note||"")} <button type="button" class="btn gold small" data-fix="${r.period.slice(0,7)}">Correct it</button></div>`).join("")}<h2 class="ab-h">Send your monthly sales report</h2>
    <p class="ab-lead">By the 5th, tell us how many Stravik parts you sold last month, and which Hero sold them.</p>
    <div class="as-up"><label>Month<select id="rper">${ps.map(p=>`<option value="${p}"${p===R.period?" selected":""}>${monthName(p)}${done.has(p)?" (sent)":""}</option>`).join("")}</select></label></div>
    <div class="qk-ways">
      <button type="button" class="qk-way main" id="rquick"><b>Enter your sales</b><span>We list the Stravik parts invoiced to your store. Type how many you sold. No file needed.</span><em>Easiest</em></button>
      <button type="button" class="qk-way" id="rup"><b>Upload your POS export</b><span>Export last month's sales from your POS and drop the file here (Excel or CSV). Your own codes are matched once and remembered.</span></button>
      <input type="file" id="rfile" accept=".xlsx,.csv,.txt" hidden>
    </div>
    <p class="dhint">Sending a month again replaces that month's report until it is approved. <button type="button" class="linkbtn" id="rtpl">Download an empty template</button></p>
    ${S.reports.length?`<h2 class="ab-h">Reports sent</h2><div class="ab-scroll"><table class="ab-table" id="rtab"><thead><tr><th>Month</th><th>Status</th><th class="n">Product value</th><th class="n">Heroes' rewards</th><th>Sent</th></tr></thead><tbody>${S.reports.map(r=>{const c=calcOf(r.id)||{};return `<tr class="ab-o" data-r="${r.id}" tabindex="0"><td class="no">${esc(monthName(r.period))}</td><td>${statPill(r)}${r.late?` <span class="ab-dim">late</span>`:""}</td><td class="n"><b>${esc(rand(c.value_checked))}</b></td><td class="n">${esc(rand(c.pool))}</td><td>${esc(day(r.submitted_at))}</td></tr>`;}).join("")}</tbody></table></div>`:""}
  </section>`;
  P.querySelector("#rper").onchange=e=>{R.period=e.target.value;};
  const file=P.querySelector("#rfile");P.querySelector("#rup").onclick=()=>{R.period=P.querySelector("#rper").value;if(locked(R.period))return;file.click();};
  file.onchange=async()=>{const f=file.files[0];file.value="";if(!f)return;
    try{toast("Reading "+f.name+"…");const {lines,cols}=parse(await readRows(f));if(!lines.length)throw new Error("No lines with a part number were found in the file.");
      R.draft={file:f.name,period:R.period,lines,cols,map:{},people:{}};paneDraft();}catch(e){toast(msg(e));}};
  P.querySelector("#rtpl").onclick=template;
  P.querySelectorAll("[data-fix]").forEach(b=>b.onclick=()=>{R.period=b.dataset.fix;openQuick(R.period);});
  P.querySelector("#rquick").onclick=()=>{R.period=P.querySelector("#rper").value;if(locked(R.period))return;openQuick(R.period);};
  // drop a file on the upload button
  const up=P.querySelector("#rup");
  up.addEventListener("dragover",e=>{e.preventDefault();up.classList.add("drag");});
  up.addEventListener("dragleave",()=>up.classList.remove("drag"));
  up.addEventListener("drop",async e=>{e.preventDefault();up.classList.remove("drag");const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;
    R.period=P.querySelector("#rper").value;if(locked(R.period))return;
    try{toast("Reading "+f.name+"…");const {lines,cols}=parse(await readRows(f));if(!lines.length)throw new Error("No lines with a part number were found in the file.");
      R.draft={file:f.name,period:R.period,lines,cols,map:{},people:{}};paneDraft();}catch(x){toast(msg(x));}});
  const tb=P.querySelector("#rtab");if(tb){const open=id=>openReport(id);tb.onclick=e=>{const tr=e.target.closest("tr[data-r]");if(tr)open(tr.dataset.r);};tb.onkeydown=e=>{if(e.key==="Enter"){const tr=e.target.closest("tr[data-r]");if(tr)open(tr.dataset.r);}};}
}
// ---- quick entry: the parts invoiced to the store, how many it sold, and which Hero sold them
async function openQuick(period){
  try{
    const q=must(await C.rpc("stravik_sales_quick",{p_period:period}));
    const rows=new Map();
    (q.lines||[]).forEach(l=>{const a=rows.get(l.pn)||[];a.push({staff:l.staff_id||"",qty:Number(l.qty)||0});rows.set(l.pn,a);});
    const parts=q.parts||[],known=new Set(parts.map(p=>p.pn));
    // parts in an earlier report of this month that are not invoiced (any more) stay on the list
    (q.lines||[]).forEach(l=>{if(!known.has(l.pn)){const sp=R.setup.parts.find(x=>x[0]===l.pn);parts.push({pn:l.pn,desc:sp?sp[2]:"",range:sp?sp[3]:"",invoiced:0,reported_before:0,available:0,price:sp?sp[1]:0,extra:true});known.add(l.pn);}});
    parts.forEach(p=>{if(!rows.has(p.pn))rows.set(p.pn,[{staff:"",qty:0}]);});
    R.quick={period,parts,rows,filter:"",dirty:false,sent:(R.setup.reports||[]).find(r=>r.period.slice(0,7)===period)};
    paneQuick();
  }catch(e){toast(msg(e));}
}
function qkTotals(){
  const Q=R.quick,price=new Map(Q.parts.map(p=>[p.pn,Number(p.price||0)]));let u=0,v=0;
  Q.rows.forEach((a,pn)=>a.forEach(x=>{u+=x.qty;v+=x.qty*(price.get(pn)||0);}));
  const A=R.calc||{},boost=A.first_delivery&&new Date(new Date(A.first_delivery).getTime()+60*864e5)>new Date(Q.period+"-01");
  return {u,v,pool:v*(boost?0.04:0.02),boost};
}
function qkBar(){
  const t=qkTotals(),el=app.querySelector("#qksave");if(!el)return;
  el.querySelector("span").innerHTML=t.u?`<b>${num(t.u)}</b> ${t.u===1?"part":"parts"} sold · <b>${esc(rand(t.v))}</b> product value · about <b>${esc(rand(t.pool))}</b> for your Heroes`:"Enter what you sold";
  el.querySelector("#qkgo").disabled=!t.u;
}
function qkWarn(pn){
  const Q=R.quick,p=Q.parts.find(x=>x.pn===pn),row=app.querySelector(`.qk-row[data-pn="${CSS.escape(pn)}"]`);if(!p||!row)return;
  const tot=Q.rows.get(pn).reduce((a,x)=>a+x.qty,0),w=row.querySelector(".qk-warn");
  row.classList.toggle("has",tot>0);
  w.textContent=tot>p.available?`More than was invoiced to your store: only ${num(p.available)} can count.`:"";
}
function paneQuick(){
  const P=app.querySelector("#aspanel"),Q=R.quick,heroes=(O.staff||[]).filter(s=>s.active);
  const f=Q.filter.trim().toLowerCase();
  const list=Q.parts.filter(p=>!f||(p.pn+" "+(p.desc||"")+" "+(p.range||"")).toLowerCase().indexOf(f)>=0);
  const opts=sel=>`<option value="">Who sold it?</option>${heroes.map(h=>`<option value="${h.id}"${h.id===sel?" selected":""}>${esc(h.name)}</option>`).join("")}`;
  P.innerHTML=`<section class="as-panel"><p><button type="button" class="linkbtn" id="qkback">← Back</button></p>
    <h2 class="ab-h">${esc(monthName(Q.period))}: what did you sell?</h2>
    <p class="ab-lead">These are the Stravik parts invoiced to your store. Enter how many you sold in ${esc(monthName(Q.period).split(" ")[0])} and who sold them.${Q.sent?` You sent this month on ${esc(day(Q.sent.submitted_at))}: your figures are filled in, and sending again replaces them.`:""}</p>
    ${Q.parts.length>8?`<label class="qk-find">Find a part<input id="qkf" type="search" value="${esc(Q.filter)}" placeholder="Part number or description"></label>`:""}
    ${Q.parts.length?`<div class="qk-list">${list.map(p=>{const a=Q.rows.get(p.pn),tot=a.reduce((x,y)=>x+y.qty,0);
      return `<div class="qk-row${tot>0?" has":""}" data-pn="${esc(p.pn)}">
        <div class="qk-part"><b>${esc(p.pn)}</b><span>${esc(p.desc||"")}</span><small>${p.extra?"Not invoiced to your store":`${num(p.available)} to report · ${esc(rand(p.price))} each`}</small></div>
        <div class="qk-splits">${a.map((x,i)=>`<div class="qk-split" data-i="${i}">
            <div class="qk-step"><button type="button" data-d="-1" aria-label="One less">−</button><input type="number" inputmode="numeric" min="0" step="1" value="${x.qty||""}" placeholder="0" aria-label="${esc(p.pn)} sold"><button type="button" data-d="1" aria-label="One more">+</button></div>
            ${heroes.length?`<select class="as-sel qk-hero" aria-label="Who sold it">${opts(x.staff)}</select>`:""}
            ${i>0?`<button type="button" class="linkbtn qk-del" aria-label="Remove this line">Remove</button>`:""}</div>`).join("")}
          ${heroes.length>1?`<button type="button" class="linkbtn qk-more">+ Another Hero sold some too</button>`:""}
          <p class="qk-warn" role="status"></p></div>
      </div>`;}).join("")}</div>`:
      `<div class="ab-empty"><h3>No Stravik parts invoiced to your store yet</h3><p>Once DP World InSync invoices your first order, its parts appear here.</p></div>`}
    <p><button type="button" class="linkbtn" id="qkadd">+ Add a part that is not on this list</button></p>
    <div class="ab-save" id="qksave"><span></span><button type="button" class="btn gold" id="qkgo" disabled>Send ${esc(monthName(Q.period))}</button></div>
  </section>`;
  const fi=P.querySelector("#qkf");if(fi)fi.oninput=e=>{Q.filter=e.target.value;const pos=e.target.selectionStart;paneQuick();const n=app.querySelector("#qkf");n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}};
  P.querySelector("#qkback").onclick=()=>{if(Q.dirty&&!confirm("Leave without sending?"))return;R.quick=null;paneReports();};
  P.querySelectorAll(".qk-row").forEach(row=>{
    const pn=row.dataset.pn,a=Q.rows.get(pn);
    row.querySelectorAll(".qk-split").forEach(sp=>{
      const i=+sp.dataset.i,inp=sp.querySelector("input");
      const set=v=>{a[i].qty=Math.max(0,Math.round(Number(v)||0));inp.value=a[i].qty||"";Q.dirty=true;qkWarn(pn);qkBar();};
      sp.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>set((a[i].qty||0)+Number(b.dataset.d)));
      inp.oninput=()=>set(inp.value);
      const hs=sp.querySelector(".qk-hero");if(hs)hs.onchange=()=>{a[i].staff=hs.value;Q.dirty=true;};
      const del=sp.querySelector(".qk-del");if(del)del.onclick=()=>{a.splice(i,1);Q.dirty=true;paneQuick();};
    });
    const more=row.querySelector(".qk-more");if(more)more.onclick=()=>{a.push({staff:"",qty:0});paneQuick();const r2=app.querySelector(`.qk-row[data-pn="${CSS.escape(pn)}"] .qk-split:last-of-type input`);if(r2)r2.focus();};
    qkWarn(pn);
  });
  P.querySelector("#qkadd").onclick=()=>{
    const have=new Set(Q.parts.map(p=>p.pn)),free=R.setup.parts.filter(p=>!have.has(p[0]));
    const box=document.createElement("div");box.className="qk-addbox";
    box.innerHTML=`<label>Part<select class="as-sel"><option value="">Choose a Stravik part…</option>${free.map(p=>`<option value="${esc(p[0])}">${esc(p[0]+" – "+(p[2]||"").slice(0,70))}</option>`).join("")}</select></label><p class="dhint">Only parts invoiced to your store count for rewards.</p>`;
    P.querySelector("#qkadd").replaceWith(box);
    box.querySelector("select").onchange=e=>{const sp=R.setup.parts.find(x=>x[0]===e.target.value);if(!sp)return;
      Q.parts.push({pn:sp[0],desc:sp[2],range:sp[3],invoiced:0,reported_before:0,available:0,price:sp[1],extra:true});Q.rows.set(sp[0],[{staff:"",qty:1}]);Q.dirty=true;paneQuick();};
  };
  P.querySelector("#qkgo").onclick=sendQuick;
  qkBar();
}
async function sendQuick(){
  const Q=R.quick,btn=app.querySelector("#qkgo"),heroes=new Map((O.staff||[]).map(h=>[h.id,h.name]));
  // the sale date: the last day of the month (today, for the month we are in)
  const e=new Date(+Q.period.slice(0,4),+Q.period.slice(5,7),0),t=new Date(),d=e>t?t:e;
  const date=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const lines=[];Q.rows.forEach((a,pn)=>a.forEach(x=>{if(x.qty>0)lines.push({invoice_date:date,invoice_no:"",code:pn,pn,qty:x.qty,value:"",salesperson:x.staff?heroes.get(x.staff)||"":"",staff_id:x.staff||null});}));
  if(!lines.length){toast("Enter at least one part you sold.");return;}
  btn.disabled=true;btn.textContent="Sending…";
  try{const r=must(await C.rpc("stravik_sales_submit",{p:{period:Q.period,file_name:"Entered on the portal",lines}}));
    notify("allstar-report",r.id);
    R.quick=null;await refreshOwner();
    toast(`${monthName(Q.period)} sent.${r.replaced?" It replaces the report sent before.":""}${r.late?" It was sent after the 5th.":""} Your rewards are updated.`);
  }catch(x){toast(msg(x));btn.disabled=false;btn.textContent="Send "+monthName(Q.period);}
}
// the uploaded file before it is sent: codes and salespeople to match, problems, product value
function paneDraft(){
  const P=app.querySelector("#aspanel"),D=R.draft,S=R.setup,price=new Map(S.parts.map(p=>[p[0],p[1]]));
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
  P.innerHTML=`<section class="as-panel"><h2 class="ab-h">${esc(monthName(D.period))}: check and send</h2>
    <p class="ab-lead"><b>${esc(D.file)}</b>: ${num(stravik)} Stravik ${stravik===1?"line":"lines"}${other?`, ${num(other)} other ${other===1?"line":"lines"} left out`:""}.</p>
    ${unk.size?`<h3 class="as-h3">Which Stravik part is each of your codes? (${unk.size})</h3><p class="dhint">Choose once; it is remembered for your next reports.</p>
      <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Your code</th><th class="n">Units</th><th>Stravik part</th></tr></thead><tbody>${Array.from(unk).map(([c,u])=>
        `<tr><td class="no">${esc(c)}</td><td class="n">${num(u.q)}</td><td><select class="as-sel" data-code="${esc(c)}"><option value="">Choose…</option><option value="-">Not a Stravik part</option>${opts}</select></td></tr>`).join("")}</tbody></table></div>`:""}
    ${pun.size?`<h3 class="as-h3">Which Hero is each salesperson? (${pun.size})</h3><p class="dhint">Choose once; it is remembered. "Not a Hero" keeps the sales for the store.</p>
      <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Name in the report</th><th class="n">Lines</th><th>Hero</th></tr></thead><tbody>${Array.from(pun).map(([k,u])=>
        `<tr><td><b>${esc(u.name)}</b></td><td class="n">${num(u.n)}</td><td><select class="as-sel" data-person="${esc(k)}"><option value="">Choose…</option><option value="-">Not a Hero</option>${(O.staff||[]).filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`:""}
    ${probs.length?`<div class="dnote bad"><b>Fix these lines in the file and upload it again:</b> ${esc(probs.slice(0,10).join("; "))}${probs.length>10?" and "+(probs.length-10)+" more":""}.</div>`:""}
    ${outside?`<div class="dnote">${num(outside)} ${outside===1?"line has an invoice date":"lines have invoice dates"} outside ${esc(monthName(D.period))}. Check you chose the right month.</div>`:""}
    <div class="ab-save" id="rsave"><span>${ready?`${num(units)} parts · ${esc(rand(val))} product value`:`Answer the questions above to send the report`}</span><button type="button" class="btn gold" id="rgo"${ready?"":" disabled"}>Send ${esc(monthName(D.period))}</button><button type="button" class="linkbtn" id="rcancel">Cancel</button></div></section>`;
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
    notify("allstar-report",r.id);
    R.draft=null;await refreshOwner();
    toast(`${monthName(D.period)} sent.${r.replaced?" It replaces the report sent before.":""}${r.late?" It was sent after the 5th.":""} Your rewards are updated.`);
  }catch(e){toast(msg(e));btn.disabled=false;btn.textContent="Send "+monthName(D.period);}
}
async function openReport(id){
  try{R.view=must(await C.rpc("stravik_sales_report",{p_id:Number(id)}));paneView();}catch(e){toast(msg(e));}
}
// one report: product value and the Heroes' rewards, then the parts
function paneView(){
  const P=app.querySelector("#aspanel"),V=R.view,r=V.report,L=V.lines,c=calcOf(r.id)||{people:[]};
  const parts=new Map();L.forEach(l=>{let x=parts.get(l.pn);if(!x)parts.set(l.pn,x={pn:l.pn,d:l.desc,u:0,v:0});x.u+=l.qty;x.v+=Number(l.credited||0);});
  P.innerHTML=`<section class="as-panel"><p><button type="button" class="linkbtn" id="rback">← All reports</button></p>
    <h2 class="ab-h">${esc(monthName(r.period))} ${statPill(r)}</h2>
    <p class="ab-lead">Product value <b>${esc(rand(c.value_checked))}</b> · rewards for your Heroes <b>${esc(rand(c.pool))}</b> (${c.booster?"4% launch booster":"2%"}).${Number(c.not_covered||0)>0.004?` <span class="ab-dim">${esc(rand(c.not_covered))} of what you reported is more than was invoiced to your store, so it does not count.</span>`:""}</p>
    <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Hero</th><th class="n">Parts</th><th class="n">Product value</th><th class="n">Reward</th></tr></thead><tbody>${(c.people||[]).map(p=>`<tr><td>${p.name?`<b>${esc(p.name)}</b>`:`<span class="ab-dim">Not linked to a Hero</span>`}</td><td class="n">${num(p.units)}</td><td class="n">${esc(rand(p.value))}</td><td class="n"><b>${esc(rand(p.share))}</b></td></tr>`).join("")}</tbody></table></div>
    <h3 class="as-h3">Parts reported</h3><div class="ab-scroll"><table class="ab-table"><thead><tr><th>Part</th><th class="n">Units</th><th class="n">At your buy price</th></tr></thead><tbody>${Array.from(parts.values()).sort((a,b)=>b.v-a.v).map(x=>`<tr><td><b>${esc(x.pn)}</b> <span class="ab-dim">${esc(x.d||"")}</span></td><td class="n">${num(x.u)}</td><td class="n">${esc(rand(x.v))}</td></tr>`).join("")}</tbody></table></div>
    ${(()=>{const rs=sentOf(r.period.slice(0,7))||{};
      if(r.status==="Returned")return `<div class="dnote bad"><b>Sent back to you.</b> ${esc(rs.return_note||"")}</div>`;
      if(r.status==="Rejected")return `<div class="dnote bad"><b>Not accepted.</b> ${esc(rs.reject_note||"")}</div>`;
      if(r.status==="Approved")return `<p class="dhint">This month is approved and final. If something was wrong, put the correction in your next monthly report.</p>`;
      if(rs.editable)return `<p class="dhint">You can change this report until the 5th, as long as it has not been checked yet.</p>`;
      return `<p class="dhint">${r.status==="Checked"?"This report has been checked and is waiting for approval.":"The 5th has passed, so this report is locked."} ${rs.correction_request?`You asked for a correction: “${esc(rs.correction_request)}”.`:"If something is wrong, ask for a correction."}</p>`;})()}
    <div class="ab-row as-ract">${(()=>{const rs=sentOf(r.period.slice(0,7))||{};
      return (rs.editable?`<button type="button" class="btn gold" id="redit">${r.status==="Returned"?"Correct this report":"Edit this report"}</button>`:r.status==="Submitted"||r.status==="Checked"?`<button type="button" class="btn line" id="rask">Ask for a correction</button>`:"");})()}
      <button type="button" class="btn line small" id="rxls">Download the lines</button></div>
    <div id="raskbox"></div></section>`;
  P.querySelector("#rback").onclick=()=>{R.view=null;paneReports();};
  const ed=P.querySelector("#redit");if(ed)ed.onclick=()=>{R.view=null;R.period=r.period.slice(0,7);openQuick(R.period);};
  const ak=P.querySelector("#rask");if(ak)ak.onclick=()=>{
    const box=P.querySelector("#raskbox");
    box.innerHTML=`<form class="as-form" id="raskf" novalidate><div class="is-fields"><label class="wide">What needs to change?<textarea name="note" rows="3" maxlength="1000" placeholder="For example: 2 of the ignition coils were sold by Nadia, not Sipho"></textarea></label></div><p class="dhint">Your Stravik sales manager reads this. If they agree, the report is sent back to you to change.</p><div class="ab-row"><button class="btn gold" type="submit">Send</button><button type="button" class="linkbtn" id="raskx">Cancel</button></div></form>`;
    box.querySelector("textarea").focus();box.querySelector("#raskx").onclick=()=>{box.innerHTML="";};
    box.querySelector("#raskf").addEventListener("submit",async ev=>{ev.preventDefault();const note=box.querySelector("textarea").value.trim();if(!note){toast("Say what needs to change.");return;}
      const b=box.querySelector("button[type=submit]");b.disabled=true;
      try{must(await C.rpc("stravik_sales_correction",{p_id:r.id,p_note:note}));notify("allstar-correction",r.id);await loadAll();toast("Sent. Your Stravik sales manager will look at it.");paneView();}catch(e){toast(msg(e));b.disabled=false;}});
  };
  P.querySelector("#rxls").onclick=()=>xlsx([{name:"Lines",head:["Invoice date","Invoice","Your code","Stravik PN","Description","Quantity","Value in your POS","Salesperson","Hero","Your buy price","At your buy price"],
    widths:[12,14,14,12,46,9,14,18,20,12,16],rows:L.map(l=>[l.date||"",l.invoice||"",l.code,l.pn,l.desc||"",l.qty,l.value==null?"":Number(l.value),l.salesperson||"",l.staff||"",Number(l.price||0),Number(l.credited||0)])}],
    "Stravik_sales_report_"+r.period.slice(0,7)+".xlsx");
}
async function xlsx(sheets,name){
  try{const X=await excel(),wb=new X.Workbook();
    sheets.forEach(sh=>{const ws=wb.addWorksheet(sh.name);ws.addRow(sh.head).font={bold:true};sh.rows.forEach(r=>ws.addRow(r));(sh.widths||[]).forEach((w,i)=>{ws.getColumn(i+1).width=w;});Object.keys(sh.fmts||{}).forEach(i=>{ws.getColumn(+i).numFmt=sh.fmts[i];});ws.views=[{state:"frozen",ySplit:1}];});
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){toast(msg(e));}
}
function template(){
  const S=R.setup;
  xlsx([{name:"Sales",head:["Invoice date","Invoice number","Part number","Quantity","Value excl. VAT","Salesperson"],widths:[14,16,16,10,16,22],rows:[]},
    {name:"Your Stravik parts",head:["Stravik PN","Description","Range","Your buy price excl. VAT"],widths:[14,60,16,16],rows:S.parts.map(p=>[p[0],p[2]||"",p[3]||"",Number(p[1])])},
    {name:"Your Heroes",head:["Name","Name in sales report"],widths:[28,28],rows:(O.staff||[]).filter(s=>s.active).map(s=>[s.name,s.pos_name||""])}],"Stravik_All_Star_sales_template.xlsx");
}

// ---------------------------------------------------------------------------------------------------------------
async function start(){
  app.innerHTML=head("All Star","Loading…")+`<div class="wrap ab-note"></div>`;
  try{C=await SD().client();}catch(e){app.querySelector(".ab-note").innerHTML=`<p class="dnote bad">${esc(msg(e))}. Check your connection and reload the page.</p>`;return;}
  const {data:{session}}=await C.auth.getSession();
  if(!session)return signIn();
  try{
    const cm=must(await C.rpc("stravik_counter_me"));
    if(cm)return hero(cm);
    const me=await SD().refresh();if(!me)return signIn();
    const d=me.dealer;
    if(d&&d.status==="Approved"&&d.account_type!=="head_office"){
      const st=must(await C.rpc("stravik_my_staff"));
      if(st){await loadAll();return owner(me.email);}
      return note(d.trading_name||d.company_name,"All Star is for the stores of a group taking part in the programme, such as Autobarn. Your store is not part of it yet. Please contact your Stravik sales manager.");
    }
    if(d&&d.account_type==="head_office")return note(d.trading_name||d.company_name,`All Star is run by each store. Your stores' progress is on the All Star tab of your <a href="/autobarn/#allstar">head office dashboard</a>.`);
    if(me.partner&&!me.staff){location.href="/insync/";return;}
    if(me.staff)return note("All Star",`You are signed in as <b>${esc(me.email)}</b>, a staff account. All Star is managed in the <a href="/admin/">admin site</a>.`);
    return note("All Star",`You are signed in as <b>${esc(me.email)}</b>, which is not part of All Star.`);
  }catch(e){note("All Star",esc(msg(e)));}
}
start();
})();
