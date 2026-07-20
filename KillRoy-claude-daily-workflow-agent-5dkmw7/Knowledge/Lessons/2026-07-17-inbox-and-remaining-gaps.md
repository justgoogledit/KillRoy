---
date: 2026-07-17
session_topic: Vault-leakage audit, inbox capture, CSV-WARN propagation, second trigger retry
project: Kilroy
tags: [lesson, inbox, check-connectors, proactive]
---

# Vault audit, inbox capture, and CSV-staleness propagation

## What we did

- Audited `Knowledge/Personal/people.md` and `stack.md` for vault-specific leakage. Both are still unfilled starter-pack templates -- no real names, no real vault paths, nothing from Jordan's other projects. Nothing to redact.
- Built ad-hoc inbox capture: `Projects/daily/inbox.md` (scratch file) plus a new step 0 in [[Skills/run-daily-workflow/SKILL]] ("add \<item\> to my list", any time) and a drain step inside the morning brief (and midday pulse) that folds `## Unconsumed` lines into that day's action list tagged `(jordan-request)`, then clears them.
- Extended CSV-staleness awareness into the daily brief: `check-connectors` already computed a WARN for a stale Master Tracker CSV, but `run-daily-workflow` previously only reacted to a hard FAIL. Now a WARN carries into the day file's opening banner (same style as `fleet-commissioning-handoff`'s freshness line) without blocking the brief.
- Retried the proactive-trigger `create_trigger` call a second time (three attempts total across this session) -- same `MCP tool call requires approval` error both times, including on a plain `list_triggers` read. Stopping the retry loop here; this is a permission gate outside what retrying can resolve.

## Decisions

- **`arriving-amr-progress` does not get a CSV-staleness check.** It never reads the Master Tracker CSV by design (AMR-Hub-only skill, per the original design doc's "same connector, different output shape" framing) -- adding a staleness warning for a source it doesn't consume would be noise, not a fix. The real gap was `run-daily-workflow` silently swallowing a WARN it already had access to via `check-connectors`; that's what got fixed.
- **Inbox items are ranked after blockers, with no days-blocked figure.** They don't have a comparable urgency signal, so forcing them into the days-blocked ranking would be a fabricated ordering.
- **Verified the capture/drain cycle by hand** against the real `inbox.md` (not a fixture -- this mechanism doesn't touch fleet data, so there's nothing to fake): appended two sample lines to `## Unconsumed`, confirmed the drain step folds them 1:1 with no loss, then cleared the file back to its empty starting state. Conservation held (2 unconsumed -> 2 drained -> 0 left). Left `inbox.md` clean afterward so no demo content looks like a real Jordan ask.

## Mistakes & corrections

None new this session -- the two bugs from the earlier execution-test pass were already fixed and committed.

## Open threads

- [ ] Proactive trigger (`create_trigger` for "Kilroy morning brief") still unconfirmed after 3 attempts, all failing with an MCP permission-approval error. Needs the user to approve the pending permission prompt (if one is showing) or explicitly enable the Routines MCP server, then one more retry.
- [ ] (carried from [[Knowledge/Lessons/2026-07-17-proactive-trigger]]) Confirm the timezone `create_trigger`'s cron runs in once it's live.
- [ ] (carried from [[Knowledge/Lessons/2026-07-17-execution-test-with-fixtures]]) `overmind-fleets.md` still has 3 of 4 fleet ids UNVERIFIED -- needs a real corp-network session to resolve, not something fixable from here.
