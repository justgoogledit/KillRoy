---
date: 2026-07-19
session_topic: /implement ticket #3 -- verify-fixtures skill built, first run caught real drift
project: Kilroy
tags: [lesson, implement, verify, fixtures, adversarial-review]
---

# verify-fixtures shipped; its first run and the review pass both caught real problems

## What we did

- Resumed from handoff, confirmed issues #2-#10 unchanged, Jordan picked ticket #3 to run first
  via `/implement`.
- Designed via a Plan subagent, implemented `Skills/verify-fixtures/SKILL.md` plus wiring
  (`skill-creator` step 10, `Skills.md`, `CLAUDE.md`), execution-tested the full 6-pairing matrix
  by hand per the new skill's own steps, ran an adversarial review on the diff, folded in all
  findings, pushed both commits (`b67eb62`, `aa503cd`), closed issue #3.
- The skill's first unscoped run legitimately FAILed 2 of 6 pairings -- both documentation/
  precondition drift, not skill regressions -- and the failures were logged to the real `log.md`
  per the skill's own failure-logging step, then fixed in the fixtures README and re-run clean.

## Decisions

- **The fixtures README got a canonical pairings table** (6 pairings: stand-ins, preconditions,
  PASS conditions) -- the review found the prose-only pairing list was parse-dependent (readers
  could count 5 or 6). The README stays the single source of truth; the table is now the unit of
  account. (supersedes nothing -- additive)
- **verify-fixtures writes nothing under `Projects/`, ever** -- one step stricter than the
  2026-07-17 by-hand precedent (which used one-off `-dryrun`-named artifacts), because this check
  fires on every `skill-creator` edit and per-run artifacts would accumulate. Artifact-dependent
  Verify steps run against an ephemeral draft instead of being skipped.
- **The first run's FAIL line stayed in the real `log.md`.** It's genuine operational metadata
  about the check itself (exactly what issue #2's queryable-log user story wants), not synthetic
  fleet data -- the 2026-07-17 "don't pollute log.md" rule is about target skills' own lines.

## Mistakes & corrections

- **Mistake:** The Plan agent's pairing matrix had pairing 6's expectations wrong (said tasks
  0001/0003 due today; the fixture actually has 0001/0005 due today, 0003 due 2026-07-22), and it
  went into the approved plan file unchecked.
  **Fix:** Caught by executing against the real fixture before anything shipped -- which is
  precisely the check this ticket automates. Never trust a derived matrix (agent's or plan's)
  over the fixture files themselves; the skill's parse-README-fresh rule now encodes that.
  **Skill to update:** none -- [[Skills/verify-fixtures/SKILL]] already enforces it.
- **Mistake:** verify-fixtures step 5's side-effect carve-out enumerated two specific steps to
  skip (final `Projects/` write, `log.md` append) -- missing `run-daily-workflow`'s mid-step
  `inbox.md` drain, which would have silently deleted real captured items on a literal run.
  Adversarial review flagged it as a blocker.
  **Fix:** State side-effect carve-outs as an invariant ("no real repo state changes, mid-step
  mutations included"), never as an enumerated step list -- enumeration misses whatever the next
  skill hides mid-phase.
  **Skill to update:** [[Skills/verify-fixtures/SKILL]] -- done this session.
- **Mistake:** Both fixture-drift failures trace to creation-time assumptions nobody wrote down:
  the Planner fixture baked in "today" = its creation date, and the fresh CSV's mtime promise
  breaks in any checkout older than the staleness threshold.
  **Fix:** A fixture keyed to a reference value (date, GUID, mtime) must document the synthetic
  override at creation time, in the README's synthetic-values section, before first use.
  **Skill to update:** none -- fixed in `Knowledge/Sources/fixtures/README.md` itself.

## Open threads

- [ ] `skill-creator`'s own "Canonical SKILL.md template" block is stale -- missing the
  `Applies`/`Verify` sections every real skill (and `CLAUDE.md`) uses. Natural to fix alongside
  ticket #6, which already edits that file. -> [[Skills/skill-creator/SKILL]]
- [ ] Ticket frontier after #3: #4 (`ready-for-human` -- needs Jordan's permission grant), #5,
  #6, #7 all unblocked; #8/#9/#10 wait on #7.
