(function(){
const EMAIL="info@zenterparts.com";
// Web3Forms access key. Requests go to the inbox this key was created with.
// To deliver to info@zenterparts.com, create a key at web3forms.com with that address and paste it here.
const W3F_KEY="625d53c9-b1e1-4e32-bccb-050ddf714eac";
const slug=s=>s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// flatten
const ALL=[];
CATALOG.forEach(c=>c.types.forEach(t=>{t.id=slug(t.name);t.subs=t.subs.map(s=>{const o={name:s[0],icon:s[1],desc:s[2],when:s[3],isNew:!!s[4],special:s[5]||null,id:slug(s[0]),type:t,cat:c};ALL.push(o);return o;});}));
const byId=id=>ALL.find(p=>p.id===id);
const app=document.getElementById("app");
const {Cart,cartPaint,toast,clampQty,ddSet,ddBtn,nav,menuBtn}=window.STV;
const card=p=>`<a class="card" href="#/product/${p.id}"><span class="ic">${icon(p.icon)}</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p></a>`;

const ARROW=d=>`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d?"M6 3l5 5-5 5":"M10 3L5 8l5 5"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const sliderCtl=()=>`<div class="sl-ctl"><button type="button" class="sl-arrow sl-prev" aria-label="Previous slide">${ARROW(0)}</button><div class="sl-dots"></div><button type="button" class="sl-arrow sl-next" aria-label="Next slide">${ARROW(1)}</button></div>`;
function initSlider(root,ms){
  if(!root)return;
  const slides=[...root.querySelectorAll(".slide")],dots=root.querySelector(".sl-dots");let i=0,t=null;
  dots.innerHTML=slides.map((_,k)=>`<button type="button" aria-label="Show slide ${k+1}"></button>`).join("");
  const db=[...dots.children];
  const show=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,k)=>{const on=k===i;s.classList.toggle("on",on);s.setAttribute("aria-hidden",on?"false":"true");s.inert=!on;});db.forEach((d,k)=>d.setAttribute("aria-current",k===i?"true":"false"));};
  const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stop=()=>{clearInterval(t);t=null;};
  const start=()=>{if(still||t||slides.length<2)return;t=setInterval(()=>{if(!document.body.contains(root)){stop();return;}show(i+1);},ms);};
  const go=n=>{show(n);stop();start();};
  root.querySelector(".sl-prev").addEventListener("click",()=>go(i-1));
  root.querySelector(".sl-next").addEventListener("click",()=>go(i+1));
  db.forEach((d,k)=>d.addEventListener("click",()=>go(k)));
  root.addEventListener("mouseenter",stop);root.addEventListener("mouseleave",start);
  root.addEventListener("focusin",stop);root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget))start();});
  let x0=null;
  root.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
  root.addEventListener("touchend",e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>45)go(i+(dx<0?1:-1));});
  show(0);start();
}

// ---------- shared: part addresses, years, forms ----------
const partUrl=pn=>"/part/"+encodeURIComponent(pn)+"/";
const filterUrl=pn=>"/filter/"+encodeURIComponent(pn)+"/";
function yearIn(range,y){
  if(!y)return true;const r=String(range||""),n=(r.match(/\d{4}/g)||[]).map(Number);
  if(!n.length)return true;
  if(n.length>=2)return y>=n[0]&&y<=n[1];
  if(/^\s*\d{4}\s*[–-]\s*$/.test(r))return y>=n[0];
  if(/^\s*[–-]\s*\d{4}/.test(r))return y<=n[0];
  return y===n[0];
}
const lc=s=>String(s||"").toLowerCase();
async function w3fSend(fields,subject,replyto){
  const r=await fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify(Object.assign({access_key:W3F_KEY,subject,from_name:"Stravik website",replyto},fields))});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.success)throw new Error(j.message||("Status "+r.status));
}
// generic trade form: fields = [[id,label,type,{required,options,placeholder,full,value}]]
function tradeForm(fields,btnText){
  return `<form class="enq" novalidate>${fields.map(([id,label,type,o])=>{o=o||{};
    const req=o.required?" required":"",ph=o.placeholder?` placeholder="${esc(o.placeholder)}"`:"",val=o.value?` value="${esc(o.value)}"`:"";
    const ctl=type==="select"?`<select id="${id}">${o.options.map(x=>`<option${x===o.value?" selected":""}>${esc(x)}</option>`).join("")}</select>`:
      type==="textarea"?`<textarea id="${id}"${req}${ph}>${esc(o.value||"")}</textarea>`:
      `<input id="${id}" type="${type}"${req}${ph}${val}${o.auto?` autocomplete="${o.auto}"`:""}>`;
    return `<div${o.full?' class="full"':""}><label for="${id}">${esc(label)}${o.required?"":` <span class="opt">(optional)</span>`}</label>${ctl}${o.required?`<div class="err">${esc(o.err||"Fill in this field.")}</div>`:""}</div>`;}).join("")}
    <input type="checkbox" id="botcheck" tabindex="-1" autocomplete="off" style="display:none">
    <div class="full" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><button class="btn gold" type="submit">${esc(btnText)}</button><span class="note">We reply by email.</span></div>
    <div class="full ready" role="status"></div></form>`;
}
function wireTradeForm(form,fields,subjectFn,okHtml){
  const btn=form.querySelector("button[type=submit]"),ready=form.querySelector(".ready"),label=btn.textContent;
  form.addEventListener("submit",async ev=>{ev.preventDefault();let ok=true;
    fields.filter(f=>f[3]&&f[3].required).forEach(([id])=>{const el=form.querySelector("#"+id);const bad=!el.value.trim()||(el.type==="email"&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));el.classList.toggle("invalid",bad);if(bad&&ok){el.focus();ok=false;}});
    if(!ok)return;
    const data={};fields.forEach(([id,label])=>{data[label]=form.querySelector("#"+id).value.trim();});
    const subject=subjectFn(data);const email=form.querySelector("input[type=email]").value.trim();
    btn.disabled=true;btn.textContent="Sending…";ready.classList.remove("show");
    try{await w3fSend(Object.assign({botcheck:form.querySelector("#botcheck").checked},data),subject,email);
      form.querySelectorAll("input:not([type=checkbox]),textarea").forEach(el=>el.value="");ready.innerHTML=okHtml;}
    catch(err){const body=Object.entries(data).map(([k,v])=>k+": "+v).join("\n");
      ready.innerHTML=`<b>Your message wasn't sent.</b> Check your connection and try again, or <a href="mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">email it to ${EMAIL}</a> instead.<br><small style="color:var(--muted)">Details: ${esc(err.message||"Could not reach the form service")}</small>`;}
    finally{btn.disabled=false;btn.textContent=label;ready.classList.add("show");}
  });
}
const COUNTRY_HINT="e.g. United Arab Emirates";
const YEARS=(()=>{const a=[],y=new Date().getFullYear()+1;for(let i=y;i>=1980;i--)a.push(i);return a;})();

// ---------- vehicle index (built from both catalogues) ----------
let VIX=null;
function vehicleIndex(){
  return VIX||(VIX=Promise.all([loadSS(),loadFilters()]).then(([ss,fl])=>{
    const makes=new Map();const add=(label,model)=>{const k=label.toUpperCase();if(!makes.has(k))makes.set(k,{label,models:new Set()});if(model)makes.get(k).models.add(model);};
    ss.items.forEach(i=>i.apps.forEach(a=>{const m=ss.makes[a.mk];if(m&&!/other makes/i.test(m.label))add(m.label,ssCase(a.veh).replace(/^\s+|\s+$/g,""));}));
    fl.items.forEach(i=>(i.mk||[]).forEach(mk=>{(i.mo||"").split(/[;,]/).map(x=>x.trim()).filter(Boolean).forEach(mo=>add(mk,mo));if(!i.mo)add(mk);}));
    const list=[...makes.values()].sort((a,b)=>a.label.localeCompare(b.label));
    return {ss,fl,makes:list};
  }).catch(e=>{VIX=null;throw e;}));
}
// a make label matches a catalogue make if equal, or one is part of a "A / B" group label
const mkHit=(want,have)=>{const w=lc(want),h=lc(have);return w===h||h.split(" / ").includes(w)||w.split(" / ").includes(h);};
function vehicleMatch(ix,mk,mo,yr){
  const m=lc(mo).replace(/\s+/g," ").trim(),y=parseInt(yr,10)||0;
  const ss=ix.ss.items.filter(i=>i.apps.some(a=>{const M=ix.ss.makes[a.mk];return M&&mkHit(mk,M.label)&&(!m||lc(a.veh+" "+a.mc).includes(m))&&yearIn(a.yr,y);}));
  const fl=ix.fl.items.filter(i=>(i.mk||[]).some(x=>mkHit(mk,x))&&(!m||lc(i.mo).includes(m))&&yearIn(i.y,y));
  return {ss,fl};
}

// ---------- universal number search ----------
function numScore(c,vals){let best=0,hit="";vals.forEach(v=>{const k=fclean(v);if(!k)return;const s=k===c?3:k.startsWith(c)?2:(c.length>=4&&k.includes(c))?1:0;if(s>best){best=s;hit=v;}});return [best,hit];}
function searchAll(q){
  return Promise.all([loadSS(),loadFilters()]).then(([ss,fl])=>{
    const c=fclean(q),num=c.length>=3&&/\d/.test(q);let mode="text",S=[],F=[];
    if(num){
      ss.items.forEach(i=>{const f=[["Stravik number",[i.pn]],["CTR number",[i.ctr]],["Old CTR number",i.old],["OE number",i.oe]];let b=[0,"",""];f.forEach(([lab,v])=>{const r=numScore(c,v);if(r[0]>b[0])b=[r[0],r[1],lab];});if(b[0])S.push({i,score:b[0],on:b[2]+" "+b[1]});});
      fl.items.forEach(i=>{const f=[["Stravik number",[i.pn]],["OE / cross-reference",i.n||[]]];let b=[0,"",""];f.forEach(([lab,v])=>{const r=numScore(c,v);if(r[0]>b[0])b=[r[0],r[1],lab];});if(b[0])F.push({i,score:b[0],on:b[2]+" "+b[1]});});
      if(S.length||F.length)mode="number";
    }
    if(mode==="text"){S=ss.items.filter(i=>ssmatch(i,q)).map(i=>({i,score:0}));F=fl.items.filter(i=>fmatch(i,q)).map(i=>({i,score:0}));}
    S.sort((a,b)=>b.score-a.score);F.sort((a,b)=>b.score-a.score);
    const words=lc(q).split(/\s+/).filter(w=>w.length>2);
    const P=words.length?ALL.filter(p=>words.every(w=>lc(p.name+" "+p.type.name+" "+p.cat.name+" "+p.desc).includes(w))):[];
    return {ss,fl,S,F,P,mode};
  });
}

// ---------- results tables ----------
function ssResults(d,list,q,max){
  if(!list.length)return "";const shown=list.slice(0,max);
  return `<div class="rgroup"><h2>Steering &amp; suspension <span>${list.length.toLocaleString("en-US")} ${list.length===1?"part":"parts"}</span></h2>
  <div class="ftable-wrap"><table class="ftable ss"><thead><tr><th>Stravik no.</th><th>Part</th><th>CTR no.</th><th>Fits</th><th>OE numbers</th><th><span class="sr">Cart</span></th></tr></thead><tbody>${shown.map(x=>ssrow(d,x.i,q,-1)).join("")}</tbody></table></div>
  ${list.length>max?`<p class="rmore"><a class="btn line" href="#/steering?q=${encodeURIComponent(q)}">See all ${list.length.toLocaleString("en-US")} in the steering &amp; suspension catalogue</a></p>`:""}</div>`;
}
function flResults(d,list,q,max){
  if(!list.length)return "";const shown=list.slice(0,max);
  return `<div class="rgroup"><h2>Filters <span>${list.length} ${list.length===1?"filter":"filters"}</span></h2>
  <div class="ftable-wrap"><table class="ftable"><thead><tr><th>Stravik no.</th><th>Filter</th><th>Fits</th><th>OE / ref. numbers</th><th><span class="sr">Cart</span></th></tr></thead><tbody>${shown.map(x=>frow(d,x.i,q)).join("")}</tbody></table></div>
  ${list.length>max?`<p class="rmore"><a class="btn line" href="#/filters?q=${encodeURIComponent(q)}">See all ${list.length} in the filter catalogue</a></p>`:""}</div>`;
}
const cantFind=(q,veh)=>`<aside class="cantfind"><div><h3>Can't find your part?</h3><p>Send us the vehicle, the OE number or a photo reference and we'll check it for you. Every request also tells us which parts to add to the range.</p></div><a class="btn gold" href="#/request${q||veh?"?"+new URLSearchParams(Object.assign(q?{q}:{},veh?{veh}:{})).toString():""}">Request a part</a></aside>`;

// ---------- search panel (home and Find a part) ----------
function searchPanel(id,params){
  const by=params&&params.get("by")==="vehicle"?"vehicle":"number";
  return `<div class="spanel" data-spanel>
    <div class="stabs" role="tablist"><button type="button" role="tab" data-tab="number" aria-selected="${by==="number"}">Part or OE number</button><button type="button" role="tab" data-tab="vehicle" aria-selected="${by==="vehicle"}">Vehicle</button></div>
    <form class="sp-num" role="search" ${by==="vehicle"?"hidden":""}><label class="sr" for="${id}-q">Stravik, OE or competitor number, or vehicle</label>
      <div class="field"><input id="${id}-q" type="search" autocomplete="off" placeholder="Stravik, OE or competitor number, or vehicle" value="${esc((params&&params.get("q"))||"")}"><button type="submit">Search</button></div>
      <small>For example <a href="#/find?q=45046-09090">45046-09090</a>, <a href="#/find?q=CET-103">CET-103</a>, <a href="#/find?q=17801-0L040">17801-0L040</a> or <a href="#/find?q=hilux%20tie%20rod">Hilux tie rod</a></small></form>
    <form class="sp-veh" ${by==="vehicle"?"":"hidden"}>
      <div class="vgrid"><div><label for="${id}-mk">Make</label><select id="${id}-mk"><option value="">Loading makes…</option></select></div>
      <div><label for="${id}-mo">Model</label><input id="${id}-mo" list="${id}-mol" autocomplete="off" placeholder="e.g. Hilux"><datalist id="${id}-mol"></datalist></div>
      <div><label for="${id}-yr">Year</label><select id="${id}-yr"><option value="">Any year</option>${YEARS.map(y=>`<option>${y}</option>`).join("")}</select></div>
      <div class="vgo"><button class="btn gold" type="submit">Find parts</button></div></div></form>
  </div>`;
}
function wireSearchPanel(root,params){
  const num=root.querySelector(".sp-num"),veh=root.querySelector(".sp-veh");
  const tabs=[...root.querySelectorAll("[data-tab]")];let loaded=false;
  const loadMakes=()=>{if(loaded)return;loaded=true;vehicleIndex().then(ix=>{
    const mk=veh.querySelector("select"),want=params&&params.get("mk");
    mk.innerHTML=`<option value="">Choose a make</option>`+ix.makes.map(m=>`<option${want&&lc(want)===lc(m.label)?" selected":""}>${esc(m.label)}</option>`).join("");
    const fill=()=>{const m=ix.makes.find(x=>x.label===mk.value);veh.querySelector("datalist").innerHTML=m?[...m.models].sort().slice(0,400).map(x=>`<option value="${esc(x)}">`).join(""):"";};
    mk.addEventListener("change",()=>{veh.querySelector("input").value="";fill();});fill();
    if(params&&params.get("mo"))veh.querySelector("input").value=params.get("mo");
    if(params&&params.get("yr"))veh.querySelectorAll("select")[1].value=params.get("yr");
  }).catch(()=>{veh.querySelector("select").innerHTML=`<option value="">Couldn't load makes, refresh to try again</option>`;});};
  const show=t=>{tabs.forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));num.hidden=t!=="number";veh.hidden=t!=="vehicle";if(t==="vehicle")loadMakes();};
  tabs.forEach(b=>b.addEventListener("click",()=>show(b.dataset.tab)));
  if(!veh.hidden)loadMakes();
  num.addEventListener("submit",e=>{e.preventDefault();const q=num.querySelector("input").value.trim();if(q)location.hash="#/find?q="+encodeURIComponent(q);else num.querySelector("input").focus();});
  veh.addEventListener("submit",e=>{e.preventDefault();const s=veh.querySelectorAll("select"),mk=s[0].value;if(!mk){s[0].focus();return;}
    const p=new URLSearchParams({by:"vehicle",mk});const mo=veh.querySelector("input").value.trim();if(mo)p.set("mo",mo);if(s[1].value)p.set("yr",s[1].value);location.hash="#/find?"+p.toString();});
}

// ---------- home ----------
const FAMILIES=[
  {id:"braking",name:"Braking",icon:"disc",img:"/assets/img/braking-box.webp",href:"#/products/braking-system",text:"Brake pads in three compounds, discs, shoes, hydraulics, electronic control and parking brake parts.",cat:"#/products/braking-system",catText:"View the range"},
  {id:"ss",name:"Steering & suspension",icon:"ball",img:"/assets/img/ss-box.webp",href:"#/products/steering-suspension",text:"Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts.",cat:"#/steering",catText:"Search the catalogue"},
  {id:"shock",name:"Shock absorbers",icon:"shock",href:"#/products/shock-absorbers",text:"Dampers that keep the tyres on the road by controlling spring movement.",cat:"#/products/shock-absorbers",catText:"View the range"},
  {id:"fl",name:"Filtration",icon:"f_oil",href:"#/products/filters",text:"Air, oil, fuel and cabin filters for passenger cars, bakkies, trucks and equipment.",cat:"#/filters",catText:"Search the catalogue"},
  {id:"bat",name:"Batteries",icon:"battery",soon:true,text:"Stravik batteries are being added to the range. Ask us to be told when they're available.",cat:"#/contact",catText:"Ask about batteries"}];
const famCard=f=>`<article class="fam${f.soon?" soon":""}">${f.soon?`<div class="fam-top">`:`<a class="fam-top" href="${f.href}">`}<div class="fam-pic">${f.img?`<img src="${f.img}" alt="Stravik ${esc(f.name.toLowerCase())} box" loading="lazy">`:`<span class="ic">${icon(f.icon)}</span>`}${f.soon?`<span class="fam-soon">Coming soon</span>`:""}</div><div class="fam-body"><h3>${esc(f.name)}</h3><p>${esc(f.text)}</p></div>${f.soon?`</div>`:`</a>`}<a class="fam-cat" href="${f.cat}">${f.catText} →</a></article>`;
function home(){
  app.innerHTML=`
  <section class="hero hvid">
    <video class="hvideo" muted loop playsinline preload="auto" poster="/assets/hero-road-poster.webp" aria-hidden="true"><source src="/assets/hero-road.webm" type="video/webm"><source src="/assets/hero-road.mp4" type="video/mp4"></video>
    <div class="vshade" aria-hidden="true"></div>
    <div class="wrap"><div class="copy">
      <h1><span>Stop sure.</span><span>Steer true.</span><span>Ride steady.</span></h1>
      <p class="lede">Precision-engineered brakes, steering, suspension and filters of OE equivalent quality, for workshops, distributors and retailers.</p>
      <div class="actions"><a class="btn gold" href="#/products">Browse products</a><a class="btn line" href="#/contact">Contact us</a></div>
    </div></div>
  </section>

  <section class="block intro"><div class="wrap intro-grid">
    <div class="intro-txt">
      <div class="eyebrow-d">The Stravik range</div>
      <h2>One trusted source for automotive parts</h2>
      <p>Stravik parts are OE equivalent, made in IATF and ISO certified factories. The range offers extensive vehicle coverage, and we supply workshops, distributors and retailers in over 60 countries at competitive value.</p>
      <ul class="checks"><li>OE equivalent, matched to OE fit</li><li>IATF and ISO certified manufacturing</li><li>Online catalogues searchable by OE or cross-reference number</li></ul>
    </div>
    <figure class="intro-pic"><img src="/assets/home-road.webp" width="1400" height="788" loading="lazy" alt="A dark saloon car driving along a coastal road at sunset over the words Own the road painted on the asphalt"></figure>
  </div></section>

  <section class="block paper"><div class="wrap">
    <div class="head"><div><div class="eyebrow-d">Products</div><h2>Shop by product family</h2><p>Choose a family to see its part types, or open a catalogue to search by part, OE or cross-reference number.</p></div><a class="btn line" href="#/products">All products</a></div>
    <div class="fams fams5">${FAMILIES.map(famCard).join("")}</div>
  </div></section>`;
  const hv=app.querySelector(".hvideo");
  if(hv){const still=matchMedia("(prefers-reduced-motion: reduce)").matches,save=navigator.connection&&navigator.connection.saveData;
    if(!still&&!save){hv.play().catch(()=>{});}}
}

// ---------- Find a part ----------
function findPage(params){
  const q=(params.get("q")||"").trim(),byVeh=params.get("by")==="vehicle"&&params.get("mk");
  document.title="Find a part | Stravik";
  app.innerHTML=`<div class="pagehead findhead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>Find a part</span></div>
    <h1>Find a part</h1><p>Search by Stravik number, OE number, competitor or CTR number, or by vehicle.</p>
    ${searchPanel("f",params)}</div></div>
  <div class="wrap results" id="results">${q||byVeh?`<p class="loading">Searching…</p>`:`<div class="fhelp">
    <div><h3>By number</h3><p>Type the number on the old part, the OE number from the vehicle maker, or a competitor's number. Spaces and dashes don't matter.</p></div>
    <div><h3>By vehicle</h3><p>Pick the make, then type the model. Add the year to narrow it down.</p></div>
    <div><h3>By description</h3><p>Words work too, such as <a href="#/find?q=tie%20rod%20end%20hilux">tie rod end Hilux</a> or <a href="#/find?q=cabin%20filter%20corolla">cabin filter Corolla</a>.</p></div></div>${cantFind("","")}`}</div>`;
  wireSearchPanel(app.querySelector("[data-spanel]"),params);
  const box=app.querySelector("#results");
  const fail=err=>{box.innerHTML=`<div class="noresults"><p>The catalogue didn't load (${esc(err.message)}). Refresh the page to try again.</p></div>`;};
  if(byVeh){
    const mk=params.get("mk"),mo=params.get("mo")||"",yr=params.get("yr")||"";const label=[mk,mo,yr].filter(Boolean).join(" ");
    document.title=`${label} parts | Stravik`;
    vehicleIndex().then(ix=>{const r=vehicleMatch(ix,mk,mo,yr),n=r.ss.length+r.fl.length;
      box.innerHTML=`<p class="rsum"><b>${n.toLocaleString("en-US")}</b> ${n===1?"part fits":"parts fit"} <b>${esc(label)}</b></p>`+
        (n?ssResults(ix.ss,r.ss.map(i=>({i})),"",100)+flResults(ix.fl,r.fl.map(i=>({i})),"",100):`<div class="noresults"><p>No parts listed for this vehicle yet. Check the spelling of the model, or try without the year.</p></div>`)+cantFind("",label);
    }).catch(fail);
    return;
  }
  if(!q)return;
  document.title=`${q} | Find a part | Stravik`;
  searchAll(q).then(r=>{const n=r.S.length+r.F.length;
    box.innerHTML=`<p class="rsum"><b>${n.toLocaleString("en-US")}</b> ${n===1?"part matches":"parts match"} <b>“${esc(q)}”</b>${r.mode==="number"?" by number":""}</p>`+
      ssResults(r.ss,r.S,q,50)+flResults(r.fl,r.F,q,50)+
      (r.P.length?`<div class="rgroup"><h2>Product lines <span>${r.P.length}</span></h2><div class="grid">${r.P.slice(0,8).map(card).join("")}</div></div>`:"")+
      (!n&&!r.P.length?`<div class="noresults"><p>Nothing matches “${esc(q)}”. Check the number, try fewer words, or search by vehicle.</p></div>`:"")+cantFind(q,"");
  }).catch(fail);
}

// ---------- Can't find your part ----------
function requestPage(params){
  const F=[["rn","Your name","text",{required:true,auto:"name",err:"Enter your name."}],["rb","Business name","text",{auto:"organization"}],
    ["re","Email","email",{required:true,auto:"email",err:"Enter an email address like name@company.com."}],["rp","Phone","tel",{auto:"tel"}],
    ["rc","Country","text",{required:true,placeholder:COUNTRY_HINT,auto:"country-name",err:"Enter your country."}],["rt","I am a","select",{options:["Workshop","Parts store","Distributor","Fleet operator","Other"]}],
    ["rv","Vehicle (make, model, year, engine)","text",{required:true,placeholder:"e.g. Toyota Hilux 2016 2.5 D-4D",value:params.get("veh")||"",err:"Tell us the vehicle."}],
    ["rvin","VIN (chassis number)","text",{placeholder:"17 characters, if you have it"}],
    ["rpart","Part needed","text",{required:true,placeholder:"e.g. front lower ball joint, left",err:"Tell us which part you need."}],
    ["roe","OE or other part number","text",{value:params.get("q")||""}],["rq","Quantity","text",{placeholder:"e.g. 20 pcs"}],
    ["rm","Anything else","textarea",{full:true,placeholder:"Position, photos you can send, or where you've seen the part"}]];
  app.innerHTML=`<div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/find">Find a part</a><span>/</span><span>Can't find your part?</span></div>
    <h1>Can't find your part?</h1><p>Tell us what you need. We'll check whether Stravik supplies it, and every request helps us decide which parts to add to the range.</p></div></div>
  <div class="wrap contact">${tradeForm(F,"Send request")}
    <aside class="details"><h3>What helps us find it</h3><ul class="checks"><li>The OE number from the old part or the parts book</li><li>The VIN, so we can confirm the exact model</li><li>The position: front or rear, left or right, upper or lower</li></ul></aside></div>`;
  wireTradeForm(app.querySelector("form"),F,d=>`Part request: ${d["Part needed"]} for ${d["Vehicle (make, model, year, engine)"]}`,`<b>Request sent.</b> Thanks. We'll check the part and reply to the email address you gave us.`);
}

// ---------- New to range (edit NEWS to add entries, newest first) ----------
const NEWS=[
  {when:"2026",title:"Steering and suspension catalogue",text:"Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts, each with its CTR and OE cross-references and the vehicles it fits.",href:"#/steering",cta:"Search the catalogue",img:"/assets/img/ss-box.webp",count:"ss"},
  {when:"2026",title:"Stravik filters",text:"Air, oil, fuel and cabin filters for passenger cars, bakkies, trucks and equipment, searchable by OE or cross-reference number.",href:"#/filters",cta:"Search the catalogue",icon:"f_oil",count:"fl"},
  {when:"2026",title:"Brake pads in three compounds",text:"Ceramic, semi-metallic and low-metallic pads, each in its own colour-coded box, so the counter can match the pad to how the vehicle is driven.",href:"#/product/brake-pads",cta:"Compare compounds",img:"/assets/img/pads-semi.webp"},
  {when:"2026",title:"Braking system parts",text:"New lines across friction, hydraulics, electronic control and the parking brake, from wear sensors and wheel cylinders to ABS sensors.",href:"#/products/braking-system",cta:"View the range",icon:"disc",count:"brk"}];
function newsCard(n){return `<article class="newsc"><a href="${n.href}"><div class="npic">${n.img?`<img src="${n.img}" alt="" loading="lazy">`:`<span class="ic">${icon(n.icon)}</span>`}</div><div class="nbody"><span class="nwhen">${esc(n.when)}</span><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p><span class="ncta">${esc(n.cta)} →</span></div></a></article>`;}
function newPage(){
  const brkNew=ALL.filter(p=>p.isNew&&p.cat.id==="braking-system");
  app.innerHTML=`<div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>New to range</span></div>
    <h1>New to range</h1><p>The latest additions to the Stravik range. Come back to see what's been added, or ask us about a part you need.</p></div></div>
  <section class="block"><div class="wrap"><div class="news all">${NEWS.map(newsCard).join("")}</div></div></section>
  ${brkNew.length?`<section class="block paper"><div class="wrap"><div class="head"><div><h2>New braking lines</h2><p>${brkNew.length} part lines added to the braking range.</p></div></div><div class="grid">${brkNew.map(card).join("")}</div></div></section>`:""}
  <section class="block"><div class="wrap">${cantFind("","")}</div></section>`;
}

// ---------- Where to buy ----------
const MARKETS=[["Over 60 countries","Stravik is available for supply in over 60 countries. Ask us about yours."],["Workshops and parts stores","Buy Stravik through a local stockist. Tell us where you are and we'll put you in touch."],["Distributors","Stock Stravik in your market. Tell us about your business and the markets you cover."]];
function wherePage(params){
  const dist=params.get("t")==="distributor";
  const F=[["wt","I want to","select",{options:["Find a Stravik stockist","Become a Stravik distributor"],value:dist?"Become a Stravik distributor":"Find a Stravik stockist",full:true}],
    ["wn","Your name","text",{required:true,auto:"name",err:"Enter your name."}],["wb","Business name","text",{auto:"organization"}],
    ["we","Email","email",{required:true,auto:"email",err:"Enter an email address like name@company.com."}],["wp","Phone","tel",{auto:"tel"}],
    ["wc","Country","text",{required:true,placeholder:COUNTRY_HINT,auto:"country-name",err:"Enter your country."}],["wcity","City","text",{}],
    ["wbt","Business type","select",{options:["Workshop","Parts store","Distributor or wholesaler","Fleet operator","Other"]}],
    ["wr","Product families of interest","text",{placeholder:"e.g. steering & suspension, filters"}],
    ["wm","Message","textarea",{full:true,placeholder:"Markets you cover, current brands, expected volumes"}]];
  app.innerHTML=`<div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>Where to buy</span></div>
    <h1>Where to buy</h1><p>Stravik is sold through the trade: distributors, parts stores and workshops. Tell us where you are and we'll put you in touch with a stockist, or apply to distribute Stravik in your market.</p></div></div>
  <section class="block"><div class="wrap"><div class="markets">${MARKETS.map(m=>`<div><h3>${m[0]}</h3><p>${m[1]}</p></div>`).join("")}</div></div></section>
  <section class="block paper" id="wform"><div class="wrap"><div class="head"><div><h2>${dist?"Become a Stravik distributor":"Find a stockist or become a distributor"}</h2><p>We reply by email with the stockist nearest you, or with the next steps for distributors.</p></div></div>
    <div class="contact">${tradeForm(F,"Send")}<aside class="details"><h3>Distributors</h3><ul class="checks"><li>One supplier for brakes, steering, suspension, shock absorbers and filters</li><li>Online catalogues your counter staff can search by OE number</li><li>Extensive vehicle coverage</li></ul></aside></div></div></section>`;
  wireTradeForm(app.querySelector("form"),F,d=>`${d["I want to"]}: ${d["Business name"]||d["Your name"]}, ${d["Country"]}`,`<b>Message sent.</b> Thanks. We'll reply to the email address you gave us.`);
  if(dist)setTimeout(()=>{const el=document.getElementById("wform");if(el)el.scrollIntoView();},50);
}

const BRAND_VALUES=`<section class="bv" aria-labelledby="bvh"><div class="wrap">
    <h2 id="bvh">Our brand values</h2>
    <p class="lede">Seven values, one name. Every letter of STRAVIK represents the standards we stand by.</p>
    <ol class="acro">
      <li><span class="l" aria-hidden="true">S</span><b>Service</b><span class="d">Responsive support, dependable supply, and partnerships that go further.</span></li>
      <li><span class="l" aria-hidden="true">T</span><b>Trust</b><span class="d">Honest commitments, consistent standards, and confidence in every part.</span></li>
      <li><span class="l" aria-hidden="true">R</span><b>Reliability</b><span class="d">Consistent quality from one order to the next.</span></li>
      <li><span class="l" aria-hidden="true">A</span><b>Availability</b><span class="d">A wide range, ready to supply to customers in over 60 countries.</span></li>
      <li><span class="l" aria-hidden="true">V</span><b>Value</b><span class="d">Competitive pricing without cutting corners on quality.</span></li>
      <li><span class="l" aria-hidden="true">I</span><b>Innovation</b><span class="d">Evolving products and smarter solutions for tomorrow's automotive needs.</span></li>
      <li><span class="l" aria-hidden="true">K</span><b>Knowledge</b><span class="d">Automotive expertise that delivers accurate fitment and the right solution.</span></li>
    </ol>
    <p class="promise"><span>The Right Parts.</span><span>The Right Value.</span><span>Every Time.</span></p>
  </div></section>`;
function about(){
  app.innerHTML=`
  <div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>About us</span></div><h1>About Stravik</h1></div></div>
  <section class="block"><div class="wrap exp-grid">
    <div class="exp-big brandpanel"><img src="/assets/stravik-logo-reversed.webp" width="720" height="300" alt="Stravik"><span class="unit">Own the road.</span></div>
    <div class="exp-txt"><h2>Why Stravik</h2>
      <ul class="checks"><li>Quality-first approach, with OE equivalent parts</li><li>IATF and ISO certified manufacturing</li><li>Extensive vehicle coverage</li><li>Available for supply in over 60 countries</li></ul>
      <div class="actions"><a class="btn ink" href="#/products">Browse products</a><a class="btn line" href="#/contact">Contact us</a></div></div>
  </div></section>
  <section class="block"><div class="wrap about-lead">
    <div class="txt">
      <p class="first">Stravik is built on three decades of expertise supplying quality automotive parts to customers in over 60 countries.</p>
      <p>Every part is OE equivalent, and our manufacturing is IATF and ISO certified, so you can fit our parts with confidence.</p>
      <p>Our key selling points are built on a commitment to quality, reliability, and competitive value. We work with reputable manufacturers worldwide, leveraging advanced manufacturing technologies, strict quality control processes, and proven industry expertise to deliver dependable automotive aftermarket products. By combining consistent product quality, reliable performance, competitive pricing, and efficient supply capabilities, we aim to meet diverse market requirements and provide lasting value to our customers.</p>
    </div>
    <div class="pics" aria-hidden="true"><img class="p1" src="/assets/img/ss-box.webp" alt=""><img class="p2" src="${PADS[2].img}" alt=""></div>
  </div></section>
  <section class="block paper"><div class="wrap mv">
    <div><h2>Our mission</h2><p>To deliver reliable, high-quality automotive aftermarket solutions that keep vehicles moving and businesses growing. At STRAVIK, we are committed to providing dependable products, competitive value, accurate vehicle compatibility, and responsive customer service. Through continuous improvement and a customer-first approach, we strive to build lasting partnerships with distributors, retailers, workshops, and automotive professionals worldwide.</p></div>
    <div><h2>Our vision</h2><p>To become a trusted and recognized name in the global automotive aftermarket, known for quality, reliability, innovation, and exceptional value. STRAVIK aspires to set higher standards in automotive replacement parts by continuously expanding its product range, strengthening global partnerships, and delivering solutions that meet the evolving needs of the automotive industry worldwide.</p></div>
  </div></section>
  ${BRAND_VALUES}
  <section class="block paper"><div class="wrap">
    <div class="values three">
      <div><h3>What we offer</h3><p>Our range offers extensive vehicle coverage, giving workshops, distributors and retailers one reliable source for the parts they need.</p></div>
      <div><h3>Serving markets worldwide</h3><p>We supply customers across a wide range of markets in over 60 countries. Whatever the region, we understand the vehicles on its roads and the parts its customers need, so you get a range that fits your market.</p></div>
      <div><h3>Find your part fast</h3><p>Our online catalogue lets you search the full range by OE number or cross-reference number. Enter the number you have and see the matching Stravik part, with its position and the vehicles it fits.</p>
        <p class="links"><a href="#/steering">Steering &amp; suspension catalogue</a><a href="#/filters">Filter catalogue</a></p></div>
    </div>
  </div></section>
  <section class="block paper"><div class="wrap">
    <div class="head"><div><h2>Questions about a part?</h2><p>Send us the vehicle and the part you need.</p></div><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn gold" href="#/products">See our products</a><a class="btn line" href="#/contact">Contact us</a></div></div>
  </div></section>`;
}

const prodTabs=cur=>[["","All products"],["braking-system","Braking System"],["steering-suspension","Steering &amp; Suspension"],["shock-absorbers","Shock Absorbers"],["filters","Filters"]].map(t=>`<a role="listitem" href="#/products${t[0]?"/"+t[0]:""}" aria-current="${(cur||"")===t[0]}">${t[1]}</a>`).join("");
function filtersOverview(){
  app.innerHTML=`<div class="pagehead"><div class="wrap">
    <div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Our products</a><span>/</span><span>Filters</span></div>
    <h1>Filters</h1><p>Air, oil, fuel and cabin filters under the Stravik name, for passenger cars, bakkies, trucks and equipment.</p>
    <div class="tabs" role="list">${prodTabs("filters")}</div></div></div>
  <section class="fband"><div class="wrap">
    <div><div class="kicker">Catalogue</div><h2>Filter catalogue</h2><p id="fov-lede">Every Stravik filter with its OE numbers, cross-references and vehicles. Search by number, or browse by vehicle make.</p>
      <div style="margin-top:22px"><a class="btn gold" href="#/filters">Open the catalogue</a></div></div>
    <form id="fovq" role="search"><label for="fovi">Search the catalogue</label><div class="field"><input id="fovi" type="search" autocomplete="off" placeholder="OE or cross-reference number, or vehicle"><button type="submit">Search</button></div><small>For example 17801-0L040, Z212 or Hilux</small></form>
  </div></section>
  <section class="block"><div class="wrap"><div class="group" style="margin-bottom:0"><h2>Filter types<span id="fov-n"></span></h2><div class="grid" id="fov-grid"><p class="loading">Loading filter types…</p></div></div></div></section>`;
  app.querySelector("#fovq").addEventListener("submit",e=>{e.preventDefault();const q=app.querySelector("#fovi").value.trim();location.hash="#/filters"+(q?"?q="+encodeURIComponent(q):"");});
  loadFilters().then(d=>{
    app.querySelector("#fov-n").textContent=`${d.items.length} Stravik part numbers`;
    app.querySelector("#fov-grid").innerHTML=d.types.map(t=>{const n=FCOUNT(d,t[0]);return `<a class="card" href="#/filters/${t[1]}"><span class="ic">${icon(FICON[t[0]])}</span><h3>${esc(t[2])}</h3><p>View in the catalogue</p></a>`;}).join("");
  }).catch(err=>{app.querySelector("#fov-grid").innerHTML=`<div class="noresults"><p>The filter list didn't load (${esc(err.message)}). Refresh the page to try again.</p></div>`;});
}
function productsHome(){
  const B=CATALOG.find(c=>c.id==="braking-system"),S=CATALOG.find(c=>c.id==="shock-absorbers");
  const lines=c=>c.types.reduce((n,t)=>n+t.subs.length,0);
  const pc=(img,ic,name,txt,meta,links)=>`<article class="pcat"><div class="pic">${img?`<img src="${img}" alt="Stravik ${esc(name)} packaging" loading="lazy">`:`<span class="pic-ic">${icon(ic)}</span>`}</div>
    <div class="body"><h3>${name}</h3><p>${txt}</p>${meta[1]?`<small class="meta">${meta[1]}</small>`:""}<div class="plinks">${links}</div></div></article>`;
  const padSlide=(p,k)=>`<div class="slide c-${p.key}" role="group" aria-roledescription="slide" aria-label="${k+1} of ${PADS.length+1}"><div class="wrap">
      <div><div class="eyebrow">Brake pads in three compounds</div><h2>${esc(p.name)} brake pads</h2><div class="tag">${esc(p.line)}</div>
        <p class="best">${esc(p.best)}</p>
        <div class="actions"><a class="btn gold" href="#/product/brake-pads?c=${p.key}">View ${esc(p.name.toLowerCase())} pads</a><a class="btn line" href="#/product/brake-pads">Compare compounds</a></div></div>
      <div class="pic"><img src="${p.img}" alt="Stravik ${esc(p.name)} brake pads box"></div>
    </div></div>`;
  app.innerHTML=`
  <section class="slider pslider" data-slider aria-roledescription="carousel" aria-label="Stravik products">
    <div class="slides">${PADS.map(padSlide).join("")}<div class="slide c-ss" role="group" aria-roledescription="slide" aria-label="${PADS.length+1} of ${PADS.length+1}"><div class="wrap">
      <div><div class="eyebrow">Steering &amp; suspension</div><h2>Steering &amp; suspension parts</h2><div class="tag">Matched to OE fit</div>
        <p class="best">Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts, each with its CTR and OE cross-references.</p>
        <div class="actions"><a class="btn gold" href="#/steering">Search the catalogue</a><a class="btn line" href="#/products/steering-suspension">About the range</a></div></div>
      <div class="pic"><img src="/assets/img/ss-box.webp" alt="Stravik steering and suspension box"></div>
    </div></div></div>
    ${sliderCtl()}
  </section>
  <div class="pagehead"><div class="wrap">
    <div class="crumbs"><a href="#/">Home</a><span>/</span><span>Our products</span></div>
    <h1>Our products</h1>
    <p>Braking, steering and suspension, shock absorbers, filters and batteries, of OE equivalent quality.</p>
    <div class="tabs" role="list">${prodTabs("")}</div>
  </div></div>

  <section class="block"><div class="wrap">
    <div class="head"><div><h2>Product ranges</h2><p>Choose a range to see its part types, or open a catalogue to search by part number.</p></div></div>
    <div class="pcats">
      ${pc(B.img,"disc","Braking System",esc(B.intro),["",""],`<a class="btn gold" href="#/products/braking-system">View the range</a>`)}
      ${pc(SS_IMG,"ball","Steering &amp; Suspension","Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts, each with its CTR and OE numbers.",["",""],`<a class="btn gold" href="#/steering">Open the catalogue</a><a class="btn line" href="#/products/steering-suspension">About the range</a>`)}
      ${pc(S.img,"shock","Shock Absorbers",esc(S.intro),["",""],`<a class="btn gold" href="#/products/shock-absorbers">View the range</a>`)}
      ${pc("","f_oil","Filters","Air, oil, fuel and cabin filters for passenger cars, bakkies, trucks and equipment.",["",""],`<a class="btn gold" href="#/filters">Open the catalogue</a><a class="btn line" href="#/products/filters">About the range</a>`)}
      ${pc("","battery","Batteries","Stravik batteries are being added to the range. Ask us to be told when they're available.",["","Coming soon"],`<a class="btn gold" href="#/contact">Ask about batteries</a>`)}
    </div>
  </div></section>

  <section class="block paper"><div class="wrap">
    <div class="head" style="margin-bottom:0"><div><h2>Can't find your part?</h2><p>Send us the vehicle and the OE number. We'll check it, and every request helps us decide what to add to the range.</p></div><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn gold" href="#/request">Request a part</a><a class="btn line" href="#/find">Find a part</a></div></div>
  </div></section>`;
  initSlider(app.querySelector("[data-slider]"),6000);
}

function products(catId,typeId,q){
  if(!catId&&!q){productsHome();return;}
  if(catId==="filters"){filtersOverview();return;}
  if(catId==="steering-suspension"){ssOverview();return;}
  const cat=CATALOG.find(c=>c.id===catId);
  const cats=cat?[cat]:CATALOG;
  app.innerHTML=`
  <div class="pagehead"><div class="wrap">
    <div class="crumbs"><a href="#/">Home</a><span>/</span>${cat?`<a href="#/products">Our products</a><span>/</span><span>${esc(cat.name)}</span>`:`<span>Our products</span>`}</div>
    <h1>${cat?esc(cat.name):"Our products"}</h1>
    <p>${cat?esc(cat.intro):"Browse the full Stravik range by system and part type."}</p>
    <div class="tabs" role="list">${prodTabs(cat?cat.id:"")}</div>
  </div></div>
  <div class="wrap catalog">
    <aside class="side">
      <div class="tools">
        <label class="sr" for="filter">Filter parts</label>
        <input id="filter" type="search" placeholder="Filter parts" value="${esc(q||"")}">
      </div>
      <nav aria-label="Part types">${cats.map(c=>`<h4>${esc(c.name)}</h4>${c.types.map(t=>`<a href="#/products/${c.id}/${t.id}">${esc(t.name)}</a>`).join("")}<div style="height:18px"></div>`).join("")}</nav>
    </aside>
    <div>${cat?"":`<div class="catcall"><a href="#/steering"><span class="ic">${icon("ball")}</span><span><b>Steering &amp; suspension catalogue</b><small id="cc-ss">Search by Stravik, CTR or OE number</small></span></a><a href="#/filters"><span class="ic">${icon("f_oil")}</span><span><b>Filter catalogue</b><small id="cc-fl">Search by Stravik, OE or cross-reference number</small></span></a></div>`}<div id="groups"></div></div>
  </div>`;
  if(!cat){loadSS().then(d=>{const e=app.querySelector("#cc-ss");if(e)e.textContent=d.items.length.toLocaleString("en-US")+" parts with CTR and OE numbers";}).catch(()=>{});
    loadFilters().then(d=>{const e=app.querySelector("#cc-fl");if(e)e.textContent=d.items.length+" filters with OE and cross-reference numbers";}).catch(()=>{});}
  const f=app.querySelector("#filter"),g=app.querySelector("#groups");
  const draw=()=>{const s=f.value.trim().toLowerCase();let total=0;
    g.innerHTML=cats.map(c=>c.types.map(t=>{const list=t.subs.filter(p=>(!s||(p.name+" "+p.desc).toLowerCase().includes(s)));total+=list.length;
      return list.length?`<div class="group" id="g-${t.id}"><h2>${esc(t.name)}<span>${esc(c.name)}</span></h2><div class="grid">${list.map(card).join("")}</div></div>`:"";}).join("")).join("");
    if(!total)g.innerHTML=`<div class="noresults"><p>No parts match your filter.</p><p style="margin-top:12px"><button class="btn line" id="clear">Clear filter</button></p></div>`,g.querySelector("#clear").onclick=()=>{f.value="";draw();};
  };
  f.addEventListener("input",draw);draw();
  app.querySelectorAll(".side nav a").forEach(a=>a.addEventListener("click",e=>{const id=a.getAttribute("href").split("/").pop();const el=document.getElementById("g-"+id);if(el&&cat){e.preventDefault();el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}}));
  if(typeId){const el=document.getElementById("g-"+typeId);if(el)setTimeout(()=>el.scrollIntoView(),30);}
}

function product(id,params){
  const p=byId(id);
  if(!p&&id in OLD_SS){location.replace(OLD_SS[id]?"#/steering/"+OLD_SS[id]:"#/products/steering-suspension");return;}
  if(!p){notFound();return;}
  const pads=p.special==="pads";
  const start=PADS.find(x=>x.key===params.get("c"))||PADS[0];
  const related=p.type.subs.filter(x=>x!==p).slice(0,4);
  app.innerHTML=`
  <div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Our products</a><span>/</span><a href="#/products/${p.cat.id}">${esc(p.cat.name)}</a><span>/</span><a href="#/products/${p.cat.id}/${p.type.id}">${esc(p.type.name)}</a></div><h1>${esc(p.name)}</h1></div></div>
  <div class="wrap detail">
    <div class="visual" id="vis">${pads?`<img class="box" id="padimg" src="${start.img}" alt="">`:`<div class="big">${icon(p.icon)}</div>${p.cat.img?`<img class="corner" src="${p.cat.img}" alt="">`:""}`}</div>
    <div class="info">
      <div class="type">${esc(p.cat.name)}, ${esc(p.type.name)}</div>
      <p class="desc">${esc(p.desc)}</p>
      ${pads?`<div class="chooser" role="group" aria-label="Choose a compound">${PADS.map(x=>`<button type="button" data-k="${x.key}" aria-pressed="${x===start}">${esc(x.name)}</button>`).join("")}</div><div class="compound-detail" id="cd" aria-live="polite"></div>`:""}
      <div class="replace"><b>When to replace</b><span>${esc(p.when)}</span></div>
      <div class="buy"><div><label for="bq">Quantity</label><input id="bq" type="number" min="1" max="99999" value="1" inputmode="numeric"></div><button type="button" class="btn gold" id="badd">Add to cart</button></div>
      <div class="actions"><a class="btn line" href="#/contact?part=${encodeURIComponent(p.name)}">Ask about fitment</a><a class="btn line" href="#/products/${p.cat.id}/${p.type.id}">More ${esc(p.type.name.toLowerCase())}</a></div>
    </div>
  </div>
  ${related.length?`<section class="block paper related"><div class="wrap"><h2>Also in ${esc(p.type.name)}</h2><div class="grid">${related.map(card).join("")}</div></div></section>`:""}`;
  let cur=pads?start:null;
  app.querySelector("#badd").addEventListener("click",()=>{
    const name=p.name+(cur?" – "+cur.name:""),qty=clampQty(app.querySelector("#bq").value);
    Cart.add({key:"L:"+p.id+(cur?":"+cur.key:""),no:"",name,cat:p.cat.name,desc:p.type.name,link:"#/product/"+p.id+(cur?"?c="+cur.key:""),kind:"line"},qty);
    toast(`${qty} × ${name} added to your cart`);
  });
  if(pads){
    const cd=app.querySelector("#cd"),img=app.querySelector("#padimg");
    const show=x=>{cur=x;img.src=x.img;img.alt="Stravik "+x.name+" brake pads box";cd.innerHTML=`<h3 style="font-size:26px">${esc(x.name)} brake pads</h3><ul class="checks" style="margin-top:14px">${x.feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`;
      app.querySelectorAll(".chooser button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===x.key));};
    app.querySelectorAll(".chooser button").forEach(b=>b.onclick=()=>show(PADS.find(x=>x.key===b.dataset.k)));
    show(start);
  }
}

function contact(params){
  const part=params.get("part")||"";
  app.innerHTML=`
  <div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>Contact us</span></div><h1>Contact us</h1><p>Ask about fitment, pricing or becoming a stockist. Include the vehicle and part and we can answer faster.</p></div></div>
  <div class="wrap contact">
    <form class="enq" novalidate>
      <div><label for="n">Your name</label><input id="n" required autocomplete="name"><div class="err">Enter your name.</div></div>
      <div><label for="b">Business name</label><input id="b" autocomplete="organization"></div>
      <div><label for="e">Email</label><input id="e" type="email" required autocomplete="email"><div class="err">Enter an email address like name@company.com.</div></div>
      <div><label for="ph">Phone</label><input id="ph" type="tel" autocomplete="tel"></div>
      <div><label for="t">I am a</label><select id="t"><option>Workshop</option><option>Parts store</option><option>Fleet operator</option><option>Distributor</option><option>Other</option></select></div>
      <div><label for="v">Vehicle (make, model, year)</label><input id="v" placeholder="e.g. Toyota Hilux 2016"></div>
      <div class="full"><label for="pt">Part</label><select id="pt"><option value="">General enquiry</option>${CATALOG.map(c=>`<optgroup label="${esc(c.name)}">${c.types.flatMap(t=>t.subs).map(s=>`<option ${s.name===part?"selected":""}>${esc(s.name)}</option>`).join("")}</optgroup>`).join("")}<optgroup label="Steering &amp; Suspension">${SS_TYPES.map(t=>`<option ${t[1]===part?"selected":""}>${esc(t[1])}</option>`).join("")}</optgroup><optgroup label="Filters">${["Air filters","Oil filters","Fuel filters","Cabin filters","Filter kits","Coolant filters","Filter housings"].map(n=>`<option ${n===part?"selected":""}>${n}</option>`).join("")}</optgroup></select></div>
      <div class="full"><label for="m">Message</label><textarea id="m" required placeholder="What do you need? Quantities, part numbers or OE numbers help."></textarea><div class="err">Enter a message.</div></div>
      <input type="checkbox" name="botcheck" id="botcheck" tabindex="-1" autocomplete="off" style="display:none">
      <div class="full" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><button class="btn gold" type="submit" id="sendbtn">Send enquiry</button><span class="note">We reply by email.</span></div>
      <div class="full ready" id="ready" role="status"></div>
    </form>
    <aside class="details"><h3>Get in touch</h3><dl>
      <div><dt>Email</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd></div>
      <div><dt>Website</dt><dd>www.stravikautomotiveparts.com</dd></div>
          </dl></aside>
  </div>`;
  const form=app.querySelector("form"),ready=app.querySelector("#ready");
  const ref=params.get("ref");if(ref&&/^SV(-[A-Z]{3}-\d{4}-\d{2}|[A-Z]{2}\d{4}[LRK]?)$/.test(ref))form.querySelector("#m").value=`Stravik part number: ${ref}\nQuantity: \n`;
  const btn=form.querySelector("#sendbtn");
  form.addEventListener("submit",async ev=>{ev.preventDefault();let ok=true;
    ["n","e","m"].forEach(id=>{const el=form.querySelector("#"+id);const bad=!el.value.trim()||(id==="e"&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));el.classList.toggle("invalid",bad);if(bad&&ok){el.focus();ok=false;}});
    if(!ok)return;
    const v=id=>form.querySelector("#"+id).value.trim();
    const subject=`Stravik enquiry: ${v("pt")||"General"}${v("v")?" for "+v("v"):""}`;
    const body=`Name: ${v("n")}\nBusiness: ${v("b")}\nEmail: ${v("e")}\nPhone: ${v("ph")}\nI am a: ${v("t")}\nVehicle: ${v("v")}\nPart: ${v("pt")||"General enquiry"}\n\n${v("m")}`;
    btn.disabled=true;btn.textContent="Sending…";ready.classList.remove("show");
    try{
      const r=await fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({access_key:W3F_KEY,subject,from_name:"Stravik website",replyto:v("e"),botcheck:form.querySelector("#botcheck").checked,
          name:v("n"),email:v("e"),business:v("b"),phone:v("ph"),customer_type:v("t"),vehicle:v("v"),part:v("pt")||"General enquiry",message:v("m")})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.success)throw new Error(j.message||("Status "+r.status));
      form.querySelectorAll("input:not([type=checkbox]),textarea").forEach(el=>el.value="");
      ready.innerHTML=`<b>Enquiry sent.</b> Thanks for getting in touch. We'll reply to the email address you gave us.`;
    }catch(err){
      const href=`mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      ready.innerHTML=`<b>Your enquiry wasn't sent.</b> Check your connection and try again, or <a href="${href}">email it to ${EMAIL}</a> instead.<br><small style="color:var(--muted)">Details: ${esc(err.message||"Could not reach the form service")}</small>`;
    }finally{btn.disabled=false;btn.textContent="Send enquiry";ready.classList.add("show");}
  });
}


// ---------- filters (data in filters.json, built from the Master Data database; no prices) ----------
let FDP=null;
const fclean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
function loadFilters(){
  return FDP||(FDP=fetch("/filters.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("Status "+r.status);return r.json();}).then(d=>{
    d.T={};d.types.forEach(t=>d.T[t[0]]={code:t[0],slug:t[1],name:t[2],one:t[3]});
    d.items.forEach(i=>{i.keys=[fclean(i.pn)].concat((i.n||[]).map(fclean));i.text=[(i.mk||[]).join(" "),i.mo||"",i.e||"",i.d||"",d.T[i.t].one].join(" ").toLowerCase();});
    d.makes=[...new Set(d.items.flatMap(i=>i.mk||[]))].sort((a,b)=>a.localeCompare(b));
    return d;}).catch(e=>{FDP=null;throw e;}));
}
const FCOUNT=(d,code)=>d.items.filter(i=>i.t===code).length;
function fmatch(i,q){
  if(!q)return true;
  const c=fclean(q);
  if(c.length>=3&&i.keys.some(k=>k.includes(c)))return true;
  const words=q.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every(w=>i.text.includes(w)||(fclean(w).length>=2&&i.keys.some(k=>k.includes(fclean(w)))));
}
const fdesc=(d,i)=>d.T[i.t].one+(i.d?", "+i.d.charAt(0).toLowerCase()+i.d.slice(1):"");
function frow(d,i,q){
  const c=fclean(q),hit=c.length>=3?(i.n||[]).filter(n=>fclean(n).includes(c)):[];
  const nums=hit.concat((i.n||[]).filter(n=>!hit.includes(n))),shown=nums.slice(0,3);
  const veh=[(i.mk||[]).join(", "),i.mo,i.y].filter(Boolean).join(" · ");
  const item={key:i.pn,no:i.pn,cat:"Filters",desc:fdesc(d,i),link:"/filter/"+i.pn+"/",kind:"filter"},on=Cart.has(i.pn);
  return `<tr data-href="/filter/${esc(i.pn)}/"><td class="fpn"><a href="/filter/${esc(i.pn)}/">${esc(i.pn)}</a></td>`+
    `<td class="fty"><b>${esc(d.T[i.t].one)}</b>${i.d&&i.d.toLowerCase()!==d.T[i.t].one.toLowerCase()?` <span>${esc(i.d)}</span>`:""}</td>`+
    `<td class="fveh">${veh?esc(veh):""}</td>`+
    `<td class="fnum">${shown.length?shown.map(n=>hit.includes(n)?`<mark>${esc(n)}</mark>`:esc(n)).join(", ")+(nums.length>3?` +${nums.length-3} more`:""):""}</td>`+
    `<td class="fact"><button type="button" class="fadd inline" data-cart-key="${esc(i.pn)}" data-item="${esc(JSON.stringify(item))}" data-on="${on}" aria-label="${on?"Remove":"Add"} ${esc(i.pn)} ${on?"from":"to"} cart">${on?"✓ In cart":"Add to cart"}</button></td></tr>`;
}
function fcard(d,i,q){
  const c=fclean(q),hit=c.length>=3?(i.n||[]).filter(n=>fclean(n).includes(c)):[];
  const nums=hit.concat((i.n||[]).filter(n=>!hit.includes(n))),shown=nums.slice(0,4);
  const veh=[(i.mk||[]).join(", "),i.mo,i.y].filter(Boolean).join(" · ");
  const item={key:i.pn,no:i.pn,cat:"Filters",desc:fdesc(d,i),link:"/filter/"+i.pn+"/",kind:"filter"},on=Cart.has(i.pn);
  return `<div class="fcell"><a class="fcard" href="/filter/${i.pn}/"><span class="ic">${icon(FICON[i.t])}</span><span class="pn">${esc(i.pn)}</span><span class="ty">${esc(d.T[i.t].one)}${i.d?", "+esc(i.d.charAt(0).toLowerCase()+i.d.slice(1)):""}</span>`+
    (veh?`<span class="veh"><b>Fits</b> ${esc(veh)}</span>`:"")+
    (shown.length?`<span class="nums"><b>OE / ref.</b> ${shown.map(n=>hit.includes(n)?`<mark>${esc(n)}</mark>`:esc(n)).join(", ")}${nums.length>4?` +${nums.length-4} more`:""}</span>`:"")+`</a>`+
    `<button type="button" class="fadd" data-cart-key="${esc(i.pn)}" data-item="${esc(JSON.stringify(item))}" data-on="${on}" aria-label="${on?"Remove":"Add"} ${esc(i.pn)} ${on?"from":"to"} cart">${on?"✓ In cart":"Add to cart"}</button></div>`;
}
function filtersPage(slugT,params){
  let q=params.get("q")||"",mk=params.get("make")||"",view="list";
  try{if(localStorage.getItem("stravik-fview")==="cards")view="cards";}catch(e){}
  const STEP=()=>view==="list"?100:48;let shown=STEP();
  app.innerHTML=`<div class="pagehead fhead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products/filters">Filters</a><span>/</span><span>Catalogue</span></div><h1>Filter catalogue</h1>
    <p>Air, oil, fuel and cabin filters under the Stravik name. Search by Stravik part number, OE number or cross-reference, or pick your vehicle make.</p><div class="tabs" id="ftabs"></div></div></div>
    <div class="wrap catalog"><aside class="side fside"><nav aria-label="Filter types" class="ftypes-nav" id="fnav"></nav></aside>
    <div><div class="fsearch" role="search">
      <label class="fs-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sr">Search the filter catalogue</span>
        <input id="fq" type="search" autocomplete="off" spellcheck="false" placeholder="${matchMedia("(max-width:600px)").matches?"Part no., OE no. or vehicle":"Search Stravik no., OE or cross-reference no., vehicle or engine"}" value="${esc(q)}">
        <button type="button" class="fs-x" id="fqx" aria-label="Clear search"${q?"":" hidden"}>×</button></label>
      <span class="fs-hint">For example SV-OFL-0001, 17801-0L040, Z212, Hilux or 2.2 TD</span></div>
    <div class="fbar"><div class="fbar-l"><label class="sr" for="fmk">Vehicle make</label><select id="fmk"><option value="">All makes</option></select><p class="fcount" id="fcount" aria-live="polite"></p></div>
      <div class="vtoggle" role="group" aria-label="Show filters as"><button type="button" data-v="list" aria-pressed="${view==="list"}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M2 8h12M2 12.5h12"/></svg>List</button><button type="button" data-v="cards" aria-pressed="${view==="cards"}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>Cards</button></div></div>
    <div id="flist"><p class="loading">Loading filters…</p></div></div></div>`;
  loadFilters().then(d=>{
    const T=d.types.find(t=>t[1]===slugT);const code=T?T[0]:"";
    if(T){app.querySelector(".pagehead h1").textContent=T[2];app.querySelector(".crumbs").innerHTML=`<a href="#/">Home</a><span>/</span><a href="#/products/filters">Filters</a><span>/</span><a href="#/filters">Catalogue</a><span>/</span><span>${esc(T[2])}</span>`;document.title=T[2]+" | Stravik";}
    app.querySelector("#ftabs").innerHTML=`<a href="#/filters" aria-current="${!T}">All filters</a>`+d.types.map(t=>`<a href="#/filters/${t[1]}" aria-current="${t===T}">${esc(t[2])}</a>`).join("");
    app.querySelector("#fnav").innerHTML=`<h4>Filter types</h4><a href="#/filters" aria-current="${!T}">All filters<span>${d.items.length}</span></a>`+d.types.map(t=>`<a href="#/filters/${t[1]}" aria-current="${t===T}">${esc(t[2])}<span>${FCOUNT(d,t[0])}</span></a>`).join("");
    const sel=app.querySelector("#fmk"),inp=app.querySelector("#fq"),list=app.querySelector("#flist"),qx=app.querySelector("#fqx");
    const showX=()=>{qx.hidden=!inp.value;};
    qx.addEventListener("click",()=>{inp.value="";q="";showX();shown=STEP();sync();draw();inp.focus();});
    inp.addEventListener("keydown",e=>{if(e.key==="Escape"&&inp.value){e.preventDefault();qx.click();}});
    sel.innerHTML+=d.makes.map(m=>`<option ${m===mk?"selected":""}>${esc(m)}</option>`).join("");
    const draw=()=>{
      const res=d.items.filter(i=>(!code||i.t===code)&&(!mk||(i.mk||[]).includes(mk))&&fmatch(i,q));
      app.querySelector("#fcount").textContent=`${res.length} ${res.length===1?"filter":"filters"}`;
      const page=res.slice(0,shown);
      list.innerHTML=res.length?(view==="list"
        ?`<div class="ftable-wrap"><table class="ftable"><thead><tr><th>Stravik no.</th><th>Filter</th><th>Fits</th><th>OE / ref. numbers</th><th><span class="sr">Cart</span></th></tr></thead><tbody>${page.map(i=>frow(d,i,q)).join("")}</tbody></table></div>`
        :`<div class="fgrid">${page.map(i=>fcard(d,i,q)).join("")}</div>`)+(res.length>shown?`<div class="more"><button type="button" class="btn line" id="fmore">Show more (${res.length-shown} left)</button></div>`:""):
        `<div class="noresults"><p>No filters match${q?` “${esc(q)}”`:""}${mk?` for ${esc(mk)}`:""}.</p><p style="margin-top:8px">Send us the OE number or the vehicle and we'll check for you.</p><p style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn line" id="fclear">Clear search</button><a class="btn gold" href="#/contact?part=${encodeURIComponent(T?T[2]:"Oil filters")}">Ask us</a></p></div>`;
      const more=list.querySelector("#fmore");if(more)more.onclick=()=>{shown+=STEP();draw();};
      const clr=list.querySelector("#fclear");if(clr)clr.onclick=()=>{q="";mk="";inp.value="";sel.value="";showX();sync();draw();inp.focus();};
    };
    const sync=()=>{const p=new URLSearchParams();if(q)p.set("q",q);if(mk)p.set("make",mk);history.replaceState(null,"","#/filters"+(T?"/"+T[1]:"")+(p.toString()?"?"+p:""));};
    let t;inp.addEventListener("input",()=>{showX();clearTimeout(t);t=setTimeout(()=>{q=inp.value.trim();shown=STEP();sync();draw();},150);});
    sel.addEventListener("change",()=>{mk=sel.value;shown=STEP();sync();draw();});
    app.querySelectorAll(".vtoggle button").forEach(b=>b.addEventListener("click",()=>{
      if(view===b.dataset.v)return;view=b.dataset.v;shown=STEP();
      try{localStorage.setItem("stravik-fview",view);}catch(e){}
      app.querySelectorAll(".vtoggle button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===view));draw();}));
    list.addEventListener("click",e=>{if(e.target.closest("a,button,input"))return;const tr=e.target.closest("tr[data-href]");if(tr)location.href=tr.dataset.href;});
    draw();
  }).catch(err=>{app.querySelector("#flist").innerHTML=`<div class="noresults"><p>The filter list didn't load (${esc(err.message)}). Refresh the page to try again.</p></div>`;});
}
// ---------- cart page and request for price ----------
function makeRef(){
  const d=new Date(),p=n=>String(n).padStart(2,"0"),chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",r=new Uint32Array(4);
  crypto.getRandomValues(r);let s="";for(let i=0;i<4;i++)s+=chars[r[i]%chars.length];
  return "STV-"+String(d.getFullYear()).slice(2)+p(d.getMonth()+1)+p(d.getDate())+"-"+s;
}
function cartPage(){
  const items=Cart.items();
  app.innerHTML=`<div class="pagehead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>Cart</span></div><h1>Your cart</h1>
    <p>${items.length?"Check the parts and quantities, then send us your details. We'll reply with prices and availability.":"Add filters from the catalogue, or brake, steering and suspension parts from our products, then request a price."}</p></div></div>
  <div class="wrap cartwrap">
    <section class="panel" aria-labelledby="ptitle"><div class="panel-head"><h2 id="ptitle">Parts <span class="muted" id="pcount"></span></h2>${items.length?`<button type="button" class="linkbtn" id="cclear">Remove all</button>`:""}</div>
      <div id="citems"></div>
      ${items.length?`<div class="cfoot"><a href="#/filters">← Add more from the filter catalogue</a> · <a href="#/products">Browse products</a></div>`:""}</section>
    ${items.length?`<section class="panel" aria-labelledby="ftitle"><div class="panel-head"><h2 id="ftitle">Request for price</h2></div>
      <form class="enq" id="rfp" novalidate>
        <div><label for="rn">Full name</label><input id="rn" autocomplete="name" required><div class="err">Enter your name.</div></div>
        <div><label for="rc">Company</label><input id="rc" autocomplete="organization"></div>
        <div><label for="re">Email</label><input id="re" type="email" autocomplete="email" required><div class="err">Enter an email address like name@company.com.</div></div>
        <div><label for="rp">Phone / WhatsApp</label><input id="rp" type="tel" autocomplete="tel" placeholder="+971 50 123 4567" required><div class="err">Enter a phone number.</div></div>
        <div><label for="rco">Country</label><input id="rco" autocomplete="country-name" required><div class="err">Enter your country.</div></div>
        <div><label for="rt">I am a</label><select id="rt"><option>Distributor</option><option>Parts store</option><option>Workshop</option><option>Fleet operator</option><option>Other</option></select></div>
        <div class="full"><label for="rm">Message (optional)</label><textarea id="rm" placeholder="Delivery location, target price, anything else we should know."></textarea></div>
        <input type="checkbox" id="rbot" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
        <div class="full"><button class="btn gold" type="submit" id="rsend">Send request</button></div>
        <p class="note">Your request goes to our sales team at ${EMAIL}.</p>
        <div class="status" id="rstatus" role="alert"></div>
      </form></section>`:""}
  </div>`;
  renderItems();
  const clr=app.querySelector("#cclear");
  if(clr)clr.addEventListener("click",()=>{if(confirm("Remove all parts from your cart?")){Cart.clear();cartPage();}});
  const box=app.querySelector("#citems");
  box.addEventListener("change",e=>{const tr=e.target.closest("tr.item");if(!tr)return;
    if(e.target.matches(".qty input")){const q=clampQty(e.target.value);e.target.value=q;Cart.set(tr.dataset.key,"qty",q);}});
  box.addEventListener("input",e=>{const tr=e.target.closest("tr.item");if(tr&&e.target.matches(".note"))Cart.set(tr.dataset.key,"note",e.target.value);});
  box.addEventListener("click",e=>{const b=e.target.closest(".rm button");if(!b)return;Cart.remove(b.closest("tr.item").dataset.key);
    if(!Cart.items().length)cartPage();else renderItems();});
  const form=app.querySelector("#rfp");if(form)wireRfp(form);
}
function renderItems(){
  const items=Cart.items(),box=app.querySelector("#citems");
  app.querySelector("#pcount").textContent=items.length?`(${items.length})`:"";
  if(!items.length){box.innerHTML=`<div class="cempty"><p>Your cart is empty.</p><div class="row"><a class="btn gold" href="#/filters">Filter catalogue</a><a class="btn line" href="#/products">Browse products</a></div><p style="margin:18px 0 0">Need something else? <a href="#/contact" style="color:var(--gold-deep)">Send us an enquiry</a>.</p></div>`;return;}
  const groups={},order=[];items.forEach(it=>{const c=it.cat||"Other";if(!groups[c]){groups[c]=[];order.push(c);}groups[c].push(it);});
  box.innerHTML=`<table class="ctable"><thead><tr><th>Part</th><th>Details</th><th>Qty</th><th><span class="sr">Remove</span></th></tr></thead><tbody>`+
    order.map(c=>`<tr class="catrow"><td colspan="4">${esc(c)}</td></tr>`+groups[c].map(it=>`<tr class="item" data-key="${esc(it.key)}">
      <td class="no">${it.link?`<a href="${esc(it.link)}">${esc(it.no||it.name)}</a>`:esc(it.no||it.name)}</td>
      <td class="dsc">${it.no?esc(it.desc):`<label class="nlbl" for="n-${esc(it.key)}">Vehicle or OE number</label><input class="note" id="n-${esc(it.key)}" value="${esc(it.note||"")}" placeholder="e.g. Toyota Hilux 2016 or 04465-0K290">`}</td>
      <td class="qty"><input type="number" min="1" max="99999" inputmode="numeric" value="${it.qty||1}" aria-label="Quantity for ${esc(it.no||it.name)}"></td>
      <td class="rm"><button type="button" class="linkbtn" aria-label="Remove ${esc(it.no||it.name)}">Remove</button></td></tr>`).join("")).join("")+`</tbody></table>`;
}
function wireRfp(form){
  const $=id=>form.querySelector("#"+id),btn=$("rsend"),st=$("rstatus");
  form.addEventListener("submit",async ev=>{
    ev.preventDefault();
    const items=Cart.items(),v=id=>$(id).value.trim();
    const checks=[["rn",x=>x.length>0],["re",x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)],["rp",x=>x.replace(/\D/g,"").length>=6],["rco",x=>x.length>0]];
    let first=null;checks.forEach(([id,ok])=>{const el=$(id),good=ok(el.value.trim());el.classList.toggle("invalid",!good);if(!good&&!first)first=el;});
    if(first){first.focus();return;}
    if(!items.length){cartPage();return;}
    const ref=makeRef(),qty=items.reduce((s,it)=>s+(parseInt(it.qty,10)||1),0),who=v("rc")||v("rn");
    const partsText=items.map((it,n)=>`${n+1}. ${it.no?it.no+"  |  "+it.desc:it.name+"  |  "+it.cat+(it.note?"  |  Vehicle / OE: "+it.note:"")}  |  Qty ${it.qty}`).join("\n");
    const subject=`Stravik RFP ${ref} | ${items.length} line${items.length===1?"":"s"} | ${who}`;
    const bodyText=`Inquiry No.: ${ref}\nName: ${v("rn")}\nCompany: ${v("rc")}\nEmail: ${v("re")}\nPhone: ${v("rp")}\nCountry: ${v("rco")}\nI am a: ${v("rt")}\n\nParts (${items.length} lines, ${qty} pcs):\n${partsText}\n\nMessage:\n${v("rm")||"-"}`;
    btn.disabled=true;btn.textContent="Sending…";st.classList.remove("show");
    try{
      const r=await fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({access_key:W3F_KEY,subject,from_name:"Stravik website",replyto:v("re"),botcheck:$("rbot").checked,
          "Inquiry number":ref,name:v("rn"),company:v("rc"),email:v("re"),phone:v("rp"),country:v("rco"),customer_type:v("rt"),
          parts_count:`${items.length} lines, ${qty} pcs`,parts:partsText,message:v("rm")||"-"})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.success)throw new Error(j.message||("Status "+r.status));
      const name=v("rn").split(" ")[0],email=v("re");
      Cart.clear();thanks(ref,name,email);
    }catch(err){
      const href=`mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      st.innerHTML=`<b>Your request wasn't sent.</b> Check your connection and try again, or <a href="${href}">email it to ${EMAIL}</a> instead. Your cart has been kept.<br><small>Details: ${esc(err.message||"Could not reach the form service")}</small>`;
      st.classList.add("show");btn.disabled=false;btn.textContent="Send request";
    }
  });
}
function thanks(ref,name,email){
  app.innerHTML=`<div class="wrap"><section class="thanks" aria-labelledby="tyh">
    <div class="tick" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h1 id="tyh" tabindex="-1">Thank you${name?", "+esc(name):""}</h1>
    <p>Your request for price has been received.</p>
    <div class="refbox"><span>Your inquiry number</span><strong>${esc(ref)}</strong><button type="button" id="cref">Copy</button></div>
    <p>Our sales team will reply to <b style="color:var(--ink)">${esc(email)}</b>. Please quote this number in any correspondence.</p>
    <div class="row"><a class="btn gold" href="#/filters">Back to the filter catalogue</a><a class="btn line" href="#/">Home</a></div></section></div>`;
  toastEl.classList.remove("show");window.scrollTo(0,0);app.querySelector("#tyh").focus();
  app.querySelector("#cref").addEventListener("click",function(){const b=this;(navigator.clipboard?navigator.clipboard.writeText(ref):Promise.reject()).then(()=>{b.textContent="Copied";},()=>{b.textContent="Write it down: "+ref;});});
}

// ---------- steering & suspension catalogue ----------
// Data: steering-suspension.json, published from Supabase (tables stravik_ss_*, function stravik_ss_catalogue()).
// parts: [sv_pn, type, ctr_no, [old ctr], position, [oe], oe_hidden_count, [[make index, vehicle, model code, years]]]
const SSI={};SS_TYPES.forEach(t=>SSI[t[0]]={code:t[0],one:t[1],many:t[2],group:t[3],icon:t[4],slug:slug(t[2])});
const SS_GROUPS=["Suspension","Steering","Mountings"];
let SSP=null;
function loadSS(){
  return SSP||(SSP=fetch("/steering-suspension.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("Status "+r.status);return r.json();}).then(raw=>{
    const d={at:raw.at,makes:raw.makes.map(m=>({name:m[0],region:m[1],label:MKL[m[0]]||m[0]}))};
    d.items=raw.parts.map(p=>{
      const it={pn:p[0],t:p[1],ctr:p[2]||"",old:p[3]||[],pos:p[4]||"",oe:p[5]||[],hid:p[6]||0,apps:(p[7]||[]).map(a=>({mk:a[0],veh:a[1]||"",mc:a[2]||"",yr:a[3]||""}))};
      it.mks=[...new Set(it.apps.map(a=>a.mk))];
      it.keys=[fclean(it.pn),fclean(it.ctr)].concat(it.old.map(fclean),it.oe.map(fclean));
      const T=SSI[it.t]||{one:"",many:""};
      it.text=[T.one,T.many,it.pos].concat(it.mks.map(i=>d.makes[i].name+" "+d.makes[i].label),it.apps.map(a=>a.veh+" "+a.mc+" "+a.yr)).join(" ").toLowerCase();
      return it;});
    d.byPn={};d.items.forEach(i=>d.byPn[i.pn]=i);
    d.count={};d.items.forEach(i=>d.count[i.t]=(d.count[i.t]||0)+1);
    d.mkCount=d.makes.map((m,ix)=>d.items.filter(i=>i.mks.includes(ix)).length);
    return d;
  }).catch(e=>{SSP=null;throw e;}));
}
function ssmatch(i,q){
  if(!q)return true;
  const c=fclean(q);
  if(c.length>=3&&i.keys.some(k=>k.includes(c)))return true;
  const words=q.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every(w=>i.text.includes(w)||(fclean(w).length>=2&&i.keys.some(k=>k.includes(fclean(w)))));
}
const ssCase=t=>{t=String(t||"").replace(/[A-Z]{3,}/g,w=>w.toLowerCase());return t.charAt(0).toUpperCase()+t.slice(1);};
const ssPos=i=>ssCase(i.pos);
const ssDesc=i=>(SSI[i.t]?SSI[i.t].one:"")+(i.pos?", "+ssCase(i.pos).replace(/^./,c=>c.toLowerCase()):"");
const ssItem=i=>({key:i.pn,no:i.pn,cat:"Steering & Suspension",desc:ssDesc(i),link:"/part/"+i.pn+"/",kind:"ss"});
function ssHits(i,q){const c=fclean(q);return c.length>=3?i.oe.filter(n=>fclean(n).includes(c)):[];}
function ssNums(i,q,max){
  const hit=ssHits(i,q),nums=hit.concat(i.oe.filter(n=>!hit.includes(n))),shown=nums.slice(0,max),more=nums.length-shown.length+(i.hid||0);
  return shown.length?shown.map(n=>`<span class="n">${hit.includes(n)?`<mark>${esc(n)}</mark>`:esc(n)}</span>`).join(", ")+(more>0?` <span class="n">+${more} more</span>`:""):"";
}
function ssFits(d,i,mkIx){
  const apps=mkIx>=0?i.apps.filter(a=>a.mk===mkIx):i.apps;
  const vehs=[...new Set(apps.map(a=>a.veh).filter(Boolean))];
  const makes=(mkIx>=0?[mkIx]:i.mks).map(x=>d.makes[x].label);
  return {makes:makes.slice(0,3).join(", ")+(makes.length>3?` +${makes.length-3} more`:""),vehs:vehs.slice(0,3).join(", ")+(vehs.length>3?` +${vehs.length-3} more`:"")};
}
function ssCtr(i,q){const c=fclean(q),hitOld=c.length>=3?i.old.filter(n=>fclean(n).includes(c)):[];const cur=c.length>=3&&fclean(i.ctr).includes(c)?`<mark>${esc(i.ctr)}</mark>`:esc(i.ctr);
  return `<b>${cur}</b>`+(hitOld.length?`<span>${hitOld.map(n=>`<mark>${esc(n)}</mark>`).join(", ")}</span>`:(i.old.length?`<span>${esc(i.old.slice(0,2).join(", "))}${i.old.length>2?" …":""}</span>`:""));}
function ssCartBtn(i,cls){const on=Cart.has(i.pn);
  return `<button type="button" class="fadd${cls?" "+cls:""}" data-cart-key="${esc(i.pn)}" data-item="${esc(JSON.stringify(ssItem(i)))}" data-on="${on}" aria-label="${on?"Remove":"Add"} ${esc(i.pn)} ${on?"from":"to"} cart">${on?"✓ In cart":"Add to cart"}</button>`;}
function ssrow(d,i,q,mkIx){
  const f=ssFits(d,i,mkIx),T=SSI[i.t]||{one:""};
  return `<tr data-href="/part/${esc(i.pn)}/"><td class="fpn"><a href="/part/${esc(i.pn)}/">${esc(i.pn)}</a></td>`+
    `<td class="fty"><b>${esc(T.one)}</b>${i.pos?` <span>${esc(ssPos(i))}</span>`:""}</td>`+
    `<td class="fctr">${ssCtr(i,q)}</td>`+
    `<td class="fveh">${f.makes?`<b class="fmk">${esc(f.makes)}</b>`:""}${f.vehs?` ${esc(f.vehs)}`:""}</td>`+
    `<td class="fnum">${ssNums(i,q,3)}</td>`+
    `<td class="fact">${ssCartBtn(i,"inline")}</td></tr>`;
}
function sscard(d,i,q,mkIx){
  const f=ssFits(d,i,mkIx),T=SSI[i.t]||{one:"",icon:"kit"},nums=ssNums(i,q,4);
  return `<div class="fcell"><a class="fcard" href="/part/${esc(i.pn)}/"><span class="ic">${icon(T.icon)}</span><span class="pn">${esc(i.pn)}</span><span class="ty">${esc(ssDesc(i))}</span>`+
    `<span class="veh"><b>CTR</b> ${esc(i.ctr)}${i.old.length?" ("+esc(i.old.slice(0,2).join(", "))+")":""}</span>`+
    (f.makes?`<span class="veh"><b>Fits</b> ${esc(f.makes)}${f.vehs?": "+esc(f.vehs):""}</span>`:"")+
    (nums?`<span class="nums"><b>OE</b> ${nums}</span>`:"")+`</a>${ssCartBtn(i)}</div>`;
}
function ssOverview(){
  app.innerHTML=`<div class="pagehead"><div class="wrap">
    <div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Our products</a><span>/</span><span>Steering &amp; Suspension</span></div>
    <h1>Steering &amp; Suspension</h1><p>Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts with extensive vehicle coverage, each with its CTR and OE cross-references.</p>
    <div class="tabs" role="list">${prodTabs("steering-suspension")}</div></div></div>
  <section class="fband"><div class="wrap">
    <div><div class="kicker">Catalogue</div><h2>Steering &amp; suspension catalogue</h2><p id="sov-lede">Every part with its Stravik number, CTR number, OE numbers and the vehicles it fits.</p>
      <div style="margin-top:22px"><a class="btn gold" href="#/steering">Open the catalogue</a></div></div>
    <form id="sovq" role="search"><label for="sovi">Search the catalogue</label><div class="field"><input id="sovi" type="search" autocomplete="off" placeholder="Stravik, CTR or OE number, or vehicle"><button type="submit">Search</button></div><small>For example SVBJ0087, CB0378, 43330-29115 or Hilux</small></form>
  </div></section>
  <section class="block"><div class="wrap" id="sov-body"><p class="loading">Loading the catalogue…</p></div></section>`;
  app.querySelector("#sovq").addEventListener("submit",e=>{e.preventDefault();const q=app.querySelector("#sovi").value.trim();location.hash="#/steering"+(q?"?q="+encodeURIComponent(q):"");});
  loadSS().then(d=>{
    app.querySelector("#sov-lede").textContent=`All ${d.items.length.toLocaleString("en-US")} parts with their Stravik number, CTR number, OE numbers and the vehicles they fit.`;
    const typeCards=g=>SS_TYPES.filter(t=>t[3]===g&&d.count[t[0]]).map(t=>{const T=SSI[t[0]],n=d.count[t[0]];return `<a class="card" href="#/steering/${T.slug}"><span class="ic">${icon(T.icon)}</span><h3>${esc(T.many)}</h3><p>View in the catalogue</p></a>`;}).join("");
    const regions=[...new Set(d.makes.map(m=>m.region))];
    app.querySelector("#sov-body").innerHTML=SS_GROUPS.map(g=>`<div class="group"><h2>${g}<span>${SS_TYPES.filter(t=>t[3]===g).reduce((s,t)=>s+(d.count[t[0]]||0),0).toLocaleString("en-US")} parts</span></h2><div class="grid">${typeCards(g)}</div></div>`).join("")+
      `<div class="group" style="margin-bottom:0"><h2>Search by vehicle make<span>${d.makes.length} makes</span></h2>`+
      regions.map(r=>`<h3 class="mkreg">${esc(r.charAt(0).toUpperCase()+r.slice(1))}</h3><div class="mkgrid">${d.makes.map((m,ix)=>m.region===r?`<a class="mk" href="#/steering?make=${encodeURIComponent(m.name)}">${esc(m.label)}<span>${d.mkCount[ix].toLocaleString("en-US")}</span></a>`:"").join("")}</div>`).join("")+`</div>`;
  }).catch(err=>{app.querySelector("#sov-body").innerHTML=`<div class="noresults"><p>The catalogue didn't load (${esc(err.message)}). Refresh the page to try again.</p></div>`;});
}
function ssPage(slugT,params){
  let q=params.get("q")||"",mkName=params.get("make")||"",view="list";
  try{if(localStorage.getItem("stravik-fview")==="cards")view="cards";}catch(e){}
  const STEP=()=>view==="list"?100:48;let shown=STEP();
  const T0=SS_TYPES.find(t=>slug(t[2])===slugT);let code=T0?T0[0]:"";
  app.innerHTML=`<div class="pagehead fhead"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products/steering-suspension">Steering &amp; Suspension</a><span>/</span><span>Catalogue</span></div><h1>Steering &amp; suspension catalogue</h1>
    <p>Search by Stravik, CTR or OE number, vehicle or model code, or pick a make and part type.</p></div></div>
    <div class="wrap catalog"><aside class="side fside"><nav aria-label="Part types" class="ftypes-nav" id="snav"></nav></aside>
    <div><div class="fsearch" role="search">
      <label class="fs-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sr">Search the steering and suspension catalogue</span>
        <input id="sq" type="search" autocomplete="off" spellcheck="false" placeholder="${matchMedia("(max-width:600px)").matches?"Part, CTR or OE no., or vehicle":"Search Stravik, CTR or OE no., vehicle or model code"}" value="${esc(q)}">
        <button type="button" class="fs-x" id="sqx" aria-label="Clear search"${q?"":" hidden"}>×</button></label>
      <span class="fs-hint">For example SVBJ0087, CB0378, 43330-29115, Hilux or KF40</span></div>
    <div class="fbar"><div class="fbar-l"><label class="sr" for="smk">Vehicle make</label><select id="smk"><option value="">All makes</option></select>
      <label class="sr" for="sty">Part type</label><select id="sty"><option value="">All part types</option></select><p class="fcount" id="scount" aria-live="polite"></p></div>
      <div class="vtoggle" role="group" aria-label="Show parts as"><button type="button" data-v="list" aria-pressed="${view==="list"}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M2 8h12M2 12.5h12"/></svg>List</button><button type="button" data-v="cards" aria-pressed="${view==="cards"}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>Cards</button></div></div>
    <div id="slist"><p class="loading">Loading the catalogue…</p></div></div></div>`;
  loadSS().then(d=>{
    const inp=app.querySelector("#sq"),qx=app.querySelector("#sqx"),smk=app.querySelector("#smk"),sty=app.querySelector("#sty"),list=app.querySelector("#slist");
    let mkIx=d.makes.findIndex(m=>m.name===mkName);
    const regions=[...new Set(d.makes.map(m=>m.region))];
    smk.innerHTML=`<option value="">All makes</option>`+regions.map(r=>`<optgroup label="${esc(r.charAt(0).toUpperCase()+r.slice(1))}">${d.makes.map((m,ix)=>m.region===r?`<option value="${ix}"${ix===mkIx?" selected":""}>${esc(m.label)}</option>`:"").join("")}</optgroup>`).join("");
    sty.innerHTML=`<option value="">All part types</option>`+SS_GROUPS.map(g=>`<optgroup label="${g}">${SS_TYPES.filter(t=>t[3]===g&&d.count[t[0]]).map(t=>`<option value="${t[0]}"${t[0]===code?" selected":""}>${esc(t[2])}</option>`).join("")}</optgroup>`).join("");
    const nav=()=>{app.querySelector("#snav").innerHTML=`<h4>Part types</h4><a href="#/steering" aria-current="${!code}">All parts<span>${d.items.length.toLocaleString("en-US")}</span></a>`+
      SS_GROUPS.map(g=>`<h4 style="margin-top:14px">${g}</h4>`+SS_TYPES.filter(t=>t[3]===g&&d.count[t[0]]).map(t=>`<a href="#/steering/${SSI[t[0]].slug}" aria-current="${t[0]===code}">${esc(t[2])}<span>${d.count[t[0]].toLocaleString("en-US")}</span></a>`).join("")).join("");};
    const head=()=>{const T=SSI[code];app.querySelector(".pagehead h1").textContent=T?T.many:"Steering & suspension catalogue";
      app.querySelector(".crumbs").innerHTML=`<a href="#/">Home</a><span>/</span><a href="#/products/steering-suspension">Steering &amp; Suspension</a><span>/</span>`+(T?`<a href="#/steering">Catalogue</a><span>/</span><span>${esc(T.many)}</span>`:`<span>Catalogue</span>`);
      document.title=(T?T.many:"Steering & suspension catalogue")+" | Stravik";};
    const showX=()=>{qx.hidden=!inp.value;};
    const sync=()=>{const p=new URLSearchParams();if(q)p.set("q",q);if(mkIx>=0)p.set("make",d.makes[mkIx].name);history.replaceState(null,"","#/steering"+(code?"/"+SSI[code].slug:"")+(p.toString()?"?"+p:""));};
    const draw=()=>{
      const res=d.items.filter(i=>(!code||i.t===code)&&(mkIx<0||i.mks.includes(mkIx))&&ssmatch(i,q));
      app.querySelector("#scount").textContent=`${res.length.toLocaleString("en-US")} ${res.length===1?"part":"parts"}`;
      const page=res.slice(0,shown);
      list.innerHTML=res.length?(view==="list"
        ?`<div class="ftable-wrap"><table class="ftable ss"><thead><tr><th>Stravik no.</th><th>Part</th><th>CTR no.</th><th>Fits</th><th>OE numbers</th><th><span class="sr">Cart</span></th></tr></thead><tbody>${page.map(i=>ssrow(d,i,q,mkIx)).join("")}</tbody></table></div>`
        :`<div class="fgrid">${page.map(i=>sscard(d,i,q,mkIx)).join("")}</div>`)+
        (res.length>shown?`<div class="more"><button type="button" class="btn line" id="smore">Show more (${(res.length-shown).toLocaleString("en-US")} left)</button></div>`:""):
        `<div class="noresults"><p>No parts match${q?` “${esc(q)}”`:""}${mkIx>=0?` for ${esc(d.makes[mkIx].label)}`:""}${code?` in ${esc(SSI[code].many.toLowerCase())}`:""}.</p><p style="margin-top:8px">Send us the OE or CTR number, or the vehicle, and we'll check for you.</p><p style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn line" id="sclear">Clear search</button><a class="btn gold" href="#/contact?part=${encodeURIComponent(code?SSI[code].one:"")}">Ask us</a></p></div>`;
      const more=list.querySelector("#smore");if(more)more.onclick=()=>{shown+=STEP();draw();};
      const clr=list.querySelector("#sclear");if(clr)clr.onclick=()=>{q="";mkIx=-1;code="";inp.value="";smk.value="";sty.value="";showX();nav();head();sync();draw();inp.focus();};
    };
    nav();head();
    qx.addEventListener("click",()=>{inp.value="";q="";showX();shown=STEP();sync();draw();inp.focus();});
    inp.addEventListener("keydown",e=>{if(e.key==="Escape"&&inp.value){e.preventDefault();qx.click();}});
    let t;inp.addEventListener("input",()=>{showX();clearTimeout(t);t=setTimeout(()=>{q=inp.value.trim();shown=STEP();sync();draw();},180);});
    smk.addEventListener("change",()=>{mkIx=smk.value===""?-1:+smk.value;shown=STEP();sync();draw();});
    sty.addEventListener("change",()=>{code=sty.value;shown=STEP();nav();head();sync();draw();});
    app.querySelector("#snav").addEventListener("click",e=>{const a=e.target.closest("a");if(!a)return;e.preventDefault();const s=a.getAttribute("href").split("/")[2]||"";const T=SS_TYPES.find(x=>slug(x[2])===s);code=T?T[0]:"";sty.value=code;shown=STEP();nav();head();sync();draw();});
    app.querySelectorAll(".vtoggle button").forEach(b=>b.addEventListener("click",()=>{
      if(view===b.dataset.v)return;view=b.dataset.v;shown=STEP();
      try{localStorage.setItem("stravik-fview",view);}catch(e){}
      app.querySelectorAll(".vtoggle button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===view));draw();}));
    list.addEventListener("click",e=>{if(e.target.closest("a,button,input"))return;const tr=e.target.closest("tr[data-href]");if(tr)location.href=tr.dataset.href;});
    draw();
  }).catch(err=>{app.querySelector("#slist").innerHTML=`<div class="noresults"><p>The catalogue didn't load (${esc(err.message)}). Refresh the page to try again.</p></div>`;});
}
// old steering & suspension product pages now live in the catalogue
const OLD_SS={"ball-joints":"ball-joints","tie-rod-ends":"tie-rod-ends","control-arms":"control-arms","wishbone-arms":"control-arms","trailing-arms":"control-arms","sway-bar-links":"stabiliser-links","anti-roll-bar-drop-links":"stabiliser-links","stabilizer-bar":"stabiliser-links","bushings":"bushes","sway-bar-bushings":"bushes","subframe-bushings":"bushes","engine-cradle-bushings":"bushes","strut-mount-top-mount":"strut-mounts","strut-bearing-mount":"strut-mounts","track-rod-drag-link":"drag-links","steering-rack":"rack-ends","steering-gear-box":"other-steering-parts","struts":"","springs":"","coilover-assembly":"","spring-seat":"","air-suspension-valve":"","bump-stop-jounce-bumper":"","steering-column":"","steering-shaft-intermediate-shaft":"inner-shafts","steering-pump":"","power-steering-reservoir":"","power-steering-hose":"","electronic-power-steering-eps-motor":"","radius-rods":"","panhard-rod":"","lateral-links":"","camber-kit":""};

function notFound(){app.innerHTML=`<div class="pagehead"><div class="wrap"><h1>Page not found</h1><p>That page doesn't exist. <a href="#/products" style="color:var(--gold-deep)">Browse our products</a> or <a href="#/" style="color:var(--gold-deep)">go to the home page</a>.</p></div></div>`;}

function route(){
  const raw=location.hash.replace(/^#/,"")||"/";
  const [path,qs]=raw.split("?");const params=new URLSearchParams(qs||"");
  const parts=path.split("/").filter(Boolean);
  let key="home";
  if(!parts.length)home();
  else if(parts[0]==="find"){key="find";findPage(params);}
  else if(parts[0]==="request"){key="find";requestPage(params);}
  else if(parts[0]==="new"){key="new";newPage();}
  else if(parts[0]==="where-to-buy"){key="where";wherePage(params);}
  else if(parts[0]==="about"){key="about";about();}
  else if(parts[0]==="products"){key="products";products(parts[1],parts[2],params.get("q"));}
  else if(parts[0]==="product"){key="products";product(parts[1],params);}
  else if(parts[0]==="contact"){key="contact";contact(params);}
  else if(parts[0]==="cart"){key="cart";cartPage();}
  else if(parts[0]==="filters"){key="filters";filtersPage(parts[1],params);}
  else if(parts[0]==="filter"&&parts[1]){location.replace(filterUrl(decodeURIComponent(parts[1])));return;}
  else if(parts[0]==="steering"){key="steering";ssPage(parts[1],params);}
  else if(parts[0]==="part"&&parts[1]){location.replace(partUrl(decodeURIComponent(parts[1])));return;}
  else notFound();
  document.querySelectorAll("nav.main a").forEach(a=>{if(a.dataset.nav===key)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  const inProducts=key==="products"||key==="filters"||key==="steering";if(inProducts)ddBtn.setAttribute("aria-current","page");else ddBtn.removeAttribute("aria-current");
  ddSet(false);cartPaint();
  nav.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");
  if(!(parts[0]==="products"&&parts[2]))window.scrollTo(0,0);
  const titles={home:"Stravik | Auto Parts: find a part by number or vehicle",find:"Find a part | Stravik",new:"New to range | Stravik",where:"Where to buy | Stravik",about:"About us | Stravik",products:"Our products | Stravik",contact:"Contact us | Stravik",filters:"Filter catalogue | Stravik",steering:"Steering & suspension catalogue | Stravik",cart:"Your cart | Stravik"};
  if(parts[0]==="products"&&parts[1]==="filters")document.title="Filters | Stravik";else if(parts[0]==="products"&&parts[1]==="steering-suspension")document.title="Steering & Suspension | Stravik";else if(parts[0]==="request")document.title="Can't find your part? | Stravik";else if(!["filter","steering","part","find"].includes(parts[0]))document.title=parts[0]==="product"&&byId(parts[1])?byId(parts[1]).name+" | Stravik":titles[key];
}
addEventListener("hashchange",route);route();
})();
