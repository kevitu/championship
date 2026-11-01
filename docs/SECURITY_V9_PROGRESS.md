# Ledger — SECURITY_V9_DESIGN_PLAN.md
Baseline complete: original 55 checks reproduced 41 PASS /14 FAIL.
Ruling: use existing remote QA branch and isolated local snapshot; GitHub Git-data commit replaces local git transport (previous git network unavailable). No main checkout modified.
Ruling: user has supplied explicit design constraints and implementation authorisation; proceed inline without redundant approval.
Task 1 complete: unmodified baseline 55 checks -> 41 PASS /14 FAIL. V9 tests first RED (105:49 PASS/56 FAIL).
Task 2 complete: journal, revisions, validators and recovery implemented; 323/323 regressions PASS.
Task 3 in progress: 6/6 worker concurrency scenarios PASS; before/after faults on operation and recovery paths covered.
Ruling: in-scope old partial-commit assertions are superseded by journal+recovery invariants; no atomic rollback claim. Public Reader old failure remains explicitly deferred.
Task 3 complete: 323 regression checks +6 real worker mock races PASS. All 122 write/flush boundaries tested before and after (244 fault cases).
Ruling: V9 explicitly preserves forward-recovery semantics; old no-partial-write assertion is not reclassified as atomic PASS.
Task 4: runbook and report written; fresh whole-branch review pending.
Ruling: final regression exposed a legacy Date timezone shift and fractional tie error; both reproduced RED and fixed with targeted compatibility tests, without changing Public Reader or its contract.
Task 4 complete with limitation: report/runbook finished; independent review NOT VERIFIED because child source-read tools blocked (two attempts). No certification inferred. Primary review and325 regression+6 worker checks PASS.
Task 5: publish only authorised QA branch via expected-head lease; preserve workspace. No PR/main/merge/deploy.
