---
title: Overmind Fleet Name Reference (GFTX AMR)
author: Jordan Casias (cached from Overmind deployments/global_values.yaml)
type: reference
date_synthesized: 2026-07-20
tags: [amr, overmind, fleets, gftx, commissioning]
---

# Overmind Fleet Name Reference (GFTX AMR)

Cached fleet-name list mirroring Overmind `deployments/global_values.yaml`. Kilroy resolves fleet names against this file when off corp network or when a live pull is unnecessary. The live YAML is the source of truth; this file is a snapshot and goes stale.

## Fleets

The four GFTX AMR production lines, per the design doc ([[docs/superpowers/specs/2026-07-02-kilroy-design]]):

| Line | Fleet id | Status |
|---|---|---|
| Cybercab 2M B3 | `gftx-cybercab-2m-b3-agv` | CONFIRMED -- Jordan supplied the live URL directly, 2026-07-20 |
| Cybercab 2F B3 | `gftx-cybercab-2f-b3-agv` | CONFIRMED -- Jordan supplied the live URL directly, 2026-07-20 |
| Kyle 2R Seats | `gftx-kyle2rseats-agv` | CONFIRMED -- Jordan supplied the live URL directly, 2026-07-20 |
| CT Door 1M | `gftx-ctdoor-1m-agv` | CONFIRMED -- Jordan supplied the live URL directly, 2026-07-20 |

Base URL pattern confirmed as `https://<fleet-id>.robots.tesla.com/` -- this is what `OVERMIND_BASE_URL_TEMPLATE` is set to (`https://{fleet}.robots.tesla.com/`) in `.env.example`. Note Kyle 2R Seats and CT Door 1M don't follow the `gftx-<line>-b3-agv` shape the cybercab lines do (`kyle2rseats` has no separator, `ctdoor-1m` has no `b3`) -- this was NOT a naming-pattern guess, it came from the URLs Jordan supplied directly. This wasn't confirmed by pulling `deployments/global_values.yaml` -- that pull should still happen on corp network to double check these against the source of truth, but they no longer need treating as UNVERIFIED/unusable.

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
