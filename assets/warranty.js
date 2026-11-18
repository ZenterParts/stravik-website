// Stravik battery warranty registration (/warranty/battery/?s=<serial no.> from the QR code on the battery, or ?pn=<Stravik no.>).
// ?s= (the QR code on each battery): the serial number is filled in and locked, so it can't be changed.
// ?pn= of a known battery shows that battery above the serial number box, starts the serial with its number ("SVADH001-") and refuses a serial of another battery.
// Registration is by serial number only: it is checked with public.stravik_serial_check (which battery, already registered?). The form is saved with public.stravik_warranty_register,
// which accepts each serial once (anyone may call it; only staff can read the registrations).
// Photos: one of the multimeter for each test reading (resting, cranking, alternator), uploaded to a private folder only Stravik staff can open.
(function(){
const SB_URL="https://kyegujgvlsbttyrlibgn.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZWd1amd2bHNidHR5cmxpYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTQ4NjUsImV4cCI6MjEwNjgzMDg2NX0.qw8n7Y9l8zO-npZ4BDlqK9PvksRQpEVg6BxqEo_MnWs";
const f=document.getElementById("wf");if(!f)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
let BAT=null;
const list=fetch("/batteries.json").then(r=>r.json()).then(d=>{const T={};(d.types||[]).forEach(t=>T[t[0]]=t[1]);BAT={};
  (d.parts||[]).forEach(p=>{BAT[p[0]]={pn:p[0],desc:(T[p[1]]||"Battery")+" 12V "+p[5]+"Ah "+p[6]+"A (EN)",ser:p[2]||"",box:p[4]||"",
    line:(T[p[1]]||"Battery")+" 12V "+p[5]+"Ah "+p[6]+"A"+(p[4]?", "+p[4]+" case":"")};});}).catch(()=>{BAT=null;});
// serial numbers: SVPDH003-2611-7K3M9 (Stravik no., YYMM made, 5 characters)
const snFmt=s=>{const c=clean(s);return /^SV[A-Z0-9]{6}\d{4}[A-Z0-9]{5}$/.test(c)?c.slice(0,8)+"-"+c.slice(8,12)+"-"+c.slice(12):null;};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],ym=s=>{const p=String(s||"").split("-");return p.length>1?MON[+p[1]-1]+" "+p[0]:"";};
const dmy=s=>{const p=String(s||"").split("-");return p.length>2?(+p[2])+" "+MON[+p[1]-1]+" "+p[0]:s;};
let SN={ok:false},snSeq=0,EXP=null;   // EXP: the battery in ?pn=, when it is a known one
const P=new URLSearchParams(location.search),qs=P.get("s"),q=P.get("pn");
async function checkSn(){const el=$("w_snmsg"),v=$("w_sn").value,sn=snFmt(v),seq=++snSeq;SN={ok:false};el.classList.remove("bad");
  if(!clean(v)){el.textContent="";return;}
  if(!sn){el.textContent=clean(v).length>=17?"This doesn't look like a Stravik serial number. It looks like SVPDH003-2611-7K3M9.":"";el.classList.toggle("bad",clean(v).length>=17);return;}
  el.textContent="Checking…";
  try{const r=await fetch(SB_URL+"/rest/v1/rpc/stravik_serial_check",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({p_serial:sn})});
    const j=await r.json();if(seq!==snSeq)return;
    if(!j.found){el.classList.add("bad");el.textContent="We can't find serial number "+sn+(qs?". Contact us at info@zenterparts.com with a photo of the battery label.":". Check it against the label on the battery.");return;}
    await list;if(seq!==snSeq)return;
    if(EXP&&j.pn!==EXP){el.classList.add("bad");el.innerHTML=`<b>This serial number is for ${esc(j.pn)}, not ${esc(EXP)}.</b> Check it against the label on the battery. If your battery is ${esc(j.pn)}, <a href="/warranty/battery/?s=${encodeURIComponent(sn)}">register ${esc(j.pn)} instead</a>.`;return;}
    if(j.registered){el.classList.add("bad");el.innerHTML="This battery was already registered"+(j.registered_on?" on "+esc(dmy(j.registered_on)):"")+". If it is yours, contact us at <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a> with your invoice.";return;}
    if(j.void){el.classList.add("bad");el.innerHTML="This serial number can't be registered. Contact us at <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a>.";return;}
    const b=BAT&&BAT[j.pn];SN={ok:true,sn,pn:j.pn,made:j.made};
    if(sn!==$("w_sn").value)$("w_sn").value=sn;
    el.innerHTML=`<b>Stravik ${esc(b?b.desc:j.pn)}</b>, battery ${esc(j.pn)}${b?", "+esc(b.ser):""}, made ${esc(ym(j.made))}${j.months?" · "+j.months+"-month warranty":""} · <a href="/part/${encodeURIComponent(j.pn)}/">battery page</a>`+
      (q&&clean(q)!==j.pn?`<br>This serial is for battery ${esc(j.pn)}, not ${esc(clean(q))}: check that you scanned the QR code on the same battery.`:"");
  }catch(e){if(seq===snSeq){el.textContent="";SN={ok:true,sn,unchecked:true};}}}
// from the QR code on the battery: the serial is filled in and locked
if(qs){const el=$("w_sn");el.value=snFmt(qs)||String(qs).toUpperCase().slice(0,24);el.readOnly=true;el.setAttribute("aria-readonly","true");el.classList.add("locked");
  const help=$("w_snrow").querySelector(".wsub");if(help)help.innerHTML="Filled in from the QR code on the battery. Scanned the wrong battery? Scan the QR code on the battery you are registering.";}
else{let snT=0;$("w_sn").addEventListener("input",()=>{clearTimeout(snT);snT=setTimeout(checkSn,350);});
  $("w_sn").addEventListener("blur",()=>{clearTimeout(snT);checkSn();});}
if(qs)checkSn();
// ?pn=<known battery>: name the battery above the serial number box and start the serial with its number
if(!qs)list.then(()=>{const b=BAT&&BAT[clean(q)];if(!b)return;EXP=b.pn;
  const d=document.createElement("div");d.className="wbat";d.id="w_bat";d.style.margin="0 0 10px";d.innerHTML=`Battery: <b>${esc(b.pn)}</b>, ${esc(b.line)}`;
  const row=$("w_snrow");row.insertBefore(d,row.firstChild);
  const el=$("w_sn");if(!el.value){el.value=b.pn+"-";el.focus({preventScroll:true});el.setSelectionRange(el.value.length,el.value.length);}
  else if(snFmt(el.value))checkSn();});
$("w_date").max=today();
// test readings at fitment: resting 12.4–12.9 V, cranking 9.6–13.0 V, alternator 13.4–14.4 V (the warranty terms).
// A reading outside its range shows a warning that must be ticked.
const RD=["w_rest","w_crank","w_volt"],num=id=>{const x=parseFloat($(id).value.replace(",","."));return isFinite(x)?x:null;};
const RLIM={w_rest:[8,15],w_crank:[5,15],w_volt:[10,18]},RNAME={w_rest:"Battery resting voltage",w_crank:"Cranking voltage",w_volt:"Alternator voltage"};
function outOfRange(){return RD.filter(id=>{const x=num(id),el=$(id);return x!=null&&x>=RLIM[id][0]&&x<=RLIM[id][1]&&(x<+el.dataset.lo||x>+el.dataset.hi);});}
function readings(){RD.forEach(id=>{const x=num(id),el=$(id+"_msg"),inp=$(id),ok=x==null||x<RLIM[id][0]||x>RLIM[id][1]?null:x>=+inp.dataset.lo&&x<=+inp.dataset.hi;
    el.classList.toggle("bad",ok===false);el.textContent=ok===null?el.dataset.hint:ok?"Within the healthy range ("+inp.dataset.lo+" to "+inp.dataset.hi+" V).":"Outside the healthy range of "+inp.dataset.lo+" to "+inp.dataset.hi+" V.";});
  const bad=outOfRange();$("w_ackrow").hidden=!bad.length;if(!bad.length)$("w_ack").checked=false;
  $("w_warn").innerHTML=bad.map(id=>"<b>"+RNAME[id]+" "+esc(num(id))+" V</b> is outside the healthy range ("+$(id).dataset.lo+" to "+$(id).dataset.hi+" V).").join("<br>")+
    (bad.includes("w_volt")?"<br>Have the vehicle's charging system checked before relying on the warranty.":"");}
RD.forEach(id=>$(id).addEventListener("input",readings));
// photos of the multimeter, one per reading: uploaded to a private folder only Stravik staff can open; the file names are random
async function upload(file){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heic"}[file.type]||"jpg";
  const id=(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)))+"."+ext;
  const r=await fetch(SB_URL+"/storage/v1/object/stravik-warranty-invoices/"+id,{method:"POST",headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":file.type||"image/jpeg","x-upsert":"false"},body:file});
  if(!r.ok)throw new Error("A photo didn't upload. Try a smaller photo and register again.");return id;}
// UP remembers each photo already uploaded: pressing Register again (after a refusal) reuses it, unless a different photo
// was chosen for that reading, in which case the latest one is uploaded and used.
const UP={},PH=[["w_rest_ph","rest_reading"],["w_crank_ph","crank_reading"],["w_volt_ph","alternator_reading"]];
const okFile=fl=>!!fl&&fl.size<=8*1024*1024&&/^image\/(jpeg|png|webp|heic|heif)$/.test(fl.type||"image/jpeg");
f.querySelectorAll("input[name=w_taxi]").forEach(el=>el.addEventListener("change",()=>f.querySelector(".wtaxi").classList.remove("invalid")));
f.querySelectorAll("input").forEach(el=>el.addEventListener("input",()=>{el.classList.remove("invalid");if(el.id==="w_ok")el.closest(".wok").classList.remove("invalid");if(el.id==="w_ack")el.closest(".wack").classList.remove("invalid");}));
PH.forEach(([id])=>$(id).addEventListener("change",()=>$(id).classList.remove("invalid")));
f.addEventListener("submit",async ev=>{ev.preventDefault();
  const btn=f.querySelector("button[type=submit]"),ready=f.querySelector(".ready");let first=null;
  const bad=(id,cond)=>{const el=$(id);(id==="w_ok"?el.closest(".wok"):id==="w_ack"?el.closest(".wack"):el).classList.toggle("invalid",cond);if(cond&&!first)first=el;};
  const d=$("w_date").value;
  if(!SN.ok&&snFmt($("w_sn").value))await checkSn();
  const pn=SN.pn||"";
  bad("w_sn",!SN.ok||!pn);
  bad("w_date",!d||d>today());
  const vat=$("w_vat").value.trim();bad("w_vat",!!vat&&vat.replace(/[^A-Za-z0-9]/g,"").length<4);
  ["w_veh","w_reg"].forEach(id=>bad(id,$(id).value.trim().length<2));
  bad("w_vin",$("w_vin").value.replace(/[^A-Za-z0-9]/g,"").length<5);
  const taxi=(f.querySelector("input[name=w_taxi]:checked")||{}).value||"";f.querySelector(".wtaxi").classList.toggle("invalid",!taxi);if(!taxi&&!first)first=f.querySelector("input[name=w_taxi]");
  RD.forEach((id,n)=>{const x=num(id);bad(id,x==null||x<RLIM[id][0]||x>RLIM[id][1]);bad(PH[n][0],!okFile($(PH[n][0]).files[0]));});const volt=num("w_volt");
  readings();if(outOfRange().length)bad("w_ack",!$("w_ack").checked);
  ["w_name","w_country"].forEach(id=>bad(id,$(id).value.trim().length<2));
  bad("w_email",!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("w_email").value.trim()));
  bad("w_phone",$("w_phone").value.replace(/\D/g,"").length<7);
  bad("w_ok",!$("w_ok").checked);
  if(first){first.focus();return;}
  const v=id=>$(id).value.trim();
  const payload={pn,serial:SN.sn,purchase_date:d,vat_no:vat,alt_voltage:String(volt),resting_voltage:String(num("w_rest")),cranking_voltage:String(num("w_crank")),voltage_ack:$("w_ack").checked?"yes":"",
    chassis_no:v("w_vin"),odometer:v("w_odo"),taxi,terms:"accepted",vehicle:v("w_veh"),reg_no:v("w_reg"),
    name:v("w_name"),company:v("w_co"),email:v("w_email"),phone:v("w_phone"),country:v("w_country"),city:v("w_city"),botcheck:$("w_bot").value,page:location.pathname+location.search};
  btn.disabled=true;btn.textContent="Registering…";ready.classList.remove("show");
  try{const photos={};for(let n=0;n<PH.length;n++){const [id,key]=PH[n],fl=$(id).files[0];
      if(!UP[id]||UP[id].file!==fl){btn.textContent="Uploading photo "+(n+1)+" of "+PH.length+"…";UP[id]={file:fl,id:await upload(fl)};}photos[key]=UP[id].id;}
    payload.photos=photos;btn.textContent="Registering…";
    const r=await fetch(SB_URL+"/rest/v1/rpc/stravik_warranty_register",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({payload})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||("Status "+r.status));
    const b=BAT&&BAT[j.pn||pn];
    f.querySelectorAll(":scope > div:not(.ready)").forEach(el=>el.hidden=true);
    ready.innerHTML=`<b>Your battery is registered.</b><br>Registration number <b>${esc(j.ref)}</b> for Stravik ${esc(j.pn||pn)}${b?" ("+esc(b.desc)+")":""}${j.serial?", serial "+esc(j.serial):""}, bought on ${esc(dmy(d))}.<br>${j.months?`Your warranty is <b>${j.months} months</b>, until <b>${esc(dmy(j.expires_on))}</b>, under the <a href="/warranty/battery/terms/">Stravik battery warranty terms</a>.<br>`:""}Keep this number and your invoice as proof of purchase.${j.voltage_ok===false?"<br><b>The alternator voltage you entered is outside 13.4 to 14.4 V.</b> Have the charging system checked: a battery on a vehicle that charges outside this range is not covered.":(j.voltage_flags&&j.voltage_flags.length?"<br><b>Some test readings were outside the healthy range.</b> Have the battery and charging system checked.":"")} <a href="/part/${encodeURIComponent(pn)}/">Back to the battery</a>`;
    ready.classList.add("show");ready.scrollIntoView({block:"center",behavior:"smooth"});
  }catch(e){ready.innerHTML=`<b>The registration wasn't saved.</b> ${esc(e.message||"Check your connection and try again.")}`;ready.classList.add("show");}
  finally{btn.disabled=false;btn.textContent="Register battery";}
});
})();
