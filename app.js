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
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 15000);
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action, payload}),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return await res.json();
  } catch(err){
    clearTimeout(timeout);
    if(err.name === 'AbortError'){
      return { success:false, message:'Koneksi ke server kelamaan (timeout 15 detik). Cek internet atau coba lagi.' };
    }
    return { success:false, message:'Gagal terhubung ke server: ' + err.message };
  }
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
      <input type="file" accept="image/*" capture="environment" id="foto-input-${it.rekening_id}" class="hidden" onchange="prosesFotoCroscek(event, '${croscekId}', '${it.rekening_id}', '${it.nama_akun.replace(/'/g, "\\'")}')">
      <button class="btn-mini" onclick="document.getElementById('foto-input-${it.rekening_id}').click()">📷 Ambil Foto</button>
    </div>`).join('');
}

async function prosesFotoCroscek(e, croscekId, rekeningId, namaAkun){
  const file = e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById('foto-status-'+rekeningId);
  statusEl.textContent = 'Mengunggah...';

  try {
    const base64 = await kompresGambar(file, 1280, 0.7);
    const res = await callApi('uploadFotoCroscek', {
      croscek_id: croscekId,
      rekening_id: rekeningId,
      nama_akun: namaAkun,
      user_id: currentUser.user_id,
      foto_base64: base64,
      mime_type: 'image/jpeg'
    });
    if(res.success){
      statusEl.innerHTML = `<a href="${res.url}" target="_blank">✅ Terupload, lihat foto</a>`;
    } else {
      statusEl.textContent = 'Gagal: ' + (res.message || 'coba lagi');
    }
  } catch(err){
    statusEl.textContent = 'Gagal memproses foto';
  }
}

// Kompres & resize foto di browser dulu sebelum diupload, biar cepat & gak berat
function kompresGambar(file, maxWidth, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = function(ev){
      const img = new Image();
      img.onload = function(){
        let w = img.width, h = img.height;
        if(w > maxWidth){ h = h * (maxWidth/w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function tampilkanFotoHistori(croscekId){
  const el = document.getElementById('foto-histori-'+croscekId);
  el.innerHTML = 'Memuat...';
  const res = await callApi('getFotoCroscek', {croscek_id: croscekId});
  if(!res.success || !res.data.length){ el.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-top:6px">Belum ada foto</div>'; return; }
  el.innerHTML = res.data.map(f=>`<div style="font-size:12px;margin-top:4px"><a href="${f.foto_url}" target="_blank">📷 ${f.nama_akun || f.rekening_id}</a></div>`).join('');
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
        <button class="btn-mini" onclick="event.stopPropagation(); tampilkanFotoHistori('${g.id}')">📷 Lihat Foto</button>
        <div id="foto-histori-${g.id}"></div>
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
  renderDashboard(res);
}

function renderDashboard(res){
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

// ---------- SETTING REKENING ----------
function renderSettingList(){
  const el = document.getElementById('setting-rekening-list');
  if(!rekeningData.length){ el.innerHTML = '<div class="card" style="text-align:center;color:var(--muted)">Belum ada rekening</div>'; return; }
  el.innerHTML = rekeningData.map(r=>`
    <div class="rk-row">
      <div>
        <div class="crk-nama">${r.tipe==='Bank' ? r.jenis_bank+' — ' : ''}${r.nama_akun}</div>
        <div class="h-time">${r.tipe}</div>
      </div>
      <div>${formatRp(r.saldo)}</div>
      <div class="rk-flags">
        <span class="rk-flag ${isTrue(r.aktif)?'on':''}">${isTrue(r.aktif)?'Aktif':'Nonaktif'}</span>
        ${r.tipe==='Bank' ? `<span class="rk-flag ${isTrue(r.bisa_deposit)?'on':''}">Depo</span><span class="rk-flag ${isTrue(r.bisa_withdraw)?'on':''}">WD</span>` : ''}
      </div>
      <div class="action-btns">
        <button class="btn-edit" onclick="bukaModalRekening('${r.id}')">Edit</button>
        <button class="btn-hapus" onclick="hapusRekening('${r.id}')">Hapus</button>
      </div>
    </div>`).join('');
}

function toggleFieldBank(){
  const isBank = document.getElementById('rk-tipe').value === 'Bank';
  document.getElementById('rk-jenis-bank-wrap').classList.toggle('hidden', !isBank);
  document.getElementById('rk-deposit-wrap').classList.toggle('hidden', !isBank);
  document.getElementById('rk-withdraw-wrap').classList.toggle('hidden', !isBank);
}

function bukaModalRekening(id){
  const rek = id ? rekeningData.find(r=>r.id===id) : null;

  document.getElementById('modal-rekening-title').textContent = id ? 'Edit Rekening' : 'Tambah Rekening';
  document.getElementById('rk-id').value = id || '';
  document.getElementById('rk-tipe').value = rek ? rek.tipe : 'Bank';
  document.getElementById('rk-tipe').disabled = !!id; // tipe gak bisa diubah setelah dibuat
  document.getElementById('rk-jenis-bank').value = rek ? (rek.jenis_bank==='-'?'':rek.jenis_bank) : '';
  document.getElementById('rk-nama-akun').value = rek ? rek.nama_akun : '';
  document.getElementById('rk-kode-login').value = rek ? (rek.kode_login||'') : '';
  document.getElementById('rk-kode-transfer').value = rek ? (rek.kode_transfer||'') : '';
  document.getElementById('rk-aktif').checked = rek ? isTrue(rek.aktif) : true;
  document.getElementById('rk-bisa-deposit').checked = rek ? isTrue(rek.bisa_deposit) : true;
  document.getElementById('rk-bisa-withdraw').checked = rek ? isTrue(rek.bisa_withdraw) : true;

  // saldo cuma bisa diisi pas TAMBAH baru — pas edit disembunyikan biar saldo gak bisa diubah lewat sini
  document.getElementById('rk-saldo-awal-wrap').classList.toggle('hidden', !!id);
  document.getElementById('rk-saldo-awal').value = '0';

  toggleFieldBank();
  document.getElementById('modal-rekening').classList.remove('hidden');
}

function tutupModalRekening(){
  document.getElementById('modal-rekening').classList.add('hidden');
}

async function simpanRekening(e){
  e.preventDefault();
  const id = document.getElementById('rk-id').value;
  const payload = {
    id,
    user_id: currentUser.user_id,
    tipe: document.getElementById('rk-tipe').value,
    jenis_bank: document.getElementById('rk-jenis-bank').value || '-',
    nama_akun: document.getElementById('rk-nama-akun').value,
    kode_login: document.getElementById('rk-kode-login').value,
    kode_transfer: document.getElementById('rk-kode-transfer').value,
    aktif: document.getElementById('rk-aktif').checked,
    bisa_deposit: document.getElementById('rk-bisa-deposit').checked,
    bisa_withdraw: document.getElementById('rk-bisa-withdraw').checked
  };

  let res;
  if(id){
    res = await callApi('updateRekening', payload);
  } else {
    payload.saldo_awal = rawAngka(document.getElementById('rk-saldo-awal').value);
    res = await callApi('addRekening', payload);
  }

  if(res.success){
    showToast(id ? 'Rekening diperbarui' : 'Rekening ditambahkan');
    tutupModalRekening();
    loadRekening().then(renderSettingList);
  } else showToast(res.message || 'Gagal menyimpan');
}

async function hapusRekening(id){
  if(!confirm('Yakin hapus rekening ini? Histori transaksi lama yang terkait tetap ada, tapi rekening ini tidak akan muncul lagi di pilihan.')) return;
  const res = await callApi('deleteRekening', {id, user_id: currentUser.user_id});
  if(res.success){ showToast('Rekening dihapus'); loadRekening().then(renderSettingList); }
  else showToast(res.message || 'Gagal menghapus');
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
