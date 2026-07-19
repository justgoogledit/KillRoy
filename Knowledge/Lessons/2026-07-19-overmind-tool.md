---
date: 2026-07-19
session_topic: Ticket #8 -- the Overmind tool joins the connector server
project: Kilroy
tags: [lesson, mcp, ticket-8, overmind]
---

# Overmind tool shipped (ticket #8)

## What we did

- Added `overmind_get_fleet_state` to `mcp-server/` with two modes matching its two consumers:
  `reachabilityOnly` (check-connectors' semantics: any HTTP response including auth-rejected
  proves reachability, only network failure throws) and full state pull
  (fleet-commissioning-handoff's: 2xx + JSON + all five required fields, every miss named).
  The GraphQL query is explicitly UNVERIFIED against the real schema -- no corp access from this
  sandbox -- with the verification duty pinned to the first corp-network session, same policy as
  `overmind-fleets.md`'s UNVERIFIED fleet ids. 34 tests total now, all against the real fixtures.
- Migrated check-connectors step 4 (Overmind probe via the tool) and fleet-commissioning-handoff
  steps 2 AND 3 -- the AMR Hub step rode along per the scope-note comment on #8, closing the
  no-ticket-owned-it gap the #7 review found. Both skills refuse hand-rolled HTTP fallbacks.
- Adversarial review found 9 problems; all folded in (`d3cab40`). Also retried ticket #4's
  `create_trigger` after Jordan granted permission verbally -- still gated by the interactive
  approval dialog itself; commented on #4, stays ready-for-human.

## Decisions

- **A null `data.fleet` is "unknown fleet," not a shape error.** GraphQL's normal empty result
  was falling through the envelope-vs-flat acceptance into a misleading missing-fields message.
  Diagnosis quality is part of the fail-loud contract, not garnish.
- **Type-guard boolean tool args at the server boundary.** The MCP SDK does not enforce
  `inputSchema` types, and an LLM client plausibly sends `"true"`. For a flag that flips between
  probe and full-pull semantics, silent coercion is a semantics inversion, not a nit.
- **Never hand back another fleet's state.** The URL selects the fleet, so a returned `fleetId`
  contradicting the request means the template is mistargeted -- throw, don't trust. And when the
  source omits `fleetId`, return null + `requestedFleetId` rather than echoing the request back
  as if the source confirmed it.
- **An unfulfillable skill step gets said out loud.** The offline-in-Overmind cross-reference
  needs per-unit status the tool's contract doesn't carry; the skill now requires stating that
  omission in the package instead of silently skipping the bullet.

## Open threads

- [ ] First corp-network session: verify the UNVERIFIED GraphQL query in
  `mcp-server/lib/overmind.js` against the real schema, and decide whether per-unit online
  status can join the contract (which would make the handoff skill's offline cross-reference
  fulfillable again).
- [ ] Tickets #9 (Master Tracker CSV tool) and #10 (Planner tool) remain, following the same
  pattern. #4 (proactive trigger) still needs the interactive MCP approval dialog accepted.
