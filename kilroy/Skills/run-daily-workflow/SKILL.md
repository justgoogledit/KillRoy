---
name: run-daily-workflow
type: executional
trigger: Jordan says "kilroy run my day" / "kilroy daily" / "morning brief" / "start my day" (or "kilroy midday" / "kilroy wrap the day" for the other phases), "add <item> to my list" for ad-hoc capture any time, or a scheduled morning invocation
inputs: optional focus fleet (defaults to everything Kilroy tracks)
outputs:
  - Projects/daily/<YYYY-MM-DD>-daily.md (the day file, primary artifact -- a living document updated across the day)
  - Projects/daily/inbox.md (ad-hoc capture scratch file -- appended to any time, drained into the next morning brief)
  - log.md append (event line: date, phase, action count, blocker counts by team, carry-over count)
---

# run-daily-workflow

The day runner. Orchestrates Kilroy's existing skills plus a task list into one daily loop: Jordan starts the day with a plan, gets deltas during the day, and closes the day with carry-overs captured.

## When to use

- Start of the workday -- "kilroy run my day" / "start my day" / a scheduled morning run. Produces the morning brief.
- Midday pulse check -- "kilroy midday" / "anything change". Appends a delta to the day file.
- End of day -- "kilroy wrap the day". Reconciles actions and captures carry-overs.
- Any time -- "add <item> to my list" / "remind me to <item>". Ad-hoc capture, independent of phase; doesn't touch the day file directly, just queues the item for the next morning brief.
- Not for one-off fleet packaging -- use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] for that.
- Not a replacement for the raw progress board -- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] renders that; this skill consumes it.

## Applies

- [[Skills/check-connectors/SKILL|check-connectors]] -- run first, silently, before any data pull. A FAIL here stops the morning phase before it starts.
- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] -- run end to end for the live gate board; the day file's blockers come from it.
- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- referenced, never run automatically; the day file may recommend a handoff, Jordan triggers it.
- [[Skills/session-recap/SKILL|session-recap]] -- run at close-out if anything reusable was learned.
- [[Knowledge/Sources/2026-07-02-pc-amr-gates|Gate ownership map]] -- attributes every action to the team whose move unblocks it.
- [[Knowledge/Personal/voice]] -- day file opens with the "was here" signature.
- [[Knowledge/Personal/preferences]] -- short, concrete, one recommendation with reason.

## Steps

0. **Ad-hoc capture (any time, independent of phase).** Jordan says "add \<item\> to my list" / "remind me to \<item\>": append one line to `Projects/daily/inbox.md` under `## Unconsumed`, formatted `- [ ] <item text> -- added <YYYY-MM-DD HH:MM> (jordan-request)`. Confirm back in one line. Do not touch the day file here -- the next morning brief drains the inbox.
1. **Determine phase.** Morning (first run of the day / "start my day"), midday ("midday" / "anything change"), or close-out ("wrap the day"). If the day file `Projects/daily/<today>-daily.md` does not exist, phase is morning regardless of clock.
2. **Morning brief.**
   - Run [[Skills/check-connectors/SKILL|check-connectors]] first, silently. If it reports `NOT SAFE TO RUN A SKILL`, stop here -- write the day file's opening line as the connector-check failure report instead of a gate board, and skip straight to that. Do not attempt the AMR Hub pull below on a red check. If it reports all-PASS but with a WARN (e.g. a stale Master Tracker CSV), carry that WARN text into the day file's opening banner as its own line, same style as `fleet-commissioning-handoff`'s freshness warning, then proceed with the brief.
   - Run [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] end to end (its own Verify included) to get the live gate board. If Jordan named a focus fleet, pass it through.
   - Scan `log.md` and `Knowledge/Lessons/*.md` "Open threads" for carry-overs from previous days, plus yesterday's day file "Carry-over" section if present.
   - Read `Projects/daily/inbox.md`'s `## Unconsumed` section. Every line there becomes a `(jordan-request)`-tagged action in today's list. Once folded in, remove those lines from `inbox.md` (leave `## Unconsumed` empty until Jordan adds more) -- an item lives in exactly one place at a time, either the inbox or a day file, never both.
   - Build today's action list: every blocker from the board becomes an action attributed to its owning team -- chase items for teams Jordan pushes (MFE, MFA Hardware), direct actions for Jordan's own side (MFA Controls / PC). Carry-overs come next, then drained inbox items. Rank by days-blocked descending; safety-gate (250/270) blockers first within a tie; inbox items have no days-blocked figure, so list them after the ranked blockers.
   - Write the day file using the output template. One recommendation for the day, with the reason.
3. **Midday pulse.** Re-pull the AMR Hub board and diff against the morning snapshot in the day file: gates that changed status, new blockers, blockers cleared. Also check `Projects/daily/inbox.md` for anything added since the morning drain; fold new items in under the same `(jordan-request)` tag and clear them the same way. Append a "Midday delta" section to the day file. If nothing changed on either front, say so in one line -- no fabricated movement.
4. **Close-out.** Mark each action item done / moved / still open. Anything still open becomes tomorrow's "Carry-over" section. Append per-gate movement for the day (units that advanced a gate). Then run [[Skills/session-recap/SKILL|session-recap]] if anything reusable was learned. Append the log.md line.
5. **Log format:** `## [<date>] daily | <phase> -- <n> actions, <n> blockers (<team>=<n>, ...), <n> carried over`.

## Proactive invocation

Kilroy is local-first, so "proactive" means a scheduled morning run: Windows Task Scheduler or cron invoking `claude -p "kilroy run my day"` in the repo, or a Claude Code Routine where available. The schedule triggers the same skill; nothing else changes. Midday and close-out can be scheduled the same way, but start with morning-only until the brief proves useful -- same reasoning as the skill-sprawl anti-pattern.

**In progress, 2026-07-17**, for the hosted Claude Code environment: a Routine (weekdays at 07:06, target time zone unconfirmed) is intended to fire into a fresh session that reads `CLAUDE.md`, runs `check-connectors` then this skill's morning phase, and sends a push notification with either the top action item or the connector-check failure. It writes the day file to disk but does not auto-commit or push it -- that stays a manual/interactive step so a bad automated run never lands on the shared branch unreviewed. See `Knowledge/Lessons/2026-07-17-proactive-trigger.md` for the full setup, the caveat that this environment currently can't reach any of the three real connectors (so every fire will hit the `check-connectors` FAIL path until `.env` points at reachable endpoints), and how to change the schedule or turn on auto-push later.

## Verify

Before handing the day file back to Jordan:

1. **Sum audit** (inherited from the progress board): every unit on the board appears in exactly one gate bucket, and the day file's blocker count equals the board's blocker count.
2. **Action traceability**: every action item traces to a real blocker line, a real carry-over line in a prior day file or lesson, or a real line in `inbox.md`'s `## Unconsumed` section at drain time. No invented work.
3. **Fail loud**: if `check-connectors` reports a FAIL, or AMR Hub or the Master Tracker CSV is unreachable mid-run, the day file says so at the top and the affected sections are marked unavailable -- never silently reuse yesterday's numbers as today's. A WARN (e.g. stale CSV) is not a FAIL -- it surfaces as a banner line, not a blocker to producing the brief.
4. **Close-out conservation**: actions done + moved + still-open = actions opened that morning (plus any added midday). No action silently disappears.
5. **Inbox conservation**: every line drained from `inbox.md`'s `## Unconsumed` section appears in exactly one day file's action list, and is removed from `inbox.md` in the same step. No inbox item is folded in twice, and none is silently dropped without appearing in a day file.

## Output template

```markdown
# Daily -- <YYYY-MM-DD>

> Kilroy was in the AMR Hub at HH:MM CDT. <total> units, <blockers> blocked, <n> actions today.

<Warning: Master Tracker CSV is <N>h old... -- only present if check-connectors returned a WARN, omit entirely otherwise>

## Today's actions

### Push (their action)

**MFE (<n>)**
- [ ] T3L2_<nnn> at gate 270, blocked 6 days -- "<blocker text>"

**MFA Hardware (<n>)**
- [ ] T3L2_<nnn> at gate 220, blocked 4 days -- "<blocker text>"

### Do (our action -- MFA Controls / PC)

- [ ] T3L2_<nnn> at gate 250, blocked 2 days -- "<blocker text>"
- [ ] <carry-over item> -- (carry-over from <YYYY-MM-DD>)
- [ ] <item text from inbox.md> -- (jordan-request, added <YYYY-MM-DD HH:MM>)

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
**Good trigger:** *"add 'call vendor' to my list"* -> appended to `Projects/daily/inbox.md` immediately, tagged `(jordan-request)`; folded into the next morning brief's action list, then cleared from the inbox.

**Bad trigger:** *"kilroy handoff cybercab 2m"* -> that is [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]], not the day runner.
**Bad trigger:** treating a stale-CSV WARN from `check-connectors` as a reason to skip the brief -- it's a banner line, not a stop condition. Only a hard FAIL stops the brief.

## Anti-patterns

- Re-rendering the full progress board inside the day file. Link the `Projects/progress/` snapshot; the day file is actions, not raw status.
- Inventing action items to make the day look fuller. Every action traces to a blocker, a carry-over, or a real `inbox.md` line.
- Letting a missing data source silently zero the blocker count. Fail loud -- mark the section unavailable.
- Running close-out without reconciling every open action. Done + moved + still-open must equal what was opened.
- Leaving a folded-in item sitting in `inbox.md`'s `## Unconsumed` section. It gets re-drained (and duplicated) the next morning if it isn't cleared.
- Treating a WARN from `check-connectors` as a FAIL, or silently dropping a WARN instead of surfacing it in the day file's banner.
- Writing to AMR Hub. Read-only -- Jordan updates gates in the dashboard.
