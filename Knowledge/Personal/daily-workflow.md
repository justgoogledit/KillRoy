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

Planner / To-Do due-today items. The original v1 anchor for the morning brief -- see
[[Skills/run-daily-workflow/SKILL|run-daily-workflow]]'s morning phase for how it's implemented.

**Updated 2026-07-20:** v1's "M365 side is Planner-only" framing is superseded. Jordan directed
Kilroy to broaden into a general personal assistant (see `CLAUDE.md`'s "Who you are" and Scope
sections); the first step was [[Skills/triage-personal-items/SKILL|triage-personal-items]], which
pulls Teams mentions and flagged/important email directly, alongside a separate Planner
due-later-this-week view. This went through the explicit-exception path, not the "3+ repeats"
threshold below -- see `CLAUDE.md` Scope's `triage-personal-items` entry for that record.

## v1 scope (original, Planner-only -- see update above)

Due-today Planner tasks assigned to Jordan, grouped by plan name, via run-daily-workflow's own
Planner digest step (since 2026-07-21 that pull goes through Nova's `planner` MCP, not the
retired Graph-API tool and its plan-id env var). This pull's scope is unchanged by the update
above -- it's still due-today-only, still Jordan's own assignments only.

## Deferred (not forgotten)

One item remains explicitly out of scope, plus the note below on the two items that moved out of
this list:

- **Team-tracked Planner tasks.** Tasks Jordan owns or manages but isn't personally assigned to
  (the assignee field points at someone else, or the task is unassigned but on a plan he runs).
  Both the run-daily-workflow digest and `triage-personal-items`' Planner pull filter to tasks
  assigned to Jordan's own AAD object ID -- this remains a deliberately narrower set in both
  places.

**No longer deferred, as of 2026-07-20:** Teams mentions and flagged email used to be listed here
("no acute pain point named to justify building it yet" / "Outlook triage stays manual for now").
Both are now pulled by [[Skills/triage-personal-items/SKILL|triage-personal-items]] -- see the
update note above. Team-tracked Planner tasks remain deferred; revisit if Jordan hits the same
manual task 3+ times, same threshold as the skill-sprawl rule in `CLAUDE.md`.
