# Kilroy work-PC bootstrap (Windows)

Guided first run on the Windows work PC. The SessionStart hook points here whenever `.env` is
missing or `.scratch/kilroy-autonomy/bootstrap-pending` exists. Work through the steps in order;
each has a verify command. When step 12 deletes the marker, this doc goes dormant.

**Context for the first day:** no 07:00 scheduled run exists yet. The supervised morning run in
step 9 IS the day's morning prep -- run it at first login (~10:00-10:30 is fine) and it doubles as
the permission-capture run. Scheduled cadence starts the next workday (step 11).

## Steps

1. **Create `.env`.** `cp .env.example .env`, then fill: `OVERMIND_BASE_URL_TEMPLATE` (per-fleet
   template), `PLAYWRIGHT_BROWSER_CHANNEL` / `PLAYWRIGHT_USER_DATA_DIR` (see step 5 first),
   `OBSIDIAN_VAULT_PATH` (the vault root; leave blank to skip mirroring).
   *Verify:* `cat .env` shows no empty required values.
2. **Add the Obsidian vault as a working directory** so Kilroy can read and write it:
   `claude --add-dir "<OBSIDIAN_VAULT_PATH value>"` (or the equivalent `claude config` setting for
   the project). *Verify:* in a Kilroy session, listing the vault directory works.
3. **Fill the monitored-chats config.** Ask Jordan: "Which Teams group chats should the morning
   brief summarize?" Write each into `Knowledge/Personal/monitored-chats.md`'s `## Chats` table
   (exact display names). *Verify:* the file has at least one filled row and no
   `TO FILL AT BOOTSTRAP` placeholder left.
4. **Resolve the Loop path.** In a session with Nova MCPs attached: check whether a `loop` MCP
   server is present. Present = path (a); absent = confirm the `planner` MCP surfaces Loop-backed
   tasks (path (b)). Then edit `Skills/triage-personal-items/SKILL.md` Step 4 to record the
   confirmed path and drop its UNVERIFIED-until-Windows marker (surface the diff -- skill edits
   are never silent). *Verify:* one Loop assignment visible through the confirmed path.
5. **Dedicated Edge profile + one-time Confluence SSO.** Create a separate Edge profile (never the
   daily-driver), sign into `confluence.teslamotors.com` once, close it, point
   `PLAYWRIGHT_USER_DATA_DIR` at its directory. Then restart Claude Code so `.mcp.json`'s servers
   (`kilroy-connectors`, `playwright`) register. *Verify:* both servers listed in the session's
   MCP status.
6. **Register the SessionStart hook.** Add the snippet from `scripts/hooks/README.md` to this
   machine's `.claude/settings.json` (machine-local -- `.claude/` is gitignored).
   *Verify:* `bash scripts/hooks/session-start.sh` prints the bootstrap pointer (marker still
   present at this step).
7. **`kilroy check`.** Post-consolidation scope: `.env`, Overmind reachability, Nova `planner`
   MCP. *Verify:* report ends "All green -- safe to run."
8. **mcp-server tests.** `cd mcp-server && npm install && npm test`. *Verify:* full suite green --
   including `server.test.js`, which is UNVERIFIED on the Mac (its spawned-child stdio tests hang
   in that sandbox; this is their first real run).
9. **Supervised morning run + permission capture.** Run `/run-daily-workflow --autonomous
   --phase=morning` interactively, RECORDING every permission prompt (tool + scope) as it appears.
   Deliver the brief + day checklist + Confluence draft to Jordan immediately after; run the
   interactive approval gate on the draft. *Verify:* day file, status marker, and journal line all
   exist; prompt list captured.
10. **Build the scoped allowlist.** Translate the captured prompts into `allow` entries in
    `.claude/settings.json`. Hard requirement regardless of what was captured: `playwright` and
    Confluence write tools DENIED in the headless/autonomous context -- the draft-then-approve
    gate is structural, not conventional. No `--dangerously-skip-permissions`, ever.
    *Verify:* settings diff reviewed by Jordan.
11. **Register the scheduled tasks.** `powershell -NoProfile -ExecutionPolicy Bypass -File
    scripts\windows\register-tasks.ps1`. *Verify:* `Get-ScheduledTask "Kilroy*"` lists Morning /
    Delta 11 / Delta 13 / Closeout, Mon-Thu, morning with one 90-min retry.
12. **Close out bootstrap.** Delete `.scratch/kilroy-autonomy/bootstrap-pending`, commit the
    config changes that belong in git (monitored-chats, the ticket-04 marker update -- NOT `.env`,
    NOT `.claude/`). *Verify:* `bash scripts/hooks/session-start.sh` now runs the normal brief
    logic; git status clean of secrets.

From here, ticket 09's green checklist (`.scratch/kilroy-autonomy/issues/09-windows-verification.md`)
tracks the week of live verification.
