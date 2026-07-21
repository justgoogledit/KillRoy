# Kilroy

A portable Claude Code agent whose primary focus is the acceptance-side of the GFTX AMR pipeline, and which is being broadened (as of 2026-07-20) into Jordan's general personal assistant.

Kilroy tracks each incoming AMR as it climbs the buyoff ladder from MFE (220 electrical -> 250 safety -> 270 handoff/map -> 280 performance -> 290 production) and produces the end-of-cycle handoff package to line-side ops. It also triages mail/Teams/Planner and posts Jordan's daily Confluence status update -- see `CLAUDE.md`'s Scope section for the full workflow list.

Named after "Kilroy was here" -- the WWII engineer-graffiti figure that appeared wherever engineers had touched.

## Install

```bash
git clone git@github.tesla.com:jocasias/kilroy.git ~/repos/kilroy
cd ~/repos/kilroy
cp .env.example .env
# Edit .env -- fill Overmind base template, AMR Hub URL, Master Tracker CSV path,
# the Graph API app registration (tenant/client ID + secret) plus
# PLANNER_PLAN_IDS for the Planner digest, and the PLAYWRIGHT_* vars (see
# "One-time: Confluence daily-status setup" below before filling those in)
(cd mcp-server && npm install)   # one-time: the typed connector server's dependency
claude
```

Launch `claude` from the repo root: `.mcp.json` starts the `kilroy-connectors` MCP server with a
relative path (`mcp-server/server.js`), which resolves against the launch directory, and the
`playwright` MCP server used by [[Skills/confluence-daily-status/SKILL]].

### One-time: Confluence daily-status setup

[[Skills/confluence-daily-status/SKILL]] posts to Confluence via browser automation, not the
Confluence MCP's own update tool -- see that skill and
[[Knowledge/Sources/2026-07-20-confluence-status-page]] for why. This needs a bit of one-time setup
beyond `.env`:

1. **Node.js 18+ on PATH.** Same requirement as `mcp-server/`'s dependency below, but worth calling
   out again here since this is also what runs the `npx`-launched `playwright` MCP server.
2. **A dedicated Edge (or Chrome) profile, signed into Confluence once.** Do NOT reuse Jordan's
   normal daily-driver browser profile -- Chromium refuses a second `--user-data-dir` launch
   against a profile that's already open elsewhere, and the daily-driver profile is open
   essentially all day. Create a new, separate profile, sign into `confluence.teslamotors.com`
   once so Tesla SSO cookies are cached, then leave that profile alone (don't use it for regular
   browsing -- keep it closed so Playwright can claim it).
3. Set `PLAYWRIGHT_USER_DATA_DIR` in `.env` to that dedicated profile's directory and
   `PLAYWRIGHT_BROWSER_CHANNEL` to `msedge` (or `chrome`).
4. `PLAYWRIGHT_HEADLESS` in `.env` is a decision record, not live config -- the actual headed/
   headless switch is whether `--headless` appears in `.mcp.json`'s `playwright` server args. It's
   headed by default on purpose; see that skill's rationale before changing it.

## First session

Ask Kilroy: *"What's in this repo and how should we use it?"*

Kilroy reads `CLAUDE.md`, confirms the operating loop, and lists the skills.

Then run one of:

- `kilroy check` -- verify `.env` and the four AMR/Planner-digest data sources are reachable. Also runs automatically at the start of `kilroy run my day`. Does **not** cover `mail`, `microsoft-teams`, `confluence`, or `playwright` -- those are general-purpose MCPs Kilroy reaches directly, disclosed but untested by this check; see `CLAUDE.md`'s Data sources section.
- `kilroy run my day` -- morning brief: today's AMR actions ranked by owning team and days-blocked, the gate board, today's Planner tasks assigned to Jordan across all configured plans, the Personal Triage section (mail/Teams/Planner), and a Confluence daily-status draft awaiting Jordan's approval before it posts. Say `kilroy midday` later for a delta, `kilroy wrap the day` to close it out (AMR actions carry over as open items; Planner tasks don't -- Planner stays the system of record for those). Runs proactively on a schedule once wired -- see [[Skills/run-daily-workflow/SKILL]].
- `kilroy handoff <fleet-name>` -- package a fleet's commissioning state for line-side ops.
- `kilroy progress` -- board of incoming AMRs across the 5-gate ladder, blockers grouped by owning team.
- `kilroy triage` -- mail/Teams/Planner triage outside the daily cadence. See [[Skills/triage-personal-items/SKILL]].

## Prerequisites

- Claude Code installed.
- Node.js 18+ (for the `kilroy-connectors` MCP server in `mcp-server/` -- run `npm install` there once; `npm test` runs its fixture-backed test suite -- and for the `npx`-launched `playwright` MCP server).
- On Tesla corp network for Overmind reads.
- Local `amrtracker` (AMR Hub) running on `http://localhost:5000` in dev mode.
- A local CSV export of the Sonic AMR Master Tracker xlsx at a path referenced by `$MASTER_TRACKER_CSV_PATH`.
- A Microsoft Graph API app registration (tenant ID, client ID, client secret) with Planner read access, and the Planner plan ID(s) Jordan's tasks live in, referenced by `PLANNER_PLAN_IDS`.
- Nova-provided `mail`, `microsoft-teams`, `confluence`, and `planner` MCP connections (work computer only -- these are what enable the personal-assistant workflows below; they're separate from the four `.env`-wired sources above).
- A dedicated, once-signed-in Edge/Chrome profile for the `playwright` MCP -- see "One-time: Confluence daily-status setup" above.

## Scope

In:
- Reading Overmind GraphQL (per-fleet config, image tag, robot count, tracer events)
- Reading AMR Hub (buyoff gate status, blocker reasons)
- Reading Master Tracker CSV (upstream authoritative state -- pipeline status, ETA, vendor ref)
- Reading Microsoft Graph / Planner (Jordan's due-today assigned tasks, across the plan(s) in `PLANNER_PLAN_IDS`)
- Reading mail, Teams, and Planner for daily triage (see [[Skills/triage-personal-items/SKILL]])
- Posting Jordan's daily Confluence status update, draft-then-approve, under his name only (see [[Skills/confluence-daily-status/SKILL]]) -- the one deliberate write, gated by explicit per-occurrence approval
- Producing handoff packages, gate-progress boards, and daily action plans

Out (future spec, or elsewhere):
- Writing to AMR Hub (Jordan does that in the dashboard)
- Writing to Planner (Planner is the system of record; Jordan updates tasks there, not Kilroy)
- Sending Teams messages or email on Jordan's behalf, morning-sweep triage of Microsoft Loop/AMR chats, throughout-day KPI/health watch, and the Thursday management report -- each a distinct future personal-assistant domain, not yet speced
- Runtime ops (fleet-monitor / fleet-troubleshooter / shift-handoff live at `~/.claude/agents/`; route live investigation to the `overmind` MCP instead)
- Graph API auto-fetch of Master Tracker xlsx (a separate, not-yet-built use of Graph API from the Planner read above -- CSV export is still a manual step)
- Nova/novacode deployment
- Sharing Kilroy across a team (multi-user, secrets beyond `.env`)

## Design

Full design doc: [docs/superpowers/specs/2026-07-02-kilroy-design.md](docs/superpowers/specs/2026-07-02-kilroy-design.md).
