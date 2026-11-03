// Stravik standard e-catalogue: one page layout for every product range, laid out like the Lucas MEA catalogues
// in Stravik colours: banner with the range image, a sticky bar with the search and the filter drop-downs, the part list
// on the left and the selected part's details on the right (full screen on phones).
// A range is a config in CATS. The data file is written by the publish workflow from the database function
// stravik_std_catalogue(<range>) and has the standard shape:
//   { v:1, at, cat, makes:[...], parts:[{ pn, t, d, s:{spec:value}, oe:[...], xr:[...], ap:[[makeIndex, model, years]] }] }
// Part photos (optional): <img>/<Stravik no.>.webp, listed in <img>/index.json.
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const lc=s=>String(s||"").toLowerCase();
const fmt=n=>Number(n).toLocaleString("en-GB");
const PAGE=60;

// ---------------------------------------------------------------- range configs
const CATS={
  "ignition-coils":{
    title:"Ignition coils", one:"coil", many:"coils", cat:"Ignition Coils", data:"/ignition-coils.json",
    crumbs:[["Our products","#/products"]], hero:"/assets/img/ignition-coils/hero.webp",
    lead:"Find the right Stravik ignition coil by Stravik number, OE or cross-reference number, or vehicle.",
    placeholder:"Stravik no., OE no., cross-reference no., or vehicle (e.g. Corolla 1.6)",
    // drop-downs after Make / Model / Year; label, spec name, text for "any"
    filters:[{k:"Vehicle type",h:"Vehicle type",any:"All types"},{k:"Connector",h:"Connector",any:"Any pins",sort:"num"},{k:"Ignition module",h:"Ignition module",any:"Any"}],
    kind:"Ignition coil",
    specLine:s=>[s["Connector"]&&s["Connector"]!=="Not specified"?s["Connector"]+" connector":"Connector to be confirmed",
      s["Ignition module"]&&s["Ignition module"]!=="Not specified"?lc(s["Ignition module"]):""].filter(Boolean).join(", ")
  },
  "bulbs":{
    title:"Bulbs", one:"bulb", many:"bulbs", cat:"Bulbs", data:"/bulbs.json", vehicles:false,
    crumbs:[["Our products","#/products"]],
    lead:"Halogen, miniature, LED and HID xenon bulbs. Find the right Stravik bulb by Stravik number, bulb (e.g. H4, W5W, D1S) or base.",
    placeholder:"Stravik no., bulb (e.g. H4, W5W, D1S) or base (e.g. BA15s)",
    exact:["Bulb","Base"],   // a search that is exactly a bulb or base code shows only those
    filters:[{k:"Bulb type",h:"Technology",any:"All",order:["HALOGEN","HALOGEN MINI","LED","HID"],label:v=>BULB_TECH[v]||v},
      {k:"Bulb",h:"Bulb",any:"All",sort:"alpha"},{k:"Range",h:"Range",any:"All",label:v=>BULB_RANGE[v]?v+" – "+BULB_RANGE[v]:v,sort:"alpha"},
      {k:"Voltage",h:"Voltage",any:"All",sort:"num"},{k:"Base",h:"Base",any:"All",sort:"alpha"}],
    facts:d=>[[d.n.items,"bulbs"],[new Set(d.items.map(i=>i.s["Bulb"]).filter(Boolean)).size,"bulb types"],[new Set(d.items.map(i=>i.s["Base"]).filter(Boolean)).size,"bases"]],
    order:(a,b)=>BULB_ORDER.indexOf(a.s["Bulb type"])-BULB_ORDER.indexOf(b.s["Bulb type"])||a.pn.localeCompare(b.pn),
    title1:i=>(BULB_TECH[i.s["Bulb type"]]||"")+" bulb"+(i.s["Bulb"]?" "+i.s["Bulb"]:""),
    rowLine:i=>[i.s["Voltage"],watt(i.s["Wattage"]),i.s["Base"]].filter(Boolean).join(", "),
    specLine:s=>[BULB_TECH[s["Bulb type"]],bulbRange(s)].filter(Boolean).join(", "),
    rowRight:i=>i.s["Bulb"]||"",
    specs:[["Bulb type","Technology",(v)=>BULB_TECH[v]||v],["Bulb","Bulb"],["Range","Range",(v,s)=>bulbRange(s)+(BULB_RANGE[v]||BULB_HID[v]?" ("+v+")":"")],["Voltage","Voltage"],["Wattage","Wattage",watt],["Base","Base"],["Colour temperature","Colour temperature"],["ECE approval","ECE approval"]]
  }
};
// bulbs: technology and range code names (as in the Lucas bulb catalogue's "reading the range codes")
const BULB_ORDER=["HALOGEN","HALOGEN MINI","LED","HID"];
const BULB_TECH={HALOGEN:"Halogen","HALOGEN MINI":"Halogen mini",LED:"LED",HID:"HID xenon"};
const BULB_RANGE={STD:"Standard",HL:"High Light",LL:"Long Life",VF:"Vibration Free",SF:"Super Fleet",SW:"Super White",SWP:"Super White Plus",YE:"Yellow",SVP:"Super Vision Plus",SUVP:"Super Ultra Vision Plus",SUR:"Super Rally",HLP:"High Performance",HW:"High Wattage"};
const BULB_HID={STD:"Standard white, 4300K",WH:"Intense white, 5000K",RW:"Cool white, 6000K",BW:"Blue white, 8000K"};
const titleCase=v=>String(v||"").toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
function bulbRange(s){const v=s["Range"];if(!v)return "";if(s["Bulb type"]==="HID"&&BULB_HID[v])return BULB_HID[v];return BULB_RANGE[v]||(/^[A-Z0-9 ]+$/.test(v)?titleCase(v):v);}
function watt(v){v=String(v||"");return !v?"":/W$/i.test(v)?v:v+" W";}

// ---------------------------------------------------------------- data
const cache={};
function load(id){
  const c=CATS[id];
  const photos=c.img?fetch(c.img+"index.json").then(r=>r.ok?r.json():[]).catch(()=>[]):Promise.resolve([]);
  if(!cache[id])cache[id]=Promise.all([fetch(c.data).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}),photos])
    .then(([d,ph])=>{d.photos=new Set(ph);return prep(d,c);}).catch(e=>{delete cache[id];throw e;});
  return cache[id];
}
// model text arrives as e.g. "MERCEDES-BENZ A-CLASS 1.4L / 1.6L" and years as "1997-2004", "2011-" or a "|" list
const CAPS=w=>/\d/.test(w)||/^[IVX]+$/.test(w)||w.length<=2&&!/^(MK|DE|LA|LE)$/.test(w)?w:w.charAt(0)+w.slice(1).toLowerCase();
function tidyModel(make,m){
  let s=String(m||"").trim();const mk=make.toUpperCase();
  if(s.toUpperCase().startsWith(mk+" "))s=s.slice(mk.length+1);
  let eng="";const e=/\s((?:\d\.\d+\s?L?|\d{3,4}\s?cc)(?:\s*\/\s*\d\.\d+\s?L?)*.*)$/i.exec(s);
  if(e){eng=e[1].trim();s=s.slice(0,e.index).trim();}
  if(s===s.toUpperCase())s=s.split(/(\s+|-)/).map(w=>/^\s+$|^-$/.test(w)?w:CAPS(w)).join("");
  return [s||"(all models)",eng];
}
function years(y){
  const t=String(y||"");if(!t)return [0,9999,""];
  const parts=t.split("|").map(x=>x.trim()).filter(Boolean);let a=9999,b=0,open=false;
  parts.forEach(p=>{const m=/^(\d{4})\s*[-–]\s*(\d{4})?$/.exec(p)||/^(\d{4})$/.exec(p);if(!m)return;const f=+m[1];a=Math.min(a,f);
    if(m[2])b=Math.max(b,+m[2]);else if(/[-–]\s*$/.test(p))open=true;else b=Math.max(b,f);});
  if(a===9999)return [0,9999,t];
  const to=open?9999:(b||a);
  return [a,to,to===9999?a+" on":to!==a?a+"–"+to:String(a)];
}
function prep(d,c){
  const makes=d.makes;d.items=d.parts||d.items||[];
  d.items.forEach((i,ix)=>{
    i.ix=ix;i.s=i.s||{};i.oe=i.oe||[];i.xr=i.xr||[];i.ph=c.img&&d.photos.has(i.pn)?c.img+i.pn+".webp":"";
    i.apps=(i.ap||[]).map(a=>{const mk=makes[a[0]],[mo,eng]=tidyModel(mk,a[1]),[y0,y1,yl]=years(a[2]);return {mk,mo,eng,y0,y1,yl};});
    i.mks=[...new Set(i.apps.map(a=>a.mk))];
    // model years: the part's "Year from" / "Year to" specs (no "Year to" = still current), else worked out from the vehicles
    const yf=parseInt(i.s["Year from"],10),yt=parseInt(i.s["Year to"],10);delete i.s["Year from"];delete i.s["Year to"];
    if(yf)i.yrs=!yt?yf+" on":yt!==yf?yf+"–"+yt:String(yf);
    else{const ys=i.apps.filter(a=>a.y0),y0=ys.length?Math.min(...ys.map(a=>a.y0)):0,y1=ys.length?Math.max(...ys.map(a=>a.y1)):0;
      i.yrs=!y0?"":y1===9999?y0+" on":y1!==y0?y0+"–"+y1:String(y0);}
    i.text=lc([i.pn,i.d,Object.values(i.s).join(" "),i.apps.map(a=>a.mk+" "+a.mo+" "+a.eng).join(" ")].join(" "));
    i.codes=(c.exact||[]).flatMap(k=>String(i.s[k]||"").split(/\s*,\s*/)).map(clean).filter(Boolean);
  });
  const mkCount={};d.items.forEach(i=>i.mks.forEach(m=>mkCount[m]=(mkCount[m]||0)+1));
  d.mkList=Object.keys(mkCount).sort((a,b)=>a.localeCompare(b));
  d.n={items:d.items.length,makes:d.mkList.length,apps:d.items.reduce((n,i)=>n+i.apps.length,0)};
  return d;
}

// ---------------------------------------------------------------- state <-> url
function readState(params,c){
  const st={q:params.get("q")||"",mk:params.get("mk")||"",mo:params.get("mo")||"",yr:params.get("yr")||"",p:params.get("p")||"",f:{}};
  c.filters.forEach(f=>{const v=params.get("f."+f.k);if(v)st.f[f.k]=v;});
  return st;
}
function writeState(id,st){
  const p=new URLSearchParams();
  ["q","mk","mo","yr"].forEach(k=>{if(st[k])p.set(k,st[k]);});
  Object.keys(st.f).forEach(k=>{if(st.f[k])p.set("f."+k,st.f[k]);});
  if(st.p)p.set("p",st.p);
  const qs=p.toString();history.replaceState(null,"","#/"+id+(qs?"?"+qs:""));
}

// ---------------------------------------------------------------- matching
function numHit(i,q){const c=clean(q);if(c.length<3)return null;
  if(clean(i.pn).includes(c))return {k:"pn"};
  const o=i.oe.find(n=>clean(n).includes(c));if(o)return {k:"OE",v:o};
  const x=i.xr.find(n=>clean(n).includes(c));if(x)return {k:"Cross-reference",v:x};return null;}
function textHit(i,q){const w=lc(q).split(/\s+/).filter(Boolean);return w.length&&w.every(t=>i.text.includes(t));}
function appOk(a,st){return (!st.mk||a.mk===st.mk)&&(!st.mo||a.mo===st.mo)&&(!st.yr||(+st.yr>=a.y0&&+st.yr<=a.y1));}
const yrOk=st=>!st.yr||/^\d{4}$/.test(st.yr);
function pass(i,st,exactQ){
  i._hit=null;
  if(exactQ){if(!i.codes.includes(exactQ)&&!clean(i.pn).includes(exactQ))return false;}
  else if(st.q&&!(i._hit=numHit(i,st.q))&&!textHit(i,st.q))return false;
  if((st.mk||(st.yr&&yrOk(st)))&&!i.apps.some(a=>appOk(a,st)))return false;
  for(const k in st.f){const v=st.f[k];if(v&&i.s[k]!==v)return false;}
  return true;
}

// ---------------------------------------------------------------- page
const IC={
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  part:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/></svg>'
};
const makesText=i=>!i.mks.length?"Vehicle list to follow":i.mks.length<=3?i.mks.join(", "):i.mks.slice(0,3).join(", ")+" and "+(i.mks.length-3)+" more";
function cartBtn(i,c,cls){
  const Cart=window.STV&&STV.Cart,on=Cart&&Cart.has(i.pn);
  const item={key:i.pn,no:i.pn,cat:c.cat,desc:c.title1?c.title1(i)+(c.rowLine?", "+c.rowLine(i):""):i.d,link:"/#/"+c.id+"?p="+i.pn,kind:"std"};
  return `<button type="button" class="fadd ${cls||""}" data-cart-key="${esc(i.pn)}" data-item="${esc(JSON.stringify(item))}" data-on="${!!on}">${on?"✓ In cart":"Add to cart"}</button>`;
}

function page(app,id,params){
  const c=CATS[id];c.id=id;
  const st=readState(params,c);
  document.title=c.title+" catalogue | Stravik";
  app.innerHTML=`<div class="sc">
  <section class="sc-hero"><div class="sc-in">
    <nav class="sc-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a>${c.crumbs.map(x=>`<span>/</span><a href="${x[1]}">${esc(x[0])}</a>`).join("")}<span>/</span><span aria-current="page">${esc(c.title)}</span></nav>
    <div class="sc-hero-g">
      <div class="sc-hero-t">
        <h1>${esc(c.title)}</h1>
        <p class="sc-lead">${esc(c.lead)}</p>
        <div class="sc-facts" id="scFacts"></div>
      </div>
      ${c.hero?`<div class="sc-art"><img src="${esc(c.hero)}" alt="Stravik ${esc(c.title.toLowerCase())} box" width="1200" height="760"></div>`:""}
    </div>
  </div></section>
  <div class="sc-bar" id="scBar"><div class="sc-in">
    <label class="sr" for="scQ">Search ${esc(c.many)}</label>
    <form class="sc-q" role="search" id="scForm">${IC.search}<input id="scQ" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(c.placeholder)}" value="${esc(st.q)}"><button type="button" class="sc-clearq" id="scClearQ"${st.q?"":" hidden"}>Clear</button></form>
    <div class="sc-filters">
      <span class="sc-veh"${c.vehicles===false?" hidden":""}><label>Make<select id="scMk"><option value="">All makes</option></select></label>
      <label>Model<select id="scMo" disabled><option value="">All models</option></select></label>
      <label>Model year<input id="scYr" inputmode="numeric" maxlength="4" placeholder="e.g. 2015" value="${esc(st.yr)}"></label></span>
      ${c.filters.map((f,k)=>`<label>${esc(f.h)}<select data-f="${k}"><option value="">${esc(f.any)}</option></select></label>`).join("")}
      <button type="button" class="sc-reset" id="scReset">Reset</button>
    </div>
  </div></div>
  <div class="sc-in sc-body">
    <section class="sc-res" aria-label="Results">
      <p class="sc-count" id="scCount" aria-live="polite">Loading the catalogue…</p>
      <ol class="sc-list" id="scList"></ol>
      <button type="button" class="sc-more" id="scMore" hidden>Show more</button>
      <aside class="cantfind"><div><h3>Can't find your part?</h3><p>Send us the vehicle, the OE number or a photo reference and we'll check it for you.</p></div><a class="btn gold" href="#/request">Request a part</a></aside>
    </section>
    <aside class="sc-detail" id="scDetail" aria-label="Part details"></aside>
  </div>
  </div>`;
  const $=s=>app.querySelector(s);
  load(id).then(d=>{
    const facts=c.facts?c.facts(d):[[d.n.items,c.many],[d.n.apps,"applications"],[d.n.makes,"vehicle makes"]];
    $("#scFacts").innerHTML=facts.map(f=>`<span><strong>${fmt(f[0])}</strong>${esc(f[1])}</span>`).join("");
    if(c.order)d.items.sort(c.order);
    const allCodes=new Set(d.items.flatMap(i=>i.codes));
    const q=$("#scQ"),mkSel=$("#scMk"),moSel=$("#scMo"),yr=$("#scYr");
    mkSel.insertAdjacentHTML("beforeend",d.mkList.map(m=>`<option>${esc(m)}</option>`).join(""));mkSel.value=st.mk;
    const fillModels=()=>{
      const set=new Set();d.items.forEach(i=>i.apps.forEach(a=>{if(a.mk===st.mk)set.add(a.mo);}));
      moSel.innerHTML=`<option value="">All models</option>`+[...set].sort((a,b)=>a.localeCompare(b)).map(m=>`<option>${esc(m)}</option>`).join("");
      moSel.disabled=!st.mk;moSel.value=st.mo;if(moSel.value!==st.mo)st.mo="";
    };
    fillModels();
    // spec drop-downs: values from the whole range, most common first (or by number)
    app.querySelectorAll("select[data-f]").forEach(sel=>{const f=c.filters[sel.dataset.f],cnt={};
      d.items.forEach(i=>{const v=i.s[f.k];if(v)cnt[v]=(cnt[v]||0)+1;});
      let vals=Object.keys(cnt);
      vals.sort(f.order?(a,b)=>(f.order.indexOf(a)+1||99)-(f.order.indexOf(b)+1||99):f.sort==="num"?(a,b)=>(parseFloat(a)||99)-(parseFloat(b)||99)||a.localeCompare(b)
        :f.sort==="alpha"?(a,b)=>a.localeCompare(b,undefined,{numeric:true}):(a,b)=>cnt[b]-cnt[a]);
      sel.insertAdjacentHTML("beforeend",vals.map(v=>`<option value="${esc(v)}">${esc(f.label?f.label(v):v)}</option>`).join(""));sel.value=st.f[f.k]||"";
      sel.onchange=()=>{if(sel.value)st.f[f.k]=sel.value;else delete st.f[f.k];update(true);};});
    let t=0;
    q.oninput=()=>{$("#scClearQ").hidden=!q.value;clearTimeout(t);t=setTimeout(()=>{st.q=q.value.trim();update(true);},150);};
    $("#scForm").onsubmit=e=>{e.preventDefault();st.q=q.value.trim();update(true);};
    $("#scClearQ").onclick=()=>{q.value="";st.q="";$("#scClearQ").hidden=true;q.focus();update(true);};
    mkSel.onchange=()=>{st.mk=mkSel.value;st.mo="";fillModels();update(true);};
    moSel.onchange=()=>{st.mo=moSel.value;update(true);};
    yr.oninput=()=>{const v=yr.value.replace(/\D/g,"").slice(0,4);if(v!==yr.value)yr.value=v;if(!v||v.length===4){st.yr=v;update(true);}};
    $("#scReset").onclick=()=>{st.q=st.mk=st.mo=st.yr="";st.f={};q.value=yr.value="";mkSel.value="";$("#scClearQ").hidden=true;
      app.querySelectorAll("select[data-f]").forEach(s=>s.value="");fillModels();update(true);};
    const setBarH=()=>app.querySelector(".sc").style.setProperty("--barh",($("#scBar").offsetHeight+74+16)+"px");setBarH();addEventListener("resize",setBarH);

    let list=[],shown=PAGE,cur=null;
    const listEl=$("#scList"),det=$("#scDetail");
    function update(reset){
      if(reset)shown=PAGE;
      const cq=clean(st.q),exactQ=cq&&allCodes.has(cq)?cq:"";
      list=d.items.filter(i=>pass(i,st,exactQ));
      if(st.q)list.sort((a,b)=>(b._hit?1:0)-(a._hit?1:0)||a.pn.localeCompare(b.pn));
      const veh=[st.mk,st.mo,yrOk(st)?st.yr:""].filter(Boolean).join(" ");
      $("#scCount").textContent=!list.length?`No ${c.many} found`:(list.length===d.items.length?`All ${fmt(list.length)} ${c.many}`:`${fmt(list.length)} ${list.length===1?c.one:c.many}`+(veh?` for ${veh}`:st.q?` for “${st.q}”`:""));
      paint();
      if(!cur||!list.includes(cur)){const p=st.p&&list.find(i=>i.pn===st.p);show(p||list[0]||null,false);}
      else markCurrent();
      writeState(id,st);
    }
    function row(i){
      const h=st.q&&i._hit&&i._hit.v?`<span class="sc-hit">${esc(i._hit.k)} ${esc(i._hit.v)}</span>`:"";
      const inCart=window.STV&&STV.Cart.has(i.pn);
      return `<li><button class="sc-row" type="button" data-pn="${esc(i.pn)}" aria-current="false">
        ${i.ph?`<span class="sc-tile"><img src="${esc(i.ph)}" alt="" loading="lazy"></span>`:""}
        <span class="sc-rmain"><span class="sc-pn">${esc(i.pn)}${inCart?`<span class="sc-incart">In cart</span>`:""}</span><span class="sc-mk">${esc(c.rowLine?c.rowLine(i):makesText(i))}</span><span class="sc-spec">${esc(c.specLine(i.s))}</span>${h}</span>
        <span class="sc-yr">${esc(c.rowRight?c.rowRight(i):i.yrs)}</span></button></li>`;
    }
    function paint(){
      if(!list.length){listEl.innerHTML=`<li class="sc-empty"><strong>No ${esc(c.many)} match${st.q?` “${esc(st.q)}”`:""}.</strong><br>Check the number for typing errors, try fewer characters, or reset the filters. You can also <a href="#/request${st.q?"?q="+encodeURIComponent(st.q):""}">request the part</a> and we'll check it for you.</li>`;$("#scMore").hidden=true;return;}
      listEl.innerHTML=list.slice(0,shown).map(row).join("");
      const more=$("#scMore");more.hidden=list.length<=shown;more.textContent=`Show more ${c.many} (${fmt(list.length-shown)} left)`;
      markCurrent();
    }
    $("#scMore").onclick=()=>{shown+=PAGE;paint();};
    listEl.addEventListener("click",e=>{const b=e.target.closest(".sc-row");if(!b)return;show(d.items.find(i=>i.pn===b.dataset.pn),true);});
    function markCurrent(){listEl.querySelectorAll(".sc-row").forEach(b=>b.setAttribute("aria-current",cur&&b.dataset.pn===cur.pn?"true":"false"));}
    function show(i,open){
      cur=i;st.p=i&&open?i.pn:(st.p&&i&&i.pn===st.p?st.p:"");markCurrent();
      if(!i){det.innerHTML="";det.hidden=true;return;}det.hidden=false;
      const okv=v=>v&&v!=="Not specified";
      const specs=c.specs?c.specs.filter(x=>okv(i.s[x[0]])).map(x=>[x[1],x[2]?x[2](i.s[x[0]],i.s):i.s[x[0]]]):Object.keys(i.s).filter(k=>okv(i.s[k])).map(k=>[k,i.s[k]]);
      const groups={};i.apps.slice().sort((a,b)=>a.mk.localeCompare(b.mk)||a.mo.localeCompare(b.mo)||a.y0-b.y0).forEach(a=>{(groups[a.mk]=groups[a.mk]||[]).push(a);});
      det.innerHTML=`<div class="sc-dhead"><div><h2>${esc(i.pn)}</h2><div class="sc-kind">${esc(c.title1?c.title1(i):i.d||c.kind)}</div></div><button class="sc-close" type="button" id="scClose">Close</button></div>
        ${i.ph?`<div class="sc-photo"><img src="${esc(i.ph)}" alt="${esc(i.pn)}"></div>`:""}
        <div class="sc-dcart">${cartBtn(i,c,"sc-addcart")}</div>
        ${specs.length||i.yrs?`<div class="sc-dsec"><h3>Specification</h3><dl class="sc-specs">${specs.map(x=>`<dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd>`).join("")}${i.yrs?`<dt>Model years</dt><dd>${esc(i.yrs)}</dd>`:""}</dl></div>`:""}
        ${i.oe.length?`<div class="sc-dsec"><h3>OE numbers</h3><div class="sc-chips">${i.oe.map(o=>`<button class="sc-chip" type="button" data-q="${esc(o)}" title="Search for ${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`:""}
        ${i.xr.length?`<div class="sc-dsec"><h3>Cross-references</h3><div class="sc-chips">${i.xr.map(o=>`<button class="sc-chip" type="button" data-q="${esc(o)}" title="Search for ${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`:""}
        ${c.vehicles===false?"":`<div class="sc-dsec"><h3>Applications (${fmt(i.apps.length)})</h3>${i.apps.length?`<div class="sc-appwrap"><table class="sc-apps"><thead><tr><th>Model and engine</th><th>Years</th></tr></thead><tbody>${Object.keys(groups).map(m=>`<tr class="sc-mkrow"><td colspan="2">${esc(m)}</td></tr>`+groups[m].map(a=>`<tr${(st.mk||st.yr)&&appOk(a,st)?' class="sc-on"':""}><td>${esc(a.mo)}${a.eng?" "+esc(a.eng):""}</td><td>${esc(a.yl)}</td></tr>`).join("")).join("")}</tbody></table></div>`:`<p class="sc-muted">Vehicle list to follow. Ask us and we'll check the fitment.</p>`}</div>`}`;
      det.scrollTop=0;
      if(open&&matchMedia("(max-width:900px)").matches){det.classList.add("open");document.body.style.overflow="hidden";det.focus();}
      if(window.STV)STV.cartPaint();
      if(open)writeState(id,st);
    }
    det.addEventListener("click",e=>{
      if(e.target.closest("#scClose")){det.classList.remove("open");document.body.style.overflow="";const b=listEl.querySelector('.sc-row[aria-current="true"]');if(b)b.focus();return;}
      const ch=e.target.closest(".sc-chip");if(ch){q.value=ch.dataset.q;$("#scClearQ").hidden=false;st.q=ch.dataset.q;det.classList.remove("open");document.body.style.overflow="";update(true);window.scrollTo({top:app.querySelector(".sc-bar").offsetTop-74,behavior:"smooth"});}
    });
    det.tabIndex=-1;
    repaint=()=>{if(document.body.contains(listEl)){const y=window.scrollY;paint();window.scrollTo(0,y);}};
    update(false);
    if(st.p){const b=listEl.querySelector('.sc-row[aria-current="true"]');if(b)b.scrollIntoView({block:"nearest"});}
  }).catch(e=>{$("#scCount").textContent="The catalogue didn't load. Check your connection and reload the page. ("+e.message+")";});
}

// keep the "In cart" tags in the list current
let repaint=null;
document.addEventListener("click",e=>{if(repaint&&e.target.closest&&e.target.closest("button[data-cart-key]"))setTimeout(repaint,0);});

window.StdCat={has:id=>!!CATS[id],page,cats:CATS};
})();
