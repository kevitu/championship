# Backend GAS — Fasa 1B

**Status: SOURCE DRAFT; NOT DEPLOYED; NO LIVE DATA WRITTEN.**

## Files
- `Code.gs` — bound Google Apps Script intended for restricted master workbook.

## Contract
- `doGet`: dashboard ringkasan rumah/acara sahaja (tiada data peserta, PIN atau URL spreadsheet).
- `doPost` (Admin sahaja): `save_event` dan `cancel_event`.
- `save_event` payload: `{action:"save_event",id_acara?:"EVT001",nama_acara:"...",tarikh_acara:"YYYY-MM-DD",status:"AKTIF"|"SELESAI",catatan:"...",mata:{MERAH:10,BIRU:20,HIJAU:0,KUNING:null}}`. `null` bermaksud belum diisi.
- `cancel_event` payload: `{action:"cancel_event",id_acara:"EVT001"}`.
- Ranking berubah selepas simpan/edit; pembatalan mengecualikan mata.
- Edit meminda rekod sedia ada dan menulis log perubahan; seri: 1,1,3,4.

## Kritikal sebelum deploy

1. Semak/pulihkan isu write partial failure: operasi merentas tab Google Sheets **bukan transaksi atomik**. Tambah reconciler atau recovery sebelum production.
2. Autentikasi wajib fail-closed: `Session.getActiveUser().getEmail()` mesti dapat identiti sebenar dan berada dalam Script Properties `ADMIN_EMAILS` (senarai comma-separated). **Jangan** deploy `doPost` sebagai web app awam yang execute-as-owner dengan anggapan email ialah peserta/Admin.
3. Untuk dashboard awam, bina deployment/read service berasingan jika perlu; jangan dedahkan fungsi Admin.
4. Verify backend terhadap salinan Sheets QA, bukan data LIVE. Semak tarikh, angka 0 vs kosong, duplicate IDs, pembatalan, concurrent edits dan audit.
5. Tiada spreadsheet ID, API key, atau credentials ditulis dalam repository public.

## Test manual awal
Jalankan `testKevituAggregate_` dalam GAS editor yang bound kepada **salinan QA**, bukan LIVE. Ujian ini tidak menulis ke Sheets.

## Semakan keselamatan tambahan
Pastikan formula injection dihalang pada input teks sebelum menyimpan ke Sheets (awalan '=', '+', '-', '@', tab). Tambah sebelum production.
