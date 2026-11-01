# KEVITU Championship — Locked Decisions

1. **Four houses:** MERAH, BIRU, HIJAU, KUNING.
2. **Dashboard Design V1** approved; responsive desktop/mobile/PWA.
3. **Direct Scoring (Option B)**: Admin enters event name and four house scores; save updates standings immediately.
4. **Oral consent among AJK** allows Admin to edit scores at any time; no digital approval state.
5. Score edit **replaces** the previous value; it must never count twice.
6. Scoring values are determined by **Ketua Biro Sukan**, not invented by software.
7. First event: **STRAVA STRIKE 2026**. No official scores entered yet.
8. Master Google Sheet remains Restricted; registration tab must not be modified.
9. Four system tabs: `ACARA`, `MATA_ACARA`, `KEDUDUKAN`, `LOG_MATA`.
10. Audit changes automatically in `LOG_MATA` with timestamp and verified Admin identity.
11. Cancelled events do not contribute points; tied totals share position.
12. GitHub stores code and docs; Apps Script executes backend; no LIVE deploy until auth and integration pass.
13. Four supplied house logos are intended for scoreboard identity: BLUE DRAGON, KILLER BEES, RUMAH MERAH, GREEN TURTLE.

## Pending technical decisions
- Secure Admin authentication/deployment mode, verified with non-admin accounts.
- Partial-write failure recovery and reconciliation.
- Whether the public scoreboard and Admin API use distinct GAS deployments.
