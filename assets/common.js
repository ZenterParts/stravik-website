// Shared by every Stravik page (home app and generated part pages): menu, dropdown, cart, toast, copy protection.
(function(){
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const yr=document.getElementById("yr");if(yr)yr.textContent=new Date().getFullYear();

// ---------- mobile menu ----------
const menuBtn=document.querySelector(".menu-btn"),nav=document.getElementById("mainnav");
menuBtn.addEventListener("click",()=>{const o=nav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",o)});

// ---------- products dropdown ----------
const ddMenu=document.getElementById("dd-products"),ddBtn=document.querySelector('[aria-controls="dd-products"]');
const slug=t=>t.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
// Products mega menu (Lucas-style cascade): family > group > part type
const catNode=c=>{const kids=c.types.length===1
    ?c.types[0].subs.map(s=>({name:s[0],href:"/#/product/"+slug(s[0])}))
    :c.types.map(t=>({name:t.name,href:`/#/products/${c.id}/${slug(t.name)}`,kids:t.subs.map(s=>({name:s[0],href:"/#/product/"+slug(s[0])}))}));
  return kids;};
// Grouped to match the Zenter Parts product categories: category > subcategory > part type
const SS_SLUG=c=>{const t=SS_TYPES.find(x=>x[0]===c);return t?{name:t[2],href:"/#/steering/"+slug(t[2])}:null;};
const brType=c=>{const t=BR_TYPES.find(x=>x[0]===c);return {name:t[2],href:"/#/brakes/"+slug(t[2])};};
const BRK=CATALOG.find(c=>c.id==="braking-system");
const MENU=[
  {name:"Braking systems",icon:"disc",href:"/#/products/braking-system",kids:[
    brType("PAD"),brType("CVP"),brType("DSC"),
    {name:"Brake calipers",href:"/#/product/brake-calipers"},
    brType("SHO"),
    {name:"Brake drums",href:"/#/product/brake-drums"},
    {name:"Brake hoses",href:"/#/product/brake-hose-flexible"},
    {name:"More braking parts",href:"/#/products/braking-system",kids:BRK.types.map(t=>({name:t.name,href:`/#/products/braking-system/${slug(t.name)}`}))},
    {name:"Search the catalogue",href:"/#/brakes"}]},
  {name:"Steering & suspension",icon:"ball",href:"/#/products/steering-suspension",kids:
    ["CA","TE","BS","SL","BJ","RE","IA","SR","DL","SM","EM","IS","OS"].map(SS_SLUG).filter(Boolean).concat([{name:"Search the catalogue",href:"/#/steering"}])},
  {name:"Shock absorbers",icon:"shock",href:"/#/products/shock-absorbers",kids:SA_TYPES.filter(t=>!/gas spring/i.test(t[2])).map(t=>({name:t[2],href:"/#/shock-absorbers/"+slug(t[2])})).concat([{name:"Gas springs",href:"/#/products/gas-springs",kids:GS_TYPES.map(t=>({name:t[2],href:"/#/gas-springs/"+t[3]})).concat([{name:"Search the catalogue",href:"/#/gas-springs"}])},{name:"Search the catalogue",href:"/#/shock-absorbers"}])},   // gas springs (their own catalogue) sit with the shock absorbers
  {name:"Filters",icon:"f_oil",href:"/filters/",kids:[["O","Oil filters"],["A","Air filters"],["H","Cabin filters"],["D","Diesel fuel filters"],["G","Petrol fuel filters"],["R","Coolant filters"],["J","Filter kits"]].map(f=>({name:f[1],href:"/filters/?fam="+f[0]})).concat([{name:"Find by vehicle",href:"/filters/#vehicles"},{name:"Search the catalogue",href:"/filters/"}])},
  {name:"Electrical",icon:"bolt",href:"/#/products",kids:[
    {name:"Alternators",href:"/#/alternators"},
    {name:"Bulbs",href:"/#/bulbs"},
    {name:"Horns",href:"/#/horns"},
    {name:"Starter motors",href:"/#/starters"},
    {name:"Ignition coils",href:"/#/ignition-coils"}]},
  {name:"Batteries",icon:"battery",href:"/batteries/",kids:[{name:"All batteries",href:"/batteries/"},{name:"Car batteries",href:"/batteries/catalogue/?app=car"},{name:"Commercial vehicle batteries",href:"/batteries/catalogue/?app=cv"},{name:"Full battery catalogue",href:"/batteries/catalogue/"},{name:"Vehicle finder",href:"/batteries/catalogue/?tab=vehicles"},{name:"Battery guide",href:"/batteries/catalogue/?tab=guide"}]},
  {name:"Engine cooling",icon:"pump",href:"/#/water-pumps",kids:[{name:"Water pumps",href:"/#/water-pumps"}]},
  {name:"Wiper systems",icon:"wiper",href:"/#/wiper-blades",kids:[{name:"Wiper blades",href:"/#/wiper-blades"}]}];
const CHEV='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const megaCol=(items,lvl)=>`<ul class="mcol" data-lvl="${lvl}">${items.map((it,k)=>`<li${it.kids&&it.kids.length?' class="has"':""} data-k="${k}"><a href="${it.href}">${esc(it.name)}</a>${it.kids&&it.kids.length?`<span class="chev">${CHEV}</span>`:""}</li>`).join("")}</ul>`;
ddMenu.classList.add("mega");
ddMenu.innerHTML=`<div class="mega-cols">${megaCol(MENU,0)}<div class="mcol2"></div><div class="mcol3"></div></div>
  <div class="mega-m">${MENU.map(f=>!f.kids.length?`<a class="mega-solo" href="${f.href}">${esc(f.name)}</a>`:`<details><summary><a href="${f.href}">${esc(f.name)}</a></summary><ul>${f.kids.flatMap(g=>g.href==="/#/steering"&&g.kids?g.kids:[g]).map(g=>`<li><a href="${g.href}">${esc(g.name)}</a></li>`).join("")}</ul></details>`).join("")}<a class="mega-all" href="/#/products">All products</a></div>
  <a class="mega-foot" href="/#/products">All products</a>`;
(function(){
  const c1=ddMenu.querySelector('[data-lvl="0"]'),c2=ddMenu.querySelector(".mcol2"),c3=ddMenu.querySelector(".mcol3");let f=null;
  const act=(ul,li)=>{ul.querySelectorAll("li").forEach(x=>x.classList.toggle("on",x===li));};
  const open1=li=>{f=MENU[li.dataset.k];act(c1,li);c2.innerHTML=megaCol(f.kids,1);c3.innerHTML="";};
  const open2=li=>{const g=f.kids[li.dataset.k];act(c2.firstElementChild,li);c3.innerHTML=g.kids&&g.kids.length?megaCol(g.kids,2):"";};
  ["mouseover","focusin"].forEach(ev=>ddMenu.addEventListener(ev,e=>{const li=e.target.closest&&e.target.closest("li[data-k]");if(!li)return;
    const lvl=li.parentElement.dataset.lvl;if(lvl==="0"&&!li.classList.contains("on"))open1(li);else if(lvl==="1"&&!li.classList.contains("on"))open2(li);else if(lvl==="2")act(li.parentElement,li);}));
  open1(c1.firstElementChild);
})();
const DDS=[...document.querySelectorAll(".dd")];
const ddOne=(d,o)=>{d.classList.toggle("open",o);d.querySelector(".dd-btn").setAttribute("aria-expanded",o);};
const ddSet=o=>DDS.forEach(d=>ddOne(d,o));
const wideHover=()=>matchMedia("(hover:hover) and (min-width:861px)").matches;
DDS.forEach(d=>{
  const b=d.querySelector(".dd-btn");let hoverAt=0;
  b.addEventListener("click",e=>{e.stopPropagation();if(b===ddBtn&&wideHover()){ddSet(false);location.href="/#/products";return;}const open=d.classList.contains("open");const next=open&&Date.now()-hoverAt<700?true:!open;DDS.forEach(x=>{if(x!==d)ddOne(x,false);});ddOne(d,next);});
  d.addEventListener("mouseenter",()=>{if(wideHover()){hoverAt=Date.now();DDS.forEach(x=>{if(x!==d)ddOne(x,false);});ddOne(d,true);}});
  d.addEventListener("mouseleave",()=>{if(wideHover())ddOne(d,false);});
  d.addEventListener("focusout",e=>{if(!d.contains(e.relatedTarget)&&wideHover())ddOne(d,false);});
});
document.addEventListener("click",e=>{DDS.forEach(d=>{if(!d.contains(e.target))ddOne(d,false);});});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const d=DDS.find(x=>x.classList.contains("open"));if(d){ddOne(d,false);d.querySelector(".dd-btn").focus();}});

// ---------- enquiry cart (kept in this browser only) ----------
const CART_KEY="stravik-rfp-cart-v1";let cartMem=[];
const cartLoad=()=>{try{const v=JSON.parse(localStorage.getItem(CART_KEY)||"[]");return Array.isArray(v)?v:[];}catch(e){return cartMem.slice();}};
const cartSave=items=>{cartMem=items.slice();try{localStorage.setItem(CART_KEY,JSON.stringify(items));}catch(e){}cartPaint();};
const clampQty=q=>Math.max(1,Math.min(99999,parseInt(q,10)||1));
const Cart={
  items:cartLoad,
  has:k=>cartLoad().some(i=>i.key===k),
  add(it,qty){const items=cartLoad(),ex=items.find(i=>i.key===it.key);if(ex)ex.qty=clampQty((ex.qty||1)+(qty||1));else items.push(Object.assign({note:""},it,{qty:clampQty(qty||1)}));cartSave(items);return !ex;},
  remove(k){cartSave(cartLoad().filter(i=>i.key!==k));},
  set(k,f,v){cartSave(cartLoad().map(i=>{if(i.key===k)i[f]=v;return i;}));},
  clear(){cartSave([]);}
};
function cartPaint(){
  const n=cartLoad().length;
  document.querySelectorAll("[data-cart-count]").forEach(el=>{el.textContent=n;el.dataset.empty=n?"false":"true";});
  const fc=document.getElementById("fcart");if(fc)fc.classList.toggle("show",n>0&&!/^#\/cart/.test(location.hash));
  document.querySelectorAll("button[data-cart-key]").forEach(b=>{const on=Cart.has(b.dataset.cartKey);b.dataset.on=on;const l=b.dataset.cartLabel;b.textContent=l?(on?"✓ "+l+" in cart":"Add "+l.toLowerCase()+" to cart"):on?"✓ In cart":"Add to cart";b.setAttribute("aria-label",(on?"Remove ":"Add ")+b.dataset.cartKey+(on?" from cart":" to cart"));});
}
addEventListener("storage",e=>{if(e.key===CART_KEY)cartPaint();});
const toastEl=document.getElementById("toast");let toastT;
function toast(msg){toastEl.textContent=msg;toastEl.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove("show"),2600);}
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("button[data-cart-key]");if(!b)return;
  e.preventDefault();const k=b.dataset.cartKey;
  if(Cart.has(k)){Cart.remove(k);toast(k+" removed from your cart");}
  else{try{Cart.add(JSON.parse(b.dataset.item),1);toast(k+" added to your cart");}catch(err){}}
});
// part pages: quantity + add button
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("[data-add-qty]");if(!b)return;
  const q=document.getElementById(b.dataset.addQty),qty=clampQty(q?q.value:1);
  try{const it=JSON.parse(b.dataset.item);Cart.add(it,qty);toast(`${qty} × ${it.no} added to your cart`);}catch(err){}
});

// ---------- keep the catalogue on screen: no selecting, copying, dragging, saving or printing ----------
const typing=t=>!!(t&&t.closest&&t.closest("input,textarea,select"));
const evt=e=>e.composedPath?e.composedPath()[0]:e.target;   // the real element, also inside the battery catalogue (shadow DOM)
["copy","cut","contextmenu","dragstart","selectstart"].forEach(ev=>document.addEventListener(ev,e=>{if(!typing(evt(e)))e.preventDefault();}));
document.addEventListener("keydown",e=>{
  if(!(e.ctrlKey||e.metaKey))return;const k=(e.key||"").toLowerCase();
  if(k==="s"||k==="p"||k==="u"||(e.shiftKey&&(k==="s"||k==="c"))){e.preventDefault();return;}
  if((k==="a"||k==="c"||k==="x")&&!typing(evt(e)))e.preventDefault();
});

// ---------- ribbon tabs (battery pages, battery ranges): <section class="ptabs"> with <a data-tab> links and <div class="ppanel" data-panel> panels ----------
// Without JavaScript every panel shows and the links jump to it. The tab bar sticks under the header (--hh).
(function(){
  const boxes=[...document.querySelectorAll(".ptabs")];if(!boxes.length)return;
  const hdr=document.querySelector("header.site");const hh=()=>{if(hdr)document.documentElement.style.setProperty("--hh",hdr.offsetHeight+"px");};hh();addEventListener("resize",hh);
  boxes.forEach(box=>{
    const tabs=[...box.querySelectorAll("[data-tab]")],panels=[...box.querySelectorAll("[data-panel]")];if(!tabs.length)return;
    box.classList.add("js");
    const show=(k,scroll)=>{tabs.forEach(t=>t.setAttribute("aria-selected",t.dataset.tab===k));panels.forEach(p=>p.classList.toggle("on",p.dataset.panel===k));
      if(scroll){const bar=box.querySelector(".ptabbar");if(bar)scrollTo({top:box.getBoundingClientRect().top+scrollY-(hdr?hdr.offsetHeight:0)+1,behavior:"smooth"});}};
    tabs.forEach(t=>{t.setAttribute("role","tab");t.addEventListener("click",e=>{e.preventDefault();show(t.dataset.tab,false);try{history.replaceState(null,"","#"+t.dataset.tab);}catch(err){}});});
    const fromHash=scroll=>{const h=decodeURIComponent(location.hash.slice(1));if(tabs.some(t=>t.dataset.tab===h)){show(h,scroll);return true;}return false;};
    if(!fromHash(true))show(tabs[0].dataset.tab,false);
    addEventListener("hashchange",()=>fromHash(true));
    // links to a tab elsewhere on the page (e.g. "Vehicles it fits")
    document.querySelectorAll('a[href^="#"]').forEach(a=>{const k=a.getAttribute("href").slice(1);if(!a.dataset.tab&&tabs.some(t=>t.dataset.tab===k))a.addEventListener("click",e=>{e.preventDefault();show(k,true);try{history.replaceState(null,"","#"+k);}catch(err){}});});
  });
})();

cartPaint();
window.STV={Cart,cartPaint,toast,clampQty,ddSet,ddBtn,nav,menuBtn,esc};
})();
