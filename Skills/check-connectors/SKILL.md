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

Verify `.env` is filled and both data sources (Overmind, Planner via Nova's `planner` MCP) are reachable before any other skill tries to pull real data. Exists so a bad `.env` or a down connector fails at a single, clear checkpoint instead of mid-skill with no diagnosis.

Scope note (2026-07-21 consolidation): AMR Hub, the Master Tracker CSV, and the Graph-API `planner_get_tasks` tool were retired -- see `Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md` for the decision record. Overmind is the only remaining `kilroy-connectors` typed tool; Planner now goes exclusively through Nova's general-purpose `planner` MCP.

## When to use

- Jordan asks directly -- "kilroy check" / "check connections" / "are we good to run."
- Automatically, silently, as the first thing `run-daily-workflow`'s morning phase does -- see [[Skills/run-daily-workflow/SKILL|run-daily-workflow]].
- First-run on a new machine, right after `cp .env.example .env` -- confirms the blanks got filled correctly before trying a real skill.
- Not a substitute for any other skill's own Verify section. This only checks that the sources are reachable, not that their data is correct.

This is a foundational skill (infrastructure, like [[Skills/skill-creator/SKILL|skill-creator]] and [[Skills/session-recap/SKILL|session-recap]]), not a Jordan-facing workflow -- it doesn't count against the "add a skill only after hitting the same manual task 3+ times" rule.

**Relationship to the session-start hook** (`.claude/hooks/session-start.sh`, machine-local, gitignored): that hook runs a fast, fixed-timeout reachability probe on every Claude Code session start, so a bad `.env` surfaces the moment a session opens rather than only at the next morning brief. Its probe scope must match this skill's two-source scope (Overmind, Planner). It is not a replacement for this skill -- it skips the deeper checks (listing every missing `.env` var by name, being callable on demand as "kilroy check") and never writes to `log.md`. This skill remains the authoritative gate `run-daily-workflow` calls before pulling real data.

`triage-personal-items`' other MCP calls (`mail`, `microsoft-teams`) stay outside this skill's probe scope, as before -- its own fail-loud handling lives in its Verify section.

## Applies

- `.env.example` -- the required Overmind vars this skill checks for.
- `kilroy-connectors` MCP server (`mcp-server/`, registered in `.mcp.json`) -- the Overmind check goes through its `overmind_get_fleet_state` tool (reachability mode); the server's `node:test` suite is what proves the contract.
- Nova's `planner` MCP -- the Planner check is a minimal live call against it (untyped, untested by `mcp-server`'s suite; a disclosed tradeoff of the consolidation).
- [[Knowledge/Sources/overmind-fleets|Overmind fleet reference]] -- default fleet to test Overmind reachability against.
- `CLAUDE.md`'s fail-loud non-negotiable -- this skill is the concrete mechanism for it.

## Steps

1. Confirm `.env` exists at the repo root. If missing, stop immediately -- every other check depends on it. Report: "No `.env` found. Run `cp .env.example .env` and fill it in."
2. Confirm the required var is present and non-empty: `OVERMIND_BASE_URL_TEMPLATE`. (`OVERMIND_TIMEOUT_SEC` has a sane built-in default if unset -- don't hard-fail on it alone.) List every missing or empty var by name; don't stop at the first one.
3. **Overmind** -- call the `overmind_get_fleet_state` tool on the `kilroy-connectors` MCP server with `reachabilityOnly: true` and the target fleet as `fleetId` (the fleet-name input if Jordan gave one, else the first non-UNVERIFIED entry in `Knowledge/Sources/overmind-fleets.md`). If every entry there is UNVERIFIED and no fleet-name was given, skip this check and say why -- don't guess a fleet id. The tool substitutes `{fleet}` into `OVERMIND_BASE_URL_TEMPLATE` and probes the fleet base URL within `OVERMIND_TIMEOUT_SEC` itself. Pass = the tool reports `reachable: true` -- any HTTP response counts, auth-rejected included (v1 is on-corp-network-open, so reachability is what's being tested, not data access). Fail = the tool errors -- record its specific message (it names the syscall code, the bad template, or the bad timeout distinctly). No hand-rolled fallback if the MCP server is missing; that's a FAIL, reported as such.
4. **Planner (Nova `planner` MCP)** -- make one minimal read-only call against the `planner` MCP (e.g. list plans or tasks with the smallest available scope). Pass = the MCP responds without error. Fail = the MCP server is absent from the session or the call errors -- record the specific message. Don't retry-loop, don't fall back to any Graph API call (that path was retired); a missing `planner` MCP is a FAIL, not a skip.
5. Render the status report (template below). If any of steps 2-4 hard-failed, end with `NOT SAFE TO RUN A SKILL` and stop there -- don't let a caller proceed into `fleet-commissioning-handoff` or `run-daily-workflow`'s data-pulling steps on a red check.
6. Only if at least one check failed, append an entry to `log.md` -- the prose line `## [<date>] setup | connector-check failed -- <source>: <one-line reason>, ...`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=check-connectors event=connector-check status=fail failed=<n> sources=<comma-list> -->`, where `failed` counts the FAIL rows and `sources` names them from the fixed set `env,overmind,planner`. Do not append anything on an all-green run -- log.md would fill with noise otherwise.

## Verify

1. Every FAIL line names the specific check and the concrete reason (missing var name, connection error, HTTP status, absent MCP server) -- never a generic "something's wrong."
2. If `.env` itself is missing, steps 3-4 are skipped entirely (nothing to check against) rather than run with defaulted or guessed values.
3. No `log.md` line is written on an all-green run.
4. If the failure entry was written: the `kilroy-log` companion line sits on the line immediately after the prose line, follows the contract in `log.md`'s header, and its `failed=` count and `sources=` list match the FAIL rows in the rendered report exactly.

## Output template

```markdown
# Connector check -- <YYYY-MM-DD HH:MM CDT>

| Source | Status | Detail |
|---|---|---|
| .env | PASS/FAIL | <detail> |
| Overmind (`<fleet>`) | PASS/FAIL | <detail> |
| Planner (Nova `planner` MCP) | PASS/FAIL | <detail> |

<"All green -- safe to run." OR "NOT SAFE TO RUN A SKILL -- fix the FAIL rows above first.">
```

## Examples

**Good trigger:** *"kilroy check"* -> full report on demand.
**Good trigger (automatic):** `run-daily-workflow`'s morning phase runs this first, silently, and only surfaces the report if something failed.

**Bad trigger:** *"why is T3L2_042 stuck"* -> that's a live-fleet data question, not a connector-reachability question. Route it to the `overmind` MCP (`AskOvermind`).

## Anti-patterns

- Guessing at `.env` values instead of stopping when they're missing.
- Logging every all-green run. Only log failures, or `log.md` becomes noise no one reads.
- Letting a caller proceed into a data-pulling skill after a FAIL here. This check exists specifically to stop that.
- Reviving a Graph API fallback for the Planner check. Nova's `planner` MCP is the sole path now; if it's down, the check fails loud.
