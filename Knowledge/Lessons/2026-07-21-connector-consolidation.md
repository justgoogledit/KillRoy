---
date: 2026-07-21
session_topic: Execute the connector consolidation (ticket 01 of the autonomy effort)
project: [[Projects/daily/daily]]
tags: [lesson, connectors, mcp-server, consolidation, execution]
---

# Connector consolidation -- executed

Execution record for the plan approved 2026-07-20 (decision record: [[Knowledge/Lessons/2026-07-20-connector-consolidation-planning]]; the original plan file exists only on the work PC). Ticket: `.scratch/kilroy-autonomy/issues/01-execute-connector-consolidation.md`.

## What changed

- **`mcp-server/`** -- `amr-hub.js`, `master-tracker.js`, `planner.js` (libs + tests) deleted; `server.js` reduced to the single `overmind_get_fleet_state` tool (version bumped 0.1.0 -> 0.2.0); `server.test.js` rewritten Overmind-only; `env.test.js`'s `.env.example` assertions updated.
- **`.env.example`** -- AMR Hub / Master Tracker / `GRAPH_API_*` / `PLANNER_PLAN_IDS` vars removed; `OBSIDIAN_VAULT_PATH` added (autonomy ticket 03/07 dependency).
- **`Skills/arriving-amr-progress/`** -- deleted outright (git history preserves it).
- **`Skills/fleet-commissioning-handoff/`** -- gutted to an Overmind-only fleet-state report; gate table, Master Tracker cross-reference, CSV-freshness banner all gone.
- **`Skills/run-daily-workflow/`** -- scoped down: AMR board and Graph-API Planner digest out; Planner digest now via Nova's `planner` MCP.
- **`Skills/check-connectors/`** -- two-source scope (Overmind typed tool, Planner via a minimal Nova `planner` MCP call).
- **`Skills/verify-fixtures/`** + **`Knowledge/Sources/fixtures/`** -- fixture set collapsed to `overmind-fleet-state.json`, one happy-path pairing; retired fixtures deleted.
- **`Skills/confluence-daily-status/`** -- AMR-context bullet dropped; Planner references moved to Nova's MCP.
- **`Skills/triage-personal-items/`**, **`Knowledge/Personal/daily-workflow.md`**, **`Skills/Skills.md`**, **`README.md`** -- stale references cleaned.
- **`Knowledge/Sources/2026-07-02-pc-amr-gates.md`** -- header status note added (kept as reference, per the gate-attribution non-negotiable; not deleted).
- **`CLAUDE.md`** -- identity paragraph rewritten (gate-ladder mechanism no longer exists), Scope renumbered to four workflows, Safety tier updated with an on-record flag to re-run `/floor-init`, Data sources reduced to Overmind + Nova `planner`, anti-patterns updated ("Writing to AMR Hub" replaced by "Reviving retired connectors"). Diff presented to Jordan before commit per the no-silent-edits rule.

## Verification state

- `mcp-server` lib tests (env, overmind): **15/15 pass on this Mac**.
- `mcp-server/test/server.test.js` (spawns the stdio server as a child process): hangs in the Mac sandbox (spawned-child stdio handshake never completes there), but **verified green on GitHub Actions CI** the same day -- run 29864442265 on the post-consolidation push: 20/20 tests pass, 0 fail, full suite including all 5 server tests. The Mac hang is environmental, not a code defect. Work-PC bootstrap step 8 still re-runs the suite locally as its own check.
- Grep sweep: no live references to `amr_hub_get_units` / `master_tracker_get_rows` / `planner_get_tasks` / `GRAPH_API_*` / `PLANNER_PLAN_IDS` / `arriving-amr-progress` remain outside `Knowledge/Lessons/` history, `log.md` history, the design doc (marked as predating the consolidation), and explicit retirement notes.

## Open threads

- [ ] `cd mcp-server && npm test` full-suite green on the work PC (server.test.js included).
- [ ] `verify-fixtures` dry-run of the one surviving pairing.
- [ ] `.claude/hooks/session-start.sh` is machine-local (gitignored) and absent on this Mac -- the work PC's copy still probes the old three sources. Autonomy ticket 05 ships the updated hook; until then the work-PC hook will report stale FAIL rows for retired sources.
- [ ] Jordan: consider re-running `/floor-init` (flag now on record in CLAUDE.md's Safety tier section).
