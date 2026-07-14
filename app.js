/* ================================================================
   TEDARIKÇI FIYAT KARŞILAŞTIRMA UYGULAMASI
   ================================================================ */

const STORAGE_KEY = 'satin-alm-records';
const SUPPLIER_STORAGE_KEY = 'satin-alm-suppliers';
const ITEM_STORAGE_KEY = 'satin-alm-items';
const UNITS = ['kg','adet','kutu','kova','paket','torba','litre','çift','takım','metre'];

let records = [];
let knownSuppliers = [];
let knownItems = [];
let currentRecordId = null;

/* ---- YÜKLE / KAYDET ---- */
function loadData(){
  try{const r=localStorage.getItem(STORAGE_KEY);if(r)records=JSON.parse(r)}catch(_){}
}
function saveData(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(records));
}
function loadSuppliers(){
  try{const r=localStorage.getItem(SUPPLIER_STORAGE_KEY);if(r)knownSuppliers=JSON.parse(r)}catch(_){}
}
function saveSuppliers(){
  localStorage.setItem(SUPPLIER_STORAGE_KEY,JSON.stringify(knownSuppliers));
}
function loadItems(){
  try{const r=localStorage.getItem(ITEM_STORAGE_KEY);if(r)knownItems=JSON.parse(r)}catch(_){}
}
function saveItems(){
  localStorage.setItem(ITEM_STORAGE_KEY,JSON.stringify(knownItems));
}

/* ---- YARDIMCI ---- */
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function $(id){return document.getElementById(id)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmtTL(n){return Number(n).toLocaleString('tr-TR',{minimumFractionDigits:2})+String.fromCharCode(160)+'TL'}
function today(){const d=new Date();return d.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function now(){return new Date().toLocaleString('tr-TR')}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=$(id);
  if(el){el.classList.add('active');currentView=id}
}

/* ================================================================
   ANA SAYFA
   ================================================================ */
function renderHome(){
  const app=$('app');
  app.innerHTML=`
    <div class="header">
      <h1>Satın Alma</h1>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="newRequest()">Yeni Talep</button>
      </div>
    </div>
    <div class="page active" id="page-home">
      ${records.length===0?'<div class="card" style="text-align:center;color:#9ca3af;padding:2rem">Henüz kayıt yok.<br>Yeni talep oluşturun.</div>'
      :`<ul class="card request-list">${records.slice().reverse().map(r=>`
        <li class="request-item">
          <div onclick="openRequest('${r.id}')" style="flex:1;cursor:pointer">
            <strong>${esc(r.title||'İsimsiz Talep')}</strong>
            <div class="request-date">${r.date} &middot; ${r.items?.length||0} ürün, ${r.suppliers?.length||0} tedarikçi</div>
          </div>
          <button class="btn btn-danger btn-sm w-auto" onclick="event.stopPropagation();deleteRecord('${r.id}')" style="padding:0.25rem 0.5rem">&times;</button>
        </li>`).join('')}</ul>`}
    </div>`;
  showPage('page-home');
}

/* ================================================================
   TALEP FORMU
   ================================================================ */
function newRequest(){newRequestWith(null)}
function newRequestWith(record){
  const r=record||{id:uid(),title:'',date:today(),dateISO:todayISO(),items:[],suppliers:[],prices:{},created:now()};
  if(!record)records.push(r);
  currentRecordId=r.id;
  saveData();
  renderRequestForm(r);
}

function renderRequestForm(r){
  const app=$('app');
  app.innerHTML=`
    <div class="header">
      <button class="btn btn-outline btn-sm" onclick="renderHome()">&larr; Geri</button>
      <h1>Talep Oluştur</h1>
      <button class="btn btn-success btn-sm" onclick="goToPrices('${r.id}')">Fiyatlara Geç &rarr;</button>
    </div>
    <div class="page active" id="page-form">
      <div class="card">
        <div class="row">
          <input type="text" id="reqTitle" placeholder="Talep adı (opsiyonel)" value="${esc(r.title)}" style="font-weight:600" />
          <input type="date" id="reqDate" value="${r.dateISO}" class="w-auto" style="flex:0 0 auto;width:auto" />
        </div>
      </div>
      <div class="card">
        <div class="card-title">Ürünler</div>
        <div id="itemsWrap"></div>
        <button class="btn btn-outline btn-sm" onclick="addItemRow()">+ Ürün Ekle</button>
        ${knownItems.filter(n=>!r.items.some(it=>it.name===n)).length>0?`
        <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
            <span style="font-size:0.8rem;color:#6b7280">Kayıtlı ürünler:</span>
            <button class="btn btn-outline btn-sm" style="font-size:0.7rem;padding:0.1rem 0.4rem" onclick="toggleMemEdit()">Düzenle</button>
          </div>
          <div id="knownItemsWrap" style="display:flex;flex-wrap:wrap;gap:0.25rem">
            ${knownItems.filter(n=>!r.items.some(it=>it.name===n)).map(n=>`<span class="mem-tag" data-name="${esc(n)}" onclick="addKnownItem('${esc(n)}')"><span class="mem-del" style="display:none" onclick="event.stopPropagation();removeKnownItem('${esc(n)}')">&times;</span> ${esc(n)}</span>`).join('')}
          </div>
        </div>`:''}
      </div>
      <div class="card">
        <div class="card-title">Tedarikçiler</div>
        <div id="suppliersWrap"></div>
        <div class="row" style="margin-top:0.5rem">
          <input type="text" id="supplierInput" placeholder="Tedarikçi adı" list="supplierDatalist" />
          <datalist id="supplierDatalist">${knownSuppliers.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
          <button class="btn btn-primary btn-sm w-auto" onclick="addSupplier()">Ekle</button>
        </div>
        ${knownSuppliers.filter(s=>!r.suppliers.includes(s)).length>0?`
        <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
            <span style="font-size:0.8rem;color:#6b7280">Kayıtlı tedarikçiler:</span>
            <button class="btn btn-outline btn-sm" style="font-size:0.7rem;padding:0.1rem 0.4rem" onclick="toggleMemEdit()">Düzenle</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.25rem">
            ${knownSuppliers.filter(s=>!r.suppliers.includes(s)).map(s=>`<span class="mem-tag sup" data-name="${esc(s)}" onclick="addSupplierByName('${esc(s)}')"><span class="mem-del" style="display:none" onclick="event.stopPropagation();removeKnownSupplier('${esc(s)}')">&times;</span> ${esc(s)}</span>`).join('')}
          </div>
        </div>`:''}
      </div>
      <div style="text-align:right;margin-top:1rem">
        <button class="btn btn-success" onclick="goToPrices('${r.id}')">Fiyatları Girmeye Başla &rarr;</button>
      </div>
    </div>`;
  showPage('page-form');
  r.items.forEach((item,i)=>addItemRow(item,i));
  r.suppliers.forEach(s=>renderSupplierTag(s));
  $('reqTitle').oninput=function(){r.title=this.value;saveData()};
  $('reqDate').onchange=function(){r.dateISO=this.value;const d=new Date(this.value+'T12:00:00');r.date=d.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});saveData()};
}

function addItemRow(item){
  const wrap=$('itemsWrap');
  const div=document.createElement('div');
  div.className='row item-row';
  div.style.marginBottom='0.4rem';
  div.innerHTML=`
    <input type="text" class="item-name" placeholder="Ürün adı" value="${item?esc(item.name):''}" />
    <span class="qty-ctrl" style="display:inline-flex;align-items:center;gap:0.15rem;flex:0 0 auto">
      <button type="button" class="btn btn-outline btn-sm qty-btn" style="padding:0.1rem 0.35rem;font-size:0.85rem;line-height:1">−</button>
      <span class="qty-val" style="min-width:1.3rem;text-align:center;font-weight:600;font-size:0.9rem">${item&&item.qty?item.qty:1}</span>
      <button type="button" class="btn btn-outline btn-sm qty-btn" style="padding:0.1rem 0.35rem;font-size:0.85rem;line-height:1">+</button>
    </span>
    <select class="item-unit" style="flex:0 0 auto;width:80px">
      ${UNITS.map(u=>`<option value="${u}"${item&&item.unit===u?' selected':''}>${u}</option>`).join('')}
    </select>
    <button class="btn btn-danger btn-sm w-auto" onclick="this.closest('.item-row').remove();saveFormItems()" style="padding:0.35rem 0.5rem">&times;</button>`;
  wrap.appendChild(div);
  div.querySelectorAll('input,select').forEach(el=>el.onchange=saveFormItems);
  div.querySelectorAll('.qty-btn').forEach(el=>el.onclick=function(){qtyChange(this,this.textContent==='−'?-1:1)});
  if(!item)saveFormItems();
}

function qtyChange(btn,delta){
  const span=btn.closest('.item-row').querySelector('.qty-val');
  let v=parseInt(span.textContent)||1;
  v=Math.max(1,v+delta);
  span.textContent=v;
  saveFormItems();
}
function saveFormItems(){
  const r=getRecord();
  if(!r)return;
  const rows=document.querySelectorAll('.item-row');
  if(!rows.length)return;
  r.items=[];
  rows.forEach(row=>{
    const name=row.querySelector('.item-name').value.trim();
    const unit=row.querySelector('.item-unit').value;
    const qty=parseInt(row.querySelector('.qty-val')?.textContent)||1;
    if(name){
      r.items.push({name,unit,qty});
      if(!knownItems.includes(name)){knownItems.push(name);saveItems()}
    }
  });
  saveData();
}

/* ---- İSKONTO ---- */
function setDiscount(name,val){
  const r=getRecord();
  if(!r)return;
  r.discounts[name]=parseFloat(val)||0;
  saveData();
  renderPriceRows(r);
}

/* ---- TEDARİKÇİ ---- */
function addToKnown(name){
  if(!knownSuppliers.includes(name)){knownSuppliers.push(name);saveSuppliers()}
}

function addSupplier(){
  const input=$('supplierInput');
  const name=input.value.trim();
  if(!name)return;
  const r=getRecord();
  if(!r)return;
  if(r.suppliers.includes(name)){input.value='';return}
  r.suppliers.push(name);
  addToKnown(name);
  saveData();
  renderSupplierTag(name);
  input.value='';
  input.focus();
}

function addSupplierByName(name){
  const r=getRecord();
  if(!r)return;
  if(r.suppliers.includes(name))return;
  r.suppliers.push(name);
  addToKnown(name);
  saveData();
  renderSupplierTag(name);
}

function renderSupplierTag(name){
  const wrap=$('suppliersWrap');
  const tag=document.createElement('span');
  tag.className='supplier-tag';
  tag.style.marginRight='0.3rem';tag.style.marginBottom='0.3rem';
  tag.style.display='inline-flex';tag.style.alignItems='center';tag.style.gap='0.3rem';
  tag.innerHTML=`${esc(name)} <span style="cursor:pointer;font-weight:700;opacity:0.5" onclick="removeSupplier('${esc(name)}');this.parentElement.remove()">&times;</span>`;
  wrap.appendChild(tag);
}

function removeSupplier(name){
  const r=getRecord();
  if(!r)return;
  r.suppliers=r.suppliers.filter(s=>s!==name);
  saveData();
}

function getRecord(){
  return records.find(r=>r.id===currentRecordId);
}
function deleteRecord(id){
  if(!confirm('Bu talebi silmek istediğinize emin misiniz?'))return;
  records=records.filter(r=>r.id!==id);
  if(currentRecordId===id)currentRecordId=null;
  saveData();
  renderHome();
}
function toggleMemEdit(){
  document.querySelectorAll('.mem-del').forEach(el=>{
    el.style.display=el.style.display==='inline'?'none':'inline';
  });
}
function addKnownItem(name){
  const r=getRecord();
  if(!r)return;
  if(r.items.some(it=>it.name===name))return;
  r.items.push({name,unit:'kg'});
  saveData();
  renderRequestForm(r);
}
function removeKnownItem(name){
  if(!confirm('"'+name+'" hafızadan silinsin mi?'))return;
  knownItems=knownItems.filter(n=>n!==name);
  saveItems();
  const r=getRecord();
  if(r)renderRequestForm(r);
}
function removeKnownSupplier(name){
  if(!confirm('"'+name+'" hafızadan silinsin mi?'))return;
  knownSuppliers=knownSuppliers.filter(s=>s!==name);
  saveSuppliers();
  const r=getRecord();
  if(r)renderRequestForm(r);
}

/* ================================================================
   FIYAT GIRIŞI
   ================================================================ */
function goToPrices(id){
  currentRecordId=id;
  const r=getRecord();
  if(!r)return;
  saveFormItems();
  if(!r.prices)r.prices={};
  if(!r.discounts)r.discounts={};
  r.items.forEach(item=>{
    if(!r.prices[item.name])r.prices[item.name]={};
    r.suppliers.forEach(s=>{
      if(r.prices[item.name][s]===undefined)r.prices[item.name][s]='';
      if(r.discounts[s]===undefined)r.discounts[s]=0;
    });
  });
  saveData();
  renderPrices(r);
}

function renderPrices(r){
  const app=$('app');
  app.innerHTML=`
    <div class="header">
      <button class="btn btn-outline btn-sm" onclick="renderRequestForm(getRecord())">&larr; Düzenle</button>
      <h1>Fiyat Karşılaştırma</h1>
      <div class="header-actions">
        <button class="btn btn-success btn-sm" onclick="showReport('${r.id}')">Rapor &rarr;</button>
      </div>
    </div>
    <div class="page active" id="page-prices">
      <div class="card" style="padding:0.5rem 1rem;margin-bottom:0.75rem">
        <span style="font-weight:600">${esc(r.title||'İsimsiz Talep')}</span>
        <span style="color:#6b7280;font-size:0.8rem;margin-left:0.5rem">${r.date}</span>
      </div>
      <div class="card" style="padding:0.75rem">
        <div class="table-wrap">
          <table id="priceTable">
            <thead><tr>
              <th style="min-width:120px">Ürün</th>
              <th style="min-width:35px">Adet</th>
              <th style="min-width:50px">Birim</th>
              ${r.suppliers.map(s=>`<th>${esc(s)}<br><input type="number" min="0" max="100" step="0.5" value="${r.discounts?.[s]||0}" onchange="setDiscount('${esc(s)}',this.value)" style="width:65px;font-size:0.75rem;padding:0.15rem 0.25rem;text-align:center;border-radius:4px;border:1px solid #d1d5db;margin-top:2px" placeholder="%" /></th>`).join('')}
              <th style="min-width:80px">En Uygun</th>
            </tr></thead>
            <tbody id="priceBody"></tbody>
          </table>
        </div>
        ${r.items.length===0?'<div style="text-align:center;color:#9ca3af;padding:1rem">Henüz ürün eklenmemiş</div>':''}
      </div>
    </div>`;
  showPage('page-prices');
  window._rid=r.id;
  renderPriceRows(r);
}

function effPrice(r,iname,sname){
  const raw=r.prices?.[iname]?.[sname];
  if(raw===''||raw===undefined||raw===null)return null;
  const p=Number(raw);
  if(isNaN(p))return null;
  const d=r.discounts?.[sname]||0;
  return d>0?p*(1-d/100):p;
}

function renderPriceRows(r){
  const tbody=$('priceBody');
  if(!tbody)return;
  tbody.innerHTML=r.items.map(item=>{
    const raw=r.prices[item.name]||{};
    const effs=r.suppliers.map(s=>effPrice(r,item.name,s));
    const nums=effs.filter(v=>v!==null);
    const best=nums.length>0?Math.min(...nums):null;
    const bestIdx=best!==null?effs.findIndex(v=>v===best):-1;
    const qty=item.qty||1;
    return `<tr id="row-${esc(item.name)}">
      <td><strong>${esc(item.name)}</strong></td>
      <td style="text-align:center;font-weight:600">${qty}</td>
      <td style="color:#6b7280">${item.unit}</td>
      ${r.suppliers.map((s,i)=>{
        const val=raw[s];
        const disc=r.discounts?.[s]||0;
        const isBest=i===bestIdx;
        return `<td${isBest?' class="best"':''} style="vertical-align:middle">
          <input type="number" step="0.01" min="0"
            data-item="${esc(item.name)}" data-supplier="${esc(s)}"
            value="${val!==undefined&&val!==''?val:''}"
            oninput="onPriceChange(this,'${esc(item.name)}','${esc(s)}')"
            placeholder="—" style="${disc>0?'margin-bottom:2px':''}" />
          ${disc>0&&effs[i]!==null?`<div style="font-size:0.7rem;color:#0d9488;font-weight:600">${fmtTL(effs[i])}</div>`:''}
        </td>`;
      }).join('')}
      <td class="best-cell" data-item="${esc(item.name)}">${best!==null?fmtTL(best)+' <span class="best-badge">'+esc(r.suppliers[bestIdx])+'</span>':''}</td>
    </tr>`;
  }).join('');
}

function onPriceChange(input,iname,sname){
  const r=getRecord();
  if(!r)return;
  if(!r.prices[iname])r.prices[iname]={};
  r.prices[iname][sname]=input.value;
  saveData();

  const row=input.closest('tr');
  if(row){
    const effs=r.suppliers.map(s=>effPrice(r,iname,s));
    const nums=effs.filter(v=>v!==null);
    const bestCell=row.querySelector('.best-cell');
    if(bestCell&&nums.length>0){
      const best=Math.min(...nums);
      const idx=effs.findIndex(v=>v===best);
      bestCell.innerHTML=fmtTL(best)+' <span class="best-badge">'+esc(r.suppliers[idx])+'</span>';
    }else if(bestCell)bestCell.innerHTML='';
  }
}

/* ================================================================
   RAPOR
   ================================================================ */
function showReport(id){
  currentRecordId=id;
  const r=getRecord();
  if(!r)return;

  const app=$('app');
  const bestData=r.items.map(item=>{
    const qty=item.qty||1;
    const entries=r.suppliers.map(s=>{
      const unitPrice=effPrice(r,item.name,s);
      return {supplier:s,unitPrice,total:unitPrice!==null?unitPrice*qty:null,disc:r.discounts?.[s]||0};
    });
    const valid=entries.filter(e=>e.total!==null);
    const bestTotal=valid.length>0?Math.min(...valid.map(e=>e.total)):null;
    const bestSuppliers=bestTotal!==null?valid.filter(e=>e.total===bestTotal).map(e=>e.supplier):[];
    return {item,bestTotal,bestSuppliers,entries,qty};
  });

  const genelToplam=r.suppliers.map(s=>{
    const toplam=bestData.reduce((sum,{entries})=>{
      const e=entries.find(x=>x.supplier===s);
      return sum+(e&&e.total!==null?e.total:0);
    },0);
    return {supplier:s,total:toplam};
  });

  app.innerHTML=`
    <div class="header no-print">
      <button class="btn btn-outline btn-sm" onclick="goToPrices(window._rid)">&larr; Fiyatlar</button>
      <h1>Karşılaştırma Raporu</h1>
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" onclick="window.print()">PDF / Yazdır</button>
        <button class="btn btn-outline btn-sm" onclick="renderHome()">Kapat</button>
      </div>
    </div>
    <div class="page active" id="page-report">
      <div class="card report-header" style="margin-bottom:0.5rem;padding:1rem 1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
          <div><strong style="font-size:1rem">${esc(r.title||'Fiyat Karşılaştırma Raporu')}</strong></div>
          <div style="font-size:0.85rem;color:#6b7280">Tarih: ${r.date}</div>
        </div>
        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <span style="font-size:0.8rem;color:#6b7280">Tedarikçiler:</span>
          ${r.suppliers.map(s=>`<span class="supplier-tag">${esc(s)}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:0.75rem">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th style="text-align:left">Ürün</th>
              <th style="text-align:center">Adet</th>
              <th>Birim</th>
              ${r.suppliers.map(s=>`<th style="text-align:right">${esc(s)}<br><span style="font-weight:400;font-size:0.75rem;color:#6b7280">TL</span></th>`).join('')}
              <th style="text-align:right">En Uygun</th>
            </tr></thead>
            <tbody>
              ${bestData.map(({item,bestTotal,bestSuppliers,entries,qty})=>`<tr${bestSuppliers.length>0?' class="best"':''}>
                <td><strong>${esc(item.name)}</strong></td>
                <td style="text-align:center">${qty}</td>
                <td style="color:#6b7280">${item.unit}</td>
                ${entries.map(e=>{
                  const isBest=e.total!==null&&e.total===bestTotal;
                  return `<td style="text-align:right${e.total===null?';color:#d1d5db':''}${isBest?';font-weight:700;font-size:0.95rem':''}">${e.total!==null?fmtTL(e.total):'—'}</td>`;
                }).join('')}
                <td style="text-align:right;font-weight:700;color:#0d9488">${bestTotal!==null?fmtTL(bestTotal):'—'}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid #374151">
                <td colspan="3">Toplam</td>
                ${genelToplam.map(t=>`<td style="text-align:right">${t.total>0?fmtTL(t.total):'—'}</td>`).join('')}
                <td style="text-align:right;color:#0d9488">${fmtTL(Math.min(...genelToplam.filter(t=>t.total>0).map(t=>t.total),Infinity))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>`;
  showPage('page-report');
  window._rid=r.id;
}

/* ================================================================
   GEÇMİŞTEN AÇMA
   ================================================================ */
function openRequest(id){
  currentRecordId=id;
  const r=getRecord();
  if(!r)return;
  if(r.prices&&Object.keys(r.prices).length>0)showReport(id);
  else renderRequestForm(r);
}

/* ================================================================
   BAŞLAT
   ================================================================ */
loadData();
loadSuppliers();
loadItems();
renderHome();
