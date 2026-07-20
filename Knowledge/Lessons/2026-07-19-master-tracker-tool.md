---
date: 2026-07-19
session_topic: Ticket #9 -- the Master Tracker CSV tool joins the connector server
project: Kilroy
tags: [lesson, mcp, ticket-9, master-tracker]
---

# Master Tracker CSV tool shipped (ticket #9)

## What we did

- Added `master_tracker_get_rows` to `mcp-server/` with a hand-rolled ~40-line RFC 4180-style
  CSV parser (quoted fields, escaped `""`, embedded commas/newlines) rather than a dependency --
  the export is a plain SharePoint CSV and this repo keeps tooling to the MCP requirement's
  minimum. Staleness comes back as a `stale`/`ageHours` WARN-grade flag, never an error: a
  stale-but-readable CSV blocks nothing, per `check-connectors`' existing rule.
- Migrated `check-connectors` step 5 and `fleet-commissioning-handoff` steps 1/4/Verify-4 onto
  the tool. All three of the skill's pulls (Overmind, AMR Hub, Master Tracker) now go through
  tested `kilroy-connectors` tools -- Planner is the only source left prose-described, pending #10.
- Adversarial review found 3 real bugs and 5 doc/test gaps; all folded in (`328990c`). 47/47 tests
  green.

## Decisions

- **A ragged row is a parse failure, not a shape to guess at.** Padding short rows with `''` and
  silently truncating long ones (the original behavior) meant an unquoted comma in a free-text
  note field could shift every column after it -- and because the shift happened silently, the
  fleet filter would just return 0 rows, which reads identically to "tracker doesn't know this
  fleet." Column-count mismatch now throws by row, naming expected vs. found.
- **A missing filter column is a schema problem, not an empty result.** Filtering by
  `projectIdentifier` when the header doesn't have that column used to silently return
  `rowCount: 0` -- same failure mode as the row above, different cause. Now throws and names the
  actual header, so "column got renamed upstream" doesn't look like "fleet doesn't exist."
  Together with the ragged-row fix, this closes two more paths to the same false negative
  `CLAUDE.md`'s fail-loud non-negotiable exists to rule out.
- **Line-based text transforms can corrupt content inside quoted fields.** The comment-banner
  skip used to `split(/\r?\n/)` the whole file and `join('\n')` back the surviving lines -- which
  silently rewrote CRLF to LF *inside a quoted multi-line field*, not just between rows. Any
  transform meant to touch only the leading comment lines needs to stop at those lines by offset,
  not normalize the whole text as a side effect.
- **Boundary math has to match the wording it claims to implement.** `.env.example` says "older
  than this many hours"; the original staleness check floored the age *before* comparing it to
  the threshold, so 24.5h old against a 24h threshold read as not-stale. Compare the raw
  millisecond age against the threshold and floor only for the display value -- the two shouldn't
  share a rounding step.
- **Symmetric trimming, or don't trim at all.** Trimming header cells but not data cells is an
  invisible inconsistency: a stray space after a comma in the source CSV breaks an exact-match
  filter with no error, same false-negative shape as the two bugs above. Fixed by trimming both.
- **A documented "resolve alias" example needs the code behind it, not just a hope.** The handoff
  skill's own trigger examples claimed alias resolution ("cybercab 2m" -> fleet name) that step 1's
  exact-match filter never implemented. Fixed by rewording the example to the real behavior rather
  than leaving a doc that promises a capability that doesn't exist.

## Open threads

- [ ] Ticket #10 (Planner tool) is the last of the originally-scoped 8 tickets and is already
  unblocked (its only blocker, #7, is done).
- [ ] #4 (proactive trigger) still needs the interactive MCP approval dialog accepted from
  Jordan's side; stays `ready-for-human`.
- [ ] If a real SharePoint export ever produces a genuinely ragged row (not just an unquoted
  comma but an actually-different column count upstream), that's a legitimate hard stop under the
  new behavior -- worth remembering this is intentional, not a regression, if it ever surfaces.
