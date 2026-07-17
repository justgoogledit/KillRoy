---
name: run-daily-workflow
type: executional
trigger: Jordan says "kilroy run my day" / "kilroy daily" / "morning brief" / "start my day", or a scheduled morning invocation
inputs: optional focus fleet (defaults to everything Kilroy tracks)
outputs:
  - Projects/daily/<YYYY-MM-DD>-daily.md (the day file, primary artifact -- a living document updated across the day)
  - log.md append (event line: date, phase, action count, blocker counts by team, carry-over count)
---

# run-daily-workflow

The day runner. Orchestrates Kilroy's existing skills plus a task list into one daily loop: Jordan starts the day with a plan, gets deltas during the day, and closes the day with carry-overs captured.

## When to use

- Start of the workday -- "kilroy run my day" / "start my day" / a scheduled morning run. Produces the morning brief.
- Midday pulse check -- "kilroy midday" / "anything change". Appends a delta to the day file.
- End of day -- "kilroy wrap the day". Reconciles actions and captures carry-overs.
- Not for one-off fleet packaging -- use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] for that.
- Not a replacement for the raw progress board -- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] renders that; this skill consumes it.

## Applies

- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] -- run end to end for the live gate board; the day file's blockers come from it.
- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- referenced, never run automatically; the day file may recommend a handoff, Jordan triggers it.
- [[Skills/session-recap/SKILL|session-recap]] -- run at close-out if anything reusable was learned.
- [[Knowledge/Sources/2026-07-02-pc-amr-gates|Gate ownership map]] -- attributes every action to the team whose move unblocks it.
- [[Knowledge/Personal/voice]] -- day file opens with the "was here" signature.
- [[Knowledge/Personal/preferences]] -- short, concrete, one recommendation with reason.

## Steps

1. **Determine phase.** Morning (first run of the day / "start my day"), midday ("midday" / "anything change"), or close-out ("wrap the day"). If the day file `Projects/daily/<today>-daily.md` does not exist, phase is morning regardless of clock.
2. **Morning brief.**
   - Run [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] end to end (its own Verify included) to get the live gate board. If Jordan named a focus fleet, pass it through.
   - Scan `log.md` and `Knowledge/Lessons/*.md` "Open threads" for carry-overs from previous days, plus yesterday's day file "Carry-over" section if present.
   - Build today's action list: every blocker from the board becomes an action attributed to its owning team -- chase items for teams Jordan pushes (MFE, MFA Hardware), direct actions for Jordan's own side (MFA Controls / PC). Carry-overs come next. Rank by days-blocked descending; safety-gate (250/270) blockers first within a tie.
   - Write the day file using the output template. One recommendation for the day, with the reason.
3. **Midday pulse.** Re-pull the AMR Hub board and diff against the morning snapshot in the day file: gates that changed status, new blockers, blockers cleared. Append a "Midday delta" section to the day file. If nothing changed, say so in one line -- no fabricated movement.
4. **Close-out.** Mark each action item done / moved / still open. Anything still open becomes tomorrow's "Carry-over" section. Append per-gate movement for the day (units that advanced a gate). Then run [[Skills/session-recap/SKILL|session-recap]] if anything reusable was learned. Append the log.md line.
5. **Log format:** `## [<date>] daily | <phase> -- <n> actions, <n> blockers (<team>=<n>, ...), <n> carried over`.

## Proactive invocation

Kilroy is local-first, so "proactive" means a scheduled morning run: Windows Task Scheduler or cron invoking `claude -p "kilroy run my day"` in the repo, or a Claude Code Routine where available. The schedule triggers the same skill; nothing else changes. Midday and close-out can be scheduled the same way, but start with morning-only until the brief proves useful -- same reasoning as the skill-sprawl anti-pattern.

## Verify

Before handing the day file back to Jordan:

1. **Sum audit** (inherited from the progress board): every unit on the board appears in exactly one gate bucket, and the day file's blocker count equals the board's blocker count.
2. **Action traceability**: every action item traces to a real blocker line, a real carry-over line in a prior day file or lesson, or an explicit Jordan request. No invented work.
3. **Fail loud**: if AMR Hub or the Master Tracker CSV is unreachable, the day file says so at the top and the affected sections are marked unavailable -- never silently reuse yesterday's numbers as today's.
4. **Close-out conservation**: actions done + moved + still-open = actions opened that morning (plus any added midday). No action silently disappears.

## Output template

```markdown
# Daily -- <YYYY-MM-DD>

> Kilroy was in the AMR Hub at HH:MM CDT. <total> units, <blockers> blocked, <n> actions today.

## Today's actions

### Push (their action)

**MFE (<n>)**
- [ ] T3L2_<nnn> at gate 270, blocked 6 days -- "<blocker text>"

**MFA Hardware (<n>)**
- [ ] T3L2_<nnn> at gate 220, blocked 4 days -- "<blocker text>"

### Do (our action -- MFA Controls / PC)

- [ ] T3L2_<nnn> at gate 250, blocked 2 days -- "<blocker text>"
- [ ] <carry-over or jordan-request item, tagged with its source>

## Board snapshot

| Fleet | at-220 | at-250 | at-270 | at-280 | production-ready |
|---|---|---|---|---|---|
| <fleet-name> | <n> | <n> | <n> | <n> | <n> |

Full board: [[Projects/progress/<YYYY-MM-DD>-progress]]

## Carry-over (from yesterday)

- <item> -- <source: prior day file / lesson open thread>

## Midday delta

(appended at midday: gates changed, new blockers, blockers cleared -- or one line saying nothing changed)

## Close-out

(appended at end of day)
- Done: <n> -- <items>
- Moved: <n> -- <items, where they went>
- Still open (tomorrow's carry-over): <n> -- <items>
- Gate movement: <unit> advanced <gate> -> <gate>, ...

## Recommendation

<one recommendation with the reason -- e.g. "Push MFE on T3L2_027 first: 6 days blocked at 270 and two units are queued behind it at 250.">
```

## Examples

**Good trigger:** *"kilroy run my day"* -> morning phase, full brief.
**Good trigger:** *"anything change since this morning?"* -> midday phase, delta appended to the day file.

**Bad trigger:** *"kilroy handoff cybercab 2m"* -> that is [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]], not the day runner.
**Bad trigger:** *"add 'call vendor' to my list"* with no unit or source -- fine to add as a Jordan-requested action, but it gets tagged `(jordan-request)`; Kilroy never invents it silently.

## Anti-patterns

- Re-rendering the full progress board inside the day file. Link the `Projects/progress/` snapshot; the day file is actions, not raw status.
- Inventing action items to make the day look fuller. Every action traces to a blocker, a carry-over, or a Jordan request.
- Letting a missing data source silently zero the blocker count. Fail loud -- mark the section unavailable.
- Running close-out without reconciling every open action. Done + moved + still-open must equal what was opened.
- Writing to AMR Hub. Read-only -- Jordan updates gates in the dashboard.
