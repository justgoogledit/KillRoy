---
date: 2026-07-19
session_topic: implement ticket #5 -- structured kilroy-log line across all log-append steps
project: Kilroy
tags: [lesson, implement, logging, adversarial-review]
---

# Structured log lines shipped (ticket #5)

## What we did

- Implemented ticket #5: every `log.md` entry written by a skill's log-append step now carries one
  machine-readable companion line -- an HTML comment (`<!-- kilroy-log date=... skill=... event=...
  status=... key=value... -->`) on the line immediately after the prose `## [...]` line. HTML
  comment so the rendered human-readable log is byte-for-byte unchanged; logfmt-style keys so the
  log is greppable ("how often does the connector check fail" is now one anchored grep).
- Documented the contract once, in `log.md`'s own header -- it was already the prose-format
  authority, and was stale anyway (its types list predated the `progress`/`handoff`/`daily` event
  types the skills have written for days). Fixed that drift in the same pass.
- Edited all six log-appending skills (`check-connectors`, `arriving-amr-progress`,
  `fleet-commissioning-handoff`, `run-daily-workflow`, `session-recap`, `verify-fixtures`) to emit
  the line in addition to the prose line, with a structured-line audit Verify item wherever a
  Verify section exists. Extended `verify-fixtures`' step-5 carve-out so a target skill's log
  entry is composed ephemerally in dry-runs, never appended for real.
- Followed `skill-creator`'s full gate: fixture check (all 6 documented pairings PASS), then the
  required adversarial review -- which returned **10 real findings**, all accepted, none refuted.
  After folding them in: an unscoped fixture re-run (still all-PASS, coverage 6/6) and a 3-agent
  verification workflow (findings-closure, contract-consistency, fresh-eyes) -- all three passed
  with zero problems.
- Also probed the ticket #4 blocker on request: even a read-only `list_triggers` MCP call returns
  a permission-approval error in this session, so the proactive-trigger ticket stays
  `ready-for-human` -- the environment permission has not been granted yet.

## Decisions

- **HTML comment over a visible line** -- because the ticket's hard constraint was "without
  changing the existing human-readable log at all"; a comment renders as nothing while staying
  greppable.
- **`log.md`'s header as the single documentation point** -- because a future skill already has to
  reference `log.md` to append to it; a separate `docs/` page would be a second place to drift.
- **Anchored grep contract (`^<!-- kilroy-log`)** -- because the reviewer empirically proved the
  naive substring queries false-positived on the header's own example text. A machine contract's
  examples must be tested against the very file that defines them.
- **`fleet=<fleet|all>` on the progress line** -- because a time-series consumer must not mix
  fleet-scoped and all-fleet counts; the prose line always had this gap, but a machine contract
  gives it teeth.
- **No retrofit of pre-contract entries** -- the log is append-only; the header states the
  boundary explicitly instead of pretending the whole file conforms.

## Mistakes & corrections

- **Mistake:** wrote grep examples that matched the header's own documentation text, making both
  documented queries wrong on day one.
  **Fix:** anchor machine-readable markers to line start and *run* the documented queries against
  the real file before shipping them. Eyeballing a grep is not testing it.
- **Mistake:** wrote a grandfather clause ("entries predating 2026-07-19") that excluded three
  same-day entries on the very day it was written.
  **Fix:** never use a bare date as a boundary for something that changes mid-day; name the
  boundary entry itself.
- **Mistake:** applied the frontmatter-outputs pattern to five of six skills and missed
  `session-recap` (whose outputs didn't mention log.md at all).
  **Fix:** after applying a pattern across N files, grep for its *absence* in the set, don't
  count on memory.

## Open threads

- [ ] Ticket #4 (proactive trigger) still blocked: the MCP trigger tools require an interactive
  permission approval this environment hasn't granted. Needs Jordan.
- [ ] Frontier after this session: #7 (MCP connector scaffold), then #8/#9/#10 behind it.
