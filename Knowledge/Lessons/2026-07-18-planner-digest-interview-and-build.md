---
date: 2026-07-18
session_topic: Interview-driven expansion of Kilroy to cover Jordan's full day + Planner digest
project: Kilroy
tags: [lesson, interview, planner, m365, workflow]
---

# Planner/To-Do digest: interview, plan review, and build

## What we did

- Ran a 3-round `AskUserQuestion` interview (in plan mode, since a full free-text conversational
  interview doesn't fit that tool's harness constraints well) to find the real shape of Jordan's
  "help me with everything I do daily" ask, rather than guessing at an M365 integration. Converged
  on something narrow: extend `run-daily-workflow`'s morning phase with a Planner/To-Do due-today
  digest, not a sprawling Teams/Outlook/SharePoint build.
- Sent the resulting plan through one adversarial review pass (a Plan-type subagent that actually
  read `run-daily-workflow/SKILL.md`, `check-connectors/SKILL.md`, `.env.example`, the fixtures,
  `CLAUDE.md`, and `voice.md` before critiquing) before asking for approval. It found 8 real gaps
  -- a dropped deferred-item (team-tracked tasks), a missing multi-plan resolution rule, undefined
  close-out behavior for Planner tasks, humanizer scope not extended, stale "three sources"
  language that would've gone unnoticed in `check-connectors`, README/Skills.md left untouched,
  an internal inconsistency between the plan's own Verification section and its SKILL.md edit,
  and a too-vague fixture description missing real Graph API field names. All 8 got worked into
  the plan as concrete decisions before it went to Jordan for approval.
- Built the approved plan via a Workflow (7 agents: contracts, 2 parallel skill extensions, 3
  parallel peripheral-doc updates, 1 verification pass) -- the sequencing mattered because
  `check-connectors` and `run-daily-workflow` both needed the exact `.env` var names and fixture
  GUIDs the contracts stage picked, not independently invented ones.
- The workflow's own verification agent found 3 more issues post-build (all documentation-
  consistency gaps: two stale "three data sources" mentions in `CLAUDE.md`, one stale "same three
  sources" claim in `check-connectors` about the session-start hook, which was NOT extended to
  probe Planner and shouldn't claim parity it doesn't have). Fixed directly.
- Did not fully trust the agents' self-reported "no em dashes" and "verified" claims -- re-ran an
  independent `grep` for U+2014 across every changed file myself, and independently re-derived the
  fixture's expected dry-run result set by hand (which task should be included/excluded/flagged)
  rather than just accepting the verification agent's trace. Both matched. Also rendered an actual
  dry-run day-file artifact for the new Planner section (`Projects/daily/2026-07-18-daily-dryrun-
  planner.md`), not just an analytical trace -- consistent with how the AMR fixtures were
  execution-tested earlier this session, not a lighter standard for the new work.

## Decisions

- **`AskUserQuestion` in plan mode is a workable substitute for a free-text interview**, even
  though it forces a multiple-choice-with-Other shape onto what Jordan asked for as open
  conversation ("keep asking me... so I can think about my daily process"). Plan mode's harness
  constraint (every turn must end in `AskUserQuestion` or `ExitPlanMode`) doesn't allow a bare
  conversational question turn. Structured multiSelect questions with good option coverage, run
  across 3 rounds that each build on the last, got real signal without needing free text every
  time.
- **Close-out exclusion for Planner tasks is a real design decision, not an oversight**: Planner
  is its own system of record, unlike AMR blockers where the day file is the only tracking
  mechanism. Reconciling Planner tasks into the done/moved/still-open count would create a second,
  divergent copy of state Planner already owns. Documented the reasoning inline in the SKILL.md
  itself, not just in this lesson file, so a future reader doesn't have to guess why it's excluded.
- **check-connectors' Planner check tests only the first configured plan ID**, matching the
  existing (and easy to miss on a first pass) Overmind precedent of testing one representative
  target rather than enumerating every configured value. Full multi-plan enumeration happens only
  in the real data pull.
- **Did not extend `.claude/hooks/session-start.sh` to probe Planner.** Out of the approved plan's
  scope -- the hook stays a 3-source fast probe for now. Flagged the resulting parity gap
  explicitly in `check-connectors/SKILL.md` rather than letting stale "same sources" language
  imply something that isn't true.

## Open threads

- [ ] `.claude/hooks/session-start.sh` could be extended to probe Planner too, for full parity
  with `check-connectors`. Not done -- wasn't in the approved plan's scope, and the session-start
  hook's own design goal (fast, fixed-timeout, every-session-start) may or may not want a fourth
  network call by default. Worth a deliberate decision, not a silent addition, if it comes up.
- [ ] Teams mentions, flagged email, and team-tracked (non-assigned) Planner tasks remain
  deferred, per `Knowledge/Personal/daily-workflow.md`. Revisit only if Jordan hits the same
  manual task 3+ times, per the skill-sprawl threshold already established in `CLAUDE.md`.
- [ ] This is still scaffolding built on the personal-account sandbox with zero live Graph API
  access. The real v1 test is on the work account, once IT provisions the app registration and
  the actual `PLANNER_PLAN_IDS` are known.
