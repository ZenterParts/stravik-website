// Stravik battery warranty registration (/warranty/battery/?s=<serial no.> from the QR code on the battery, or ?pn=<Stravik no.>).
// A serial number is checked with public.stravik_serial_check (which battery, already registered?); batteries without a serial
// use the battery number, checked against the website's battery list. The form is saved with public.stravik_warranty_register,
// which accepts each serial once (anyone may call it; only staff can read the registrations).
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
// serial numbers: SVPDH003-2611-7K3M9 (Stravik no., YYMM made, 5 characters)
const snFmt=s=>{const c=clean(s);return /^SV[A-Z0-9]{6}\d{4}[A-Z0-9]{5}$/.test(c)?c.slice(0,8)+"-"+c.slice(8,12)+"-"+c.slice(12):null;};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],ym=s=>{const p=String(s||"").split("-");return p.length>1?MON[+p[1]-1]+" "+p[0]:"";};
const dmy=s=>{const p=String(s||"").split("-");return p.length>2?(+p[2])+" "+MON[+p[1]-1]+" "+p[0]:s;};
let SN={ok:false},snSeq=0;
async function checkSn(){const el=$("w_snmsg"),v=$("w_sn").value,sn=snFmt(v),seq=++snSeq;SN={ok:false};el.classList.remove("bad");
  if(!clean(v)){el.textContent="";return;}
  if(!sn){el.textContent=clean(v).length>=17?"This doesn't look like a Stravik serial number. It looks like SVPDH003-2611-7K3M9.":"";el.classList.toggle("bad",clean(v).length>=17);return;}
  el.textContent="Checking…";
  try{const r=await fetch(SB_URL+"/rest/v1/rpc/stravik_serial_check",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({p_serial:sn})});
    const j=await r.json();if(seq!==snSeq)return;
    if(!j.found){el.classList.add("bad");el.textContent="We can't find serial number "+sn+". Check it against the label on the battery.";return;}
    if(j.registered){el.classList.add("bad");el.innerHTML="This battery was already registered"+(j.registered_on?" on "+esc(dmy(j.registered_on)):"")+". If it is yours, contact us at <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a> with your invoice.";return;}
    if(j.void){el.classList.add("bad");el.innerHTML="This serial number can't be registered. Contact us at <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a>.";return;}
    await list;const b=BAT&&BAT[j.pn];SN={ok:true,sn,pn:j.pn,made:j.made};
    if(sn!==$("w_sn").value)$("w_sn").value=sn;
    el.innerHTML=`<b>Stravik ${esc(b?b.desc:j.pn)}</b>, battery ${esc(j.pn)}${b?", "+esc(b.ser):""}, made ${esc(ym(j.made))}${j.months?" · "+j.months+"-month warranty":""} · <a href="/part/${encodeURIComponent(j.pn)}/">battery page</a>`+
      (q&&clean(q)!==j.pn?`<br>This serial is for battery ${esc(j.pn)}, not ${esc(clean(q))}: check that you scanned the QR code on the same battery.`:"");
  }catch(e){if(seq===snSeq){el.textContent="";SN={ok:true,sn,unchecked:true};}}}
const P=new URLSearchParams(location.search),qs=P.get("s"),q=P.get("pn");
if(qs)$("w_sn").value=String(qs).toUpperCase().slice(0,24);
if(q)$("w_pn").value=clean(q).slice(0,12);
function noSn(){const on=$("w_nosn").checked;$("w_pnrow").hidden=!on;$("w_snrow").hidden=on;$("w_sn").required=!on;$("w_pn").required=on;if(on)show();}
$("w_nosn").addEventListener("change",noSn);
let snT=0;$("w_sn").addEventListener("input",()=>{clearTimeout(snT);snT=setTimeout(checkSn,350);});
$("w_sn").addEventListener("blur",()=>{clearTimeout(snT);checkSn();});
if(qs)checkSn();
$("w_date").max=today();
// alternator voltage at fitment: 13.4–14.4 V is a healthy charging system
const voltNum=()=>{const x=parseFloat($("w_volt").value.replace(",","."));return isFinite(x)?x:null;};
$("w_volt").addEventListener("input",()=>{const x=voltNum(),el=$("w_vmsg");
  if(x==null||x<10||x>18){el.classList.remove("bad");el.textContent="Measured with the engine running when the battery is fitted. Ask the workshop that fitted it.";return;}
  const ok=x>=13.4&&x<=14.4;el.classList.toggle("bad",!ok);
  el.textContent=ok?"Within the normal range (13.4 to 14.4 V).":"Outside the normal range of 13.4 to 14.4 V: have the vehicle's charging system checked. A battery fitted to a vehicle that charges outside this range is not covered by the warranty.";});
// invoice photo: uploaded to a private folder only Stravik staff can open; the file name is random
async function upload(file){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","application/pdf":"pdf"}[file.type]||"jpg";
  const id=(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)))+"."+ext;
  const r=await fetch(SB_URL+"/storage/v1/object/stravik-warranty-invoices/"+id,{method:"POST",headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":file.type,"x-upsert":"false"},body:file});
  if(!r.ok)throw new Error("The invoice photo didn't upload. Try a smaller photo, or register without it.");return id;}
$("w_pn").addEventListener("input",show);list.then(show);
f.querySelectorAll("input[name=w_taxi]").forEach(el=>el.addEventListener("change",()=>f.querySelector(".wtaxi").classList.remove("invalid")));
f.querySelectorAll("input").forEach(el=>el.addEventListener("input",()=>{el.classList.remove("invalid");if(el.id==="w_ok")el.closest(".wok").classList.remove("invalid");}));
f.addEventListener("submit",async ev=>{ev.preventDefault();
  const btn=f.querySelector("button[type=submit]"),ready=f.querySelector(".ready");let first=null;
  const bad=(id,cond)=>{const el=$(id);(id==="w_ok"?el.closest(".wok"):el).classList.toggle("invalid",cond);if(cond&&!first)first=el;};
  const nosn=$("w_nosn").checked,d=$("w_date").value;
  if(!nosn&&!SN.ok&&snFmt($("w_sn").value)){clearTimeout(snT);await checkSn();}
  const pn=nosn?clean($("w_pn").value):SN.pn||"";
  if(nosn)bad("w_pn",!pn||(BAT&&!BAT[pn]));else bad("w_sn",!SN.ok);
  bad("w_date",!d||d>today());
  ["w_seller","w_inv","w_fit","w_veh","w_reg","w_name","w_country"].forEach(id=>bad(id,$(id).value.trim().length<2));
  const volt=voltNum();bad("w_volt",volt==null||volt<10||volt>18);
  bad("w_phone",$("w_phone").value.replace(/\D/g,"").length<7);
  const taxi=(f.querySelector("input[name=w_taxi]:checked")||{}).value||"";f.querySelector(".wtaxi").classList.toggle("invalid",!taxi);if(!taxi&&!first)first=f.querySelector("input[name=w_taxi]");
  const file=$("w_file").files[0];bad("w_file",!!file&&(file.size>8*1024*1024||!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(file.type)));
  bad("w_email",!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("w_email").value.trim()));
  bad("w_ok",!$("w_ok").checked);
  if(first){first.focus();return;}
  const v=id=>$(id).value.trim();
  const payload={pn,serial:nosn?"":SN.sn,purchase_date:d,seller:v("w_seller"),invoice_no:v("w_inv"),fitted_by:v("w_fit"),alt_voltage:String(volt),taxi,terms:"accepted",vehicle:v("w_veh"),reg_no:v("w_reg"),
    name:v("w_name"),company:v("w_co"),email:v("w_email"),phone:v("w_phone"),country:v("w_country"),city:v("w_city"),botcheck:$("w_bot").value,page:location.pathname+location.search};
  btn.disabled=true;btn.textContent="Registering…";ready.classList.remove("show");
  try{if(file){btn.textContent="Uploading invoice…";payload.invoice_file=await upload(file);btn.textContent="Registering…";}
    const r=await fetch(SB_URL+"/rest/v1/rpc/stravik_warranty_register",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({payload})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||("Status "+r.status));
    const b=BAT&&BAT[j.pn||pn];
    f.querySelectorAll(":scope > div:not(.ready)").forEach(el=>el.hidden=true);
    ready.innerHTML=`<b>Your battery is registered.</b><br>Registration number <b>${esc(j.ref)}</b> for Stravik ${esc(j.pn||pn)}${b?" ("+esc(b.desc)+")":""}${j.serial?", serial "+esc(j.serial):""}, bought on ${esc(dmy(d))}.<br>${j.months?`Your warranty is <b>${j.months} months</b>, until <b>${esc(dmy(j.expires_on))}</b>, under the <a href="/warranty/battery/terms/">Stravik battery warranty terms</a>.<br>`:""}Keep this number and your invoice as proof of purchase.${j.voltage_ok===false?"<br><b>The alternator voltage you entered is outside 13.4 to 14.4 V.</b> Have the charging system checked: a battery on a vehicle that charges outside this range is not covered.":""} <a href="/part/${encodeURIComponent(pn)}/">Back to the battery</a>`;
    ready.classList.add("show");ready.scrollIntoView({block:"center",behavior:"smooth"});
  }catch(e){ready.innerHTML=`<b>The registration wasn't saved.</b> ${esc(e.message||"Check your connection and try again.")}`;ready.classList.add("show");}
  finally{btn.disabled=false;btn.textContent="Register battery";}
});
})();
