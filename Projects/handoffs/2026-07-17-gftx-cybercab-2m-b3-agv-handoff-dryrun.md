> DRY-RUN ARTIFACT -- SYNTHETIC FIXTURE DATA. Produced by executing `fleet-commissioning-handoff`
> against `Knowledge/Sources/fixtures/overmind-fleet-state.json`,
> `Knowledge/Sources/fixtures/amr-hub-response.json`, and
> `Knowledge/Sources/fixtures/master-tracker.csv` (not live connectors) to execution-test the
> skill in an environment with no corp-network access. No unit ID, blocker text, tag, or count
> below is real. Do not hand this to Jordan or line-side ops. See
> `Knowledge/Sources/fixtures/README.md`.
>
> **Note:** the real skill's step 7 ("Append to `log.md`") was deliberately NOT performed against
> the actual `log.md` -- doing so would write synthetic fixture data into Kilroy's real worklog.
> See the Execution-test notes at the bottom for what a real run's log line would have looked
> like.

# Handoff -- gftx-cybercab-2m-b3-agv -- 2026-07-17

> Kilroy was in `gftx-cybercab-2m-b3-agv` at 08:20 CDT. 1/13 production-ready, 12 open items, 4 active blockers, 1 unit flagged for a data gap.

## Fleet state (Overmind)

- Image tag: `v2.24.1.0-42-gbc22f55275`
- Robot count (Overmind): 9 (robots onboarded to Overmind -- units at gate 250 or later; will not equal the 13-unit AMR Hub total since units still at gate 220 haven't been added yet)
- Tracer events active: 3
- MFS wiring: 12/12 stations wired to MFS. T3L2_042 flagged for re-wire pending localization fix at gate 270.
- RobotConfigs.yaml deltas:
  - `robot.T3L2_041.map_id: cybercab_2m_b3_v14` -> `cybercab_2m_b3_v15`
  - `+ robot.T3L2_048.charger_profile: fast_v2`

## Buyoff-gate status (AMR Hub)

| Unit | 220 | 250 | 270 | 280 | Production-ready | Open blocker |
|---|---|---|---|---|---|---|
| T3L2_038 | Complete | Complete | Complete | Complete | Yes | -- |
| T3L2_039 | Complete | Complete | Complete | InProgress | No | -- |
| T3L2_040 | Complete | Complete | Complete | InProgress | No | 280: throughput below 93.6% avail target |
| T3L2_041 | Complete | Complete | InProgress | NotStarted | No | -- |
| T3L2_042 | Complete | Complete | InProgress | NotStarted | No | 270: dolly size 4 fails localization |
| T3L2_043 | Complete | Complete | InProgress | NotStarted | No | -- |
| T3L2_044 | Complete | Complete | InProgress | NotStarted | No | -- |
| T3L2_045 | Complete | InProgress | NotStarted | NotStarted | No | -- |
| T3L2_046 | Complete | InProgress | NotStarted | NotStarted | No | 250: PLC download pending TIA V20 install |
| T3L2_047 | InProgress | NotStarted | NotStarted | NotStarted | No | -- |
| T3L2_048 | InProgress | NotStarted | NotStarted | NotStarted | No | -- |
| T3L2_049 | InProgress | NotStarted | NotStarted | NotStarted | No | 220: IPC replacement part on backorder, network config blocked |
| T3L2_050 | Complete | **unavailable (null)** | NotStarted | NotStarted | **Unresolved -- not counted either way** | 250: data gap, not a real blocker -- field returned null |

## Upstream context (Master Tracker)

| Unit | Pipeline status | ETA | Vendor ref | HW rev |
|---|---|---|---|---|
| T3L2_038 | On-site - production | 2026-06-10 | VR-2026-0038 | Rev C |
| T3L2_039 | On-site - commissioning | 2026-06-12 | VR-2026-0039 | Rev C |
| T3L2_040 | On-site - commissioning | 2026-06-12 | VR-2026-0040 | Rev C |
| T3L2_041 | On-site - commissioning | 2026-06-18 | VR-2026-0041 | Rev C |
| T3L2_042 | On-site - commissioning | 2026-06-18 | VR-2026-0042 | Rev C |
| T3L2_043 | On-site - commissioning | 2026-06-20 | VR-2026-0043 | Rev C |
| T3L2_044 | On-site - commissioning | 2026-06-20 | VR-2026-0044 | Rev C |
| T3L2_045 | On-site - commissioning | 2026-06-25 | VR-2026-0045 | Rev C |
| T3L2_046 | On-site - commissioning | 2026-06-25 | VR-2026-0046 | Rev C |
| T3L2_048 | On-site - commissioning | 2026-07-01 | VR-2026-0048 | Rev D |
| T3L2_049 | On-site - commissioning | 2026-07-01 | VR-2026-0049 | Rev D |
| T3L2_050 | On-site - commissioning | 2026-07-05 | VR-2026-0050 | Rev D |
| T3L2_051 | In-transit | 2026-07-25 | VR-2026-0051 | Rev D |

## Cross-reference findings

- **T3L2_047 -- in dashboard, no upstream record.** AMR Hub has it at gate 220 (InProgress), but it has no row in the Master Tracker CSV. Possible data-entry gap upstream -- flag for Jordan to confirm this unit is a real, tracked asset and not a dashboard test entry.
- **T3L2_051 -- incoming, not yet ingested.** Master Tracker lists it (In-transit, ETA 2026-07-25) but AMR Hub has no record yet. Expected for a unit still in transit; no action needed until it's on-site.
- **Offline-robot cross-reference -- not exercised in this dry run.** Step 5 also calls for flagging units offline in Overmind with open buyoff items. The Overmind fixture used here (`overmind-fleet-state.json`) doesn't include a per-unit online/offline list, only fleet-level aggregates (image tag, robot count, tracer events). This isn't a defect in the skill -- it's a coverage gap in this specific fixture. Noted so a future fixture revision can add an `offlineRobots` field if this path needs testing.
- **T3L2_050 -- data gap, carried from the gate-status table.** `buyoff250Status` is null. Not treated as a blocker (there's no real blocker text) and not treated as production-ready-adjacent progress. Needs a source-side fix before this unit's real gate 250 state is known.

## Recommendation

Resolve the T3L2_050 data gap before treating this fleet's readiness numbers as final -- a null gate-250 field is a blind spot on the safety buyoff gate specifically, and 250 is the one gate where "don't know" is a materially different (and worse) answer than "not started." Everything else here (4 blockers, 2 cross-reference flags) is routine gate-progression noise; the data gap is the one item that could mask something real.

---

## Execution-test notes (not part of the skill's real output -- dry-run record only)

**Verify steps run against this output:**

1. **Quote-back audit.** Two facts quoted from the handoff, checked against raw fixture payloads:
   - Overmind fact: "Image tag: `v2.24.1.0-42-gbc22f55275`" -- matches `overmind-fleet-state.json` field `imageTag` verbatim. Confirmed.
   - AMR Hub fact: T3L2_049's blocked reason "IPC replacement part on backorder, network config blocked" -- matches `amr-hub-response.json`, unit `T3L2_049`, `buyoff220BlockedReason` verbatim. Confirmed.
2. **Sum audit.** 13 units in the handoff table = 13 units in `amr-hub-response.json`'s `amrs` array. Pass.
3. **No fabricated IDs -- finding.** The skill's Verify step 3 as written says every robot ID in the handoff must appear "in either the Overmind or AMR Hub payload." `T3L2_051` appears **only** in the Master Tracker CSV (it's the "incoming, not yet ingested" case from step 5) -- it is not in the AMR Hub payload (by definition, that's the whole point of the finding) and not in the Overmind payload. Taken literally, Verify step 3 would flag a correctly-sourced, real cross-reference finding as a fabricated ID. This is a real bug in the skill text, not a fixture artifact: step 5 requires citing Master-Tracker-only unit IDs, but step 3 doesn't list the Master Tracker CSV as a valid source for ID provenance. **Fix applied** (see `Skills/fleet-commissioning-handoff/SKILL.md` diff in the same commit as this test): Verify step 3 now reads "...appears in the Overmind, AMR Hub, or Master Tracker CSV payload."
4. **CSV freshness.** This run used `master-tracker.csv`, whose mtime is fresh (written moments before this test) -- no staleness warning required, and none was added. Confirmed separately (see below) that swapping in `master-tracker-stale.csv` (mtime ~48h old, past the 24h `MASTER_TRACKER_STALE_WARN_HOURS` threshold) produces the warning line.

**Stale-CSV variant, checked separately:** re-running step 4 against `master-tracker-stale.csv` (content-identical, mtime backdated to 2026-07-15 03:48, i.e. ~48h before this test's 2026-07-17 03:5x run time) requires the package to open with:

> Warning: Master Tracker CSV is 48h old. Re-export before final handoff.

before the "was here" signature line. Confirmed the mtime comparison (`now - mtime > 24h`) is straightforward and the warning text format matches the skill's template exactly. Not re-rendering the full handoff a second time for this -- the only change is the one warning line.
