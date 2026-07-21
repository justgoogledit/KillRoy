# Vault log

Append-only index. Entries are written by the log-append step of a skill (`session-recap` after every working session; `arriving-amr-progress`, `fleet-commissioning-handoff`, and `run-daily-workflow` per run; `check-connectors` and `verify-fixtures` on failure only) or by hand for one-off notes.

Prose format: `## [YYYY-MM-DD] <type> | <summary>`

Types: `lesson`, `setup`, `source`, `project` (session-recap, hand-written entries, and the check-connectors/verify-fixtures failure entries, which use `setup`), plus the skill event types `progress`, `handoff`, `daily`.

This file is how future sessions discover that something happened without reading every file in `Knowledge/Lessons/`.

## Structured companion line (the `kilroy-log` contract)

Every entry written by a skill's log-append step also carries exactly one machine-readable line, placed on the line immediately after the prose `## [...]` line it annotates:

`<!-- kilroy-log date=<YYYY-MM-DD> skill=<skill-name> event=<event> status=<ok|warn|fail> <event-specific key=value fields> -->`

Rules:

- An HTML comment, so the rendered human-readable log is unchanged. One physical line, never wrapped.
- The four core fields come first, in that order: `date`, `skill` (the emitting skill's name), `event`, `status`. Event-specific fields follow; each skill's own log-append step defines its exact field set.
- Keys are lowercase, underscore-separated. Values contain no spaces: lists are comma-separated, names/slugs hyphenated. Free text (reasons, blocker quotes) stays in the prose line; the structured line carries only enumerable or countable fields.
- `status` semantics: `fail` on failure-only entries (`connector-check`, `fixture-check`, which log nothing on a green run); `warn` when the run completed but surfaced a WARN banner or data-quality flag; `ok` otherwise.
- Hand-written entries don't need the line. Entries from before this contract existed (everything up to and including the 2026-07-19 adversarial-review entry) don't have one; do not retrofit them -- this file is append-only.

Grep contract: every companion line starts its physical line with `<!-- kilroy-log ` -- anchor greps to that (`^<!-- kilroy-log`) so prose mentions of the format, including this header's own examples, never false-positive. Examples:

- How often has the connector check failed? `grep -c '^<!-- kilroy-log .*event=connector-check' log.md`
- Every non-green skill run: `grep '^<!-- kilroy-log' log.md | grep -v 'status=ok'`

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

## [2026-07-18] setup | Planner/To-Do digest -- interview, plan review, Workflow build

Ran a 3-round `AskUserQuestion` interview to find the real shape of "help me with everything I do daily" rather than guessing at a full M365 build -- converged on a Planner/To-Do due-today digest folded into `run-daily-workflow`'s morning phase, not a sprawling Teams/Outlook/SharePoint integration. Sent the resulting plan through an adversarial review subagent before approval; it found 8 real gaps (dropped deferred-item, missing multi-plan resolution rule, undefined Planner close-out behavior, humanizer scope not extended, stale "three sources" language, untouched README/Skills.md, an internal plan inconsistency, a too-vague fixture spec), all folded in before Jordan approved. Built the approved plan via a 7-agent Workflow (contracts -> parallel skill extensions -> parallel doc updates -> verification). The verification agent found 3 more post-build documentation-consistency gaps (stale source counts in `CLAUDE.md` and `check-connectors`), fixed directly. Independently re-verified em-dashes and the fixture's expected dry-run result set by hand rather than trusting agent self-reports, and rendered an actual dry-run day-file artifact for the new Planner section, not just an analytical trace. New `.env` vars: `GRAPH_API_TENANT_ID`, `GRAPH_API_CLIENT_ID`, `GRAPH_API_CLIENT_SECRET`, `PLANNER_PLAN_IDS`, `GRAPH_API_USER_OBJECT_ID`. Details in [[Knowledge/Lessons/2026-07-18-planner-digest-interview-and-build]].

## [2026-07-18] source | cleanup spec published as GitHub issue #2

`/ask-matt` routed "clean up all these issues, professional-level assistant" to `/to-spec` -> `/to-tickets` -> `/implement`. Both `/to-spec` and `/to-tickets` are slash-command-only (`disable-model-invocation`), followed their documented process by hand. Installed `gh` CLI (Ubuntu's `universe` repo, not GitHub's blocked apt source) and found this session's proxy only allows a pinned set of PR-review GraphQL operations -- `gh issue create` and most high-level `gh` commands fail here, plain REST via `gh api` works. Documented that as a sandbox-specific note in `docs/agents/issue-tracker.md`. Confirmed seams with Jordan (existing seams preferred, one new seam only for the MCP server) and whether to include the MCP-connector rewrite now (Jordan: yes). Published the spec as [issue #2](https://github.com/justgoogledit/KillRoy/issues/2), labeled `ready-for-agent`. Covers all 5 cleanup areas: fixture-check automation, the proactive-trigger fix, structured logging, a typed MCP connector server (first real code in this repo), and standardizing adversarial review in `skill-creator`. `/to-tickets` not yet run. Details in [[Knowledge/Lessons/2026-07-18-cleanup-spec-published]].

## [2026-07-18] source | spec split into 8 tickets (issues #3-#10)

Ran `/to-tickets` against issue #2. Presented the 8-ticket breakdown (4 independent process/doc tickets, 4 for the MCP server -- one scaffold-plus-AMR-Hub ticket blocking 3 per-remaining-source tickets) for approval before publishing, per the skill's required step. Jordan approved the granularity/edges and chose `ready-for-human` over `ready-for-agent` for the proactive-trigger-fix ticket, since it depends on a human-granted permission an agent can't resolve alone. Published all 8 via `gh api` REST in dependency order, and linked #8/#9/#10 as blocked by #7 using GitHub's native issue-dependencies API (not just prose text) -- verified afterward via each issue's `issue_dependencies_summary` that the graph landed correctly (#7 blocking:3, each of #8/#9/#10 blocked_by:1). Frontier (no unmet blockers): #3, #4, #5, #6, #7. Details in [[Knowledge/Lessons/2026-07-18-tickets-published]].

## [2026-07-19] setup | fixture-check failed -- fleet-commissioning-handoff: master-tracker.csv (checkout mtime ~48h exceeds the 24h threshold, so the documented non-stale path cannot run; README had no fresh-path mtime reset), run-daily-workflow: planner-tasks-response.json (due dates baked to 2026-07-18 with no synthetic today override documented, so the due-today filter returns none of the documented due-today tasks)

## [2026-07-19] lesson | verify-fixtures-shipped

Implemented ticket #3: new foundational skill `verify-fixtures` dry-runs every fixture-skill pairing documented in the fixtures README and reports PASS/FAIL per pairing, with broken fixtures required to fail loud (a silent clean result on a broken fixture scores FAIL). Wired into `skill-creator` as required step 10 (scoped to the edited skill, escalating to unscoped when the edit touches fixtures/), indexed in Skills.md, CLAUDE.md scope/anti-sprawl lines updated. Its first unscoped run legitimately failed 2 of 6 pairings on documentation drift (stale checkout mtime on the fresh CSV; the Planner fixture's baked-in 2026-07-18 reference date) -- both fixed in the fixtures README, which also gained a canonical pairings table after the adversarial review found the prose pairing list was parse-dependent. The review also caught a blocker: the side-effect carve-out missed run-daily-workflow's mid-step inbox.md drain; carve-out is now a no-repo-state-changes invariant, not an enumerated step list. Issue #3 closed. Details in [[Knowledge/Lessons/2026-07-19-verify-fixtures-shipped]].

## [2026-07-19] setup | adversarial review standardized in skill-creator (ticket #6)

Added required step 11 to `skill-creator`: adversarial review for every non-trivial change, with an exhaustive trivial list and everything else defaulting to reviewed. Dog-fooded it on the change itself -- the reviewer found 6 real problems, including the queued-but-missed canonical-template fix (`Applies`/`Verify` were absent from the template every real skill already follows) and a non-partitioning trivial/non-trivial definition. All folded in, plus this file's pre-existing em/en dashes cleaned. Re-ran verify-fixtures scoped to skill-creator after the fixes (no pairings, explicit pass). Issue #6 closed. Details in [[Knowledge/Lessons/2026-07-19-adversarial-review-standardized]].

## [2026-07-19] lesson | structured-log-lines
<!-- kilroy-log date=2026-07-19 skill=session-recap event=recap status=ok type=lesson slug=structured-log-lines -->

Implemented ticket #5: every skill log-append step now emits a machine-readable `kilroy-log` companion line (HTML comment, so the rendered log is unchanged) after its prose line, with the format contract documented once in this file's header -- whose stale types list got fixed in the same pass. All six log-appending skills edited; verify-fixtures' dry-run carve-out extended to compose (never write) target-skill log entries. Process: fixture check all-PASS, adversarial review found 10 real problems (anchored grep contract, same-day grandfather boundary, coverage-only failure fields, phase-aware daily audit, fleet scope field, and more) -- all folded in, then an unscoped fixture re-run and a 3-verifier workflow confirmed clean. Also re-probed ticket #4's blocker: MCP trigger calls still require an ungrantable-from-here permission approval; stays ready-for-human. Issue #5 closed. Details in [[Knowledge/Lessons/2026-07-19-structured-log-lines]].

## [2026-07-19] lesson | mcp-server-amr-hub
<!-- kilroy-log date=2026-07-19 skill=session-recap event=recap status=ok type=lesson slug=mcp-server-amr-hub -->

Implemented ticket #7: `mcp-server/`, the first real code in this repo -- a plain Node.js MCP server (stdio, one direct dependency, no TypeScript/bundler) exposing `amr_hub_get_units`, registered via `.mcp.json`. The tool enforces the old prose contract plus one deliberate, documented tightening (the `amrs`-array shape check) and fails loud with specific reasons on every abnormal path; 20 `node:test` tests run against the same fixtures the skills dry-run, including 6 that spawn the real server over stdio. `check-connectors` and `arriving-amr-progress` migrated to consume it, refusing hand-rolled HTTP fallbacks. Unscoped fixture matrix: 6/6 PASS. Adversarial review found 8 real problems (buried ECONNREFUSED, the mislabeled tightening, zero server.js coverage, bare Invalid URL, empty-fleetId widening, false #8-#9 attribution, launch-dir constraint, stale design-doc step) -- all folded in. The handoff skill's AMR Hub step rides with #8 (comment posted). Issue #7 closed; #8/#9/#10 unblocked. Details in [[Knowledge/Lessons/2026-07-19-mcp-server-amr-hub]].

## [2026-07-19] lesson | overmind-tool
<!-- kilroy-log date=2026-07-19 skill=session-recap event=recap status=ok type=lesson slug=overmind-tool -->

Implemented ticket #8: `overmind_get_fleet_state` joins the connector server, with reachability and full-pull modes matching its two consumers, an explicitly UNVERIFIED GraphQL query pinned to first-corp-run verification, and envelope-or-flat-fixture acceptance making the dry-run substitution a tested path. Migrated check-connectors' Overmind probe and fleet-commissioning-handoff's Overmind AND AMR Hub pulls (the latter per the #8 scope note closing the gap the #7 review found). 34 tests green. Adversarial review found 9 problems, including three real bugs: null `data.fleet` misdiagnosed as a shape error, string `"true"` for reachabilityOnly silently inverting probe-vs-pull semantics, and no fleet-identity check on returned state; all folded in. Ticket #4 retried after verbal permission grant -- still gated by the interactive approval dialog, stays ready-for-human. Issue #8 closed; #9/#10 remain. Details in [[Knowledge/Lessons/2026-07-19-overmind-tool]].

## [2026-07-19] lesson | master-tracker-tool
<!-- kilroy-log date=2026-07-19 skill=session-recap event=recap status=ok type=lesson slug=master-tracker-tool -->

Implemented ticket #9: `master_tracker_get_rows` joins the connector server, backed by a hand-rolled ~40-line RFC 4180-style CSV parser (no dependency added). Staleness comes back as a `stale`/`ageHours` WARN-grade flag, never an error. Migrated check-connectors step 5 and fleet-commissioning-handoff steps 1/4/Verify-4 -- all three AMR sources (Overmind, AMR Hub, Master Tracker) now run through tested tools; Planner is the only source left prose-described, pending #10. Adversarial review found 3 real bugs: ragged rows silently corrupted data instead of refusing, filtering on a missing/renamed `projectIdentifier` column silently returned 0 rows indistinguishable from "fleet unknown," and a floored-then-compared staleness check let a CSV 24.5h past a 24h threshold read as not-stale. Also fixed a BOM defeating the comment-banner skip, CRLF-inside-quoted-fields getting rewritten by a global split/join, an untrimmed-data-cells asymmetry, a stale test name, and an unbuilt alias-resolution claim in the handoff skill's example. All folded in (`328990c`); 47/47 tests green. Issue #9 closed; #10 remains, already unblocked. Details in [[Knowledge/Lessons/2026-07-19-master-tracker-tool]].

## [2026-07-19] lesson | planner-tool
<!-- kilroy-log date=2026-07-19 skill=session-recap event=recap status=ok type=lesson slug=planner-tool -->

Implemented ticket #10: `planner_get_tasks` joins the connector server -- token acquisition, `/me` resolution (or the `GRAPH_API_USER_OBJECT_ID` override), per-plan title and task pulls across `PLANNER_PLAN_IDS`, assignment filtering, and due-today (`America/Chicago`) grouping by plan name, with null/unparseable `dueDateTime` tasks surfaced as explicit data-quality flags rather than dropped. Migrated check-connectors step 6 and run-daily-workflow's morning-phase Planner digest off prose-described Graph API calls -- all four data sources now run through tested `kilroy-connectors` tools, closing out the connector rewrite spanning tickets #7-#10 and the `/ask-matt` cleanup spec (issue #2). Adversarial review found 2 real bugs: a literal JSON `null` response body crashed with a raw `TypeError` instead of a specific fail-loud message at four call sites (a regression against `overmind.js`'s established optional-chaining guard), and a task missing its `id`/`title` field silently serialized with a hole instead of being refused. Both fixed (`daecf30`), plus 10 new regression tests closing the coverage gaps the review flagged. 65/65 tests green. Issue #10 closed. Only #4 (proactive trigger) remains open, blocked on Jordan clearing an interactive MCP approval dialog. Details in [[Knowledge/Lessons/2026-07-19-planner-tool]].

## [2026-07-20] setup | enterprise repo cut-over + first connector check on the work computer

`justgoogledit/KillRoy` cloned into Jordan's enterprise account as `github.tesla.com/jocasias/Kilroy` (confirmed via `git remote -v`); updated the two stale placeholder references (`CLAUDE.md`, `docs/agents/issue-tracker.md`) to the real repo, dropped the now-inapplicable sandbox `gh` GraphQL-restriction note. Flag: GitHub Issues are not part of git history, so #1-#10 (including the still-open #4) did not come over with the clone -- the enterprise repo has zero issues, open or closed. Awaiting Jordan's call on re-filing vs. pulling the issue history over. First `check-connectors` run on the work computer FAILed at step 1 -- no `.env` at the repo root, expected first-run-on-new-machine state, not a real connector problem.

## [2026-07-20] source | MFA 2M AMR Deployment Plan added as a reference source

Jordan flagged, after checking MFE/MFA documentation, that there is no single true master tracker for AMR commissioning -- corrected `CLAUDE.md`'s Data sources framing of the Sonic AMR Master Tracker CSV accordingly (it covers pipeline/vendor/HW-rev data only, not network addressing, safety sign-off, or MFS part cross-reference). Read the MFA-owned `2M AMR Deployment Plan.xlsx` (SharePoint, `materialflowdesign` site, 17 sheets) and documented the three sheets that matter for cybercab AMR tracking in a new reference file: `Commissioning-Updated plan` (per-unit IPC/Switch/PLC IP addresses plus 220/250/270 sub-step dates and an issues list), `Safety Matrix` (per-unit gate-270 safety I/O sign-off, cross-referenced against E-plans for the physical hardware under test), and `MFS Part Info` (part-number-to-MFS-station cross-reference). Reference only, per Jordan's explicit scope -- not wired into any skill's automated pull; no new `.env` var or connector tool added. Details in [[Knowledge/Sources/2026-07-20-mfa-2m-amr-deployment-plan]].
## [2026-07-20] lesson | personal-assistant-expansion
<!-- kilroy-log date=2026-07-20 skill=session-recap event=recap status=ok type=lesson slug=personal-assistant-expansion -->
