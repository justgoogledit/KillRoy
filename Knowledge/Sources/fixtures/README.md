# Fixtures -- SYNTHETIC FIXTURE DATA, NOT LIVE SOURCES

**Everything in this directory is synthetic fixture data.** None of it came from a real Overmind
GraphQL call, a real AMR Hub / `amrtracker` instance, a real Sonic AMR Master Tracker export, or a
real Microsoft Graph / Planner API call. It exists so Kilroy's skills (`arriving-amr-progress`,
`fleet-commissioning-handoff`, `run-daily-workflow`) can be dry-run and their `## Verify` steps
exercised end-to-end in this sandboxed environment, where Overmind, AMR Hub, the Master Tracker
CSV, and Graph/Planner are all unreachable.

**Do not use any file in this directory as input to a real handoff or progress package delivered
to Jordan.** Every fixture file carries its own prominent "SYNTHETIC FIXTURE DATA" marker at the
top -- if a file ever gets copied or referenced outside a dry-run, that marker should make the
mistake obvious immediately.

## Files

| File | Simulates | Purpose |
|---|---|---|
| `amr-hub-response.json` | `GET $AMR_HUB_BASE_URL/api/amrs` (happy path, fleet `gftx-cybercab-2m-b3-agv`) | Full gate-ladder board: 12 clean units matching the design doc's 3/2/4/2/1 split, plus 1 deliberately-broken unit (13 total). |
| `amr-hub-response-broken.json` | AMR Hub unreachable / malformed response | Deliberately invalid (truncated/corrupted) JSON. Tests that Kilroy fails loud instead of silently treating it as zero units. |
| `master-tracker.csv` | `$MASTER_TRACKER_CSV_PATH` export (happy path) | Cross-reference source. Deliberately out of sync with the AMR Hub fixture by one row in each direction (see Edge cases below). |
| `master-tracker-stale.csv` | Same CSV export, but stale | Byte-identical data to `master-tracker.csv`. The point of this file is its file *mtime*, not its content -- see Stale-CSV test below. |
| `overmind-fleet-state.json` | Overmind GraphQL fleet state for `gftx-cybercab-2m-b3-agv` | Image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas -- the fields `fleet-commissioning-handoff` step 2 asks for. Illustrative shape only, not a real GraphQL schema dump. |
| `planner-tasks-response.json` | Microsoft Graph Planner task pull (happy path, across 2 plans) | 5 synthetic `plannerTask` objects for `run-daily-workflow`'s morning-phase Planner digest: 2 tasks due today assigned to Jordan (across both plans), 1 task due today assigned to someone else (must be filtered out), 1 task not due today, 1 task with a null `dueDateTime` (edge case). Illustrative shape only, not a full Graph schema dump. |

## How to dry-run a skill against these fixtures

Kilroy's skills are written to call live connectors (`GET /api/amrs`, Overmind GraphQL, the CSV
path in `.env`). To dry-run without live access, tell Kilroy explicitly which fixture stands in
for which call, and to treat everything else identically -- including the `## Verify` steps. For
example:

> "Dry-run `kilroy progress gftx-cybercab-2m-b3-agv`. Read
> `Knowledge/Sources/fixtures/amr-hub-response.json` in place of a live
> `GET $AMR_HUB_BASE_URL/api/amrs` call, and run every other step -- including Verify -- exactly
> as written."

For `fleet-commissioning-handoff`, name all three stand-ins:

> "Dry-run `kilroy handoff gftx-cybercab-2m-b3-agv`. Use
> `Knowledge/Sources/fixtures/overmind-fleet-state.json` in place of the Overmind GraphQL pull,
> `Knowledge/Sources/fixtures/amr-hub-response.json` in place of `GET /api/amrs`, and
> `Knowledge/Sources/fixtures/master-tracker.csv` in place of `$MASTER_TRACKER_CSV_PATH`. Run
> Verify exactly as written, including the CSV freshness check against this file's real mtime."

To test the failure paths, swap in the broken/stale fixtures by name in the same pattern (e.g.
"read `amr-hub-response-broken.json` instead" or "use `master-tracker-stale.csv` instead").

For `run-daily-workflow`'s morning-phase Planner digest, name the Planner fixture and the
synthetic env override together:

> "Dry-run the morning phase of `run-daily-workflow`. Use
> `Knowledge/Sources/fixtures/planner-tasks-response.json` in place of the live Graph API pull
> across `PLANNER_PLAN_IDS`, treat `GRAPH_API_USER_OBJECT_ID=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`
> as the resolved Jordan object ID (skip the real `GET /me` call), and treat **2026-07-18** (the
> fixture's baked-in reference date -- see below) as 'today' for the due-today comparison. Run
> Verify exactly as written, including the data-quality-flag check on the null-`dueDateTime` task."

### Synthetic env values for the Planner fixture

`planner-tasks-response.json` is keyed to one specific synthetic "Jordan" GUID. To dry-run against
it, use this value for `GRAPH_API_USER_OBJECT_ID` (overriding the real `/me` resolution):

```
GRAPH_API_USER_OBJECT_ID=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee
```

The fixture is also keyed to one specific synthetic "today": **2026-07-18**. Every `dueDateTime`
in the file is fixed (the due-today tasks carry `2026-07-18T05:00:00Z` -- midnight CDT), so a
dry-run on any other real calendar date must treat 2026-07-18 as "today" for the due-today
comparison, or the filter correctly-but-uselessly returns zero due-today tasks. Same idea as the
GUID override above: the fixture bakes in a reference value, the dry-run adopts it. (Found by the
first `verify-fixtures` run on 2026-07-19, one day after the fixture was written.)

The fixture also includes a second synthetic GUID, `11111111-2222-4333-8444-555555555555`,
assigned to a task that is due today but is **not** Jordan's -- this is the "assigned to someone
else" case used to test that the assignment filter actually filters (see Deliberate edge cases
below). It is not a value you set in `.env`; it exists only inside the fixture to be filtered out.

## Fixture-skill pairings (the canonical list)

The table below is the authoritative enumeration of fixture-skill pairings -- the unit of account
for [[Skills/verify-fixtures/SKILL|verify-fixtures]] and for anyone hand-running the matrix. The
blockquote invocations above give each pairing's exact wording; this table settles what counts as
one pairing and what each must produce.

| # | Target skill | Stand-ins | Preconditions | Expected result (PASS condition) |
|---|---|---|---|---|
| 1 | `arriving-amr-progress` | `amr-hub-response.json` for `GET /api/amrs` | none | 3/2/4/2/1 board across the gate buckets, `T3L2_050` under `Data quality flags` (sum audit 12+1=13), all 4 blockers attributed per the gate ownership map |
| 2 | `arriving-amr-progress` | `amr-hub-response-broken.json` for `GET /api/amrs` | none | Fails loud on the unparseable body -- no board, never a false "0 units" |
| 3 | `fleet-commissioning-handoff` | `overmind-fleet-state.json` for the Overmind pull, `amr-hub-response.json` for `GET /api/amrs`, `master-tracker.csv` for `$MASTER_TRACKER_CSV_PATH` | `touch master-tracker.csv` to now | Package with both cross-reference findings (`T3L2_047` hub-only, `T3L2_051` CSV-only), no staleness banner |
| 4 | `fleet-commissioning-handoff` | as pairing 3, but `amr-hub-response-broken.json` | none | Fails loud at the AMR Hub pull -- no package, partial or otherwise |
| 5 | `fleet-commissioning-handoff` | as pairing 3, but `master-tracker-stale.csv` | `touch -d "48 hours ago" master-tracker-stale.csv` | Package renders the `> Warning: Master Tracker CSV is <N>h old...` banner |
| 6 | `run-daily-workflow` (morning-phase Planner digest step only) | `planner-tasks-response.json` for the Graph API pull | `GRAPH_API_USER_OBJECT_ID` override + synthetic "today" 2026-07-18, both per the section above | `FIXTURE-taskId-0001` and `0005` listed, grouped by plan name; `0002` excluded (wrong assignee); `0003` excluded (due in the future); `0004` named under `Data quality flags (Planner)` |

Scope note on pairing 6: it exercises only the Planner-digest step of `run-daily-workflow`'s
morning phase. The phase's opening `check-connectors` gate and its `arriving-amr-progress`
sub-run are deliberately out of this pairing's scope -- the former is a live-reachability check
with no fixture stand-in (it correctly FAILs in a sandbox with no `.env`, which would stop the
phase before the digest), and the latter is already covered directly by pairings 1-2.

## Deliberate edge cases baked in

1. **Null-field unit (`T3L2_050` in `amr-hub-response.json`)** -- `buyoff250Status` is JSON
   `null` instead of a valid status string. All other fields on this unit are populated and
   plausible (220 Complete, 270/280 NotStarted, a normal `updatedAt`) so the unit does not look
   complete or otherwise "safe" by accident -- the only defect is the one null field. This tests
   the fail-loud non-negotiable in `CLAUDE.md`: a missing/errored field must never silently
   resolve to `Complete`, and the unit must not be silently dropped or silently bucketed. It also
   exercises `arriving-amr-progress`'s Verify step 1 (sum audit): the file has 13 units total but
   only 12 cleanly bucket into `at-220`/`at-250`/`at-270`/`at-280`/`production-ready` -- Kilroy
   should notice the discrepancy and flag `T3L2_050` rather than silently reporting 12/13 or
   forcing it into a bucket. The unit also carries an inline `_edgeCaseNote` field (not a real
   AMR Hub field) documenting the defect for whoever is reading the fixture by eye.

2. **Broken AMR Hub response (`amr-hub-response-broken.json`)** -- deliberately truncated,
   invalid JSON, simulating a connection cut / proxy error mid-response rather than an empty
   `{}` with no `amrs` key. This was the one clean failure mode chosen (see the file's own header
   comment for the reasoning): it forces a hard parse failure, which is an unambiguous test of
   "fail loud, don't guess" -- there is no plausible way to read this file and produce a `0
   units` or `production-ready: 0` result without the failure being obvious in the process.

3. **Two cross-reference mismatches between `amr-hub-response.json` and `master-tracker.csv`:**
   - `T3L2_047` is present in the AMR Hub fixture (at gate 220) but has **no row** in
     `master-tracker.csv`. This tests the "in dashboard, no upstream record" finding
     (`fleet-commissioning-handoff` step 5).
   - `T3L2_051` has a row in `master-tracker.csv` (pipeline status "In-transit", future ETA) but
     **does not appear** in `amr-hub-response.json`. This tests the "incoming, not yet ingested"
     finding.
   - All other units (`T3L2_038` through `T3L2_046`, `T3L2_048` through `T3L2_050`) appear in
     both fixtures, for the happy-path cross-reference.

4. **Assignment-filter case and null-due-date case (`planner-tasks-response.json`)** -- two
   deliberate cases in the Planner fixture:
   - `FIXTURE-taskId-0002` is due today but assigned to a different AAD object GUID
     (`11111111-2222-4333-8444-555555555555`), not Jordan's (`GRAPH_API_USER_OBJECT_ID`,
     `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`). This tests that the "my assigned tasks" filter
     actually filters on the `assignments` GUID rather than pulling every due-today task in the
     plan. It must NOT appear in Jordan's digest.
   - `FIXTURE-taskId-0004` has a JSON `null` `dueDateTime`, mirroring `amr-hub-response.json`'s
     `T3L2_050` null-field pattern. It is assigned to Jordan, so a naive implementation could
     silently drop it or silently miscount it as not-due-today. It must be named explicitly in
     its own data-quality-flag section, not folded into the main due-today list and not silently
     dropped. Both cases carry an inline `_edgeCaseNote` field, same convention as
     `amr-hub-response.json`.
   - The remaining tasks (`FIXTURE-taskId-0001`, `0003`, `0005`) are the happy-path set: two due
     today and assigned to Jordan, spread across both `planId` values (to exercise the
     group-by-plan-name digest behavior), and one assigned to Jordan but due on a future date (to
     exercise the due-today-only filter -- see the anti-pattern against inventing
     overdue-item handling in `run-daily-workflow/SKILL.md`).

5. **Stale-CSV case (`master-tracker-stale.csv`)** -- content is byte-identical to
   `master-tracker.csv`; only the file's mtime differs. `MASTER_TRACKER_STALE_WARN_HOURS=24` per
   `.env.example`, and `fleet-commissioning-handoff` Verify step 4 requires a
   `> Warning: Master Tracker CSV is <N>h old...` line when the CSV is older than that threshold.
   Because git does not preserve mtimes across commit/checkout, **re-set the mtime immediately
   before each dry-run** that needs to exercise this path:
   ```bash
   touch -d "48 hours ago" Knowledge/Sources/fixtures/master-tracker-stale.csv
   ```
   48 hours comfortably clears the 24h threshold. To test the non-stale path, dry-run against
   plain `master-tracker.csv` instead. Its mtime is whenever it was last written or checked out --
   and because git does not preserve mtimes, a checkout (or long-lived container) older than
   `MASTER_TRACKER_STALE_WARN_HOURS` reads as stale even though the file is the "fresh" fixture.
   Re-set it to now immediately before any dry-run that needs the non-stale path:
   ```bash
   touch Knowledge/Sources/fixtures/master-tracker.csv
   ```
   (Found by the first `verify-fixtures` run on 2026-07-19, in a container whose checkout was ~48h
   old.)

## Blocked units and team attribution (for `arriving-amr-progress` / blocker grouping tests)

`amr-hub-response.json` has 4 blocked units, spread across the 3 teams that actually own gates
per `Knowledge/Sources/2026-07-02-pc-amr-gates.md` (220 -> MFA Hardware, 250/270 -> MFA Controls,
280 -> MFE):

- `T3L2_049` -- blocked at gate 220, ~7 days stale -- MFA Hardware
- `T3L2_046` -- blocked at gate 250, ~2 days -- MFA Controls
- `T3L2_042` -- blocked at gate 270, ~6 days stale -- MFA Controls
- `T3L2_040` -- blocked at gate 280, ~3 days -- MFE

Two of the four blocker texts are reused verbatim from the design doc's illustrative sample
(`docs/superpowers/specs/2026-07-02-kilroy-design.md`): `T3L2_042`'s "dolly size 4 fails
localization" and `T3L2_040`'s "throughput below 93.6% avail target". Note the design doc's own
sample groups the gate-270 blocker under "MFE" -- that predates the authoritative gate ownership
map, which assigns 270 to MFA Controls. This fixture follows the current authoritative map, not
the older design-doc sample grouping; if a dry-run surfaces that discrepancy, that is the fixture
working as intended, not a bug in Kilroy.

`updatedAt` timestamps across all 13 units span from same-day (`T3L2_047`, arrived today) to 7
days stale (`T3L2_049`), so days-blocked math has real variance to exercise, not just the four
blocked units above.

## No em dashes

Per Kilroy's voice rules, no em dashes appear anywhere in these fixtures or in this README --
`--` is used instead.
