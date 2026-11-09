# Tambah Tarikh Mula dan Tarikh Tamat — KEVITU

**Status: patch GitHub dalam branch `feature/event-date-range`; belum aktif di LIVE.**
Hanya metadata tempoh acara. **Tiada auto-lock, auto-close, auto-change status atau perubahan logik mata.**

## Struktur satu spreadsheet rasmi
Dalam tab `ACARA`, **jangan ubah/selit/pindah kolum A:G**. Isi **H1 = `TARIKH_TAMAT`**. Kolum C `TARIKH_ACARA` kekal menjadi Tarikh Mula; rekod lama tidak dipadam dan H boleh kosong. Untuk Strava Strike Challenge, Tarikh Tamat boleh diisi melalui Admin selepas backend baharu aktif.

## Urutan pengaktifan (pemilik)
1. Simpan backup spreadsheet dan source/deployment GAS Admin Bridge serta Public Reader sekarang; rekod nombor versi/API deployment.
2. Dalam **spreadsheet rasmi sahaja**, tambah header `TARIKH_TAMAT` di **ACARA!H1**. Jangan padam/mindahkan kolum sedia ada; jangan sentuh `Form Responses 1`.
3. Dalam projek **KEVITU Admin Bridge - DEV** yang sedang melayani LIVE, ganti source daripada `gas/bridge/Code.gs` branch patch dan simpan; deploy **New version** pada deployment ID aktif yang digunakan PWA (kekalkan ID), bukan projek baharu. Pastikan OAuth `userinfo.email` dan whitelist sedia ada tidak diubah.
4. Dalam projek **KEVITU Championship - PUBLIC READ**, ganti source daripada `gas/public/Code.gs` branch patch; deploy New version pada deployment aktif yang sama (kekalkan URL).
5. **Hanya selepas backend dan Reader siap**, pindahkan perubahan frontend `admin.html`, `admin-auth.js`, `app.js` dan `sw.js` ke `main`. GitHub Pages akan menggunakan UI baharu.
6. Test read-only: log masuk Admin, pilih rekod sedia ada, sahkan Tarikh Mula dan Tarikh Tamat (jika ada), dashboard acara/podium/ranking. Jika mahu isi tarikh tamat rekod lama, buat sebagai kemas kini Admin yang diluluskan selepas backup.

**Kenapa tidak terus push frontend ke main:** backend V8 lama mengabaikan `tarikh_tamat` lalu UI boleh kelihatan menyimpan tempoh walaupun data tidak direkod. Memisahkan rollout mengelakkan keadaan itu.

## Tingkah laku
- Acara baharu: kedua-dua tarikh perlu dipilih; end date >= start date.
- Acara sedia ada: H kosong dibenarkan (rekod lama boleh terus diedit).
- Status `AKTIF`, `SELESAI`, `BATAL` **tidak** bergantung kepada tarikh.
- Mata empat rumah, audit, pengiraan ranking, pembatalan, OAuth, whitelist dan Public Reader read-only dikekalkan.

## Rollback ringkas
Jangan rollback source sahaja sambil menganggap schema lain masih sama. Jika belum memindahkan frontend, deploy semula versi GAS dahulu jika perlu; header H tambahan tidak mengganggu V8 kerana V8 hanya membaca A:G. Jika frontend sudah diaktifkan, kembalikan frontend ke versi sebelum perubahan sebelum revert backend. Jangan padam data H, audit atau rekod acara.
