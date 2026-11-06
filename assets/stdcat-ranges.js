// Brings brakes, steering & suspension, shock absorbers, filters, gas springs and batteries onto the standard
// catalogue page (assets/stdcat.js), so every range has the same layout. Each range keeps its own data file and
// publish step; a converter here turns it into the standard shape:
//   { makes:[...], parts:[{ pn, t, d, s:{spec:value}, oe:[...], xr:[...], ap:[[make index, model, years]] }] }
// The old addresses (#/brakes, #/steering, #/brakes/brake-pads, ...) are forwarded to the new pages, so every
// existing link keeps working. Find a part and the part pages still use their own code for these ranges.
// Load after catalog.js and stdcat.js, before app.js.
(function(){
"use strict";
if(!window.StdCat||!StdCat.register)return;
const lc=s=>String(s||"").toLowerCase();
const slug=t=>lc(t).replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const tc=m=>lc(m).replace(/(^|[\s/(-])[a-z]/g,c=>c.toUpperCase());
const ssCase=t=>{t=String(t||"").replace(/[A-Z]{3,}/g,w=>w.toLowerCase());return t.charAt(0).toUpperCase()+t.slice(1);};
const years=y=>String(y||"").trim().replace(/\s*>\s*$/,"–").replace(/^(\d{4})\s*-\s*(\d{4})?$/,(m,a,b)=>a+"–"+(b||""));
const join=a=>a.filter(Boolean).join(", ");
// one make list per range; makes that share a display name are merged
function makes(){const list=[],ix={};return {list,add:n=>{if(!(n in ix)){ix[n]=list.length;list.push(n);}return ix[n];}};}
const withCode=(model,code)=>model?model+(code?" ("+code+")":""):null;
const crumbs=(name,href)=>[["Our products","#/products"],[name,href]];

// ---------------------------------------------------------------- brakes
// brakes.json parts: [Stravik no, type, position, size, disc type, external no, [OE], [WVA], [[make, model, years, position, note]]]
const BRT={};BR_TYPES.forEach(t=>BRT[t[0]]=t);
const BR_NOTVEH=new Set(BR_BRANDS.concat(["COMMERCIAL VEHICLES","IMPORT"]));
const brMake=m=>BR_MKL[m]||MKL[m]||tc(m);
const BRAKES={
  icon:"disc",title:"Brakes",tab:"Brake catalogue",one:"brake part",many:"brake parts",cat:"Brakes",data:"/brakes.json",
  crumbs:crumbs("Braking systems","#/products/braking-system"),hero:"/assets/img/braking-box.webp",
  lead:"Brake pads, discs, shoes and commercial vehicle pads. Find the right Stravik part by Stravik, external, OE or WVA number, size or vehicle.",
  placeholder:"Stravik, external, OE or WVA no., size, or vehicle (e.g. Corolla)",
  filters:[{k:"Part type",h:"Part type",any:"All part types",order:BR_TYPES.map(t=>t[1])},
    {k:"Position",h:"Position",any:"Front and rear",order:["Front","Rear","Front or rear","Front left","Front right"]},
    {k:"Disc type",h:"Disc type",any:"Any",order:["Vented","Solid","With bearing"]}],
  facts:d=>[[d.n.items,"brake parts"],[d.n.apps,"vehicle applications"],[d.n.makes,"vehicle makes"]],
  title1:i=>i.s["Part type"],
  specLine:s=>join([s["Part type"],lc(s["Position"]),s["Size"],lc(s["Disc type"])]),
  specs:[["Part type","Part type"],["Position","Position"],["Size","Size"],["Disc type","Disc type"],["External no.","External no."],["Also fits","Also fits"]],
  adapt(raw){const M=makes();
    const parts=raw.parts.map(p=>{const [pn,t,pos,sz,dt,k,oe,wva,apps]=p,s={"Part type":(BRT[t]||[])[1]||"Brake part"},ap=[],also=[];
      if(pos)s["Position"]=pos;if(sz)s["Size"]=sz;if(dt)s["Disc type"]=dt;if(k)s["External no."]=k;
      (apps||[]).forEach(a=>{const mk=raw.makes[a[0]];
        if(BR_NOTVEH.has(mk))also.push(mk==="COMMERCIAL VEHICLES"||mk==="IMPORT"?tc(a[1]||mk):[brMake(mk),a[1]].filter(Boolean).join(" "));
        else ap.push([M.add(brMake(mk)),a[1]||null,years(a[2])]);});
      if(also.length)s["Also fits"]=[...new Set(also)].join(", ");
      return {pn,t,d:"",s,oe:oe||[],xr:(wva||[]).map(w=>"WVA "+w),ap};});
    return {makes:M.list,parts};}
};

// ---------------------------------------------------------------- steering & suspension
// steering-suspension.json parts: [Stravik no, type, CTR no, [old CTR], position, [OE], hidden OE count, [[make, vehicle, model code, years]]]
const SST={};SS_TYPES.forEach(t=>SST[t[0]]=t);
const STEERING={
  icon:"ball",title:"Steering & suspension",tab:"Steering & suspension catalogue",one:"part",many:"parts",cat:"Steering & Suspension",data:"/steering-suspension.json",
  crumbs:crumbs("Steering & suspension","#/products/steering-suspension"),hero:"/assets/img/ss-box.webp",
  lead:"Ball joints, tie rod ends, rack ends, control arms, stabiliser links, bushes and mounts. Find the right Stravik part by Stravik, CTR or OE number, or vehicle.",
  placeholder:"Stravik, CTR or OE no., or vehicle and model code (e.g. Hilux KUN25)",
  filters:[{k:"Part type",h:"Part type",any:"All part types",order:SS_TYPES.map(t=>t[1])},
    {k:"Group",h:"Group",any:"All groups",order:["Suspension","Steering","Mountings"]},
    {k:"Position",h:"Position",any:"Any position"}],
  facts:d=>[[d.n.items,"parts"],[d.n.apps,"vehicle applications"],[d.n.makes,"vehicle makes"]],
  title1:i=>i.s["Part type"],
  specLine:s=>join([s["Part type"],lc(s["Position"])]),
  specs:[["Part type","Part type"],["Group","Group"],["Position","Position"]],
  adapt(raw){const M=makes(),name=ix=>{const m=raw.makes[ix];const n=Array.isArray(m)?m[0]:m;return MKL[n]||tc(n);};
    const parts=raw.parts.map(p=>{const [pn,t,ctr,old,pos,oe,,apps]=p,T=SST[t]||[],s={"Part type":T[1]||"Part"};
      if(T[3])s["Group"]=T[3];if(pos)s["Position"]=ssCase(pos);
      return {pn,t,d:"",s,oe:oe||[],xr:[ctr].concat(old||[]).filter(Boolean).map(x=>"CTR "+x),
        ap:(apps||[]).map(a=>[M.add(name(a[0])),withCode(a[1],a[2]),years(a[3])])};});
    return {makes:M.list,parts};}
};

// ---------------------------------------------------------------- shock absorbers
// shock-absorbers.json parts: [Stravik no, type, description, position, fitting position, damper type, system, upper mount,
//   lower mount, supplied with, external no, availability, new, [OE], [[make, model, model code, years, position]]]
const SAT={};SA_TYPES.forEach(t=>SAT[t[0]]=t);
const SHOCKS={
  icon:"shock",title:"Shock absorbers",tab:"Shock absorber catalogue",one:"part",many:"parts",cat:"Shock Absorbers",data:"/shock-absorbers.json",
  crumbs:crumbs("Shock absorbers","#/products/shock-absorbers"),
  lead:"MacPherson struts, shock absorbers, strut cartridges and dampers, matched to OE fit. Find the right Stravik part by Stravik, external or OE number, or vehicle.",
  placeholder:"Stravik, external or OE no., or vehicle and model code (e.g. Corolla ZZE121)",
  filters:[{k:"Part type",h:"Part type",any:"All part types",order:SA_TYPES.map(t=>t[1])},
    {k:"Position",h:"Position",any:"Any position",order:["Front","Front left","Front right","Rear"]},
    {k:"Damper type",h:"Damper",any:"Any",order:["Gas pressure","Oil pressure"]},
    {k:"System",h:"System",any:"Any",order:["Twin-tube","Monotube"]}],
  facts:d=>[[d.n.items,"parts"],[d.n.apps,"vehicle applications"],[d.n.makes,"vehicle makes"]],
  title1:i=>i.s["Part type"],
  specLine:s=>join([s["Part type"],lc(s["Position"]),lc(s["Damper type"]),lc(s["System"])]),
  specs:[["Part type","Part type"],["Position","Position"],["Damper type","Damper type"],["System","System"],["Upper mount","Upper mount"],
    ["Lower mount","Lower mount"],["Supplied with","Supplied with"],["External no.","External no."],["Availability","Availability"]],
  adapt(raw){const M=makes(),name=ix=>{const m=raw.makes[ix];return MKL[m]||tc(m);};
    const parts=raw.parts.map(p=>{const t=p[1],s={"Part type":(SAT[t]||[])[1]||"Shock absorber"};
      [["Position",p[3]&&ssCase(p[3])],["Damper type",p[5]],["System",p[6]],["Upper mount",p[7]],["Lower mount",p[8]],["Supplied with",p[9]],
        ["External no.",p[10]],["Availability",p[11]]].forEach(([k,v])=>{if(v)s[k]=v;});
      return {pn:p[0],t,d:"",s,oe:p[13]||[],xr:[],ap:(p[14]||[]).map(a=>[M.add(name(a[0])),withCode(a[1],a[2]),years(a[3])])};});
    return {makes:M.list,parts};}
};

// ---------------------------------------------------------------- filters
// filters.json items: { pn, t, d (description), n:[OE / reference numbers], mk:[makes], mo (models), y (years), e (engine), s (size) }
const FILTERS={
  icon:"f_oil",title:"Filters",tab:"Filter catalogue",one:"filter",many:"filters",cat:"Filters",data:"/filters.json",
  crumbs:crumbs("Filters","#/products/filters"),oeTitle:"OE and reference numbers",
  partUrl:i=>"/filter/"+encodeURIComponent(i.pn)+"/",
  lead:"Air, oil, fuel and cabin filters, filter kits and coolant filters. Find the right Stravik filter by Stravik, OE or cross-reference number, or vehicle.",
  placeholder:"Stravik, OE or cross-reference no., vehicle or engine (e.g. Hilux 2.5 TD)",
  filters:[{k:"Filter type",h:"Filter type",any:"All filters"}],
  facts:d=>[[d.n.items,"filters"],[new Set(d.items.map(i=>i.s["Filter type"])).size,"filter types"],[d.n.makes,"vehicle makes"]],
  title1:i=>i.s["Filter type"],
  // the final filter descriptions already start with the type ("Oil filter, spin-on – H 72 × OD 66 mm"): show them as they are
  specLine:s=>{const d=s["Description"]||"";return /filter/i.test(d.slice(0,40))?join([d,s["Engine"]]):join([s["Filter type"],d&&lc(d)!==lc(s["Filter type"])?lc(d):"",s["Engine"]]);},
  specs:[["Filter type","Filter type"],["Description","Description"],["Engine","Engine"],["Size","Size"]],
  adapt(raw){const M=makes(),T={};(raw.types||[]).forEach(t=>T[t[0]]=t);
    FILTERS.filters[0].order=(raw.types||[]).map(t=>t[3]);
    const parts=raw.items.map(i=>{const s={"Filter type":(T[i.t]||[])[3]||"Filter"};
      if(i.d)s["Description"]=i.d;if(i.e)s["Engine"]=i.e;if(i.s)s["Size"]=i.s;
      return {pn:i.pn,t:i.t,d:"",s,oe:i.n||[],xr:[],ap:(i.mk||[]).map(m=>[M.add(m),i.mo||null,years(i.y)])};});
    return {makes:M.list,parts};}
};

// ---------------------------------------------------------------- gas springs
// gas-springs.json parts: [Stravik no, type, extended length, stroke, force N, rod Ø, body Ø, position, [OE], [cross-references], [[make, model, years, position, note]]]
const GST={};GS_TYPES.forEach(t=>GST[t[0]]=t);
const gsShort=t=>((GST[t]||[])[1]||"Gas spring").replace(/ gas spring$/i,"");
const GAS={
  icon:"sa_gas",title:"Gas springs",tab:"Gas spring catalogue",one:"gas spring",many:"gas springs",cat:"Gas Springs",data:"/gas-springs.json",
  crumbs:crumbs("Shock absorbers","#/products/shock-absorbers"),hero:"/assets/img/gas-springs-hero.svg",
  lead:"Gas springs for boots, tailgates, bonnets and rear windows, matched to OE length, stroke and force. Search by Stravik, OE or cross-reference number, vehicle, or size (e.g. 373 mm).",
  placeholder:"Stravik, OE or cross-reference no., vehicle, or length (e.g. 373 mm)",
  filters:[{k:"Fitting",h:"Fitting",any:"All fittings",order:GS_TYPES.map(t=>t[1].replace(/ gas spring$/i,""))},
    {k:"Rod Ø",h:"Rod Ø",any:"Any",sort:"num"},{k:"Body Ø",h:"Body Ø",any:"Any",sort:"num"}],
  facts:d=>[[d.n.items,"gas springs"],[d.n.apps,"vehicle applications"],[d.n.makes,"vehicle makes"]],
  title1:i=>i.s["Fitting"]+" gas spring",
  specLine:s=>join([s["Extended length"]&&s["Extended length"]+" long",s["Stroke"]&&s["Stroke"]+" stroke",s["Force"]]),
  specs:[["Fitting","Fitting"],["Position","Position"],["Extended length","Extended length"],["Stroke","Stroke"],["Force","Force"],["Rod Ø","Rod Ø"],["Body Ø","Body Ø"]],
  adapt(raw){const M=makes();
    const parts=raw.parts.map(p=>{const [pn,t,len,stroke,force,rod,body,pos,oe,xr,apps]=p,s={"Fitting":gsShort(t)};
      if(pos)s["Position"]=pos;if(len)s["Extended length"]=len+" mm";if(stroke)s["Stroke"]=stroke+" mm";if(force)s["Force"]=force+" N";
      if(rod)s["Rod Ø"]=rod+" mm";if(body)s["Body Ø"]=body+" mm";
      return {pn,t,d:"",s,oe:oe||[],xr:xr||[],ap:(apps||[]).map(a=>[M.add(raw.makes[a[0]]),a[1]||null,years(a[2])])};});
    return {makes:M.list,parts};}
};

// ---------------------------------------------------------------- register, and forward the old addresses
const RANGES=[
  ["brakes","brake-catalogue",BRAKES,"Part type",BR_TYPES.map(t=>[slug(t[2]),t[1]])],
  ["steering","steering-catalogue",STEERING,"Part type",SS_TYPES.map(t=>[slug(t[2]),t[1]])],
  ["shock-absorbers","shock-absorber-catalogue",SHOCKS,"Part type",SA_TYPES.map(t=>[slug(t[2]),t[1]])],
  ["filters","filter-catalogue",FILTERS,"Filter type",[["air-filters","Air filter"],["oil-filters","Oil filter"],["fuel-filters","Fuel filter"],["cabin-filters","Cabin filter"],
    ["filter-kits","Filter kit"],["coolant-filters","Coolant filter"],["filter-housings","Oil filter housing"]]],
  ["gas-springs","gas-spring-catalogue",GAS,"Fitting",GS_TYPES.map(t=>[t[3],t[1].replace(/ gas spring$/i,"")])]];
const MOVED={};
RANGES.forEach(([old,id,c,key,subs])=>{StdCat.register(id,c);MOVED[old]={id,key,subs:Object.fromEntries(subs)};});
// batteries have their own page, the battery e-catalogue (/batteries/, assets/ecat.js): old battery addresses open it
const BAT_OLD={"batteries":1,"battery-catalogue":1};
function batForward(parts,qs){
  const old=new URLSearchParams(qs||""),p=new URLSearchParams(),sub=parts[1]?decodeURIComponent(parts[1]):"";
  const T=BAT_TYPES.find(t=>slug(t[2])===sub||t[1]===old.get("f.Battery type"));if(T)p.set("type",T[0]);
  if(old.get("q"))p.set("q",old.get("q"));if(old.get("series"))p.set("series",old.get("series"));
  if(/^SV[A-Z0-9]{6}$/i.test(sub))p.set("pn",sub.toUpperCase());
  location.replace("/batteries/catalogue/"+(p.toString()?"?"+p.toString():""));
}
function forward(){
  const [path,qs]=location.hash.replace(/^#/,"").split("?"),parts=path.split("/").filter(Boolean),m=MOVED[parts[0]];
  if(BAT_OLD[parts[0]]){batForward(parts,qs);return;}
  if(!m)return;
  const old=new URLSearchParams(qs||""),p=new URLSearchParams();
  ["q","p"].forEach(k=>{if(old.get(k))p.set(k,old.get(k));});
  const v=parts[1]&&m.subs[decodeURIComponent(parts[1])];if(v)p.set("f."+m.key,v);
  history.replaceState(null,"","#/"+m.id+(p.toString()?"?"+p.toString():""));
}
// runs before the app's own router (this file loads first), which then opens the standard page
addEventListener("hashchange",forward);forward();
})();
