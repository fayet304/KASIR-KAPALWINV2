// =====================================================================
// LOGIC APLIKASI KASIR
// Pengaturan (URL Apps Script, link CS, judul, logo) ada di config.js
// =====================================================================

let currentUser = null;
let rekeningData = [];
let selectedRekeningId = null;
let currentJenis = null;
let currentBank = null;
let heartbeatTimer = null;

// ---------- BRANDING (baca dari config.js) ----------
function renderBranding(){
  document.title = APP_TITLE;
  const el = document.getElementById('brand-mark');
  if(!el) return;
  if(APP_LOGO_URL){
    el.innerHTML = `<img src="${APP_LOGO_URL}" alt="${APP_TITLE}" class="brand-logo">${APP_TITLE}`;
  } else {
    el.textContent = `${APP_ICON} ${APP_TITLE}`;
  }
}
renderBranding();

async function callApi(action, payload={}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({action, payload})
  });
  return res.json();
}

function showToast(msg){
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}

function formatRp(n){
  return 'Rp ' + Number(n||0).toLocaleString('id-ID');
}

// format tampilan input jadi ada titik ribuan, dipanggil tiap user ngetik/paste
function formatNominalInput(val){
  const angka = String(val||'').replace(/[^0-9]/g,'');
  if(!angka) return '';
  return Number(angka).toLocaleString('id-ID');
}
// ambil angka murni (tanpa titik) buat dikirim ke server
function rawAngka(val){
  return String(val||'').replace(/[^0-9]/g,'');
}

// ---------- LOGIN ----------
async function doLogin(){
  const user_id = document.getElementById('input-userid').value.trim();
  const password = document.getElementById('input-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if(!user_id || !password){ errEl.textContent='Isi User ID dan sandi'; errEl.classList.remove('hidden'); return; }

  const res = await callApi('login', {user_id, password});
  if(!res.success){ errEl.textContent = res.message || 'Login gagal'; errEl.classList.remove('hidden'); return; }

  currentUser = res;
  localStorage.setItem('kasir_user', JSON.stringify(res));
  enterApp();
}

function resetSandi(e){
  e.preventDefault();
  window.open(LINE_CS_URL, '_blank');
}

function logout(){
  clearInterval(heartbeatTimer);
  localStorage.removeItem('kasir_user');
  currentUser = null;
  document.getElementById('view-app').classList.add('hidden');
  document.getElementById('view-login').classList.remove('hidden');
}

function enterApp(){
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-app').classList.remove('hidden');
  startHeartbeat();
  loadRekening();
  loadPending();
  switchTab('dashboard');
}

function startHeartbeat(){
  callApi('heartbeat', {user_id: currentUser.user_id});
  heartbeatTimer = setInterval(()=>{
    callApi('heartbeat', {user_id: currentUser.user_id});
    loadPending();
  }, 60000);
}

// ---------- TAB SWITCH ----------
function switchTab(tab){
  document.getElementById('tab-dashboard').classList.toggle('active', tab==='dashboard');
  document.getElementById('tab-transaksi').classList.toggle('active', tab==='transaksi');
  document.getElementById('tab-pending').classList.toggle('active', tab==='pending');
  document.getElementById('tab-semua').classList.toggle('active', tab==='semua');
  document.getElementById('tab-croscek').classList.toggle('active', tab==='croscek');
  document.getElementById('tab-log').classList.toggle('active', tab==='log');
  document.getElementById('panel-dashboard').classList.toggle('hidden', tab!=='dashboard');
  document.getElementById('panel-transaksi').classList.toggle('hidden', tab!=='transaksi');
  document.getElementById('panel-pending').classList.toggle('hidden', tab!=='pending');
  document.getElementById('panel-semua').classList.toggle('hidden', tab!=='semua');
  document.getElementById('panel-croscek').classList.toggle('hidden', tab!=='croscek');
  document.getElementById('panel-log').classList.toggle('hidden', tab!=='log');
  if(tab==='dashboard') loadDashboard();
  if(tab==='pending') loadPending();
  if(tab==='semua') loadSemuaTransaksi();
  if(tab==='croscek') initCroscek();
  if(tab==='log') loadLog();
}

// ---------- LOG AKTIVITAS ----------
async function loadLog(){
  const tanggal = document.getElementById('filter-log-tanggal').value;
  const res = await callApi('getLog', {tanggal});
  if(!res.success) return;
  renderLog(res.data);
}

function renderLog(list){
  const el = document.getElementById('log-list');
  if(!list.length){ el.innerHTML = '<div class="card" style="text-align:center;color:var(--muted)">Belum ada log aktivitas</div>'; return; }
  el.innerHTML = list.map(l=>`
    <div class="histori-row" style="align-items:flex-start;flex-direction:column">
      <div style="display:flex;justify-content:space-between;width:100%">
        <div class="h-nama">${l.aksi} — ${l.user_id}</div>
        <div class="h-time">${new Date(l.timestamp).toLocaleString('id-ID')}</div>
      </div>
      <div style="font-size:13px;color:var(--text);margin-top:4px">${l.detail}</div>
    </div>`).join('');
}

// ---------- CROSCEK SERAH TERIMA SHIFT ----------
async function initCroscek(){
  await loadUsersDropdownCroscek();
  renderCroscekForm();
  loadCroscekHistori();
}

async function loadUsersDropdownCroscek(){
  const res = await callApi('getUsersList');
  if(!res.success) return;
  const select = document.getElementById('crk-kasir-ke');
  select.innerHTML = '<option value="">-- Pilih Kasir --</option>' +
    res.data.filter(u=>u.user_id!==currentUser.user_id).map(u=>`<option value="${u.nama}">${u.nama}</option>`).join('');
}

function renderCroscekForm(){
  const aktifList = rekeningData.filter(r=>isTrue(r.aktif));
  document.getElementById('crk-rows').innerHTML = aktifList.map(r=>`
    <div class="crk-row" data-id="${r.id}" data-sistem="${r.saldo}">
      <div class="crk-nama">${r.jenis_bank && r.jenis_bank!=='-' ? r.jenis_bank+' - ' : ''}${r.nama_akun}</div>
      <div class="crk-sistem">${formatRp(r.saldo)}</div>
      <input type="text" inputmode="numeric" class="crk-aktual" placeholder="Isi saldo fisik" oninput="this.value=formatNominalInput(this.value); hitungSelisihBaris(this)">
      <div class="crk-selisih ok" id="crk-selisih-${r.id}">Rp 0</div>
    </div>`).join('');
}

function hitungSelisihBaris(inputEl){
  const row = inputEl.closest('.crk-row');
  const sistem = Number(row.dataset.sistem||0);
  const aktual = Number(rawAngka(inputEl.value)||0);
  const selisih = aktual - sistem;
  const el = document.getElementById('crk-selisih-'+row.dataset.id);
  el.textContent = (selisih>0?'+':'') + formatRp(selisih);
  el.className = 'crk-selisih ' + (selisih===0 ? 'ok' : 'warn');
}

async function submitCroscek(e){
  e.preventDefault();
  const kasirKe = document.getElementById('crk-kasir-ke').value;
  if(!kasirKe){ showToast('Pilih kasir penerima shift dulu'); return; }

  const items = [];
  document.querySelectorAll('.crk-row[data-id]').forEach(row=>{
    const input = row.querySelector('.crk-aktual');
    const aktual = rawAngka(input.value);
    if(aktual==='') return;
    items.push({ rekening_id: row.dataset.id, saldo_aktual: aktual });
  });
  if(!items.length){ showToast('Isi minimal 1 saldo aktual'); return; }

  const payload = {
    kasir_dari: currentUser.nama,
    kasir_ke: kasirKe,
    catatan: document.getElementById('crk-catatan').value,
    items
  };
  const res = await callApi('submitCroscek', payload);
  if(res.success){
    showToast(res.totalSelisih===0 ? 'Croscek aman, tidak ada selisih ✅' : `Ada selisih total ${formatRp(res.totalSelisih)}`);
    document.querySelectorAll('.crk-aktual').forEach(i=>i.value='');
    document.getElementById('crk-catatan').value='';
    renderCroscekForm();
    loadCroscekHistori();
  } else showToast(res.message || 'Gagal submit croscek');
}

async function loadCroscekHistori(){
  const res = await callApi('getCroscekHistori');
  if(!res.success) return;
  renderCroscekHistori(res.data);
}

function renderCroscekHistori(rows){
  const groups = {};
  rows.forEach(r=>{
    if(!groups[r.croscek_id]) groups[r.croscek_id] = { id:r.croscek_id, timestamp:r.timestamp, dari:r.kasir_dari, ke:r.kasir_ke, catatan:r.catatan, items:[], total:0 };
    groups[r.croscek_id].items.push(r);
    groups[r.croscek_id].total += Number(r.selisih||0);
  });
  const list = Object.values(groups).sort((a,b)=> new Date(b.timestamp)-new Date(a.timestamp));

  const el = document.getElementById('crk-histori');
  if(!list.length){ el.innerHTML = '<div class="card" style="text-align:center;color:var(--muted)">Belum ada histori croscek</div>'; return; }

  el.innerHTML = list.map(g=>`
    <div class="histori-row" style="flex-direction:column;align-items:stretch;cursor:pointer" onclick="toggleCroscekDetail('${g.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="h-nama">${g.dari} → ${g.ke}</div>
          <div class="h-time">${new Date(g.timestamp).toLocaleString('id-ID')}</div>
        </div>
        <div class="h-status ${g.total===0?'Proses':'Pending'}">${g.total===0?'Aman':'Selisih '+formatRp(g.total)}</div>
      </div>
      <div id="crk-detail-${g.id}" class="hidden" style="margin-top:10px">
        ${g.items.map(it=>`<div class="breakdown-row"><span>${it.nama_akun}</span><span>Sistem ${formatRp(it.saldo_sistem)} • Aktual ${formatRp(it.saldo_aktual)} • Selisih ${formatRp(it.selisih)}</span></div>`).join('')}
        ${g.catatan ? `<div class="breakdown-row"><span>Catatan</span><span>${g.catatan}</span></div>` : ''}
      </div>
    </div>`).join('');
}

function toggleCroscekDetail(id){
  document.getElementById('crk-detail-'+id).classList.toggle('hidden');
}

// ---------- SEMUA TRANSAKSI ----------
let semuaTransaksiCache = [];

function labelJenis(tipe){
  return {Depo:'Depo', WD:'WD', SetorKas:'Kas (Bank→Kas)', PengajuanKas:'Kas (Kas→Bank)'}[tipe] || tipe;
}

async function loadSemuaTransaksi(){
  const tanggal = document.getElementById('filter-tanggal').value;
  const tipe = document.getElementById('filter-jenis').value;
  const res = await callApi('getAllTransaksi', {tanggal, tipe});
  if(!res.success) return;
  semuaTransaksiCache = res.data;
  renderTabelSemua(res.data);
}

function resetFilterSemua(){
  document.getElementById('filter-tanggal').value = '';
  document.getElementById('filter-jenis').value = '';
  loadSemuaTransaksi();
}

function renderTabelSemua(list){
  const tbody = document.getElementById('semua-tbody');
  if(!list.length){ tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">Tidak ada data</td></tr>'; return; }
  tbody.innerHTML = list.map(t=>`
    <tr>
      <td>${new Date(t.timestamp).toLocaleString('id-ID')}</td>
      <td>${labelJenis(t.tipe)}</td>
      <td>${[t.nama_bank_asal, t.nama_bank_tujuan].filter(Boolean).join(' → ')}</td>
      <td>${t.nama_pihak || '-'}</td>
      <td>${formatRp(t.nominal)}</td>
      <td>${formatRp(t.admin_fee)}</td>
      <td>${t.status ? `<span class="h-status ${t.status}">${t.status}</span>` : '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="bukaModalEdit('${t.id}')">Edit</button>
          <button class="btn-hapus" onclick="hapusTransaksi('${t.id}')">Hapus</button>
        </div>
      </td>
    </tr>`).join('');
}

function bukaModalEdit(id){
  const t = semuaTransaksiCache.find(x=>x.id===id);
  if(!t) return;
  document.getElementById('edit-id').value = t.id;
  document.getElementById('edit-nama-pihak').value = t.nama_pihak || '';
  document.getElementById('edit-nominal').value = formatNominalInput(t.nominal);
  document.getElementById('edit-admin-fee').value = formatNominalInput(t.admin_fee || 0);
  document.getElementById('edit-status').value = t.status || 'Proses';
  document.getElementById('edit-status-wrap').classList.toggle('hidden', t.tipe!=='Depo');
  document.getElementById('modal-edit').classList.remove('hidden');
}

function tutupModalEdit(){
  document.getElementById('modal-edit').classList.add('hidden');
}

async function simpanEditTransaksi(e){
  e.preventDefault();
  const payload = {
    id: document.getElementById('edit-id').value,
    user_id: currentUser.user_id,
    nama_pihak: document.getElementById('edit-nama-pihak').value,
    nominal: rawAngka(document.getElementById('edit-nominal').value),
    admin_fee: rawAngka(document.getElementById('edit-admin-fee').value),
    status: document.getElementById('edit-status').value
  };
  const res = await callApi('editTransaksi', payload);
  if(res.success){
    showToast('Transaksi diperbarui');
    tutupModalEdit();
    loadSemuaTransaksi();
    loadRekening();
    loadPending();
  } else showToast(res.message || 'Gagal menyimpan');
}

async function hapusTransaksi(id){
  if(!confirm('Yakin hapus transaksi ini? Saldo terkait akan dikembalikan seperti semula.')) return;
  const res = await callApi('deleteTransaksi', {id, user_id: currentUser.user_id});
  if(res.success){
    showToast('Transaksi dihapus');
    loadSemuaTransaksi();
    loadRekening();
    loadPending();
  } else showToast(res.message || 'Gagal menghapus');
}

// ---------- PENDING ----------
async function loadPending(){
  const res = await callApi('getPending');
  if(!res.success) return;
  renderPending(res.data);
  updateBadge(res.data.length);
}

function renderPending(list){
  const el = document.getElementById('pending-list');
  if(!list.length){ el.innerHTML = '<div class="card" style="text-align:center;color:var(--muted)">Tidak ada transaksi pending</div>'; return; }
  el.innerHTML = list.map(t=>`
    <div class="histori-row" style="align-items:center">
      <div>
        <div class="h-nama">${t.nama_bank} — ${t.nama_pihak || '-'}</div>
        <div class="h-time">${new Date(t.timestamp).toLocaleString('id-ID')} • ID: ${t.user_id}</div>
      </div>
      <div style="text-align:right">
        <div class="h-nominal">${formatRp(t.nominal)}</div>
        <button class="btn-mini" onclick="tandaiProses('${t.id}')">Tandai Proses</button>
      </div>
    </div>`).join('');
}

async function tandaiProses(id){
  const res = await callApi('updateStatus', {id, status:'Proses', user_id: currentUser.user_id});
  if(res.success){ showToast('Status diperbarui'); loadPending(); }
  else showToast(res.message || 'Gagal update');
}

function updateBadge(count){
  const badge = document.getElementById('pending-badge');
  if(count>0){ badge.textContent = count; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

// ---------- DASHBOARD ----------
async function loadDashboard(){
  const res = await callApi('getDashboard');
  if(!res.success) return;
  document.getElementById('staff-online-list').innerHTML = res.staffOnline.length
    ? res.staffOnline.map(s=>`<span class="staff-chip">🟢 ${s.nama}</span>`).join('')
    : '<span style="color:var(--muted);font-size:13px">Tidak ada staff online</span>';
  document.getElementById('total-masuk').textContent = formatRp(res.totalMasuk);
  document.getElementById('total-keluar').textContent = formatRp(res.totalKeluar);
  document.getElementById('total-setor').textContent = formatRp(res.setorTotal);

  const kkb = res.kasKeBank || {};
  const keys = Object.keys(kkb);
  document.getElementById('kas-ke-bank-list').innerHTML = keys.length
    ? keys.map(k=>`<div class="breakdown-row"><span>${k}</span><b>${formatRp(kkb[k])}</b></div>`).join('')
    : '<span style="color:var(--muted);font-size:13px">Belum ada data</span>';
}

// ---------- REKENING ----------
function isTrue(v){ return v===true || v==='TRUE' || v==='true'; }

async function loadRekening(){
  const res = await callApi('getRekening');
  if(!res.success) return;
  rekeningData = res.data;
  renderKasDropdowns();
}

function pilihRekening(id){
  selectedRekeningId = id;
  renderBankPills();
  renderBankCardBesar();
  loadHistori();
}

async function loadHistori(){
  if(!selectedRekeningId || !currentJenis) return;
  const res = await callApi('getHistori', {rekening_id: selectedRekeningId, tipe: currentJenis});
  if(res.success) renderHistori(res.data);
}

function renderHistori(list){
  const el = document.getElementById('dw-histori-list');
  if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">Belum ada transaksi</div>'; return; }
  el.innerHTML = list.map(t=>`
    <div class="histori-row">
      <div>
        <div class="h-nama">${t.nama_pihak || '-'}</div>
        <div class="h-time">${new Date(t.timestamp).toLocaleString('id-ID')}</div>
      </div>
      <div style="text-align:right">
        <div class="h-nominal">${formatRp(t.nominal)}</div>
        ${t.status ? `<div class="h-status ${t.status}">${t.status}</div>` : ''}
      </div>
    </div>`).join('');
}

function renderBankCardBesar(){
  const el = document.getElementById('bank-card-besar');
  const rek = rekeningData.find(r=>r.id===selectedRekeningId);
  if(!rek){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden');

  const adaKode = rek.kode_login || rek.kode_transfer;
  el.innerHTML = `
    <div>
      <div class="bj">${rek.jenis_bank}</div>
      <div class="bn">${rek.nama_akun}</div>
      <div class="bs-label">Saldo Akhir</div>
      <div class="bs">${formatRp(rek.saldo)}</div>
    </div>
    ${adaKode ? `
    <div class="bank-kode-box">
      ${rek.kode_login ? `<div class="kk-label">Kode Akses Login</div><div class="kk-val">${rek.kode_login}</div>` : ''}
      ${rek.kode_transfer ? `<div class="kk-label">Kode Transfer</div><div class="kk-val">${rek.kode_transfer}</div>` : ''}
    </div>` : ''}
  `;
}

let arahKas = 'b2k'; // b2k = Bank ke Kas, k2b = Kas ke Bank

function pilihArahKas(arah){
  arahKas = arah;
  document.getElementById('kas-dir-b2k').classList.toggle('active', arah==='b2k');
  document.getElementById('kas-dir-k2b').classList.toggle('active', arah==='k2b');
  renderKasDropdowns();
}

function renderKasDropdowns(){
  const bankAktif = rekeningData.filter(r=>r.tipe==='Bank' && isTrue(r.aktif));
  const kasAktif = rekeningData.filter(r=>r.tipe==='Kas' && isTrue(r.aktif));
  const bankOpt = bankAktif.map(b=>`<option value="${b.id}">${b.jenis_bank} - ${b.nama_akun}</option>`).join('');
  const kasOpt = kasAktif.map(k=>`<option value="${k.id}">${k.nama_akun}</option>`).join('');

  if(arahKas==='b2k'){
    document.getElementById('kas-label-asal').textContent = 'Bank Asal';
    document.getElementById('kas-label-tujuan').textContent = 'Bank Tujuan (Kas)';
    document.getElementById('kas-asal').innerHTML = bankOpt;
    document.getElementById('kas-tujuan').innerHTML = kasOpt;
  } else {
    document.getElementById('kas-label-asal').textContent = 'Kas Asal';
    document.getElementById('kas-label-tujuan').textContent = 'Bank Tujuan';
    document.getElementById('kas-asal').innerHTML = kasOpt;
    document.getElementById('kas-tujuan').innerHTML = bankOpt;
  }
}

// ---------- JENIS: Depo / WD / Kas ----------
function pilihJenis(jenis){
  currentJenis = jenis;
  selectedRekeningId = null;
  document.getElementById('jenis-depo').classList.toggle('active', jenis==='Depo');
  document.getElementById('jenis-wd').classList.toggle('active', jenis==='WD');
  document.getElementById('jenis-kas').classList.toggle('active', jenis==='Kas');

  document.getElementById('form-bank-wrap').classList.toggle('hidden', jenis==='Kas');
  document.getElementById('form-kas-wrap').classList.toggle('hidden', jenis!=='Kas');
  document.getElementById('bank-card-besar').classList.add('hidden');
  document.getElementById('dw-status-wrap').classList.toggle('hidden', jenis!=='Depo');
  document.getElementById('dw-histori-list').innerHTML = '';

  if(jenis==='Depo' || jenis==='WD') renderBankPills();
  if(jenis==='Kas') renderKasDropdowns();
}

function renderBankPills(){
  // Depo -> hanya bank dengan bisa_deposit aktif. WD -> hanya bank dengan bisa_withdraw aktif.
  const filterKey = currentJenis==='Depo' ? 'bisa_deposit' : 'bisa_withdraw';
  const bankList = rekeningData.filter(r=>r.tipe==='Bank' && isTrue(r.aktif) && isTrue(r[filterKey]));
  document.getElementById('bank-pill-row').innerHTML = bankList.map(b=>`
    <div class="bank-pill ${b.id===selectedRekeningId?'active':''}" onclick="pilihRekening('${b.id}')">${b.jenis_bank}</div>
  `).join('');
}

// ---------- SUBMIT ----------
async function submitDepoWd(e){
  e.preventDefault();
  if(!selectedRekeningId){ showToast('Pilih bank dulu'); return; }
  const payload = {
    tipe: currentJenis,
    user_id: document.getElementById('dw-userid').value,
    nama_pihak: document.getElementById('dw-nama-pihak').value,
    nominal: rawAngka(document.getElementById('dw-nominal').value),
    admin_fee: rawAngka(document.getElementById('dw-admin-fee').value),
    status: currentJenis==='Depo' ? document.getElementById('dw-status').value : 'Proses'
  };
  if(currentJenis==='Depo') payload.rekening_tujuan = selectedRekeningId;
  if(currentJenis==='WD') payload.rekening_asal = selectedRekeningId;

  const res = await callApi('submitTransaksi', payload);
  if(res.success){
    showToast('Transaksi berhasil disimpan');
    document.getElementById('form-depo-wd').reset();
    loadRekening();
    renderBankCardBesar();
    loadHistori();
    loadPending();
  } else showToast(res.message || 'Gagal menyimpan');
}

async function submitKas(e){
  e.preventDefault();
  const payload = {
    tipe: arahKas==='b2k' ? 'SetorKas' : 'PengajuanKas',
    user_id: currentUser.user_id,
    rekening_asal: document.getElementById('kas-asal').value,
    rekening_tujuan: document.getElementById('kas-tujuan').value,
    nominal: rawAngka(document.getElementById('kas-nominal').value)
  };
  const res = await callApi('submitTransaksi', payload);
  if(res.success){ showToast('Transaksi kas berhasil'); e.target.reset(); loadRekening(); }
  else showToast(res.message || 'Gagal menyimpan');
}

// ---------- INIT: cek sesi tersimpan ----------
window.onload = function(){
  const saved = localStorage.getItem('kasir_user');
  if(saved){ currentUser = JSON.parse(saved); enterApp(); }
};
