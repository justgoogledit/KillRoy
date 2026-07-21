# scripts/hooks

Tracked hook scripts for Claude Code. The scripts live here (in git) because
`.claude/` is gitignored and machine-local -- each machine registers the hooks
in its own `.claude/settings.json`. The work-PC bootstrap checklist (autonomy
ticket 07, `docs/bootstrap-windows.md`) performs that registration on the
Windows machine.

## session-start.sh

Runs on every Claude Code session start. Two jobs, in priority order:

1. **Bootstrap detection.** If `.env` is missing or
   `.scratch/kilroy-autonomy/bootstrap-pending` exists, it prints a pointer to
   `docs/bootstrap-windows.md` and stops -- no brief logic runs.
2. **Daily-brief surfacing.** On workdays (Mon-Thu) it reads today's run
   status markers (`Projects/daily/runs/YYYY-MM-DD-<phase>.json`, schema in
   the script header):
   - All markers `ok` -> pointer to the day file + checklist
     (`Projects/daily/YYYY-MM-DD-daily.md`), plus a "Confluence draft awaiting
     approval" line when the day file contains `DRAFT -- awaiting approval`.
   - Any marker `partial`/`failed` -> same pointer plus one line per failed
     source (phase / source name: detail). `skipped` counts as non-failing.
   - No morning marker and it is past 08:45 local -> "morning run failed or
     never ran -- run /run-daily-workflow now?".
   - Non-workday (Fri/Sat/Sun) -> silent, unless markers unexpectedly exist
     (then a one-line note).

   A touch file `Projects/daily/runs/.brief-shown-<date>` makes the full brief
   print once per day; later sessions the same day get a one-line summary.
   Stale touch files from previous days are deleted quietly.

The script is bash 3.2 / Git Bash compatible: no `date -d`, no jq, no network
calls. Weekday comes from Zeller's congruence so date overrides stay
consistent. It always exits 0 so a hook failure never blocks a session.

## Registration (per machine, because .claude/ is gitignored)

Add to that machine's `.claude/settings.json` under the top-level `hooks` key:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

`$CLAUDE_PROJECT_DIR` is set by Claude Code when it invokes hooks; using it
keeps the command working regardless of the hook's working directory. A plain
`bash scripts/hooks/session-start.sh` also works when hooks run from the repo
root, but the absolute form above is the safer default. Treat the exact shape
as guidance -- confirm against the Claude Code hooks docs for the installed
version when registering.

## Test-only env overrides

Never set these in a real registration -- they exist so the test matrix can
exercise every branch deterministically:

- `KILROY_HOOK_TODAY=YYYY-MM-DD` -- pretend today is this date (weekday is
  derived from the override, not the wall clock).
- `KILROY_HOOK_NOW=HHMM` -- pretend the local time is HHMM (drives the
  past-08:45 morning-missing check).

Example dry run against a fixture directory:

```bash
CLAUDE_PROJECT_DIR=/tmp/kilroy-fixture \
KILROY_HOOK_TODAY=2026-07-21 KILROY_HOOK_NOW=0900 \
bash scripts/hooks/session-start.sh
```
