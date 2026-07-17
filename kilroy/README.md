# Kilroy

A portable Claude Code agent for the acceptance-side of the GFTX AMR pipeline.

Kilroy tracks each incoming AMR as it climbs the buyoff ladder from MFE (220 electrical -> 250 safety -> 270 handoff/map -> 280 performance -> 290 production) and produces the end-of-cycle handoff package to line-side ops.

Named after "Kilroy was here" -- the WWII engineer-graffiti figure that appeared wherever engineers had touched.

## Install

```bash
git clone git@github.tesla.com:jocasias/kilroy.git ~/repos/kilroy
cd ~/repos/kilroy
cp .env.example .env
# Edit .env -- fill Overmind base template, AMR Hub URL, Master Tracker CSV path
claude
```

## First session

Ask Kilroy: *"What's in this repo and how should we use it?"*

Kilroy reads `CLAUDE.md`, confirms the operating loop, and lists the three skills.

Then run one of:

- `kilroy run my day` -- morning brief: today's actions, ranked by owning team and days-blocked, plus the gate board. Say `kilroy midday` later for a delta, `kilroy wrap the day` to close it out.
- `kilroy handoff <fleet-name>` -- package a fleet's commissioning state for line-side ops.
- `kilroy progress` -- board of incoming AMRs across the 5-gate ladder, blockers grouped by owning team.

## Prerequisites

- Claude Code installed.
- On Tesla corp network for Overmind reads.
- Local `amrtracker` (AMR Hub) running on `http://localhost:5000` in dev mode.
- A local CSV export of the Sonic AMR Master Tracker xlsx at a path referenced by `$MASTER_TRACKER_CSV_PATH`.

## Scope

In:
- Reading Overmind GraphQL (per-fleet config, image tag, robot count, tracer events)
- Reading AMR Hub (buyoff gate status, blocker reasons)
- Reading Master Tracker CSV (upstream authoritative state -- pipeline status, ETA, vendor ref)
- Producing handoff packages, gate-progress boards, and daily action plans

Out (Phase 2 or elsewhere):
- Writing to AMR Hub (Jordan does that in the dashboard)
- Runtime ops (fleet-monitor / fleet-troubleshooter / shift-handoff live at `~/.claude/agents/`)
- Graph API auto-fetch of Master Tracker xlsx
- Nova/novacode deployment
- Sharing Kilroy across a team (multi-user, secrets beyond `.env`)

## Design

Full design doc: [docs/superpowers/specs/2026-07-02-kilroy-design.md](docs/superpowers/specs/2026-07-02-kilroy-design.md).
