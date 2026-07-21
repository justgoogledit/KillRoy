---
date: 2026-07-20
session_topic: Broadened Kilroy into a personal assistant; shipped triage-personal-items
project: [[Skills/triage-personal-items/SKILL]]
tags: [lesson, scope-change, adversarial-review]
---

# Personal-assistant expansion: first skill shipped, adversarial review caught 8 issues

## What we did

- Jordan connected a batch of new Nova MCPs (Teams, Planner, mail, SharePoint, Loop, Access, Azure DevOps, TIA Portal, MFS-ops, etc.) and asked Kilroy to use everything available to become "the best version possible."
- Scoped that down via brainstorming: safety tier stays AMR-only; first slice is a daily mail/Teams/Planner triage, not a sweeping rewrite.
- Shipped [[Skills/triage-personal-items/SKILL|triage-personal-items]] (normal tier), wired into `run-daily-workflow`'s morning phase as a third orchestrated input, plus an on-record anti-sprawl exception in `CLAUDE.md`/`Skills.md`.
- Ran the required adversarial review (skill-creator step 11) before considering the change done. It found 8 real problems; all fixed before committing.

## Decisions

- **Kilroy's safety-adjacent tier stays scoped to the three AMR workflows only** -- because the risk model (wrong handoff/progress causing line-side ops to treat a unit as safety-cleared) is specific to that data, not to personal-assistant domains like mail triage. New non-AMR skills default to normal tier unless a specific reason says otherwise.
- **`triage-personal-items` was added by explicit exception, not the normal 3+ repeats threshold** -- because Jordan directed the scope broadening directly rather than hitting the same manual task repeatedly. Recorded in `CLAUDE.md` Scope and `Skills.md`, worded as a one-off (not a standing alternate trigger for future additions -- see Mistakes below).
- **New skill reaches `mail`/`microsoft-teams`/`planner` MCPs directly, not through `kilroy-connectors`** -- because those are ad-hoc Nova-provided tools, not the tested/fixture-backed connector layer the four AMR/digest sources use. Disclosed explicitly in `CLAUDE.md` Data sources rather than left as a silent gap. (supersedes the prior "all four sources... no prose-described calls remain" claim, which predates this skill)

## Mistakes & corrections

- **Mistake:** `daily-workflow.md` and `run-daily-workflow/SKILL.md`'s own Applies section both still said Teams mentions and flagged email were "deferred" after the new skill started covering exactly those two things -- a same-session contradiction across two files, one of which (`daily-workflow.md`) is a `Knowledge/Personal/` primary source CLAUDE.md's precedence rules say should be current before judgment calls.
  **Fix:** Updated both files with explicit "no longer deferred as of 2026-07-20" notes, cross-linked to each other.
  **Skill to update:** [[Skills/skill-creator/SKILL]] -- worth adding an explicit check to step 11's review prompt for "does this change make any *unedited* Knowledge/ file stale," since the reviewer had to independently think to check `daily-workflow.md` rather than it being a named target.
- **Mistake:** wrote the anti-sprawl exception into `CLAUDE.md`'s Anti-patterns section as "...or gives the same kind of explicit direction he gave for `triage-personal-items`" -- which reads as a standing alternate path around the 3+ repeats rule, directly contradicting Scope's own wording that the exception "doesn't grandfather" future additions.
  **Fix:** Reworded to require a fresh, separate on-record exception each time, matching Scope's language.
  **Skill to update:** none -- this was a one-off wording slip, not a pattern.
- **Mistake:** the skill's Steps used vague, unbounded qualifiers ("capped to what's needed," "where relevant") for the mail and Teams pulls -- exactly what skill-creator's own writing guide warns against ("concrete, no 'consider'").
  **Fix:** Replaced with concrete bounds (top 25 unread, 7-day @mention window).
  **Skill to update:** none -- caught within the same skill during first draft.
- **Mistake:** the FYI bucket's mail/Teams/Planner counts could double-count an item already listed under "Needs action today" (e.g. a flagged unread mail counted once in Needs-action and again in the unread total) -- and the original Verify checklist wouldn't have caught it, since it checked counts against the raw tool output rather than against bucket exclusivity.
  **Fix:** Made buckets explicitly mutually exclusive in Steps, added a dedicated Verify check for it.
  **Skill to update:** none -- fixed in the skill that had the bug.
- **Mistake:** a `check-connectors` FAIL (which only checks AMR/Planner-digest sources) was written to stop the *entire* morning phase, which would have silently blocked the unrelated `triage-personal-items` pull on every AMR-source outage.
  **Fix:** Scoped the stop condition to the AMR-scoped bullets only; `triage-personal-items` runs regardless and handles its own source failures independently.
  **Skill to update:** none -- fixed in `run-daily-workflow` directly.

## New context for Personal/

- `Knowledge/Personal/daily-workflow.md`'s "Deferred" list is now down to one item (team-tracked Planner tasks). Teams mentions and flagged email moved out via the 2026-07-20 update note.
- Kilroy's identity is now explicitly two-layered per `CLAUDE.md`'s "Who you are": AMR work (safety-adjacent, the anchor) plus a growing normal-tier personal-assistant surface. Future non-AMR skill proposals should default to normal tier and go through the full brainstorm -> spec -> skill-creator process -- the `triage-personal-items` exception was explicitly written not to grandfather anything.

## Open threads

- [ ] Two other personal-assistant capabilities were discussed during brainstorming but deferred to their own future specs: Teams-delivered handoff/brief outputs, and a TIA Portal / PLC cross-check against the 270 safety gate (the latter would likely need its own safety-tier discussion, not normal tier, since it touches PLC safety config). → [[Skills/triage-personal-items/SKILL]]
- [ ] `Knowledge/Sources/fixtures/README.md` has no fixture coverage for `triage-personal-items` (mail/Teams/Planner MCP responses aren't simulated anywhere). Fine for now since `verify-fixtures` explicitly allows "no pairings documented," but if this skill's logic grows more complex, worth building fixtures the same way the AMR skills have them. → [[Skills/verify-fixtures/SKILL]]
