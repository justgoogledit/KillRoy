# 01 — Execute connector consolidation

Blockers: none. Blocks: 02, 03, 04, 08.

Execute the already-approved consolidation, reconstructed from the decision record in
`Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md` (the original plan file
lives only on the work PC; every confirmed decision is in the lesson).

Scope (all confirmed 2026-07-20):
- Retire AMR Hub + Master Tracker CSV connectors: remove their tools from
  `mcp-server/` (`amr_hub_get_units`, `master_tracker_get_rows`), their env vars from
  `.env.example`, their fixtures/pairings, their tests.
- Retire `planner_get_tasks` + `GRAPH_API_*`/`PLANNER_PLAN_IDS` env vars — Nova's
  `planner` MCP becomes the sole Planner path.
- Delete `Skills/arriving-amr-progress/` outright (git history preserves it).
- Gut `Skills/fleet-commissioning-handoff/` to an Overmind-only fleet-state report;
  fixture coverage collapses to one happy-path pairing.
- Scope down `Skills/run-daily-workflow/` (drop "Today's actions" board content).
- Update `check-connectors` to two-source scope (Overmind + whatever remains probeable);
  update `.claude/hooks/session-start.sh` probe to match.
- Update `verify-fixtures` documented pairings.
- Rewrite CLAUDE.md opening identity paragraph (Jordan chose rewrite; present diff
  explicitly — no silent CLAUDE.md edits) + Scope/Data sources sections.
- Header note (not deletion) on `Knowledge/Sources/2026-07-02-pc-amr-gates.md`.
- Drop confluence-daily-status's AMR-context bullet.
- Update `Skills/Skills.md`, `README.md`.
- Write execution lesson `Knowledge/Lessons/<date>-connector-consolidation.md`.
- Flag to Jordan: consider re-running `/floor-init` (safety tier was justified by
  removed AMR-Hub buyoff reporting).

Acceptance:
- `cd mcp-server && npm test` green with retired tools/tests gone.
- `verify-fixtures` passes on the reduced pairing set.
- No references to AMR Hub / Master Tracker / arriving-amr-progress / GRAPH_API_* remain
  outside Knowledge history files (grep-verified).
- CLAUDE.md diff shown to Jordan before commit.
