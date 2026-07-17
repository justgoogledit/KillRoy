# Fixtures -- SYNTHETIC FIXTURE DATA, NOT LIVE SOURCES

**Everything in this directory is synthetic fixture data.** None of it came from a real Overmind
GraphQL call, a real AMR Hub / `amrtracker` instance, or a real Sonic AMR Master Tracker export.
It exists so Kilroy's skills (`arriving-amr-progress`, `fleet-commissioning-handoff`,
`run-daily-workflow`) can be dry-run and their `## Verify` steps exercised end-to-end in this
sandboxed environment, where Overmind, AMR Hub, and the Master Tracker CSV are all unreachable.

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

4. **Stale-CSV case (`master-tracker-stale.csv`)** -- content is byte-identical to
   `master-tracker.csv`; only the file's mtime differs. `MASTER_TRACKER_STALE_WARN_HOURS=24` per
   `.env.example`, and `fleet-commissioning-handoff` Verify step 4 requires a
   `> Warning: Master Tracker CSV is <N>h old...` line when the CSV is older than that threshold.
   Because git does not preserve mtimes across commit/checkout, **re-set the mtime immediately
   before each dry-run** that needs to exercise this path:
   ```bash
   touch -d "48 hours ago" Knowledge/Sources/fixtures/master-tracker-stale.csv
   ```
   48 hours comfortably clears the 24h threshold. To test the non-stale path, dry-run against
   plain `master-tracker.csv` instead (its mtime is whenever it was last written/checked out,
   which should read as fresh).

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
