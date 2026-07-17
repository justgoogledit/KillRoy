---
title: Overmind Fleet Name Reference (GFTX AMR)
author: Jordan Casias (cached from Overmind deployments/global_values.yaml)
type: reference
date_synthesized: 2026-07-17
tags: [amr, overmind, fleets, gftx, commissioning]
---

# Overmind Fleet Name Reference (GFTX AMR)

Cached fleet-name list mirroring Overmind `deployments/global_values.yaml`. Kilroy resolves fleet names against this file when off corp network or when a live pull is unnecessary. The live YAML is the source of truth; this file is a snapshot and goes stale.

## Fleets

The four GFTX AMR production lines, per the design doc ([[docs/superpowers/specs/2026-07-02-kilroy-design]]):

| Line | Fleet id | Status |
|---|---|---|
| Cybercab 2M B3 | `gftx-cybercab-2m-b3-agv` | UNVERIFIED -- from design doc, not confirmed against a live global_values.yaml pull |
| Kyle 2R Seats | fleet id: unverified, refresh on corp network | UNVERIFIED |
| CT Door 1M | fleet id: unverified, refresh on corp network | UNVERIFIED |
| Cybercab 2F B3 | fleet id: unverified, refresh on corp network | UNVERIFIED |

Do not guess the missing fleet ids from the naming pattern. `gftx-cybercab-2m-b3-agv` suggests a `gftx-<line>-agv` convention, but a wrong fleet id substituted into `$OVERMIND_BASE_URL_TEMPLATE` fails loud at best and hits the wrong fleet at worst. Unverified means unusable for handoffs.

## Refresh procedure

On corp network:

1. Pull `deployments/global_values.yaml` via Overmind GraphQL (base URL from `$OVERMIND_BASE_URL_TEMPLATE`).
2. Rewrite the table above with the fleet ids as they appear in the YAML. Drop the UNVERIFIED marks on entries confirmed against the pull.
3. Update `date_synthesized` in the frontmatter to the pull date.
4. If a fleet appears in the YAML that is not in this table (or vice versa), flag it to Jordan -- do not silently add or remove lines.

## Update policy

Edit this file when:
- A refresh pull confirms or corrects a fleet id.
- A new GFTX AMR line comes online in Overmind.
- A fleet is decommissioned or renamed upstream.

Do not edit when:
- A single handoff needs a one-off alias resolution -- resolve it in the package via the Master Tracker, don't touch this reference.

## Related

- [[Knowledge/Sources/2026-07-02-pc-amr-gates]] -- gate ownership map for the same pipeline.
- Design doc: `docs/superpowers/specs/2026-07-02-kilroy-design.md` -- Data connector config section.
