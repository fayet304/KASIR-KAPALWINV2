<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aplikasi Kasir</title>
<link rel="stylesheet" href="style.css?v=2">
</head>
<body>

<!-- ================= LOGIN VIEW ================= -->
<div id="view-login" class="login-wrap">
  <div class="login-card">
    <h1>🔐 Login Kasir</h1>
    <div id="login-error" class="error-msg hidden"></div>
    <label>User ID</label>
    <input id="input-userid" type="text" placeholder="User ID">
    <label>Sandi</label>
    <input id="input-password" type="password" placeholder="Sandi">
    <button class="btn-primary" id="btn-login" onclick="doLogin()">Masuk</button>
    <a href="#" class="link-reset" onclick="resetSandi(event)">Lupa sandi? Hubungi CS</a>
  </div>
</div>

<!-- ================= MAIN APP ================= -->
<div id="view-app" class="app hidden">
  <div class="topbar">
    <h2 id="brand-mark">💳 Kasir</h2>
    <button class="logout-btn" onclick="logout()" title="Keluar">🚪</button>
  </div>

  <div class="tabbar">
    <button id="tab-dashboard" class="active" onclick="switchTab('dashboard')">📊 Dashboard</button>
    <button id="tab-transaksi" onclick="switchTab('transaksi')">💳 Transaksi</button>
    <button id="tab-pending" onclick="switchTab('pending')">⏳ Pending <span id="pending-badge" class="badge hidden">0</span></button>
    <button id="tab-semua" onclick="switchTab('semua')">📋 Semua</button>
    <button id="tab-croscek" onclick="switchTab('croscek')">🔄 Croscek</button>
    <button id="tab-log" onclick="switchTab('log')">📜 Log</button>
    <button id="tab-setting" onclick="switchTab('setting')">⚙️ Setting</button>
  </div>

  <!-- DASHBOARD -->
  <div id="panel-dashboard">
    <div class="grid-cards">
      <div class="card wide">
        <div class="label">Staff Kasir Online</div>
        <div id="staff-online-list">Memuat...</div>
      </div>
      <div class="card">
        <div class="label">Saldo Masuk (Depo)</div>
        <div class="value" id="total-masuk">Rp 0</div>
      </div>
      <div class="card">
        <div class="label">Saldo Keluar (WD)</div>
        <div class="value" id="total-keluar">Rp 0</div>
      </div>
      <div class="card wide">
        <div class="label">Total Saldo Kas → Bank (Proses WD)</div>
        <div id="kas-ke-bank-list"></div>
      </div>
      <div class="card wide">
        <div class="label">Total Setor Saldo Bank Depo → Kas</div>
        <div class="value" id="total-setor">Rp 0</div>
      </div>
    </div>
  </div>

  <!-- TRANSAKSI -->
  <div id="panel-transaksi" class="hidden">
    <div id="bank-card-besar" class="bank-card-besar hidden"></div>

    <div class="jenis-toggle">
      <button id="jenis-depo" onclick="pilihJenis('Depo')">Depo</button>
      <button id="jenis-wd" onclick="pilihJenis('WD')">WD</button>
      <button id="jenis-kas" onclick="pilihJenis('Kas')">Kas</button>
    </div>

    <!-- DEPO / WD FORM -->
    <div id="form-bank-wrap" class="hidden">
      <div class="bank-pill-row" id="bank-pill-row"></div>
      <div class="form-card">
        <form id="form-depo-wd" onsubmit="submitDepoWd(event)">
          <label>ID</label>
          <input id="dw-userid" required>
          <label>Nama Pengirim/Penerima</label>
          <input id="dw-nama-pihak" required>
          <label>Nominal</label>
          <input id="dw-nominal" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)" required>
          <label>Admin</label>
          <input id="dw-admin-fee" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)" value="0">
          <div id="dw-status-wrap">
            <label>Status</label>
            <select id="dw-status">
              <option value="Proses">Proses</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <button class="btn-primary" type="submit">Submit</button>
        </form>
      </div>
      <div class="histori-wrap">
        <div class="histori-title">10 Transaksi Terakhir</div>
        <div id="dw-histori-list"></div>
      </div>
    </div>

    <!-- KAS FORM -->
    <div id="form-kas-wrap" class="hidden">
      <div class="jenis-toggle" style="margin-bottom:12px">
        <button id="kas-dir-b2k" class="active" onclick="pilihArahKas('b2k')">Bank → Kas</button>
        <button id="kas-dir-k2b" onclick="pilihArahKas('k2b')">Kas → Bank</button>
      </div>
      <div class="form-card">
        <form onsubmit="submitKas(event)">
          <label id="kas-label-asal">Bank Asal</label>
          <select id="kas-asal"></select>
          <label id="kas-label-tujuan">Bank Tujuan (Kas)</label>
          <select id="kas-tujuan"></select>
          <label>Nominal</label>
          <input id="kas-nominal" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)" required>
          <button class="btn-primary" type="submit">Submit</button>
        </form>
      </div>
    </div>
  </div>

  <!-- PENDING -->
  <div id="panel-pending" class="hidden">
    <div id="pending-list"></div>
  </div>

  <!-- SEMUA TRANSAKSI -->
  <div id="panel-semua" class="hidden">
    <div class="filter-row">
      <div>
        <label>Tanggal</label>
        <input type="date" id="filter-tanggal" onchange="loadSemuaTransaksi()">
      </div>
      <div>
        <label>Jenis Transaksi</label>
        <select id="filter-jenis" onchange="loadSemuaTransaksi()">
          <option value="">Semua Jenis</option>
          <option value="Depo">Depo</option>
          <option value="WD">WD</option>
          <option value="SetorKas">Kas: Bank → Kas</option>
          <option value="PengajuanKas">Kas: Kas → Bank</option>
        </select>
      </div>
      <button class="btn-primary" style="width:auto" onclick="resetFilterSemua()">Reset</button>
    </div>
    <div class="table-wrap">
      <table class="tabel-transaksi">
        <thead>
          <tr><th>Tanggal</th><th>Jenis</th><th>Bank</th><th>Nama</th><th>Nominal</th><th>Admin</th><th>Status</th><th>Aksi</th></tr>
        </thead>
        <tbody id="semua-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- CROSCEK SERAH TERIMA SHIFT -->
  <div id="panel-croscek" class="hidden">
    <div class="form-card" style="margin-bottom:16px">
      <label>Serah Terima Ke (Kasir Berikutnya)</label>
      <select id="crk-kasir-ke"></select>
      <label>Catatan (opsional)</label>
      <input id="crk-catatan" placeholder="Contoh: selisih karena pembulatan admin">
    </div>

    <div class="crk-row crk-header">
      <div>Rekening</div>
      <div>Saldo Sistem</div>
      <div>Saldo Aktual (Hitung Fisik)</div>
      <div>Selisih</div>
    </div>
    <div id="crk-rows"></div>

    <button class="btn-primary" style="margin:12px 0 24px" onclick="submitCroscek(event)">Submit Croscek</button>

    <div id="crk-foto-session" class="hidden"></div>

    <div class="histori-title">Histori Serah Terima</div>
    <div id="crk-histori"></div>
  </div>

  <!-- LOG AKTIVITAS -->
  <div id="panel-log" class="hidden">
    <div class="filter-row">
      <div>
        <label>Tanggal</label>
        <input type="date" id="filter-log-tanggal" onchange="loadLog()">
      </div>
      <button class="btn-primary" style="width:auto" onclick="document.getElementById('filter-log-tanggal').value='';loadLog()">Reset</button>
    </div>
    <div id="log-list"></div>
  </div>

  <!-- SETTING REKENING -->
  <div id="panel-setting" class="hidden">
    <button class="btn-primary" style="width:auto;margin-bottom:16px" onclick="bukaModalRekening()">+ Tambah Rekening</button>

    <div class="rk-row rk-header">
      <div>Rekening</div>
      <div>Saldo</div>
      <div>Status</div>
      <div>Aksi</div>
    </div>
    <div id="setting-rekening-list"></div>
  </div>

  <!-- MODAL REKENING (tambah/edit) -->
  <div id="modal-rekening" class="modal-overlay hidden">
    <div class="modal-box">
      <h3 id="modal-rekening-title">Tambah Rekening</h3>
      <form onsubmit="simpanRekening(event)">
        <input type="hidden" id="rk-id">
        <label>Tipe</label>
        <select id="rk-tipe" onchange="toggleFieldBank()">
          <option value="Bank">Bank</option>
          <option value="Kas">Kas</option>
        </select>
        <div id="rk-jenis-bank-wrap">
          <label>Jenis Bank</label>
          <input id="rk-jenis-bank" placeholder="Contoh: BCA">
        </div>
        <label>Nama Akun</label>
        <input id="rk-nama-akun" placeholder="Contoh: BCA Kasir 1" required>
        <div id="rk-saldo-awal-wrap">
          <label>Saldo Awal</label>
          <input id="rk-saldo-awal" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)" value="0">
        </div>
        <label>Kode Akses Login (opsional)</label>
        <input id="rk-kode-login" placeholder="Contoh: Gun168gn">
        <label>Kode Transfer (opsional)</label>
        <input id="rk-kode-transfer" placeholder="Contoh: 778989">
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin:10px 0">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="rk-aktif" style="width:auto;margin:0" checked> Aktif</label>
          <label id="rk-deposit-wrap" style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="rk-bisa-deposit" style="width:auto;margin:0" checked> Bisa Depo</label>
          <label id="rk-withdraw-wrap" style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="rk-bisa-withdraw" style="width:auto;margin:0" checked> Bisa WD</label>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button type="button" class="btn-secondary" style="flex:1" onclick="tutupModalRekening()">Batal</button>
          <button type="submit" class="btn-primary" style="flex:1">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL EDIT -->
  <div id="modal-edit" class="modal-overlay hidden">
    <div class="modal-box">
      <h3>Edit Transaksi</h3>
      <form onsubmit="simpanEditTransaksi(event)">
        <input type="hidden" id="edit-id">
        <label>Nama Pengirim/Penerima</label>
        <input id="edit-nama-pihak">
        <label>Nominal</label>
        <input id="edit-nominal" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)" required>
        <label>Admin</label>
        <input id="edit-admin-fee" type="text" inputmode="numeric" oninput="this.value=formatNominalInput(this.value)">
        <div id="edit-status-wrap">
          <label>Status</label>
          <select id="edit-status">
            <option value="Proses">Proses</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button type="button" class="btn-secondary" style="flex:1" onclick="tutupModalEdit()">Batal</button>
          <button type="submit" class="btn-primary" style="flex:1">Simpan</button>
        </div>
      </form>
    </div>
  </div>
</div>

<script src="config.js?v=2"></script>
<script src="app.js?v=2"></script>
</body>
</html>
