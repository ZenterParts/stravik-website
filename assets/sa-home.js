// South Africa home page. Takes the place of the home page for an approved South African customer on a South African
// price group (T1 to T5, PREF). Everyone else keeps the general home page (home() in assets/app.js).
// It is built for each customer: a welcome, the headline figures, and one card for every product range that is both
// on the customer's account and in the South African range. Each card opens that range's catalogue, where the
// customer sees only the South African parts with their prices (assets/dealer.js keeps their price list to those parts).
// Data: StravikDealer.state.sa, from the Supabase function stravik_sa_stock(), which only answers approved South
// African customers and staff, so nothing here is in a public file.
// Loaded before app.js: the router asks StravikSA.home(app, redraw) first and draws the general home page if it says no.
// Stores and head offices of a network (Autobarn) get the product list instead of the range cards: every part of the
// South African range in one list, one section per range that opens and closes, each part with its technical details,
// OE numbers, price excl. VAT, VAT, price incl. VAT, availability and a quantity with minus and plus that fills the cart.
// The technical details come from stravik_sa_parts_info(), which answers the same customers as stravik_sa_stock().
(function(){
const SA_GROUPS=["T1","T2","T3","T4","T5","PREF"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SD=()=>window.StravikDealer;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>Number(n||0).toLocaleString("en-US");
const month=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||"");return m?MONTHS[+m[2]-1]+" "+m[1]:"";};
const hasSession=()=>{try{return !!localStorage.getItem("stravik-buyer-auth");}catch(e){return false;}};
const dealer=()=>{const D=SD();return D&&D.state&&D.state.me&&D.state.me.dealer||null;};
const eligible=()=>{const d=dealer();return !!(d&&d.status==="Approved"&&d.country==="South Africa"&&SA_GROUPS.indexOf(d.price_group)>=0);};
const stock=()=>{const D=SD();return eligible()&&D.state.sa&&D.state.sa.parts?D.state.sa:null;};

// the card of each range: [picture folder, text, catalogue address]. A range without an address here uses its
// standard catalogue page (assets/stdcat.js), found by the range name.
const CARDS={
  "Bulbs":["bulbs","Halogen, miniature, LED and HID xenon bulbs, each with its bulb type, base, voltage and wattage."],
  "Filters":["filters","Air, oil, fuel and cabin filters for passenger cars, bakkies, trucks and equipment.","#/filters"],
  "Wiper Blades":["wiper-blades","Conventional, flat, hybrid, rear and truck and bus wiper blades, with their OE and cross-reference numbers."],
  "Ignition Coils":["ignition-coils","Ignition coils, coil packs and pencil coils, each with its connector, OE numbers and vehicles."],
  "Water Pumps":["water-pumps","Mechanical and electric water pumps, with their OE and cross-reference numbers."],
  "Gas Springs":["gas-springs","Gas springs for boots, tailgates, bonnets and rear windows, each with its length, stroke, force and OE numbers.","#/gas-springs"],
  "Spark Plugs":["spark-plugs","Nickel copper, platinum and iridium spark plugs, each with its plug type, electrode gap and OE numbers."],
  "Batteries":["batteries","SMF, EFB, AGM and heavy duty starter batteries, each with its SAB number, case and capacity.","/batteries/catalogue/"],
  "Brakes":["braking","Brake pads, discs and shoes, each with its OE numbers.","#/brakes"],
  "Steering & Suspension":["steering-suspension","Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts.","#/steering"],
  "Shock Absorbers":["shock-absorbers","MacPherson struts, shock absorbers, strut cartridges and dampers.","#/shock-absorbers"],
  "Alternators":["alternators","Alternators and alternator parts, with vehicle fitment and OE numbers."],
  "Starters":["starters","12 V and 24 V starter motors, with vehicle fitment and OE numbers."],
  "Clutch Kits":["clutch-kits","Clutch kits and clutch discs, each with its kit type, OE and cross-reference numbers."],
  "Horns":["horns","Disc and trumpet horns for 12 V and 24 V, single or as high and low tone sets."]
};
function catalogue(range){
  const c=CARDS[range];if(c&&c[2])return c[2];
  const cats=window.StdCat&&StdCat.cats||{};
  const id=Object.keys(cats).find(k=>cats[k].cat===range);
  return id?"#/"+id:"#/products";
}
function card(r){
  const c=CARDS[r.range]||[],inStock=r.parts_in_stock>0,exp=month(r.expected);
  const meta=inStock?num(r.parts_in_stock)+(r.parts_in_stock===1?" part":" parts")+" in stock":num(r.parts)+(r.parts===1?" part":" parts")+(exp?" · Expected "+exp:"");
  return `<article class="pcat sa-card"><a class="pic photo" href="${catalogue(r.range)}" tabindex="-1" aria-hidden="true">${c[0]?`<img src="/assets/img/${c[0]}/card.webp" alt="" loading="lazy">`:""}</a>
    <div class="body"><h3>${esc(r.range)}</h3>${c[1]?`<p>${esc(c[1])}</p>`:""}<small class="meta">${esc(meta)}</small>
    <div class="plinks"><a class="btn gold" href="${catalogue(r.range)}">View ${esc(r.range.toLowerCase())}</a></div></div></article>`;
}

const wait=app=>{app.innerHTML=`<div class="wrap" style="padding:60px 0" data-sa="wait"><p class="loading">Loading…</p></div>`;};

function draw(app,data){
  const landed=data.parts_in_stock>0,first=month(data.expected_from);
  const stats=landed
    ?[[num(data.parts_in_stock),"parts in stock in South Africa"],[num(data.ranges.length),data.ranges.length===1?"product range":"product ranges"]]
    :[[num(data.parts),"parts in the South Africa range"],[num(data.ranges.length),data.ranges.length===1?"product range":"product ranges"],[esc(first||"Soon"),"first deliveries expected"]];
  app.innerHTML=`
  <div class="pagehead sa-head" data-sa="home"><div class="wrap">
    <div class="eyebrow-d">South Africa</div>
    <h1>Welcome to Stravik</h1>
    <p>Thank you for choosing Stravik. Your product ranges for South Africa are below. Choose a range to see its parts and your prices.</p>
  </div></div>
  <section class="sa-stats" aria-label="South Africa in numbers"><div class="wrap">${stats.map(s=>`<div class="sa-stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}</div></section>
  <section class="block sa-body"><div class="wrap">
    <div class="head"><div><h2>Your product ranges</h2><p>${landed?"The ranges available to you in South Africa.":"The ranges launching in South Africa, with the month each is expected."}</p></div><a class="btn line" href="#/find">Find a part</a></div>
    <div class="pcats sa-cards">${data.ranges.map(card).join("")}</div>
  </div></section>`;
}

// =====================================================================================================================
// product list for the stores and head offices of a network
// =====================================================================================================================
const inNetwork=()=>{const d=dealer();return !!(d&&d.network);};
const money=v=>v==null||v===""?"":"R"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const LS_KEY="stravik-sa-list-v1";
const L={open:null,text:"",info:null,infoFor:null,infoP:null};
try{const v=JSON.parse(sessionStorage.getItem(LS_KEY)||"null");if(v&&Array.isArray(v.open)){L.open=new Set(v.open);L.text=v.text||"";}}catch(e){}
const keep=()=>{try{sessionStorage.setItem(LS_KEY,JSON.stringify({open:Array.from(L.open||[]),text:L.text}));}catch(e){}};
const Cart=()=>window.STV&&STV.Cart;
// what is in the cart: part number -> quantity (the cart keeps one line per part)
const inCart=()=>{const m=new Map();try{Cart().items().forEach(i=>{if(i.key)m.set(i.key,Math.max(1,parseInt(i.qty,10)||1));});}catch(e){}return m;};
// the parts of the list: the South African range with this customer's price. stock rows: [part, available, on order, expected, range, description]
function listRows(data){
  const P=SD().state.prices,pm=P&&P.map,vat=P&&P.vat?Number(P.vat):0;if(!pm)return [];
  return data.stock.filter(x=>pm.has(x[0])).map(x=>{const p=Number(pm.get(x[0]).p);
    return {pn:x[0],avail:Number(x[1]||0),order:Number(x[2]||0),exp:x[3],range:x[4],desc:x[5]||"",price:p,vat:Math.round(p*vat*100)/100,incl:Math.round(p*(1+vat)*100)/100};});
}
const cartItem=r=>({key:r.pn,no:r.pn,cat:r.range,desc:r.desc,link:(r.range==="Filters"?"/filter/":"/part/")+encodeURIComponent(r.pn)+"/",kind:r.range==="Filters"?"filter":"std"});
const cut=(t,n)=>t.length>n?t.slice(0,n-1).replace(/[\s,;]+$/,"")+"…":t;
// info: [technical details, [OE numbers], [cross-references], [vehicles], number of vehicles]
function infoHtml(i){
  if(!i)return "";
  const oe=(i[1]||[]).join(", "),xr=(i[2]||[]).join(", "),veh=(i[3]||[]).join(", "),more=Math.max(0,(i[4]||0)-(i[3]||[]).length);
  return (i[0]?`<span class="sl-t">${esc(i[0])}</span>`:"")+(oe?`<span class="sl-t"><b>OE</b> ${esc(cut(oe,170))}</span>`:"")+
    (xr||veh?`<details class="sl-more"><summary>Cross-references and vehicles</summary>${xr?`<span class="sl-t"><b>Replaces</b> ${esc(xr)}</span>`:""}${veh?`<span class="sl-t"><b>Fits</b> ${esc(veh)}${more?", and "+num(more)+" more":""}</span>`:""}</details>`:"");
}
const infoText=i=>!i?"":[i[0]||"",(i[1]||[]).join(" "),(i[2]||[]).join(" "),(i[3]||[]).join(" ")].join(" ");
function loadInfo(){
  const id=dealer()&&dealer().id;
  if(L.infoFor!==id){L.infoFor=id;L.info=null;L.infoP=null;}
  return L.infoP||(L.infoP=SD().client().then(c=>c.rpc("stravik_sa_parts_info")).then(r=>{if(r.error)throw r.error;if(L.infoFor===id)L.info=r.data||{};return L.info;}).catch(e=>{console.error(e);L.infoP=null;return null;}));
}

function drawList(app,data){
  const rows=listRows(data),by=new Map();
  rows.forEach(r=>{if(!by.has(r.range))by.set(r.range,[]);by.get(r.range).push(r);});
  const names=Array.from(by.keys()).sort(),d=dealer(),landed=data.parts_in_stock>0,first=month(data.expected_from);
  if(!L.open)L.open=new Set(names.slice(0,1));
  const vatPct=Math.round((SD().state.prices&&Number(SD().state.prices.vat)||0)*100);
  const facts=num(rows.length)+(rows.length===1?" part":" parts")+" in "+num(names.length)+(names.length===1?" range":" ranges")+(landed?", "+num(data.parts_in_stock)+" in stock now":first?", first deliveries expected in "+esc(first):"");
  app.innerHTML=`
  <div class="pagehead sa-head sl-head" data-sa="home"><div class="wrap">
    <div class="eyebrow-d">${esc(d.head_office||(d.network&&d.network.name)||"South Africa")}</div>
    <h1>${esc(d.trading_name||d.company_name||"Your Stravik range")}</h1>
    <p>Your Stravik range for South Africa: ${facts}. Open a range and set the quantity next to a part to put it in your cart.</p>
  </div></div>
  <section class="block sa-body sl"><div class="wrap" id="sl">
    <div class="sl-bar">
      <label class="sl-search"><span>Search</span><input id="slq" type="search" placeholder="Part number, description, OE number or vehicle" value="${esc(L.text)}" autocomplete="off"></label>
      <button type="button" class="btn line sl-btn" id="slall"></button>
      <a class="sl-cart" id="slcart" href="#/cart"></a>
    </div>
    <div id="sllist"></div>
  </div></section>`;
  const root=app.querySelector("#sl"),box=root.querySelector("#sllist");
  const q=()=>L.text.trim().toLowerCase();
  const hit=r=>{const t=q();return !t||(r.pn+" "+r.desc+" "+infoText(L.info&&L.info[r.pn])).toLowerCase().indexOf(t)>=0;};

  function row(r,cart){
    const n=cart.get(r.pn)||0,where=r.avail>0?`<b>${num(r.avail)}</b>`:`<span class="sl-dim">${r.order&&r.exp?"Expected "+esc(month(r.exp)):"On order"}</span>`;
    return `<tr class="sl-row${n?" on":""}" data-pn="${esc(r.pn)}">
      <td class="sl-pn"><a href="${esc(cartItem(r).link)}">${esc(r.pn)}</a></td>
      <td class="sl-desc"><span class="sl-d">${esc(r.desc)}</span><div class="sl-info" data-info="${esc(r.pn)}">${infoHtml(L.info&&L.info[r.pn])}</div></td>
      <td class="sl-n" data-l="Available">${where}</td>
      <td class="sl-n" data-l="Price excl. VAT"><b>${esc(money(r.price))}</b></td>
      <td class="sl-n" data-l="VAT ${vatPct}%">${esc(money(r.vat))}</td>
      <td class="sl-n" data-l="Price incl. VAT">${esc(money(r.incl))}</td>
      <td class="sl-q"><div class="sl-qty"><button type="button" data-step="-1" aria-label="One less of ${esc(r.pn)}"${n?"":" disabled"}>−</button><input type="text" inputmode="numeric" maxlength="5" value="${n||""}" placeholder="0" aria-label="Quantity of ${esc(r.pn)} in your cart"><button type="button" data-step="1" aria-label="One more of ${esc(r.pn)}">+</button></div></td></tr>`;
  }
  function paint(){
    const cart=inCart(),t=q();let shown=0;
    box.innerHTML=names.map(rg=>{
      const list=by.get(rg).filter(hit);if(t&&!list.length)return "";
      shown+=list.length;
      const open=t?true:L.open.has(rg),exp=list.map(r=>r.exp).filter(Boolean).sort()[0],stocked=list.some(r=>r.avail>0),inc=list.filter(r=>cart.has(r.pn)).length;
      return `<details class="sl-range" data-range="${esc(rg)}"${open?" open":""}><summary><b>${esc(rg)}</b><span>${num(list.length)} ${list.length===1?"part":"parts"}</span><span>${stocked?"In stock":exp?"Expected "+esc(month(exp)):"On order"}</span><span class="sl-inc" data-inc${inc?"":" hidden"}>${inc} in your cart</span></summary>
        ${open?`<div class="sl-scroll"><table class="sl-table"><thead><tr><th>Part</th><th>Description</th><th class="sl-n">Available</th><th class="sl-n">Price excl. VAT</th><th class="sl-n">VAT ${vatPct}%</th><th class="sl-n">Price incl. VAT</th><th class="sl-n">Quantity</th></tr></thead><tbody>${list.map(r=>row(r,cart)).join("")}</tbody></table></div>`:""}</details>`;
    }).join("")||`<div class="sl-empty"><h3>No part matches “${esc(L.text.trim())}”</h3><p>Check the number, or search for less of it. The list holds the ${num(rows.length)} parts of your South Africa range.</p></div>`;
    root.querySelector("#slall").textContent=names.every(n=>L.open.has(n))?"Close all ranges":"Open all ranges";
    root.querySelector("#slall").hidden=!!t;
    box.querySelectorAll("details.sl-range").forEach(dt=>dt.addEventListener("toggle",()=>{
      const k=dt.dataset.range;if(q()||dt.open===L.open.has(k))return;
      if(dt.open)L.open.add(k);else L.open.delete(k);keep();paint();}));
    bar();
  }
  // the cart line at the top, and "n in your cart" on each range
  function bar(){
    const cart=inCart(),pr=new Map(rows.map(r=>[r.pn,r]));let units=0,val=0,lines=0;
    cart.forEach((n,k)=>{lines++;units+=n;if(pr.has(k))val+=n*pr.get(k).price;});
    const a=root.querySelector("#slcart");
    a.innerHTML=lines?`<b>${num(lines)} ${lines===1?"part":"parts"}, ${num(units)} ${units===1?"unit":"units"}</b><span>${esc(money(val))} excl. VAT</span><em>View cart</em>`:`<span>Your cart is empty</span>`;
    a.classList.toggle("has",lines>0);
    box.querySelectorAll("details.sl-range").forEach(dt=>{const n=by.get(dt.dataset.range).filter(r=>cart.has(r.pn)).length,e=dt.querySelector("[data-inc]");if(e){e.hidden=!n;e.textContent=n+" in your cart";}});
  }
  // set the quantity of one part in the cart: 0 takes it out
  function setQty(tr,n){
    const pn=tr.dataset.pn,r=rows.find(x=>x.pn===pn),C=Cart();if(!r||!C)return;
    n=Math.max(0,Math.min(99999,parseInt(n,10)||0));
    if(!n)C.remove(pn);else if(C.has(pn))C.set(pn,"qty",n);else C.add(cartItem(r),n);
    const inp=tr.querySelector("input");if(document.activeElement!==inp||String(n||"")!==inp.value.trim())inp.value=n||"";
    tr.classList.toggle("on",n>0);tr.querySelector("[data-step='-1']").disabled=!n;bar();
  }
  box.addEventListener("click",e=>{const b=e.target.closest("button[data-step]");if(!b)return;const tr=b.closest("tr.sl-row"),cur=inCart().get(tr.dataset.pn)||0;setQty(tr,cur+Number(b.dataset.step));});
  box.addEventListener("input",e=>{const i=e.target.closest(".sl-qty input");if(!i)return;i.value=i.value.replace(/\D/g,"");setQty(i.closest("tr.sl-row"),i.value);});
  box.addEventListener("keydown",e=>{const i=e.target.closest(".sl-qty input");if(!i)return;
    if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();setQty(i.closest("tr.sl-row"),(parseInt(i.value,10)||0)+(e.key==="ArrowUp"?1:-1));}
    if(e.key==="Enter"){e.preventDefault();const all=Array.from(box.querySelectorAll(".sl-qty input")),n=all[all.indexOf(i)+1];if(n){n.focus();n.select();}}});
  box.addEventListener("focusin",e=>{const i=e.target.closest(".sl-qty input");if(i)i.select();});
  root.querySelector("#slall").onclick=()=>{if(names.every(n=>L.open.has(n)))L.open.clear();else names.forEach(n=>L.open.add(n));keep();paint();};
  let tm=0;root.querySelector("#slq").oninput=e=>{L.text=e.target.value;keep();clearTimeout(tm);tm=setTimeout(paint,200);};
  paint();
  // the technical details arrive after the list is on screen: fill them in, and search again if someone is searching
  if(!L.info)loadInfo().then(i=>{if(!i||!root.isConnected)return;if(q())paint();else box.querySelectorAll("[data-info]").forEach(el=>{el.innerHTML=infoHtml(i[el.dataset.info]);});});
}

// Called by the router for the home route. Returns true when this page has taken the route (the South Africa page or
// "Loading…"), false when the general home page should be drawn. redraw() runs the router again once more is known.
function home(app,redraw){
  const D=SD();if(!D||!hasSession())return false;
  if(D.pending&&D.pending()){wait(app);D.ready().then(()=>{if(!location.hash.replace(/^#\/?/,"")&&typeof redraw==="function")redraw();});return true;}
  const hq=dealer();if(hq&&hq.status==="Approved"&&hq.account_type==="head_office"){wait(app);location.replace("/autobarn/");return true;}   // a head office's home is its dashboard
  const data=stock();if(!data)return false;
  if(inNetwork()&&listRows(data).length)drawList(app,data);else draw(app,data);return true;
}

// signed in, out, or approved while the home page is open: draw the right version
let redrawFn=null;
document.addEventListener("stravik-prices",()=>{
  const app=document.getElementById("app");if(!app||location.hash.replace(/^#\/?/,""))return;
  const showing=!!app.querySelector("[data-sa=home]"),want=hasSession()&&!!stock();
  if(showing!==want&&redrawFn)redrawFn();
});
window.StravikSA={home:(app,redraw)=>{redrawFn=redraw||redrawFn;return home(app,redraw);},eligible};
})();
