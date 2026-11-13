// Stravik filter catalogue on the website (/filters/): the layout of the Stravik Filter Catalogue, drawn inside a shadow root
// so the site's styles and the catalogue's styles stay apart (styles: /assets/fcat.css).
// Data: /filters.json (published from Supabase by stravik_filters_catalogue(); no prices, no supplier numbers).
// Add to cart uses the website cart (common.js); signed-in customers see their prices (dealer.js, StravikDealer.tag).
(function(){
"use strict";
const host=document.getElementById("fcat");if(!host||!host.attachShadow)return;
const root=host.attachShadow({mode:"open"});
const TPL=`<div class="fwrap"><header class="top">
  <div class="wrap bar">
    <div class="brand"><span>Filter catalogue</span></div>
    <label class="search" for="q">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input id="q" type="search" autocomplete="off" placeholder="Search Stravik PN, OE, GUD / MANN / MAHLE number, model or engine" aria-label="Search the catalogue">
    </label>
    <div class="modes" role="group" aria-label="Browse by">
      <button id="m-prod" aria-pressed="true">Filter type</button>
      <button id="m-veh" aria-pressed="false">Vehicle</button>
    </div>
  </div>
  <div class="pleat"></div>
</header>

<section class="hero" aria-label="Stravik filtration">
  <div class="hero-grid">
    <div class="hero-copy"><div class="hero-text">
      <h1>Filters</h1>
      <p>Oil, air, cabin, fuel and coolant filters. Search by Stravik part number, OE reference, cross-reference or vehicle.</p>
      <div class="stats"><div><b id="st-n">1,092</b><span>Filters</span></div><div><b id="st-m">194</b><span>Vehicle makes</span></div><div><b id="st-x">6,333</b><span>Cross-references</span></div></div>
      <div class="hero-cta"><button class="primary" id="cta-type">Browse filters</button><button class="ghost" id="cta-veh">Find by vehicle</button></div>
    </div></div>
    <div class="hero-media"><img src="/assets/img/filters/hero-2026-11.webp" srcset="/assets/img/filters/hero-2026-11.webp 1376w, /assets/img/filters/hero-2026-11@2x.webp 2752w" sizes="(max-width: 860px) 100vw, 60vw" alt="Stravik air, cabin, oil and fuel filters with their Stravik boxes" width="1376" height="768"></div>
  </div>
</section>
<div class="fmain wrap">
  <section id="v-prod">
    <div class="sec-head"><span class="tag">01</span><span class="k">Filtration</span><span class="r"></span></div>
    <h2 class="sec">Browse by part type</h2>
    <div class="legend" id="fams"></div>
    <div class="chips" id="codes"></div>
    <div class="status"><span id="count"></span><div class="views" role="group" aria-label="View"><button data-view="grid" aria-pressed="true">Cards</button><button data-view="table" aria-pressed="false">Table</button><button data-view="list" aria-pressed="false">List</button></div></div>
    <div class="grid" id="grid"></div>
    <div class="more"><button class="btn" id="more" hidden>Show more</button></div>
  </section>

  <section id="v-veh" hidden>
    <div class="sec-head"><span class="tag">02</span><span class="k">Vehicle applications</span><span class="r"></span></div>
    <h2 class="sec">Find filters by vehicle</h2>
    <div class="makes" id="makes"></div>
    <div class="vtools">
      <select id="mksel" aria-label="All makes"></select>
      <select id="mosel" aria-label="Model"></select>
      <span id="vcount" class="status" style="margin:0"></span>
    </div>
    <div class="tablebox"><table id="vtab"></table></div>
    <div class="more"><button class="btn" id="vmore" hidden>Show more models</button></div>
  </section>
</div>

<p class="fnote wrap">Cross-references are for identification. Check dimensions and the vehicle application before fitting.</p>

<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="drawer" hidden aria-modal="true" role="dialog" aria-labelledby="dpn"></aside></div>`;
let cur=null;
// the website cart
const citem=p=>({key:p.pn,no:p.pn,cat:"Filters",desc:p.d,link:"/filter/"+p.pn+"/",kind:"filter"});
const cqty=pn=>{const C=window.STV&&STV.Cart;if(!C)return 0;const it=C.items().find(i=>i.key===pn);return it?it.qty||1:0;};
const addLabel=pn=>{const n=cqty(pn);return n?"In cart ("+n+") · add 1":"Add to cart";};
function cartAdd(p){if(!window.STV)return;STV.Cart.add(citem(p),1);STV.toast("1 × "+p.pn+" added to your cart");const a=root.getElementById("d-add");if(a)a.textContent=addLabel(p.pn);}
function prices(){const D=window.StravikDealer,t=D&&D.tag;root.querySelectorAll("[data-p]").forEach(el=>{const v=t?t(el.dataset.p)||"":"";if(el.innerHTML!==v)el.innerHTML=v;});}
// filters.json -> the catalogue's own data shape: [pn, type code, description, {dimensions}, [OE], {brand: [numbers]}, [[make index, model, variant, engine, fuel, cc, years]]]
const TCODE={OFL:"OR",AFL:"AP",CFL:"H",FFL:"DE",FKT:"J",CLF:"R"};
// Priced-only (assets/dealer.js): an approved customer sees only the filters on their price list.
const SD=()=>window.StravikDealer||null;
const pfilt=()=>{const D=SD();return !!(D&&D.filtering&&D.filtering());};
const dready=()=>{const D=SD();return D&&D.ready?D.ready():Promise.resolve();};
const mine=i=>{if(!pfilt())return true;const D=SD();return D.range("Filters")&&D.visible(i.pn,"N");};
function convert(F){return {makes:F.makes||[],p:(F.items||[]).filter(mine).map(i=>[i.pn,i.c||TCODE[i.t]||"J",i.d||"",Object.fromEntries(i.dm||[]),(i.n||[]).slice(0,i.oc||0),Object.fromEntries(i.x||[]),i.a||[]])};}
root.innerHTML=`<link rel="stylesheet" href="${host.dataset.css}"><div class="fwrap"><p class="fload">Loading the filter catalogue…</p></div>`;
const css=root.querySelector("link");
const ready=new Promise(res=>{css.addEventListener("load",res);css.addEventListener("error",res);setTimeout(res,4000);});
// a signed-in customer's prices arrive before the list is drawn, so the full list never shows first
Promise.all([fetch("/filters.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("Status "+r.status);return r.json();}),ready,dready()]).then(([F])=>{
  const C=convert(F);
  if(pfilt()&&!C.p.length){root.querySelector(".fload").innerHTML=`<b>Filters aren't on your price list.</b> You can still ask us for a price: <a href="/#/request">request a part</a>, or see <a href="/#/products">your catalogues</a>.`;return;}
  root.innerHTML=`<link rel="stylesheet" href="${host.dataset.css}">`+TPL;init(C);
}).catch(e=>{const w=root.querySelector(".fload");if(w)w.textContent="The filter catalogue could not be loaded. Check your connection and refresh the page.";console.error(e);});
function init(C){const MAKES=C.makes;
const FAM=[
 {k:'O',t:'Oil',s:'Oil filters',c:'--c-o',codes:['OR','OE']},
 {k:'A',t:'Air',s:'Air filters',c:'--c-a',codes:['AP','AC']},
 {k:'H',t:'Cabin',s:'Cabin filters',c:'--c-h',codes:['H','HC']},
 {k:'D',t:'Diesel fuel',s:'Diesel fuel filters',c:'--c-d',codes:['DR','DE','DL']},
 {k:'G',t:'Petrol fuel',s:'Petrol fuel filters',c:'--c-g',codes:['GL','GE']},
 {k:'R',t:'Coolant',s:'Coolant filters',c:'--c-r',codes:['R']},
 {k:'J',t:'Kits',s:'Filter kits',c:'--c-j',codes:['J']}];
const CODE={OR:['','Oil, spin-on'],OE:['','Oil, cartridge'],AP:['','Air, panel'],AC:['','Air, round'],
 H:['','Cabin, pollen'],HC:['','Cabin, activated carbon'],DR:['','Diesel, spin-on'],DE:['','Diesel, cartridge'],
 DL:['','Diesel, in-line'],GL:['','Petrol, in-line'],GE:['','Petrol, cartridge'],R:['','Coolant'],J:['','Filter kit']};
const FUEL={D:'Diesel',P:'Petrol',H:'Hybrid',C:'CNG',L:'LPG',E:'EV'};
const famOf=code=>FAM.find(f=>f.codes.includes(code));
const col=code=>`var(${famOf(code).c})`;
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const norm=s=>String(s).toUpperCase().replace(/[^A-Z0-9]/g,'');

// products
const P=C.p.map(a=>{const p={pn:a[0],code:a[1],d:a[2],dims:a[3],oe:a[4],xr:a[5],ap:a[6]};
  const mk=[...new Set(p.ap.map(x=>MAKES[x[0]]))]; p.makes=mk;
  const parts=[p.pn,p.d,...p.oe,...Object.values(p.xr).flat(),...mk,...p.ap.flatMap(x=>[x[1],x[3]])];
  p.hayN='|'+parts.map(norm).join('|')+'|'; p.hayW=parts.join(' ').toUpperCase(); return p;});
const ORD=['OR','OE','AP','AC','H','HC','DR','DE','DL','GL','GE','R','J'];
P.sort((a,b)=>ORD.indexOf(a.code)-ORD.indexOf(b.code)||a.pn.localeCompare(b.pn,'en',{numeric:true}));
const BY=Object.fromEntries(P.map(p=>[p.pn,p]));

// state
let fam=null, code=null, q='', shown=48, list=[], view='grid';
try{const v=localStorage.getItem('sv-fview'); if(['grid','table','list'].includes(v)) view=v;}catch(_){}
const $=id=>root.getElementById(id);
function setHash(h){try{if(location.hash!==h) history.replaceState(null,'',h);}catch(_){}}

function renderFams(){
  $('fams').innerHTML=FAM.map(f=>{const n=P.filter(p=>f.codes.includes(p.code)).length;
    return `<button class="fam" style="--fc:var(${f.c})" data-f="${f.k}" aria-pressed="${fam===f.k}"><span class="t">${f.t}</span><span class="s">${f.s}</span><span class="n">${f.codes.join(' · ')} — ${n} part${n===1?"":"s"}</span></button>`}).join('');
  const f=FAM.find(x=>x.k===fam);
  $('codes').innerHTML=f?f.codes.map(c=>`<button class="chip" style="--fc:var(${f.c})" data-c="${c}" aria-pressed="${code===c}"><code>${c}</code>${CODE[c][1]}</button>`).join(''):'';
  $('codes').hidden=!f;
}
function match(p){
  if(fam && !(fam==='F'?/^[DG]$/.test(famOf(p.code).k):famOf(p.code).k===fam)) return false;
  if(code && p.code!==code) return false;
  if(!q) return true;
  const whole=norm(q); if(whole && p.hayN.includes(whole)) return true;
  const toks=q.trim().split(/\s+/).map(norm).filter(Boolean);
  return toks.length>1 && toks.every(t=>p.hayN.includes(t)||p.hayW.includes(t));
}
function rank(p){ if(!q) return 0; const w=norm(q);
  if(norm(p.pn)===w) return -3; if(p.hayN.includes('|'+w+'|')) return -2; return 0;}
function card(p){
  const dm=p.dims, keys=[['Height','H'],['Outer diameter','OD'],['Inside diameter','ID'],['Length','L'],['Width','W'],['Thread','Thread']];
  const kv=keys.filter(([k])=>dm[k]).map(([k,a])=>`<span>${a} <b>${esc(dm[k].replace(' mm',''))}</b></span>`).join('');
  const x=['GUD','MANN','MAHLE','FRAM','VIC'].filter(b=>p.xr[b]).slice(0,3).map(b=>`<span>${b} <b>${esc(p.xr[b][0])}</b></span>`).join('');
  const d=p.d.split('–')[0].trim();
  return `<div class="card" tabindex="0" role="button" style="--fc:${col(p.code)}" data-pn="${p.pn}">
    <div class="pn">${p.pn}</div><div class="eprice" data-p="${p.pn}"></div>
    <div class="desc">${esc(d)}</div>
    ${kv?`<div class="kv">${kv}</div>`:''}${x?`<div class="kv">${x}</div>`:''}
    <div class="mk">${p.makes.length?esc(p.makes.slice(0,5).join(' · '))+(p.makes.length>5?` +${p.makes.length-5}`:''):'&nbsp;'}</div></div>`;
}
const D=(p,k)=>esc((p.dims[k]||'').replace(' mm',''));
const X=(p,b)=>p.xr[b]?esc(p.xr[b].slice(0,2).join(', '))+(p.xr[b].length>2?' …':''):'';
function tableView(sl){
  return `<table class="ptab"><thead><tr><th>Stravik PN</th><th>Description</th><th>H</th><th>OD</th><th>ID</th><th>L</th><th>W</th><th>Thread</th><th>OE</th><th>GUD</th><th>MANN</th><th>MAHLE</th><th>FRAM</th><th>Makes</th></tr></thead><tbody>`+
  sl.map(p=>`<tr data-pn="${p.pn}" tabindex="0" class="prow"><td><span class="pnl" style="--fc:${col(p.code)}">${p.pn}</span></td><td>${esc(p.d.split('–')[0].trim())}</td>
   <td class="num">${D(p,'Height')}</td><td class="num">${D(p,'Outer diameter')}</td><td class="num">${D(p,'Inside diameter')}</td><td class="num">${D(p,'Length')}</td><td class="num">${D(p,'Width')}</td><td class="num">${esc(p.dims.Thread||'')}</td>
   <td class="num">${esc(p.oe.slice(0,2).join(', '))}${p.oe.length>2?' …':''}</td><td class="num">${X(p,'GUD')}</td><td class="num">${X(p,'MANN')}</td><td class="num">${X(p,'MAHLE')}</td><td class="num">${X(p,'FRAM')}</td><td>${esc(p.makes.slice(0,3).join(', '))}${p.makes.length>3?' +'+(p.makes.length-3):''}</td></tr>`).join('')+'</tbody></table>';}
function listRow(p){
  const refs=['GUD','MANN','MAHLE','FRAM'].filter(b=>p.xr[b]).map(b=>`${b} <b>${esc(p.xr[b][0])}</b>`).join(' · ');
  return `<div class="lrow" tabindex="0" role="button" data-pn="${p.pn}" style="--fc:${col(p.code)}"><span class="lpn">${p.pn}</span>
   <span class="ld"><span>${esc(p.d)}</span><span class="lsub">${refs||'&nbsp;'}${p.makes.length?' — '+esc(p.makes.slice(0,4).join(', '))+(p.makes.length>4?' +'+(p.makes.length-4):''):''}</span></span></div>`;}
function renderGrid(reset){
  if(reset){shown=48; list=P.filter(match); if(q) list.sort((a,b)=>rank(a)-rank(b));}
  const sl=list.slice(0,shown), g=$('grid');
  g.className=view==='grid'?'grid':view==='table'?'tablebox':'plist';
  if(!list.length) g.innerHTML=`<div class="empty">No filters match “${esc(q)}”. Try an OE or competitor number without spaces, or a model name.</div>`;
  else if(view==='grid') g.innerHTML=sl.map(card).join('');
  else if(view==='table') g.innerHTML=tableView(sl);
  else g.innerHTML=sl.map(listRow).join('');
  $('count').innerHTML=`<strong>${list.length}</strong> filter${list.length===1?'':'s'}${fam?' · '+(fam==='F'?'Fuel':FAM.find(f=>f.k===fam).t):''}${code?' · '+code:''}`;
  $('more').hidden=shown>=list.length;
  prices();
}

// drawer
let lastFocus=null;
function open(pn){
  const p=BY[pn]; if(!p) return; lastFocus=root.activeElement||document.activeElement; cur=p;
  const c=col(p.code);
  const dl=Object.entries(p.dims).map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('');
  const xr=Object.entries(p.xr).map(([b,v])=>`<dt>${esc(b)}</dt><dd>${v.map(esc).join(', ')}</dd>`).join('');
  const byMk={}; p.ap.forEach(a=>{(byMk[MAKES[a[0]]]=byMk[MAKES[a[0]]]||[]).push(a)});
  const apRows=Object.entries(byMk).map(([m,rows])=>`<tr class="model"><td colspan="5">${esc(m)}</td></tr>`+rows.slice(0,400).map(a=>
    `<tr><td>${esc(a[1])}${a[2]?` <span class="mono" style="color:var(--muted)">${esc(a[2])}</span>`:''}</td><td class="num">${esc(a[3])}</td><td class="num">${esc(a[5])}</td><td>${a[4]?`<span class="fuel">${FUEL[a[4]]}</span>`:''}</td><td class="num">${esc(a[6])}</td></tr>`).join('')).join('');
  const d=$('drawer'); d.style.setProperty('--fc',c);
  d.innerHTML=`<div class="dh"><div><div class="pn" id="dpn" style="--fc:${c}">${p.pn}</div></div><button class="close" id="close">Close</button></div>
   <p class="desc" style="font-size:16px">${esc(p.d)}</p>
   <div class="eprice" data-p="${p.pn}"></div>
   <div class="dact"><button type="button" class="btn bronze" id="d-add">${addLabel(p.pn)}</button><a class="btn line" href="/filter/${encodeURIComponent(p.pn)}/">Filter page</a><a class="btn line" href="/#/contact?part=${encodeURIComponent(famOf(p.code).s)}&amp;ref=${encodeURIComponent(p.pn)}">Ask about this filter</a></div>
   ${dl?`<h3>Dimensions</h3><div class="dims">${dl}</div>`:''}
   ${p.oe.length?`<h3>OE numbers <button class="copy" data-copy="${esc(p.oe.join(', '))}">Copy</button></h3><div class="xr"><dd style="grid-column:1/-1">${p.oe.map(esc).join(', ')}</dd></div>`:''}
   ${xr?`<h3>Cross-references</h3><dl class="xr">${xr}</dl>`:''}
   <h3>Vehicle applications (${p.ap.length})</h3>
   ${p.ap.length?`<div class="tablebox"><table><thead><tr><th>Model</th><th>Engine</th><th>cc</th><th>Fuel</th><th>Years</th></tr></thead><tbody>${apRows}</tbody></table></div>`:'<p style="color:var(--muted)">No vehicle applications listed yet.</p>'}`;
  d.hidden=false; $('scrim').hidden=false; d.scrollTop=0; $('close').focus(); prices();
  setHash('#'+pn);
}
function close(){ $('drawer').hidden=true; $('scrim').hidden=true; setHash(mode==='veh'?'#vehicles':'#products'); if(lastFocus) lastFocus.focus();}
$('scrim').onclick=close;
root.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('drawer').hidden) close();
  if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.pn&&e.target.matches('.card,.lrow,.prow')){e.preventDefault();open(e.target.dataset.pn);} });
root.addEventListener('click',e=>{
  if(e.target.closest('#d-add')){if(cur)cartAdd(cur);return;}
  const cp=e.target.closest('[data-copy]'); if(cp){const t=cp.dataset.copy; const ok=()=>{cp.textContent='Copied'}; try{navigator.clipboard.writeText(t).then(ok,()=>{})}catch(_){}; return;}
  if(e.target.id==='close') return close();
  const cd=e.target.closest('[data-pn]'); if(cd) return open(cd.dataset.pn);
  const vb=e.target.closest('[data-view]'); if(vb){view=vb.dataset.view; try{localStorage.setItem('sv-fview',view)}catch(_){}; syncViews(); renderGrid(false); return;}
  const f=e.target.closest('[data-f]'); if(f){fam=fam===f.dataset.f?null:f.dataset.f; code=null; renderFams(); renderGrid(true);}
  const c=e.target.closest('[data-c]'); if(c){code=code===c.dataset.c?null:c.dataset.c; renderFams(); renderGrid(true);}
  const m=e.target.closest('[data-mk]'); if(m){setMake(m.dataset.mk);}
});
$('more').onclick=()=>{shown+=48; renderGrid(false)};
let t; $('q').addEventListener('input',e=>{clearTimeout(t); t=setTimeout(()=>{q=e.target.value.trim(); if(mode!=='prod') setMode('prod'); renderGrid(true)},120)});

// vehicle view
const VI={}; // make -> model -> rowKey -> {a, pns:{fam:[...]}}
P.forEach(p=>{const fk=famOf(p.code).k; p.ap.forEach(a=>{const mk=MAKES[a[0]];
  const mo=(VI[mk]=VI[mk]||{}), r=(mo[a[1]||'—']=mo[a[1]||'—']||{}); const key=[a[2],a[3],a[5],a[4],a[6]].join('|');
  const row=(r[key]=r[key]||{a,f:{}}); (row.f[fk]=row.f[fk]||new Set()).add(p.pn);});});
const mkCount=Object.entries(VI).map(([m,mo])=>[m,new Set(Object.values(mo).flatMap(r=>Object.values(r).flatMap(x=>Object.values(x.f).flatMap(s=>[...s])))).size]).sort((a,b)=>b[1]-a[1]);
let make=mkCount.length?mkCount[0][0]:'', model='', vshown=12, mode='prod';
$('makes').innerHTML=mkCount.slice(0,16).map(([m,n])=>`<button class="chip" data-mk="${esc(m)}" aria-pressed="false">${esc(m)} <code>${n}</code></button>`).join('');
$('mksel').innerHTML='<option value="">All makes…</option>'+mkCount.slice().sort((a,b)=>a[0].localeCompare(b[0])).map(([m,n])=>`<option value="${esc(m)}">${esc(m)} (${n})</option>`).join('');
$('mksel').onchange=e=>{if(e.target.value) setMake(e.target.value)};
$('mosel').onchange=e=>{model=e.target.value; vshown=12; renderVeh()};
$('vmore').onclick=()=>{vshown+=12; renderVeh()};
function setMake(m){if(!VI[m])return; make=m; model=''; vshown=12;
  root.querySelectorAll('#makes [data-mk]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mk===m));
  $('mksel').value=m;
  const models=Object.keys(VI[m]).sort();
  $('mosel').innerHTML='<option value="">All models ('+models.length+')</option>'+models.map(x=>`<option>${esc(x)}</option>`).join('');
  renderVeh();}
const FCOL=[['O','Oil'],['A','Air'],['H','Cabin'],['D','Diesel fuel'],['G','Petrol fuel'],['R','Coolant']];
function yrs(list){let lo=1e4,hi=0,open=false;
  list.forEach(y=>{if(!y)return; if(/-\s*$/.test(y))open=true; const ns=(y.match(/\d{2,4}/g)||[]); let base=null;
    ns.forEach(n=>{let v=+n; if(n.length===2&&base!==null)v=Math.floor(base/100)*100+v; else if(n.length===2)v=(v>40?1900:2000)+v; if(n.length===4)base=v; lo=Math.min(lo,v); hi=Math.max(hi,v);});});
  if(hi===0) return ''; return lo===hi?(open?lo+'–':''+lo):lo+'–'+(open&&hi===lo?'':hi);}
function mergeRows(rows){const g={};
  rows.forEach(r=>{const a=r.a, sig=FCOL.map(([k])=>r.f[k]?[...r.f[k]].sort().join(','):'').join('|'); const key=[a[3],a[5],a[4],sig].join('#');
    const x=(g[key]=g[key]||{en:a[3],cc:a[5],fu:a[4],v:new Set(),y:[],f:r.f}); if(a[2])x.v.add(a[2]); x.y.push(a[6]);});
  return Object.values(g).map(x=>{const v=[...x.v]; return {a:[0,'',v.slice(0,4).join(', ')+(v.length>4?` +${v.length-4}`:''),x.en,x.fu,x.cc,yrs(x.y)],f:x.f};})
    .sort((a,b)=>(a.a[3]+a.a[6]).localeCompare(b.a[3]+b.a[6]));}
function renderVeh(){
  const mo=VI[make]||{}, models=(model?[model]:Object.keys(mo).sort());
  const used=FCOL.filter(([k])=>models.some(m=>Object.values(mo[m]).some(r=>r.f[k])));
  let html=`<thead><tr><th>Variant</th><th>Engine</th><th>cc</th><th>Fuel</th><th>Years</th>${used.map(([,l])=>`<th>${l}</th>`).join('')}</tr></thead><tbody>`;
  models.slice(0,vshown).forEach(m=>{
    const rows=mergeRows(Object.values(mo[m]));
    html+=`<tr class="model"><td colspan="${5+used.length}">${esc(make)} ${esc(m)}</td></tr>`;
    rows.forEach(r=>{const a=r.a; html+=`<tr><td class="num">${esc(a[2])}</td><td class="num">${esc(a[3])}</td><td class="num">${esc(a[5])}</td><td>${a[4]?`<span class="fuel">${FUEL[a[4]]}</span>`:''}</td><td class="num">${esc(a[6])}</td>`+
      used.map(([k])=>`<td>${r.f[k]?[...r.f[k]].sort().map(pn=>`<span class="pnl" style="--fc:${col(BY[pn].code)}" data-pn="${pn}">${pn}</span>`).join(''):''}</td>`).join('')+'</tr>';});
  });
  $('vtab').innerHTML=html+'</tbody>';
  $('vcount').textContent=`${models.length} model${models.length===1?'':'s'}`;
  $('vmore').hidden=vshown>=models.length;
}
function setMode(m){mode=m; $('v-prod').hidden=m!=='prod'; $('v-veh').hidden=m!=='veh';
  $('m-prod').setAttribute('aria-pressed',m==='prod'); $('m-veh').setAttribute('aria-pressed',m==='veh');
  if(m==='veh' && !$('vtab').innerHTML) setMake(make);
  if($('drawer').hidden) setHash(m==='veh'?'#vehicles':'#products');}
$('m-prod').onclick=()=>setMode('prod'); $('m-veh').onclick=()=>setMode('veh');

function route(){const h=location.hash.slice(1);
  if(h==='vehicles') setMode('veh'); else if(BY[h]) open(h); else if(h==='products') setMode('prod');}
window.addEventListener('hashchange',route);
function syncViews(){root.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.view===view));}
$('cta-type').onclick=()=>{setMode('prod');$('fams').scrollIntoView({behavior:'smooth',block:'start'})};
$('cta-veh').onclick=()=>{setMode('veh');$('v-veh').scrollIntoView({behavior:'smooth',block:'start'})};
$('st-n').textContent=P.length.toLocaleString('en');$('st-m').textContent=pfilt()?Object.keys(VI).length:MAKES.length;
$('st-x').textContent=P.reduce((s,p)=>s+p.oe.length+Object.values(p.xr).flat().length,0).toLocaleString('en');
const U=new URLSearchParams(location.search);
if(U.get('q')){q=U.get('q').trim();$('q').value=q;}
const uf=String(U.get('fam')||'').toUpperCase();if(uf==='F'||FAM.some(f=>f.k===uf))fam=uf;
const uc=String(U.get('code')||'').toUpperCase();if(CODE[uc]){code=uc;fam=famOf(uc).k;}
syncViews(); renderFams(); renderGrid(true);
const um=U.get('make');if(um){const mm=Object.keys(VI).find(m=>m.toUpperCase()===um.toUpperCase());if(mm){setMode('veh');setMake(mm);const mo=U.get('model');if(mo&&VI[mm][mo]){model=mo;$('mosel').value=mo;renderVeh();}}}
route();
addEventListener('storage',()=>{const a=$('d-add');if(a&&cur)a.textContent=addLabel(cur.pn);});
document.addEventListener('stravik-prices',prices);
}
})();
