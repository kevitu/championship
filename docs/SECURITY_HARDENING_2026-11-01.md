# KEVITU Security Hardening V8 — Penutupan Operasi (1 November 2026)

**Keputusan pemilik:** Hardening V8 dianggap mencukupi bagi skop pertandingan rumah sukan semasa. **Tiada perubahan kod atau deployment diperlukan oleh penutupan dokumentasi ini.** Penilaian ini bukan pensijilan keselamatan atau jaminan tiada risiko.

## Sistem rasmi yang kekal digunakan
- **GitHub production:** `main`; dashboard https://kevitu.github.io/championship/ dan Admin https://kevitu.github.io/championship/admin.html.
- **Backend Admin LIVE:** Apps Script Execution API, deployment ditunjukkan pemilik sebagai **Version 8 — Security Hardened** pada 1 November 2026. `admin-auth.js` di `main` kekal menggunakan kontrak V8.
- **PUBLIC READ:** Apps Script berasingan; hanya memulangkan data agregat kedudukan/acara. Kod pembaca tiada fungsi mutasi.
- **Google Sheets:** `Daftar Rumah Sukan Kevitu` ialah **satu-satunya spreadsheet rasmi**. Data `ACARA`, `MATA_ACARA`, `KEDUDUKAN`, `LOG_MATA` dan tab pendaftaran kekal.
- **QA V9:** branch `security/v9-transaction-integrity-qa` ialah hasil penyelidikan/ujian; **bukan production**, tidak digabungkan dan tidak dideploy. Jangan ikut runbook V9 secara automatik.

## Kawalan keselamatan yang ada pada V8
1. Admin login menggunakan Google OAuth melalui Execution API.
2. Setiap entrypoint Admin memanggil pemeriksaan server-side `Session.getActiveUser().getEmail()` terhadap private `ADMIN_EMAILS`; frontend tidak menjadi sumber autorisasi.
3. Backend memerlukan padanan tepat `SPREADSHEET_ID` dengan workbook yang diluluskan (fail-closed).
4. Source Bridge V8 menutup legacy `doPost()` dengan respons `Endpoint disabled`; deployment V8 telah dikemas kini menurut tindakan dan screenshot pemilik, tetapi ujian HTTP langsung bagi endpoint tidak direkodkan.
5. Dua deployment Admin Bridge lama (V6 dan V2) ditunjukkan telah di-archive. PUBLIC READ ialah projek lain dan kekal.
6. Input acara/mata mempunyai validasi asas, operasi menggunakan `LockService`, dan tindakan mata/pembatalan merekodkan audit di `LOG_MATA`.
7. Source PUBLIC READ ialah read-only dan tidak mendedahkan senarai peserta.
8. README HEAD telah dibersihkan daripada email Admin kedua. **Sejarah Git lama berpotensi masih mengandungi maklumat tersebut**; jangan simpan rahsia dalam repository.

## Bukti operasi dan batas verifikasi
| Item | Keputusan |
|---|---|
| Admin utama login ke V8 selepas hardening | **PASS (screenshot pemilik)** — `Akses Admin disahkan.` |
| OAuth bukan Test User | **PASS** — cubaan pengguna luar ditolak oleh Google dengan 403 sebelum backend |
| Backend whitelist menolak OAuth Test User yang tidak di-`ADMIN_EMAILS` | **NOT VERIFIED secara langsung** |
| Simpan mata, batal acara, ranking dashboard | **PASS pada ujian LIVE terdahulu**; selepas patch V8, ujian tulis baharu tidak dijalankan |
| Deployment Bridge lama di-archive | **PASS berdasarkan screenshot pemilik** |
| Exact deployed GAS bytes, active deployment ACL, Google Sheets Editors, GAS quotas | **NOT VERIFIED secara bebas** |
| Ujian V9-A/V9-B mock | Direkodkan pada branch QA; **bukan bukti V8 production PASS** |

## Matlamat praktikal: lindungi data mata
- Pengguna awam **tidak** mempunyai fungsi tulis melalui Public Reader atau dashboard.
- Hanya akaun Google yang dibenarkan oleh backend Admin sepatutnya boleh melakukan operasi Admin melalui API rasmi.
- **Penting:** Sesiapa yang mempunyai kebenaran **Editor** pada spreadsheet, atau akses menulis melalui skrip/credential lain yang dipercayai, mungkin boleh mengubah data secara langsung di luar Admin PWA.
- Pemilik perlu mengekalkan **Google Sheets > Share > General access: Restricted** dan menghadkan **Editor** kepada petugas benar-benar diperlukan. Senarai Editor sebenar belum disahkan dalam sesi ini.
- Simpan backup spreadsheet dan kawal akses kepada Apps Script, OAuth, dan Script Properties.

## Risiko diterima untuk fasa ini
- V8 bukan transaksi atomik merentas berbilang tab: duplicate submit, partial write dan recovery mempunyai risiko yang dikenal pasti dalam mock audit; tidak dilindungi secara menyeluruh oleh hardening V8.
- Direct Sheet Editor, pemilik skrip dan kemungkinan legacy writer lain berada di luar kawalan frontend whitelist.
- `SPREADSHEET_ID` tepat terdapat dalam source sebagai safety pin; ia bukan kata laluan. Jangan terbitkan `ADMIN_EMAILS`, token atau secret.
- Tiada pensijilan 9/10 atau tuntutan bahawa tiada siapa boleh mengubah data dalam semua keadaan.

## Keputusan penutup
**V8 LIVE kekal tanpa perubahan; Security Hardening V8 ditutup sebagai mencukupi untuk operasi semasa berdasarkan risiko yang diterima pemilik.** Pembangunan/penambahbaikan fungsi biasa boleh diteruskan; isu keselamatan yang nyata boleh ditangani kemudian secara minimum. V9 QA disimpan sebagai rujukan sahaja.

**Safety:** Dokumen ini sahaja dikemas kini pada `main`; tiada perubahan kod, OAuth, Script Properties, deployment, Google Sheets, PR atau merge V9.
