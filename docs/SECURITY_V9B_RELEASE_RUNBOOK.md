# KEVITU Security V9-B — Migration, Deployment and Rollback Runbook

**QA candidate only — NOT DEPLOYED.** Pelan ini untuk semakan pemilik kemudian. Ia tidak membenarkan tindakan production dalam sesi ini.

Code candidate: a65d55200ac0495f68d1ba2c2d4a4a6d7a79952d  
Branch: security/v9-transaction-integrity-qa  
Specification: SECURITY_V9B_INTEGRATION_PLAN.md at 4093aaf33a2317359079a0e72f0709d1d7ee783a.

## 1. Perubahan kontrak dan pemilikan

| Komponen | Pemilikan dan kontrak |
|---|---|
| Admin PWA | Menggunakan backend context protocol9/publication_protocol1; request_id kekal dan expected_revision untuk edit/cancel. Token OAuth hanya dalam memori. |
| Bridge | Satu-satunya penulis yang diluluskan bagi business tables, journal, immutable snapshot dan pointer. Semua lapan API mengesahkan Session/whitelist. |
| Public Reader | Membaca pointer + immutable snapshot sahaja; tiada raw-table fallback, tiada mutasi Sheets atau perkongsian lock dengan Bridge. |
| Dashboard | Memerlukan metadata signed_committed_snapshot, menunjukkan masa publication sebenar dan mengekalkan mata perpuluhan. Tiada redesign. |
| Owner/operator | Menyemak legacy data, provision tab, melindungi access, memasang private signing key, mengurus heartbeat/capacity serta meluluskan cutover. |

Helper sensitif berada dalam lexical closures. Hanya explicit wrappers dieksport di peringkat global; kawalan ini tidak bergantung pada andaian bahawa underscore menyekat Execution API. Reader hanya mengeksport doGet dan publicSnapshot_ yang read-only. Routing sebenar Google masih memerlukan staging verification.

OAuth client ID, API scopes dan pin workbook sedia ada tidak diubah. API_URL dalam source Admin masih konfigurasi sedia ada; **jangan buka QA frontend untuk real sign-in terhadap endpoint V8 LIVE**. Real-service QA kemudian memerlukan build/endpoint QA yang diluluskan. Ujian dalam fasa ini menggunakan mock fetch dan CSP localhost, bukan token Google sebenar.

## 2. Schema wajib — tujuh tab

Empat schema business sedia ada dikekalkan:

~~~text
ACARA:
ID_ACARA,NAMA_ACARA,TARIKH_ACARA,STATUS,CATATAN,DICIPTA_PADA,DIKEMASKINI_PADA

MATA_ACARA:
ID_ACARA,RUMAH_SUKAN,MATA,DIKEMASKINI_PADA,DIKEMASKINI_OLEH

KEDUDUKAN:
RUMAH_SUKAN,JUMLAH_MATA,KEDUDUKAN,JUMLAH_ACARA,DIKEMASKINI_PADA

LOG_MATA:
ID_LOG,TIMESTAMP,ID_ACARA,RUMAH_SUKAN,MATA_LAMA,MATA_BAHARU,TINDAKAN,ADMIN_ID
~~~

Tab tambahan:

| Tab | Header tepat | Kandungan |
|---|---|---|
| V9_JOURNAL | REQUEST_ID,FINGERPRINT,STATE,PLAN_JSON,CHECKSUM,RESULT_JSON | Satu operasi per baris; PREPARED, COMMITTED atau CLOSED. PLAN_JSON mengandungi plan_hmac. |
| V9_PUBLIC_SNAPSHOTS | SNAPSHOT_JSON | Satu JSON immutable yang lengkap bagi setiap generation; tiada data peribadi/audit actor. |
| V9_PUBLIC_POINTER | POINTER_JSON | Header di A1; hanya satu signed descriptor di A2. |

Provision sekurang-kurangnya 2,001 grid rows serta bilangan kolum yang diperlukan. Kod tidak mencipta tab/header atau mengubah sharing/protection secara automatik.

Had fail-closed:
- 2,000 data rows per business table dan journal.
- 2,000 snapshot rows, termasuk bootstrap; maksimum 1,999 generation baharu selepas satu bootstrap.
- Snapshot JSON maksimum 40,000 characters; had ini boleh dicapai sebelum had baris.
- PLAN_JSON maksimum 40,000 characters.
- Tiada automatic pruning/expiry bagi request identity. CLOSED tombstone juga menggunakan kapasiti journal.

Jangan padam journal atau kitar semula request_id untuk melepasi had. Archival/seasons/capacity expansion ialah migration berasingan yang mesti mengekalkan registry idempotency.

## 3. Private configuration

Properties lama:
- SPREADSHEET_ID — mesti padan exact pinned workbook.
- ADMIN_EMAILS — whitelist peribadi sedia ada.
- OAUTH_CLIENT_ID — konfigurasi sedia ada.
- BRIDGE_V9_ENABLED — mutations/recovery/publish/close hanya apabila string true.

Property baharu di Bridge dan Reader:
- PUBLIC_SNAPSHOT_HMAC_KEY — private shared signing key, 32–200 characters; owner hendaklah menggunakan sekurang-kurangnya 256 bits entropy daripada penjana yang diluluskan.

Tiada nilai sebenar dijana, dipasang atau digunakan di sini. Fixture key ialah sintetik. Jangan simpan private key dalam Sheets, browser, Git, screenshot, logs atau laporan. Simpan backup konfigurasi sensitif melalui kaedah pemilik yang selamat.

Key ini mengesahkan journal plan dengan domain KEVITU_JOURNAL_V9B dan signed publication descriptor. CHECKSUM biasa hanya mengesan corruption; ia tidak menggantikan HMAC.

**Key rotation bukan pertukaran property biasa:** semua journal lama dan snapshot/pointer memerlukan key yang sepadan. Key loss/rotation tanpa migration akan menyebabkan fail-closed. Reka dan semak proses rotation/key-ring/re-sign yang berasingan; jangan re-sign data yang asal-usulnya belum disahkan.

## 4. Transaction dan publication protocol

1. Authenticate Session/whitelist; validate input, headers, uniqueness, revision, signed journal dan published source-state commitment.
2. Persist immutable PREPARED plan, checksum dan HMAC; flush/readback sebelum business writes.
3. Replay hanya exact before-image kepada exact after-image. Skip exact after-image. Foreign edits, formula, partial row atau signature rosak menyebabkan stop.
4. Semak ACARA, MATA_ACARA, LOG_MATA, KEDUDUKAN dan complete after-state. Persist COMMITTED, flush dan readback.
5. Hanya selepas COMMITTED disahkan dan tiada PREPARED, bina snapshot deterministic bagi state committed.
6. Reuse immutable JSON row yang sama jika telah ditulis. Append jika belum ada; flush/readback. Jangan overwrite historical snapshot.
7. Tulis satu signed pointer cell; flush/readback dan sahkan semula sebelum acknowledge hasil kepada Admin.
8. Jika publication gagal selepas COMMITTED, generation lama kekal untuk awam. New writes/list Admin diblok dengan recovery-required sehingga retry/recovery menyiapkan publication.
9. Retry committed request memulangkan result asal. Publication retry yang sudah berjaya tidak menjana timestamp/snapshot tambahan.

Generation ialah bilangan COMMITTED records. PREPARED dan CLOSED tidak dikira. CLOSED bermaksud permintaan tidak dilaksanakan dan tidak boleh dilaksanakan kemudian.

Descriptor yang ditandatangani mengikat schema, workbook scope, row, snapshot SHA-256, generation, source_hash bagi keseluruhan business state, published_at dan expires_at. source_hash ialah commitment, bukan raw audit/identiti. HMAC melindungi commitment daripada pemalsuan oleh editor Sheet yang tidak mempunyai private key.

Reader mengesahkan descriptor sebelum menggunakan row/time, membaca snapshot immutable, membaca descriptor kedua dan memerlukan kedua-dua string tepat sama. JSON, hash, signature, generation, schema, duplicate ID termasuk BATAL, tarikh/nama/mata serta ranking semuanya disahkan. Helper decimal sama tingkah laku dengan backend; Reader tidak membaca business tabs atau journal.

Ini **bukan atomic multi-tab commit**. Business rows masih boleh separa siap secara fizikal. Public isolation datang daripada immutable committed publication, bukannya independent ScriptLock.

## 5. Freshness dan last-known-good

- Pointer sah selama 24 jam; clock masa depan melebihi tolerance lima minit ditolak.
- Cache maksimum 60 saat. Signature, pin, key dan expiry disemak pada setiap cache hit.
- Cache hanya digunakan bagi packed data yang bounded; snapshot besar boleh diserve uncached. Cache write failure tidak mengubah data yang sudah diverifikasi menjadi raw-table fallback.
- Ketika PREPARED atau publication gagal, Reader boleh menyajikan snapshot committed terdahulu selagi signature dan expiry sah.
- Pointer/payload invalid atau expired tidak menyebabkan bacaan raw business tables.
- Replay signed snapshot lama yang masih belum luput boleh memberi paparan lebih lama. Ia kekal coherent dan bounded stale; protokol ini **tidak membuktikan latest generation secara mutlak** terhadap editor yang boleh mengembalikan descriptor lama.
- Dashboard menunjukkan publication timestamp/generation, bukan masa halaman dibuka.

Owner mesti menyediakan mekanisme renewal yang diluluskan dan diuji. **Blocker semasa:** v9EnsurePublished_ memulangkan pointer sedia ada selagi belum expired, jadi apiPublishKevituSnapshot setiap 12 jam tidak menjamin renewal sebelum 24 jam. Selepas expiry, panggilan boleh re-sign pointer kepada row sama; ini meninggalkan kemungkinan outage dan bukan bukti uninterrupted freshness. Pilihan manual/trigger dan identiti pelaksana mesti disahkan dalam QA sebenar dahulu. Tiada trigger, automation atau heartbeat production dicipta oleh tugasan ini.

## 6. Request identity dan UX

apiGetKevituAdminContext() mengesahkan backend dan mengembalikan protocol, publication_protocol serta actor/scope hashes tanpa e-mel atau secret.

Admin menggunakan Web Locks dengan ifAvailable dan durable localStorage bagi metadata:
~~~text
schema,actor,scope,action,payload
~~~
Payload mengandungi request_id dan, untuk edit/cancel, expected_revision daripada verified list. Ia dikunci semasa unresolved. Token tidak disimpan; logout/reload memerlukan authentication baharu sebelum retry.

- New logical operation: jana request_id sekali, persist/readback, kemudian hantar.
- Retry: payload dan ID asal, termasuk revision asal.
- ACK: hanya result terminal dengan request_id dan field yang sepadan membenarkan pending metadata dibuang.
- STALE_REVISION: tahan request asal, jangan ubah revision atau hantar ID baharu secara senyap.
- RECOVERY_REQUIRED: retry request asal atau rujuk operator.
- Unknown/network timeout: kekalkan metadata; jangan anggap NOT_FOUND selamat untuk discard.
- Web Locks/UUID/storage tiada atau gagal: tiada mutasi dihantar.
- Reauthentication mengganti token tanpa revoke grant token baharu; explicit logout sahaja melakukan revoke.

apiCloseKevituRequest({action,payload}) menyelesaikan ketidakpastian secara durable:
- Jika request belum bermula, simpan authenticated CLOSED tombstone dan pulangkan CLOSED_UNAPPLIED.
- Jika sudah PREPARED, lengkapkan operasi asal.
- Jika sudah COMMITTED, pulangkan result asal selepas publication disahkan.
- Late/delayed request dengan ID sama tidak boleh mencipta acara baharu selepas CLOSED.
- Pelaku/payload lain dengan request_id sama ditolak.
- CLOSED juga hanya dianggap resolved selepas matching terminal result.

Jangan clear browser storage untuk “membaiki” unknown outcome. Operator perlu menyemak backend terlebih dahulu; storage reset tidak membatalkan request yang mungkin masih berjalan.

## 7. Controlled migration — satu spreadsheet rasmi, belum dilaksanakan

### A. Dasar pemilik dan gate sebelum cutover
Keputusan pemilik 1 November 2026: kekalkan hanya spreadsheet rasmi **Daftar Rumah Sukan Kevitu**. Jangan cipta spreadsheet QA atau projek GAS tambahan. Gunakan projek Bridge dan Reader sedia ada sahaja. Bahagian staging lama digantikan oleh dasar ini; pelan bukan kebenaran deploy.

1. Mock/VM/worker/local-browser QA kekal di luar Google LIVE. Jangan halakan runner atau fault/concurrency tests ke workbook rasmi.
2. Read-only preflight: sahkan workbook ID, tujuh schema, grid/capacity, formulas/legacy consistency, sharing/protection, semua writers/triggers, deployed versions, API Executable mapping dan Reader URL. Jangan baca atau paparkan nilai private key.
3. Ujian Google sebenar yang memerlukan save/cancel/recovery/CLOSED/fault/concurrency kekal NOT VERIFIED. Satu workbook tidak memberi isolation; gate ini tidak boleh dianggap PASS atau dipindahkan ke LIVE. Jika polisi kekal, pemilik perlu membuat keputusan penerimaan risiko secara eksplisit sebelum release; ia tidak membuktikan correctness Google.
4. Selesaikan dua blocker freshness dalam source QA dahulu: publication tanpa perubahan tidak renew pointer sebelum expiry; dashboard tidak revalidate expiry selepas initial render. Tambah focused mock/time tests apabila pembaikan diberi skop. Tiada pembaikan source dibuat dalam audit ini.
5. Login/Session, outsider denial dan export routing boleh diperiksa kemudian melalui deployment sedia ada dengan approval yang sesuai dan panggilan read-only sahaja. Walau bagaimanapun :run ialah HTTP POST dan mesti memilih function read-only yang disemak; jangan jalankan helper atau publish.
6. Backup ialah fail luar talian terenkripsi/access-controlled, bukan spreadsheet Google baharu. Export .xlsx sahaja bukan backup lengkap: simpan nilai bertip, formulas, format/validation, grid, sheet IDs/names, protections/ACL serta sumber dan deployment mapping. Verify completeness/checksums dan rehearsal restore dengan parser/mock lokal. Jangan import backup sebagai Google Sheet baharu.
7. Rekod bukti, batas dan risk decision. Jika gate belum ditutup, STOP sebelum migration/deploy.

### B. Reconcile legacy data sebelum release
1. Freeze semua legacy writers dan sahkan inventory deployments/triggers. Independent old GAS writers/direct editors tidak berkongsi lock/protokol ini.
2. Backup source, version/deployment mapping, semua tab dan konfigurasi sensitif dengan access terkawal.
3. Reconcile event/score ID uniqueness termasuk BATAL, orphan, formula, score bounds, tarikh, ranking dan audit. Jangan mencipta audit lama yang tidak diketahui.
4. V8 LIVE belum mempunyai V9 journal; mulakan journal kosong selepas baseline disahkan.
5. Jika menggunakan semula data QA V9-A yang sudah mempunyai journal tanpa plan_hmac: **stop**. Ia memerlukan migration/sealing yang disemak daripada provenance yang terbukti. Kod V9-B tidak auto-trust atau auto-sign journal lama.
6. Lindungi business tabs, journal dan publication ranges daripada editor yang tidak dibenarkan. Approved Google/Script project editors dengan private key atau kuasa mengganti source kekal trusted principals.

### C. Cutover serentak yang dikawal
1. Dapatkan release approval berasingan. Tiada merge/deploy dibenarkan oleh dokumen ini.
2. Kekalkan maintenance window dan kawalan akses owner/operator; hentikan legacy Admin/direct writers.
3. Pasang exact reviewed Bridge build dengan gate disabled pada awalnya; provision schema, key dan protections.
4. Pasang Reader baharu sebelum membenarkan V9 business writes. Reader yang tiada snapshot mesti fail closed; jangan kekalkan V8 raw Reader bersama writer V9.
5. Dalam fasa owner-only maintenance yang diluluskan, enable gate secukupnya untuk authenticated apiPublishKevituSnapshot() bootstrap daripada legacy state yang telah direconcile. Jangan benarkan concurrent legacy edits.
6. Sahkan signed generation0/committed baseline, source commitment, snapshot totals/ties/BATAL, pin, expiry dan read-only behaviour.
7. Lepaskan Admin/frontend/dashboard yang sepadan. Pastikan app-shell update diperoleh. Service worker sedia ada network-first dan tidak diubah; uji stale/offline assets supaya fail closed, bukan fallback kepada kontrak V8.
8. Rekod code SHA → GAS immutable version → deployment → frontend/Reader version → schema/key custody. Jangan mereka nombor GAS version; “V9-B” ialah nama calon produk, bukan bukti deployment version9.
9. Sahkan read/login production secara terkawal apabila dibenarkan. Jangan masukkan dummy marks atau fault injection ke workbook rasmi.
10. Buka kepada approved Admin selepas semua gate release ditutup. Pantau error, pending journal, publication generation/age, capacity dan heartbeat.

## 8. Recovery dan failure stop criteria

- apiInspectKevituTransactions() ialah inspection berautentikasi tanpa raw plan/secret.
- apiRecoverKevituTransaction(request_id) replay plan yang sama dan melengkapkan publication. Approved operator lain boleh recover tanpa menukar original actor/time.
- apiPublishKevituSnapshot() tidak memintas PREPARED; ia hanya menerbitkan validated committed state.
- Jika key/header/signature/checksum salah, row bukan before/after, generation ahead, snapshot collision, foreign edit, malformed immutable row atau capacity exhausted: stop new writes dan simpan bukti.
- Jangan overwrite unknown marks, regenerate IDs, padam audit, reseal data yang meragukan atau gunakan raw Reader sebagai penyelesaian.
- Jika response hilang selepas pointer atau COMMITTED write, retry ID yang sama. Jangan menganggap exception bermakna operasi belum berlaku.
- Jika browser metadata rosak, storage tidak kekal atau akaun tidak sepadan, hentikan client dan semak backend request identity dahulu.
- Missing heartbeat sehingga expiry menghasilkan public unavailable dengan sengaja; jangan ubah clock/expiry atau signature untuk menyembunyikannya.

## 9. Rollback / backout

1. Pause clients/legacy writers dan hadkan operator yang dibenarkan dalam maintenance window yang diluluskan.
2. Selesaikan PREPARED dan unpublished COMMITTED melalui protokol V9-B sebelum revert. Gate false juga menyekat recovery; urutan ini perlu dikendalikan owner supaya tiada penulis lain aktif.
3. Backup semua tujuh tab, source/client/Reader versions, journal request registry dan private key/config yang sepadan.
4. Selepas recovery disahkan, disable gate. Public boleh terus menggunakan signed snapshot sah sementara window berjalan.
5. Jangan deploy V8/V9-A backend di atas journal V9-B/CLOSED yang unresolved. Versi lama tidak memahami keseluruhan protokol.
6. Jika restore diperlukan, restore satu checkpoint coherent bagi **ketujuh-tujuh tab + source/client/Reader + key/config**. Jangan restore satu tab atau pointer sahaja.
7. Retain/reconcile outcomes dan request IDs selepas checkpoint; restore lama mungkin kehilangan committed result/tombstone. Permanent idempotency tidak boleh dijamin merentas destructive restore yang membuang registry.
8. Jika kembali ke V8, owner perlu menyelesaikan semua pending request klient V9 dan reconcile keputusan kemudian. Jangan arahkan pengguna mencipta request baharu tanpa keputusan rasmi.
9. Key rotation/loss memerlukan pelan khusus; jangan tukar key dan kemudian auto-sign journal yang gagal verify.
10. Sahkan backup dengan parser/mock lokal; real Google restore drill kekal NOT VERIFIED tanpa isolation. Jangan buat drill pada LIVE atau cipta workbook/projek tambahan. Apa-apa production backout memerlukan approval berasingan; tiada backout dilakukan dalam tugasan ini.

## 10. Reproduksi bukti

~~~powershell
node tests/security-v9b/run.cjs
node tests/security-v9b/browser-server.cjs
~~~

Runner melaksanakan baseline V9-A tepat331 dan suite semasa; browser-server ialah localhost mock dengan OAuth sintetik dan CSP self-only. Jangan jalankan mutative tests pada endpoint sebenar. Semasa sambungan disambung, suite yang sudah selesai tidak diulang: hanya hash, count, coverage dan remote-byte consistency disemak.

Bukti authoritative V9-B berada di tests/security-v9b/evidence/. Laporan V9-A dan legacy55/RED files ialah sejarah, bukan status calon akhir.

## 11. Release blockers yang masih terbuka

- Real GAS/API routing, Session, deployment permissions, sharing/protection, quotas dan service-level semantics belum diverifikasi.
- Provisioning workbook rasmi, secure key custody, bootstrap, mixed-version prevention dan rollback readiness belum lengkap. Polisi satu workbook tidak menutup bukti Google mutasi yang belum tersedia; jangan cipta staging baharu.
- Full independent Node/worker/DOM/browser suite belum dilaksanakan semula oleh reviewer; semakan source dan focused27 checks telah selesai.
- Physical iOS/Android/Safari dan operational heartbeat/key-rotation/capacity plan memerlukan owner verification.

**Keputusan:** calon kod QA tersedia untuk review; production release masih BLOCKED sehingga gate di atas ditutup. Tiada tuntutan keselamatan9/10.


## 12. Audit semula 1 November 2026 — checkpoint fe56172

Audit read-only source/metadata, bukan production QA PASS. HEAD awal fe56172af9d6020a114309b6ca9c2b08a4263cce; main 5babbe255a26beb330d5db9ca80b03d9dfaa6512. Bukti summary menyatakan 438 PASS/0 FAIL; suite tidak diulang.

### Bukti semasa
- Workbook pin Bridge/Reader sama: 1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E. Metadata Drive mengesahkan tajuk rasmi, locale en_US, timezone Asia/Kuala_Lumpur.
- LIVE mempunyai Form Responses 1 serta ACARA (grid4x9), MATA_ACARA (5x7), KEDUDUKAN (5x7), LOG_MATA (6x9). Grid ialah allocation, bukan bukti bilangan rekod.
- Header reads A1:I1/A1:G1 dengan FORMULA sepadan dengan empat header business dalam seksyen2. Body/formulas/legacy reconciliation belum diperiksa: NOT VERIFIED.
- V9_JOURNAL, V9_PUBLIC_SNAPSHOTS dan V9_PUBLIC_POINTER belum wujud: FAIL readiness. Tujuh tab bermaksud tujuh tab protokol, bukan jumlah keseluruhan workbook; kekalkan Form Responses 1 dan semua tab lain.
- Admin menggunakan hard-coded API_URL dalam admin-auth.js, devMode:false; admin-config.js legacy URL tidak digunakan oleh fail itu. Handshake protocol9/publication_protocol1 serasi source Bridge. Endpoint→deployed-version, manifest/scopes/Session/ACL sebenar NOT VERIFIED; manifest tidak ditemui pada gas/bridge/appsscript.json atau gas/public/appsscript.json.
- public-config.js menyatakan LIVE dan menunjuk Reader sedia ada. app.js JSONP callback sepadan dengan Reader. Jangan jalankan QA sign-in atau mutation terhadap endpoint tersebut.
- Reader source hanya membaca dua tab publication, pin+key+signature+expiry, tiada raw fallback. Dashboard menerima signed_committed_snapshot dan fractional totals. Source compatibility PASS; actual deployed compatibility NOT VERIFIED.
- sw.js network-first dengan cached app-shell fallback: stale/offline clients perlu dikawal ketika cutover; gate Bridge false sahaja tidak menghentikan legacy V8 writers.

### Dua FAIL source-level freshness
1. Bridge Code.gs line463: jika generation/hash sama dan expires_at masih masa depan, return pointer asal. Heartbeat 12 jam tidak renew lebih awal; outage selepas expiry boleh berterusan sehingga next successful publish. Bukan integrity exploit, tetapi runbook freshness requirement belum dipenuhi.
2. app.js validate expiry hanya dalam init; tiada timer/refetch untuk invalidate paparan selepas expires_at. Reader menolak expired requests tetapi halaman terbuka boleh kekal memaparkan data lama sebagai rasmi. Initial validation PASS tidak menutup masalah ini.

### Minimum migration apabila diluluskan kelak
1. Tutup blockers source dan focused tests lokal; inventorikan mapping sebenar existing Bridge/Reader dan semua writers. Bekukan maintenance serta access sebelum schema berubah.
2. Ambil checkpoint luar talian lengkap semua tab (termasuk Form Responses 1), source/version/deployment/config dan backup private key secara berasingan. Jangan simpan rahsia dalam Git.
3. Reconcile body legacy, IDs termasuk BATAL, dates, bounds, audit dan ranking. Preserve empat business tabs; tambah hanya tiga tab V9 dalam workbook sama. Grid minimum2001 rows, width7/5/5/8/6/1/1 mengikut urutan ACARA/MATA_ACARA/KEDUDUKAN/LOG_MATA/JOURNAL/SNAPSHOTS/POINTER. Jangan padam extra columns secara automatik.
4. Existing Bridge exact candidate dengan gate false; key raw sama 32–200 characters di existing Bridge/Reader, entropy sekurang-kurangnya256 bits, custody restricted. Kekalkan pin/OAuth/whitelist. Nilai properties sebenar tidak diperiksa atau diubah dalam audit.
5. Existing Reader snapshot-only dipasang sebelum sebarang V9 business write; downtime fail-closed dijangka sebelum bootstrap. Hentikan semua V8 writers/raw Readers yang masih boleh digunakan.
6. Owner-only enable gate sementara untuk satu authenticated bootstrap publish, tiada concurrency. Journal kosong bermakna generation0; jika journal sedia ada/tidak diketahui STOP. Snapshot immutable A2 dan pointer A2 mesti coherent; snapshot menggunakan satu daripada2000 slots. Bootstrap ialah mutasi dan tidak dilakukan sekarang.
7. Verify read-only signed publication/totals/ties/BATAL/expiry dan source commitment, then gate false semula sementara cutover clients/versions disemak. Jangan dedahkan key/signature tooling kepada frontend.
8. Lepaskan exact matching Admin/dashboard selepas endpoint mapping dan shell refresh disahkan. Controlled login/read checks sahaja; tiada dummy marks. Buka writes hanya selepas release decision berasingan. Monitor journal/pointer age/capacity/errors dengan operator yang dinamakan.

### Rollback minimum
- Sebelum V9 business write: freeze, gate false, preserve bukti dan bootstrap; pulihkan matching source/client/Reader mapping jika perlu. Jangan delete data/tab sebagai langkah biasa.
- Selepas V9 write: freeze semua clients dan legacy writers. Dengan gate true dan owner-only, selesaikan PREPARED/unpublished COMMITTED melalui recovery dahulu jika selamat; kemudian gate false. Gate false menyekat recovery juga.
- Jika recovery gagal kerana corruption/key loss: STOP; jangan paksa COMMITTED, reseal, clear journal atau revert kepada V8 di atas partial state.
- Backup checkpoint terkini tujuh tab+tab lain, outcomes/request IDs/pending metadata, source/deployments dan matching private key. Prefer forward recovery.
- Restore terakhir hanya coherent checkpoint seluruh protokol ke workbook rasmi yang sama, dengan release approval; reconcile semua post-checkpoint outcomes/CLOSED IDs terlebih dahulu. Restore tidak atomik dan boleh kehilangan registry; jangan benarkan stale pending retries semasa restore. Fail-closed outage lebih selamat daripada raw-table fallback.
- Reversion V8 memerlukan keputusan rasmi untuk setiap pending client dan semua outcomes V9. Jangan anggap menukar GAS version sahaja ialah rollback lengkap. Real restore drill kekal NOT VERIFIED.

### Gate akhir
Production release BLOCKED. Real Google mutation/service semantics, full independent suite rerun, physical device coverage dan operational recovery masih NOT VERIFIED. Dua freshness FAIL dan missing schema ialah blocker konkrit. Tiada spreadsheet/projek GAS/trigger/key/deployment dicipta atau diubah.
