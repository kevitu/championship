# KEVITU Championship — Development Plan

## Completed
- Fasa 0: repository initialised, workbook/tab/header audit read-only.
- Fasa 1A: data schema designed and header layout verified.
- Fasa 1B: first GAS backend draft in `gas/Code.gs`; 9/9 pure-logic test cases pass after input validation improvements.
- Basic security: current README has no private spreadsheet URL; source workbook sharing verified Restricted.

## Outstanding security note
Original public commit history contained the spreadsheet URL. It was removed from the current README but not purged from Git object history. Link access alone does not grant access to a Restricted spreadsheet.

## Next — minimal, focused workflow
1. Complete current Markdown project documentation.
2. Create separate restricted `KEVITU Championship - DEV QA` workbook with system-tab headers and **no participant data**.
3. Bind a DEV GAS project and load the GitHub GAS source, after closing known security and partial-write blockers.
4. Test create, edit, cancel, rankings, audit, and deny non-admin access using the DEV workbook.
5. Build approved dashboard Design V1 using the four supplied logos; do not use placeholder scores as real scores.
6. Deploy controlled LIVE setup only after user approval and safety verification.

## QA approach
Lean QA: focus on critical flows, fix actual failures, do not expand into repeated QA phases unnecessarily. Pure JavaScript test success does not imply integration or deployment success.

## Current hold
No GAS DEV project or QA workbook was created, and LIVE has not been modified.
