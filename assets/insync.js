// The DP World InSync portal (/insync/). DP World InSync picks, packs, invoices and delivers Stravik orders.
//   - Orders: every order Stravik has released (after its sales, finance and supply chain approvals), with the store,
//     the delivery details and the parts. DP World InSync fills in its reference, the invoice, the waybill and the
//     dispatch and delivery dates; the order's status follows what is filled in.
//   - Sales by store: orders, units and value per store, grouped by the store's group (Autobarn).
// Who may sign in: the emails in the table stravik_partner_users (admin site > Orders > DP World InSync users).
// Data: Supabase functions stravik_dpw_orders() and stravik_dpw_update(), which only answer those people.
// Uses the same sign-in as customer accounts (assets/dealer.js); styles from assets/autobarn.css.
(function(){
"use strict";
try{localStorage.setItem("stravik-portal","/insync/");}catch(e){}   // the main site then shows a link back to this page
const app=document.getElementById("app"),NAME="DP World InSync";
const SD=()=>window.StravikDealer;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>Number(n||0).toLocaleString("en-US");
const money=v=>v==null||v===""?"":"R"+Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const day=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
const must=r=>{if(r.error)throw r.error;return r.data;};
const toast=m=>window.STV&&STV.toast(m);
const STATUS={"With DPW":"To pick and invoice","Invoiced":"Invoiced","Dispatched":"Dispatched","Delivered":"Delivered"};
const st=s=>STATUS[s]||s;
const msg=e=>{const m=String(e&&(e.message||e.error_description)||e);
  if(/invalid login credentials/i.test(m))return "The email or password is wrong.";
  if(/rate limit/i.test(m))return "Too many attempts. Wait a few minutes and try again.";
  if(/confirm/i.test(m))return "Confirm your email first: open the link we sent you.";
  if(/already registered/i.test(m))return "This email already has a password. Sign in, or choose “Forgot your password?”.";
  return m;};
const head=(title,lead)=>`<div class="pagehead ab-head"><div class="wrap"><div class="eyebrow-d">Stravik for ${esc(NAME)}</div><h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:""}</div></div>`;
let C=null;

// ---------------------------------------------------------------------------------------------------------------
// sign in, or create a password the first time
// ---------------------------------------------------------------------------------------------------------------
function signIn(mode){
  mode=mode||"in";
  document.title=NAME+" login | Stravik";
  app.innerHTML=head(NAME,"Stravik orders released for pick, pack, invoice and delivery.")+
  `<div class="wrap ab-in">
    <form class="enq ab-card" id="isf" novalidate>
      <h2 class="full">${mode==="new"?"Create your password":"Sign in"}</h2>
      <div class="full"><label for="ise">Email</label><input id="ise" type="email" autocomplete="email" required></div>
      <div class="full"><label for="isp">Password</label><input id="isp" type="password" autocomplete="${mode==="new"?"new-password":"current-password"}" minlength="8" required>${mode==="new"?`<small class="dhint">At least 8 characters.</small>`:""}</div>
      <div class="full ab-row"><button class="btn gold" type="submit" id="isgo">${mode==="new"?"Create password":"Sign in"}</button>${mode==="in"?`<button type="button" class="linkbtn" id="isforgot">Forgot your password?</button>`:""}</div>
      <div class="full"><button type="button" class="linkbtn" id="isswap">${mode==="new"?"I already have a password":"First time here? Create your password"}</button></div>
      <div class="status" id="isst" role="alert"></div>
    </form>
    <aside class="ab-side">
      <h2>What you can do here</h2>
      <ul><li>See every Stravik order released to you, with the store, the delivery address and the parts</li><li>Enter your reference, the invoice, the waybill and the dispatch and delivery dates</li><li>See orders and invoiced value per store</li></ul>
      <p>Only people Stravik has added for ${esc(NAME)} can sign in. Ask your Stravik contact to add your email address.</p>
    </aside>
  </div>`;
  const f=app.querySelector("#isf"),stE=f.querySelector("#isst"),btn=f.querySelector("#isgo");
  const say=(h,good)=>{stE.innerHTML=h;stE.classList.add("show");stE.classList.toggle("ok",!!good);};
  f.querySelector("#isswap").onclick=()=>signIn(mode==="new"?"in":"new");
  const fg=f.querySelector("#isforgot");
  if(fg)fg.onclick=async()=>{
    const e=f.querySelector("#ise").value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter your email address first, then choose “Forgot your password?” again.");f.querySelector("#ise").focus();return;}
    const r=await C.auth.resetPasswordForEmail(e,{redirectTo:location.origin+"/#/dealer/password"});
    say(r.error?esc(msg(r.error)):"If there is an account for <b>"+esc(e)+"</b>, we have emailed a link to choose a new password. Come back to this page afterwards.",!r.error);
  };
  f.addEventListener("submit",async ev=>{
    ev.preventDefault();
    const e=f.querySelector("#ise").value.trim(),p=f.querySelector("#isp").value;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){say("Enter your work email address.");return;}
    if(p.length<8){say("The password needs at least 8 characters.");return;}
    btn.disabled=true;stE.classList.remove("show");
    try{
      if(mode==="new"){
        const r=await C.auth.signUp({email:e,password:p,options:{emailRedirectTo:location.origin+"/insync/"}});if(r.error)throw r.error;
        if(r.data.session)return start();
        say("We have sent a confirmation link to <b>"+esc(e)+"</b>. Open it, then sign in here.",true);btn.disabled=false;
      }else{const r=await C.auth.signInWithPassword({email:e,password:p});if(r.error)throw r.error;start();}
    }catch(err){say(esc(msg(err)));btn.disabled=false;}
  });
}
async function signOut(){try{await C.auth.signOut();}catch(e){}try{await SD().refresh();}catch(e){}signIn();}
function note(html){
  app.innerHTML=head(NAME)+`<div class="wrap ab-note"><div class="dnote">${html}</div><p><button class="btn line" type="button" id="isout">Sign out</button></p></div>`;
  app.querySelector("#isout").onclick=signOut;
}

// ---------------------------------------------------------------------------------------------------------------
// the portal
// ---------------------------------------------------------------------------------------------------------------
const H={data:null,tab:"orders",status:"open",store:"",text:"",open:new Set()};
const TABS=[["orders","Orders"],["stores","Sales by store"]];
const P=()=>app.querySelector("#abpane");
const empty=(t,p)=>`<div class="ab-empty"><h3>${esc(t)}</h3><p>${p}</p></div>`;

function portal(email){
  document.title=NAME+" | Stravik";
  const t=(location.hash||"").replace(/^#\/?/,"");if(TABS.some(x=>x[0]===t))H.tab=t;
  const me=H.data.me;
  app.innerHTML=head(NAME,"Stravik orders released to you for pick, pack, invoice and delivery."+(me.test?" <b>Test view:</b> you see test orders only.":""))+
  `<section class="ab-stats" aria-label="Orders in numbers"><div class="wrap" id="abstats"></div></section>
   <div class="wrap ab-dash">
     <div class="ab-tabs" role="tablist">${TABS.map(x=>`<button type="button" role="tab" data-tab="${x[0]}" aria-selected="${x[0]===H.tab}">${esc(x[1])}</button>`).join("")}</div>
     <div id="abpane"></div>
     <p class="dhint ab-foot">Signed in as ${esc(email)}. <button type="button" class="linkbtn" id="isout">Sign out</button></p>
   </div>`;
  app.querySelector("#isout").onclick=signOut;
  app.querySelectorAll(".ab-tabs button").forEach(b=>b.onclick=()=>{H.tab=b.dataset.tab;history.replaceState(null,"","#"+H.tab);
    app.querySelectorAll(".ab-tabs button").forEach(x=>x.setAttribute("aria-selected",x===b));pane();});
  stats();pane();
}
function stats(){
  const os=H.data.orders,c=s=>os.filter(o=>o.status===s).length;
  const cells=[[num(c("With DPW")),"to pick and invoice"],[num(c("Invoiced")),"invoiced, to dispatch"],[num(c("Dispatched")),"on the way"],[num(c("Delivered")),"delivered"],[money(os.reduce((a,o)=>a+Number(o.invoice_amount||0),0)),"invoiced incl. VAT"]];
  app.querySelector("#abstats").innerHTML=cells.map(x=>`<div class="ab-stat"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");
}
function pane(){(H.tab==="stores"?paneStores:paneOrders)();}
function orders(){
  const q=H.text.trim().toLowerCase();
  return H.data.orders.filter(o=>(H.status==="all"||(H.status==="open"?o.status!=="Delivered":o.status===H.status))&&(!H.store||o.store===H.store)&&
    (!q||[o.order_no,o.po_ref,o.store,o.dpw_ref,o.invoice_no,o.waybill_no,o.customer_code].concat((o.items||[]).map(i=>i.pn)).join(" ").toLowerCase().indexOf(q)>=0));
}

function paneOrders(){
  const os=orders(),names=Array.from(new Set(H.data.orders.map(o=>o.store))).sort();
  const SF=[["open","Not delivered yet"],["With DPW","To pick and invoice"],["Invoiced","Invoiced, to dispatch"],["Dispatched","On the way"],["Delivered","Delivered"],["all","All orders"]];
  P().innerHTML=`<div class="ab-filters">
      <label>Show<select id="fstat">${SF.map(s=>`<option value="${esc(s[0])}"${s[0]===H.status?" selected":""}>${esc(s[1])}</option>`).join("")}</select></label>
      <label>Store<select id="fstore"><option value="">All stores</option>${names.map(n=>`<option${n===H.store?" selected":""}>${esc(n)}</option>`).join("")}</select></label>
      <label class="grow">Search<input id="ftext" type="search" placeholder="Order, PO, invoice, waybill or part number" value="${esc(H.text)}"></label>
      <button type="button" class="btn line small" id="oxls">Download</button></div>`+
    (!H.data.orders.length?empty("No orders released yet","When Stravik approves a store's order it appears here, and you get an email with the order lines."):
     !os.length?empty("No orders match","Change what is shown, the store or the search."):
    `<div class="ab-scroll"><table class="ab-table" id="otable"><thead><tr><th>Released</th><th>Order</th><th>Store</th><th class="n">Lines</th><th class="n">Units</th><th class="n">Total incl. VAT</th><th>Your reference</th><th>Status</th></tr></thead><tbody>${os.map(o=>{
      const open=H.open.has(o.order_no);
      return `<tr class="ab-o${open?" open":""}" data-o="${esc(o.order_no)}" tabindex="0" aria-expanded="${open}"><td>${esc(day(o.released_at))}</td><td class="no">${esc(o.order_no)}</td><td>${esc(o.store)}${o.group?`<div class="ab-dim">${esc(o.group)}</div>`:""}</td><td class="n">${num(o.lines)}</td><td class="n">${num(o.units)}</td><td class="n">${esc(money(o.total))}</td><td>${esc(o.dpw_ref||"")}${o.invoice_no?`<div class="ab-dim">Inv. ${esc(o.invoice_no)}</div>`:""}</td><td><span class="ab-pill ${o.status==="Delivered"?"ok":""}">${esc(st(o.status))}</span></td></tr>`+(open?detail(o):"");
    }).join("")}</tbody></table></div>`);
  const g=id=>P().querySelector(id);
  g("#fstat").onchange=e=>{H.status=e.target.value;paneOrders();};
  g("#fstore").onchange=e=>{H.store=e.target.value;paneOrders();};
  let tm=0;g("#ftext").oninput=e=>{H.text=e.target.value;clearTimeout(tm);tm=setTimeout(()=>{const pos=e.target.selectionStart;paneOrders();const n=g("#ftext");n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}},250);};
  g("#oxls").onclick=()=>xlsx(os);
  const tb=g("#otable");if(!tb)return;
  tb.onclick=e=>{
    const sv=e.target.closest("[data-save]");if(sv)return save(sv);
    const tot=e.target.closest("[data-total]");if(tot){const o=H.data.orders.find(x=>x.order_no===tot.dataset.total),i=tb.querySelector(`[data-f="${tot.dataset.total}"] [name=invoice_amount]`);if(o&&i)i.value=Number(o.total).toFixed(2);return;}
    const one=e.target.closest("[data-xls]");if(one)return xlsx(H.data.orders.filter(x=>x.order_no===one.dataset.xls));
    if(e.target.closest(".ab-od"))return;
    const tr=e.target.closest("tr.ab-o");if(tr){const k=tr.dataset.o;if(H.open.has(k))H.open.delete(k);else H.open.add(k);paneOrders();}
  };
  tb.onkeydown=e=>{if(e.key!=="Enter"&&e.key!==" ")return;const tr=e.target.closest("tr.ab-o");if(!tr||e.target!==tr)return;e.preventDefault();const k=tr.dataset.o;if(H.open.has(k))H.open.delete(k);else H.open.add(k);paneOrders();const n=P().querySelector(`tr.ab-o[data-o="${k}"]`);if(n)n.focus();};
}
function detail(o){
  const f=(label,name,type,val,extra)=>`<label>${esc(label)}<input name="${name}" type="${type||"text"}" value="${esc(val==null?"":val)}"${extra||""}></label>`;
  return `<tr class="ab-od"><td colspan="8">
    <div class="is-grid">
      <div><h3>Deliver to</h3><p><b>${esc(o.store)}</b>${o.company&&o.company!==o.store?"<br>"+esc(o.company):""}<br>${esc(o.delivery_address||"")}</p>
        <p>${esc(o.contact_name||"")}${o.contact_phone?", "+esc(o.contact_phone):""}${o.receiving_hours?"<br>Receiving hours: "+esc(o.receiving_hours):""}${o.truck_access?"<br>Truck access: "+esc(o.truck_access):""}${o.notes?"<br>Store's note: "+esc(o.notes):""}</p></div>
      <div><h3>Invoice to</h3><p>${esc(o.company||o.store)}${o.customer_code?"<br>Customer code: <b>"+esc(o.customer_code)+"</b>":""}${o.vat_no?"<br>VAT no.: "+esc(o.vat_no):""}${o.reg_no?"<br>Reg. no.: "+esc(o.reg_no):""}${o.accounts_email?"<br>Accounts: "+esc(o.accounts_email):""}${o.po_ref?"<br>Store PO: <b>"+esc(o.po_ref)+"</b>":""}</p>
        <p><button type="button" class="btn line small" data-xls="${esc(o.order_no)}">Download this order</button></p></div>
    </div>
    <table class="ab-table lines"><thead><tr><th>#</th><th>Part</th><th>Description</th><th class="n">Qty</th><th class="n">Price excl. VAT</th><th class="n">Total excl. VAT</th></tr></thead><tbody>${(o.items||[]).map(i=>`<tr><td>${i.line}</td><td class="no">${esc(i.pn)}</td><td>${esc(i.description||"")}</td><td class="n">${num(i.qty)}</td><td class="n">${esc(money(i.price))}</td><td class="n">${esc(money(i.total))}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="5">Subtotal excl. VAT</td><td class="n">${esc(money(o.subtotal))}</td></tr><tr><td colspan="5">VAT ${Math.round(Number(o.vat_rate||0)*100)}%</td><td class="n">${esc(money(o.vat_amount))}</td></tr><tr><td colspan="5"><b>Total incl. VAT</b></td><td class="n"><b>${esc(money(o.total))}</b></td></tr></tfoot></table>
    <div class="is-form" data-f="${esc(o.order_no)}"><h3>Your side of the order</h3>
      <div class="is-fields">${f("Your reference","dpw_ref","text",o.dpw_ref)}${f("Invoice number","invoice_no","text",o.invoice_no)}${f("Invoice date","invoice_date","date",o.invoice_date)}
        <label>Invoice amount incl. VAT<input name="invoice_amount" inputmode="decimal" value="${esc(o.invoice_amount==null?"":Number(o.invoice_amount).toFixed(2))}"><button type="button" class="linkbtn" data-total="${esc(o.order_no)}">Use the order total</button></label>
        ${f("Dispatched on","dispatched_at","date",o.dispatched_at)}${f("Waybill number","waybill_no","text",o.waybill_no)}${f("Delivered on","delivered_at","date",o.delivered_at)}
        <label class="wide">Notes for Stravik<textarea name="dpw_notes" rows="2">${esc(o.dpw_notes||"")}</textarea></label></div>
      <p class="dhint">The status follows what you fill in: an invoice number makes the order Invoiced, a dispatch date Dispatched, a delivery date Delivered.</p>
      <div class="ab-row"><button type="button" class="btn gold" data-save="${esc(o.order_no)}">Save</button></div></div>
  </td></tr>`;
}
async function save(btn){
  const no=btn.dataset.save,box=P().querySelector(`[data-f="${no}"]`),p={order_no:no};
  box.querySelectorAll("[name]").forEach(i=>{p[i.name]=i.value.trim();});
  p.invoice_amount=p.invoice_amount.replace(/^R\s*/i,"").replace(/\s/g,"").replace(",",".");
  btn.disabled=true;btn.textContent="Saving…";
  try{const r=must(await C.rpc("stravik_dpw_update",{p}));H.data=must(await C.rpc("stravik_dpw_orders"));stats();paneOrders();toast(no+" saved: "+st(r.status));}
  catch(e){toast(msg(e));btn.disabled=false;btn.textContent="Save";}
}

// ---- Sales by store: what each store ordered and what was invoiced, grouped by the store's group
function paneStores(){
  const m=new Map();
  H.data.orders.forEach(o=>{let s=m.get(o.store);if(!s)m.set(o.store,s={store:o.store,group:o.group||"",code:o.customer_code||"",city:o.city||"",n:0,u:0,v:0,inv:0,invN:0,del:0,last:null});
    s.n++;s.u+=o.units||0;s.v+=Number(o.subtotal||0);if(o.invoice_no){s.invN++;s.inv+=Number(o.invoice_amount||0);}if(o.status==="Delivered")s.del++;if(!s.last||o.released_at>s.last)s.last=o.released_at;});
  const rows=Array.from(m.values()).sort((a,b)=>a.group.localeCompare(b.group)||b.v-a.v);
  P().innerHTML=!rows.length?empty("No sales yet","Orders released to you are added up here per store."):
   `<div class="ab-filters"><p class="ab-lead" style="margin:0;flex:1 1 300px">Every order released to you, added up per store. Value is the order value excl. VAT; invoiced is what you entered, incl. VAT.</p><button type="button" class="btn line small" id="sxls">Download</button></div>
    <div class="ab-scroll"><table class="ab-table"><thead><tr><th>Store</th><th>Group</th><th>Customer code</th><th>Town</th><th class="n">Orders</th><th class="n">Units</th><th class="n">Order value excl. VAT</th><th class="n">Invoices</th><th class="n">Invoiced incl. VAT</th><th class="n">Delivered</th><th>Last order</th></tr></thead><tbody>${rows.map(s=>
      `<tr><td><b>${esc(s.store)}</b></td><td>${esc(s.group)}</td><td>${esc(s.code)}</td><td>${esc(s.city)}</td><td class="n">${num(s.n)}</td><td class="n">${num(s.u)}</td><td class="n">${esc(money(s.v))}</td><td class="n">${num(s.invN)}</td><td class="n">${s.inv?esc(money(s.inv)):""}</td><td class="n">${num(s.del)}</td><td>${esc(day(s.last))}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="4"><b>All stores</b></td><td class="n"><b>${num(rows.reduce((a,s)=>a+s.n,0))}</b></td><td class="n"><b>${num(rows.reduce((a,s)=>a+s.u,0))}</b></td><td class="n"><b>${esc(money(rows.reduce((a,s)=>a+s.v,0)))}</b></td><td class="n"><b>${num(rows.reduce((a,s)=>a+s.invN,0))}</b></td><td class="n"><b>${esc(money(rows.reduce((a,s)=>a+s.inv,0)))}</b></td><td class="n"><b>${num(rows.reduce((a,s)=>a+s.del,0))}</b></td><td></td></tr></tfoot></table></div>`;
  const b=P().querySelector("#sxls");if(b)b.onclick=()=>xlsx(H.data.orders,rows);
}

// ---- Excel (the library is only fetched when someone asks for a file)
let XP=null;
const excel=()=>XP||(XP=new Promise((res,rej)=>{if(window.ExcelJS)return res(window.ExcelJS);const s=document.createElement("script");s.src="/admin/vendor/exceljs.min.js";s.onload=()=>res(window.ExcelJS);s.onerror=()=>{XP=null;rej(new Error("The Excel library did not load. Check your connection and try again."));};document.head.appendChild(s);}));
async function xlsx(os,stores){
  try{toast("Preparing the file…");
    const X=await excel(),wb=new X.Workbook();
    const add=(name,headRow,rows,widths)=>{const ws=wb.addWorksheet(name);ws.addRow(headRow).font={bold:true};rows.forEach(r=>ws.addRow(r));widths.forEach((w,i)=>{ws.getColumn(i+1).width=w;});ws.views=[{state:"frozen",ySplit:1}];
      headRow.forEach((h,i)=>{if(/price|value|vat|total|amount|invoiced/i.test(h))ws.getColumn(i+1).numFmt="#,##0.00";});};
    if(stores)add("Sales by store",["Store","Group","Customer code","Town","Orders","Units","Order value excl. VAT","Invoices","Invoiced incl. VAT","Delivered","Last order"],stores.map(s=>[s.store,s.group,s.code,s.city,s.n,s.u,s.v,s.invN,s.inv,s.del,day(s.last)]),[34,16,16,18,8,8,18,9,18,10,14]);
    add("Orders",["Order","Released","Status","Store","Group","Customer code","Store PO","Deliver to","Contact","Phone","Lines","Units","Subtotal excl. VAT","VAT","Total incl. VAT","Your reference","Invoice number","Invoice date","Invoice amount","Dispatched","Waybill","Delivered"],
      os.map(o=>[o.order_no,day(o.released_at),st(o.status),o.store,o.group||"",o.customer_code||"",o.po_ref||"",o.delivery_address||"",o.contact_name||"",o.contact_phone||"",o.lines,o.units,Number(o.subtotal||0),Number(o.vat_amount||0),Number(o.total||0),o.dpw_ref||"",o.invoice_no||"",o.invoice_date||"",o.invoice_amount==null?"":Number(o.invoice_amount),o.dispatched_at||"",o.waybill_no||"",o.delivered_at||""]),
      [18,13,20,32,14,14,14,44,20,16,7,7,14,12,14,16,16,13,14,13,16,13]);
    add("Order lines",["Order","Store","Line","Part","Description","Qty","Price excl. VAT","Total excl. VAT"],os.flatMap(o=>(o.items||[]).map(i=>[o.order_no,o.store,i.line,i.pn,i.description||"",i.qty,Number(i.price||0),Number(i.total||0)])),[18,32,6,14,52,8,14,14]);
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=(os.length===1&&!stores?"Stravik_order_"+os[0].order_no:"Stravik_orders_DP_World_InSync")+".xlsx";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){toast(msg(e));}
}

// ---------------------------------------------------------------------------------------------------------------
async function start(){
  app.innerHTML=head(NAME,"Loading…")+`<div class="wrap ab-note"></div>`;
  try{C=await SD().client();}catch(e){app.querySelector(".ab-note").innerHTML=`<p class="dnote bad">${esc(msg(e))}. Check your connection and reload the page.</p>`;return;}
  const {data:{session}}=await C.auth.getSession();
  if(!session)return signIn();
  try{
    H.data=must(await C.rpc("stravik_dpw_orders"));
    if(!H.data)return note(`You are signed in as <b>${esc(session.user.email)}</b>, which is not on the ${esc(NAME)} list. Ask your Stravik contact to add this email address, then reload the page.`);
    portal(session.user.email);
  }catch(e){note(esc(msg(e)));}
}
start();
})();
