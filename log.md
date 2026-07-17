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

## [2026-07-17] setup | session-start connector-check hook

Live proactive trigger was correctly abandoned for this sandbox (real deployment target is the work computer). Built a real, tested piece of automation instead: `.claude/hooks/session-start.sh` runs a fast reachability probe of all three data sources on every Claude Code session start, registered via `.claude/settings.json`. Tested 5 scenarios directly (missing `.env`, unreachable-but-filled `.env`, all-reachable happy path via throwaway local servers, stale-CSV WARN, one missing var) -- all correct, all test artifacts cleaned up afterward. Caught and worked around a real landmine: `.env.example`'s CSV path has an unquoted space, which breaks a naive `source`; the hook parses `.env` line-by-line instead. Also surfaced a repo-layout mismatch with the design doc (flagged, not fixed) -- see [[Knowledge/Lessons/2026-07-17-session-start-hook]].

## [2026-07-17] setup | mattpocock/skills installed + configured

Installed 41 general-purpose engineering skills from mattpocock/skills globally (`~/.claude/skills/`, outside this repo's tracked tree) -- separate from Kilroy's own AMR-tracking scope. Ran `setup-matt-pocock-skills`'s documented process by hand (it's slash-command-only and this session's skill list predated the install). Config anchored at `kilroy/CLAUDE.md` consistent with the known git-root/`kilroy/` nesting quirk: GitHub (`justgoogledit/KillRoy`) as issue tracker, default triage labels, single-context domain docs. Wrote `kilroy/docs/agents/{issue-tracker,triage-labels,domain}.md` and a new `## Agent skills` section in `CLAUDE.md` with an explicit scope disclaimer so these don't read as a Skill-sprawl violation. Details in [[Knowledge/Lessons/2026-07-17-matt-pocock-skills-setup]].

Follow-up same day: flagged `justgoogledit/KillRoy` as a personal-account placeholder in both `docs/agents/issue-tracker.md` and `CLAUDE.md` -- Jordan is cloning this repo into his enterprise account once the build here is finished, so that literal string needs a one-pass update to the real owner/repo at that point (`gh` itself auto-detects from `git remote -v`, no code change needed).

## [2026-07-17] setup | humanizer skill installed + wired into report generation

Installed the `humanizer` skill (blader/humanizer) globally, same pattern as mattpocock/skills. Unlike that install, wired this one directly into Kilroy's own report-generating skills rather than keeping it separate: `fleet-commissioning-handoff`, `arriving-amr-progress`, and `run-daily-workflow` all now run a humanizer pass on the prose portions of their output before delivery, scoped so it never touches unit IDs, blocker text, or action-item bullets -- new Verify steps in each skill confirm that. `Knowledge/Personal/voice.md` documents the precedence (voice.md wins on any conflict) and gets a new "Humanizer pass" section. Smoke-tested live against a sample recommendation line -- facts preserved, corporate framing removed. Details in [[Knowledge/Lessons/2026-07-17-humanizer-wiring]].

## [2026-07-17] setup | repo flattened -- kilroy/ is the root now

User ran `/init`, which forced the long-open repo-layout question. Confirmed the true git root had nothing real except a stub `README.md` written to explain the mismatch, plus infrastructure (`.git/`, `.claude/`, `.gitignore`) and the untracked `skills/` clone. Moved everything up one level with `git mv` (history preserved), merged the two `.gitignore` files, and fixed every stale `kilroy/` path reference in living docs (`CLAUDE.md`, `docs/agents/domain.md`, and functionally in `.claude/hooks/session-start.sh`, whose `$CLAUDE_PROJECT_DIR/kilroy/.env` path was actually wrong, not just cosmetic). Re-tested the hook after the fix -- confirmed it reports the correct path. Design doc needed no changes -- its `~/repos/kilroy/` references describe the intended clone directory name, which now genuinely matches reality. Closes the open thread from [[Knowledge/Lessons/2026-07-17-session-start-hook]] and [[Knowledge/Lessons/2026-07-17-matt-pocock-skills-setup]]. Details in [[Knowledge/Lessons/2026-07-17-repo-flatten]].

## [2026-07-17] setup | /init completed -- Working in this repo section added

Resumed `/init` after the flatten. `CLAUDE.md` already existed (Kilroy's persona file), so per `/init`'s own "suggest improvements" instruction this was additive, not a rewrite: one new "## Working in this repo" section stating plainly that there's no build/lint/test tooling (confirmed, prose/markdown repo), and pointing to what actually serves that purpose here -- per-skill `## Verify` sections, the `Knowledge/Sources/fixtures/` dry-run mechanism, the session-start hook, and the canonical `SKILL.md` shape. Deliberately skipped `/init`'s generic boilerplate prefix since it would sit awkwardly in front of the file's existing identity-establishing opening line. Details in [[Knowledge/Lessons/2026-07-17-init-claude-md]].
