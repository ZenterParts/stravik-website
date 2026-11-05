// Stravik battery warranty registration (/warranty/battery/?pn=<Stravik no.>).
// The battery number is checked against the website's battery list, then the form is saved with the Supabase
// function public.stravik_warranty_register (anyone may call it; only staff can read the registrations).
(function(){
const SB_URL="https://kyegujgvlsbttyrlibgn.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZWd1amd2bHNidHR5cmxpYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTQ4NjUsImV4cCI6MjEwNjgzMDg2NX0.qw8n7Y9l8zO-npZ4BDlqK9PvksRQpEVg6BxqEo_MnWs";
const f=document.getElementById("wf");if(!f)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
let BAT=null,ORIG={};
const list=fetch("/batteries.json").then(r=>r.json()).then(d=>{const T={};(d.types||[]).forEach(t=>T[t[0]]=t[1]);BAT={};
  (d.parts||[]).forEach(p=>{BAT[p[0]]={pn:p[0],desc:(T[p[1]]||"Battery")+" 12V "+p[5]+"Ah "+p[6]+"A (EN)",ser:p[2]||"",box:p[4]||""};});}).catch(()=>{BAT=null;});
function show(){const pn=clean($("w_pn").value),el=$("w_bat");
  if(!pn){el.textContent="";el.classList.remove("bad");return;}
  if(!BAT){el.textContent="";return;}
  const b=BAT[pn];el.classList.toggle("bad",!b);
  el.innerHTML=b?`<b>Stravik ${esc(b.desc)}</b>, ${esc(b.ser)}, case ${esc(b.box)} · <a href="/part/${encodeURIComponent(pn)}/">battery page</a>`:(pn.length>=8?"We can't find this battery number. Check the label: it starts with SV and has 8 letters and digits.":"");}
const q=new URLSearchParams(location.search).get("pn");if(q)$("w_pn").value=clean(q).slice(0,12);
$("w_date").max=today();
$("w_pn").addEventListener("input",show);list.then(show);
f.querySelectorAll("input").forEach(el=>el.addEventListener("input",()=>{el.classList.remove("invalid");if(el.id==="w_ok")el.closest(".wok").classList.remove("invalid");}));
f.addEventListener("submit",async ev=>{ev.preventDefault();
  const btn=f.querySelector("button[type=submit]"),ready=f.querySelector(".ready");let first=null;
  const bad=(id,cond)=>{const el=$(id);(id==="w_ok"?el.closest(".wok"):el).classList.toggle("invalid",cond);if(cond&&!first)first=el;};
  const pn=clean($("w_pn").value),d=$("w_date").value;
  bad("w_pn",!pn||(BAT&&!BAT[pn]));
  bad("w_date",!d||d>today());
  ["w_seller","w_name","w_country"].forEach(id=>bad(id,$(id).value.trim().length<2));
  bad("w_email",!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("w_email").value.trim()));
  bad("w_ok",!$("w_ok").checked);
  if(first){first.focus();return;}
  const v=id=>$(id).value.trim();
  const payload={pn,purchase_date:d,seller:v("w_seller"),invoice_no:v("w_inv"),fitted_by:v("w_fit"),vehicle:v("w_veh"),reg_no:v("w_reg"),
    name:v("w_name"),company:v("w_co"),email:v("w_email"),phone:v("w_phone"),country:v("w_country"),city:v("w_city"),botcheck:$("w_bot").value,page:location.pathname+location.search};
  btn.disabled=true;btn.textContent="Registering…";ready.classList.remove("show");
  try{const r=await fetch(SB_URL+"/rest/v1/rpc/stravik_warranty_register",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({payload})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||("Status "+r.status));
    const b=BAT&&BAT[pn];
    f.querySelectorAll(":scope > div:not(.ready)").forEach(el=>el.hidden=true);
    ready.innerHTML=`<b>Your battery is registered.</b><br>Registration number <b>${esc(j.ref)}</b> for Stravik ${esc(pn)}${b?" ("+esc(b.desc)+")":""}, bought on ${esc(d)}.<br>Keep this number and your invoice as proof of purchase. <a href="/part/${encodeURIComponent(pn)}/">Back to the battery</a>`;
    ready.classList.add("show");ready.scrollIntoView({block:"center",behavior:"smooth"});
  }catch(e){ready.innerHTML=`<b>The registration wasn't saved.</b> ${esc(e.message||"Check your connection and try again.")}`;ready.classList.add("show");}
  finally{btn.disabled=false;btn.textContent="Register battery";}
});
})();
