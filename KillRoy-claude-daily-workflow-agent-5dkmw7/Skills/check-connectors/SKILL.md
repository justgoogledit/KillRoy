---
name: check-connectors
type: foundational
trigger: Jordan says "kilroy check" / "check connections" / "are we good to run" -- OR automatically as the first sub-step of run-daily-workflow's morning phase
inputs: optional fleet-name to test Overmind against (defaults to the first non-UNVERIFIED entry in Knowledge/Sources/overmind-fleets.md)
outputs:
  - stdout: connector status report (pass/fail per source, with the specific reason on failure)
  - log.md append (prose line + structured `kilroy-log` companion line, per log.md's header contract), but only when at least one check fails -- never on an all-green run
---

# check-connectors

Verify `.env` is filled and all four data sources (Overmind, AMR Hub, Master Tracker CSV, Planner/Graph API) are reachable before any other skill tries to pull real data. Exists so a bad `.env` or a down connector fails at a single, clear checkpoint instead of mid-skill with no diagnosis.

## When to use

- Jordan asks directly -- "kilroy check" / "check connections" / "are we good to run."
- Automatically, silently, as the first thing `run-daily-workflow`'s morning phase does -- see [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] step 2.
- First-run on a new machine, right after `cp .env.example .env` -- confirms the four blanks got filled correctly before trying a real skill.
- Not a substitute for any other skill's own Verify section. This only checks that the sources are reachable, not that their data is correct.

This is a foundational skill (infrastructure, like [[Skills/skill-creator/SKILL|skill-creator]] and [[Skills/session-recap/SKILL|session-recap]]), not a fourth Jordan-facing workflow -- it doesn't count against the "add a skill only after hitting the same manual task 3+ times" rule, the same way skill-creator and session-recap don't.

**Relationship to the session-start hook** (`.claude/hooks/session-start.sh`, repo root): that hook runs a fast, fixed-timeout reachability probe on every Claude Code session start, so a bad `.env` surfaces the moment a session opens rather than only at the next morning brief. It currently only probes the original three sources (Overmind, AMR Hub, Master Tracker CSV) -- Planner/Graph API was added to this skill but not yet to the hook, so there's no reachability parity between the two on the Planner source. It is not a replacement for this skill either way -- it skips the deeper checks this skill does (listing every missing `.env` var by name, requiring the AMR Hub response to be parseable JSON with an `amrs` array via the `amr_hub_get_units` tool, requiring the Master Tracker CSV to have a plausible header row via `master_tracker_get_rows`, being callable on demand as "kilroy check") and it never writes to `log.md`. This skill remains the authoritative gate `run-daily-workflow` calls before pulling real data.

## Applies

- `.env.example` -- the eight required vars this skill checks for (four for Overmind/AMR Hub/Master Tracker, four for Planner/Graph API).
- `kilroy-connectors` MCP server (`mcp-server/`, registered in `.mcp.json`) -- the AMR Hub check goes through its `amr_hub_get_units` tool, the Overmind check through `overmind_get_fleet_state` (reachability mode), the Master Tracker check through `master_tracker_get_rows`, and the Planner check through `planner_get_tasks` (reachability mode); the server's `node:test` suite is what proves all four contracts.
- [[Knowledge/Sources/overmind-fleets|Overmind fleet reference]] -- default fleet to test Overmind reachability against.
- `CLAUDE.md`'s fail-loud non-negotiable -- this skill is the concrete mechanism for it.

## Steps

1. Confirm `.env` exists at the repo root. If missing, stop immediately -- every other check depends on it. Report: "No `.env` found. Run `cp .env.example .env` and fill it in."
2. Confirm the required vars are present and non-empty: `OVERMIND_BASE_URL_TEMPLATE`, `AMR_HUB_BASE_URL`, `MASTER_TRACKER_CSV_PATH`, `MASTER_TRACKER_STALE_WARN_HOURS`, `GRAPH_API_TENANT_ID`, `GRAPH_API_CLIENT_ID`, `GRAPH_API_CLIENT_SECRET`, `PLANNER_PLAN_IDS`. (`OVERMIND_TIMEOUT_SEC` and `GRAPH_API_USER_OBJECT_ID` both have a sane default if unset -- the former falls back to a built-in timeout, the latter to a runtime `GET /me` resolution -- don't hard-fail on either alone.) List every missing or empty var by name; don't stop at the first one.
3. **AMR Hub** -- call the `amr_hub_get_units` tool on the `kilroy-connectors` MCP server (registered in `.mcp.json`; it reads `AMR_HUB_BASE_URL` from `.env` itself). Pass = the tool returns a unit list. The tool enforces what this step used to describe in prose (2xx response, parseable JSON) plus one deliberate tightening: the body must also contain an `amrs` array. A 2xx JSON body without that shape was never a healthy AMR Hub, and treating it as a pass would mask a broken deploy -- so it now FAILs here where the old prose check would have passed it. Fail = the tool call returns an error -- record the tool's specific message (it names syscall codes like connection-refused/timeout, HTTP status, unparseable body, wrong shape, and bad/missing `AMR_HUB_BASE_URL` distinctly), not a generic "unreachable." If the MCP server itself isn't available in the session, that is a FAIL for this check, reported as such -- don't fall back to a hand-rolled HTTP call; the tested tool is the contract now.
4. **Overmind** -- call the `overmind_get_fleet_state` tool on the `kilroy-connectors` MCP server with `reachabilityOnly: true` and the target fleet as `fleetId` (the fleet-name input if Jordan gave one, else the first non-UNVERIFIED entry in `Knowledge/Sources/overmind-fleets.md`). If every entry there is UNVERIFIED and no fleet-name was given, skip this check and say why -- don't guess a fleet id. The tool substitutes `{fleet}` into `OVERMIND_BASE_URL_TEMPLATE` and probes the fleet base URL within `OVERMIND_TIMEOUT_SEC` itself. Pass = the tool reports `reachable: true` -- any HTTP response counts, auth-rejected included (v1 is on-corp-network-open, so reachability is what's being tested here, not data access; the tool's reachability mode encodes exactly that). Fail = the tool errors -- record its specific message (it names the syscall code, the bad template, or the bad timeout distinctly). No hand-rolled fallback if the MCP server is missing; that's a FAIL, same as the AMR Hub rule above.
5. **Master Tracker CSV** -- call the `master_tracker_get_rows` tool on the `kilroy-connectors` MCP server (no filter; it reads `MASTER_TRACKER_CSV_PATH` and `MASTER_TRACKER_STALE_WARN_HOURS` from `.env` itself). Pass = the tool returns rows (it enforces file-exists, readable, and a plausible header, and errors with the specific reason otherwise). The tool's `stale` flag is the mtime comparison -- `stale: true` is a WARN, never a FAIL; staleness doesn't block anything, it just means the freshness banner will need to fire downstream in `fleet-commissioning-handoff` (its `ageHours` value is the banner's `<N>`). Fail = the tool errors -- record its specific message. No hand-rolled file read if the MCP server is missing; that's a FAIL, same rule as the other checks.
6. **Planner / Graph API** -- if `PLANNER_PLAN_IDS` is empty, skip this check and say why -- don't guess a plan id. Otherwise call the `planner_get_tasks` tool on the `kilroy-connectors` MCP server with `reachabilityOnly: true` (no other args; it reads `GRAPH_API_TENANT_ID`/`GRAPH_API_CLIENT_ID`/`GRAPH_API_CLIENT_SECRET`/`PLANNER_PLAN_IDS` from `.env` itself). The tool acquires a token, then probes only the first entry in `PLANNER_PLAN_IDS` as the representative target, same shape as the Overmind check above -- full multi-plan enumeration happens only in the actual data pull, in `run-daily-workflow`'s morning phase, not here. Pass = the tool reports `reachable: true` -- any HTTP response counts, auth-rejected included (same reasoning as Overmind -- reachability is what's being tested here, not whether today's credentials are valid or whose tasks resolve). Fail = the tool errors -- record its specific message (it names the syscall code, or the specific missing/empty `.env` var, distinctly). No hand-rolled token/HTTP fallback if the MCP server is missing; that's a FAIL, same rule as the other checks. `GRAPH_API_USER_OBJECT_ID` and the `/me` resolution don't factor into this check -- assignment-based filtering only happens in `run-daily-workflow`'s actual data pull.
7. Render the status report (template below). If any of steps 2-6 hard-failed, end with `NOT SAFE TO RUN A SKILL` and stop there -- don't let a caller proceed into `arriving-amr-progress`, `fleet-commissioning-handoff`, or `run-daily-workflow`'s data-pulling steps on a red check.
8. Only if at least one check failed, append an entry to `log.md` -- the prose line `## [<date>] setup | connector-check failed -- <source>: <one-line reason>, ...`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=check-connectors event=connector-check status=fail failed=<n> sources=<comma-list> -->`, where `failed` counts the FAIL rows and `sources` names them from the fixed set `env,amr-hub,overmind,master-tracker,planner`. Do not append anything on an all-green run -- log.md would fill with noise otherwise.

## Verify

1. Every FAIL line names the specific check and the concrete reason (missing var name, connection error, HTTP status, file-not-found) -- never a generic "something's wrong."
2. A stale-but-readable CSV never produces a hard FAIL on its own -- only a WARN. Confirm the distinction holds in the rendered report.
3. If `.env` itself is missing, steps 3-6 are skipped entirely (nothing to check against) rather than run with defaulted or guessed values.
4. No `log.md` line is written on an all-green run.
5. If the failure entry was written: the `kilroy-log` companion line sits on the line immediately after the prose line, follows the contract in `log.md`'s header, and its `failed=` count and `sources=` list match the FAIL rows in the rendered report exactly.

## Output template

```markdown
# Connector check -- <YYYY-MM-DD HH:MM CDT>

| Source | Status | Detail |
|---|---|---|
| .env | PASS/FAIL | <detail> |
| AMR Hub (`$AMR_HUB_BASE_URL`) | PASS/FAIL | <detail> |
| Overmind (`<fleet>`) | PASS/FAIL | <detail> |
| Master Tracker CSV | PASS/FAIL | <detail> |
| Master Tracker freshness | PASS/WARN | <n>h old (threshold <n>h) |
| Planner / Graph API (`<first plan id>`) | PASS/FAIL | <detail> |

<"All green -- safe to run." OR "NOT SAFE TO RUN A SKILL -- fix the FAIL rows above first.">
```

## Examples

**Good trigger:** *"kilroy check"* -> full report on demand.
**Good trigger (automatic):** `run-daily-workflow`'s morning phase runs this first, silently, and only surfaces the report if something failed.

**Bad trigger:** *"why is T3L2_042 stuck"* -> that's a data question about a specific unit, not a connector-reachability question. Use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]].

## Anti-patterns

- Treating a stale CSV as a hard FAIL. It's a WARN -- the freshness banner in `fleet-commissioning-handoff` already handles it downstream.
- Guessing at `.env` values instead of stopping when they're missing.
- Logging every all-green run. Only log failures, or `log.md` becomes noise no one reads.
- Letting a caller proceed into a data-pulling skill after a FAIL here. This check exists specifically to stop that.
