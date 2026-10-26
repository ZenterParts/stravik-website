const SS_IMG="/assets/img/ss-box.webp";
const CATALOG = [
 { id:"braking-system", name:"Braking System", img:"/assets/img/braking-box.webp",
   intro:"Everything between the pedal and the wheel: friction parts, hydraulics, electronic control and the parking brake.",
   types:[
   { name:"Friction & Stopping Components", points:["Matched to OE dimensions and mounting points","Friction materials chosen for the vehicle's weight and use","Supplied ready to fit, with hardware where the part needs it"], subs:[
     ["Brake Pads","pad","The friction material that clamps the disc to slow the car. Available in ceramic, semi-metallic and low-metallic compounds so you can match the pad to how the vehicle is driven.","Squealing, grinding, or less than 3 mm of friction material left",0,"pads"],
     ["Brake Discs (Rotors)","disc","The spinning surface the pads grip.","Pedal vibration, deep scoring, or thickness below the minimum stamped on the disc"],
     ["Brake Calipers","caliper","Houses the pistons that push the pads against the disc.","Car pulls to one side, uneven pad wear, or fluid on the inside of the wheel"],
     ["Brake Shoes","shoe","Curved friction shoes for drum brakes, common on the rear axle of bakkies, LDVs and entry-level hatchbacks.","Handbrake travels too far, scraping from the rear, or lining worn to the rivets"],
     ["Brake Drums","drum","The cast housing that the shoes press against.","Pulsing when braking lightly, cracks, or diameter beyond the service limit"],
     ["Brake Pad Wear Sensors","sensor","Electrical sensors that switch on the dashboard warning when pads are nearly worn.","Always renew when fitting new pads on vehicles that use them",1],
     ["Brake Disc Hardware Kit","kit","Anti-rattle clips, shims and guide pin parts that keep disc pads sliding freely and quietly.","Pads rattle, stick in the carrier, or wear unevenly",1],
     ["Drum Brake Hardware Kit","spring","Return springs, hold-down pins and adjusters for drum brakes. Springs lose tension with heat, so fit a new kit with new shoes.","Shoes drag, adjuster seized, or springs stretched or rusted",1],
     ["Brake Lining","shoe","Friction lining material for relining shoes on commercial and heavy-duty drum applications.","Lining thin, glazed, cracked or contaminated with oil",1]
   ]},
   { name:"Hydraulic System Components", points:["Seals compatible with DOT 3 and DOT 4 fluid","Threads and port sizes to OE specification","Pressure-tested before packing"], subs:[
     ["Brake Master Cylinder","cylinder","Turns pedal effort into hydraulic pressure for the whole system.","Pedal sinks slowly to the floor or fluid level drops with no visible leak"],
     ["Brake Booster","booster","Vacuum servo that multiplies pedal force so the car stops with normal effort.","Hard pedal, or a hissing sound when you press the brake"],
     ["Wheel Cylinder","cylinder","Pushes drum brake shoes outward when the pedal is pressed.","Fluid on the inside of the drum or on the tyre wall",1],
     ["Brake Lines","line","Rigid metal pipes that carry fluid along the chassis to each wheel.","Rust, kinks or weeping at the fittings"],
     ["Brake Hose (Flexible)","hose","Reinforced flexible hoses that let the wheels steer and move with the suspension while holding pressure.","Cracks, bulges when the pedal is pressed, or a spongy pedal",1],
     ["Brake Fluid Reservoir","reservoir","The translucent tank on the master cylinder.","Cracked body, brittle mounting, or a cap that no longer seals"],
     ["Brake Caliper Repair Kit / Seals","kit","Piston seals, dust boots and guide sleeves to rebuild a caliper that is otherwise sound.","Torn dust boot, sticking piston, or minor fluid seepage",1],
     ["Brake Proportioning Valve","valve","Balances pressure between front and rear so the rear wheels don't lock first, especially in loaded bakkies.","Rear wheels lock early, or the car is unstable under hard braking",1]
   ]},
   { name:"Electronic Control Components", points:["Plug-and-play connectors matched to the vehicle harness","Signal output matched to the OE control unit","Sealed against water and road grime"], subs:[
     ["ABS Sensor","sensor","Reads wheel speed so the ABS can stop the wheels locking.","ABS or traction warning light, or ABS pulsing at low speed"],
     ["ABS Control Module","module","The hydraulic unit and controller that modulates pressure at each wheel during an ABS stop.","Stored ABS module faults or a pump that runs constantly",1],
     ["Brake Pressure Sensor","sensor","Reports brake line pressure to the stability and ABS systems.","Stability warnings or brake-pressure fault codes",1],
     ["ESC / ESP Sensor","module","Yaw-rate and steering-angle sensing that lets the stability control correct a skid.","ESC light stays on, or the system cuts in on straight roads",1]
   ]},
   { name:"Parking Brake Components", points:["Cable lengths and end fittings to OE pattern","Corrosion-protected inner and outer cables","Tested for holding force on a slope"], subs:[
     ["Handbrake Cable","cable","Links the lever to the rear brakes.","Lever pulls up too far, cable frayed, or brake doesn't release"],
     ["Parking Brake Lever / Mechanism","lever","The lever assembly with ratchet and release button inside the cabin.","Ratchet slips, button sticks, or the lever won't stay up",1],
     ["Electronic Parking Brake Actuator","module","Motor unit mounted on the rear caliper for vehicles with a switch-operated parking brake.","Parking brake fault message or grinding when it applies",1],
     ["Parking Brake Shoe","shoe","Small shoes inside the rear disc hub (drum-in-hat) that do the parking work on many SUVs and bakkies.","Vehicle rolls with the parking brake on",1]
   ]},
   { name:"Brake Hardware & Accessories", isNew:1, points:["Bolt patterns and offsets to OE","Plated or coated against rust","Supplied with fixings where required"], subs:[
     ["Caliper Bracket","bracket","The carrier that holds the pads and bolts the caliper to the hub.","Seized slide pins, stripped threads, or heavy corrosion",1],
     ["Brake Dust Shields / Splash Guards","shield","Backing plates that keep water, stones and dust off the disc.","Bent, rusted through, or scraping on the disc",1],
     ["Brake Bleed Nipples","nipple","Bleed screws for calipers and wheel cylinders, in the common thread sizes.","Rounded, seized, or snapped during bleeding",1]
   ]}
 ]},
 { id:"shock-absorbers", name:"Shock Absorbers", img:SS_IMG,
   intro:"Dampers that keep the tyres on the road by controlling how quickly the springs compress and rebound.",
   types:[
   { name:"Shock Absorbers", points:[], subs:[
     ["Shock Absorbers","shock","Control how quickly the springs compress and rebound, keeping the tyres in contact with the road.","Bouncing after bumps, nose-dive under braking, or oil on the body"]
   ]}
 ]}
];
const PADS = [
 {key:"ceramic", img:"/assets/img/braking-box.webp", name:"Ceramic", line:"Premium performance", best:"Everyday cars, sedans and SUVs where drivers want clean wheels and quiet stops.", feats:["Advanced ceramic formula","Ultra low dust","Quiet braking","High heat resistance"]},
 {key:"semi", img:"/assets/img/pads-semi.webp", name:"Semi-metallic", line:"High performance friction", best:"Bakkies, towing, LDVs and heavier vehicles that brake hard and often.", feats:["Strong stopping power","Heat-resistant compound","Heavy-duty durability","Consistent pedal feel"]},
 {key:"low", img:"/assets/img/pads-low.webp", name:"Low-metallic", line:"Quiet and rotor-friendly", best:"Compact cars and city driving where comfort and disc life matter most.", feats:["Ultra quiet operation","Rotor-friendly formula","Reduced dust output","Smooth everyday comfort"]}
];

const ICONS = {
 pad:'<path d="M8 40c2-15 12-22 24-22s22 7 24 22l-5 5c-6-5-12-7-19-7s-13 2-19 7z"/><path d="M14 34c4-6 10-9 18-9s14 3 18 9"/><circle cx="12" cy="42" r="1.6"/><circle cx="52" cy="42" r="1.6"/>',
 disc:'<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="3"/><path d="M32 16.5v.1M45.5 26v.1M40 45v.1M24 45v.1M18.5 26v.1" stroke-width="4" stroke-linecap="round"/>',
 caliper:'<path d="M14 36a20 20 0 0 1 36 0" stroke-dasharray="3 4"/><path d="M18 14h28a6 6 0 0 1 6 6v10H40v-6H24v6H12V20a6 6 0 0 1 6-6z"/><circle cx="20" cy="22" r="2"/><circle cx="44" cy="22" r="2"/><path d="M12 30v20M52 30v20"/>',
 shoe:'<path d="M10 40a22 22 0 0 1 44 0"/><path d="M16 40a16 16 0 0 1 32 0"/><path d="M10 40h6M48 40h6"/><path d="M20 26l-3-3M44 26l3-3"/>',
 drum:'<ellipse cx="32" cy="18" rx="20" ry="7"/><path d="M12 18v26c0 4 9 7 20 7s20-3 20-7V18"/><ellipse cx="32" cy="18" rx="7" ry="2.5"/><path d="M12 30c0 4 9 7 20 7s20-3 20-7"/>',
 sensor:'<rect x="8" y="26" width="14" height="12" rx="2"/><path d="M22 32h6c6 0 6-12 12-12s6 24 12 24h4"/><path d="M56 40v8M8 30H4M8 34H4"/>',
 kit:'<path d="M12 14h16v8H20v28h-8z"/><path d="M36 14h16v8h-8v28h-8z"/><path d="M26 34h12"/>',
 spring:'<path d="M20 8h24M20 56h24"/><path d="M20 12l24 6-24 6 24 6-24 6 24 6-24 6 24 6"/>',
 cylinder:'<rect x="10" y="24" width="38" height="16" rx="3"/><path d="M48 28h8v8h-8M22 24v-8h8v8M36 24v-6h6v6M10 32H4"/>',
 booster:'<circle cx="28" cy="32" r="20"/><circle cx="28" cy="32" r="12"/><path d="M48 32h10M8 32H2M28 12v-4M28 56v-4"/>',
 line:'<path d="M6 44h10l6-24h10l6 24h10l6-24h6"/><rect x="2" y="41" width="6" height="6"/><rect x="56" y="17" width="6" height="6"/>',
 hose:'<path d="M14 18c20 0 16 28 36 28" stroke-width="5"/><rect x="6" y="14" width="10" height="8" rx="1"/><rect x="48" y="42" width="10" height="8" rx="1"/>',
 reservoir:'<path d="M16 20h32v28a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z"/><rect x="26" y="10" width="12" height="10" rx="2"/><path d="M22 30h8M22 42h8"/>',
 valve:'<rect x="18" y="18" width="28" height="28" rx="3"/><path d="M18 26H8M18 38H8M46 32h10M32 18V8"/><circle cx="32" cy="32" r="5"/>',
 module:'<rect x="10" y="16" width="36" height="30" rx="3"/><path d="M46 24h8v14h-8M18 46v6M26 46v6M34 46v6"/><path d="M18 26h20M18 34h12"/>',
 cable:'<path d="M8 20h8c14 0 10 24 24 24h16"/><circle cx="6" cy="20" r="3"/><path d="M56 40v8M16 16v8M40 40v8"/>',
 lever:'<path d="M10 50h30"/><path d="M18 50l22-30" stroke-width="5"/><rect x="36" y="12" width="12" height="10" rx="3" transform="rotate(-36 42 17)"/><circle cx="22" cy="44" r="3"/>',
 shield:'<path d="M8 36a24 24 0 0 1 48 0z"/><circle cx="32" cy="36" r="8"/><circle cx="20" cy="28" r="1.6"/><circle cx="44" cy="28" r="1.6"/>',
 nipple:'<path d="M26 10h12v8H26zM28 18h8v6h-8z"/><path d="M24 24h16v6H24z"/><path d="M28 30v22h8V30M28 36h8M28 42h8M28 48h8"/>',
 bracket:'<path d="M10 18h44v10H46v22h-8V28H26v22h-8V28h-8z"/><circle cx="22" cy="23" r="2"/><circle cx="42" cy="23" r="2"/>',
 shock:'<circle cx="32" cy="8" r="4"/><path d="M32 12v14"/><rect x="24" y="26" width="16" height="24" rx="2"/><circle cx="32" cy="56" r="4"/><path d="M28 26v-4h8v4"/>',
 strut:'<path d="M20 8h24l-3 6H23z"/><path d="M32 14v12"/><path d="M20 18l24 5-24 5 24 5-24 5"/><rect x="26" y="36" width="12" height="18" rx="2"/><path d="M26 44H14v8"/>',
 mount:'<ellipse cx="32" cy="34" rx="22" ry="9"/><ellipse cx="32" cy="34" rx="8" ry="3"/><path d="M18 30V18M46 30V18M32 25V14"/>',
 bump:'<path d="M22 10h20M24 10v6h16v-6M22 18h20l-2 8H24zM24 28h16l-2 8H26zM26 38h12l-2 8h-8z"/><path d="M32 46v10"/>',
 rack:'<path d="M4 32h56" stroke-width="5"/><rect x="14" y="24" width="18" height="16" rx="3"/><path d="M36 26v12M40 26v12M44 26v12"/><path d="M23 24V12"/><circle cx="4" cy="32" r="3"/><circle cx="60" cy="32" r="3"/>',
 column:'<circle cx="22" cy="22" r="14"/><circle cx="22" cy="22" r="4"/><path d="M22 18V8M18 24l-9 6M26 24l9 6"/><path d="M26 26l28 28" stroke-width="4"/>',
 shaft:'<path d="M8 12l14 14M42 38l14 14" stroke-width="4"/><rect x="20" y="20" width="10" height="10" transform="rotate(45 25 25)"/><rect x="34" y="34" width="10" height="10" transform="rotate(45 39 39)"/><path d="M29 29l6 6" stroke-width="4"/>',
 pump:'<circle cx="22" cy="34" r="14"/><circle cx="22" cy="34" r="4"/><rect x="36" y="22" width="20" height="24" rx="3"/><path d="M46 22v-8M56 34h4"/>',
 tierod:'<path d="M4 34h34" stroke-width="5"/><path d="M38 28h8a8 8 0 0 1 0 16h-8z"/><circle cx="46" cy="36" r="3"/><path d="M50 30l8-10"/><path d="M8 30v8M14 30v8"/>',
 arm:'<path d="M10 18l40 14L10 46" stroke-width="5" stroke-linejoin="round"/><circle cx="10" cy="18" r="5"/><circle cx="10" cy="46" r="5"/><circle cx="52" cy="32" r="5"/>',
 ball:'<circle cx="32" cy="36" r="12"/><path d="M28 24V12h8v12"/><path d="M26 8h12v4H26z"/><path d="M20 38H6v8h14M44 38h14v8H44"/>',
 bar:'<path d="M8 12v18c0 8 6 12 14 12h20c8 0 14-4 14-12V12" stroke-width="5"/><rect x="18" y="38" width="8" height="8" rx="1"/><rect x="38" y="38" width="8" height="8" rx="1"/>',
 link:'<circle cx="32" cy="10" r="5"/><path d="M32 15v34" stroke-width="5"/><circle cx="32" cy="54" r="5"/><path d="M26 6l-4-4M38 58l4 4"/>',
 bushing:'<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="6"/><path d="M32 10v8M32 46v8"/>',
 camber:'<circle cx="32" cy="32" r="14"/><circle cx="36" cy="32" r="4"/><path d="M6 32h12M46 32h12"/><path d="M32 12v6"/>'
};

Object.assign(ICONS,{
 f_air:'<rect x="7" y="17" width="50" height="30" rx="3"/><path d="M12 22l4.5 20 4.5-20 4.5 20 4.5-20 4.5 20 4.5-20 4.5 20 4.5-20 4.5 20"/>',
 f_oil:'<path d="M20 12h24v7H20z"/><path d="M17 19h30v30a7 7 0 0 1-7 7H24a7 7 0 0 1-7-7z"/><path d="M17 28h30M23 35v14M29 35v14M35 35v14M41 35v14"/>',
 f_fuel:'<path d="M5 32h9M50 32h9"/><rect x="14" y="21" width="36" height="22" rx="7"/><path d="M24 21v22M40 21v22M29 27l6 10M35 27l-6 10"/>',
 f_cabin:'<rect x="9" y="11" width="46" height="42" rx="3"/><path d="M14 16l5 32 5-32 5 32 5-32 5 32 5-32 5 32"/>',
 f_kit:'<path d="M8 30h22v22H8z"/><path d="M12 34l3 14 3-14 3 14 3-14 3 14"/><path d="M38 14h16v5H38z"/><path d="M36 19h20v22a5 5 0 0 1-5 5H41a5 5 0 0 1-5-5z"/><path d="M36 26h20"/>',
 f_coolant:'<path d="M20 12h24v7H20z"/><path d="M17 19h30v30a7 7 0 0 1-7 7H24a7 7 0 0 1-7-7z"/><path d="M32 29c-5 6-7 9-7 12a7 7 0 0 0 14 0c0-3-2-6-7-12z"/>',
 f_housing:'<path d="M22 8h20v6H22z"/><path d="M18 14h28v10l-4 4v20a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6V28l-4-4z"/><path d="M10 34h8M46 34h8M10 30v8M54 30v8"/>'
});
const FICON={AFL:"f_air",OFL:"f_oil",FFL:"f_fuel",CFL:"f_cabin",FKT:"f_kit",CLF:"f_coolant",FHS:"f_housing"};
function icon(k){return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[k]||ICONS.kit)+'</svg>';}
// steering & suspension part types: code, one, many, group, icon
const SS_TYPES=[["BJ","Ball joint","Ball joints","Suspension","ball"],["TE","Tie rod end","Tie rod ends","Steering","tierod"],["RE","Rack end (inner tie rod)","Rack ends","Steering","rack"],["CA","Control arm","Control arms","Suspension","arm"],["SL","Stabiliser link","Stabiliser links","Suspension","link"],["BS","Bush","Bushes","Suspension","bushing"],["SM","Strut mount","Strut mounts","Mountings","mount"],["EM","Engine mount","Engine mounts","Mountings","mount"],["IA","Idler arm","Idler arms","Steering","arm"],["SR","Side rod","Side rods","Steering","tierod"],["DL","Drag link","Drag links","Steering","link"],["IS","Inner shaft","Inner shafts","Suspension","shaft"],["OS","Other steering parts","Other steering parts","Steering","column"]];
// vehicle make labels
const MKL={"TOYOTA":"Toyota","NISSAN":"Nissan","ISUZU":"Isuzu","MITSUBISHI":"Mitsubishi","MAZDA":"Mazda","SUZUKI":"Suzuki","SUBARU":"Subaru","DAIHATSU":"Daihatsu","HONDA":"Honda","BMW":"BMW","CHRYSLER":"Chrysler","FIAT / LADA":"Fiat / Lada","FORD":"Ford","GENERAL MOTORS":"General Motors","MERCEDES-BENZ":"Mercedes-Benz","PEUGEOT / CITROEN":"Peugeot / Citroën","RENAULT":"Renault","JAGUAR / LAND ROVER":"Jaguar / Land Rover","VOLKSWAGEN":"Volkswagen","VOLVO":"Volvo","PERODUA / PROTON":"Perodua / Proton","CHINESE AND OTHER MAKES":"Chinese and other makes","HYUNDAI":"Hyundai","KIA":"Kia","GM KOREA / DAEWOO":"GM Korea / Daewoo","SSANGYONG (KGM)":"SsangYong (KGM)","RENAULT SAMSUNG":"Renault Samsung"};
