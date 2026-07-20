---
date: 2026-07-19
session_topic: Ticket #7 -- the kilroy-connectors MCP server and its first tool
project: Kilroy
tags: [lesson, mcp, ticket-7, amr-hub]
---

# MCP server + AMR Hub tool shipped (ticket #7)

## What we did

- Built `mcp-server/`: the first real code in this repo. Plain Node.js MCP server (stdio,
  official SDK as the only direct dependency, no TypeScript, no bundler), one read-only tool
  `amr_hub_get_units`, registered for Claude Code via `.mcp.json` at the repo root.
- The tool enforces the contract `check-connectors`' prose used to describe -- 2xx, parseable
  JSON -- plus one deliberate tightening: the body must contain an `amrs` array. Every abnormal
  path throws with a specific reason (syscall code, HTTP status, unparseable, wrong shape, bad or
  missing `AMR_HUB_BASE_URL`, missing `.env`); a failure can never look like an empty fleet, and
  null gate fields pass through untouched so the skills' data-quality flags still fire.
- Tested three ways, all against the same fixtures the skills dry-run against: 14 `node:test`
  tests on the pull logic, 6 more spawning the real server over stdio JSON-RPC, and a manual
  protocol smoke including a full-stack happy path through a temp `.env`. 20/20 green.
- Migrated `check-connectors` step 3 and `arriving-amr-progress` step 1 to consume the tool; both
  refuse to fall back to hand-rolled HTTP if the server is missing. Updated `CLAUDE.md` (the
  "no build tooling" claim now names `mcp-server/` as the one exception), README (npm install,
  Node prerequisite, launch-from-repo-root note), the fixtures README, and the design doc (a
  superseded-by note on its raw-GET step, since `docs/agents/domain.md` designates it a living
  vocabulary source).
- Ran the required unscoped verify-fixtures matrix (fixtures README changed): all 6 pairings
  PASS, coverage 6/6. Adversarial review found 8 real problems; all folded in
  (`012ab1f`), the two most instructive below.

## Decisions

- **The shape check is a tightening and is documented as one.** Ticket AC3 said "no change to
  outward behavior"; the honest reading after review is that requiring an `amrs` array flips one
  previously-passing case (2xx JSON, wrong shape) to FAIL. Kept deliberately -- that case was
  never a healthy AMR Hub, and passing it would mask a broken deploy -- but `check-connectors`
  now says "plus one deliberate tightening" instead of claiming "the same contract." Deviations
  survive scrutiny when named, not when papered over.
- **Error specificity is part of the contract, and undici fights it.** `fetch` wraps the real
  reason ("fetch failed") with the syscall code buried at varying depths of the cause chain,
  sometimes inside an AggregateError. The fix walks the whole chain; the regression test asserts
  `ECONNREFUSED` appears end to end through the spawned server, not just at the lib layer --
  the two layers genuinely differed in error shape, which is exactly why the reviewer's
  "server.js has zero coverage" finding mattered.
- **`fleet-commissioning-handoff`'s AMR Hub step stays prose-described for now.** No ticket owned
  its migration (the review caught the false "#8-#9" attribution); it now rides with #8 via a
  scope-note comment there, since #8 already edits that skill for the Overmind pull.

## Open threads

- [ ] Tickets #8/#9/#10 are now unblocked: extend `mcp-server/` with the Overmind, Master
  Tracker CSV, and Planner tools, following the pattern this ticket established (lib module +
  fixture-backed node:test + server registration + skill migration). #8 also picks up the
  handoff skill's AMR Hub step per the comment there.
- [ ] `.mcp.json`'s relative path means Claude Code must launch from the repo root (documented in
  README). If that ever bites on the work machine, make the path robust instead of documenting
  around it.
