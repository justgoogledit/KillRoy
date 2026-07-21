---
title: GFTX AMR Buyoff Gate Ownership Map
author: Jordan Casias (synthesized from Sonic AMR Program Confluence + amrtracker schema)
type: reference
date_synthesized: 2026-07-02
tags: [amr, buyoff, gate, ownership, gftx, pc-amr, mfa, mfe]
---

# GFTX AMR Buyoff Gate Ownership Map

> **Status note (2026-07-21):** the skills that consumed this map for automated blocker attribution (`arriving-amr-progress`, the gate table in `fleet-commissioning-handoff`) were retired in the connector consolidation -- see `Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md`. Kept as reference, not deleted, per CLAUDE.md's gate-attribution non-negotiable: it remains the authoritative ownership record if gate questions come up in conversation or a future skill needs it.

Authoritative reference for which team owns each buyoff gate in the GFTX AMR commissioning pipeline. Kilroy uses this to attribute every blocker to the team whose action unblocks it.

Source of truth: Sonic AMR Program Confluence (PC-AMR milestone RACI) + `amrtracker/backend/src/routes/amrs.ts:16` schema.

## The gates

| Gate | Name | Owner | Milestone | What passes |
|---|---|---|---|---|
| 220 | Electrical buyoff | MFA Hardware | 300 | Wiring, power-on, charger, network config, PLC update, IPC setup |
| 250 | Safety buyoff | Overmind + MFA Controls | 400 | Add AMR to Overmind, firmware update, sensor calibration, E-stop validation, safety-fields validation |
| 270 | Handoff / map buyoff | MFA Controls + MFE | 500 | PLC safety config, 270 map setup, handoff paperwork |
| 280 | Performance testing | MFE | 500 | Every production dolly size, throughput smoke test |
| 290 | Production buyoff | MFE + PC | 700 | Auto stations, launch PCA, KPI signoff at 93.6% availability |

## Kilroy blocker attribution

When Kilroy sees a `buyoff<gate>BlockedReason` populated, it looks up the gate here and reports the blocker under the owning team's bucket.

```
gate -> team (Kilroy uses this as a Python dict / TS Record)

'220' -> 'MFA Hardware'
'250' -> 'MFA Controls'   # Overmind is upstream, MFA Controls owns the buyoff on our side
'270' -> 'MFA Controls'   # co-owned with MFE, but the buyoff sign happens on our side
'280' -> 'MFE'
'290' -> 'MFE'            # co-owned with PC, but MFE runs the tests
```

Rationale for the "our side" simplification: Kilroy's job is to tell Jordan **who to go push**. When the buyoff is co-owned, the party who is most likely to be running the actual test at the moment gets credit for the blocker. Jordan can adjust the mapping in this file if a specific fleet's ownership rotates.

## Schema gap: 290

`amrtracker` currently has 4 patchable gate columns (`buyoff220Status` through `buyoff280Status`). 290 is documented as a real gate here but does not yet exist as a column. Kilroy reports 290 as the derived "all 4 = Complete" state until a follow-up PR adds `buyoff290Status` to `amrtracker`.

## Related

- Sonic AMR Program Confluence: https://confluence.teslamotors.com/display/FD/Sonic+AMR+Program
- `amrtracker` schema: `C:/Users/jocasias/repos/amrtracker/backend/src/routes/amrs.ts:16` -- `VALID_GATES = ['220', '250', '270', '280']`
- Design doc: `docs/superpowers/specs/2026-07-02-kilroy-design.md`

## Update policy

Edit this file when:
- Gate ownership changes (org rotation, project handoff).
- `amrtracker` adds `buyoff290Status` -- update the schema-gap section.
- A new gate is added upstream (very rare).

Do not edit when:
- A specific fleet or unit has an atypical ownership -- handle in the handoff/progress package for that fleet, don't touch the global map.
