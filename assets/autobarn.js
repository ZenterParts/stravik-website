// The Autobarn page (/autobarn/): the network's own way in to Stravik.
//   - not signed in: sign in (the same customer accounts as the rest of the site, assets/dealer.js)
//   - a store: a short welcome with the way to its range, cart and orders
//   - the head office: its dashboard. Orders of the stores under it (who ordered what, how many, when), the store list,
//     what was ordered by part, the price list with a column for its own suggested prices, and the launch dates.
// Data: Supabase functions stravik_hq_overview(), stravik_my_price_suggestions(), stravik_suggest_prices(); the price
// list is the head office's own (StravikDealer.state.prices) kept to the South African range (StravikDealer.state.sa).
// Nothing here is in a public file: every function answers only the signed-in account it is meant for.
(function(){
"use strict";
const NET=document.body.dataset.network||"autobarn",NAME=document.body.dataset.networkName||"Autobarn";
const app=document.getElementById("app");
const SD=()=>window.StravikDealer;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>Number(n||0).toLocaleString("en-US");
const money=v=>v==null||v===""?"":"R"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const day=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
const monthOf=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||"");return m?["January","February","March","April","May","June","July","August","September","October","November","December"][+m[2]-1]+" "+m[1]:"";};
const must=r=>{if(r.error)throw r.error;return r.data;};
const toast=m=>window.STV&&STV.toast(m);
const STATUS={"With DPW":"With fulfilment centre"};
const st=s=>STATUS[s]||s;
const msg=e=>{const m=String(e&&(e.message||e.error_description)||e);
  if(/invalid login credentials/i.test(m))return "The email or password is wrong.";
  if(/rate limit/i.test(m))return "Too many attempts. Wait a few minutes and try again.";
  if(/confirm/i.test(m))return "Confirm your email first: open the link we sent you.";
  return m;};
const head=(title,lead,eyebrow)=>`<div class="pagehead ab-head"><div class="wrap">${eyebrow?`<div class="eyebrow-d">${esc(eyebrow)}</div>`:""}<h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:""}</div></div>`;

let C=null;   // Supabase client

// ---------------------------------------------------------------------------------------------------------------
// sign in
// ---------------------------------------------------------------------------------------------------------------
function signIn(){
  document.title=NAME+" login | Stravik";
  app.innerHTML=head(NAME+" stores","Sign in to see your Stravik range and prices, send orders and follow them to delivery.","Stravik for "+NAME)+
  `<div class="wrap ab-in">
    <form class="enq ab-card" id="abf" novalidate>
      <h2 class="full">Sign in</h2>
      <div class="full"><label for="abe">Email</label><input id="abe" type="email" autocomplete="email" required></div>
      <div class="full"><label for="abp">Password</label><input id="abp" type="password" autocomplete="current-password" minlength="8" required></div>
      <div class="full ab-row"><button class="btn gold" type="submit" id="abgo">Sign in</button><button type="button" class="linkbtn" id="abforgot">Forgot your password?</button></div>
      <div class="status" id="abst" role="alert"></div>
    </form>
    <aside class="ab-side">
      <h2>New ${esc(NAME)} store?</h2>
      <p>Each store has its own account. Register your store once; we check it with ${esc(NAME)} head office and email you when your prices are ready.</p>
      <p><a class="btn line" href="/#/dealer?m=new&g=${esc(NET)}">Register your store</a></p>
      <h2>What you can do here</h2>
      <ul><li>See the Stravik range stocked in South Africa, with your prices</li><li>Order online for delivery to your store</li><li>Follow each order, its invoice and its delivery</li></ul>
    </aside>
  </div>`;
  const f=app.querySelector("#abf"),stE=f.querySelector("#abst"),btn=f.querySelector("#abgo");
  const say=(h,good)=>{stE.innerHTML=h;stE.classList.add("show");stE.classList.toggle("ok",!!good);};
  f.querySelector("#abforgot").onclick=async()=>{
    const e=f.querySelector("#abe").value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter your email address first, then choose “Forgot your password?” again.");f.querySelector("#abe").focus();return;}
    const r=await C.auth.resetPasswordForEmail(e,{redirectTo:location.origin+"/#/dealer/password"});
    say(r.error?esc(msg(r.error)):"If there is an account for <b>"+esc(e)+"</b>, we have emailed a link to choose a new password.",!r.error);
  };
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();
    const e=f.querySelector("#abe").value.trim(),p=f.querySelector("#abp").value;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter an email address like name@store.co.za.");return;}
    if(p.length<8){say("The password has at least 8 characters.");return;}
    btn.disabled=true;stE.classList.remove("show");
    try{const r=await C.auth.signInWithPassword({email:e,password:p});if(r.error)throw r.error;start();}
    catch(err){say(esc(msg(err)));btn.disabled=false;}
  });
}
async function signOut(){try{await C.auth.signOut();}catch(e){}try{await SD().refresh();}catch(e){}signIn();}

// ---------------------------------------------------------------------------------------------------------------
// accounts that are not a head office
// ---------------------------------------------------------------------------------------------------------------
function note(title,html){
  app.innerHTML=head(title,null,"Stravik for "+NAME)+`<div class="wrap ab-note"><div class="dnote">${html}</div><p><button class="btn line" type="button" id="about">Sign out</button></p></div>`;
  app.querySelector("#about").onclick=signOut;
}
function store(d){
  document.title=(d.trading_name||d.company_name)+" | Stravik";
  const sa=SD().state.sa,landed=sa&&sa.parts_in_stock>0;
  app.innerHTML=head(d.trading_name||d.company_name,sa?(landed?`${num(sa.parts_in_stock)} Stravik parts are in stock in South Africa for your store.`:`${num(sa.parts)} Stravik parts are on their way to South Africa${sa.expected_from?", first deliveries expected in "+esc(monthOf(sa.expected_from)):""}.`):"Your Stravik account.",d.head_office?d.head_office:"Stravik for "+NAME)+
  `<div class="wrap ab-note"><div class="ab-go"><a class="btn gold" href="/">See your range and prices</a><a class="btn line" href="/#/cart">Your cart</a><a class="btn line" href="/#/dealer">Your orders</a></div>
   <p class="dhint">Signed in as ${esc(d.email)}. <button type="button" class="linkbtn" id="about">Sign out</button></p></div>`;
  app.querySelector("#about").onclick=signOut;
}

// ---------------------------------------------------------------------------------------------------------------
// head office dashboard
// ---------------------------------------------------------------------------------------------------------------
const H={data:null,sug:new Map(),dirty:new Map(),tab:"orders",period:"all",store:"",status:"",text:"",stores:"all",open:new Set(),ranges:new Set()};
const TABS=[["orders","Orders"],["stores","Stores"],["products","Parts ordered"],["prices","Price list"],["launch","Launch dates"]];
const PERIODS=[["all","All orders"],["month","This month"],["last","Last month"],["90","Last 90 days"]];

function inPeriod(o){
  if(H.period==="all")return true;
  const t=new Date(o.created_at),n=new Date();
  if(H.period==="90")return n-t<90*864e5;
  const m=new Date(n.getFullYear(),n.getMonth()-(H.period==="last"?1:0),1),e=new Date(m.getFullYear(),m.getMonth()+1,1);
  return t>=m&&t<e;
}
// the orders the filters leave: period, store, status and a search on order number, PO, part number or description
function orders(){
  const q=H.text.trim().toLowerCase();
  return H.data.orders.filter(o=>inPeriod(o)&&(!H.store||o.store===H.store)&&(!H.status||o.status===H.status)&&
    (!q||[o.order_no,o.po_ref,o.store].concat((o.items||[]).map(i=>i.pn+" "+(i.description||""))).join(" ").toLowerCase().indexOf(q)>=0));
}
const live=os=>os.filter(o=>o.status!=="Cancelled");

function hq(d){
  document.title=NAME+" head office | Stravik";
  const t=(location.hash||"").replace(/^#\/?/,"");if(TABS.some(x=>x[0]===t))H.tab=t;
  const D=H.data,stores=D.stores,reg=stores.filter(s=>s.registered).length;
  app.innerHTML=head((D.network&&D.network.name||NAME)+" head office","Every order your stores send to Stravik, the parts they order, your prices and the launch dates.","Stravik for "+NAME)+
  `<section class="ab-stats" aria-label="Your network in numbers"><div class="wrap" id="abstats"></div></section>
   <div class="wrap ab-dash">
     <div class="ab-tabs" role="tablist">${TABS.map(x=>`<button type="button" role="tab" data-tab="${x[0]}" aria-selected="${x[0]===H.tab}">${esc(x[1])}</button>`).join("")}</div>
     <div id="abpane"></div>
     <p class="dhint ab-foot">Signed in as ${esc(d.email)}. <button type="button" class="linkbtn" id="about">Sign out</button></p>
   </div>`;
  app.querySelector("#about").onclick=signOut;
  app.querySelectorAll(".ab-tabs button").forEach(b=>b.onclick=()=>{
    if(H.dirty.size&&H.tab==="prices"&&!confirm("You have suggested prices that are not saved. Leave without saving?"))return;
    H.dirty.clear();H.tab=b.dataset.tab;history.replaceState(null,"","#"+H.tab);
    app.querySelectorAll(".ab-tabs button").forEach(x=>x.setAttribute("aria-selected",x===b));pane();});
  stats(reg);pane();
}
function stats(reg){
  const D=H.data,os=live(D.orders.filter(inPeriod)),ordering=new Set(os.map(o=>o.store)).size;
  const cells=[[num(reg)+" of "+num(D.stores.length),"stores registered"],[num(ordering),ordering===1?"store has ordered":"stores have ordered"],[num(os.length),os.length===1?"order":"orders"],
    [num(os.reduce((a,o)=>a+(o.units||0),0)),"units ordered"],[money(os.reduce((a,o)=>a+Number(o.subtotal||0),0)),"order value excl. VAT"]];
  app.querySelector("#abstats").innerHTML=cells.map(c=>`<div class="ab-stat"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join("");
}
function pane(){({orders:paneOrders,stores:paneStores,products:paneProducts,prices:panePrices,launch:paneLaunch})[H.tab]();}
const P=()=>app.querySelector("#abpane");

// filters shared by Orders and Parts ordered
function filterBar(extra){
  const D=H.data,names=Array.from(new Set(D.stores.filter(s=>s.registered).map(s=>s.name))).sort(),sts=Array.from(new Set(D.orders.map(o=>o.status)));
  return `<div class="ab-filters">
    <label>Period<select id="fper">${PERIODS.map(p=>`<option value="${p[0]}"${p[0]===H.period?" selected":""}>${esc(p[1])}</option>`).join("")}</select></label>
    <label>Store<select id="fstore"><option value="">All stores</option>${names.map(n=>`<option${n===H.store?" selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label>Status<select id="fstat"><option value="">Any status</option>${sts.map(s=>`<option value="${esc(s)}"${s===H.status?" selected":""}>${esc(st(s))}</option>`).join("")}</select></label>
    <label class="grow">Search<input id="ftext" type="search" placeholder="Order, PO or part number" value="${esc(H.text)}"></label>
    ${extra||""}</div>`;
}
function wireFilters(){
  const g=id=>P().querySelector(id),re=()=>{stats(H.data.stores.filter(s=>s.registered).length);pane();};
  g("#fper").onchange=e=>{H.period=e.target.value;re();};
  g("#fstore").onchange=e=>{H.store=e.target.value;re();};
  g("#fstat").onchange=e=>{H.status=e.target.value;re();};
  let tm=0;g("#ftext").oninput=e=>{H.text=e.target.value;clearTimeout(tm);tm=setTimeout(()=>{const pos=e.target.selectionStart;pane();const n=g("#ftext");n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}},250);};
}
const empty=(t,p)=>`<div class="ab-empty"><h3>${esc(t)}</h3><p>${p}</p></div>`;

// ---- Orders: one row per order, opened to see its lines
function paneOrders(){
  const os=orders();
  P().innerHTML=filterBar(`<button type="button" class="btn line small" id="oxls">Download</button>`)+
    (!H.data.orders.length?empty("No orders yet","When a store under your head office sends an order, it appears here with its parts, quantities and status."):
     !os.length?empty("No orders match","Change the period, store, status or search to see more orders."):
    `<div class="ab-scroll"><table class="ab-table" id="otable"><thead><tr><th>Date</th><th>Order</th><th>Store</th><th class="n">Lines</th><th class="n">Units</th><th class="n">Value excl. VAT</th><th>Status</th></tr></thead><tbody>${os.map(o=>{
      const open=H.open.has(o.order_no);
      return `<tr class="ab-o${open?" open":""}" data-o="${esc(o.order_no)}" tabindex="0" aria-expanded="${open}"><td>${esc(day(o.created_at))}</td><td class="no">${esc(o.order_no)}</td><td>${esc(o.store)}</td><td class="n">${num(o.lines)}</td><td class="n">${num(o.units)}</td><td class="n">${esc(money(o.subtotal))}</td><td><span class="ab-pill s-${esc(o.status.toLowerCase().replace(/\s+/g,"-"))}">${esc(st(o.status))}</span></td></tr>`+
        (open?`<tr class="ab-od"><td colspan="7"><div class="ab-odb">${[o.po_ref?"Store PO: <b>"+esc(o.po_ref)+"</b>":"",o.invoice_no?"Invoice: <b>"+esc(o.invoice_no)+"</b>"+(o.invoice_date?" of "+esc(day(o.invoice_date)):""):"",o.dispatched_at?"Dispatched "+esc(day(o.dispatched_at)):"",o.delivered_at?"Delivered "+esc(day(o.delivered_at)):""].filter(Boolean).map(x=>`<span>${x}</span>`).join("")}</div>
          <table class="ab-table lines"><thead><tr><th>Part</th><th>Description</th><th>Range</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th></tr></thead><tbody>${(o.items||[]).map(i=>`<tr><td class="no">${esc(i.pn)}</td><td>${esc(i.description||"")}</td><td>${esc(i.range||"")}</td><td class="n">${num(i.qty)}</td><td class="n">${esc(money(i.price))}</td><td class="n">${esc(money(i.total))}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td colspan="5">Subtotal</td><td class="n">${esc(money(o.subtotal))}</td></tr><tr><td colspan="5">VAT</td><td class="n">${esc(money(o.vat_amount))}</td></tr><tr><td colspan="5"><b>Total</b></td><td class="n"><b>${esc(money(o.total))}</b></td></tr></tfoot></table></td></tr>`:"");
    }).join("")}</tbody></table></div>`);
  wireFilters();
  const tb=P().querySelector("#otable");
  if(tb){const tog=tr=>{const k=tr.dataset.o;if(H.open.has(k))H.open.delete(k);else H.open.add(k);paneOrders();};
    tb.onclick=e=>{const tr=e.target.closest("tr.ab-o");if(tr)tog(tr);};
    tb.onkeydown=e=>{if(e.key!=="Enter"&&e.key!==" ")return;const tr=e.target.closest("tr.ab-o");if(tr){e.preventDefault();const k=tr.dataset.o;tog(tr);const n=P().querySelector(`tr.ab-o[data-o="${k}"]`);if(n)n.focus();}};}
  P().querySelector("#oxls").onclick=()=>xlsx([
    {name:"Orders",widths:[12,18,32,14,8,8,14,14,14,20,14],head:["Date","Order","Store","Store PO","Lines","Units","Value excl. VAT","VAT","Total incl. VAT","Status","Invoice"],
      rows:os.map(o=>[day(o.created_at),o.order_no,o.store,o.po_ref||"",o.lines,o.units,Number(o.subtotal||0),Number(o.vat_amount||0),Number(o.total||0),st(o.status),o.invoice_no||""])},
    {name:"Order lines",widths:[12,18,32,14,50,16,8,12,14,20],head:["Date","Order","Store","Part","Description","Range","Qty","Price excl. VAT","Total excl. VAT","Status"],
      rows:os.flatMap(o=>(o.items||[]).map(i=>[day(o.created_at),o.order_no,o.store,i.pn,i.description||"",i.range||"",i.qty,Number(i.price||0),Number(i.total||0),st(o.status)]))}
  ],"Stravik_"+NAME+"_orders.xlsx");
}

// ---- Stores: every store of the network, registered with Stravik or not
function paneStores(){
  const all=H.data.stores,F=[["all","All stores"],["ordered","Have ordered"],["quiet","Registered, no order yet"],["none","Not registered"]];
  const keep={all:()=>true,ordered:s=>s.orders>0,quiet:s=>s.registered&&!s.orders,none:s=>!s.registered}[H.stores];
  const rows=all.filter(keep).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
  P().innerHTML=`<div class="ab-filters"><div class="ab-chips" role="group" aria-label="Show">${F.map(f=>`<button type="button" data-f="${f[0]}" aria-pressed="${f[0]===H.stores}">${esc(f[1])} <span>${num(all.filter({all:()=>true,ordered:s=>s.orders>0,quiet:s=>s.registered&&!s.orders,none:s=>!s.registered}[f[0]]).length)}</span></button>`).join("")}</div>
    <button type="button" class="btn line small" id="sxls">Download</button></div>`+
    (!rows.length?empty("No stores here","No store is in this group."):
    `<div class="ab-scroll"><table class="ab-table"><thead><tr><th>Store</th><th>Town</th><th>Province</th><th>Class</th><th>Stravik account</th><th class="n">Orders</th><th class="n">Units</th><th class="n">Value excl. VAT</th><th>Last order</th></tr></thead><tbody>${rows.map(s=>
      `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.town||"")}</td><td>${esc(s.country&&s.country!=="South Africa"?s.country:s.province||"")}</td><td>${esc(s.class||"")}</td><td>${s.registered?`<span class="ab-pill ${s.status==="Approved"?"ok":""}">${esc(s.status==="Approved"?"Registered":s.status==="Pending"?"Being reviewed":s.status||"")}</span>`:`<span class="ab-dim">Not registered</span>`}</td><td class="n">${s.orders?num(s.orders):""}</td><td class="n">${s.units?num(s.units):""}</td><td class="n">${s.value?esc(money(s.value)):""}</td><td>${esc(day(s.last_order))}</td></tr>`).join("")}</tbody></table></div>
     <p class="dhint">Orders, units and value count every order of the last 18 months that was not cancelled. Class A is metro, B a regional hub town, C small town and rural.</p>`);
  P().querySelectorAll(".ab-chips button").forEach(b=>b.onclick=()=>{H.stores=b.dataset.f;paneStores();});
  P().querySelector("#sxls").onclick=()=>xlsx([{name:"Stores",widths:[38,24,18,16,8,18,8,8,16,14],head:["Store","Town","Province","Country","Class","Stravik account","Orders","Units","Value excl. VAT","Last order"],
    rows:rows.map(s=>[s.name,s.town||"",s.province||"",s.country||"",s.class||"",s.registered?(s.status==="Approved"?"Registered":s.status):"Not registered",s.orders,s.units,Number(s.value||0),day(s.last_order)])}],"Stravik_"+NAME+"_stores.xlsx");
}

// ---- Parts ordered: what was ordered, by range and by part, and which stores ordered it
function paneProducts(){
  const os=live(orders()),parts=new Map(),ranges=new Map();
  os.forEach(o=>(o.items||[]).forEach(i=>{
    let p=parts.get(i.pn);if(!p)parts.set(i.pn,p={pn:i.pn,d:i.description,r:i.range||"",u:0,v:0,s:new Map()});
    p.u+=i.qty;p.v+=Number(i.total||0);p.s.set(o.store,(p.s.get(o.store)||0)+i.qty);
    let r=ranges.get(p.r);if(!r)ranges.set(p.r,r={r:p.r,u:0,v:0,p:new Set(),s:new Set()});
    r.u+=i.qty;r.v+=Number(i.total||0);r.p.add(i.pn);r.s.add(o.store);}));
  const pr=Array.from(parts.values()).sort((a,b)=>b.u-a.u||a.pn.localeCompare(b.pn)),rr=Array.from(ranges.values()).sort((a,b)=>b.v-a.v),top=Math.max(1,...rr.map(r=>r.v));
  P().innerHTML=filterBar(`<button type="button" class="btn line small" id="pxls">Download</button>`)+
    (!pr.length?empty("Nothing ordered here","No order that is not cancelled matches the period, store, status and search."):
    `<h2 class="ab-h">By range</h2><div class="ab-bars">${rr.map(r=>`<div class="ab-bar"><span class="l">${esc(r.r)}</span><span class="t"><i style="width:${Math.max(2,Math.round(r.v/top*100))}%"></i></span><span class="v">${esc(money(r.v))}</span><span class="m">${num(r.u)} units, ${num(r.p.size)} ${r.p.size===1?"part":"parts"}, ${num(r.s.size)} ${r.s.size===1?"store":"stores"}</span></div>`).join("")}</div>
     <h2 class="ab-h">By part</h2><div class="ab-scroll"><table class="ab-table"><thead><tr><th>Part</th><th>Description</th><th>Range</th><th class="n">Units</th><th class="n">Value excl. VAT</th><th>Ordered by</th></tr></thead><tbody>${pr.map(p=>
      `<tr><td class="no">${esc(p.pn)}</td><td>${esc(p.d||"")}</td><td>${esc(p.r)}</td><td class="n">${num(p.u)}</td><td class="n">${esc(money(p.v))}</td><td class="ab-by">${Array.from(p.s).sort((a,b)=>b[1]-a[1]).map(x=>esc(x[0])+" <b>"+num(x[1])+"</b>").join(", ")}</td></tr>`).join("")}</tbody></table></div>`);
  wireFilters();
  P().querySelector("#pxls").onclick=()=>xlsx([
    {name:"By part",widths:[14,50,16,8,14,60],head:["Part","Description","Range","Units","Value excl. VAT","Ordered by (units)"],rows:pr.map(p=>[p.pn,p.d||"",p.r,p.u,p.v,Array.from(p.s).map(x=>x[0]+" ("+x[1]+")").join(", ")])},
    {name:"By store and part",widths:[32,14,50,16,8],head:["Store","Part","Description","Range","Units"],rows:pr.flatMap(p=>Array.from(p.s).map(x=>[x[0],p.pn,p.d||"",p.r,x[1]])).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]))},
    {name:"By range",widths:[18,8,8,8,14],head:["Range","Parts","Stores","Units","Value excl. VAT"],rows:rr.map(r=>[r.r,r.p.size,r.s.size,r.u,r.v])}
  ],"Stravik_"+NAME+"_parts_ordered.xlsx");
}

// ---- Price list: the South African range with the head office's prices, and its own suggested price per part
function priceRows(){
  const S=SD().state,sa=S.sa,pm=S.prices&&S.prices.map,vat=S.prices&&S.prices.vat?Number(S.prices.vat):0;
  if(!sa||!pm)return [];
  // stock rows: [part, available, on order, expected, range, description]
  return sa.stock.filter(x=>pm.has(x[0])).map(x=>{const p=Number(pm.get(x[0]).p);return {pn:x[0],avail:Number(x[1]||0),order:Number(x[2]||0),exp:x[3],range:x[4],desc:x[5],price:p,vat:Math.round(p*vat*100)/100,incl:Math.round(p*(1+vat)*100)/100};});
}
const sugOf=pn=>H.dirty.has(pn)?H.dirty.get(pn):(H.sug.has(pn)?String(H.sug.get(pn)):"");
function panePrices(){
  const rows=priceRows(),vatPct=Math.round((SD().state.prices&&Number(SD().state.prices.vat)||0)*100),by=new Map();
  rows.forEach(r=>{if(!by.has(r.range))by.set(r.range,[]);by.get(r.range).push(r);});
  const q=(H.ptext||"").trim().toLowerCase(),hit=r=>!q||(r.pn+" "+(r.desc||"")).toLowerCase().indexOf(q)>=0;
  P().innerHTML=!rows.length?empty("No price list yet","Your prices appear here as soon as the South African range is priced for your account."):
   `<div class="ab-filters"><label class="grow">Search<input id="ptext" type="search" placeholder="Part number or description" value="${esc(H.ptext||"")}"></label>
      <button type="button" class="btn line small" id="pall">${H.ranges.size===by.size?"Close all ranges":"Open all ranges"}</button>
      <button type="button" class="btn line small" id="pdl">Download price list</button><button type="button" class="btn line small" id="pup">Upload suggested prices</button><input type="file" id="pfile" accept=".xlsx" hidden></div>
    <p class="ab-lead">Tell us where a price should be. Type your suggested price excl. VAT next to a part, or download the list, fill in the “Your suggested price” column and upload it. We use your suggestions to check our prices against the market; they do not change a price.</p>
    ${Array.from(by.keys()).sort().map(rg=>{const list=by.get(rg).filter(hit),open=q?list.length>0:H.ranges.has(rg),exp=list.map(r=>r.exp).filter(Boolean).sort()[0],n=list.filter(r=>sugOf(r.pn)!=="").length;
      if(q&&!list.length)return "";
      return `<details class="ab-range" data-range="${esc(rg)}"${open?" open":""}><summary><b>${esc(rg)}</b><span>${num(list.length)} ${list.length===1?"part":"parts"}</span>${exp&&!list.some(r=>r.avail>0)?`<span>Expected ${esc(monthOf(exp))}</span>`:""}${n?`<span class="ab-pill ok">${num(n)} suggested</span>`:""}</summary>
        ${open?`<div class="ab-scroll"><table class="ab-table prices"><thead><tr><th>Part</th><th>Description</th><th class="n">Available</th><th class="n">Price excl. VAT</th><th class="n">VAT ${vatPct}%</th><th class="n">Price incl. VAT</th><th class="n">Your suggested price</th></tr></thead><tbody>${list.map(r=>
          `<tr><td class="no"><a href="/part/${esc(r.pn)}/">${esc(r.pn)}</a></td><td>${esc(r.desc||"")}</td><td class="n">${r.avail>0?num(r.avail):`<span class="ab-dim">${r.order?"On order":"0"}</span>`}</td><td class="n">${esc(money(r.price))}</td><td class="n">${esc(money(r.vat))}</td><td class="n">${esc(money(r.incl))}</td><td class="n"><input class="ab-sug${H.dirty.has(r.pn)?" dirty":""}" data-pn="${esc(r.pn)}" inputmode="decimal" aria-label="Your suggested price for ${esc(r.pn)}, excl. VAT" value="${esc(sugOf(r.pn))}"></td></tr>`).join("")}</tbody></table></div>`:""}</details>`;}).join("")}
    <div class="ab-save" id="psave"${H.dirty.size?"":" hidden"}><span id="pcount"></span><button type="button" class="btn gold" id="pgo">Save suggested prices</button><button type="button" class="linkbtn" id="pundo">Undo changes</button></div>`;
  if(!rows.length)return;
  const paintSave=()=>{const b=P().querySelector("#psave");b.hidden=!H.dirty.size;P().querySelector("#pcount").textContent=H.dirty.size+(H.dirty.size===1?" change":" changes")+" not saved";};
  paintSave();
  P().querySelectorAll("details.ab-range").forEach(dt=>dt.addEventListener("toggle",()=>{const k=dt.dataset.range;if(q)return;if(dt.open===H.ranges.has(k))return;if(dt.open)H.ranges.add(k);else H.ranges.delete(k);panePrices();}));
  P().querySelector("#pall").onclick=()=>{if(H.ranges.size===by.size)H.ranges.clear();else by.forEach((v,k)=>H.ranges.add(k));panePrices();};
  let tm=0;P().querySelector("#ptext").oninput=e=>{H.ptext=e.target.value;clearTimeout(tm);tm=setTimeout(()=>{const pos=e.target.selectionStart;panePrices();const n=P().querySelector("#ptext");n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}},250);};
  P().oninput=onSug;
  function onSug(e){const i=e.target.closest(".ab-sug");if(!i)return;const pn=i.dataset.pn,v=i.value.trim().replace(/^R\s*/i,"").replace(/\s/g,"").replace(",","."),was=H.sug.has(pn)?String(H.sug.get(pn)):"";
    if(v===was||(v!==""&&was!==""&&Number(v)===Number(was)))H.dirty.delete(pn);else H.dirty.set(pn,v);
    i.classList.toggle("dirty",H.dirty.has(pn));i.classList.toggle("bad",v!==""&&!/^\d+(\.\d{1,4})?$/.test(v));paintSave();}
  P().querySelector("#pundo").onclick=()=>{H.dirty.clear();panePrices();};
  P().querySelector("#pgo").onclick=saveSug;
  P().querySelector("#pdl").onclick=()=>xlsx([{name:"Price list",widths:[14,56,16,12,14,12,14,18],head:["Stravik PN","Description","Range","Available","Price excl. VAT","VAT "+vatPct+"%","Price incl. VAT","Your suggested price"],
    rows:rows.slice().sort((a,b)=>a.range.localeCompare(b.range)||a.pn.localeCompare(b.pn)).map(r=>[r.pn,r.desc||"",r.range,r.avail,r.price,r.vat,r.incl,sugOf(r.pn)===""?"":Number(sugOf(r.pn))])}],"Stravik_"+NAME+"_price_list.xlsx");
  const file=P().querySelector("#pfile");P().querySelector("#pup").onclick=()=>file.click();
  file.onchange=async()=>{const f=file.files[0];file.value="";if(!f)return;
    try{const got=await readSug(f),known=new Set(rows.map(r=>r.pn));let n=0,skip=0;
      got.forEach(g=>{if(!known.has(g.pn)){skip++;return;}const was=H.sug.has(g.pn)?Number(H.sug.get(g.pn)):null;if(was!==g.price){H.dirty.set(g.pn,String(g.price));n++;}});
      by.forEach((v,k)=>{if(v.some(r=>H.dirty.has(r.pn)))H.ranges.add(k);});
      panePrices();toast(n?n+(n===1?" suggested price":" suggested prices")+" read from the file. Check them and save."+(skip?" "+skip+" part numbers are not on your price list.":""):"No new suggested prices in the file.");
    }catch(e){toast(msg(e));}};
}
async function saveSug(){
  const bad=Array.from(H.dirty).filter(x=>x[1]!==""&&!/^\d+(\.\d{1,4})?$/.test(x[1]));
  if(bad.length){toast("Check the prices marked in red: use numbers such as 125.50.");return;}
  const btn=P().querySelector("#pgo");btn.disabled=true;btn.textContent="Saving…";
  try{
    const r=must(await C.rpc("stravik_suggest_prices",{p:Array.from(H.dirty).map(x=>({pn:x[0],price:x[1]===""?null:x[1]}))}));
    H.dirty.clear();await loadSug();panePrices();
    toast("Saved "+(r.saved||0)+(r.saved===1?" suggested price":" suggested prices")+(r.removed?", removed "+r.removed:"")+". Thank you.");
  }catch(e){toast(msg(e));btn.disabled=false;btn.textContent="Save suggested prices";}
}
async function loadSug(){H.sug=new Map(must(await C.rpc("stravik_my_price_suggestions")).map(x=>[x[0],Number(x[1])]));}

// ---- Launch dates: the ranges coming to South Africa and when
function paneLaunch(){
  const rs=H.data.ranges;
  P().innerHTML=!rs.length?empty("No launch dates yet","The ranges for South Africa appear here once their stock is on order."):
   `<p class="ab-lead">The Stravik ranges for South Africa, in the order they land. Dates are when stock is expected at the warehouse in Kempton Park.</p>
    <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Range</th><th class="n">Parts</th><th class="n">Units on order</th><th class="n">Units in stock</th><th>Expected</th></tr></thead><tbody>${rs.map(r=>
      `<tr><td><b>${esc(r.range)}</b></td><td class="n">${num(r.parts)}</td><td class="n">${num(r.on_order)}</td><td class="n">${num(r.available)}</td><td>${r.parts_in_stock>0?`<span class="ab-pill ok">In stock</span>`:esc(r.expected?day(r.expected):"To be confirmed")}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td><b>All ranges</b></td><td class="n"><b>${num(rs.reduce((a,r)=>a+r.parts,0))}</b></td><td class="n"><b>${num(rs.reduce((a,r)=>a+Number(r.on_order),0))}</b></td><td class="n"><b>${num(rs.reduce((a,r)=>a+Number(r.available),0))}</b></td><td></td></tr></tfoot></table></div>
    <p><a class="btn line" href="/">Open the catalogue</a></p>`;
}

// ---------------------------------------------------------------------------------------------------------------
// Excel: download and read (the library is only fetched when someone asks for a file)
// ---------------------------------------------------------------------------------------------------------------
let XP=null;
const excel=()=>XP||(XP=new Promise((res,rej)=>{if(window.ExcelJS)return res(window.ExcelJS);const s=document.createElement("script");s.src="/admin/vendor/exceljs.min.js";s.onload=()=>res(window.ExcelJS);s.onerror=()=>{XP=null;rej(new Error("The Excel library did not load. Check your connection and try again."));};document.head.appendChild(s);}));
async function xlsx(sheets,name){
  try{toast("Preparing the file…");
    const X=await excel(),wb=new X.Workbook();
    sheets.forEach(sh=>{const ws=wb.addWorksheet(sh.name);ws.addRow(sh.head).font={bold:true};sh.rows.forEach(r=>ws.addRow(r));
      (sh.widths||[]).forEach((w,i)=>{ws.getColumn(i+1).width=w;});ws.views=[{state:"frozen",ySplit:1}];
      sh.head.forEach((h,i)=>{if(/price|value|vat|total/i.test(h))ws.getColumn(i+1).numFmt="#,##0.00";});});
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=name.replace(/[^\w.-]+/g,"_");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){toast(msg(e));}
}
// reads "Stravik PN" and "Your suggested price" from the first sheet of the downloaded price list
async function readSug(file){
  const X=await excel(),wb=new X.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const ws=wb.worksheets[0];if(!ws)throw new Error("The file has no sheet.");
  const val=c=>{let v=c.value;if(v&&typeof v==="object")v=v.result!=null?v.result:v.text!=null?v.text:v.richText?v.richText.map(t=>t.text).join(""):"";return v;};
  let cp=0,cs=0;ws.getRow(1).eachCell((c,i)=>{const h=String(val(c)||"").toLowerCase().replace(/[^a-z]/g,"");if(h==="stravikpn"||h==="part"||h==="partnumber")cp=i;if(h.indexOf("suggested")>=0)cs=i;});
  if(!cp||!cs)throw new Error("The file needs the columns “Stravik PN” and “Your suggested price”. Download the price list and fill it in.");
  const out=[];ws.eachRow((row,n)=>{if(n===1)return;const pn=String(val(row.getCell(cp))||"").trim().toUpperCase(),raw=val(row.getCell(cs));
    if(!pn||raw==null||raw==="")return;const p=typeof raw==="number"?raw:Number(String(raw).replace(/^R\s*/i,"").replace(/\s/g,"").replace(",","."));
    if(Number.isFinite(p)&&p>0)out.push({pn,price:Math.round(p*100)/100});});
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------------------------------------------
async function start(){
  app.innerHTML=head(NAME,"Loading…","Stravik for "+NAME)+`<div class="wrap ab-note"></div>`;
  try{C=await SD().client();}catch(e){app.querySelector(".ab-note").innerHTML=`<p class="dnote bad">${esc(msg(e))}. Check your connection and reload the page.</p>`;return;}
  const {data:{session}}=await C.auth.getSession();
  if(!session)return signIn();
  const me=await SD().refresh();
  if(!me)return signIn();
  const d=me.dealer;
  if(!d&&me.partner&&!me.staff){location.href="/insync/";return;}   // a DP World InSync user belongs on its portal
  if(!d)return note(NAME,me.staff?`You are signed in as <b>${esc(me.email)}</b>, a staff account. Store networks are managed in the <a href="/admin/#/networks">admin site</a>.`:`You are signed in as <b>${esc(me.email)}</b>, but your store is not registered yet. <a href="/#/dealer/register">Register your store</a>.`);
  if(d.status!=="Approved")return note(d.trading_name||d.company_name,d.status==="Pending"?`Your registration is with our team. We will email <b>${esc(d.email)}</b> when your account is approved. <a href="/#/dealer">See your registration</a>.`:`Your account is not active at the moment. <a href="/#/dealer">See your account</a> or <a href="/#/contact">contact us</a>.`);
  if(d.account_type!=="head_office")return store(d);
  try{
    const r=await Promise.all([C.rpc("stravik_hq_overview"),loadSug()]);
    H.data=must(r[0]);if(!H.data)throw new Error("Your head office account has no stores linked yet. Please contact your Stravik sales manager.");
    hq(d);
  }catch(e){note(NAME+" head office",esc(msg(e)));}
}
window.addEventListener("beforeunload",e=>{if(H.dirty.size){e.preventDefault();e.returnValue="";}});
start();
})();
