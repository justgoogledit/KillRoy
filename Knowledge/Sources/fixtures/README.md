# Fixtures -- SYNTHETIC FIXTURE DATA, NOT LIVE SOURCES

**Everything in this directory is synthetic fixture data.** None of it came from a real Overmind
GraphQL call. It exists so Kilroy's skills can be dry-run and their `## Verify` steps exercised
end-to-end in a sandboxed environment where Overmind is unreachable.

**Do not use any file in this directory as input to a real handoff package delivered to Jordan.**
Every fixture file carries its own prominent "SYNTHETIC FIXTURE DATA" marker at the top -- if a
file ever gets copied or referenced outside a dry-run, that marker should make the mistake obvious
immediately.

Consolidation note (2026-07-21): the AMR Hub, Master Tracker CSV, and Planner/Graph fixtures were
retired along with their connectors and the `arriving-amr-progress` skill -- see
`Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md`. Git history preserves them.
The surviving coverage is deliberately one happy-path pairing; no broken-Overmind fixture was
authored in the consolidation (a decision recorded there, revisit if the fail-loud path needs
fixture coverage later).

## Files

| File | Simulates | Purpose |
|---|---|---|
| `overmind-fleet-state.json` | The `overmind_get_fleet_state` MCP tool's underlying Overmind pull for `gftx-cybercab-2m-b3-agv` (the tool also accepts these flat fixture bytes directly, exactly for dry-runs) | Image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas -- the fields `fleet-commissioning-handoff` step 2 asks for. Illustrative shape only, not a real GraphQL schema dump. |
| `day-checklist-inputs.json` | The morning phase's gathered items (Teams/Loop/Planner assignments, AMR work, a mention, an FYI) feeding `run-daily-workflow`'s checklist generator | Covers every tier in that skill's `## Tier rules`, plus one same-tier pair ordered by due date and one ordered by age; `expectedChecklistOrder` pins the one correct output ordering. |

## How to dry-run a skill against these fixtures

Kilroy's skills are written to call live connectors. To dry-run without live access, tell Kilroy
explicitly which fixture stands in for which call, and to treat everything else identically --
including the `## Verify` steps. For example:

> "Dry-run `kilroy handoff gftx-cybercab-2m-b3-agv`. Use
> `Knowledge/Sources/fixtures/overmind-fleet-state.json` in place of the
> `overmind_get_fleet_state` MCP tool call, and run every other step -- including Verify --
> exactly as written."

## Fixture-skill pairings (the canonical list)

The table below is the authoritative enumeration of fixture-skill pairings -- the unit of account
for [[Skills/verify-fixtures/SKILL|verify-fixtures]] and for anyone hand-running the matrix. The
blockquote invocation above gives the pairing's exact wording; this table settles what counts as
one pairing and what it must produce.

| # | Target skill | Stand-ins | Preconditions | Expected result (PASS condition) |
|---|---|---|---|---|
| 1 | `fleet-commissioning-handoff` | `overmind-fleet-state.json` for the `overmind_get_fleet_state` MCP tool call | none | Package renders every Overmind field (image tag, robot count, tracer events, MFS wiring, yaml deltas) verbatim from the fixture; Verify's quote-back and no-fabricated-fields checks pass |
| 2 | `run-daily-workflow` (checklist-generator step only -- no live pulls, no marker or journal writes; the rest of the skill is out of this pairing's scope) | `day-checklist-inputs.json` for the morning phase's gathered items | none | Checklist ordered exactly per the skill's `## Tier rules` with the documented tiebreaks (tiers 1-5 heavy-first, earlier due date then older item within a tier -- matching the fixture's `expectedChecklistOrder`), every item citing its source (chat/task id or link) |

## Notes

- `mcp-server/`'s `node:test` suite reads `overmind-fleet-state.json` too -- one source of truth
  for both the prose dry-runs and the real tests (`mcp-server/test/overmind.test.js` and
  `test/server.test.js`).
- No em dashes anywhere in these fixtures or this README, per Kilroy's voice rules -- `--` is
  used instead.
