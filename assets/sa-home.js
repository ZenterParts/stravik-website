// South Africa dealer dashboard. Takes the place of the home page for an approved South African customer on a
// South African price group (T1 to T5, PREF). Everyone else keeps the general home page (home() in assets/app.js).
// Shows the South African launch range: each part with the customer's price and its expected delivery month, or the
// quantity in stock once the goods have landed. Data: Supabase function stravik_sa_stock(), which only answers
// approved South African customers and staff, so nothing here is in a public file.
// Loaded before app.js: the router asks StravikSA.home(app, redraw) first and draws the general home page if it says no.
(function(){
const SA_GROUPS=["T1","T2","T3","T4","T5","PREF"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SD=()=>window.StravikDealer;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>Number(n||0).toLocaleString("en-US");
const money=v=>v==null?"":"R "+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const month=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||"");return m?MONTHS[+m[2]-1]+" "+m[1]:"";};
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const partUrl=(pn,range)=>(range==="Filters"?"/filter/":"/part/")+encodeURIComponent(pn)+"/";
const hasSession=()=>{try{return !!localStorage.getItem("stravik-buyer-auth");}catch(e){return false;}};
const dealer=()=>{const D=SD();return D&&D.state&&D.state.me&&D.state.me.dealer||null;};
const eligible=()=>{const d=dealer();return !!(d&&d.status==="Approved"&&d.country==="South Africa"&&SA_GROUPS.indexOf(d.price_group)>=0);};

// stock for the signed-in customer: {who, data} once known; data is null when there is nothing to show
let got=null,loading=null;
function load(){
  const who=dealer().id;
  return loading||(loading=SD().client().then(c=>c.rpc("stravik_sa_stock")).then(r=>{if(r.error)throw r.error;got={who,data:r.data&&r.data.parts?r.data:null};})
    .catch(e=>{console.error(e);got={who,data:null};}).then(()=>{loading=null;}));
}

const wait=app=>{app.innerHTML=`<div class="wrap" style="padding:60px 0" data-sa="wait"><p class="loading">Loading…</p></div>`;};

// what a part shows for availability: the quantity once it is in stock, else the month it is expected
const avail=x=>x[1]>0?`<span class="sa-in">${num(x[1])} in stock</span>`:x[3]?`<span class="sa-exp">Expected ${month(x[3])}</span>`:`<span class="sa-exp">On order</span>`;
const availText=x=>x[1]>0?num(x[1])+" in stock":x[3]?"Expected "+month(x[3]):"On order";

function draw(app,data){
  const d=dealer(),P=SD().state.prices,pm=P&&P.map||new Map(),landed=data.parts_in_stock>0;
  const price=pn=>{const p=pm.get(pn);return p?p.p:null;};
  const byRange={};data.stock.forEach(x=>{(byRange[x[4]]=byRange[x[4]]||[]).push(x);});
  const first=month(data.expected_from),last=month(data.expected_to);
  const when=first?(first===last?first:first+" to "+last):"";
  const name=d.trading_name||d.company_name||"";
  const stats=landed
    ?[[num(data.parts_in_stock),"parts in stock in South Africa"],[num(data.available),"units available"],[num(data.ranges.length),data.ranges.length===1?"product range":"product ranges"]]
    :[[num(data.parts),"parts in the South Africa launch range"],[num(data.ranges.length),data.ranges.length===1?"product range":"product ranges"],[esc(first||"Soon"),"first deliveries expected"]];
  app.innerHTML=`
  <div class="pagehead sa-head" data-sa="home"><div class="wrap">
    <div class="eyebrow-d">South Africa</div>
    <h1>${name?esc(name):"Your Stravik range"}</h1>
    <p>${landed?"Stravik parts in stock in South Africa, at your prices.":"The Stravik launch range for South Africa, at your prices."}${!landed&&when?` Delivery in South Africa is expected ${esc(when)}.`:""}</p>
  </div></div>
  <section class="sa-stats" aria-label="South Africa in numbers"><div class="wrap">${stats.map(s=>`<div class="sa-stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}</div></section>
  <section class="block sa-body"><div class="wrap">
    <div class="sa-acct">
      <div><span>Price group</span><b>${esc(d.group_name||d.price_group)}</b></div>
      <div><span>Prices</span><b>Rand, excluding VAT</b></div>
      <div class="sa-links"><a class="btn gold" href="#/find">Find a part</a><button type="button" class="btn line" data-sa-csv>Download price list</button><a class="btn line" href="#/dealer">Your account</a></div>
    </div>
    <div class="sa-tools">
      <label class="sa-search"><span>Search the range</span><input type="search" placeholder="Part number or description" autocomplete="off" data-sa-q></label>
      <nav class="sa-jump" aria-label="Product ranges">${data.ranges.map(r=>`<a href="#sa-${slug(r.range)}" data-sa-jump="${slug(r.range)}">${esc(r.range)} <span>${num(r.parts)}</span></a>`).join("")}</nav>
    </div>
    <p class="sa-none" data-sa-none hidden>No parts match your search.</p>
    ${data.ranges.map(r=>{const rows=byRange[r.range]||[];const rm=r.parts_in_stock>0?"":month(r.expected);
      return `<section class="sa-range" id="sa-${slug(r.range)}" data-sa-range>
        <div class="sa-rhead"><h2>${esc(r.range)}</h2><p><b data-sa-n>${num(rows.length)}</b> ${rows.length===1?"part":"parts"}${rm?` · Expected ${esc(rm)}`:""}</p></div>
        <div class="sa-scroll"><table class="sa-table">
          <thead><tr><th>Part number</th><th>Description</th><th class="r">Your price</th><th>${landed?"Availability":"Expected delivery"}</th></tr></thead>
          <tbody>${rows.map(x=>{const p=price(x[0]);return `<tr data-k="${esc((x[0]+" "+(x[5]||"")).toLowerCase())}"><td class="pn"><a href="${partUrl(x[0],x[4])}">${esc(x[0])}</a></td><td>${esc(x[5]||"")}</td><td class="r">${p==null?`<span class="sa-ask">On request</span>`:money(p)}</td><td>${avail(x)}</td></tr>`;}).join("")}</tbody>
        </table></div>
      </section>`;}).join("")}
    <p class="sa-foot">Prices are in rand and exclude VAT. ${landed?"Stock figures":"Expected delivery dates"} are updated as shipments move${data.as_at?`; last updated ${esc(new Date(data.as_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}))}`:""}. Questions about an order? <a href="#/contact">Contact us</a>.</p>
  </div></section>`;

  // search within the range
  const q=app.querySelector("[data-sa-q]"),none=app.querySelector("[data-sa-none]");
  q.addEventListener("input",()=>{const t=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let all=0;
    app.querySelectorAll("[data-sa-range]").forEach(sec=>{let n=0;
      sec.querySelectorAll("tbody tr").forEach(tr=>{const hit=t.every(w=>tr.dataset.k.indexOf(w)>=0);tr.hidden=!hit;if(hit)n++;});
      sec.hidden=!n;sec.querySelector("[data-sa-n]").textContent=num(n);all+=n;
      const j=app.querySelector(`[data-sa-jump="${sec.id.slice(3)}"]`);if(j)j.hidden=!n;});
    none.hidden=all>0;});
  // jump links scroll in the page (the address stays on the home route)
  app.querySelectorAll("[data-sa-jump]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();
    const s=document.getElementById("sa-"+a.dataset.saJump);if(s)s.scrollIntoView({behavior:"smooth",block:"start"});}));
  // price list as a CSV file
  app.querySelector("[data-sa-csv]").addEventListener("click",()=>{
    const cell=v=>{v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    const lines=[["Part number","Description","Range","Price (ZAR excl. VAT)",landed?"Availability":"Expected delivery"]]
      .concat(data.stock.map(x=>{const p=price(x[0]);return [x[0],x[5]||"",x[4],p==null?"":Number(p).toFixed(2),availText(x)];}));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+lines.map(l=>l.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
    a.download="Stravik-South-Africa-price-list.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);});
}

// Called by the router for the home route. Returns true when this page has taken the route (dashboard or "Loading…"),
// false when the general home page should be drawn. redraw() runs the router again once something is known.
function home(app,redraw){
  const D=SD();if(!D||!D.client||!hasSession())return false;
  const again=()=>{const h=location.hash.replace(/^#\/?/,"");if(!h&&typeof redraw==="function")redraw();};
  if(D.pending&&D.pending()){wait(app);D.ready().then(again);return true;}
  if(!eligible())return false;
  if(!got||got.who!==dealer().id){got=null;wait(app);load().then(again);return true;}
  if(!got.data)return false;
  draw(app,got.data);return true;
}

// signed in, out, or approved while the home page is open: draw the right version
let redrawFn=null;
document.addEventListener("stravik-prices",()=>{
  const app=document.getElementById("app");if(!app||location.hash.replace(/^#\/?/,""))return;
  const showing=!!app.querySelector("[data-sa]"),want=hasSession()&&eligible()&&!(got&&dealer()&&got.who===dealer().id&&!got.data);
  if(!hasSession()||!eligible())got=null;
  if(showing!==want&&redrawFn)redrawFn();
});
window.StravikSA={home:(app,redraw)=>{redrawFn=redraw||redrawFn;return home(app,redraw);},eligible};
})();
