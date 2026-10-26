// Shared by every Stravik page (home app and generated part pages): menu, dropdown, cart, toast, copy protection.
(function(){
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const yr=document.getElementById("yr");if(yr)yr.textContent=new Date().getFullYear();

// ---------- mobile menu ----------
const menuBtn=document.querySelector(".menu-btn"),nav=document.getElementById("mainnav");
menuBtn.addEventListener("click",()=>{const o=nav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",o)});

// ---------- products dropdown ----------
const ddMenu=document.getElementById("dd-products"),ddBtn=document.querySelector('[aria-controls="dd-products"]');
const ddItem=(h,ic,name,sub)=>`<a href="${h}"><span class="dd-ic">${icon(ic)}</span><span>${name}<small>${sub}</small></span></a>`;
ddMenu.innerHTML=ddItem("/#/products/braking-system","disc","Braking","Pads, discs, shoes and hydraulics")+
  ddItem("/#/products/steering-suspension","ball","Steering &amp; suspension","Ball joints, tie rod ends, arms, links and mounts")+
  ddItem("/#/products/shock-absorbers","shock","Shock absorbers","Dampers for ride and handling")+
  ddItem("/#/products/filters","f_oil","Filtration","Air, oil, fuel and cabin filters")+
  `<a class="dd-all" href="/#/products">All products</a>`;
const DDS=[...document.querySelectorAll(".dd")];
const ddOne=(d,o)=>{d.classList.toggle("open",o);d.querySelector(".dd-btn").setAttribute("aria-expanded",o);};
const ddSet=o=>DDS.forEach(d=>ddOne(d,o));
const wideHover=()=>matchMedia("(hover:hover) and (min-width:1101px)").matches;
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
