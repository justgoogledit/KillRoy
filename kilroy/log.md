# Vault log

Append-only index. Each entry is one line written by `session-recap` after every working session.

Format: `## [YYYY-MM-DD] <type> | <slug>`

Types: `lesson`, `setup`, `source`, `project`.

This file is how future sessions discover that something happened without reading every file in `Knowledge/Lessons/`.

---

## [2026-07-17] setup | scaffold-completion + run-daily-workflow skill

Filled in the design doc's outstanding scaffold gaps and added skill #3, `run-daily-workflow` (day runner: morning brief, midday delta, end-of-day close-out with carry-overs -- orchestrates `arriving-amr-progress` and `fleet-commissioning-handoff` into one daily loop). Added `.env.example`, `.gitignore`, `Projects/{handoffs,progress,daily}/README.md`, and `Knowledge/Sources/overmind-fleets.md` (cached fleet-name reference -- all fleet ids except the one design-doc example are marked UNVERIFIED, none guessed from the naming pattern). Wired the new skill into `Skills/Skills.md`, `CLAUDE.md`, and `README.md`.

## [2026-07-17] setup | offline fixtures + execution test of all 3 skills

Built `Knowledge/Sources/fixtures/` (synthetic AMR Hub response + deliberately-broken variant, Master Tracker CSV + stale variant, Overmind fleet-state snippet) since Overmind/AMR Hub/CSV are all unreachable from this environment. Ran `arriving-amr-progress`, `fleet-commissioning-handoff`, and `run-daily-workflow` end to end against the fixtures, including the broken-source fail-loud case, and wrote the outputs as clearly-marked dry-run artifacts in `Projects/{progress,handoffs,daily}/`. Found and fixed 2 real bugs: `arriving-amr-progress` had no output slot for a null/missing gate field (added `## Data quality flags`), and `fleet-commissioning-handoff` Verify step 3 didn't allow Master-Tracker-only unit IDs even though step 5 requires citing one. Details in [[Knowledge/Lessons/2026-07-17-execution-test-with-fixtures]].

## [2026-07-17] lesson | execution-test-with-fixtures

See [[Knowledge/Lessons/2026-07-17-execution-test-with-fixtures]] for mistakes/corrections and open threads.

## [2026-07-17] setup | check-connectors skill + proactive trigger attempt

Added `check-connectors` (foundational): verifies `.env` and all three data sources before any workflow skill pulls real data, wired as the first sub-step of `run-daily-workflow`'s morning phase. Attempted to wire a real recurring proactive trigger (Routine, weekdays 07:06, fresh session, push notification) so the morning brief fires itself -- the `create_trigger` call returned an MCP permission-approval error and is unconfirmed as of this entry. Details in [[Knowledge/Lessons/2026-07-17-proactive-trigger]].

## [2026-07-17] setup | inbox capture + CSV-WARN propagation + audit

Audited `Knowledge/Personal/people.md` and `stack.md` -- still unfilled templates, no vault leakage to fix. Added ad-hoc inbox capture (`Projects/daily/inbox.md` + a new step 0 in `run-daily-workflow`, "add \<item\> to my list" any time, drained into the morning brief and cleared) and verified the capture/drain/clear cycle by hand. Propagated `check-connectors`'s CSV-staleness WARN into the day file's opening banner instead of it being silently swallowed. Retried the proactive-trigger `create_trigger` call a second time -- same MCP permission-approval error; stopping the retry loop, needs the user to clear the permission. Details in [[Knowledge/Lessons/2026-07-17-inbox-and-remaining-gaps]].
