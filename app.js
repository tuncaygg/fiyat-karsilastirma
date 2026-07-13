/* ================================================================
   TEDARIKÇI FIYAT KARŞILAŞTIRMA UYGULAMASI
   ================================================================ */

const STORAGE_KEY = 'satin-alm-records';
const SUPPLIER_STORAGE_KEY = 'satin-alm-suppliers';
const UNITS = ['kg','adet','kutu','kova','paket','torba','litre','çift','takım','metre'];

let records = [];
let knownSuppliers = [];
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
      </div>
      <div class="card">
        <div class="card-title">Tedarikçiler</div>
        <div id="suppliersWrap"></div>
        <div class="row" style="margin-top:0.5rem">
          <input type="text" id="supplierInput" placeholder="Tedarikçi adı" list="supplierDatalist" />
          <datalist id="supplierDatalist">${knownSuppliers.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
          <button class="btn btn-primary btn-sm w-auto" onclick="addSupplier()">Ekle</button>
        </div>
        ${knownSuppliers.filter(s=>!r.suppliers.includes(s)).length>0?`<div style="margin-top:0.5rem;font-size:0.8rem;color:#6b7280">Kayıtlı tedarikçiler:</div><div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.25rem">${knownSuppliers.filter(s=>!r.suppliers.includes(s)).map(s=>`<span class="supplier-tag" style="cursor:pointer" onclick="addSupplierByName('${esc(s)}')">+ ${esc(s)}</span>`).join('')}</div>`:''}
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
    <select class="item-unit" style="flex:0 0 auto;width:80px">
      ${UNITS.map(u=>`<option value="${u}"${item&&item.unit===u?' selected':''}>${u}</option>`).join('')}
    </select>
    <button class="btn btn-danger btn-sm w-auto" onclick="this.closest('.item-row').remove();saveFormItems()" style="padding:0.35rem 0.5rem">&times;</button>`;
  wrap.appendChild(div);
  div.querySelectorAll('input,select').forEach(el=>el.onchange=saveFormItems);
  if(!item)saveFormItems();
}

function saveFormItems(){
  const r=getRecord();
  if(!r)return;
  const rows=document.querySelectorAll('.item-row');
  if(!rows.length)return; // form visible değilse temizleme
  r.items=[];
  rows.forEach(row=>{
    const name=row.querySelector('.item-name').value.trim();
    const unit=row.querySelector('.item-unit').value;
    if(name)r.items.push({name,unit});
  });
  saveData();
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

/* ================================================================
   FIYAT GIRIŞİ
   ================================================================ */
function goToPrices(id){
  currentRecordId=id;
  const r=getRecord();
  if(!r)return;
  saveFormItems();
  if(!r.prices)r.prices={};
  r.items.forEach(item=>{
    if(!r.prices[item.name])r.prices[item.name]={};
    r.suppliers.forEach(s=>{
      if(r.prices[item.name][s]===undefined)r.prices[item.name][s]='';
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
              <th style="min-width:50px">Birim</th>
              ${r.suppliers.map(s=>`<th>${esc(s)}</th>`).join('')}
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

function renderPriceRows(r){
  const tbody=$('priceBody');
  if(!tbody)return;
  tbody.innerHTML=r.items.map(item=>{
    const prices=r.prices[item.name]||{};
    const vals=r.suppliers.map(s=>prices[s]);
    const nums=vals.filter(v=>v!==''&&v!==undefined&&v!==null).map(Number);
    const best=nums.length>0?Math.min(...nums):null;
    const bestSupplier=best!==null?r.suppliers[vals.findIndex(v=>Number(v)===best)]:null;
    return `<tr id="row-${esc(item.name)}">
      <td><strong>${esc(item.name)}</strong></td>
      <td style="color:#6b7280">${item.unit}</td>
      ${r.suppliers.map(s=>{
        const val=prices[s];
        const isBest=val!==''&&val!==undefined&&best!==null&&Number(val)===best;
        return `<td${isBest?' class="best"':''}><input type="number" step="0.01" min="0"
          data-item="${esc(item.name)}" data-supplier="${esc(s)}"
          value="${val!==undefined&&val!==''?val:''}"
          oninput="onPriceChange(this,'${esc(item.name)}','${esc(s)}')"
          placeholder="—" /></td>`;
      }).join('')}
      <td class="best-cell" data-item="${esc(item.name)}">${bestSupplier?fmtTL(best)+' <span class="best-badge">'+esc(bestSupplier)+'</span>':''}</td>
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
    const inputs=row.querySelectorAll('input[type="number"]');
    const nums=[];
    inputs.forEach(inp=>{const v=parseFloat(inp.value);if(!isNaN(v))nums.push(v)});
    const bestCell=row.querySelector('.best-cell');
    if(bestCell&&nums.length>0){
      const best=Math.min(...nums);
      const suppliers=r.suppliers;
      const vals=suppliers.map(s=>r.prices[iname]?.[s]);
      const idx=vals.findIndex(v=>Number(v)===best);
      bestCell.innerHTML=fmtTL(best)+' <span class="best-badge">'+esc(suppliers[idx])+'</span>';
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
    const prices=r.prices[item.name]||{};
    const entries=r.suppliers.map(s=>({supplier:s,price:prices[s]!==''&&prices[s]!==undefined?Number(prices[s]):null}));
    const valid=entries.filter(e=>e.price!==null);
    const bestPrice=valid.length>0?Math.min(...valid.map(e=>e.price)):null;
    const bestSuppliers=bestPrice!==null?valid.filter(e=>e.price===bestPrice).map(e=>e.supplier):[];
    return {item,bestPrice,bestSuppliers,entries};
  });

  const genelToplam=r.suppliers.map(s=>{
    const toplam=bestData.reduce((sum,{entries})=>{
      const e=entries.find(x=>x.supplier===s);
      return sum+(e&&e.price!==null?e.price:0);
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
              <th>Birim</th>
              ${r.suppliers.map(s=>`<th style="text-align:right">${esc(s)}<br><span style="font-weight:400;font-size:0.75rem;color:#6b7280">TL</span></th>`).join('')}
              <th style="text-align:right">En Uygun</th>
            </tr></thead>
            <tbody>
              ${bestData.map(({item,bestPrice,bestSuppliers,entries})=>`<tr${bestSuppliers.length>0?' class="best"':''}>
                <td><strong>${esc(item.name)}</strong></td>
                <td style="color:#6b7280">${item.unit}</td>
                ${entries.map(e=>`<td style="text-align:right${e.price===null?';color:#d1d5db':''}">${e.price!==null?fmtTL(e.price):'—'}</td>`).join('')}
                <td style="text-align:right;font-weight:700;color:#0d9488">${bestPrice!==null?fmtTL(bestPrice):'—'}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid #374151">
                <td colspan="2">Toplam</td>
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
renderHome();
