---
name: check-connectors
type: foundational
trigger: Jordan says "kilroy check" / "check connections" / "are we good to run" -- OR automatically as the first sub-step of run-daily-workflow's morning phase
inputs: optional fleet-name to test Overmind against (defaults to the first non-UNVERIFIED entry in Knowledge/Sources/overmind-fleets.md)
outputs:
  - stdout: connector status report (pass/fail per source, with the specific reason on failure)
  - log.md append, but only when at least one check fails -- never on an all-green run
---

# check-connectors

Verify `.env` is filled and all three data sources (Overmind, AMR Hub, Master Tracker CSV) are reachable before any other skill tries to pull real data. Exists so a bad `.env` or a down connector fails at a single, clear checkpoint instead of mid-skill with no diagnosis.

## When to use

- Jordan asks directly -- "kilroy check" / "check connections" / "are we good to run."
- Automatically, silently, as the first thing `run-daily-workflow`'s morning phase does -- see [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] step 2.
- First-run on a new machine, right after `cp .env.example .env` -- confirms the three blanks got filled correctly before trying a real skill.
- Not a substitute for any other skill's own Verify section. This only checks that the sources are reachable, not that their data is correct.

This is a foundational skill (infrastructure, like [[Skills/skill-creator/SKILL|skill-creator]] and [[Skills/session-recap/SKILL|session-recap]]), not a fourth Jordan-facing workflow -- it doesn't count against the "add a skill only after hitting the same manual task 3+ times" rule, the same way skill-creator and session-recap don't.

## Applies

- `.env.example` -- the four required vars this skill checks for.
- [[Knowledge/Sources/overmind-fleets|Overmind fleet reference]] -- default fleet to test Overmind reachability against.
- `CLAUDE.md`'s fail-loud non-negotiable -- this skill is the concrete mechanism for it.

## Steps

1. Confirm `.env` exists at the repo root. If missing, stop immediately -- every other check depends on it. Report: "No `.env` found. Run `cp .env.example .env` and fill it in."
2. Confirm the required vars are present and non-empty: `OVERMIND_BASE_URL_TEMPLATE`, `AMR_HUB_BASE_URL`, `MASTER_TRACKER_CSV_PATH`, `MASTER_TRACKER_STALE_WARN_HOURS`. (`OVERMIND_TIMEOUT_SEC` has a sane default if unset -- don't hard-fail on it alone.) List every missing or empty var by name; don't stop at the first one.
3. **AMR Hub** -- attempt `GET $AMR_HUB_BASE_URL/api/amrs` with a short timeout. Pass = any 2xx response with a parseable JSON body. Fail = connection refused, timeout, non-2xx, or unparseable body -- record the specific error, not a generic "unreachable."
4. **Overmind** -- substitute `{fleet}` in `OVERMIND_BASE_URL_TEMPLATE` with the target fleet (the fleet-name input if Jordan gave one, else the first non-UNVERIFIED entry in `Knowledge/Sources/overmind-fleets.md`). If every entry there is UNVERIFIED and no fleet-name was given, skip this check and say why -- don't guess a fleet id. Attempt a connection within `$OVERMIND_TIMEOUT_SEC`. Pass = any response, including an auth-rejected one (v1 is on-corp-network-open, so reachability is what's being tested here, not data access). Fail = timeout or connection error -- record the specific error.
5. **Master Tracker CSV** -- confirm the file exists at `$MASTER_TRACKER_CSV_PATH` and is readable. That alone is pass/fail. Separately, compare its `mtime` against `$MASTER_TRACKER_STALE_WARN_HOURS` -- a stale file is a WARN, never a FAIL. Staleness doesn't block anything; it just means the freshness banner will need to fire downstream in `fleet-commissioning-handoff`.
6. Render the status report (template below). If any of steps 2-5 hard-failed, end with `NOT SAFE TO RUN A SKILL` and stop there -- don't let a caller proceed into `arriving-amr-progress`, `fleet-commissioning-handoff`, or `run-daily-workflow`'s data-pulling steps on a red check.
7. Only if at least one check failed, append one line to `log.md`: `## [<date>] setup | connector-check failed -- <source>: <one-line reason>, ...`. Do not append anything on an all-green run -- log.md would fill with noise otherwise.

## Verify

1. Every FAIL line names the specific check and the concrete reason (missing var name, connection error, HTTP status, file-not-found) -- never a generic "something's wrong."
2. A stale-but-readable CSV never produces a hard FAIL on its own -- only a WARN. Confirm the distinction holds in the rendered report.
3. If `.env` itself is missing, steps 3-5 are skipped entirely (nothing to check against) rather than run with defaulted or guessed values.
4. No `log.md` line is written on an all-green run.

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
