# 06 — Windows Task Scheduler scripts

Blockers: 02. Blocks: 07.

New `scripts/windows/` directory (first non-mcp-server code in repo — keep tiny):

- `run-phase.ps1` — wrapper Task Scheduler invokes: cd to repo root, load nothing secret
  (claude reads `.env` itself via the MCP server), run
  `claude -p "/run-daily-workflow --autonomous --phase=<phase>"` with output appended to
  `Projects/daily/runs/YYYY-MM-DD-<phase>.log`. Exit code from claude propagated so
  Task Scheduler's retry logic sees failure.
- `register-tasks.ps1` — idempotent registration of four tasks via `Register-ScheduledTask`:
  - `Kilroy Morning` 07:00 Mon–Thu, retry once at 08:30 on failure
    (RestartCount=1, RestartInterval=90min), wake machine allowed.
  - `Kilroy Delta 11` 11:00 Mon–Thu.
  - `Kilroy Delta 13` 13:00 Mon–Thu.
  - `Kilroy Closeout` 16:00 Mon–Thu.
  - All: run only when user logged on (needed for Nova MCPs + user context), start only
    if network available, no stop-if-on-battery.
- `unregister-tasks.ps1` — clean removal.
- `README.md` — one page: prerequisites, how to run register script, how to verify
  (`Get-ScheduledTask Kilroy*`), how logs/markers map to the login brief.

Repo path on the work PC differs from Mac — scripts detect repo root from their own
location (`$PSScriptRoot\..\..`), never hardcode a path.

Cannot be executed on the Mac. Acceptance here = static review:
- PowerShell parses (`pwsh -NoProfile -Command` syntax check if pwsh available on Mac,
  else careful review) and paths/flags match the spec.
- Marked UNVERIFIED-until-Windows; ticket 09 covers live verification.
