---
title: MFA 2M AMR Deployment Plan (SharePoint workbook)
author: Jordan Casias
type: reference
date_synthesized: 2026-07-20
tags: [amr, cybercab, 2m, mfa, network, safety, mfs, reference]
---

# MFA 2M AMR Deployment Plan

Reference pointer to the workbook the MFA team actually uses to run cybercab (2M/2F) AMR
commissioning. Documented here so Kilroy knows where this data lives and can reference it
quickly -- **this is not a live connector**. Kilroy does not pull this workbook automatically in
any skill; it's context a person (Jordan, or Kilroy when asked directly) can go read.

**No single tracker is the source of truth for AMR commissioning.** Confirmed 2026-07-20 against
both MFE and MFA documentation -- the Sonic AMR Master Tracker CSV (`$MASTER_TRACKER_CSV_PATH`,
see `CLAUDE.md`'s Data sources section) and this workbook cover different, non-overlapping slices
of the same fleet. Master Tracker: pipeline status, ETA, vendor ref, HW rev. This workbook:
network addressing, per-unit safety sign-off, and MFS part cross-reference. Neither supersedes
the other.

## Location

- SharePoint: `teslamotorsinc.sharepoint.com/sites/materialflowdesign`, file
  `Shared Documents/Lineside Material Delivery Automation/2M AMR Deployment Plan.xlsx`
- Owning team: MFA (Material Flow Automation)
- 4.5 MB, 17 sheets total -- most are working/personal tabs (`Anusha`, `Apramey`, `Icebreaker`,
  `Lists`, `QR`, `Mapping`) or part-logistics data unrelated to AMR buyoff (`PFEP`, `Zone 1 PFEP`,
  `PCE PFEP`, `DC 3-16`, `Daily Tracker 2F`, `Daily Tracker 2M`, `QR Inventory`). Only the three
  below matter for cybercab AMR tracking.

## Sheets that matter

### `Commissioning-Updated plan`

Per-unit row for every 2M and 2F AMR (fleet column, row #, Project Identifier / unit ID e.g.
`T3L2-008`, AMR VIN number) carrying:

- **Network addressing** -- IPC IP, Switch IP, PLC IP, and Gateway, one row per unit. This is the
  only place in any Kilroy source that has network-layer addressing; Overmind and AMR Hub don't
  carry it.
- **Gate sub-step dates** -- battery install, then a column per 220/250/270 sub-step (network
  config, PLC program update, IPC IP assignment, add-to-Overmind, scanner config, SICK safety
  designer, lidar localization, PGV calibration, scanner/PLC code updates, safety/HW config
  updates) with a date or `DONE`/`WIP` in each cell once complete.
- **Issues list** -- free-text per-unit blocker notes (e.g. "Wheel Brake Release Feedback
  missing, no light", "Lifter brake release doesn't work, no feedback").

Cross-references by unit ID (`T3L2-NNN`) to both the Sonic AMR Master Tracker and AMR Hub -- same
identifier space, so a unit can be looked up across all three once its ID is known.

### `Safety Matrix`

Per-unit safety I/O sign-off checklist used during **gate 270** safety verification -- this is the
concrete test record behind the 270 "Safetyt Config updated" / "Hw Config updated" columns in
`Commissioning-Updated plan`. Columns are the per-unit `T3L2-NNNNN` IDs; rows are the individual
safety points checked and signed off by name:

- E-stops (`ESTOP01`, `ESTOP02`)
- Laser scanner protective-stop fields (`LSC01`-`LSC04`, multiple fields each)
- Limit switches (`LS01`, `LS02`)
- Pendant connected/enabled
- Wheel-axis brake release
- Safety outputs: VFD STO x2, wheel-axis brake release, buzzer, warning light, charger contactor,
  reset/auto-restart circuits, bypass/godmode

Each cell that's checked carries the name of the person who signed it off (Jordan Casias appears
as a signer on several units). **Cross-reference against the E-plans to identify what physical
hardware each row is actually testing** -- this sheet names the safety *point* (e.g. `LSC03 -
Protective stop field 3`) but the E-plan is what maps that point to the actual sensor/wiring on
the unit.

### `MFS Part Info`

Part-number-to-MFS-station cross-reference: MFS destination, destination group, part number, base
part, description, install/demand station, min/max/QPC quantities, bin size. Lets Kilroy resolve
which physical part number MFS is referencing when a blocker or note mentions one -- e.g. cross-
checking a part-shortage note against its install station and rep size here.

## What Kilroy does with this

- **Reference only, on request.** If Jordan asks about a unit's IP addresses, safety sign-off
  status, or an MFS part number, Kilroy reads this workbook directly (via the `sharepoint` MCP
  tools) rather than guessing or hardcoding values into a skill.
- **Not wired into any skill's automated pull.** `check-connectors`, `arriving-amr-progress`,
  `fleet-commissioning-handoff`, and `run-daily-workflow` do not read this workbook as part of
  their normal run -- there's no `.env` var for it and no `kilroy-connectors` tool exposes it.
  Adding a live connector for this source (matching the treatment of Overmind/AMR
  Hub/Master-Tracker/Planner) would be a new, larger decision -- not implied by this reference
  entry.
- **Safety-adjacent content.** The `Safety Matrix` sheet documents real gate-250/270 safety
  verification work. Reading it for reference is fine; treating anything derived from it as an
  automated buyoff-status input (the way `arriving-amr-progress` treats AMR Hub's
  `buyoff270Status`) would need the same human read-through CLAUDE.md requires for gate-attribution
  changes.

## Update policy

Edit this file when:
- The workbook moves, is renamed, or MFA restructures its sheets.
- A live connector is later built for this source -- add the `.env` var and tool reference here
  and cross-link from `CLAUDE.md`'s Data sources section, same pattern as the other four sources.

Do not edit when:
- The workbook's row-level data changes day to day -- that's expected content, not a structural
  change to this reference.
