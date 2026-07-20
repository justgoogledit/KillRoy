---
date: 2026-07-17
session_topic: Execution-test Kilroy's three skills against offline fixtures; two skill bugs found and fixed
project: Kilroy
tags: [lesson, verify, fixtures, fail-loud]
---

# Execution-testing Kilroy's skills with synthetic fixtures

## What we did

- Built `Knowledge/Sources/fixtures/` -- synthetic AMR Hub response, a deliberately-broken AMR Hub response, a Master Tracker CSV (plus a stale-mtime variant), and an Overmind fleet-state snippet -- to dry-run Kilroy's skills without corp-network access.
- Ran `arriving-amr-progress`, `fleet-commissioning-handoff`, and `run-daily-workflow` (all three phases: morning, midday, close-out) end to end against the fixtures, including a deliberate "AMR Hub unreachable" case.
- Wrote all output as dry-run artifacts in `Projects/{progress,handoffs,daily}/` with `-dryrun` filenames and a loud banner, so they can't be mistaken for real deliveries later.

## Decisions

- **Fixture outputs get `-dryrun` filenames and a top-of-file banner, not the real date-based filename a live run would use.** Reason: the fixtures README already warns not to cite fixture data in a real package, but a same-named file sitting in `Projects/progress/` next to real ones is a silent trap for a future session. (See `Knowledge/Sources/fixtures/README.md`.)
- **Did not append to the real `log.md` for any dry-run step**, even though all three skills' Steps say to. Reason: the log is a real operational record; writing synthetic fleet numbers into it would corrupt Jordan's actual history. Documented what the real log lines would have looked like inside each dry-run artifact instead.

## Mistakes & corrections

- **Mistake:** `arriving-amr-progress`'s Verify step 1 (sum audit) implicitly requires catching a unit with a null/missing gate field, but the skill's own output template had no section to render that finding in. A shallow implementation could satisfy a sloppy version of the sum check by just omitting the bad unit from the visible board.
  **Fix:** Added a `## Data quality flags` section to the output template and an explicit instruction in Steps 3 not to force a bad-field unit into a bucket or drop it from the total. Sum audit in Verify now explicitly includes the flagged-unit count.
  **Skill updated:** [[Skills/arriving-amr-progress/SKILL]]

- **Mistake:** `fleet-commissioning-handoff`'s Verify step 3 ("No fabricated IDs") only named the Overmind and AMR Hub payloads as valid sources for a robot ID. But Steps step 5 requires the handoff to cite a unit ID that exists *only* in the Master Tracker CSV (the "incoming, not yet ingested" cross-reference finding). Run literally, Verify step 3 would flag a correct, real finding as fabricated.
  **Fix:** Verify step 3 now lists the Master Tracker CSV as a valid source alongside Overmind and AMR Hub.
  **Skill updated:** [[Skills/fleet-commissioning-handoff/SKILL]]

- **Observation, not yet fixed:** none of the three skills' `## Steps` sections have an explicit "stop and report if the source doesn't parse/respond" step -- the fail-loud requirement lives only in `CLAUDE.md`, one level up. It held up fine when exercised directly (see the broken-AMR-Hub-response test), but that's because a human read `CLAUDE.md` and knew to apply it, not because the skill text enforces it locally. Only fixed this in `arriving-amr-progress` implicitly via the Data quality flags addition above -- `fleet-commissioning-handoff` and `run-daily-workflow` still rely on the CLAUDE.md-level rule alone. Not promoting this to a CLAUDE.md-level rewrite yet (only surfaced once, in one session) -- flagging so a second real occurrence gets tracked as a recurrence.

## New context for Personal/

None -- no voice/preference changes this session.

## Open threads

- [ ] Add an explicit "confirm the source parsed/responded before proceeding" step to `fleet-commissioning-handoff` and `run-daily-workflow` if this gap causes a real problem again. -> [[Skills/fleet-commissioning-handoff/SKILL]], [[Skills/run-daily-workflow/SKILL]]
- [ ] `overmind-fleets.md` still has 3 of 4 fleet ids UNVERIFIED -- run the refresh procedure on corp network before using `fleet-commissioning-handoff` on those lines.
- [ ] The Overmind fixture has no offline-robot list, so the "units offline in Overmind with open buyoff items" cross-reference in `fleet-commissioning-handoff` step 5 has never actually been exercised, dry-run or real. Add an `offlineRobots` field to `Knowledge/Sources/fixtures/overmind-fleet-state.json` next time fixtures are touched.
