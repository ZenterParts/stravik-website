// Stravik battery fitment and warranty registration, warranty policy V1.1 (/warranty/battery/).
// Opened from the QR code on each battery (?s=<serial no.>: the serial is filled in and locked) or from a battery page (?pn=<Stravik no.>).
// The serial decides the battery (public.stravik_serial_check). The vehicle is chosen from the application list of that battery
// (batteries.json). The fitment test follows policy 2.3: the form shows "do not fit" as soon as a result is outside the limits, and
// public.stravik_fitment_register checks everything again. The 5 photos of policy 2.2 are taken live with the camera: each is
// redrawn as a JPEG with the date and time stamped on it (which also drops the phone's location data) and uploaded to a private
// folder only Stravik staff can open. The serial format is checked by the database, so a new serial format needs no change here.
(function(){
const SB_URL="https://kyegujgvlsbttyrlibgn.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZWd1amd2bHNidHR5cmxpYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTQ4NjUsImV4cCI6MjEwNjgzMDg2NX0.qw8n7Y9l8zO-npZ4BDlqK9PvksRQpEVg6BxqEo_MnWs";
const SITE="https://stravikparts.com";
const f=document.getElementById("wf");if(!f)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const localDT=d=>ymd(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ym=s=>{const p=String(s||"").split("-");return p.length>1?MON[+p[1]-1]+" "+p[0]:"";};
const dmy=s=>{const p=String(s||"").split("-");return p.length>2?(+p[2])+" "+MON[+p[1]-1]+" "+p[0]:s;};
const stamp=d=>d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()+", "+pad(d.getHours())+":"+pad(d.getMinutes());
const radio=n=>(f.querySelector("input[name="+n+"]:checked")||{}).value||"";
const numv=id=>{const x=parseFloat(String($(id).value).replace(",","."));return isFinite(x)?x:null;};
const rowOf=id=>$(id).parentElement;
const show=(el,on)=>{el.hidden=!on;};
async function rpc(name,body){const r=await fetch(SB_URL+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||("Status "+r.status));return j;}

// ---------- battery list and vehicle applications (batteries.json)
let BAT=null,MAKES=[],VEH=[];
const list=fetch("/batteries.json").then(r=>r.json()).then(d=>{const T={};(d.types||[]).forEach(t=>T[t[0]]=t[1]);BAT={};MAKES=d.makes||[];VEH=d.vehicles||[];
  (d.parts||[]).forEach((p,ix)=>{BAT[p[0]]={pn:p[0],ix,t:p[1],ser:p[2]||"",box:p[4]||"",desc:(T[p[1]]||"Battery")+" 12V "+p[5]+"Ah "+p[6]+"A (EN)"};});}).catch(()=>{BAT=null;});
const startStopBattery=b=>!!b&&(b.t==="EFB"||b.t==="AGM"||/start-stop/i.test(b.ser));

// ---------- serial number: from the QR code (?s=, or the scan button) or typed
let SN={ok:false},snSeq=0,EXP=null,SRC="typed";
const P=new URLSearchParams(location.search),qs=P.get("s"),q=P.get("pn");
async function checkSn(){const el=$("w_snmsg"),v=clean($("w_sn").value),seq=++snSeq;SN={ok:false};el.classList.remove("bad");
  if(v.length<8){el.textContent="";vehicles();tests();return;}
  el.textContent="Checking…";
  try{const j=await rpc("stravik_serial_check",{p_serial:$("w_sn").value});if(seq!==snSeq)return;
    if(!j.found){el.classList.add("bad");el.textContent="We can't find serial number "+$("w_sn").value.trim()+". Check it against the label on the battery, or contact info@zenterparts.com with a photo of the label.";vehicles();return;}
    await list;if(seq!==snSeq)return;
    if(EXP&&j.pn!==EXP){el.classList.add("bad");el.innerHTML=`<b>This serial number is for ${esc(j.pn)}, not ${esc(EXP)}.</b> Check it against the label on the battery.`;vehicles();return;}
    if(j.registered){el.classList.add("bad");el.innerHTML="This battery was already registered"+(j.registered_on?" on "+esc(dmy(j.registered_on)):"")+". Each battery can be registered once. Contact <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a> if this is wrong.";vehicles();return;}
    if(j.void){el.classList.add("bad");el.innerHTML="This serial number can't be registered. Contact <a href=\"mailto:info@zenterparts.com\">info@zenterparts.com</a>.";vehicles();return;}
    const b=BAT&&BAT[j.pn];SN={ok:true,sn:j.serial||$("w_sn").value.trim(),pn:j.pn,made:j.made,b};
    if(j.serial&&j.serial!==$("w_sn").value)$("w_sn").value=j.serial;
    el.innerHTML=`<b>Stravik ${esc(b?b.desc:j.pn)}</b>, battery ${esc(j.pn)}${b&&b.ser?", "+esc(b.ser):""}, batch ${esc(ym(j.made))}`;
  }catch(e){if(seq===snSeq){el.classList.add("bad");el.textContent="The serial number couldn't be checked. Check your connection and try again.";}}
  vehicles();tests();}
function lockSerial(v){const el=$("w_sn");el.value=v;el.readOnly=true;el.setAttribute("aria-readonly","true");el.classList.add("locked");SRC="qr";
  $("w_snhelp").innerHTML="Filled in from the QR code on the battery. Scanned the wrong battery? Scan the QR code on the battery you are fitting.";}
if(qs){lockSerial(String(qs).toUpperCase().slice(0,30));checkSn();}
else{let t=0;$("w_sn").addEventListener("input",()=>{SRC="typed";clearTimeout(t);t=setTimeout(checkSn,400);});$("w_sn").addEventListener("blur",()=>{clearTimeout(t);checkSn();});
  list.then(()=>{const b=BAT&&BAT[clean(q)];if(b){EXP=b.pn;const d=document.createElement("div");d.className="wbat";d.style.margin="0 0 10px";d.innerHTML=`Battery: <b>${esc(b.pn)}</b>, ${esc(b.desc)}`;$("w_snrow").insertBefore(d,$("w_snrow").firstChild);}});}
// scan button: phones whose browser can read QR codes (BarcodeDetector); elsewhere the phone camera app opens the QR link
if(!qs&&"BarcodeDetector" in window&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){const btn=$("w_scan");btn.hidden=false;
  btn.addEventListener("click",async()=>{let stream=null,stop=false;const ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px";
    ov.innerHTML='<video playsinline muted style="width:100%;max-width:480px;border-radius:8px"></video><p style="color:#fff;margin:0">Point the camera at the QR code on the battery.</p><button type="button" class="btn line" style="color:#fff;border-color:#fff">Close</button>';
    document.body.appendChild(ov);const close=()=>{stop=true;if(stream)stream.getTracks().forEach(t=>t.stop());ov.remove();};ov.querySelector("button").onclick=close;
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});const v=ov.querySelector("video");v.srcObject=stream;await v.play();
      const det=new BarcodeDetector({formats:["qr_code"]});
      while(!stop){const codes=await det.detect(v).catch(()=>[]);if(codes.length){const raw=codes[0].rawValue||"";let s=null,pn=null;
          try{const u=new URL(raw);s=u.searchParams.get("s");pn=u.searchParams.get("pn");}catch(e){s=clean(raw).length>=8?raw:null;}
          close();if(s){lockSerial(String(s).toUpperCase().slice(0,30));checkSn();}
          else{const el=$("w_snmsg");el.classList.add("bad");el.textContent=pn?"This QR code is for the battery model, not this battery. Enter the serial number printed on the battery.":"This QR code is not a Stravik battery serial.";}
          return;}
        await new Promise(r=>setTimeout(r,250));}
    }catch(e){close();const el=$("w_snmsg");el.classList.add("bad");el.textContent="The camera couldn't be opened. Scan the QR code with the phone camera app, or enter the serial number.";}});}

// ---------- replacement under warranty
f.querySelectorAll("input[name=w_rep]").forEach(r=>r.addEventListener("change",()=>show($("w_reprow"),radio("w_rep")==="yes")));

// ---------- dates
$("w_idate").max=ymd(new Date());$("w_fat").value=localDT(new Date());
const fatRange=()=>{const n=new Date();$("w_fat").max=localDT(n);$("w_fat").min=localDT(new Date(n-24*3600e3));};fatRange();

// ---------- use and market
function useHint(){const za=$("w_country").value==="South Africa";
  $("w_usehint").textContent=za?"South Africa: Platinum, 24 months free replacement for every use. Claims are rejected for the wrong application (for example a car battery in a truck, machine or cycling use), excessive use or abnormal wear and tear."
    :"Taxi and commercial use have their own warranty periods (policy section 3). Commercial cover also ends at 100,000 km or 1,500 engine hours.";}
$("w_country").addEventListener("change",useHint);useHint();
f.querySelector("input[name=w_odou][value=km]").checked=true;

// ---------- vehicle from the application list of the battery
let VL=[];   // vehicles that list this battery: [index in VEH, 0 recommended / 1 alternative]
function vehicles(){const mk=$("w_make"),md=$("w_model"),yr=$("w_year"),b=SN.ok&&SN.b,msg=$("w_vehhelp");
  VL=b?VEH.map((v,i)=>[i,(v[5]||[]).includes(b.ix)?0:(v[6]||[]).includes(b.ix)?1:-1]).filter(x=>x[1]>=0):[];
  const keep=mk.value;mk.innerHTML='<option value="">Choose…</option>';md.innerHTML='<option value="">Choose…</option>';yr.innerHTML='<option value="">Choose…</option>';
  [mk,md,yr].forEach(s=>s.disabled=true);
  if(!SN.ok){msg.textContent="Choose the vehicle from the Stravik application list for this battery. Scan or enter the serial number first.";return;}
  if(!VL.length){msg.innerHTML=`No vehicles are listed for battery ${esc(SN.pn)}. Fit only the battery listed for the vehicle: contact <a href="mailto:info@zenterparts.com">info@zenterparts.com</a> before fitting.`;return;}
  msg.textContent="Vehicles listed for battery "+SN.pn+" in the Stravik application list. Vehicle not in the list: do not fit, select the correct battery.";
  const makes=[...new Set(VL.map(x=>MAKES[VEH[x[0]][0]]))].sort();makes.forEach(m=>mk.add(new Option(m,m)));mk.disabled=false;
  if(makes.includes(keep)){mk.value=keep;models();}}
function models(){const md=$("w_model"),m=$("w_make").value;md.innerHTML='<option value="">Choose…</option>';$("w_year").innerHTML='<option value="">Choose…</option>';$("w_year").disabled=true;
  VL.filter(x=>MAKES[VEH[x[0]][0]]===m).sort((a,b)=>VEH[a[0]][1].localeCompare(VEH[b[0]][1])).forEach(x=>{const v=VEH[x[0]];md.add(new Option(v[1]+(v[2]?" ("+v[2]+")":"")+(x[1]?", alternative fit":""),String(x[0])));});
  md.disabled=!m;}
function years(){const yr=$("w_year"),v=VEH[+$("w_model").value];yr.innerHTML='<option value="">Choose…</option>';if(!$("w_model").value||!v){yr.disabled=true;return;}
  const cur=new Date().getFullYear(),y=String(v[2]||""),m=y.match(/(\d{4})\s*(?:-\s*(\d{2,4}))?/);let a=1980,b=cur+1;
  if(m){a=+m[1];if(m[2])b=m[2].length===2?+(m[1].slice(0,2)+m[2])+(+m[2]<+m[1].slice(2)?100:0):+m[2];}
  b=Math.min(Math.max(b,a),cur+1);for(let k=b;k>=a;k--)yr.add(new Option(String(k),String(k)));yr.disabled=false;}
$("w_make").addEventListener("change",models);$("w_model").addEventListener("change",years);

// ---------- fitment test, policy 2.3: "do not fit" as soon as a result is outside the limits
function tests(){const tt=radio("w_tt"),ss=radio("w_ss"),ct=$("w_ct").value,lo=radio("w_lo"),T=tt==="tester";
  ["w_bt","w_st","w_ct","w_rp"].forEach(id=>show(rowOf(id),tt!=="voltmeter"));
  show($("w_lo_row"),T&&ss==="yes"&&ct==="low");show($("w_specrow"),T&&ss==="yes"&&ct==="low"&&lo==="maker_spec");
  const bad=[],ocv=numv("w_ocv"),cv=numv("w_crank"),v=numv("w_volt");
  if(ss==="yes"&&SN.ok&&SN.b&&!startStopBattery(SN.b))bad.push(`Battery ${SN.pn} is not a start-stop battery. A start-stop or smart charging vehicle needs an EFB or AGM battery: do not fit.`);
  if(tt==="voltmeter"&&ss==="yes")bad.push("A voltmeter is accepted only on vehicles without start-stop or smart charging. Test with a battery and system tester.");
  if(T&&$("w_bt").value&&$("w_bt").value!=="good")bad.push("Battery test not Good: do not fit. Recharge and retest, or replace the battery.");
  if(ocv!=null&&ocv<12.5)bad.push("Battery below 12.5 V before fitment: recharge it before fitting.");
  if(T&&$("w_st").value==="low")bad.push("Starting test Low: do not fit. Advise a starter and cable check.");
  if(cv!=null&&cv<9.6)bad.push("Cranking below 9.6 V: do not fit. Advise a starter and cable check.");
  if(v!=null&&v>14.8)bad.push("Charging above 14.8 V: the vehicle is overcharging. Do not fit, advise vehicle repair.");
  else if(tt==="voltmeter"&&v!=null&&(v<13.8||v>14.7))bad.push("With a voltmeter the charging voltage must be 13.8 to 14.7 V: do not fit, advise vehicle repair.");
  if(T&&(ct==="high"||ct==="none"||(ct==="low"&&ss==="no")))bad.push("Charging test not Normal: do not fit. Advise vehicle repair.");
  if(T&&ct==="low"&&ss==="yes"&&lo==="no")bad.push("Charging still low with the loads on: do not fit. Advise vehicle repair.");
  if(T&&$("w_rp").value==="fail")bad.push("Ripple test failed: do not fit. Advise vehicle repair.");
  if(radio("w_bms")==="not_done")bad.push("Register the battery to the vehicle's battery management system before registering the fitment.");
  const filled=!!(tt&&ss&&ocv!=null&&cv!=null&&v!=null&&radio("w_bms")&&(!T||($("w_bt").value&&$("w_st").value&&ct&&$("w_rp").value&&(!(ss==="yes"&&ct==="low")||(lo&&(lo!=="maker_spec"||$("w_spec").value.trim().length>2))))));
  const box=$("w_testmsg");box.style.background=bad.length?"":filled?"#e8f3ec":"";box.style.borderLeftColor=bad.length?"#b3261e":filled?"#2f6f4f":"";
  box.innerHTML=bad.length?"<b>Do not fit.</b><br>"+bad.map(esc).join("<br>"):filled?"<b>Fitment test passed.</b>":"Enter the tester results. Outside any limit: do not fit.";
  return{bad,filled};}
f.addEventListener("change",e=>{if(/^w_(tt|ss|lo|bms|bt|st|ct|rp)$/.test(e.target.name||e.target.id))tests();});
["w_ocv","w_crank","w_volt","w_spec"].forEach(id=>$(id).addEventListener("input",tests));tests();

// ---------- photos: taken live with the camera, stamped with the date and time, no location data
const PHK=["tester_result","tester_connected","plate_vin","battery_fitted","invoice"],PHS={};
const PHN={tester_result:"Tester result",tester_connected:"Tester connected",plate_vin:"Plate or VIN",battery_fitted:"Battery fitted",invoice:"Invoice"};
async function decode(file){if(window.createImageBitmap){try{return await createImageBitmap(file);}catch(e){}}
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>res(i);i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("decode"));};i.src=u;});}
async function stampPhoto(file,key,taken){const img=await decode(file),W=img.width,H=img.height,sc=Math.min(1,2000/Math.max(W,H)),w=Math.round(W*sc),h=Math.round(H*sc);
  const c=document.createElement("canvas"),bar=Math.max(28,Math.round(w*0.035));c.width=w;c.height=h+bar;const x=c.getContext("2d");
  x.drawImage(img,0,0,w,h);x.fillStyle="#0b203d";x.fillRect(0,h,w,bar);x.fillStyle="#fff";x.font=Math.round(bar*0.5)+"px sans-serif";x.textBaseline="middle";
  x.fillText("Stravik fitment | "+PHN[key]+" | "+stamp(taken)+(SN.ok?" | "+SN.sn:""),Math.round(bar*0.4),h+bar/2);
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("encode")),"image/jpeg",0.85));}
PHK.forEach(key=>{const inp=$("w_ph_"+key),msg=$("w_ph_"+key+"_msg"),hint=msg.textContent;
  inp.addEventListener("change",async()=>{msg.classList.remove("bad");delete PHS[key];const fl=inp.files[0];if(!fl){msg.textContent=hint;return;}
    const n=Date.now(),taken=new Date(fl.lastModified&&fl.lastModified<=n+60e3?fl.lastModified:n);
    if(!/^image\//.test(fl.type||"image/jpeg")){msg.classList.add("bad");msg.textContent="This file is not a photo. Take the photo with the camera.";inp.value="";return;}
    if(n-taken>30*60e3){msg.classList.add("bad");msg.textContent="This photo was taken on "+stamp(taken)+". Take it now, with the camera, at this fitment.";inp.value="";return;}
    msg.textContent="Preparing the photo…";
    try{const blob=await stampPhoto(fl,key,taken);PHS[key]={blob,taken,id:null};
      msg.innerHTML=`<img src="${URL.createObjectURL(blob)}" alt="" style="display:block;max-width:180px;max-height:120px;border-radius:4px;margin:4px 0">Taken ${esc(stamp(taken))}.`;}
    catch(e){msg.classList.add("bad");msg.textContent="This photo couldn't be read. Take it again with the camera.";inp.value="";}});});
async function upload(key){const p=PHS[key];if(p.id)return p.id;
  const id=(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)))+".jpg";
  const r=await fetch(SB_URL+"/storage/v1/object/stravik-warranty-invoices/"+id,{method:"POST",headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":"image/jpeg","x-upsert":"false"},body:p.blob});
  if(!r.ok)throw new Error("A photo didn't upload. Check your connection and register again.");p.id=id;return id;}

// ---------- clear the error mark when a field is changed
const unmark=e=>{const el=e.target;el.classList.remove("invalid");const w=el.closest(".wtaxi,.wok");if(w)w.classList.remove("invalid");};
f.addEventListener("input",unmark);f.addEventListener("change",unmark);

// ---------- cover, as returned by the database
function cover(j){if(j.free_months==null)return"the warranty period printed on the battery label and the box, from "+dmy(j.cover_start);
  return j.half_months>0?`${j.free_months} months free replacement until ${dmy(j.free_until)}, then 50% of the price until ${dmy(j.expires_on)}`:`${j.free_months} months free replacement, until ${dmy(j.expires_on)}`;}

// ---------- register
f.addEventListener("submit",async ev=>{ev.preventDefault();
  const btn=f.querySelector("button[type=submit]"),ready=f.querySelector(".ready");let first=null;
  const bad=(el,cond)=>{const box=el.closest(".wtaxi,.wok");(box||el).classList.toggle("invalid",cond);if(cond&&!first)first=el;};
  const req=(id,ok)=>bad($(id),!ok);
  const needRadio=n=>{const el=f.querySelector("input[name="+n+"]");if(!el.closest(".wtaxi").hidden)bad(el,!radio(n));};
  if(!SN.ok&&clean($("w_sn").value).length>=8)await checkSn();
  req("w_sn",SN.ok);
  needRadio("w_rep");if(radio("w_rep")==="yes")req("w_repref",clean($("w_repref").value).length>=6);
  ["w_seller","w_branch","w_scontact"].forEach(id=>req(id,$(id).value.trim().length>=2));
  req("w_inv",clean($("w_inv").value).length>=1);
  const idate=$("w_idate").value;req("w_idate",!!idate&&idate<=ymd(new Date()));
  ["w_fco","w_ftech"].forEach(id=>req(id,$(id).value.trim().length>=2));
  fatRange();const fv=$("w_fat").value,fat=fv?new Date(fv):null;req("w_fat",!!fat&&fat<=new Date(Date.now()+10*60e3)&&fat>=new Date(Date.now()-24*3600e3));
  req("w_name",$("w_name").value.trim().length>=2);req("w_phone",$("w_phone").value.replace(/\D/g,"").length>=8);
  const em=$("w_email").value.trim();req("w_email",!em||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em));
  needRadio("w_use");
  ["w_make","w_model","w_year","w_fuel","w_litres"].forEach(id=>req(id,!!$(id).value));
  req("w_reg",clean($("w_reg").value).length>=2||clean($("w_vin").value).length>=5);
  req("w_odo",/^\d+$/.test($("w_odo").value.replace(/[\s,.]/g,"")));needRadio("w_odou");needRadio("w_ss");
  needRadio("w_tt");const T=radio("w_tt")==="tester";
  if(T){["w_bt","w_st","w_ct","w_rp"].forEach(id=>req(id,!!$(id).value));needRadio("w_lo");if(!$("w_specrow").hidden)req("w_spec",$("w_spec").value.trim().length>=3);}
  ["w_ocv","w_crank","w_volt"].forEach(id=>req(id,numv(id)!=null));needRadio("w_bms");
  const ts=tests();if(ts.bad.length&&!first)first=$("w_testmsg");
  PHK.forEach(k=>req("w_ph_"+k,!!PHS[k]));
  bad($("w_ok"),!$("w_ok").checked);
  if(first){first.scrollIntoView({block:"center",behavior:"smooth"});if(first.focus)first.focus({preventScroll:true});return;}
  const v=id=>$(id).value.trim(),mv=VEH[+$("w_model").value];
  const payload={serial:SN.sn,serial_source:SRC,replaces:radio("w_rep")==="yes"?v("w_repref"):"",country:$("w_country").value,city:v("w_city"),
    seller:v("w_seller"),seller_branch:v("w_branch"),seller_contact:v("w_scontact"),invoice_no:v("w_inv"),invoice_date:idate,
    fitter_company:v("w_fco"),fitter_technician:v("w_ftech"),fitted_at:fat.toISOString(),
    name:v("w_name"),phone:v("w_phone"),email:em,company:v("w_co"),use_type:radio("w_use"),
    vehicle_make:MAKES[mv[0]],vehicle_model:mv[1],vehicle_years:mv[2]||"",vehicle_year:$("w_year").value,engine_fuel:$("w_fuel").value,engine_litres:$("w_litres").value,
    reg_no:v("w_reg"),chassis_no:v("w_vin"),odometer:$("w_odo").value.replace(/[\s,.]/g,""),odometer_unit:radio("w_odou"),start_stop:radio("w_ss"),
    tester_type:radio("w_tt"),battery_test:T?$("w_bt").value:"",ocv:String(numv("w_ocv")),starting_test:T?$("w_st").value:"",cranking_voltage:String(numv("w_crank")),
    charging_test:T?$("w_ct").value:"",charging_voltage:String(numv("w_volt")),ripple:T?$("w_rp").value:"",loads_on:$("w_lo_row").hidden?"":radio("w_lo"),maker_spec:$("w_specrow").hidden?"":v("w_spec"),
    bms:radio("w_bms"),terms:"accepted",botcheck:$("w_bot").value,page:location.pathname+location.search};
  btn.disabled=true;ready.classList.remove("show");
  try{const photos={},photo_times={};for(let n=0;n<PHK.length;n++){const k=PHK[n];btn.textContent="Uploading photo "+(n+1)+" of "+PHK.length+"…";photos[k]=await upload(k);photo_times[k]=PHS[k].taken.toISOString();}
    payload.photos=photos;payload.photo_times=photo_times;btn.textContent="Registering…";
    const j=await rpc("stravik_fitment_register",{payload});
    const b=BAT&&BAT[j.pn],cov=cover(j),wa=payload.phone.replace(/\D/g,"").replace(/^00/,"");
    const text=["Stravik battery warranty","Registration number: "+j.ref,"Battery: "+j.pn+(b?" "+b.desc:"")+", serial "+j.serial,"Fitted: "+stamp(fat),
      "Cover: "+cov+(j.replaces?" (replacement of "+j.replaces+": the remaining cover of the original battery)":""),
      "Claims: return the battery with the warranty card to the point of sale or the fitment centre within 30 days of the problem appearing.","Terms: "+SITE+"/warranty/battery/terms/"].join("\n");
    f.querySelectorAll(":scope > div:not(.ready), :scope > p").forEach(el=>el.hidden=true);
    ready.innerHTML=`<b>Fitment registered.</b><br>Registration number <b>${esc(j.ref)}</b> for Stravik ${esc(j.pn)}${b?" ("+esc(b.desc)+")":""}, serial ${esc(j.serial)}.<br>`+
      `Cover: <b>${esc(cov)}</b>${j.replaces?`, the remaining cover of ${esc(j.replaces)}`:""}.<br>`+
      `Send the registration number to the customer on WhatsApp, and hand over the completed warranty card.`+
      `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px"><a class="btn gold" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Send on WhatsApp</a><a class="btn line" href="/warranty/battery/">Register another fitment</a></div>`;
    ready.classList.add("show");ready.scrollIntoView({block:"center",behavior:"smooth"});
  }catch(e){ready.innerHTML=`<b>The fitment wasn't registered.</b> ${esc(e.message||"Check your connection and try again.")}`;ready.classList.add("show");ready.scrollIntoView({block:"center",behavior:"smooth"});}
  finally{btn.disabled=false;btn.textContent="Register fitment";}
});
})();
