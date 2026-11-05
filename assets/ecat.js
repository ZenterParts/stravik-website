// Stravik battery e-catalogue on the website (/batteries/): the layout of the Stravik Battery e-Catalogue 2026,
// drawn inside a shadow root so the site's styles and the catalogue's styles stay apart (styles: /assets/ecat.css).
// Data: /batteries.json (published from Supabase), photos and drawings from /assets/img/batteries, BAT_* from catalog.js.
// Add to cart uses the website cart (common.js); signed-in customers see their prices (dealer.js, StravikDealer.tag).
(function(){
"use strict";
const host=document.getElementById("ecat");if(!host||!host.attachShadow)return;
const root=host.attachShadow({mode:"open"});
const act=()=>root.activeElement||document.activeElement||document.body;
const TPL=`<div class="ewrap"><header class="top">
 <div class="top-in">
  <div class="brand"><h1><span>BATTERY E-CATALOGUE 2026</span></h1></div>
  <label class="q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="vh">Search</span><input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="Part no., SAB no., case, Ah, CCA or vehicle (e.g. 646, L3, Corolla)"><button type="button" id="qx" hidden>Clear</button></label>
  <a class="gbtn bronze hwar" data-warranty href="#">Register warranty</a>
  <nav class="tabs" role="tablist" aria-label="Catalogue sections">
   <button role="tab" id="t-bat" aria-controls="p-bat" aria-selected="true">Batteries<small id="n-bat"></small></button>
   <button role="tab" id="t-gd" aria-controls="p-gd" aria-selected="false">Battery guide</button>
   <button role="tab" id="t-veh" aria-controls="p-veh" aria-selected="false">Vehicle finder<small id="n-veh"></small></button>
   <button role="tab" id="t-dwg" aria-controls="p-dwg" aria-selected="false">Technical drawings<small id="n-dwg"></small></button>
   <button role="tab" id="t-lab" aria-controls="p-lab" aria-selected="false">Label artwork</button>
  </nav>
 </div>
</header>
<div class="emain">
 <!-- batteries -->
 <section class="panel" id="p-bat" role="tabpanel" aria-labelledby="t-bat">
  <div class="finder">
   <div class="fcol fveh"><h3>Find by vehicle <small>Quick finder</small></h3><div class="frow"><select id="qf-mk" aria-label="Vehicle make"></select><select id="qf-mo" aria-label="Vehicle model" disabled><option>Select model</option></select></div><div class="qfres" id="qf-res"></div></div>
   <div class="fcol"><h3>Find by part or size</h3><p>Type a Stravik part number, SAB number, case or capacity in the search bar, or try:</p><div class="qx-ex"><button type="button" data-q="SVADH001">SVADH001</button><button type="button" data-q="646">SAB 646</button><button type="button" data-q="L3">L3 case</button><button type="button" data-q="100ah">100 Ah</button></div></div>
   <div class="fcol"><h3>Browse by technology</h3><div class="ftech"><button type="button" data-t="SMF">SMF <b></b></button><button type="button" data-t="EFB">EFB <b></b></button><button type="button" data-t="AGM">AGM <b></b></button><button type="button" data-t="HDB">Heavy duty <b></b></button></div></div>
  </div>
  <div class="bar">
   <div class="chips" id="types" role="group" aria-label="Battery type"></div>
   <label>Series<select id="f-ser"></select></label>
   <label>Made in<select id="f-org"></select></label>
   <label>Case<select id="f-box"></select></label>
   <label>Min Ah<input id="f-ah" type="number" min="0" inputmode="numeric"></label>
   <label>Min CCA<input id="f-cca" type="number" min="0" inputmode="numeric"></label>
   <span class="grow"></span>
   <button type="button" class="reset" id="reset">Reset</button>
  </div>
  <div class="meta">
   <div class="count" id="count" aria-live="polite"></div>
   <div class="right">
    <label><span class="vh">Sort</span><select class="sort" id="sort">
     <option value="range">Sort: range</option><option value="pn">Part number</option><option value="ah">Capacity (Ah), low to high</option><option value="-ah">Capacity (Ah), high to low</option><option value="-cca">CCA, high to low</option><option value="box">Case</option><option value="sab">SAB number</option></select></label>
    <div class="view" role="group" aria-label="View">
     <button type="button" data-view="card" aria-pressed="true"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>Cards</button>
     <button type="button" data-view="list" aria-pressed="false"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="4" width="18" height="3" rx="1"/><rect x="3" y="10.5" width="18" height="3" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg>List</button>
    </div>
   </div>
  </div>
  <div id="out"></div>
  <button type="button" class="more" id="more" hidden></button>
 </section>

 <!-- battery guide -->
 <section class="panel" id="p-gd" role="tabpanel" aria-labelledby="t-gd" hidden>
  <div class="ghero">
   <div>
    <p class="eyebrow">Battery guide</p>
    <h2>Choose, fit and look after your Stravik battery</h2>
    <p>Stravik starter batteries cover passenger cars, SUVs, light commercial vehicles, trucks, buses and agricultural machinery. This guide explains the battery technologies, the information on every product page and how to get the longest life from your battery.</p>
    <div class="hacts"><a class="gbtn bronze hlink" data-warranty href="#">Register your battery warranty</a><button type="button" class="gbtn ghost" data-goto="bat">Browse all batteries</button></div>
   </div>
   <ul class="hfacts">
    <li><b data-n="SMF"></b><span>SMF batteries</span></li>
    <li><b data-n="EFB"></b><span>EFB batteries</span></li>
    <li><b data-n="AGM"></b><span>AGM batteries</span></li>
    <li><b data-n="HDB"></b><span>Heavy duty batteries</span></li>
   </ul>
  </div>

  <nav class="gtoc" aria-label="Guide contents">
   <a href="#g-tech">Battery technologies</a><a href="#g-range">Stravik ranges</a><a href="#g-spec">Reading the specification</a><a href="#g-case">Case standards</a><a href="#g-layout">Terminal layout</a><a href="#g-choose">Choosing a battery</a><a href="#g-fit">Fitting and care</a><a href="#g-warranty">Warranty</a>
  </nav>

  <h3 class="gh" id="g-tech">Battery technologies</h3>
  <div class="tgrid">
   <article class="tcard smf">
    <header><span class="tbadge">SMF</span><h4>Sealed maintenance free</h4></header>
    <p>A flooded lead-acid battery with calcium-alloy grids and a sealed lid. Calcium technology keeps water loss very low, so the battery never needs topping up and self-discharge is slow when the vehicle is parked.</p>
    <dl><dt>Best for</dt><dd>Conventional cars, SUVs and light commercial vehicles without start-stop.</dd><dt>Benefits</dt><dd>No maintenance, strong starting power, long shelf life.</dd></dl>
    <button type="button" class="tlink" data-type="SMF">Show SMF batteries ›</button>
   </article>
   <article class="tcard efb">
    <header><span class="tbadge">EFB</span><h4>Enhanced flooded battery</h4></header>
    <p>An enhanced version of the flooded battery, built for the frequent engine restarts of start-stop systems. Reinforced plates and carbon additives let it charge faster and withstand far more charge and discharge cycles than a standard battery.</p>
    <dl><dt>Best for</dt><dd>Vehicles with entry-level start-stop, and vehicles with heavy electrical loads or short-trip use.</dd><dt>Benefits</dt><dd>High cycle life, fast charge acceptance, reliable restarts.</dd></dl>
    <button type="button" class="tlink" data-type="EFB">Show EFB batteries ›</button>
   </article>
   <article class="tcard agm">
    <header><span class="tbadge">AGM</span><h4>Absorbent glass mat</h4></header>
    <p>The electrolyte is held in fine glass-fibre mats between the plates, so the battery is spill-proof and valve regulated. AGM gives the highest cycling performance and is designed for advanced start-stop systems with brake energy recovery.</p>
    <dl><dt>Best for</dt><dd>Premium vehicles and any vehicle fitted with an AGM battery at the factory.</dd><dt>Benefits</dt><dd>Highest cycle life, vibration resistant, maintenance free.</dd></dl>
    <p class="tnote">A vehicle built with an AGM battery must be fitted with an AGM battery again.</p>
    <button type="button" class="tlink" data-type="AGM">Show AGM batteries ›</button>
   </article>
   <article class="tcard hdb">
    <header><span class="tbadge">HD</span><h4>Heavy duty</h4></header>
    <p>Large-capacity batteries for commercial and off-road vehicles. Robust plates and cases are designed for high cranking loads, constant vibration and long operating hours.</p>
    <dl><dt>Best for</dt><dd>Trucks, buses, tractors, construction and agricultural equipment.</dd><dt>Benefits</dt><dd>High capacity and cranking current, strong vibration resistance.</dd></dl>
    <button type="button" class="tlink" data-type="HDB">Show heavy duty batteries ›</button>
   </article>
  </div>

  <div class="cmpw"><table class="cmp"><thead><tr><th>Compare technologies</th><th>SMF</th><th>EFB</th><th>AGM</th></tr></thead><tbody>
   <tr><th>Construction</th><td>Flooded, calcium-alloy grids, sealed lid</td><td>Enhanced flooded, reinforced plates with carbon additives</td><td>Electrolyte held in glass-fibre mats, valve regulated</td></tr>
   <tr><th>Start-stop</th><td>Not suitable</td><td>Entry-level start-stop</td><td>Advanced start-stop with brake energy recovery</td></tr>
   <tr><th>Cycle life</th><td><span class="dots">●●<s>●●</s></span></td><td><span class="dots">●●●<s>●</s></span></td><td><span class="dots">●●●●<s></s></span></td></tr>
   <tr><th>Charge acceptance</th><td><span class="dots">●●<s>●●</s></span></td><td><span class="dots">●●●<s>●</s></span></td><td><span class="dots">●●●●<s></s></span></td></tr>
   <tr><th>Vibration resistance</th><td><span class="dots">●●<s>●●</s></span></td><td><span class="dots">●●●<s>●</s></span></td><td><span class="dots">●●●●<s></s></span></td></tr>
   <tr><th>Spill-proof</th><td>No</td><td>No</td><td>Yes</td></tr>
   <tr><th>Maintenance</th><td>None</td><td>None</td><td>None</td></tr>
   <tr><th>Replace with</th><td>SMF, EFB or AGM</td><td>EFB or AGM</td><td>AGM only</td></tr>
  </tbody></table></div>
  <p class="small">Heavy duty batteries are sized for commercial and off-road vehicles and are available in standard and EFB technology. Ratings are relative within the Stravik range.</p>
  <h3 class="gh" id="g-range">Stravik ranges</h3>
  <div class="rgrid">
   <div class="rcard"><i style="background:#1d4f8f"></i><div><h4>Platinum Series</h4><p>Blue label band. The flagship Stravik range, available in SMF and heavy duty batteries.</p></div></div>
   <div class="rcard"><i style="background:#A97C42"></i><div><h4>Gold Series</h4><p>Bronze label band. The performance range for everyday reliability, in SMF and heavy duty batteries.</p></div></div>
   <div class="rcard"><i style="background:#8f96a3"></i><div><h4>Silver Series</h4><p>Grey label band. The value range for dependable starting, in SMF and heavy duty batteries.</p></div></div>
   <div class="rcard"><i style="background:#2c6db5"></i><div><h4>EFB and EFB-II Start-Stop</h4><p>Enhanced flooded batteries for start-stop cars and, in heavy duty sizes, for commercial vehicles with high electrical demand.</p></div></div>
   <div class="rcard"><i style="background:#1d6b3a"></i><div><h4>AGM Start-Stop</h4><p>Absorbent glass mat batteries for advanced start-stop systems and vehicles fitted with AGM from the factory.</p></div></div>
  </div>

  <h3 class="gh" id="g-spec">Reading the specification</h3>
  <p class="gp">Every battery page shows the values below. Compare them with the battery you are replacing or with the vehicle handbook.</p>
  <div class="spgrid">
   <div><h4>Capacity (Ah, C20)</h4><p>The amount of energy the battery stores, measured in ampere-hours over a 20-hour discharge. Higher capacity supports more electrical equipment and longer standing time.</p></div>
   <div><h4>CCA (A, EN)</h4><p>Cold cranking amps: the current the battery delivers at −18 °C under the EN 50342-1 test. It shows starting power in cold conditions. Choose a value equal to or higher than the original.</p></div>
   <div><h4>Case</h4><p>The standard box size, for example L3 or D23. Batteries with the same case share the same outside dimensions. See case standards below.</p></div>
   <div><h4>Size L × W × H</h4><p>Length, width and overall height in millimetres, including the terminals. The battery must fit the battery tray and leave clearance under the bonnet.</p></div>
   <div><h4>Terminal layout</h4><p>Where the positive (+) terminal sits. The cables in the vehicle only reach one way round, so the layout must match. See terminal layout below.</p></div>
   <div><h4>Hold-down</h4><p>The code for the ledge at the base of the case that the vehicle clamp grips (EN 50342-2). B00 means no ledge. Match the code so the battery is held firmly.</p></div>
   <div><h4>SAB number</h4><p>The size code used in the South African battery application guide (SABAT). Batteries with the same SAB number share size, layout and vehicle fitment.</p></div>
   <div><h4>Made in</h4><p>The country where the battery is manufactured, shown on the product page and on the battery label.</p></div>
  </div>

  <h3 class="gh" id="g-case">Case standards</h3>
  <div class="cgrid">
   <div class="ccard"><h4>DIN (European) cases</h4><p>Standard European sizes to EN 50342-2, used by most European vehicles and many others worldwide. All share a 175 mm width.</p>
    <ul><li><b>L1 to L6</b> step up in length, from about 207 mm to 393 mm, with 190 mm height.</li><li><b>L1B, L2B, L3B, L5B</b> and <b>LB1, LB2, LB5</b> are low versions, 175 mm high, for vehicles with limited space under the bonnet.</li></ul></div>
   <div class="ccard"><h4>JIS (Asian) cases</h4><p>Japanese Industrial Standard sizes, used in many Japanese, Korean and other Asian vehicles.</p>
    <ul><li>The letter shows the width and height group, and the number is the approximate length in centimetres: a <b>D23</b> case is about 230 mm long.</li><li>JIS batteries are usually taller and narrower than DIN batteries of similar capacity.</li></ul></div>
   <div class="ccard"><h4>Heavy duty cases</h4><p>Large boxes for trucks, buses and machinery, about 510 to 518 mm long.</p>
    <ul><li><b>A, B, C</b> and <b>D6</b> are the common sizes, increasing in width and capacity.</li><li>Codes such as <b>F51, G51, H52</b> and <b>M14 to M16</b> are equivalent sizes from other standards.</li></ul></div>
  </div>

  <h3 class="gh" id="g-layout">Terminal layout</h3>
  <div class="lyrow">
   <figure class="lyfig"><svg viewBox="0 0 220 120" role="img" aria-label="Layout 0: positive terminal on the right"><rect x="10" y="22" width="200" height="88" rx="6" fill="#fff" stroke="#0B203D" stroke-width="2.5"/><circle cx="178" cy="44" r="12" fill="#c0392b"/><text x="178" y="49" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">+</text><circle cx="42" cy="44" r="12" fill="#0B203D"/><text x="42" y="49" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">−</text><text x="110" y="92" text-anchor="middle" fill="#5B6475" font-size="12">terminals towards you</text></svg>
    <figcaption><b>Layout 0 (R+)</b>Positive terminal on the right, with the terminals on the long side nearest to you. The most common European layout.</figcaption></figure>
   <figure class="lyfig"><svg viewBox="0 0 220 120" role="img" aria-label="Layout 1: positive terminal on the left"><rect x="10" y="22" width="200" height="88" rx="6" fill="#fff" stroke="#0B203D" stroke-width="2.5"/><circle cx="42" cy="44" r="12" fill="#c0392b"/><text x="42" y="49" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">+</text><circle cx="178" cy="44" r="12" fill="#0B203D"/><text x="178" y="49" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">−</text><text x="110" y="92" text-anchor="middle" fill="#5B6475" font-size="12">terminals towards you</text></svg>
    <figcaption><b>Layout 1 (L+)</b>Positive terminal on the left. Common in Asian vehicles and some European models.</figcaption></figure>
   <div class="lytext"><h4>Layouts 3 and 4</h4><p>Heavy duty layouts. Layouts 3 and 4 are mirror images of each other, so the positive terminal is on opposite sides. Compare the position of the positive terminal with the old battery or the technical drawing before ordering.</p>
    <h4>Layout 0 / 1</h4><p>The battery is supplied for either layout. Check the product page or ask your supplier.</p></div>
  </div>

  <h3 class="gh" id="g-choose">Choosing the right battery</h3>
  <ol class="steps">
   <li><b>Find your vehicle.</b> Use the Vehicle finder or search by make and model to see the recommended batteries.</li>
   <li><b>Keep the same technology.</b> Replace AGM with AGM. Replace EFB with EFB or AGM. Never fit a standard SMF battery to a start-stop vehicle.</li>
   <li><b>Check size and layout.</b> Case, dimensions, terminal layout and hold-down must match the original so the battery fits and the cables reach.</li>
   <li><b>Match or exceed the performance.</b> Choose capacity (Ah) and cold cranking amps (CCA) equal to or higher than the original battery.</li>
  </ol>

  <h3 class="gh" id="g-fit">Fitting and care</h3>
  <div class="fgrid">
   <div class="fcard"><h4>Safe fitting</h4><ul>
    <li>Switch off the ignition and all electrical equipment. Wear eye protection and gloves.</li>
    <li>Note any radio or security codes, or use a memory saver to keep vehicle settings.</li>
    <li>Disconnect the negative (−) terminal first, then the positive (+).</li>
    <li>Clean the tray and clamps, fit the new battery and tighten the hold-down so it cannot move.</li>
    <li>Connect the positive (+) terminal first, then the negative (−). Fit the terminal covers.</li>
    <li>Start-stop vehicles: register the new battery with the vehicle's battery management system using a diagnostic tool, so charging is set correctly.</li></ul></div>
   <div class="fcard"><h4>Care and storage</h4><ul>
    <li>Keep the top of the battery clean and dry, and the terminals tight and free of corrosion.</li>
    <li>A healthy, fully charged battery reads about 12.6 V or more after resting. Recharge it if it reads below 12.4 V.</li>
    <li>Short trips and long parking periods drain a battery. Drive regularly or use a smart maintenance charger.</li>
    <li>Charge AGM batteries only with a charger that has an AGM setting.</li>
    <li>Store batteries upright in a cool, dry place and recharge stored batteries every three months.</li></ul></div>
   <div class="fcard warn"><h4>Safety and recycling</h4><ul>
    <li>Batteries contain sulphuric acid and give off explosive gases. Keep sparks, flames and cigarettes away.</li>
    <li>Keep batteries out of the reach of children. If acid touches skin or eyes, rinse with plenty of water and seek medical help.</li>
    <li>Do not open or tip the battery.</li>
    <li>Used batteries contain lead: return them to your dealer or an authorised recycler. Never dispose of them with household waste.</li></ul></div>
  </div>

  <div class="wcard" id="g-warranty">
   <div><p class="eyebrow">Warranty</p><h3>Register your Stravik battery</h3>
    <p>Register your battery online after installation so that any future warranty claim is handled quickly. You will need the part number and the barcode number from the label on top of the battery, the date of fitting and your proof of purchase. Keep your invoice with the vehicle documents.</p></div>
   <a class="gbtn bronze hlink" data-warranty href="#">Register warranty ›</a>
  </div>
 </section>

 <!-- vehicles -->
 <section class="panel" id="p-veh" role="tabpanel" aria-labelledby="t-veh" hidden>
  <div class="bar">
   <label>Segment<select id="v-seg"></select></label>
   <label>Make<select id="v-mk"></select></label>
   <label class="grow">Model<input id="v-mo" type="search" placeholder="e.g. Polo, Hilux, Actros" style="width:100%"></label>
   <button type="button" class="reset" id="v-reset">Reset</button>
  </div>
  <div class="meta"><div class="count" id="v-count"></div></div>
  <div class="tw"><table class="vt"><thead><tr><th>Make</th><th>Model</th><th>Year</th><th>SAB</th><th>Stravik batteries (same SAB size)</th></tr></thead><tbody id="v-body"></tbody></table></div>
  <button type="button" class="more" id="v-more" hidden></button>
 </section>

 <!-- drawings -->
 <section class="panel" id="p-dwg" role="tabpanel" aria-labelledby="t-dwg" hidden>
  <h2 class="sec-h">Technical drawings</h2>
  <p class="sec-p">Factory case drawings. A drawing is linked to a battery only where the length, width and height on the drawing equal the battery data within ±1 mm. Open a drawing to enlarge it, see the batteries that use it and compare with the battery photo.</p>
  <div class="dgrid" id="dgrid"></div>
 </section>

 <!-- labels -->
 <section class="panel" id="p-lab" role="tabpanel" aria-labelledby="t-lab" hidden>
  <h2 class="sec-h">Approved label artwork</h2>
  <p class="sec-p">SMF batteries, Platinum, Gold and Silver series. One label layout across the range: the colour band and the SMF tab show the series. Select any image to enlarge it.</p>
  <div class="lgrid" id="lgrid"></div>
  <div class="ltops" id="ltops"></div>
 </section>
</div>
<div class="efoot"><span>Stravik battery e-catalogue 2026. Specifications are declared values from the manufacturers’ technical data and may change without notice. Check fitment, terminal layout and hold-down against the vehicle before installation.</span><span><a data-warranty href="#" style="color:var(--db);font-weight:700">Battery warranty registration</a></span></div>

<!-- detail (drawing viewer) -->
<div class="dlg" id="dlg" hidden>
 <div class="dbox" role="dialog" aria-modal="true" aria-labelledby="d-title">
  <div class="gtop"><span class="gid" id="d-id"></span><h2 id="d-title"></h2><span class="sp"></span>
   <button type="button" class="gnav" id="d-prev" aria-label="Previous battery">‹</button><button type="button" class="gnav" id="d-next" aria-label="Next battery">›</button>
   <button type="button" class="gbtn navy" id="d-close">Close</button></div>
  <div class="gmain">
   <div class="gimg" id="gimg"></div>
   <aside class="ginfo" id="d-info"></aside>
  </div>
 </div>
</div>
<div class="fs" id="fs" hidden role="dialog" aria-modal="true" aria-labelledby="fs-t"><div class="gtop"><h2 id="fs-t"></h2><span class="sp"></span><button type="button" class="gbtn navy" id="fs-x">Close</button></div><div class="vp" id="fs-vp"><img alt=""></div></div></div>`;
root.innerHTML=`<link rel="stylesheet" href="${host.dataset.css}"><div class="ewrap"><p class="ecatload">Loading the battery catalogue…</p></div>`;
const css=root.querySelector("link");
const ready=new Promise(res=>{css.addEventListener("load",res);css.addEventListener("error",res);setTimeout(res,4000);});
Promise.all([fetch("/batteries.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("Status "+r.status);return r.json();}),ready]).then(([B])=>{
  root.innerHTML=`<link rel="stylesheet" href="${host.dataset.css}">`+TPL;init(convert(B));
}).catch(e=>{const w=root.querySelector(".ecatload");if(w)w.textContent="The battery catalogue could not be loaded. Check your connection and refresh the page.";console.error(e);});

function convert(B){
  const OR={Hungary:"Made in EU",Turkey:"Made in TR",Tunisia:"Made in TN"};
  const cat=(B.parts||[]).map(p=>({pn:p[0],type:p[1],series:p[2]||"",group:p[3]||"",box:p[4]||"",ah:p[5],cca:String(p[6]),L:p[7],W:p[8],H:p[9],layout:p[10]||"",hd:p[11]||"",dwg:p[12]||"",origin:OR[p[13]]||("Made in "+p[13]),sab:(p[14]||[]).join(" / "),_s:p[14]||[]}));
  const pns=ix=>(ix||[]).map(i=>cat[i]&&cat[i].pn).filter(Boolean);
  const veh=(B.vehicles||[]).map(v=>{const sb=String(v[3]||"").replace(/^SAB\s*/i,""),m=sb.match(/^(.*?)\s*\(alt\.\s*(.*)\)\s*$/);
    return {m:String((B.makes||[])[v[0]]||""),o:v[1]||"",y:v[2]||"",r:m?m[1]:sb,a:m?m[2]:"",s:v[4]||"",fit:pns(v[5]),alt:pns(v[6])};});
  const dwg={};Object.keys(BAT_DWG).forEach(id=>{const rs=cat.filter(r=>r.dwg===id);if(!rs.length)return;const u={};rs.forEach(r=>(u[r.origin]=u[r.origin]||[]).push(r.pn));
    const d=BAT_DWG[id][1];dwg[id]={title:BAT_DWG[id][0],dspec:{L:d[0],W:d[1],H:d[2],htype:"overall"},sabs:[...new Set(rs.flatMap(r=>r._s))].sort(),users:u};});
  return {cat,veh,dwg};
}

function init(D){
const CAT=D.cat,VEH=D.veh,DW=D.dwg;
const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
const esc=v=>String(v==null?"":v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const TYPES=[["SMF","SMF"],["EFB","EFB"],["AGM","AGM"],["HDB","Heavy duty"]];
const TNAME={SMF:"SMF battery",EFB:"EFB battery",AGM:"AGM battery",HDB:"Heavy duty battery"};
const ORG={"Made in EU":"EU","Made in TR":"Turkey","Made in TN":"Tunisia"};
const LABEL={"Platinum Series":"art_front_plat","Gold Series":"art_front_gold","Silver Series":"art_front_silver"};
const byPn={};CAT.forEach(r=>{byPn[r.pn]=r;r.sabs=String(r.sab||"").match(/\d{3}[A-Z]?/g)||[];
  r._t=[r.pn,r.series,r.type,TNAME[r.type],r.box,r.group,ORG[r.origin],r.ah+"ah",r.ah+" ah",r.cca+"a",r.cca,r.L+"x"+r.W+"x"+r.H,r.layout,r.hd,"sab "+r.sab,r.sab,r.dwg||""].join(" ").toLowerCase();});
// vehicles by part, part counts by drawing
// vehicles come with the batteries that fit them: v.fit = the vehicle's SAB size, v.alt = its alternative size
VEH.forEach(v=>{v._t=(v.m+" "+v.o+" "+v.y+" sab "+v.r+" "+v.a).toLowerCase();});
const vByPn={};VEH.forEach(v=>v.fit.concat(v.alt).forEach(p=>(vByPn[p]=vByPn[p]||[]).push(v)));
const IMGD="/assets/img/batteries/";
const photo=r=>{const k=BAT_PHOTO.exact[r.pn]||BAT_PHOTO.rep[r.series+"|"+r.type];return k?IMGD+k+".webp":null;};
const dwimg=id=>id&&DW[id]?IMGD+"dwg/"+id+".jpg":null;
const dwthumb=id=>id&&DW[id]?IMGD+"dwg/"+id+"-thumb.webp":null;
const LIMG=k=>IMGD+(/^art_/.test(k)?"labels/":"")+k+".webp";

/* ---------- tabs ---------- */
const TABS=["bat","gd","veh","dwg","lab"];
function tab(t){TABS.forEach(x=>{$("#t-"+x).setAttribute("aria-selected",x===t);$("#p-"+x).hidden=x!==t;});
  if(t==="veh")runV();}
TABS.forEach(x=>$("#t-"+x).addEventListener("click",()=>tab(x)));
$("#n-bat").textContent=CAT.length;$("#n-veh").textContent=VEH.length.toLocaleString("en");$("#n-dwg").textContent=Object.keys(DW).length;

/* ---------- batteries ---------- */
const st={types:new Set(),ser:"",org:"",box:"",ah:"",cca:"",sort:"range",view:store.get("sv-view")||"card",shown:48};
function fillSel(sel,vals,all,lab){sel.innerHTML=`<option value="">${all}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(lab?lab(v):v)}</option>`).join("");}
const uniq=(k,f)=>[...new Set(CAT.filter(f||(()=>1)).map(r=>r[k]))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
$("#types").innerHTML=`<button type="button" class="tchip" data-t="" aria-pressed="true">All types</button>`+TYPES.map(t=>`<button type="button" class="tchip" data-t="${t[0]}" aria-pressed="false">${t[1]}</button>`).join("");
fillSel($("#f-ser"),uniq("series"),"All series");fillSel($("#f-org"),uniq("origin"),"All origins",v=>ORG[v]||v);fillSel($("#f-box"),uniq("box"),"All cases");
$("#types").addEventListener("click",e=>{const b=e.target.closest(".tchip");if(!b)return;const t=b.dataset.t;
  if(!t)st.types.clear();else st.types.has(t)?st.types.delete(t):st.types.add(t);
  $$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t?st.types.has(x.dataset.t):!st.types.size));run(true);});
[["#f-ser","ser"],["#f-org","org"],["#f-box","box"]].forEach(([s,k])=>$(s).addEventListener("change",e=>{st[k]=e.target.value;run(true);}));
[["#f-ah","ah"],["#f-cca","cca"]].forEach(([s,k])=>$(s).addEventListener("input",e=>{st[k]=e.target.value;run(true);}));
$("#sort").addEventListener("change",e=>{st.sort=e.target.value;run(true);});
$$(".view button").forEach(b=>b.addEventListener("click",()=>{st.view=b.dataset.view;store.set("sv-view",st.view);syncView();run(false);}));
function syncView(){$$(".view button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.view===st.view));}
$("#reset").addEventListener("click",()=>{st.types.clear();st.ser=st.org=st.box=st.ah=st.cca="";["#f-ser","#f-org","#f-box","#f-ah","#f-cca"].forEach(s=>$(s).value="");
  $$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",!x.dataset.t));q.value="";$("#qx").hidden=true;run(true);});
const q=$("#q");let qt=0;
q.addEventListener("input",()=>{$("#qx").hidden=!q.value;clearTimeout(qt);qt=setTimeout(()=>{run(true);if(!$("#p-veh").hidden)runV();},120);});
$("#qx").addEventListener("click",()=>{q.value="";$("#qx").hidden=true;run(true);runV();q.focus();});
let list=[];
function toks(){return q.value.toLowerCase().split(/\s+/).filter(Boolean);}
function run(reset){
  if(reset)st.shown=48;
  const tk=toks(),ah=parseFloat(st.ah),cca=parseFloat(st.cca);
  // vehicle words: batteries listed for vehicles that match the text
  let vset=null;
  if(tk.length&&tk.join("").length>=3){const vm=VEH.filter(v=>tk.every(t=>v._t.includes(t)));if(vm.length){vset=new Set();vm.forEach(v=>v.fit.forEach(p=>vset.add(p)));}}
  list=CAT.filter(r=>{
    if(st.types.size&&!st.types.has(r.type))return false;if(st.ser&&r.series!==st.ser)return false;if(st.org&&r.origin!==st.org)return false;if(st.box&&r.box!==st.box)return false;
    if(!isNaN(ah)&&r.ah<ah)return false;if(!isNaN(cca)&&parseFloat(r.cca)<cca)return false;
    if(tk.length){const own=tk.every(t=>r._t.includes(t));if(!own&&!(vset&&vset.has(r.pn)))return false;}
    return true;});
  const s=st.sort,dir=s[0]==="-"?-1:1,k=s.replace("-","");
  const RO=r=>["SMF","EFB","AGM","HDB"].indexOf(r.type)*10+["Platinum Series","Gold Series","Silver Series","EFB-II Start-Stop","EFB Start-Stop","AGM Start-Stop"].indexOf(r.series);
  if(k==="range")list.sort((a,b)=>RO(a)-RO(b)||a.ah-b.ah||a.pn.localeCompare(b.pn));else
  list.sort((a,b)=>{let x=a[k],y=b[k];if(k==="cca"){x=parseFloat(x);y=parseFloat(y);}
    const c=typeof x==="number"?x-y:String(x).localeCompare(String(y),undefined,{numeric:true});return dir*c||a.pn.localeCompare(b.pn);});
  $("#count").innerHTML=list.length===CAT.length?`<b>${list.length}</b> batteries`:`<b>${list.length}</b> of ${CAT.length} batteries`+(vset&&tk.length?` · includes batteries listed for vehicles matching “${esc(q.value.trim())}”`:"");
  paint();
}
function picHtml(r,cls){
  const p=photo(r),d=dwthumb(r.dwg);
  if(p)return `<div class="pic${cls||""}"><span class="tag">${esc(r.type==="HDB"?"HD":r.type)}</span><img src="${p}" alt="Stravik ${esc(r.series)} ${esc(TNAME[r.type])}" loading="lazy"></div>`;
  if(d)return `<div class="pic dw${cls||""}"><span class="tag">${esc(r.type==="HDB"?"HD":r.type)}</span><img src="${d}" alt="Technical drawing ${esc(r.dwg)}" loading="lazy"><span class="note">Drawing ${esc(r.dwg)} · photo to follow</span></div>`;
  return `<div class="pic${cls||""}"><span class="tag">${esc(r.type==="HDB"?"HD":r.type)}</span><span class="note" style="position:static">Photo to follow</span></div>`;
}
function card(r){
  return `<button type="button" class="card" data-pn="${esc(r.pn)}" style="--sc:${SERCOL[r.series]||"#A97C42"}">${picHtml(r)}
   <div class="cb"><div class="pn">${esc(r.pn)}</div><div class="ser">${esc(r.series)} · ${esc(TNAME[r.type])}</div><div class="eprice" data-p="${esc(r.pn)}"></div>
   <div class="big"><div><b>${esc(r.ah)}</b><span>Ah</span></div><div><b>${esc(r.cca)}</b><span>CCA (EN)</span></div><div><b>${esc(r.box)}</b><span>Case</span></div></div>
   <div class="kv"><span>Size</span><b>${r.L} × ${r.W} × ${r.H}</b><span>Layout</span><b>${esc(r.layout)}</b><span>SAB</span><b>${esc(r.sab||"–")}</b><span>Made in</span><b>${esc(ORG[r.origin])}</b></div>
   <div class="cfoot"><span>${(vByPn[r.pn]||[]).length} vehicle applications</span>${r.dwg?`<span class="dwb">Drawing ${esc(r.dwg)}</span>`:"<span>No drawing</span>"}</div></div></button>`;
}
const COLS=[["","",null],["pn","Part no."],["type","Type"],["series","Series"],["box","Case"],["ah","Ah","n"],["cca","CCA","n"],["L","L × W × H"],["layout","Layout"],["hd","Hold-down"],["sab","SAB"],["origin","Made in"],["dwg","Drawing"]];
function row(r){const p=photo(r)||dwthumb(r.dwg);
  return `<tr data-pn="${esc(r.pn)}"><td><span class="th">${p?`<img src="${p}" alt="" loading="lazy">`:""}</span></td><td><span class="pnl">${esc(r.pn)}</span></td><td><span class="badge ${r.type.toLowerCase()}">${esc(r.type==="HDB"?"Heavy duty":r.type)}</span></td>
  <td>${esc(r.series)}</td><td>${esc(r.box)}</td><td class="n">${esc(r.ah)}</td><td class="n">${esc(r.cca)}</td><td>${r.L} × ${r.W} × ${r.H}</td><td>${esc(r.layout)}</td><td>${esc(r.hd)}</td><td>${esc(r.sab||"–")}</td><td>${esc(ORG[r.origin])}</td>
  <td>${r.dwg?`<button type="button" class="dwl" data-dw="${esc(r.dwg)}" data-pn="${esc(r.pn)}">${esc(r.dwg)}</button>`:"–"}</td></tr>`;}
function paint(){
  const out=$("#out"),sl=list.slice(0,st.shown);
  if(!list.length){out.innerHTML=`<div class="empty"><b>No batteries match.</b><br>Try a part number, case (e.g. L3), SAB number (e.g. 646) or remove a filter.</div>`;}
  else if(st.view==="card")out.innerHTML=`<div class="grid">${sl.map(card).join("")}</div>`;
  else out.innerHTML=`<div class="tw"><table class="list"><thead><tr>${COLS.map(c=>`<th${c[0]?` data-k="${c[0]}"`:""}${c[2]?` class="n"`:""}${st.sort.replace("-","")===c[0]&&c[0]?` aria-sort="${st.sort[0]==="-"?"descending":"ascending"}"`:""}>${c[1]}</th>`).join("")}</tr></thead><tbody>${sl.map(row).join("")}</tbody></table></div>`;
  const m=$("#more");m.hidden=list.length<=st.shown;m.textContent=`Show more (${list.length-st.shown} left)`;
  prices();
}
$("#more").addEventListener("click",()=>{st.shown+=st.view==="list"?100:48;paint();});
$("#out").addEventListener("click",e=>{
  const th=e.target.closest("th[data-k]");if(th){const k=th.dataset.k==="L"?"L":th.dataset.k;st.sort=st.sort===k?"-"+k:k;const o=[...$("#sort").options].find(x=>x.value===st.sort);$("#sort").value=o?st.sort:"range";run(false);return;}
  const dw=e.target.closest(".dwl");if(dw){openPart(dw.dataset.pn,"d");return;}
  const c=e.target.closest("[data-pn]");if(c)openPart(c.dataset.pn);});

/* ---------- vehicles ---------- */
let vlist=[],vshown=100;
fillSel($("#v-seg"),[...new Set(VEH.map(v=>v.s))],"All segments");
const fillMk=()=>{const seg=$("#v-seg").value;fillSel($("#v-mk"),[...new Set(VEH.filter(v=>!seg||v.s===seg).map(v=>v.m))].sort((a,b)=>a.localeCompare(b)),"All makes");};fillMk();
$("#v-seg").addEventListener("change",()=>{fillMk();runV(true);});$("#v-mk").addEventListener("change",()=>runV(true));$("#v-mo").addEventListener("input",()=>runV(true));
$("#v-reset").addEventListener("click",()=>{$("#v-seg").value="";fillMk();$("#v-mo").value="";runV(true);});
function runV(reset){if(reset!==false)vshown=100;
  const seg=$("#v-seg").value,mk=$("#v-mk").value,mo=$("#v-mo").value.toLowerCase().split(/\s+/).filter(Boolean),tk=toks();
  vlist=VEH.filter(v=>(!seg||v.s===seg)&&(!mk||v.m===mk)&&mo.every(t=>v._t.includes(t))&&tk.every(t=>v._t.includes(t)||v.fit.some(p=>p.toLowerCase().includes(t))));
  $("#v-count").innerHTML=`<b>${vlist.length.toLocaleString("en")}</b> vehicle applications · South African market (SABAT 2019)`;
  $("#v-body").innerHTML=vlist.slice(0,vshown).map(v=>`<tr><td>${esc(v.m)}</td><td>${esc(v.o)}</td><td>${esc(v.y)}</td><td>${esc(v.r)}${v.a?` <span class="small">alt. ${esc(v.a)}</span>`:""}</td>
   <td>${v.fit.map(p=>{const r=byPn[p];return r?`<button type="button" class="pchip" data-pn="${esc(p)}">${esc(p)}<small>${esc(r.series.replace(" Series",""))} · ${r.ah} Ah · ${esc(ORG[r.origin])}</small></button>`:""}).join("")||"–"}${v.alt.length?`<div class="small" style="margin:2px 0 4px">Alternative size ${esc(v.a)}:</div>`+v.alt.map(p=>{const r=byPn[p];return r?`<button type="button" class="pchip palt" data-pn="${esc(p)}">${esc(p)}<small>${esc(r.series.replace(" Series",""))} · ${r.ah} Ah · ${esc(ORG[r.origin])}</small></button>`:""}).join(""):""}</td></tr>`).join("")
   ||`<tr><td colspan="5" class="small">No vehicle matches.</td></tr>`;
  const m=$("#v-more");m.hidden=vlist.length<=vshown;m.textContent=`Show more (${(vlist.length-vshown).toLocaleString("en")} left)`;}
$("#v-more").addEventListener("click",()=>{vshown+=200;runV(false);});
$("#v-body").addEventListener("click",e=>{const c=e.target.closest(".pchip");if(c)openPart(c.dataset.pn);});

/* ---------- drawings ---------- */
const dUsers=id=>Object.values(DW[id].users).flat().filter(p=>byPn[p]);
$("#dgrid").innerHTML=Object.keys(DW).map(id=>{const d=DW[id],u=dUsers(id),sp=d.dspec;
  return `<button type="button" class="card dcard" data-dwg="${id}"><div class="pic"><img src="${dwthumb(id)}" alt="Technical drawing ${id}, ${esc(d.title)}" loading="lazy"></div>
  <div class="cb"><div style="display:flex;gap:10px;align-items:center"><span class="did">${id}</span><b style="font-family:var(--disp);font-size:19px">${esc(d.title)}</b></div>
  <div class="small">${sp?`Drawing shows ${sp.L} × ${sp.W} × ${sp.H} mm${sp.htype==="lid"?" (height to lid)":""}`:""}</div>
  <div class="cfoot"><span>${u.length} batteries · SAB ${esc((d.sabs||[]).join(", "))}</span><span class="dwb">Open ›</span></div></div></button>`;}).join("");
$("#dgrid").addEventListener("click",e=>{const c=e.target.closest("[data-dwg]");if(!c)return;const u=dUsers(c.dataset.dwg);if(u.length)openPart(u[0],"d",u);});

/* ---------- labels ---------- */
const SER=[["Platinum Series","Blue band","mock_plat","art_front_plat"],["Gold Series","Bronze band","mock_gold","art_front_gold"],["Silver Series","Grey band","mock_silver","art_front_silver"]];
$("#lgrid").innerHTML=SER.map(s=>`<div class="lcard"><button type="button" class="zoom mockz" data-z="${s[2]}" data-t="Stravik ${s[0]} SMF battery"><img src="${LIMG(s[2])}" alt="Stravik ${s[0]} SMF battery" loading="lazy"></button>
 <div style="display:flex;justify-content:space-between;align-items:baseline"><h3>${s[0]}</h3><p>${s[1]}</p></div>
 <button type="button" class="zoom" data-z="${s[3]}" data-t="${s[0]} front label, 267 × 100 mm" style="border:1px solid var(--line)"><img src="${LIMG(s[3])}" alt="${s[0]} front label" loading="lazy"></button><p>Front label · 267 × 100 mm</p></div>`).join("");
$("#ltops").innerHTML=[["art_top_115","Top label · 115 × 65 mm","Barcode and rating, installation date, charge indicator and warnings. Same on every series.",440],["art_top_55","Top label · 55 × 65 mm","SMF battery, sealed maintenance free (EN, FR, PT, AR). Same on every series.",212]]
 .map(t=>`<div class="ltop" style="width:${t[3]+30}px;max-width:100%"><button type="button" class="zoom" data-z="${t[0]}" data-t="${t[1]}"><img src="${LIMG(t[0])}" alt="${t[1]}" loading="lazy"></button><h3>${t[1]}</h3><p>${t[2]}</p></div>`).join("");
root.addEventListener("click",e=>{const z=e.target.closest(".zoom[data-z]");if(z)openFs(LIMG(z.dataset.z),z.dataset.t);});

/* ---------- zoom viewport ---------- */
function zoomable(vp){
  const img=vp.querySelector("img");let z=1,x=0,y=0,drag=null;
  const set=()=>{vp.style.setProperty("--z",z);vp.style.setProperty("--x",x+"px");vp.style.setProperty("--y",y+"px");vp.classList.toggle("z",z>1);};
  const to=(nz,cx,cy)=>{nz=Math.min(6,Math.max(1,nz));if(nz===1){x=y=0;}else if(cx!=null){const r=vp.getBoundingClientRect(),dx=(cx-r.left-r.width/2),dy=(cy-r.top-r.height/2);x-= dx/z-dx/nz;y-=dy/z-dy/nz;}z=nz;set();};
  vp.addEventListener("click",e=>{if(e.target.closest(".zc")||vp._moved)return;to(z>1?1:2.5,e.clientX,e.clientY);});
  vp.addEventListener("wheel",e=>{e.preventDefault();to(z*(e.deltaY<0?1.2:1/1.2),e.clientX,e.clientY);},{passive:false});
  vp.addEventListener("pointerdown",e=>{if(z===1||e.target.closest(".zc"))return;drag={sx:e.clientX,sy:e.clientY,x,y};vp._moved=false;vp.classList.add("drag");vp.setPointerCapture(e.pointerId);});
  vp.addEventListener("pointermove",e=>{if(!drag)return;const dx=(e.clientX-drag.sx)/z,dy=(e.clientY-drag.sy)/z;if(Math.abs(dx)+Math.abs(dy)>3)vp._moved=true;x=drag.x+dx;y=drag.y+dy;set();});
  vp.addEventListener("pointerup",()=>{drag=null;vp.classList.remove("drag");setTimeout(()=>vp._moved=false,0);});
  vp.querySelectorAll(".zc button").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const a=b.dataset.a;if(a==="+")to(z*1.4);else if(a==="-")to(z/1.4);else if(a==="0")to(1);else if(a==="fs")openFs(img.src,b.dataset.t);}));
  set();
}
const fs=$("#fs");let fsLast=null;
function openFs(src,t){fsLast=act();$("#fs-t").textContent=t||"";const vp=$("#fs-vp");vp.innerHTML=`<img src="${src}" alt="${esc(t||"")}"><div class="zc"><button type="button" data-a="-" aria-label="Zoom out">−</button><button type="button" data-a="0" aria-label="Reset zoom">1:1</button><button type="button" data-a="+" aria-label="Zoom in">+</button></div>`;zoomable(vp);fs.hidden=false;$("#fs-x").focus();}
function closeFs(){fs.hidden=true;if(fsLast&&fsLast.focus)fsLast.focus();}
$("#fs-x").addEventListener("click",closeFs);

/* ---------- detail: drawing viewer ---------- */
const dlg=$("#dlg");let cur=null,seq=[],view="d",dLast=null;
const zc=t=>`<div class="zc"><button type="button" data-a="-" aria-label="Zoom out">−</button><button type="button" data-a="0" aria-label="Reset zoom">1:1</button><button type="button" data-a="+" aria-label="Zoom in">+</button><button type="button" data-a="fs" data-t="${esc(t)}" aria-label="Full screen">⤢</button></div>`;
function paintImg(){
  const r=cur,p=photo(r),d=dwimg(r.dwg);let v=view;if(v==="d"&&!d)v="p";if(v==="p"&&!p&&d)v="d";
  const src=v==="d"?d:p,t=v==="d"?`Technical drawing ${r.dwg}, ${DW[r.dwg].title}`:`Stravik ${r.series} ${TNAME[r.type]}`;
  $("#gimg").innerHTML=`<div class="gseg" role="group" aria-label="Show"><button type="button" data-v="d" aria-pressed="${v==="d"}"${d?"":" disabled"}>Technical drawing</button><button type="button" data-v="p" aria-pressed="${v==="p"}"${p?"":" disabled"}>Battery photo</button></div>`+
    (src?`<div class="vp"><img src="${src}" alt="${esc(t)}" draggable="false">${zc(t)}</div><button type="button" class="zhint" id="zhint">Click to zoom</button>`:`<div class="nophoto"><b>No drawing or photo for this battery yet</b><span>Check the dimensions in the specification.</span></div>`);
  const vp=$("#gimg .vp");if(vp){zoomable(vp);$("#zhint").onclick=()=>{const b=vp.querySelector('[data-a="+"]');b.click();b.click();};}
  $$("#gimg .gseg button").forEach(b=>b.onclick=()=>{view=b.dataset.v;paintImg();});
}
function openPart(pn,v,order){
  const r=byPn[pn];if(!r)return;
  if(dlg.hidden)dLast=act();
  seq=order||(list.some(x=>x.pn===pn)?list.map(x=>x.pn):[pn]);cur=r;view=v==="p"?"p":"d";
  const p=photo(r),dd=r.dwg&&DW[r.dwg];
  $("#d-id").textContent=r.dwg||r.box;$("#d-title").textContent=dd?dd.title:`${r.box} case · no factory drawing`;
  paintImg();
  const veh=(vByPn[r.pn]||[]).slice().sort((a,b)=>(a.m+a.o).localeCompare(b.m+b.o));
  const lab=r.type==="SMF"&&LABEL[r.series];
  const sp=dd&&dd.dspec;
  const users=dd?Object.keys(dd.users).map(o=>[o,dd.users[o].filter(x=>byPn[x])]).filter(x=>x[1].length):[];
  $("#d-info").innerHTML=`<p class="gdims">${sp?`Drawing shows ${sp.L} × ${sp.W} × ${sp.H} mm${sp.htype==="lid"?" (height to lid)":""}`:`Battery size ${r.L} × ${r.W} × ${r.H} mm`}</p>
   <div class="gprod">
    ${p?`<button type="button" class="gbat" id="gbat" title="Show the battery photo"><img src="${p}" alt="Stravik ${esc(r.series)} battery"></button><p class="gcap">${esc(r.series)} · representative image · select to enlarge</p>`:`<div class="gbat none">Battery photo to follow</div><p class="gcap"></p>`}
    <div class="gph"><b>${esc(r.pn)}</b><span>${esc(r.origin)}</span></div><div class="eprice" data-p="${esc(r.pn)}" style="margin:-4px 0 8px"></div>
    ${chipsHtml(r)}${statsHtml(r)}${specHtml(r)}
    <div class="gacts"><button type="button" class="gbtn bronze" id="g-add">${addLabel(r.pn)}</button><button type="button" class="gbtn ghost" id="g-more" aria-expanded="false">Battery details</button></div>
    <div class="gmore" id="g-moreb" hidden><dl class="sp">${[["Battery type",TNAME[r.type]],["Drawing",r.dwg?`${r.dwg}, ${dd.title}`:"–"],["Made in",ORG[r.origin]]].map(x=>`<dt>${x[0]}</dt><dd>${esc(x[1])}</dd>`).join("")}</dl>
     ${lab?`<div class="lab"><button type="button" class="zoom" data-z="${lab}" data-t="${esc(r.series)} front label, 267 × 100 mm"><img src="${LIMG(lab)}" alt="${esc(r.series)} front label"></button><p class="small">Label artwork: front label, ${esc(r.series)} · 267 × 100 mm</p></div>`:""}</div>
   </div>
   ${featHtml(r)}${aboutHtml(r)}${altHtml(r)}
   <div class="gsec"><h3>Vehicle applications</h3><p class="gsub">Battery ${esc(r.pn)} · SAB ${esc(r.sab||"–")} · ${veh.length} South African vehicle applications (SABAT 2019)</p>
    ${veh.length?`<input class="vf" id="d-vf" type="search" placeholder="Filter by make or model (e.g. Toyota, Polo)" aria-label="Filter vehicle applications"><div class="vlist"><table><thead><tr><th>Make</th><th>Model</th><th>Year</th><th>SAB</th></tr></thead><tbody id="d-vb"></tbody></table></div><p class="small" id="d-vn"></p>`:`<p class="small">No vehicle application listed for this SAB number.</p>`}</div>
   ${users.length?`<div class="gusers"><h3>Part numbers using this drawing</h3>${users.map(([o,l])=>`<h4>${esc(o)} (${l.length})</h4><div>${l.map(x=>`<button type="button" class="uchip" data-pn="${esc(x)}" aria-pressed="${x===r.pn}">${esc(x)}</button>`).join("")}</div>`).join("")}</div>`:""}
   ${warrantyHtml(r)}${closingHtml(r)}`;
  if(veh.length){const vb=$("#d-vb"),vf=$("#d-vf");const draw=()=>{const t=vf.value.toLowerCase().split(/\s+/).filter(Boolean);const m=veh.filter(v=>t.every(x=>v._t.includes(x)));
    vb.innerHTML=m.slice(0,300).map(v=>{const rec=v.fit.includes(r.pn);return `<tr><td>${esc(v.m)}</td><td>${esc(v.o)}</td><td>${esc(v.y)}</td><td><span class="rec${rec?"":" alt"}">${esc(rec?v.r+" rec.":(v.a||v.r)+" alt.")}</span></td></tr>`}).join("");
    $("#d-vn").textContent=m.length>300?`Showing 300 of ${m.length} – type a make or model to narrow the list`:`${m.length} shown`;};vf.addEventListener("input",draw);draw();}
  $("#g-guide").onclick=()=>{closeD();tab("gd");scrollTo(0,0);};wireUpgrade(r);
  if(p)$("#gbat").onclick=()=>{view="p";paintImg();};
  $("#g-add").onclick=()=>{cartAdd(r);$("#g-add").textContent=addLabel(r.pn);};
  $("#g-more").onclick=e=>{const b=$("#g-moreb");b.hidden=!b.hidden;e.currentTarget.setAttribute("aria-expanded",!b.hidden);e.currentTarget.textContent=b.hidden?"Battery details":"Hide details";};
  const i=seq.indexOf(r.pn);$("#d-prev").disabled=i<=0;$("#d-next").disabled=i<0||i>=seq.length-1;
  $("#d-info").scrollTop=0;
  if(dlg.hidden){dlg.hidden=false;document.body.style.overflow="hidden";$("#d-close").focus();}
  prices();
  try{history.replaceState(null,"","#"+r.pn);}catch(e){}
}
function closeD(){dlg.hidden=true;document.body.style.overflow="";try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}if(dLast&&dLast.focus)dLast.focus();}
$("#d-close").addEventListener("click",closeD);
$("#d-prev").addEventListener("click",()=>{const i=seq.indexOf(cur.pn);if(i>0)openPart(seq[i-1],view,seq);});
$("#d-next").addEventListener("click",()=>{const i=seq.indexOf(cur.pn);if(i<seq.length-1)openPart(seq[i+1],view,seq);});
$("#d-info").addEventListener("click",e=>{const c=e.target.closest(".uchip");if(c&&c.dataset.pn!==cur.pn)openPart(c.dataset.pn,view,dUsers(cur.dwg));});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){if(!fs.hidden){closeFs();return;}if(!dlg.hidden)closeD();}
  if(!dlg.hidden&&fs.hidden&&!/INPUT|SELECT/.test(act().tagName)){if(e.key==="ArrowRight")$("#d-next").click();if(e.key==="ArrowLeft")$("#d-prev").click();}});

/* ---------- cart: the website's cart (signed-in customers see their prices there) ---------- */
const citem=r=>({key:r.pn,no:r.pn,cat:"Batteries",desc:TNAME[r.type]+" "+r.ah+"Ah "+r.cca+"A (EN), "+r.box+" case",link:"/part/"+r.pn+"/",kind:"bat"});
const cqty=pn=>{const C=window.STV&&STV.Cart;if(!C)return 0;const it=C.items().find(i=>i.key===pn);return it?it.qty||1:0;};
const addLabel=pn=>{const n=cqty(pn);return n?"In cart ("+n+") · add 1":"Add to cart";};
function cartAdd(r){if(!window.STV)return;STV.Cart.add(citem(r),1);STV.toast("1 × "+r.pn+" added to your cart");}
addEventListener("storage",()=>{if(!dlg.hidden&&cur){const a=$("#g-add");if(a)a.textContent=addLabel(cur.pn);}});

/* ---------- battery guide and warranty (added) ---------- */
const WARRANTY_URL="/warranty/battery/";
const wurl=pn=>WARRANTY_URL+(pn?(WARRANTY_URL.includes("?")?"&":"?")+"pn="+encodeURIComponent(pn):"");
$$("[data-warranty]").forEach(a=>{a.href=wurl("");});
$$(".hfacts [data-n]").forEach(b=>b.textContent=CAT.filter(r=>r.type===b.dataset.n).length);
$$("[data-goto]").forEach(b=>b.addEventListener("click",()=>{tab(b.dataset.goto);scrollTo(0,0);}));
$$(".tlink[data-type]").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.type;st.types.clear();st.types.add(t);
  $$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t?st.types.has(x.dataset.t):false));tab("bat");run(true);scrollTo(0,0);}));
$$(".gtoc a").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();const el=document.querySelector(a.getAttribute("href"));if(el)el.scrollIntoView({behavior:"smooth"});}));
const TYPEINFO={
 SMF:"A sealed maintenance free (SMF) battery with calcium-alloy grids. Water loss is very low, so it never needs topping up, and it holds its charge well when the vehicle is parked. Designed for vehicles without start-stop.",
 EFB:"An enhanced flooded battery (EFB) built for start-stop vehicles. Reinforced plates and carbon additives give fast charge acceptance and a much higher cycle life than a standard battery, for reliable engine restarts in traffic.",
 AGM:"An absorbent glass mat (AGM) battery. The electrolyte is held in glass-fibre mats, making the battery spill-proof, vibration resistant and capable of the highest cycling performance. Designed for advanced start-stop systems with brake energy recovery.",
 HDB:"A heavy duty battery for trucks, buses, agricultural and construction equipment. Robust plates and case are designed for high cranking loads, constant vibration and long operating hours."};
const SERINFO={"Platinum Series":"Platinum Series, the flagship Stravik range (blue label band).","Gold Series":"Gold Series, the Stravik performance range (bronze label band).","Silver Series":"Silver Series, the Stravik value range (grey label band).",
 "EFB-II Start-Stop":"EFB-II Start-Stop range of enhanced flooded batteries.","EFB Start-Stop":"EFB Start-Stop range of enhanced flooded batteries.","AGM Start-Stop":"AGM Start-Stop range of absorbent glass mat batteries."};
function caseInfo(r){
  if(/DIN/.test(r.group))return `${r.box} is a standard European DIN case (EN 50342-2)`+(r.H<=176?`, in the low 175 mm height for vehicles with limited space under the bonnet.`:`, 190 mm high.`);
  if(/JIS/.test(r.group))return `${r.box} is a Japanese Industrial Standard (JIS) case, used in many Asian vehicles. The number shows the approximate length in centimetres.`;
  return `${r.box} is a heavy duty case for commercial and off-road vehicles.`;}
function layoutInfo(l){l=String(l);
  if(l.startsWith("0 /"))return "Supplied for layout 0 or 1. Confirm the terminal position before fitting.";
  if(l.startsWith("0"))return "Layout 0: with the terminals on the side nearest to you, the positive (+) terminal is on the right.";
  if(l.startsWith("1"))return "Layout 1: with the terminals on the side nearest to you, the positive (+) terminal is on the left.";
  return `Layout ${l}: heavy duty layout. Layouts 3 and 4 are mirror images, so compare the positive (+) terminal position with the old battery or the technical drawing.`;}
function hdInfo(h){h=String(h||"");
  if(/^B0+$/.test(h))return `Hold-down ${h}: no ledge at the base of the case. The battery is secured by a top frame or clamp.`;
  return `Hold-down ${h}: the ledge at the base of the case that the vehicle clamp grips (EN 50342-2). Match it to the original battery so the battery is held firmly.`;}
function aboutHtml(r){
  const ss=r.type==="EFB"||r.type==="AGM"||/Start-Stop/.test(r.series);
  return `<div class="gsec about"><h3>About this battery</h3><p class="gsub">${esc(r.pn)} · ${esc(SERINFO[r.series]||r.series)}</p>
   <p>${esc(TYPEINFO[r.type]||"")}</p>
   <h4>Capacity and starting power</h4><p>${esc(r.ah)} Ah capacity (20-hour rate) and ${esc(r.cca)} A cold cranking current (EN, at −18 °C). Choose values equal to or higher than the original battery.</p>
   <h4>Case and fitting</h4><p>${esc(caseInfo(r))} Size ${r.L} × ${r.W} × ${r.H} mm.</p><p>${esc(layoutInfo(r.layout))}</p><p>${esc(hdInfo(r.hd))}</p>
   ${ss?`<p class="ss"><b>Start-stop vehicles:</b> replace like for like (AGM with AGM, EFB with EFB or AGM) and register the new battery with the vehicle's battery management system after fitting.</p>`:""}
   <button type="button" class="glink" id="g-guide">Read the full battery guide ›</button></div>`;}
function warrantyHtml(r){
  return `<div class="wsec"><p class="eyebrow">Warranty</p><h3>Register your battery warranty</h3>
   <p>Register this battery after installation so that any warranty claim is handled quickly. Have your proof of purchase ready.</p>
   <dl class="wid"><dt>Part number</dt><dd>${esc(r.pn)}</dd><dt>Battery</dt><dd>${esc(TNAME[r.type])} · ${esc(r.ah)} Ah · ${esc(r.cca)} A</dd></dl>
   <a class="gbtn bronze hlink" href="${esc(wurl(r.pn))}">Register warranty ›</a></div>`;}

/* ---------- presentation upgrade (added) ---------- */
const SERCOL={"Platinum Series":"#1d4f8f","Gold Series":"#A97C42","Silver Series":"#8f96a3","EFB-II Start-Stop":"#2c6db5","EFB Start-Stop":"#2c6db5","AGM Start-Stop":"#1d6b3a"};
const TECHN={SMF:"SMF technology",EFB:"EFB technology",AGM:"AGM technology",HDB:"Heavy duty"};
const rank=r=>r.type==="AGM"?3:(r.type==="EFB"||/EFB/.test(r.series))?2:1;
const TIPS={
 "Capacity":"Energy stored, in ampere-hours over a 20-hour discharge (C20). Higher capacity supports more electrical equipment and longer standing time.",
 "CCA":"Cold cranking amps: the current delivered at −18 °C in the EN 50342-1 test. Higher CCA means stronger starting in cold weather.",
 "Case":"Standard box size. Batteries with the same case have the same outside dimensions.",
 "Size L × W × H":"Length, width and overall height in mm, including terminals. Check the battery tray and bonnet clearance.",
 "Layout":"Position of the positive (+) terminal. 0 = positive right, 1 = positive left (terminals towards you). 3 and 4 are heavy duty mirror layouts.",
 "Hold-down":"Code for the ledge at the base of the case that the vehicle clamp grips (EN 50342-2). B00 / B0 = no ledge.",
 "SAB no.":"Size code in the South African battery application guide (SABAT). Same SAB number = same size, layout and fitment.",
 "Voltage":"Nominal voltage. All Stravik starter batteries are 12 V."};
const tip=k=>TIPS[k]?`<button type="button" class="tip" aria-label="${esc(k)}: explanation" data-tip="${esc(TIPS[k])}">i</button>`:"";
const IC={
 shield:'<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 cycle:'<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
 drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M4 4l16 16"/>',
 snow:'<path d="M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7"/>',
 wave:'<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2 18c2-4 4-4 6 0s4 4 6 0 4-4 6 0" opacity=".5"/>',
 plug:'<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
 truck:'<path d="M2 6h11v9H2zM13 9h4l4 4v2h-8z"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const ico=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const FEAT={
 SMF:[["shield","Maintenance free","Sealed design with calcium technology. Never needs topping up."],["bolt","Strong starting power","Reliable cranking in hot and cold climates."],["clock","Low self-discharge","Holds its charge well when the vehicle stands unused."],["cycle","Long service life","Corrosion-resistant calcium-alloy grids."]],
 EFB:[["cycle","Start-stop ready","Built for the frequent restarts of start-stop systems."],["plug","Fast charge acceptance","Recharges quickly on short trips and in traffic."],["bolt","High cycle life","Withstands far more charge and discharge cycles than a standard battery."],["shield","Maintenance free","Sealed construction, no topping up."]],
 AGM:[["cycle","Advanced start-stop","For start-stop with brake energy recovery and high electrical loads."],["drop","Spill-proof","Electrolyte held in glass-fibre mats; valve-regulated design."],["bolt","Highest cycle life","The best cycling performance in the Stravik range."],["wave","Vibration resistant","Tightly packed plates withstand rough roads."]],
 HDB:[["truck","Built for commercial duty","For trucks, buses, tractors and construction equipment."],["bolt","High cranking power","Starts large diesel engines in demanding conditions."],["wave","Vibration resistant","Robust plates and case for constant vibration."],["clock","Long operating hours","High capacity for heavy electrical loads."]]};
function featHtml(r){const f=(r.type==="HDB"&&/EFB/.test(r.series))?[FEAT.EFB[0],FEAT.EFB[2],FEAT.HDB[0],FEAT.HDB[2]]:FEAT[r.type]||[];
  return `<div class="gsec feat"><h3>Features and benefits</h3><div class="fb">${f.map(x=>`<div><span class="fi">${ico(x[0])}</span><b>${esc(x[1])}</b><p>${esc(x[2])}</p></div>`).join("")}</div></div>`;}
function chipsHtml(r){
  return `<div class="pchips"><button type="button" class="pc ser" data-f="ser" data-v="${esc(r.series)}" style="--c:${SERCOL[r.series]||"#0B203D"}">${esc(r.series)}</button><button type="button" class="pc ${r.type.toLowerCase()}" data-f="type" data-v="${r.type}">${esc(TECHN[r.type])}</button><span class="pc">12 V</span><button type="button" class="pc" data-f="box" data-v="${esc(r.box)}">${esc(r.box)} case</button><span class="pc">${esc(ORG[r.origin])}</span></div>`;}
function statsHtml(r){return `<div class="kstats"><div><b>${esc(r.ah)}</b><span>Ah</span></div><div><b>${esc(r.cca)}</b><span>CCA (EN)</span></div><div><b>${esc(r.box)}</b><span>Case</span></div><div><b>${esc(String(r.layout).split(" ")[0])}</b><span>Layout</span></div></div>`;}
function specHtml(r){return `<dl class="sp">${[["Capacity",r.ah+" Ah (C20)"],["CCA",r.cca+" A (EN)"],["Voltage","12 V"],["Case",r.box+", "+r.group.replace(" cases","").replace(" case","")],["Size L × W × H",`${r.L} × ${r.W} × ${r.H} mm`],["Layout",r.layout],["Hold-down",r.hd],["SAB no.",r.sab||"–"],["Series",r.series]].map(x=>`<dt>${esc(x[0])}${tip(x[0])}</dt><dd>${esc(x[1])}</dd>`).join("")}</dl>`;}
function altHtml(r){
  const a=CAT.filter(x=>x.pn!==r.pn&&x.group===r.group&&x.box===r.box&&x.layout===r.layout)
   .sort((x,y)=>rank(y)-rank(x)||parseFloat(y.cca)-parseFloat(x.cca)||y.ah-x.ah).slice(0,8);
  if(!a.length)return "";
  return `<div class="gsec"><h3>Same size alternatives</h3><p class="gsub">Other Stravik batteries in the ${esc(r.box)} case with layout ${esc(String(r.layout).split(" ")[0])}. They fit the same tray and connect the same way.</p>
   <div class="alts">${a.map(x=>{const up=rank(x)>rank(r)?`Upgrade to ${x.type==="HDB"?"EFB":x.type}`:(rank(x)===rank(r)&&parseFloat(x.cca)>parseFloat(r.cca))?"More starting power":"";
    return `<button type="button" class="alt" data-pn="${esc(x.pn)}"><i style="background:${SERCOL[x.series]||"#0B203D"}"></i><span><b>${esc(x.pn)}</b><small>${esc(x.series)} · ${esc(TNAME[x.type])}</small></span><span class="an"><b>${x.ah}</b> Ah<br><b>${esc(x.cca)}</b> A</span>${up?`<em>${up}</em>`:""}</button>`;}).join("")}</div>
   <p class="small">${r.type==="AGM"?"An AGM battery must be replaced with AGM.":"Start-stop vehicles must keep EFB or AGM technology."}</p></div>`;}
function closingHtml(r){return `<div class="gsec tools"><div class="gacts"><a class="gbtn navy hlink" href="/part/${encodeURIComponent(r.pn)}/">Open battery page</a><button type="button" class="gbtn ghost" id="g-share">Copy page link</button><a class="gbtn ghost hlink" href="/#/contact?part=${encodeURIComponent(TNAME[r.type])}&amp;ref=${encodeURIComponent(r.pn)}">Ask a question</a></div>
  <p class="small">Fitment information is a guide. Always confirm case, terminal layout and hold-down against the battery being replaced or the vehicle handbook before installation.</p></div>`;}
function pageUrl(pn){return location.origin+"/part/"+encodeURIComponent(pn)+"/";}
function wireUpgrade(r){
  const sh=$("#g-share");sh.onclick=()=>{const u=pageUrl(r.pn);(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>sh.textContent="Link copied",()=>prompt("Copy the link:",u));};
  $$("#d-info .alt").forEach(b=>b.onclick=()=>openPart(b.dataset.pn,view));
  $$("#d-info .pc[data-f]").forEach(b=>b.onclick=()=>{const f=b.dataset.f,v=b.dataset.v;closeD();tab("bat");$("#reset").click();
    if(f==="type"){st.types.add(v);$$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t?st.types.has(x.dataset.t):false));}
    else{st[f]=v;$(f==="ser"?"#f-ser":"#f-box").value=v;}run(true);scrollTo(0,0);});
}
/* quick finder on the batteries tab */
(function(){
  const mk=$("#qf-mk"),mo=$("#qf-mo"),res=$("#qf-res");if(!mk)return;
  const makes=[...new Set(VEH.map(v=>v.m))].sort((a,b)=>a.localeCompare(b));
  mk.innerHTML=`<option value="">Select make</option>`+makes.map(m=>`<option>${esc(m)}</option>`).join("");
  mk.onchange=()=>{const ms=[...new Set(VEH.filter(v=>v.m===mk.value).map(v=>v.o))].sort((a,b)=>a.localeCompare(b));
    mo.innerHTML=`<option value="">Select model</option>`+ms.map(m=>`<option>${esc(m)}</option>`).join("");mo.disabled=!mk.value;res.innerHTML="";};
  mo.onchange=()=>{const rows=VEH.filter(v=>v.m===mk.value&&v.o===mo.value);
    res.innerHTML=rows.slice(0,4).map(v=>`<div class="qfr"><span class="small">${esc(v.y)} · SAB ${esc(v.r)}</span><div>${v.fit.map(p=>{const r=byPn[p];return r?`<button type="button" class="pchip" data-pn="${esc(p)}">${esc(p)}<small>${esc(TNAME[r.type])} · ${r.ah} Ah</small></button>`:""}).join("")||"<span class='small'>No Stravik battery listed</span>"}</div></div>`).join("")+(rows.length>4?`<p class="small">${rows.length-4} more year ranges in the Vehicle finder.</p>`:"");};
  res.addEventListener("click",e=>{const c=e.target.closest(".pchip");if(c)openPart(c.dataset.pn);});
  $$(".qx-ex button").forEach(b=>b.onclick=()=>{q.value=b.dataset.q;$("#qx").hidden=false;run(true);});
  $$(".ftech button").forEach(b=>{b.querySelector("b").textContent=CAT.filter(r=>r.type===b.dataset.t).length;
    b.onclick=()=>{st.types.clear();st.types.add(b.dataset.t);$$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t?st.types.has(x.dataset.t):false));run(true);$("#count").scrollIntoView({behavior:"smooth",block:"center"});};});
})();

/* ---------- prices for signed-in customers (from dealer.js) ---------- */
function prices(){const D=window.StravikDealer,t=D&&D.tag;$$("[data-p]").forEach(el=>{const v=t?t(el.dataset.p)||"":"";if(el.innerHTML!==v)el.innerHTML=v;});}
document.addEventListener("stravik-prices",prices);

/* ---------- start: links from the rest of the website ---------- */
syncView();
const P=new URLSearchParams(location.search);
const TSLUG={"smf-batteries":"SMF","efb-batteries":"EFB","agm-batteries":"AGM","heavy-duty-batteries":"HDB"};
const ty=P.get("type");const tc=ty&&(TSLUG[ty]||String(ty).toUpperCase());
if(tc&&TYPES.some(t=>t[0]===tc)){st.types.add(tc);$$("#types .tchip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t?st.types.has(x.dataset.t):false));}
if(P.get("series")&&uniq("series").includes(P.get("series"))){st.ser=P.get("series");$("#f-ser").value=st.ser;}
if(P.get("box")&&uniq("box").includes(P.get("box"))){st.box=P.get("box");$("#f-box").value=st.box;}
if(P.get("q")){q.value=P.get("q");$("#qx").hidden=false;}
run(true);
const TABQ={guide:"gd",vehicles:"veh",drawings:"dwg",labels:"lab"};
tab(TABQ[P.get("tab")]||"bat");
if(P.get("make")){const mk=P.get("make");if([...$("#v-mk").options].some(o=>o.value===mk)){tab("veh");$("#v-mk").value=mk;if(P.get("model"))$("#v-mo").value=P.get("model");runV(true);}}
const dq=P.get("dwg");if(dq&&DW[dq]){const u=dUsers(dq);if(u.length)openPart(u[0],"d",u);}
const h=decodeURIComponent(location.hash.slice(1));if(byPn[h]){tab("bat");openPart(h);}
else{const qp=String(P.get("pn")||"").trim().toUpperCase();if(byPn[qp]){tab("bat");openPart(qp);}}
addEventListener("hashchange",()=>{const h=decodeURIComponent(location.hash.slice(1));if(byPn[h]&&(!cur||cur.pn!==h||dlg.hidden)){tab("bat");openPart(h);}});

}
})();
