# KEVITU Championship — Data Model V1

Headers below were verified against the restricted master workbook, read-only.

## ACARA
`ID_ACARA | NAMA_ACARA | TARIKH_ACARA | STATUS | CATATAN | DICIPTA_PADA | DIKEMASKINI_PADA`

- Unique ID (e.g. EVT001); never join by mutable event name.
- STATUS: AKTIF, SELESAI, BATAL.
- Cancellation excludes an event from standings.
- Event date is intended as YYYY-MM-DD, to be validated for consistent Google Sheets handling.

## MATA_ACARA
`ID_ACARA | RUMAH_SUKAN | MATA | DIKEMASKINI_PADA | DIKEMASKINI_OLEH`

- Exactly four houses: MERAH, BIRU, HIJAU, KUNING.
- Unique composite key (ID_ACARA, RUMAH_SUKAN).
- MATA: non-negative numeric, official zero differs from missing/unentered value.
- Editing overwrites the existing value, not incrementing the score.

## KEDUDUKAN
`RUMAH_SUKAN | JUMLAH_MATA | KEDUDUKAN | JUMLAH_ACARA | DIKEMASKINI_PADA`

- Four materialised ranking rows generated from valid events and scores.
- Equal scores share rank (competition rank e.g. 1,1,3,4).
- Count only scored valid events, not blank scores.

## LOG_MATA
`ID_LOG | TIMESTAMP | ID_ACARA | RUMAH_SUKAN | MATA_LAMA | MATA_BAHARU | TINDAKAN | ADMIN_ID`

- Append-only audit of score edits and event cancellation.
- Timestamp and verified administrator identity generated server-side.

## Unmodified existing source
`Form Responses 1`: participant registration. Not part of the scoring write path.

## Important
All four system tabs currently have verified headers and no data rows. Do not put private spreadsheet identifiers in public source.
