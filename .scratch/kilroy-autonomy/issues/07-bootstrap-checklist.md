# 07 — Bootstrap checklist (work-PC first run)

Blockers: 02, 03, 04, 05, 06. Blocks: 09.

The guided first-run on the Windows work PC (~10:00–10:30 login, no 07:00 run that day).
Deliverable: `docs/bootstrap-windows.md` — a step-by-step checklist the SessionStart
hook points at when it detects bootstrap state (ticket 05), plus the
`.scratch/kilroy-autonomy/bootstrap-pending` marker committed so the hook fires on clone.

Checklist contents (dependency order):

1. `cp .env.example .env`, fill values (Overmind, `PLAYWRIGHT_*`, `OBSIDIAN_VAULT_PATH`).
2. Add Obsidian vault as working directory (`--add-dir` / `claude config`).
3. Ask Jordan for Teams group chats to monitor → fill
   `Knowledge/Personal/monitored-chats.md` (template from ticket 04).
4. Verify Loop path: probe Nova `loop` MCP; fall back to `planner` sync; update
   triage-personal-items' UNVERIFIED marker with the confirmed path.
5. Dedicated Edge profile + one-time Confluence SSO sign-in (carried over from
   confluence-daily-status open threads); restart Claude Code so `.mcp.json` servers
   register.
6. `kilroy check` — must pass post-consolidation scope.
7. `cd mcp-server && npm install && npm test` — green.
8. Supervised morning-prep run: `/run-daily-workflow --autonomous --phase=morning` run
   interactively, RECORDING every permission prompt encountered. Deliver brief +
   checklist + Confluence draft to Jordan immediately after.
9. Build scoped allowlist in `.claude/settings.json` from the recorded prompts.
   Hard requirement regardless of capture: playwright/confluence tools denied in the
   headless context.
10. `scripts/windows/register-tasks.ps1`; verify `Get-ScheduledTask Kilroy*`.
11. Delete `bootstrap-pending` marker; commit config changes (not `.env`).

Scheduled cadence starts the next workday; ticket 09 verifies it.

Acceptance:
- Doc exists, ordered as above, each step with its verify command.
- Marker file committed; hook (ticket 05) confirmed to point at the doc when marker
  present.
