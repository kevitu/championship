# KEVITU Sports Championship 🏆

Sistem pengurusan mata terkumpul dan leaderboard untuk empat rumah sukan KEVITU: **Merah, Biru, Hijau dan Kuning**.

**Status pada 1 November 2026: Dashboard LIVE V1 siap — baseline UI LOCK.**

- **Dashboard rasmi:** https://kevitu.github.io/championship/
- **Admin:** https://kevitu.github.io/championship/admin.html
- **Platform:** GitHub Pages + PWA + Google Apps Script + Google Sheets.
- **Peranti:** desktop, iPad dan Android.

## Fungsi yang siap dan disahkan

- Dashboard LIVE membaca data rasmi melalui GAS **PUBLIC READ** (read-only, berasingan daripada Admin API).
- Admin Google OAuth melalui **Apps Script Execution API**, disekat oleh whitelist emel di backend.
- Admin boleh tambah acara, key-in markah empat rumah, dan batal acara; penyimpanan dan pembatalan berjaya diuji pada spreadsheet LIVE.
- Kedudukan dikira automatik, dengan audit perubahan di `LOG_MATA`.
- Podium desktop disusun **2–1–3–4** (gaya podium sukan), dengan animasi kad, loading skeleton dan rolling numbers. Paparan responsif untuk telefon/tablet.
- Apabila belum ada keputusan rasmi, paparan kekal neutral: **Belum ada kedudukan** — tiada juara palsu.
- Butang **ADMIN** utama di header; seksyen urusetia bawah ialah penerangan sahaja.
- PWA disahkan dipasang melalui **Chrome Android** dan berjalan pada **iPad**. Tangkapan skrin notifikasi pemasangan Android disahkan; pelancaran standalone Android selepas pemasangan belum disahkan.

## Bukti ujian LIVE (1 November 2026)

Satu acara dummy `EVT001` berjaya dicipta melalui Admin PWA. Empat mata ujian **40 / 30 / 22 / 13** sepadan dalam `MATA_ACARA`, `KEDUDUKAN`, paparan dashboard, dan audit `LOG_MATA`.

Acara `EVT001` kemudian **dibatalkan melalui Admin**, status bertukar `BATAL`, transaksi `BATAL_ACARA` direkodkan, dan dashboard kembali kepada **0 mata** untuk setiap rumah. Rekod audit sengaja dikekalkan. **Jangan padam baris ujian secara manual.**

## Sumber data dan keselamatan

- Spreadsheet rasmi ialah **Daftar Rumah Sukan Kevitu** (akses Restricted).
- Tab sistem: `ACARA`, `MATA_ACARA`, `KEDUDUKAN`, `LOG_MATA`.
- Tab pendaftaran `Form Responses 1` tidak disentuh.
- Admin dan Public Reader terikat kepada sumber LIVE yang diluluskan; Script Properties dan kelayakan OAuth tidak disimpan dalam kod frontend.
- Admin utama telah membuktikan operasi LIVE. Akaun kedua (Ketua Biro Sukan) telah dikonfigurasi sebagai OAuth Test User / whitelist / Editor, tetapi **pengesahan login dengan identiti akaun kedua secara khusus masih belum direkodkan**.
- Public Reader hanya mendedahkan agregat markah dan senarai acara — bukan maklumat peribadi peserta.
- Sejarah commit awal mungkin mengandungi rujukan sumber lama; jangan anggap pemadaman daripada README menghapuskan sejarah Git.

## Keputusan produk (LOCK)

1. **Direct Scoring:** markah dimasukkan oleh Admin berdasarkan keputusan Ketua Biro Sukan; sistem tidak mereka markah.
2. Edit menggantikan markah terdahulu, bukan menambah dua kali.
3. Mata `0` ialah sah; kosong bermaksud belum dimasukkan.
4. Acara `BATAL` dikecualikan daripada ranking tetapi audit disimpan.
5. Seri menggunakan kedudukan bersama.
6. **STRAVA STRIKE 2026** dirancang sebagai acara rasmi pertama; mata rasmi belum dimasukkan.
7. Susunan podium selepas ada ranking: desktop **2 | 1 | 3 | 4**; mobile juara di atas.

## Struktur projek

| Lokasi | Fungsi |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Dashboard, podium, animasi dan responsive UI |
| `admin.html`, `admin-auth.js`, `admin-config.js` | Admin PWA + Google OAuth + Apps Script Execution API |
| `public-config.js` | Endpoint PUBLIC READ sahaja |
| `manifest.webmanifest`, `sw.js`, `pwa.js` | PWA dan cache app shell |
| `assets/img/`, `assets/icons/` | Logo rasmi rumah dan ikon PWA |
| `gas/bridge/Code.gs` | Backend Admin Bridge |
| `gas/public/Code.gs` | Public Reader read-only |
| `docs/` | Dokumentasi keputusan dan checkpoint |

## Panduan dan audit keselamatan

- [Manual ringkas Admin](docs/MANUAL_ADMIN_KEVITU.md)
- [Security Hardening — status dan prosedur deployment](docs/SECURITY_HARDENING_2026-11-01.md)

**Security Hardening belum LOCK:** kod legacy Web App telah dimatikan di GitHub, tetapi deployment LIVE masih perlu dikemas kini serta disahkan. Dashboard UI V1 kekal LOCK.

## Status yang masih terbuka (bukan blocker Dashboard V1)

- Pengesahan khusus akses **Admin kedua** melalui akaun Ketua Biro Sukan yang diluluskan.
- Kemasan latar putih pada logo Rumah **Biru** dan **Kuning**.
- Fail PNG ikon PWA 192×192 / 512×512 belum berada di repo; ikon SVG kini digunakan.
- Ujian pemulihan partial-write/fault injection belum direkodkan.
- Pelancaran standalone Android selepas pemasangan belum disahkan secara berasingan.

**Dashboard LIVE V1 siap.** Sebarang penambahan ciri selepas ini ialah penambahbaikan berasingan dan tidak mengubah keputusan atau markah rasmi tanpa kebenaran.
