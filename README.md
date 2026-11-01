# KEVITU Sports Championship

Sistem mata terkumpul untuk empat rumah sukan **Merah, Biru, Hijau dan Kuning**.

## Status semasa — 1 November 2026

- **Fasa 0 / 1A:** Audit sumber dan skema empat tab sistem selesai.
- **Fasa 1B — Backend GAS DEV:** pengiraan, tambah acara, edit, batal, kedudukan dan audit berjaya diuji menggunakan spreadsheet **KEVITU Championship - DEV QA**. Journal pemulihan tersedia tetapi belum diuji dengan fault injection.
- **Fasa 2 — Dashboard V1.1:** GitHub Pages aktif, responsive desktop; logo KEVITU dan keempat-empat logo rumah sukan telah dipasang dan dipaparkan.
- **Fasa 3 — Public Reader DEV:** Google Apps Script bacaan sahaja di-deploy berasingan dan dashboard berjaya memaparkan empat rumah dengan mata 0, kedudukan seri 1. Sumber ialah **DEV QA**, bukan keputusan rasmi.

**Dashboard sementara:** https://kevitu.github.io/championship/ — **MOD UJIAN DEV, BUKAN KEPUTUSAN RASMI.**

## Keputusan produk yang LOCK

- Admin/AJK memasukkan nama acara serta mata empat rumah; Ketua Biro Sukan menetapkan mata.
- **Pilihan B Direct Scoring:** simpan terus mengemas kini ranking. Edit dibenarkan selepas persetujuan lisan AJK, menggantikan nilai terdahulu (bukan jumlah berganda).
- Status acara: AKTIF, SELESAI, BATAL. Acara batal dikecualikan.
- Sifar bermaksud mata rasmi 0; kosong bermaksud belum diisi. Seri berkongsi kedudukan.
- STRAVA STRIKE 2026 acara pertama; mata rasmi belum dimasukkan.
- Tab: `ACARA`, `MATA_ACARA`, `KEDUDUKAN`, `LOG_MATA`; tab pendaftaran LIVE tidak disentuh.

## Komponen

- `index.html`, `styles.css`, `app.js`: dashboard web responsif.
- `assets/img/`: lima logo rasmi (KEVITU dan empat rumah sukan).
- `public-config.js`: konfigurasi URL **Public Reader DEV sahaja**, tanpa URL spreadsheet atau kelayakan Admin.
- `gas/Code.gs`: backend GAS Admin — source development, **bukan deployment awam**.
- `gas/public/Code.gs`: GAS pembaca skor sahaja — projek dan deployment berasingan.
- `docs/`: keputusan, seni bina, model data, rancangan dan checkpoint.

## Langkah berikutnya

1. Kemaskan label DEV supaya tiada istilah “data rasmi” ketika ujian.
2. Bangunkan **UI Admin yang berautentikasi**, tidak bergantung pada rahsia/identiti yang dihantar frontend awam.
3. Uji penolakan akses bukan Admin serta pemulihan operasi terganggu.
4. Sambung ke keputusan rasmi dan deploy LIVE **hanya selepas pengesahan dan kelulusan**.

## Keselamatan

Spreadsheet utama kekal Restricted. Jangan commit ID/URL spreadsheet, PIN, email peserta, atau credentials dalam GitHub public. URL spreadsheet pernah terdapat dalam sejarah commit pertama tetapi telah dikeluarkan daripada README semasa; sejarah Git belum dibersihkan. Public Reader hanya mendedahkan ringkasan mata dan acara; tidak membaca tab peserta.

**Dokumentasi checkpoint:** `docs/CHECKPOINT_2026-11-01_FASA3.md`.
