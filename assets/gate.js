// Stravik catalogue access. The catalogues, the part pages, part search ("Find a part") and price requests (cart and
// "Can't find your part?") are for approved customers. Everyone else sees an invitation to register or sign in.
//   - app.js asks window.StravikGate before drawing one of those pages (single-page routes such as #/brakes, #/find).
//   - The static catalogue and part pages (/filters/, /batteries/catalogue/, /part/..., /filter/...) load this file in
//     the head with the data-lock attribute (tools/build-pages.js): the page content is hidden from the first paint and
//     only shown once the visitor is confirmed as an approved customer.
// Note: this controls what the website shows. The published catalogue data files (/*.json) are still public.
(function(){
  "use strict";
  var STORE="stravik-buyer-auth";   // the customer session (assets/dealer.js), separate from the staff session
  var hasSession=function(){try{return !!localStorage.getItem(STORE);}catch(e){return false;}};
  var D=function(){return window.StravikDealer||null;};
  var settled=false;   // the account check has finished (or given up), so "wait" can end
  function check(){var d=D();var done=function(){settled=true;};return (d&&d.ready?d.ready():Promise.resolve()).then(done,done);}

  // "ok" approved customer | "wait" signed in, still being checked | "pending" registration under review |
  // "changes" registration sent back | "inactive" account suspended | "register" signed in, business not registered | "none" not signed in
  function state(){
    var d=D(),me=d&&d.state&&d.state.me,dl=me&&me.dealer;
    if(dl&&dl.status==="Approved")return "ok";
    if(me&&me.staff)return "ok";   // Stravik staff signed in on the website
    if(!settled&&(d?(d.pending&&d.pending()):hasSession()))return "wait";
    if(dl&&dl.status==="Pending")return "pending";
    if(dl&&dl.status==="Rejected")return "changes";
    if(dl&&dl.status==="Suspended")return "inactive";
    return me?"register":"none";
  }

  var TEXT={
    wait:["Checking your account","One moment while we confirm your customer account.",[]],
    none:["Register with us to see our catalogues","The Stravik catalogues, part search and price requests are open to our trade customers. Create a customer account and register your business. Once our team approves it, you can search every catalogue, see your prices and order online.",
      [["Create an account","/#/dealer?m=new","gold"],["Sign in","/#/dealer","line"]]],
    register:["Register your business to see our catalogues","You're signed in. Tell us about your business and our team will review your registration. Once it's approved, the catalogues open for you.",
      [["Register your business","/#/dealer/register","gold"]]],
    pending:["Your registration is with our team","Thanks for registering. You can open the catalogues as soon as your account is approved, and we'll email you when it is.",
      [["View your account","/#/dealer","line"]]],
    changes:["We need a few changes to your registration","Please check your registration and send it again. The catalogues open once your account is approved.",
      [["Update your registration","/#/dealer/register","gold"]]],
    inactive:["Your account can't open the catalogues right now","Please contact us and we'll help you get access again.",
      [["Contact us","/#/contact","gold"],["View your account","/#/dealer","line"]]]
  };
  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
  function html(st){
    var t=TEXT[st]||TEXT.none;
    return '<section class="sv-gate" data-gate="'+st+'"><div class="wrap"><div class="sv-gate-card">'+
      '<span class="sv-gate-k">Stravik catalogues</span><h1>'+esc(t[0])+'</h1><p>'+esc(t[1])+'</p>'+
      (st==="wait"?'<p class="loading">Loading…</p>':'')+
      (t[2].length?'<div class="sv-gate-btns">'+t[2].map(function(b){return '<a class="btn '+b[2]+'" href="'+b[1]+'">'+esc(b[0])+'</a>';}).join("")+'</div>':'')+
      (st==="none"||st==="register"?'<ul class="sv-gate-why"><li>Search by Stravik, OE or competitor number, or by vehicle</li><li>Your prices next to every part</li><li>Order online, and track your orders</li></ul>':'')+
      '<p class="sv-gate-more">Want to know more first? <a href="/#/products">See our product ranges</a> or <a href="/#/contact">contact us</a>.</p>'+
      '</div></div></section>';
  }

  // styles (site colours from site.css)
  var css=".sv-gate{padding:56px 0 72px;background:var(--paper,#f2f3f2)}"+
    ".sv-gate-card{max-width:720px;margin:0 auto;background:var(--white,#fff);border:1px solid var(--line,#e1e4e1);border-top:3px solid var(--gold,#a97c42);padding:34px 36px;border-radius:4px}"+
    ".sv-gate-k{display:block;font:600 13px var(--display,'Saira Semi Condensed',sans-serif);letter-spacing:.15em;text-transform:uppercase;color:var(--gold-dark,#8a6232);margin-bottom:8px}"+
    ".sv-gate h1{font-family:var(--display,'Saira Semi Condensed',sans-serif);font-size:clamp(28px,3.4vw,38px);line-height:1.1;margin:0 0 12px;color:var(--ink,#0b203d)}"+
    ".sv-gate p{margin:0 0 14px;color:var(--muted,#5b6472);font-size:17px;line-height:1.5}"+
    ".sv-gate-btns{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0 6px}"+
    ".sv-gate-why{margin:18px 0 0;padding:16px 0 0 20px;border-top:1px solid var(--line,#e1e4e1);color:var(--ink,#0b203d);line-height:1.7}"+
    ".sv-gate-more{margin:18px 0 0 !important;font-size:15px !important}"+
    "html.sv-locked #app>:not(.sv-gate){display:none !important}"+
    "html.sv-locked .fcart{display:none !important}"+
    "@media (max-width:600px){.sv-gate{padding:28px 0 40px}.sv-gate-card{padding:24px 20px}}";
  function addCss(){if(document.getElementById("sv-gate-css"))return;var s=document.createElement("style");s.id="sv-gate-css";s.textContent=css;(document.head||document.documentElement).appendChild(s);}
  addCss();

  window.StravikGate={state:state,html:html,check:check,hasSession:hasSession};

  // ---- static catalogue and part pages
  var me=document.currentScript;
  if(!(me&&me.hasAttribute("data-lock")))return;
  var root=document.documentElement;
  root.classList.add("sv-locked");
  function paint(){
    var app=document.getElementById("app");if(!app)return;
    var st=state(),g=app.querySelector(":scope>.sv-gate");
    if(st==="ok"){root.classList.remove("sv-locked");if(g)g.remove();return;}
    root.classList.add("sv-locked");
    if(!g)app.insertAdjacentHTML("afterbegin",html(st));
    else if(g.getAttribute("data-gate")!==st)g.outerHTML=html(st);
  }
  document.addEventListener("DOMContentLoaded",function(){
    paint();
    check().then(paint);
  });
  document.addEventListener("stravik-prices",paint);   // signed in or out in this tab
  window.addEventListener("storage",function(e){if(e.key===STORE)setTimeout(function(){var d=D();if(d&&d.refresh)d.refresh().then(paint,paint);else paint();},50);});
})();
