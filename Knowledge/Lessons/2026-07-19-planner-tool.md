---
date: 2026-07-19
session_topic: Ticket #10 -- the Planner tool joins the connector server, closing out the cleanup spec
project: Kilroy
tags: [lesson, mcp, ticket-10, planner]
---

# Planner tool shipped (ticket #10)

## What we did

- Added `planner_get_tasks` to `mcp-server/`: acquires an app-registration token, resolves
  Jordan's AAD object id (`GRAPH_API_USER_OBJECT_ID` override, else `GET /me`), then for every
  plan in `PLANNER_PLAN_IDS` pulls its title and tasks, filters to `assignments` entries keyed by
  that object id, and groups due-today (`America/Chicago`) tasks by plan name. A null/missing/
  unparseable `dueDateTime` never enters a group -- it comes back as its own data-quality flag.
  `reachabilityOnly` mode matches Overmind's check-connectors semantics exactly: any HTTP
  response, auth-rejected included, proves reachability.
- Migrated `check-connectors` step 6 and `run-daily-workflow`'s morning-phase Planner digest off
  prose-described Graph API calls. All four data sources (Overmind, AMR Hub, Master Tracker,
  Planner) now run through tested `kilroy-connectors` tools -- this closes out the connector
  rewrite that spans tickets #7-#10 and the whole `/ask-matt` cleanup spec (issue #2).
  `GRAPH_BASE_URL`/`TOKEN_URL_BASE` are fixed constants (Microsoft's cloud endpoints are not
  deployment-specific like `AMR_HUB_BASE_URL` is), with a test-only override seam for the mock
  server in `planner.test.js` -- the same role `fetchImpl` already plays for every sibling tool.
- Adversarial review found 2 real bugs; both folded in (`daecf30`). 65/65 tests green.

## Decisions

- **A literal JSON `null` is a valid parse, not a parse failure -- guard for it separately.**
  `JSON.parse('null')` succeeds and returns `null`; the original code only guarded the `try/catch`
  around `JSON.parse` itself, so a 200 response with a 4-byte `null` body crashed with a raw
  `TypeError: Cannot read properties of null` instead of this tool's own specific "has no X field"
  message -- at all four JSON-consuming call sites. `overmind.js` already handles this class of
  hazard with optional chaining (`state?.[f]`); this tool didn't, which is a real regression
  against the sibling pattern it was built to match, not a new kind of mistake. Fixed by switching
  every body-field access to optional chaining.
- **A missing identifying field is a shape violation, not a data-quality case.** The tool already
  turns a null/missing `dueDateTime` into an explicit `dataQualityFlags` entry -- a documented,
  expected-to-happen condition per the fixture. A task missing `id` or `title` is different: real
  Planner tasks always carry both, so a hole there means the response shape itself is wrong.
  Letting it silently serialize with an absent key (via `JSON.stringify` dropping `undefined`)
  would have been the same failure class the fail-loud non-negotiable exists to catch elsewhere
  in this codebase -- so it throws instead, refusing to guess, same reasoning as
  `master-tracker.js`'s ragged-row refusal from ticket #9.
- **Test seams stay test seams, never real config.** `graphBaseUrl`/`tokenUrlBase` are
  overridable in the lib for the same reason `fetchImpl` already is -- so `node:test` can point
  the tool at a local mock server -- but they are never wired to a `.env` var or exposed on the
  MCP tool's `inputSchema`. Microsoft's cloud endpoints are fixed for every deployment; adding an
  env override for them would be a deployment footgun (a typo could silently redirect Graph calls
  elsewhere) in service of testability that a function parameter already solves. This is also why
  there's no real server.js-level (spawned-process-over-stdio) happy-path test for this tool the
  way the other three have -- the review flagged this explicitly as an accepted, self-disclosed
  tradeoff, not a gap to close.

## Open threads

- [ ] This was the last of the originally-scoped 8 tickets from the `/ask-matt` cleanup spec
  (issue #2). Only #4 (proactive trigger) remains open, blocked on an interactive MCP approval
  dialog that has to be cleared from Jordan's side, not retried from here.
- [ ] First real Graph API session (once this repo is on the enterprise account with a live app
  registration): confirm the real token/`/me`/`planner/plans/{id}`/`planner/plans/{id}/tasks`
  response shapes actually match what this tool assumes -- unlike Overmind's GraphQL query, this
  wasn't marked UNVERIFIED in the code because the Microsoft Graph v1.0 REST shapes are publicly
  documented and stable, but it has never been exercised against a real tenant from this sandbox.
- [ ] The review noted `server.test.js` can't exercise `planner_get_tasks`'s real HTTP
  orchestration end-to-end the way the other three tools' server-level tests do, since there's no
  `.env`-driven base-URL override to redirect it at a mock server (by design -- see Decisions
  above). A future typo in server.js's `clientId`/`clientSecret` env-var wiring specifically
  (as opposed to `tenantId`/`planIdsRaw`, which the existing "missing var" tests do catch) would
  go undetected by the test suite. Worth a second look if that wiring ever needs to change.
