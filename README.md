# Kilroy

A portable Claude Code agent for the acceptance-side of the GFTX AMR pipeline.

Kilroy tracks each incoming AMR as it climbs the buyoff ladder from MFE (220 electrical -> 250 safety -> 270 handoff/map -> 280 performance -> 290 production) and produces the end-of-cycle handoff package to line-side ops.

Named after "Kilroy was here" -- the WWII engineer-graffiti figure that appeared wherever engineers had touched.

## Install

```bash
git clone git@github.tesla.com:jocasias/kilroy.git ~/repos/kilroy
cd ~/repos/kilroy
cp .env.example .env
# Edit .env -- fill Overmind base template, AMR Hub URL, Master Tracker CSV path,
# and the Graph API app registration (tenant/client ID + secret) plus
# PLANNER_PLAN_IDS for the Planner digest
claude
```

## First session

Ask Kilroy: *"What's in this repo and how should we use it?"*

Kilroy reads `CLAUDE.md`, confirms the operating loop, and lists the skills.

Then run one of:

- `kilroy check` -- verify `.env` and all four data sources are reachable. Also runs automatically at the start of `kilroy run my day`.
- `kilroy run my day` -- morning brief: today's AMR actions ranked by owning team and days-blocked, the gate board, and today's Planner tasks assigned to Jordan across all configured plans. Say `kilroy midday` later for a delta, `kilroy wrap the day` to close it out (AMR actions carry over as open items; Planner tasks don't -- Planner stays the system of record for those). Runs proactively on a schedule once wired -- see [[Skills/run-daily-workflow/SKILL]].
- `kilroy handoff <fleet-name>` -- package a fleet's commissioning state for line-side ops.
- `kilroy progress` -- board of incoming AMRs across the 5-gate ladder, blockers grouped by owning team.

## Prerequisites

- Claude Code installed.
- On Tesla corp network for Overmind reads.
- Local `amrtracker` (AMR Hub) running on `http://localhost:5000` in dev mode.
- A local CSV export of the Sonic AMR Master Tracker xlsx at a path referenced by `$MASTER_TRACKER_CSV_PATH`.
- A Microsoft Graph API app registration (tenant ID, client ID, client secret) with Planner read access, and the Planner plan ID(s) Jordan's tasks live in, referenced by `PLANNER_PLAN_IDS`.

## Scope

In:
- Reading Overmind GraphQL (per-fleet config, image tag, robot count, tracer events)
- Reading AMR Hub (buyoff gate status, blocker reasons)
- Reading Master Tracker CSV (upstream authoritative state -- pipeline status, ETA, vendor ref)
- Reading Microsoft Graph / Planner (Jordan's due-today assigned tasks, across the plan(s) in `PLANNER_PLAN_IDS`)
- Producing handoff packages, gate-progress boards, and daily action plans

Out (Phase 2 or elsewhere):
- Writing to AMR Hub (Jordan does that in the dashboard)
- Writing to Planner (Planner is the system of record; Jordan updates tasks there, not Kilroy)
- Runtime ops (fleet-monitor / fleet-troubleshooter / shift-handoff live at `~/.claude/agents/`)
- Graph API auto-fetch of Master Tracker xlsx (a separate, not-yet-built use of Graph API from the Planner read above -- CSV export is still a manual step)
- Teams mentions, flagged email triage, and team-tracked (non-assigned) Planner tasks -- deferred, see `Knowledge/Personal/daily-workflow.md`
- Nova/novacode deployment
- Sharing Kilroy across a team (multi-user, secrets beyond `.env`)

## Design

Full design doc: [docs/superpowers/specs/2026-07-02-kilroy-design.md](docs/superpowers/specs/2026-07-02-kilroy-design.md).
