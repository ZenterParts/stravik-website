// Stravik standard e-catalogue: one page layout for every product range.
// A range is a config in CATS (title, data file, hero photo, filters, columns). The data file is written by the publish
// workflow from the database function stravik_std_catalogue(<range>) and has the standard shape:
//   { v:1, at, cat, makes:[...], parts:[{ pn, t, d, s:{spec:value}, oe:[...], xr:[...], ap:[[makeIndex, model, years]] }] }
// Part photos: <img>/<Stravik no.>.webp, listed in <img>/index.json.
// Search by Stravik, OE or cross-reference number or vehicle, pick the vehicle (make, model, year), narrow by specs,
// see the parts as cards or a list, open a part for its full details, add it to the cart.
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const lc=s=>String(s||"").toLowerCase();
const fmt=n=>Number(n).toLocaleString("en-GB");
const PAGE=48;

// ---------------------------------------------------------------- range configs
const CATS={
  "ignition-coils":{
    title:"Ignition coils", one:"ignition coil", many:"ignition coils", cat:"Ignition Coils", data:"/ignition-coils.json",
    crumbs:[["Our products","#/products"]], hero:"/assets/img/ignition-coils/hero.webp", img:"/assets/img/ignition-coils/",
    lead:n=>`${fmt(n.items)} coils for ${fmt(n.makes)} vehicle makes. Search by Stravik, OE or cross-reference number, or pick the vehicle.`,
    hint:["SEIGC0102","0221503033","Corolla"],
    facets:[{k:"Connector",sort:"num"},{k:"Ignition module"},{k:"Vehicle type"}],
    chips:["Connector","Ignition module"],
    cols:[{k:"Connector",h:"Connector"},{k:"Ignition module",h:"Module"}]
  }
};

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
  return [a,to,a+(to===9999?"–":to!==a?"–"+to:"")];
}
function prep(d,c){
  const makes=d.makes;d.items=d.parts||d.items||[];
  d.items.forEach((i,ix)=>{
    i.ix=ix;i.s=i.s||{};i.oe=i.oe||[];i.xr=i.xr||[];i.ph=c.img&&d.photos.has(i.pn)?c.img+i.pn+".webp":"";
    i.apps=(i.ap||[]).map(a=>{const mk=makes[a[0]],[mo,eng]=tidyModel(mk,a[1]),[y0,y1,yl]=years(a[2]);return {mk,mo,eng,y0,y1,yl};});
    i.mks=[...new Set(i.apps.map(a=>a.mk))];
    i.keys=[clean(i.pn)].concat(i.oe.map(clean),i.xr.map(clean));
    i.text=lc([i.pn,i.d,i.apps.map(a=>a.mk+" "+a.mo+" "+a.eng).join(" ")].join(" "));
  });
  const mkCount={};d.items.forEach(i=>i.mks.forEach(m=>mkCount[m]=(mkCount[m]||0)+1));
  d.mkList=Object.keys(mkCount).sort((a,b)=>a.localeCompare(b));d.mkCount=mkCount;
  d.n={items:d.items.length,makes:d.mkList.length};
  return d;
}

// ---------------------------------------------------------------- state <-> url
function readState(params,c){
  const st={q:params.get("q")||"",mk:params.get("mk")||"",mo:params.get("mo")||"",yr:params.get("yr")||"",sort:params.get("sort")||"pn",view:params.get("view")||"",f:{}};
  c.facets.forEach(f=>{const v=params.getAll("f."+f.k);if(v.length)st.f[f.k]=v;});
  if(!st.view){try{st.view=localStorage.getItem("stravik-cat-view")||"cards";}catch(e){st.view="cards";}}
  return st;
}
function writeState(id,st){
  const p=new URLSearchParams();
  ["q","mk","mo","yr"].forEach(k=>{if(st[k])p.set(k,st[k]);});
  if(st.sort!=="pn")p.set("sort",st.sort);
  Object.keys(st.f).forEach(k=>st.f[k].forEach(v=>p.append("f."+k,v)));
  const qs=p.toString();history.replaceState(null,"","#/"+id+(qs?"?"+qs:""));
}

// ---------------------------------------------------------------- matching
function numHit(i,q){const c=clean(q);if(c.length<3)return null;
  if(clean(i.pn).includes(c))return {k:"pn"};
  const o=i.oe.find(n=>clean(n).includes(c));if(o)return {k:"OE",v:o};
  const x=i.xr.find(n=>clean(n).includes(c));if(x)return {k:"Cross-ref.",v:x};return null;}
function textHit(i,q){const w=lc(q).split(/\s+/).filter(Boolean);return w.length&&w.every(t=>i.text.includes(t));}
function appOk(a,st){return (!st.mk||a.mk===st.mk)&&(!st.mo||a.mo===st.mo)&&(!st.yr||(+st.yr>=a.y0&&+st.yr<=a.y1));}
function pass(i,st,skip){
  if(st.q&&!(i._hit=numHit(i,st.q))&&!textHit(i,st.q))return false;
  if((st.mk||st.yr)&&!i.apps.some(a=>appOk(a,st)))return false;
  for(const k in st.f){if(k===skip)continue;const v=st.f[k];if(v&&v.length&&!v.includes(i.s[k]))return false;}
  return true;
}

// ---------------------------------------------------------------- rendering helpers
const IC={
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  car:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15.5V12l2.2-5.2A2 2 0 0 1 7 5.6h10a2 2 0 0 1 1.8 1.2L21 12v3.5"/><path d="M3 12h18M3 15.5h18v2.5H3z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/></svg>',
  grid:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
  list:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  photo:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'
};
const mark=(t,q)=>{const c=clean(q);if(c.length<3)return esc(t);return clean(t).includes(c)?`<mark>${esc(t)}</mark>`:esc(t);};
function cartBtn(i,c,cls){
  const Cart=window.STV&&STV.Cart,on=Cart&&Cart.has(i.pn);
  const item={key:i.pn,no:i.pn,cat:c.cat,desc:i.d,link:"/#/"+c.id+"?q="+i.pn,kind:"std"};
  return `<button type="button" class="fadd${cls?" "+cls:""}" data-cart-key="${esc(i.pn)}" data-item="${esc(JSON.stringify(item))}" data-on="${!!on}">${on?"✓ In cart":"Add to cart"}</button>`;
}
function fitsLine(i,st){
  const ok=(st.mk||st.yr)?i.apps.filter(a=>appOk(a,st)):i.apps;
  if(!i.apps.length)return `<span class="sc-muted">No vehicle list yet</span>`;
  const mods=[...new Set(ok.map(a=>a.mo))];
  const head=(st.mk?"":`<b>${esc(i.mks.slice(0,2).join(", "))}</b>${i.mks.length>2?` +${i.mks.length-2}`:""} `)+esc(mods.slice(0,st.mk?3:2).join(", "))+(mods.length>(st.mk?3:2)?"…":"");
  return head+` <span class="sc-muted">· ${i.apps.length} vehicle${i.apps.length===1?"":"s"}</span>`;
}
function numsLine(i,st){
  const h=st.q&&i._hit&&i._hit.v?i._hit:null;
  if(h)return `<span class="sc-k">${esc(h.k)}</span> <mark>${esc(h.v)}</mark>`;
  if(!i.oe.length)return `<span class="sc-muted">No OE numbers listed</span>`;
  return `<span class="sc-k">OE</span> ${i.oe.slice(0,2).map(esc).join(", ")}${i.oe.length>2?` <span class="sc-muted">+${i.oe.length-2}</span>`:""}`;
}
const photo=(i,cls)=>i.ph?`<img class="${cls}" src="${esc(i.ph)}" alt="${esc(i.pn)} ${esc(i.d)}" loading="lazy" width="217" height="217">`:`<span class="${cls} sc-nophoto" aria-hidden="true">${IC.photo}</span>`;
function card(i,c,st){
  return `<article class="sc-card" data-pn="${esc(i.pn)}">
    <button type="button" class="sc-card-open" data-open="${esc(i.pn)}" aria-label="Details of ${esc(i.pn)}"></button>
    <div class="sc-ph">${photo(i,"sc-img")}</div>
    <header><h3 class="sc-pn">${mark(i.pn,st.q)}</h3>${c.chips.map(k=>i.s[k]&&i.s[k]!=="Not specified"?`<span class="sc-chip">${esc(i.s[k])}</span>`:"").join("")}</header>
    <p class="sc-desc">${esc(i.d)}</p>
    <dl class="sc-ledger"><div><dt>Numbers</dt><dd>${numsLine(i,st)}</dd></div><div><dt>Fits</dt><dd>${fitsLine(i,st)}</dd></div></dl>
    <footer><button type="button" class="sc-link" data-open="${esc(i.pn)}">Details</button>${cartBtn(i,c)}</footer>
  </article>`;
}
function row(i,c,st){
  return `<tr data-pn="${esc(i.pn)}"><td class="sc-tph">${photo(i,"sc-thumb")}</td><td><button type="button" class="sc-pn sc-pnlink" data-open="${esc(i.pn)}">${mark(i.pn,st.q)}</button></td><td>${esc(i.d)}</td>
    ${c.cols.map(k=>`<td>${esc(i.s[k.k]||"")}</td>`).join("")}<td>${numsLine(i,st)}</td><td>${fitsLine(i,st)}</td><td class="sc-r">${cartBtn(i,c,"small")}</td></tr>`;
}

// ---------------------------------------------------------------- page
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
        <p class="sc-lead" id="scLead">Loading the catalogue…</p>
        <form class="sc-search" role="search" id="scForm"><span class="sc-search-ic">${IC.search}</span>
          <input id="scQ" type="search" autocomplete="off" spellcheck="false" placeholder="Stravik, OE or cross-reference number, or vehicle" aria-label="Search ${esc(c.many)}" value="${esc(st.q)}">
          <button type="submit" class="sc-go">Search</button></form>
        <p class="sc-hint">Try ${c.hint.map(h=>`<button type="button" data-try="${esc(h)}">${esc(h)}</button>`).join(" ")}</p>
      </div>
      <div class="sc-art">${c.hero?`<img src="${esc(c.hero)}" alt="Stravik ${esc(c.many)}" width="600" height="380">`:""}</div>
    </div>
  </div></section>
  <div class="sc-veh" id="scVeh"><div class="sc-in">
    <span class="sc-veh-l">${IC.car}<span>Your vehicle</span></span>
    <label class="sc-sel"><span>Make</span><select id="scMk"><option value="">All makes</option></select></label>
    <label class="sc-sel"><span>Model</span><select id="scMo" disabled><option value="">All models</option></select></label>
    <label class="sc-sel"><span>Year</span><select id="scYr"><option value="">Any year</option></select></label>
    <button type="button" class="sc-veh-x" id="scVehX" hidden>${IC.x}<span>Clear vehicle</span></button>
    <span class="sc-veh-n" id="scCount" aria-live="polite"></span>
  </div></div>
  <div class="sc-in sc-body">
    <aside class="sc-facets" id="scFacets" aria-label="Filters">
      <div class="sc-facets-h"><h2>Filters</h2><button type="button" class="sc-link" id="scFClear">Clear all</button><button type="button" class="sc-facets-close" id="scFClose" aria-label="Close filters">${IC.x}</button></div>
      <div id="scFacetBox"></div>
    </aside>
    <div class="sc-main">
      <div class="sc-tools">
        <button type="button" class="sc-ftoggle" id="scFOpen">${IC.sliders}<span>Filters</span><b id="scFN"></b></button>
        <div class="sc-active" id="scActive"></div>
        <label class="sc-sort"><span>Sort</span><select id="scSort"><option value="pn">Stravik number</option><option value="veh">Most vehicles</option></select></label>
        <div class="sc-view" role="group" aria-label="View"><button type="button" data-view="cards" aria-pressed="${st.view==="cards"}">${IC.grid}<span>Cards</span></button><button type="button" data-view="list" aria-pressed="${st.view==="list"}">${IC.list}<span>List</span></button></div>
      </div>
      <div id="scResults" class="sc-results"><p class="sc-loading">Loading…</p></div>
      <div class="sc-more-w"><button type="button" class="btn line" id="scMore" hidden>Show more</button></div>
      <aside class="cantfind"><div><h3>Can't find your part?</h3><p>Send us the vehicle, the OE number or a photo reference and we'll check it for you.</p></div><a class="btn gold" href="#/request">Request a part</a></aside>
    </div>
  </div>
  <div class="sc-drawer" id="scDrawer" hidden><div class="sc-drawer-bg" data-close></div><section class="sc-drawer-p" role="dialog" aria-modal="true" aria-labelledby="scDT" tabindex="-1" id="scDP"></section></div>
  </div>`;
  const $=s=>app.querySelector(s);
  $("#scSort").value=st.sort;
  load(id).then(d=>{
    $("#scLead").textContent=c.lead(d.n);
    // vehicle selects
    const mkSel=$("#scMk"),moSel=$("#scMo"),yrSel=$("#scYr");
    mkSel.insertAdjacentHTML("beforeend",d.mkList.map(m=>`<option value="${esc(m)}">${esc(m)} (${d.mkCount[m]})</option>`).join(""));
    const yNow=new Date().getFullYear();for(let y=yNow;y>=1960;y--)yrSel.insertAdjacentHTML("beforeend",`<option>${y}</option>`);
    const fillModels=()=>{
      const set={};d.items.forEach(i=>i.apps.forEach(a=>{if(a.mk===st.mk)set[a.mo]=(set[a.mo]||0)+1;}));
      moSel.innerHTML=`<option value="">All models</option>`+Object.keys(set).sort((a,b)=>a.localeCompare(b)).map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join("");
      moSel.disabled=!st.mk;moSel.value=st.mo;
    };
    mkSel.value=st.mk;yrSel.value=st.yr;fillModels();
    mkSel.onchange=()=>{st.mk=mkSel.value;st.mo="";fillModels();update(true);};
    moSel.onchange=()=>{st.mo=moSel.value;update(true);};
    yrSel.onchange=()=>{st.yr=yrSel.value;update(true);};
    $("#scVehX").onclick=()=>{st.mk=st.mo=st.yr="";mkSel.value=yrSel.value="";fillModels();update(true);};
    // search
    const q=$("#scQ");let t=0;
    q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{st.q=q.value.trim();update(true);},160);};
    $("#scForm").onsubmit=e=>{e.preventDefault();st.q=q.value.trim();update(true);};
    app.querySelectorAll("[data-try]").forEach(b=>b.onclick=()=>{q.value=b.dataset.try;st.q=q.value;update(true);});
    $("#scSort").onchange=e=>{st.sort=e.target.value;update(true);};
    app.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{st.view=b.dataset.view;try{localStorage.setItem("stravik-cat-view",st.view);}catch(e){}
      app.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",x===b));update(false);});
    // facets
    $("#scFacetBox").onchange=e=>{const b=e.target;if(!b.dataset.f)return;const k=b.dataset.f,v=b.value;const cur=st.f[k]||[];
      st.f[k]=b.checked?cur.concat(v):cur.filter(x=>x!==v);if(!st.f[k].length)delete st.f[k];update(true);};
    $("#scFClear").onclick=()=>{st.f={};update(true);};
    $("#scActive").onclick=e=>{const b=e.target.closest("[data-rm]");if(!b)return;const [k,v]=JSON.parse(b.dataset.rm);
      if(k==="q"){st.q="";q.value="";}else if(k==="veh"){st.mk=st.mo=st.yr="";mkSel.value=yrSel.value="";fillModels();}
      else{st.f[k]=(st.f[k]||[]).filter(x=>x!==v);if(!st.f[k].length)delete st.f[k];}update(true);};
    const fac=$("#scFacets");
    $("#scFOpen").onclick=()=>{fac.classList.add("open");document.body.classList.add("sc-lock");$("#scFClose").focus();};
    $("#scFClose").onclick=()=>{fac.classList.remove("open");document.body.classList.remove("sc-lock");$("#scFOpen").focus();};
    // details
    app.addEventListener("click",e=>{const o=e.target.closest("[data-open]");if(o){e.preventDefault();openPart(d.items.find(i=>i.pn===o.dataset.open));}});
    let shown=PAGE;
    $("#scMore").onclick=()=>{shown+=PAGE;paint();};
    let list=[];
    function update(reset){
      if(reset)shown=PAGE;
      list=d.items.filter(i=>pass(i,st));
      if(st.sort==="veh")list.sort((a,b)=>b.apps.length-a.apps.length||a.pn.localeCompare(b.pn));
      else if(st.q)list.sort((a,b)=>(b._hit?1:0)-(a._hit?1:0)||a.pn.localeCompare(b.pn));
      paintFacets();paintActive();paint();
      const veh=st.mk||st.yr;$("#scVehX").hidden=!veh;$("#scVeh").classList.toggle("on",!!veh);
      writeState(id,st);
    }
    function paint(){
      const n=list.length,box=$("#scResults");
      $("#scCount").innerHTML=`<b>${fmt(n)}</b> ${n===1?c.one:c.many}${st.mk||st.yr?` fit${n===1?"s":""} ${esc([st.mk,st.mo,st.yr].filter(Boolean).join(" "))}`:""}`;
      if(!n){box.innerHTML=`<div class="sc-empty"><h3>No ${esc(c.many)} match</h3><p>${st.q?`Nothing matches “${esc(st.q)}”. Check the number, or search with fewer characters.`:"Try another vehicle or remove a filter."}</p><button type="button" class="btn line" id="scReset">Clear search and filters</button></div>`;
        $("#scReset").onclick=()=>{st.q="";q.value="";st.f={};st.mk=st.mo=st.yr="";mkSel.value=yrSel.value="";fillModels();update(true);};$("#scMore").hidden=true;return;}
      const part=list.slice(0,shown);
      box.className="sc-results "+(st.view==="list"?"is-list":"is-cards");
      box.innerHTML=st.view==="list"
        ?`<div class="sc-tablew"><table class="sc-table"><thead><tr><th><span class="sr">Photo</span></th><th>Stravik no.</th><th>Description</th>${c.cols.map(k=>`<th>${esc(k.h)}</th>`).join("")}<th>Numbers</th><th>Fits</th><th></th></tr></thead><tbody>${part.map(i=>row(i,c,st)).join("")}</tbody></table></div>`
        :part.map(i=>card(i,c,st)).join("");
      const more=$("#scMore");more.hidden=n<=shown;more.textContent=`Show ${fmt(Math.min(PAGE,n-shown))} more of ${fmt(n-shown)}`;
      if(window.STV)STV.cartPaint();
    }
    function paintFacets(){
      $("#scFacetBox").innerHTML=c.facets.map(f=>{
        const cnt={};d.items.forEach(i=>{const v=i.s[f.k];if(v&&pass(i,st,f.k))cnt[v]=(cnt[v]||0)+1;});
        (st.f[f.k]||[]).forEach(v=>{if(!(v in cnt))cnt[v]=0;});
        let vals=Object.keys(cnt);vals.sort(f.sort==="num"?(a,b)=>(parseFloat(a)||99)-(parseFloat(b)||99)||a.localeCompare(b):(a,b)=>cnt[b]-cnt[a]||a.localeCompare(b));
        if(!vals.length)return "";
        const fid="scf_"+clean(f.k);return `<div class="sc-facet" role="group" aria-labelledby="${fid}"><h3 id="${fid}">${esc(f.label||f.k)}</h3>${vals.map(v=>{const on=(st.f[f.k]||[]).includes(v);
          return `<label class="sc-opt${cnt[v]?"":" none"}"><input type="checkbox" data-f="${esc(f.k)}" value="${esc(v)}"${on?" checked":""}><span>${esc(v)}</span><em>${fmt(cnt[v])}</em></label>`;}).join("")}</div>`;
      }).join("");
      const nf=Object.values(st.f).reduce((a,v)=>a+v.length,0);$("#scFN").textContent=nf?nf:"";
    }
    function paintActive(){
      const chips=[];
      if(st.q)chips.push([["q",""],"“"+st.q+"”"]);
      if(st.mk||st.yr)chips.push([["veh",""],[st.mk,st.mo,st.yr].filter(Boolean).join(" ")]);
      Object.keys(st.f).forEach(k=>st.f[k].forEach(v=>chips.push([[k,v],v])));
      $("#scActive").innerHTML=chips.map(x=>`<button type="button" class="sc-achip" data-rm="${esc(JSON.stringify(x[0]))}">${esc(x[1])}${IC.x}<span class="sr">Remove</span></button>`).join("");
    }
    // ---------------- part details drawer
    const dr=$("#scDrawer"),dp=$("#scDP");let lastFocus=null;
    function openPart(i){
      if(!i)return;lastFocus=document.activeElement;
      const specs=Object.keys(i.s).filter(k=>i.s[k]&&i.s[k]!=="Not specified");
      const apps=i.apps.slice().sort((a,b)=>a.mk.localeCompare(b.mk)||a.mo.localeCompare(b.mo)||a.y0-b.y0);
      dp.innerHTML=`${i.ph?`<div class="sc-dph"><img src="${esc(i.ph)}" alt="${esc(i.pn)}" width="217" height="217"></div>`:""}<header class="sc-dh"><div><p class="sc-dcat">${esc(c.title)}</p><h2 id="scDT" class="sc-pn">${esc(i.pn)}</h2><p>${esc(i.d)}</p></div><button type="button" class="sc-dx" data-close aria-label="Close">${IC.x}</button></header>
        <div class="sc-dbody">
          <div class="sc-dcta">${cartBtn(i,c,"big")}</div>
          ${specs.length?`<section><h3>Specifications</h3><dl class="sc-spec">${specs.map(k=>`<div><dt>${esc(k)}</dt><dd>${esc(i.s[k])}</dd></div>`).join("")}</dl></section>`:""}
          ${i.oe.length?`<section><h3>OE numbers</h3><ul class="sc-nums">${i.oe.map(n=>`<li>${mark(n,st.q)}</li>`).join("")}</ul></section>`:""}
          ${i.xr.length?`<section><h3>Cross-references</h3><ul class="sc-nums">${i.xr.map(n=>`<li>${mark(n,st.q)}</li>`).join("")}</ul></section>`:""}
          <section><h3>Fits ${apps.length} vehicle${apps.length===1?"":"s"}</h3>
            ${apps.length>8?`<input type="search" class="sc-dfind" id="scDF" placeholder="Filter these vehicles" aria-label="Filter the vehicle list">`:""}
            ${apps.length?`<table class="sc-apps"><thead><tr><th>Make</th><th>Model</th><th>Engine</th><th>Years</th></tr></thead><tbody>${apps.map(a=>`<tr class="${(st.mk||st.yr)&&appOk(a,st)?"hit":""}" data-t="${esc(lc(a.mk+" "+a.mo+" "+a.eng+" "+a.yl))}"><td>${esc(a.mk)}</td><td>${esc(a.mo)}</td><td>${esc(a.eng)}</td><td>${esc(a.yl)}</td></tr>`).join("")}</tbody></table>`:`<p class="sc-muted">No vehicle list yet. Ask us and we'll check the fitment.</p>`}
          </section>
        </div>`;
      dr.hidden=false;document.body.classList.add("sc-lock");requestAnimationFrame(()=>dr.classList.add("open"));dp.focus();
      const f=dp.querySelector("#scDF");if(f)f.oninput=()=>{const v=lc(f.value);dp.querySelectorAll(".sc-apps tbody tr").forEach(r=>r.hidden=!!v&&!r.dataset.t.includes(v));};
      if(window.STV)STV.cartPaint();
    }
    function closePart(){dr.classList.remove("open");document.body.classList.remove("sc-lock");setTimeout(()=>{dr.hidden=true;},200);if(lastFocus)lastFocus.focus();}
    dr.addEventListener("click",e=>{if(e.target.closest("[data-close]"))closePart();});
    dr.addEventListener("keydown",e=>{if(e.key==="Escape")closePart();});
    update(false);
  }).catch(e=>{$("#scResults").innerHTML=`<div class="sc-empty"><h3>The catalogue didn't load</h3><p>Check your connection and reload the page. (${esc(e.message)})</p></div>`;});
}

window.StdCat={has:id=>!!CATS[id],page,cats:CATS};
})();
