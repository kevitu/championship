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

Owner mesti menyediakan heartbeat publication yang diluluskan dan diuji, disasarkan tidak melebihi 12 jam antara kejayaan supaya ada margin sebelum expiry 24 jam. Pilihan manual/trigger dan identiti pelaksana mesti disahkan dalam QA sebenar dahulu. Tiada trigger, automation atau heartbeat production dicipta oleh tugasan ini.

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

## 7. Controlled migration — belum dilaksanakan

### A. Sediakan staging yang benar-benar berasingan
1. Pemilik menyemak laporan, code SHA, signing design, had kapasiti, ACL dan risiko tertunggak.
2. Wujudkan standalone GAS QA dan QA workbook tanpa data peribadi. Source pin LIVE dikekalkan dalam repo; QA build mesti dipinkan secara eksplisit kepada QA workbook yang diluluskan dalam kedua-dua projek. Jangan ubah property supaya QA menunjuk kepada workbook rasmi.
3. Gunakan QA API endpoint/client setup yang disemak. Jangan menggunakan frontend QA untuk real sign-in ke API_URL V8 LIVE sedia ada.
4. Provision tujuh tab, grid, private test key dan account QA. Kekalkan whitelist/fail-closed pin; jangan broaden OAuth scopes atau mengubah OAuth production untuk menjayakan test.
5. Uji sebenar GAS export routing, caller Session, primary/second Admin, outsider denial, data/date coercion, service quotas, buffering/flush, readback dan key handling.
6. Jalankan mutation/concurrency/fault tests di QA sahaja. Uji physical mobile/browser storage behaviour serta expiry/heartbeat operation.

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
5. Dalam fasa owner-only/QA-approved maintenance, enable gate secukupnya untuk authenticated apiPublishKevituSnapshot() bootstrap daripada legacy state yang telah direconcile. Jangan benarkan concurrent legacy edits.
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
10. Sahkan checkpoint di isolated QA dahulu. Apa-apa production backout memerlukan approval berasingan; tiada backout dilakukan dalam tugasan ini.

## 10. Reproduksi bukti

~~~powershell
node tests/security-v9b/run.cjs
node tests/security-v9b/browser-server.cjs
~~~

Runner melaksanakan baseline V9-A tepat331 dan suite semasa; browser-server ialah localhost mock dengan OAuth sintetik dan CSP self-only. Jangan jalankan mutative tests pada endpoint sebenar. Semasa sambungan disambung, suite yang sudah selesai tidak diulang: hanya hash, count, coverage dan remote-byte consistency disemak.

Bukti authoritative V9-B berada di tests/security-v9b/evidence/. Laporan V9-A dan legacy55/RED files ialah sejarah, bukan status calon akhir.

## 11. Release blockers yang masih terbuka

- Real GAS/API routing, Session, deployment permissions, sharing/protection, quotas dan service-level semantics belum diverifikasi.
- Staging dengan exact QA pin, schema, secure key custody, bootstrap, mixed-version prevention dan rollback drill belum dijalankan.
- Full independent Node/worker/DOM/browser suite belum dilaksanakan semula oleh reviewer; semakan source dan focused27 checks telah selesai.
- Physical iOS/Android/Safari dan operational heartbeat/key-rotation/capacity plan memerlukan owner verification.

**Keputusan:** calon kod QA tersedia untuk review; production release masih BLOCKED sehingga gate di atas ditutup. Tiada tuntutan keselamatan9/10.
