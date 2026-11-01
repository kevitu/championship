# Manual Ringkas Admin — KEVITU Sports Championship

**Untuk:** Admin utama dan Ketua Biro Sukan KEVITU (akaun Google yang diluluskan sahaja).  
**Versi:** 1 November 2026 — Dashboard LIVE V1.

## Akses
1. Buka https://kevitu.github.io/championship/admin.html menggunakan Chrome atau pelayar moden.
2. Klik **Sign in with Google** dan pilih akaun yang telah dibenarkan oleh urusetia.
3. Baca prompt Google dengan teliti sebelum membenarkan OAuth. Jangan kongsi akaun, kod login atau tangkapan layar token.
4. Pastikan status **Akses Admin disahkan.** muncul. Jika akses gagal, hubungi urusetia; jangan cuba guna akaun lain tanpa kelulusan.

## Tambah acara dan mata
1. Pada pilihan **Acara**, pilih **+ Acara baharu**.
2. Isi **Nama acara**, **Tarikh acara** dan status **AKTIF** atau **SELESAI**.
3. Masukkan mata **Merah / Biru / Hijau / Kuning** mengikut keputusan rasmi Ketua Biro Sukan. **0** ialah markah sah; ruangan kosong bermaksud belum diisi.
4. Semak semua angka. Tekan **Simpan Mata** **sekali sahaja**.
5. Tunggu mesej **Berjaya: EVTxxx**. Jika sambungan gagal/ralat, semak acara dan Google Sheets sebelum cuba sekali lagi — elakkan pendua.
6. Dashboard https://kevitu.github.io/championship/ akan membaca kedudukan terkini. Cache Public Reader boleh mengambil sehingga kira-kira **60 saat**.

## Kemaskini atau batal acara
- **Edit:** pilih acara sedia ada daripada dropdown, betulkan nilai, kemudian **Simpan Mata**. Nilai baharu menggantikan nilai lama, bukan menambah dua kali.
- **Batal:** pilih acara, tekan **Batal Acara** dan sahkan. Acara `BATAL` tidak lagi menyumbang mata, tetapi rekod dan audit kekal.
- **Jangan** padam atau edit baris secara manual di tab `ACARA`, `MATA_ACARA`, `KEDUDUKAN` atau `LOG_MATA`.

## Sebelum tamat
- Klik **Log keluar** jika selesai, terutamanya pada peranti berkongsi.
- Jangan kongsi kebenaran Editor Google Sheets kepada orang yang tidak diluluskan.
- Jika ragu-ragu tentang mata atau status acara, dapatkan pengesahan Ketua Biro Sukan terlebih dahulu.

## Tindakan jika gagal login
- Semak akaun Google yang dipilih betul.
- Pastikan dibuka dalam Chrome atau browser biasa, bukan WebView WhatsApp/Telegram.
- Ambil screenshot **mesej ralat sahaja** (jangan tunjuk token, secret atau senarai akaun peribadi) dan maklumkan urusetia.
- Pengesahan pertama akaun Admin kedua perlu dilakukan oleh pemilik akaun itu sendiri.
