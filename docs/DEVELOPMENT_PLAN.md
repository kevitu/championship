# KEVITU Championship — Development Plan

## Checkpoint: Fasa 3 Public Reader DEV — 1 November 2026

### Selesai dan disahkan
- Skema empat tab dalam master dan salinan DEV QA diperiksa.
- Backend GAS standalone di DEV menggunakan Script Properties; sambungan dan empat header PASS.
- Ujian pengiraan & identiti Admin daripada Editor PASS.
- Tambah `EVT001` (STRAVA STRIKE 2026 — UJIAN DEV), edit mata MERAH 10→30, kemudian batal: setiap operasi PASS dan data empat tab diverifikasi.
- Ranking selepas batal: keempat-empat rumah 0 mata, kedudukan 1. Sejarah mata dan log kekal.
- Dashboard GitHub Pages tersedia dengan lima logo sebenar.
- Public Reader GAS asing, deployment read-only disambung kepada DEV QA; screenshot pengguna mengesahkan empat rumah dan skor 0 muncul pada GitHub Pages.

### Masih perlu diselesaikan sebelum LIVE
- Admin UI dan kaedah autentikasi Web App yang selamat; ujian penolakan bukan Admin belum selesai.
- Fault-injection/pemulihan journal; Google Sheets bukan pangkalan data bertransaksi.
- Validasi akses serta rekod pertukaran data DEV → LIVE.
- Audit keselamatan endpoint bacaan awam dan keputusan untuk menyembunyikan hasil DEV daripada pelawat umum.
- Paparan responsif telefon/PWA dan polish logo putih jika perlu.

### Susunan kerja seterusnya
1. Selaraskan label UI sebagai DEV (bukan “data rasmi”).
2. Bina UI Admin terkawal dalam persekitaran GAS, bukan memanggil `doPost` Admin secara terbuka daripada GitHub Pages.
3. Uji akses bukan Admin, recovery dan senario minimum.
4. Semak LIVE data, dapatkan kelulusan sebelum deployment rasmi.

## Amalan checkpoint dokumentasi
Kemas kini README + DEVELOPMENT_PLAN + satu ringkasan checkpoint apabila **fasa integrasi utama siap** atau **keputusan seni bina/akses berubah**. Tidak perlu buat dokumen selepas setiap ujian kecil.

## Nota keselamatan
Jangan letak ID spreadsheet Google dalam repo awam. Original commit history pernah memuatkan URL master dan belum dibersihkan; Spreadsheet masih Restricted.
