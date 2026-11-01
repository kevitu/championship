# Security Hardening — 1 November 2026

## Keadaan semasa
- **LIVE backend:** Admin PWA menggunakan Apps Script Execution API; identiti disemak dengan `Session.getActiveUser().getEmail()` terhadap private Script Property `ADMIN_EMAILS` setiap kali operasi; spreadsheet Restricted.
- **PUBLIC READ:** projek GAS berasingan, read-only; pulangkan agregat tanpa senarai peserta.
- **Audit:** perubahan mata dan batal acara direkodkan dalam `LOG_MATA`.
- **Pendedahan identiti:** emel Admin kedua telah dikeluarkan daripada README semasa; **historical Git commits masih mungkin menyimpan maklumat lama**.
- **GitHub source hardening:** legacy `doPost` digantikan dengan penolakan tetap, dan fungsi token-id lama yang tidak digunakan dibuang (**commit e1d06ea**). **Belum deployed ke Apps Script LIVE**; jangan dakwa laluan lama telah ditutup pada production.

## Prosedur deploy terkawal (pemilik Apps Script)
1. Backup/simpan kod Apps Script LIVE sekarang dan catat deployment serta version yang digunakan.
2. Paste **keseluruhan** `gas/bridge/Code.gs` terkini dari GitHub, kemudian Save.
3. Semak Script Properties masih lengkap dan sepadan; **jangan** ubah `ADMIN_EMAILS`, `OAUTH_CLIENT_ID` atau `SPREADSHEET_ID` tanpa semakan.
4. **Deploy → Manage deployments:** edit **setiap deployment aktif** yang mungkin melayani Web App lama atau Execution API supaya semua menggunakan New version hardened. Jangan archive/delete ID semasa yang digunakan PWA.
5. Pastikan `doPost` Web App membalas `Endpoint disabled` (bukan melaksanakan operasi). Jangan hantar token atau data sebenar untuk ujian.
6. Uji login/baca satu acara dengan Admin utama melalui PWA. Jangan buat transaksi mata dummy semata-mata untuk hardening.
7. Uji akaun Google **bukan** dalam whitelist: mesti gagal akses tanpa memaparkan data.
8. Admin kedua sendiri log masuk dan pastikan `Akses Admin disahkan.` dengan akaun yang diluluskan. Tidak perlu submit mata ujian.
9. Catat keputusan dan versi deployment; hanya kemudian tandakan hardening sebagai selesai.

## Risiko masih wujud / tidak dilindungi oleh patch ini
- Keupayaan Google Sheets Editor mengubah helaian secara terus (bukan hanya melalui Admin UI). Had akses dan protected ranges perlu dinilai secara berasingan.
- Backend mutasi berbilang tab tidak menggunakan transaksi atomik; fault injection/recovery QA belum dilaksanakan.
- Exact LIVE Spreadsheet ID berada dalam source public GAS sebagai safety lock; ini bukan credential, namun pendedahan metadata yang wajar diminimumkan pada fasa seterusnya. Jangan buang guard tanpa menggantikannya dengan private pinned ID yang fail-closed.
- OAuth consent dalam Testing dan scopes luas: semak sebelum penggunaan meluas; jangan publish OAuth client secret.
- Git history boleh menyimpan butiran lama meskipun README terkini telah disunting.

**Keputusan:** Dashboard UI V1 LOCK; Security Hardening masih **PENDING LIVE DEPLOY + VERIFICATION**.
