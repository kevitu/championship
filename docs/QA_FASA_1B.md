# KEVITU Fasa 1B — QA Logik (31 Oktober 2026)

## Status

**9/9 ujian pure JavaScript PASS** selepas pembetulan `ba3c875`. Test dijalankan terhadap fungsi yang dimuat daripada `gas/Code.gs` menerusi sambungan GitHub, tanpa menjalankan Google Apps Script atau menulis ke Google Sheets.

| Ujian | Hasil |
|---|---|
| Mata seri 1,1,3,4 | PASS |
| Acara BATAL dikecualikan | PASS |
| Mata rasmi 0 berbeza dengan belum diisi | PASS |
| Rekod mata rumah pendua ditolak | PASS |
| Mata negatif ditolak | PASS |
| Nama rumah tambahan ditolak | PASS |
| Nama acara bermula formula ditolak | PASS |
| Empat rumah wajib hadir dalam input | PASS |
| Status acara tidak dikenali tidak layak ranking | PASS |

## Isu yang telah diperbaiki

- **Input formula injection** pada nama acara/catatan disekat melalui validator teks.
- **Input empat rumah tidak lengkap** kini ditolak.
- **Status tidak sah** tidak lagi dianggap acara aktif ketika aggregation.

## BLOCKERS sebelum GAS deployment LIVE

1. **GAS web-app auth:** `Session.getActiveUser().getEmail()` mungkin kosong atau merujuk pemilik mengikut mod deploy. Uji dengan akaun bukan Admin; jangan guna public execute-as-owner untuk `doPost`.
2. **Partial write:** simpan merentas `ACARA`, `MATA_ACARA`, `LOG_MATA`, `KEDUDUKAN` bukan atomik. Perlukan recovery/reconciliation, QA fault injection dan keputusan kalau log gagal.
3. **Duplicate/validation preflight:** tambah validasi ID acara pendua dan data lembaran yang korup, serta cara pemulihan.
4. **Date / timezone:** simpan `TARIKH_ACARA` sebagai string YYYY-MM-DD atau format tarikh standard dalam Sheets, dengan paparan MYT yang konsisten.
5. **QA GAS sebenar:** buat salinan QA restricted, jalankan create/edit/cancel/readonly scenarios di situ; jangan diuji pada master LIVE.

**Tiada salinan QA dicipta, tiada deploy, tiada data LIVE diubah.**
