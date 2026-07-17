---
date: 2026-07-17
session_topic: Add check-connectors skill; attempt to wire a real proactive morning trigger
project: Kilroy
tags: [lesson, proactive, scheduling, check-connectors]
---

# Connector health-check skill and the proactive morning trigger

## What we did

- Added [[Skills/check-connectors/SKILL]] (foundational): verifies `.env` is filled and all three data sources (Overmind, AMR Hub, Master Tracker CSV) are reachable, with a `NOT SAFE TO RUN A SKILL` hard stop on any failure. Wired it as the first sub-step of [[Skills/run-daily-workflow/SKILL]]'s morning phase so a bad `.env` fails at one clear checkpoint instead of mid-skill.
- Attempted to wire a real recurring proactive trigger (a Routine, weekdays 07:06, firing into a fresh session, with a push notification) so the morning brief runs itself instead of Jordan remembering to type "kilroy run my day."

## Decisions

- **`check-connectors` is foundational, not a fourth Jordan-facing workflow.** It's infrastructure like `skill-creator`/`session-recap`, exempt from the "only add a skill after hitting the same manual task 3+ times" rule -- the rule is about workflow sprawl, not about verifying the workflows work.
- **Chose `create_trigger` (the Routines tool) over `CronCreate`** for the scheduled morning run. `CronCreate` jobs are session-scoped -- they die when the session ends and auto-expire after 7 days regardless -- which doesn't match "runs itself every morning" as a durable behavior. `create_trigger` persists independent of session lifetime.
- **The scheduled prompt does not auto-commit or push the day file.** It writes `Projects/daily/<date>-daily.md` to disk and sends a push notification, but leaves the commit as a manual/interactive step. Reasoning: auto-pushing to a shared branch every morning without a human glancing at it first is a bigger, more consequential default than what was asked for ("fires the morning brief and can push a notification"); easy to turn on later if Jordan wants it.
- **Picked a non-default time (07:06, not 07:00)** and weekdays-only (`1-5`), matching the day-runner's own sample brief time and the fact that AMR commissioning is a weekday operation. Not confirmed with Jordan -- flagged as an assumption to revisit.

## Mistakes & corrections

- **Mistake (caught before committing):** first draft of `run-daily-workflow`'s "Proactive invocation" section asserted the trigger was "Wired 2026-07-17" before actually confirming the `create_trigger` call succeeded. The call returned an MCP permission-approval error (`MCP tool call requires approval`) rather than a clean success, and a follow-up `list_triggers` call hit the same error -- so as of this write-up, whether the Routine actually exists is unconfirmed.
  **Fix:** softened the skill text to "In progress... a Routine... is intended to fire" and flagged the timezone as unconfirmed, rather than asserting it's live. Don't write a completed-state claim into a skill file for an external action whose result wasn't actually observed.
  **Skill updated:** [[Skills/run-daily-workflow/SKILL]]

## Open threads

- [ ] Confirm whether the `create_trigger` call for "Kilroy morning brief" (weekdays 07:06, fresh session, push notifications) actually succeeded once the MCP approval is granted or denied. If it didn't go through, retry it; if it did, update this file and the "Proactive invocation" section in `run-daily-workflow/SKILL.md` to drop the "in progress" hedge and record the real trigger ID.
- [ ] Confirm the actual timezone `create_trigger`'s cron expression runs in (its schema doesn't state one, unlike `CronCreate` which is explicit about local time) -- 07:06 could land at the wrong wall-clock hour for Jordan if the scheduler runs in UTC.
- [ ] Ask Jordan whether weekdays-only at ~07:00 is actually the schedule he wants, and whether midday/close-out should eventually be scheduled too (the skill's own anti-sprawl reasoning says start morning-only until the brief proves useful).
- [ ] This environment cannot reach any of the three real connectors yet, so every fire of this trigger will hit `check-connectors`'s FAIL path until `.env` points at reachable endpoints. Expected, not a bug -- but worth confirming Jordan knows the first several notifications will be connector-failure reports, not real briefs.
