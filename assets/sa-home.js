// South Africa home page. Takes the place of the home page for an approved South African customer on a South African
// price group (T1 to T5, PREF). Everyone else keeps the general home page (home() in assets/app.js).
// It is built for each customer: a welcome, the headline figures, and one card for every product range that is both
// on the customer's account and in the South African range. Each card opens that range's catalogue, where the
// customer sees only the South African parts with their prices (assets/dealer.js keeps their price list to those parts).
// Data: StravikDealer.state.sa, from the Supabase function stravik_sa_stock(), which only answers approved South
// African customers and staff, so nothing here is in a public file.
// Loaded before app.js: the router asks StravikSA.home(app, redraw) first and draws the general home page if it says no.
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

// Called by the router for the home route. Returns true when this page has taken the route (the South Africa page or
// "Loading…"), false when the general home page should be drawn. redraw() runs the router again once more is known.
function home(app,redraw){
  const D=SD();if(!D||!hasSession())return false;
  if(D.pending&&D.pending()){wait(app);D.ready().then(()=>{if(!location.hash.replace(/^#\/?/,"")&&typeof redraw==="function")redraw();});return true;}
  const data=stock();if(!data)return false;
  draw(app,data);return true;
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
