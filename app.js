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

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const res = await callApi('login', {user_id, password});

  btn.disabled = false;
  btn.textContent = 'Masuk';

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

async function enterApp(){
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-app').classList.remove('hidden');
  switchTab('dashboard', true); // tampilkan kerangka dulu, datanya nyusul dari bootstrap

  const res = await callApi('bootstrap');
  if(res.success){
    rekeningData = res.rekening;
    renderKasDropdowns();
    renderDashboard(res);
    renderPending(res.pending);
    updateBadge(res.pending.length);
  }

  startHeartbeat();
}

function startHeartbeat(){
  heartbeatTimer = setInterval(async ()=>{
    const res = await callApi('heartbeat', {user_id: currentUser.user_id});
    if(res.success && res.pending){
      renderPending(res.pending);
      updateBadge(res.pending.length);
    }
  }, 60000);
}

// ---------- TAB SWITCH ----------
function switchTab(tab, skipLoad){
  document.getElementById('tab-dashboard').classList.toggle('active', tab==='dashboard');
  document.getElementById('tab-transaksi').classList.toggle('active', tab==='transaksi');
  document.getElementById('tab-pending').classList.toggle('active', tab==='pending');
  document.getElementById('tab-semua').classList.toggle('active', tab==='semua');
  document.getElementById('tab-croscek').classList.toggle('active', tab==='croscek');
  document.getElementById('tab-log').classList.toggle('active', tab==='log');
  document.getElementById('tab-setting').classList.toggle('active', tab==='setting');
  document.getElementById('panel-dashboard').classList.toggle('hidden', tab!=='dashboard');
  document.getElementById('panel-transaksi').classList.toggle('hidden', tab!=='transaksi');
  document.getElementById('panel-pending').classList.toggle('hidden', tab!=='pending');
  document.getElementById('panel-semua').classList.toggle('hidden', tab!=='semua');
  document.getElementById('panel-croscek').classList.toggle('hidden', tab!=='croscek');
  document.getElementById('panel-log').classList.toggle('hidden', tab!=='log');
  document.getElementById('panel-setting').classList.toggle('hidden', tab!=='setting');

  if(skipLoad) return; // dipakai pas bootstrap udah nyediain semua data, gak perlu fetch ulang

  if(tab==='dashboard') loadDashboard();
  if(tab==='pending') loadPending();
  if(tab==='semua') loadSemuaTransaksi();
  if(tab==='croscek') initCroscek();
  if(tab==='log') loadLog();
  if(tab==='setting') loadRekening().then(renderSettingList);
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
    const namaAkun = row.querySelector('.crk-nama').textContent;
    items.push({ rekening_id: row.dataset.id, saldo_aktual: aktual, nama_akun: namaAkun });
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
    bukaSesiFotoCroscek(res.croscek_id, items);
  } else showToast(res.message || 'Gagal submit croscek');
}

// ---------- SESI FOTO BUKTI CROSCEK ----------
function bukaSesiFotoCroscek(croscekId, items){
  const el = document.getElementById('crk-foto-session');
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="histori-title">📷 Sesi Foto Bukti — Serah Terima Ini</div>
    <div class="card" style="margin-bottom:16px;font-size:13px;color:var(--muted)">Foto layar saldo tiap bank/kas di bawah sebagai bukti. Foto langsung tersimpan & tercatat linknya.</div>
    <div id="crk-foto-rows"></div>
  `;
  document.getElementById('crk-foto-rows').innerHTML = items.map(it=>`
    <div class="foto-row">
      <div class="foto-nama">${it.nama_akun}</div>
      <div class="foto-status" id="foto-status-${it.rekening_id}">Belum difoto</div>
      <input type="file" accept="image/*" capture="environment" id="foto-input-${it.rekening_id}" class="hidden" onchange="prosesFotoCroscek(event, '${croscekId}', '${it.rekening_id}', '${it.nama_akun.replace(/'/g, "\\'")}')
