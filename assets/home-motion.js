// Homepage motion. Runs only while the homepage is on screen (it re-checks whenever the app swaps pages).
// Adds: sticky video hero the page slides over, scroll reveals, pointer-lit 3D product cards,
// a numbers band that counts up, side dot navigation and a scroll progress bar.
(function(){
const app=document.getElementById("app");if(!app)return;
const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer=matchMedia("(hover:hover) and (pointer:fine)").matches;
const header=document.querySelector("header.site");
// rounded floors that stay true as the range grows
const STATS=[[27000,"+","part numbers"],[13,"","product ranges"],[60,"+","countries supplied"],[115000,"+","vehicle fitments"]];
let undo=[];
const on=(t,ev,f,o)=>{t.addEventListener(ev,f,o);undo.push(()=>t.removeEventListener(ev,f,o));};
const fmt=n=>Math.round(n).toLocaleString("en-US");

function teardown(){undo.forEach(f=>f());undo=[];document.body.classList.remove("hm","hm-still");document.querySelectorAll(".hm-dots,.hm-progress").forEach(n=>n.remove());}

function countUp(b){
  const to=+b.dataset.count,suf=b.dataset.suffix||"";if(still||!to)return;
  const t0=performance.now(),dur=1700;
  const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);b.textContent=fmt(to*e)+suf;if(k<1)requestAnimationFrame(step);};
  b.textContent="0"+suf;requestAnimationFrame(step);
}

function init(){
  const hero=app.querySelector(".hero.hvid");if(!hero||hero.dataset.hm)return;
  hero.dataset.hm="1";
  document.body.classList.add("hm");if(still)document.body.classList.add("hm-still");
  const wrap=hero.querySelector(".wrap");
  if(wrap){const dim=document.createElement("div");dim.className="hm-dim";dim.setAttribute("aria-hidden","true");wrap.before(dim);}

  // numbers band, between the intro and the product families
  const intro=app.querySelector("section.intro"),prod=app.querySelector("section.paper");
  const stats=document.createElement("section");
  stats.className="hm-stats";stats.setAttribute("aria-label","Stravik in numbers");
  stats.innerHTML=`<div class="wrap">${STATS.map((s,i)=>`<div class="hm-stat" data-rv="up" style="--d:${(i*.12).toFixed(2)}s"><b data-count="${s[0]}" data-suffix="${s[1]}">${fmt(s[0])}${s[1]}</b><span>${s[2]}</span></div>`).join("")}</div>`;
  (intro||hero).after(stats);

  // what reveals, and how
  const mark=(sel,kind,step)=>app.querySelectorAll(sel).forEach((el,i)=>{el.dataset.rv=kind;if(step)el.style.setProperty("--d",(i*step).toFixed(2)+"s");});
  mark(".intro-txt","left");mark(".intro-pic","right");mark("section.paper .head","up");mark(".fams .fam","zoom",.09);
  if(!still){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);el.classList.add("in");
      const d=parseFloat(el.style.getPropertyValue("--d"))||0;
      setTimeout(()=>el.style.removeProperty("--d"),(d+1.1)*1000); // hover reacts instantly once shown
      const b=el.querySelector&&el.querySelector("b[data-count]");if(b)countUp(b);
    }),{threshold:.16,rootMargin:"0px 0px -6% 0px"});
    app.querySelectorAll("[data-rv]").forEach(el=>io.observe(el));undo.push(()=>io.disconnect());
  }else app.querySelectorAll("[data-rv]").forEach(el=>el.classList.add("in"));

  // cards: glow follows the pointer, gentle 3D tilt
  if(finePointer)app.querySelectorAll(".fams .fam").forEach(c=>{
    on(c,"pointermove",e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      c.style.setProperty("--mx",(x*100).toFixed(1)+"%");c.style.setProperty("--my",(y*100).toFixed(1)+"%");
      if(!still){c.style.setProperty("--rx",((.5-y)*7).toFixed(2)+"deg");c.style.setProperty("--ry",((x-.5)*9).toFixed(2)+"deg");}});
    on(c,"pointerleave",()=>{c.style.setProperty("--rx","0deg");c.style.setProperty("--ry","0deg");});
  });

  // progress bar and dot navigation
  const bar=document.createElement("div");bar.className="hm-progress";bar.setAttribute("aria-hidden","true");document.body.append(bar);
  const secs=[[hero,"Home"],[intro,"The range"],[stats,"In numbers"],[prod,"Products"],[document.querySelector("footer.site"),"Contact"]].filter(s=>s[0]);
  const dots=document.createElement("nav");dots.className="hm-dots";dots.setAttribute("aria-label","Page sections");
  dots.innerHTML=secs.map((s,i)=>`<button type="button" data-i="${i}" aria-label="Go to ${s[1]}"><span aria-hidden="true">${s[1]}</span></button>`).join("");
  document.body.append(dots);
  const hh=()=>header?header.offsetHeight:0;
  on(dots,"click",e=>{const b=e.target.closest("button");if(!b)return;const el=secs[+b.dataset.i][0];
    const y=el===hero?0:el.getBoundingClientRect().top+scrollY-hh()+(el.matches("section.intro")?28:0);
    scrollTo({top:Math.max(0,y),behavior:still?"auto":"smooth"});});

  // sticky position: a hero taller than the screen sticks only once its bottom is in view
  const wide=matchMedia("(min-width:901px)");
  const fit=()=>{hero.style.top=wide.matches?Math.min(hh(),innerHeight-hero.offsetHeight)+"px":"";};
  let raf=0,cur=-1;
  const tick=()=>{raf=0;
    const next=hero.nextElementSibling,h=hero.offsetHeight||1;
    if(next&&!still){const p=Math.min(1,Math.max(0,1-(next.getBoundingClientRect().top-hh())/h));hero.style.setProperty("--hs",p.toFixed(3));}
    const max=document.documentElement.scrollHeight-innerHeight;bar.style.setProperty("--hp",max>0?Math.min(1,scrollY/max).toFixed(4):"0");
    let a=0;secs.forEach((s,i)=>{if(s[0].getBoundingClientRect().top<=innerHeight*.45)a=i;});
    if(scrollY+innerHeight>=document.documentElement.scrollHeight-4)a=secs.length-1;
    if(a!==cur){cur=a;dots.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-current",i===a?"true":"false"));}
  };
  const req=()=>{if(!raf)raf=requestAnimationFrame(tick);};
  on(window,"scroll",req,{passive:true});on(window,"resize",()=>{fit();req();});
  fit();tick();
}

// the app replaces #app's content on every page change: start on the homepage, tidy up elsewhere
new MutationObserver(()=>{const hero=app.querySelector(".hero.hvid");if(!hero){if(document.body.classList.contains("hm"))teardown();return;}if(!hero.dataset.hm){teardown();init();}}).observe(app,{childList:true});
init();
})();
