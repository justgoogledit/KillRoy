---
name: verify-fixtures
type: foundational
trigger: Jordan says "kilroy verify fixtures" / "check the fixtures" / "run the fixture check" -- OR automatically as a required step in skill-creator's own process (see [[Skills/skill-creator/SKILL|skill-creator]] step 10) before a skill edit is considered done
inputs: optional target-skill name to scope the check to just that skill's fixture pairings (defaults to every pairing documented in Knowledge/Sources/fixtures/README.md)
outputs:
  - stdout: fixture-check report (PASS/FAIL per fixture-skill pairing, plus fixture-directory coverage on an unscoped run)
  - log.md append (prose line + structured `kilroy-log` companion line, per log.md's header contract), but only when at least one pairing (or the coverage check) fails -- never on an all-green run
---

# verify-fixtures

Walk every fixture-skill pairing documented in `Knowledge/Sources/fixtures/README.md` and dry-run each one against its target skill's own Steps and Verify section, reporting pass/fail per pairing -- including confirming the deliberately-broken/stale fixtures fail loud instead of producing a false pass. Exists so a skill edit can be confirmed not to have broken anything already proven, without hand-running each fixture individually.

## When to use

- Jordan asks directly -- "kilroy verify fixtures" / "check the fixtures."
- Automatically, as a required step in `skill-creator`'s own process, scoped to the skill just created or edited -- see [[Skills/skill-creator/SKILL|skill-creator]] step 10.
- Before trusting a change to a fixture-dependent skill's `## Verify` section -- run this instead of hand-running each fixture pairing one at a time.
- Not a substitute for a skill's own `## Verify` section run against real live data. This only re-runs the synthetic fixture matrix; it says nothing about live-connector reachability -- see [[Skills/check-connectors/SKILL|check-connectors]] for that.

This is a foundational skill (infrastructure, like `skill-creator`/`session-recap`/`check-connectors`), not a fourth Jordan-facing workflow -- it doesn't count against the "add a skill only after hitting the same manual task 3+ times" rule.

## Applies

- `Knowledge/Sources/fixtures/README.md` -- single source of truth for which fixture(s) stand in for which skill invocation, the exact substitution pattern, and every documented edge case. Read fresh every run, never duplicated inside this skill.
- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]], [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]], [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] -- the three skills the README's fixtures target. This skill drives each one's own Steps and Verify section unmodified, per the README's invocation pattern.
- `CLAUDE.md`'s fail-loud non-negotiable -- the deliberately-broken/stale fixtures exist specifically to prove this holds; this skill is the automated mechanism that confirms it on every run instead of by hand.
- [[Knowledge/Lessons/2026-07-17-execution-test-with-fixtures|2026-07-17 execution-test lesson]] -- documents the by-hand precedent this skill automates, including why dry-run output never touches the real `log.md` or gets written to `Projects/` under a real filename.

## Steps

1. Read `Knowledge/Sources/fixtures/README.md` fresh (never a cached or hardcoded copy) at the start of every run. Its "Fixture-skill pairings" table is the canonical pairing list for this run. Then parse the sections that give each pairing its meaning: "How to dry-run a skill against these fixtures" (the exact fixture-substitution invocation per skill, including synthetic env/date overrides), "Deliberate edge cases baked in" (the specific behavior each edge case must produce), and "Blocked units and team attribution" (the expected blocker set, including the deliberate design-doc discrepancy that is the fixture working as intended, not a bug).
2. Determine scope. If Jordan (or the calling skill) named a target skill, filter the parsed pairings to that skill only. If the named skill has zero pairings documented in the README (`skill-creator`, `session-recap`, `check-connectors`, and `verify-fixtures` itself currently have none), report that explicitly and stop -- this is not a FAIL. Otherwise, use every pairing parsed in step 1.
3. **Unscoped runs only**: cross-check fixture-directory completeness. List every file in `Knowledge/Sources/fixtures/` except `README.md` itself and confirm each is referenced by at least one pairing parsed in step 1. A file with zero references is a documentation-drift FAIL for this run -- name it explicitly, don't silently omit it from the report. Skip this cross-check on a scoped run; it's a repo-wide hygiene concern, not part of the named skill's own regression signal.
4. For each in-scope pairing, dry-run the target skill exactly per the README's documented invocation for that pairing: substitute the named fixture file(s) for the live call(s) they stand in for, and run every one of the target skill's own Steps AND its own `## Verify` section, in full, exactly as written (subject only to step 5's side-effect carve-out) -- including any synthetic env or date override the README specifies (e.g. `GRAPH_API_USER_OBJECT_ID` and the synthetic "today" for the Planner fixture) and any file-mtime precondition from the pairing table (`touch Knowledge/Sources/fixtures/master-tracker.csv` to now before the non-stale pairing, `touch -d "48 hours ago" Knowledge/Sources/fixtures/master-tracker-stale.csv` before the stale one, per the README's Stale-CSV section).
5. **Deliberate deviation from a full real invocation -- no real repo state changes.** Render each target skill's final artifact as an ephemeral draft (in-conversation, or a temp file outside the repo), so artifact-dependent Verify steps -- e.g. `fleet-commissioning-handoff`'s "re-read the produced markdown" check and its post-humanizer re-check -- run against a genuinely produced draft, never get skipped. The same goes for the target skill's `log.md` entry (its prose line plus its `kilroy-log` companion line): compose it as part of the ephemeral draft so log-dependent Verify steps -- e.g. the "Structured line audit" items -- run against a genuinely composed entry. This applies only where the pairing's documented scope reaches the target skill's log-append step -- pairing 6's digest-only scope does not, so `run-daily-workflow`'s log entry and its structured-line audit are out of that pairing's scope, per the README's scope note. But: do not write that draft under `Projects/`, do not append the target skill's own `log.md` entry (either line) to the real `log.md`, and do not perform any of a target skill's mid-step mutations of real files -- explicitly including `run-daily-workflow`'s `inbox.md` drain, which is simulated read-only (report what would have drained; remove nothing). Precedent: the 2026-07-17 by-hand session established never touching the real `log.md` and never using real `Projects/` filenames (it wrote one-off `-dryrun`-named artifacts); this skill goes one step stricter and writes nothing under `Projects/` at all, because it fires on every `skill-creator` edit and accumulated per-run artifacts would be sprawl -- see [[Knowledge/Lessons/2026-07-17-execution-test-with-fixtures]].
6. Score each pairing:
   - **Happy-path fixture** (including one that carries an embedded edge case, e.g. `amr-hub-response.json`'s `T3L2_050`): PASS = the target skill's own Verify section completes with no failed check, AND every edge-case behavior documented for that fixture in the README's "Deliberate edge cases" section is actually surfaced in the output (named explicitly, not silently dropped, not silently folded into a bucket it doesn't belong in). Verify passing while a documented edge case got silently dropped is a FAIL for this check.
   - **Deliberately-broken or stale/edge fixture** (`amr-hub-response-broken.json`, `master-tracker-stale.csv`): PASS for this check = the target skill correctly fails loud (hard stop, explicit error) or surfaces the documented WARN/flag, per the README's description of that fixture's purpose. A clean-looking silent success against a broken fixture is a FAIL for this check -- a false PASS -- never scored as the fixture "passing."
7. Render the report (template below): one row per in-scope pairing, plus the coverage line from step 3 on unscoped runs.
8. If every in-scope pairing PASSed (and, on an unscoped run, coverage is complete), end with "All fixtures verified -- safe to consider this skill edit done." If anything FAILed, end with "FIXTURE REGRESSION -- do not consider this skill edit done until fixed" and list which pairing(s) failed and why. Then, only on that FAIL path, append an entry to the real `log.md`: the prose line `## [<date>] setup | fixture-check failed -- <target-skill>: <fixture> (<one-line reason>), ...` (one segment per failure), followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=verify-fixtures event=fixture-check status=fail failed=<n> total=<n> orphaned=<n> skills=<comma-list of distinct failing target skills, or none> -->`, where `failed`/`total` count in-scope pairings, `orphaned` counts fixture files the step-3 coverage check found unreferenced (always 0 on a scoped run), and `skills=none` covers a coverage-only failure with no failed pairing. Do not append anything on an all-green run, or on a scoped run against a skill with no documented pairings -- same no-noise rule as `check-connectors`.

## Verify

1. **Coverage stayed complete** (unscoped runs): every fixture file in `Knowledge/Sources/fixtures/` except `README.md` was referenced by at least one pairing parsed this run. Any orphaned file is named explicitly in the report, not silently absent.
2. **Broken/stale PASSes are earned, not assumed**: for every pairing whose fixture is documented as deliberately broken/stale/edge, the report's PASS is backed by a quoted line from the target skill's actual output proving the fail-loud/WARN/flag behavior fired -- not just "the dry-run completed without erroring."
3. **No repo side effects**: no file under `Projects/` changed -- explicitly including `Projects/daily/inbox.md`, whose drain is simulated read-only -- and no line was appended to the real `log.md` by any target skill driven during this run (neither a prose line nor a `kilroy-log` companion line; a target skill's log entry is composed as part of its ephemeral draft per step 5, so its log-dependent Verify steps still run). Only this skill's own summary entry -- prose line plus its own `kilroy-log` companion -- and only on failure.
4. **Scope was honored exactly**: if a target-skill name was given, the report contains exactly that skill's documented pairings -- no more, no less. If it has none, the report says so and nothing else runs.
5. **Pairing list was read fresh**: confirm step 1 re-read `Knowledge/Sources/fixtures/README.md` this run rather than reusing a cached pairing list from earlier in the same session.
6. **Own line audit** (FAIL path only): this skill's own `kilroy-log` companion line follows `log.md`'s header contract, and its `failed=`/`total=`/`orphaned=`/`skills=` values match the report's FAIL rows and coverage line exactly -- same self-audit rule as `check-connectors`' Verify item 5.

## Output template

```markdown
# Fixture check -- <YYYY-MM-DD HH:MM CDT> -- scope: <all pairings | <skill-name>>

| Target skill | Fixture(s) | Expected | Status | Detail |
|---|---|---|---|---|
| <skill> | <fixture(s)> | <expected behavior> | PASS/FAIL | <what actually happened, quoted where relevant> |
| ... |

<Unscoped runs only:> Fixture coverage: <n> fixture files in Knowledge/Sources/fixtures/, <n> referenced by at least one pairing above. <"All accounted for." OR "Orphaned, no README entry: <file>." -- FAIL.>

<If scoped to a skill with no pairings:> No fixture pairings documented for `<skill-name>` in Knowledge/Sources/fixtures/README.md -- nothing to verify. Not a FAIL.

<"All fixtures verified -- safe to consider this skill edit done." OR "FIXTURE REGRESSION -- <n> pairing(s) failed. Do not consider this skill edit done until fixed.">
```

## Examples

**Good trigger:** *"kilroy verify fixtures"* -> unscoped, every pairing in the README's pairings table, plus the coverage cross-check.
**Good trigger (automatic, scoped):** `skill-creator` finishes editing `arriving-amr-progress` and runs this scoped to `arriving-amr-progress` -> only that skill's documented pairings run, no coverage cross-check.
**Good trigger (automatic, no pairings):** `skill-creator` finishes editing `skill-creator` itself and runs this scoped to `skill-creator` -> reports "No fixture pairings documented for skill-creator ... not a FAIL" and stops clean.

**Bad trigger:** *"why did T3L2_042 fail"* -> that's a specific-unit question, not a fixture-regression check. Use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] directly, or dry-run it by hand per the README.
**Bad trigger:** asking this skill to validate live/real data -- it only knows the synthetic fixtures in `Knowledge/Sources/fixtures/`. For live-connector reachability, use [[Skills/check-connectors/SKILL|check-connectors]]; for real-data correctness, run the target skill's own Verify section against a real pull.

## Anti-patterns

- Hardcoding a duplicate pairing list in this skill instead of parsing `Knowledge/Sources/fixtures/README.md` fresh every run -- it drifts the moment a fixture is added or changed (this already happened once: `planner-tasks-response.json` was added 2026-07-18, after the fixture set was first built).
- Writing real `Projects/` artifacts or appending a target skill's own `log.md` line during a fixture-check run. This check verifies logic, not delivery -- see Steps 4-5.
- Scoring a broken/stale fixture PASS because the target skill produced *some* output, without confirming that output is actually the documented fail-loud/WARN behavior. A silent, clean-looking result on a broken fixture is a FAIL, not a PASS.
- Running the fixture-directory completeness check (step 3) on a scoped run and blocking an unrelated skill edit over an unrelated orphaned fixture. That check is a full-run repo-hygiene check, not part of a single skill's own regression signal.
- Treating "no fixture pairings for this skill" (`skill-creator`, `session-recap`, `check-connectors`, `verify-fixtures` itself) as a FAIL. It's a valid, expected result -- report it and move on.
- Logging every all-green run. Only log failures, same rule as `check-connectors`.
