# Aplikasi Kasir (Frontend GitHub Pages + Database Google Sheets)

## Struktur Frontend (upload semua ke GitHub, satu folder yang sama)
- `index.html` → struktur halaman saja (form, tabel, dll). **Jarang perlu diubah.**
- `style.css` → semua warna & tampilan. **Edit ini kalau mau ganti tema warna.**
- `config.js` → URL Apps Script, link LINE CS, judul aplikasi, logo. **Edit ini kalau mau ganti branding.**
- `app.js` → semua logic aplikasi (submit transaksi, dashboard, dll). **Jarang perlu diubah manual.**

Karena dipisah gini, ganti tema warna atau logo cukup edit `style.css`/`config.js` — gak perlu buka `app.js` sama sekali, jadi gak akan ketimpuk/ketimpa logic yang lagi kamu pakai.

## Struktur Backend (Google Apps Script)
- `Config.gs`, `Setup.gs`, `Router.gs`, `Auth.gs`, `Dashboard.gs`, `Transaksi.gs`, `Croscek.gs`, `Log.gs`
  (atau boleh gabung semua ke 1 file `Code.gs` kalau lebih suka simpel — lihat Langkah 1 di bawah)


## Langkah 1 — Siapkan Database (Google Sheets)
1. Buka https://sheets.google.com → buat spreadsheet baru, beri nama misalnya "DB Kasir".
2. Klik menu **Extensions > Apps Script**.
3. **Pilih salah satu cara:**

   **Cara A — 1 file saja (paling gampang):** hapus kode default di `Code.gs`, paste seluruh isi file `Code.gs` yang aku kasih.

   **Cara B — dipisah per bagian (lebih rapi, gak nyampur):** pakai folder `kasir-app-gs/` yang isinya 8 file terpisah:
   - `Config.gs`, `Setup.gs`, `Router.gs`, `Auth.gs`, `Dashboard.gs`, `Transaksi.gs`, `Croscek.gs`, `Log.gs`

   Cara pasangnya: di Apps Script, klik ikon **+** di sebelah "Files" (kiri) > **Script**, kasih nama sesuai nama file (misal `Config`), lalu paste isinya. Ulangi untuk 8 file itu. Hapus isi `Code.gs` bawaan (boleh dihapus filenya sekalian, atau dikosongin). **Nama file boleh beda urutan, gak masalah** — semua file `.gs` dalam 1 project otomatis saling kenal tanpa perlu import.

4. Di bagian atas editor, pilih fungsi `setupSheets` dari dropdown, lalu klik **Run** (▶). **(Hanya sekali, waktu spreadsheet masih kosong!)**
   - Izinkan akses saat diminta.
   - Ini otomatis membuat sheet `Users`, `Rekening`, `Transaksi`, `Croscek`, `LogAktivitas` dengan contoh data.
5. Edit sheet `Users` untuk menambah akun kasir (kolom: user_id, password, nama, role).
6. Edit sheet `Rekening` untuk menambah/mengubah daftar bank (BCA/BRI/DANA, dst) dan kas.

## ⚠️ Kalau nanti ada update fitur baru dari saya
**Jangan jalankan `setupSheets()` lagi** — itu akan menghapus semua data yang sudah kamu isi (user, saldo, transaksi, dst).

Yang perlu dilakukan tiap ada update:
1. Timpa isi file-file `.gs` yang aku kasih versi terbarunya (kalau pakai Cara B, aku akan bilang file mana aja yang berubah — gak perlu timpa semua).
2. Jalankan fungsi **`migrateSheets`** dari dropdown (bukan `setupSheets`). Fungsi ini aman — cuma menambah sheet atau kolom baru yang belum ada, data lama kamu tidak akan hilang.
3. Deploy ulang: **Deploy > Manage deployments > Edit (pensil) > New version > Deploy**.
4. Ganti file `index.html` di GitHub dengan versi terbaru, tunggu GitHub Pages update.



## Langkah 2 — Deploy Backend sebagai Web App
1. Di Apps Script, klik **Deploy > New deployment**.
2. Pilih tipe **Web app**.
3. Isi:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Klik **Deploy**, copy **URL Web App** yang muncul (bentuknya seperti `https://script.google.com/macros/s/xxxxx/exec`).
5. Kalau nanti kamu edit `Code.gs` lagi, ingat untuk **Deploy > Manage deployments > Edit (pensil) > New version** supaya perubahan aktif.

## Langkah 3 — Hubungkan Frontend ke Backend
1. Buka `config.js`, cari baris:
   ```js
   const APPS_SCRIPT_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT';
   ```
2. Ganti dengan URL Web App dari Langkah 2.
3. Di file yang sama, ganti juga `LINE_CS_URL` dengan link LINE CS kamu yang asli.

## Langkah 4 — Upload ke GitHub & Aktifkan GitHub Pages
1. Buat repository baru di GitHub (public atau private+Pages jika akun Pro).
2. Upload **ke-4 file frontend** (`index.html`, `style.css`, `config.js`, `app.js`) ke root repo tersebut — harus di folder yang sama.
3. Buka **Settings > Pages** di repo.
4. Pilih Source: branch `main`, folder `/ (root)` → Save.
5. Tunggu 1–2 menit, GitHub akan memberi URL seperti `https://namamu.github.io/nama-repo/` — ini link aplikasi kasirmu, bisa dibuka dari HP/tablet/laptop/PC mana saja.

## Ganti Tema Warna
Buka `style.css`, cari bagian paling atas:
```css
:root{
  --bg:#f4f6f9; --card:#ffffff; --text:#1a1d29; --muted:#6b7280;
  --primary:#2563eb; --primary-dark:#1d4ed8; --green:#16a34a; --red:#dc2626;
  --border:#e5e7eb; --radius:14px;
}
```
Ganti kode warnanya (`--primary` itu warna aksen utama tombol/badge), simpan, upload ulang — seluruh tampilan otomatis berubah.

## Ganti Logo / Judul
Buka `config.js`:
```js
const APP_TITLE = 'Kasir';
const APP_ICON = '💳';
const APP_LOGO_URL = '';
```
- Ganti `APP_TITLE` buat ubah nama aplikasi.
- Kalau mau pakai logo gambar: buat folder `assets/` di repo, upload gambar logonya (misal `logo.png`), lalu isi `APP_LOGO_URL = 'assets/logo.png'`. Kalau dikosongkan, tetap pakai emoji `APP_ICON`.


## Catatan Penting
- **Password saat ini disimpan plain text** di sheet Users (sesuai permintaan, untuk kemudahan awal). Kalau nanti mau ditingkatkan, saya bisa bantu tambahkan hashing.
- **Status "online"** dihitung otomatis: setiap kasir yang aplikasinya terbuka akan mengirim sinyal ke server tiap 1 menit. Jika tidak ada sinyal lebih dari 5 menit, staff dianggap offline. Ubah durasi ini di `Code.gs` pada `ONLINE_THRESHOLD_MENIT`.
- **Admin fee** pada form Depo saat ini tercatat di data transaksi tapi tidak otomatis dipotong dari saldo — beri tahu saya kalau maunya admin fee mengurangi saldo bank secara otomatis.
- Data contoh (kasir1/123456, dan rekening BCA/BRI/DANA + Kas Utama) sudah dibuat otomatis — silakan sesuaikan.
