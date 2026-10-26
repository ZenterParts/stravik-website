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
const MENU=[
  {name:"Braking",icon:"disc",href:"/#/products/braking-system",kids:catNode(CATALOG.find(c=>c.id==="braking-system"))},
  {name:"Steering & suspension",icon:"ball",href:"/#/products/steering-suspension",kids:["Suspension","Steering","Mountings"].map(g=>({name:g,href:"/#/steering",kids:SS_TYPES.filter(t=>t[3]===g).map(t=>({name:t[2],href:"/#/steering/"+slug(t[2])}))})).concat([{name:"Search the catalogue",href:"/#/steering"}])},
  {name:"Shock absorbers",icon:"shock",href:"/#/products/shock-absorbers",kids:catNode(CATALOG.find(c=>c.id==="shock-absorbers"))},
  {name:"Filtration",icon:"f_oil",href:"/#/products/filters",kids:[["air-filters","Air filters"],["oil-filters","Oil filters"],["fuel-filters","Fuel filters"],["cabin-filters","Cabin filters"],["filter-kits","Filter kits"],["coolant-filters","Coolant filters"],["filter-housings","Filter housings"]].map(f=>({name:f[1],href:"/#/filters/"+f[0]})).concat([{name:"Search the catalogue",href:"/#/filters"}])}];
const CHEV='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const megaCol=(items,lvl)=>`<ul class="mcol" data-lvl="${lvl}">${items.map((it,k)=>`<li${it.kids&&it.kids.length?' class="has"':""} data-k="${k}"><a href="${it.href}">${esc(it.name)}</a>${it.kids&&it.kids.length?`<span class="chev">${CHEV}</span>`:""}</li>`).join("")}</ul>`;
ddMenu.classList.add("mega");
ddMenu.innerHTML=`<div class="mega-cols">${megaCol(MENU,0)}<div class="mcol2"></div><div class="mcol3"></div></div>
  <div class="mega-m">${MENU.map(f=>`<details><summary><a href="${f.href}">${esc(f.name)}</a></summary><ul>${f.kids.flatMap(g=>g.href==="/#/steering"&&g.kids?g.kids:[g]).map(g=>`<li><a href="${g.href}">${esc(g.name)}</a></li>`).join("")}</ul></details>`).join("")}<a class="mega-all" href="/#/products">All products</a></div>
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
  document.querySelectorAll("button[data-cart-key]").forEach(b=>{const on=Cart.has(b.dataset.cartKey);b.dataset.on=on;b.textContent=on?"✓ In cart":"Add to cart";b.setAttribute("aria-label",(on?"Remove ":"Add ")+b.dataset.cartKey+(on?" from cart":" to cart"));});
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
["copy","cut","contextmenu","dragstart","selectstart"].forEach(ev=>document.addEventListener(ev,e=>{if(!typing(e.target))e.preventDefault();}));
document.addEventListener("keydown",e=>{
  if(!(e.ctrlKey||e.metaKey))return;const k=(e.key||"").toLowerCase();
  if(k==="s"||k==="p"||k==="u"||(e.shiftKey&&(k==="s"||k==="c"))){e.preventDefault();return;}
  if((k==="a"||k==="c"||k==="x")&&!typing(e.target))e.preventDefault();
});

cartPaint();
window.STV={Cart,cartPaint,toast,clampQty,ddSet,ddBtn,nav,menuBtn,esc};
})();
