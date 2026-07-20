# Daily workflow

What Jordan's day looks like and which M365 tools matter. Captured from an interview, same role
`voice.md` and `preferences.md` already play -- a living reference, update it when the picture
changes instead of trusting stale interview notes.

## What a typical day looks like

Full-suite day, not one dominant mode. All four of these show up:

- **Meetings and Teams calls.** Standing syncs plus ad hoc calls.
- **Email triage.** Outlook, working through what came in.
- **Task and ticket management.** Tracking what's open across AMR buyoffs and his own to-dos.
- **Status reporting to leadership.** Summarizing where things stand.

## Which M365 tools matter

All four used day to day:

- **Teams** -- calls and chat.
- **Outlook** -- email.
- **Planner / To Do** -- task tracking.
- **SharePoint / OneDrive** -- where the Master Tracker and other shared files live.

## Daily rhythm

"A bit of both" -- Jordan does a rough pass in the morning, then reacts to things as they come up
through the rest of the day. Not a single scheduled review; the morning brief is the anchor, the
rest is interrupt-driven.

## No acute pain point

Jordan didn't name a specific M365 problem he's fighting. Nothing here is a fire to put out.

## Highest-value digest item

Planner / To-Do due-today items. The single thing worth pulling into the morning brief. That's
the whole v1 scope on the M365 side -- see [[Skills/run-daily-workflow/SKILL|run-daily-workflow]]'s
morning phase for how it's implemented.

## v1 scope

Due-today Planner tasks assigned to Jordan, pulled across every plan in `PLANNER_PLAN_IDS`,
grouped by plan name. Nothing else from Teams, Outlook, or SharePoint/OneDrive is pulled into
Kilroy in v1.

## Deferred (not forgotten)

Three items, explicitly out of scope for now:

- **Teams mentions.** Not pulled. No acute pain point named to justify building it yet.
- **Flagged email.** Same -- Outlook triage stays manual for now.
- **Team-tracked Planner tasks.** Tasks Jordan owns or manages but isn't personally assigned to
  (the assignee field points at someone else, or the task is unassigned but on a plan he runs).
  The v1 digest filters to tasks assigned to Jordan's own AAD object ID -- this is a deliberately
  narrower set.

Revisit any of these if Jordan hits the same manual task 3+ times, same threshold as the
skill-sprawl rule in `CLAUDE.md`.
