# KEVITU Sports Championship

Sistem mata terkumpul Kejohanan Sukan KEVITU untuk empat rumah sukan: **Merah**, **Biru**, **Hijau** dan **Kuning**.

## Status projek

**Fasa 0 — Audit awal dan asas repository.** Dashboard Design V1 telah dipersetujui. Belum ada versi aplikasi diterbitkan melalui repository ini.

## Skop MVP yang dipersetujui

- Dashboard responsif untuk desktop dan telefon/PWA.
- AJK Sukan/Admin memasukkan **nama acara** serta **mata setiap rumah**.
- Nilai mata bagi acara ditetapkan oleh **Ketua Biro Sukan**; aplikasi tidak mencipta formula pemberian mata sendiri.
- Kedudukan keseluruhan rumah sukan dikira secara automatik daripada mata acara yang direkodkan.
- **STRAVA STRIKE 2026** merupakan acara pertama.
- Sumber utama ialah spreadsheet Google **Daftar Rumah Sukan Kevitu** dengan tab pendaftaran sedia ada serta tiga tab sistem: `ACARA`, `MATA_ACARA`, dan `KEDUDUKAN`.

## Teknologi yang dirancang

HTML, CSS, JavaScript, PWA, Google Apps Script (GAS), Google Sheets dan GitHub Pages.

## Rujukan

- Repository: https://github.com/kevitu/championship
- Spreadsheet utama: https://docs.google.com/spreadsheets/d/1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E/edit

## Langkah kerja

1. **Fasa 0 — Audit sumber**: semak struktur sebenar spreadsheet, nama kolum, jenis data dan keadaan tab; jangan ganggu pendaftaran sedia ada.
2. **Fasa 1 — Model data dan GAS**: sahkan skema serta bina API untuk acara, mata rumah dan ranking.
3. **Fasa 2 — Frontend Design V1**: hasilkan dashboard dan paparan Admin yang responsif.
4. **Fasa 3 — QA dan PWA**: uji pengiraan, validasi, kebenaran akses dan paparan desktop/telefon.
5. **Fasa 4 — Deployment**: terbitkan secara terkawal selepas semakan.

**Prinsip keselamatan:** jangan andaikan susun atur tab/kolum tanpa audit. Jangan ubah data pendaftaran sedia ada. Data sebenar, akses Admin dan kaedah penerbitan perlu disahkan sebelum integrasi LIVE.
