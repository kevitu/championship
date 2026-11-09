# KEVITU — Mata mengikut acara (QA handoff)
Branch `feature/event-house-points` sahaja; belum dipindahkan ke `main` dan belum dipasang pada Apps Script LIVE.

## Scope
Public Reader read-only menambah `mata` untuk setiap acara AKTIF/SELESAI dengan empat kunci `MERAH`, `BIRU`, `HIJAU`, `KUNING`. Nilai `null` menandakan belum diisi, nilai `0` ialah 0 mata sebenar. Acara BATAL kekal disembunyikan. Frontend menunjukkan empat petak kecil di bawah tarikh setiap acara. Tiada perubahan pada Admin Bridge, Google Sheets, skor, ranking atau status.

## Langkah pengaktifan
1. Backup source semasa projek GAS `KEVITU Championship - PUBLIC READ` dan rekod versi deployment.
2. Kemas kini `Code.gs` projek Public Reader sedia ada menggunakan `gas/public/Code.gs` daripada branch ini. Simpan dan deploy **New version** pada deployment sama, bukan New deployment.
3. Uji URL `/exec?callback=kevituPublicCallback`: `ok:true`, setiap acara aktif ada `mata` dan nilai skor sepadan dengan tab `MATA_ACARA`. Periksa ranking tidak berubah.
4. Selepas ujian berjaya, pindahkan `app.js`, `styles.css`, `sw.js` daripada branch ke `main`. Hard refresh dashboard dan periksa responsive telefon/desktop.

## Rollback
Jika Reader bermasalah, pulihkan versi GAS Public Reader sebelum perubahan. Frontend boleh kekal kerana `item.mata?.[h.id]` mempunyai fallback `—`; untuk rollback penuh, pulihkan juga tiga fail frontend. Jangan sentuh data sebenar.

## Kriteria penerimaan
- Semua 4 rumah dipaparkan untuk setiap acara.
- Skor 0 berbeza daripada kosong (—).
- Ranking semasa kekal.
- Mata BATAL tidak muncul dan tidak masuk ranking.
- Tiada penulisan data oleh Public Reader.
- Paparan telefon menyusun 2 × 2.
