# Windows Task Scheduler scripts

> **UNVERIFIED UNTIL WINDOWS.** These scripts have only had static review on a Mac --
> PowerShell was never executed against them, and no task has ever been registered.
> The first live registration is a work-PC bootstrap step (spec bootstrap step 6;
> ticket 09 covers live verification). Expect to debug on first contact.

These scripts run Kilroy's autonomous day loop on the work PC, Mon-Thu:

| Task            | Time  | Phase    | Notes                                      |
|-----------------|-------|----------|--------------------------------------------|
| Kilroy Morning  | 07:00 | morning  | One retry at 08:30 on failure; wakes the machine |
| Kilroy Delta 11 | 11:00 | delta    |                                            |
| Kilroy Delta 13 | 13:00 | delta    |                                            |
| Kilroy Closeout | 16:00 | closeout |                                            |

Each task invokes `run-phase.ps1`, which cds to the repo root (resolved from the
script's own location -- nothing hardcoded) and runs
`claude -p "/run-daily-workflow --autonomous --phase=<phase>"`.

## Prerequisites

- `claude` CLI installed and on PATH for the logged-on user.
- This repo cloned (any path -- the scripts resolve it relative to themselves).
- `.env` at the repo root filled in (claude and the MCP server read it themselves;
  these scripts load no secrets).
- A logged-on user session: tasks run with the interactive token only (needed for
  Nova MCPs and user context). No stored credentials, no run-when-logged-off.

## Register

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\windows\register-tasks.ps1
```

Re-running is safe -- registration is idempotent (`-Force` overwrites in place).

## Verify

```powershell
Get-ScheduledTask "Kilroy*"
```

Expect all four tasks, state `Ready`.

## Logs, status markers, and the login brief

Each run appends stdout+stderr to `Projects/daily/runs/YYYY-MM-DD-<phase>.log`. The
run itself writes a status marker `Projects/daily/runs/YYYY-MM-DD-<phase>.json`
(`{ "status": "ok|partial|failed", "sources": { ... }, "startedAt", "finishedAt" }`).
At the first interactive session of the day, `scripts/hooks/session-start.sh` reads
those markers and surfaces the result: all green presents the brief, partial adds a
per-source failure list, failed/absent asks whether to run `/run-daily-workflow` now.
The `.log` files are the raw trail for debugging whatever the marker reports.

## Unregister

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\windows\unregister-tasks.ps1
```

Removes all four tasks; already-absent tasks are reported, not errors.
