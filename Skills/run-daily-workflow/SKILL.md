---
name: run-daily-workflow
type: executional
trigger: Jordan says "kilroy run my day" / "kilroy daily" / "morning brief" / "start my day" (or "kilroy midday" / "kilroy wrap the day" for the other phases), "add <item> to my list" for ad-hoc capture any time, or a scheduled morning invocation
inputs: none required
outputs:
  - Projects/daily/<YYYY-MM-DD>-daily.md (the day file, primary artifact -- a living document updated across the day)
  - Projects/daily/inbox.md (ad-hoc capture scratch file -- appended to any time, drained into the next morning brief)
  - log.md append (prose event line: date, phase, action count, carry-over count; + structured `kilroy-log` companion line, per log.md's header contract)
---

# run-daily-workflow

The day runner. Orchestrates Kilroy's existing skills plus a task list into one daily loop: Jordan starts the day with a plan, gets deltas during the day, and closes the day with carry-overs captured.

Scope note (2026-07-21 consolidation): the "Today's actions" AMR blocker board (built on the retired `arriving-amr-progress` skill and its AMR Hub source) and the Graph-API `planner_get_tasks` digest are gone -- see `Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md`. The Planner digest now comes through Nova's `planner` MCP, the same path `triage-personal-items` already uses. This is a smaller day runner: Planner digest + personal triage + Confluence status draft/approval + carry-overs.

## When to use

- Start of the workday -- "kilroy run my day" / "start my day" / a scheduled morning run. Produces the morning brief.
- Midday pulse check -- "kilroy midday" / "anything change". Appends a delta to the day file.
- End of day -- "kilroy wrap the day". Reconciles actions and captures carry-overs.
- Any time -- "add <item> to my list" / "remind me to <item>". Ad-hoc capture, independent of phase; doesn't touch the day file directly, just queues the item for the next morning brief.
- Not for one-off fleet packaging -- use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] for that.

## Applies

- [[Skills/check-connectors/SKILL|check-connectors]] -- run first, silently, before any data pull. A FAIL here stops the morning phase before it starts.
- Nova's `planner` MCP -- source for the "Today's tasks (Planner)" section: Jordan's assigned tasks due today (`America/Chicago`). Untyped and untested by `mcp-server`'s suite -- a disclosed consolidation tradeoff; fail loud per source, never zero a section quietly.
- [[Skills/triage-personal-items/SKILL|triage-personal-items]] -- run as the morning phase's second input, after the Planner digest. Normal tier, not safety-adjacent -- its own Verify section covers source completeness for mail/Teams/Planner independently of this skill's Verify.
- [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] -- run as the morning phase's third input, reusing content already pulled for the Planner digest rather than re-fetching. Normal tier, not safety-adjacent, but the first skill in this loop that writes to a system visible to other people -- its draft-then-approval gate blocks the morning brief from completing until Jordan responds (approve/edit/skip), same as any other step that needs Jordan's input mid-run.
- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- referenced, never run automatically; the day file may recommend a handoff, Jordan triggers it.
- [[Skills/session-recap/SKILL|session-recap]] -- run at close-out if anything reusable was learned.
- [[Knowledge/Personal/daily-workflow]] -- what Jordan's day looks like and which M365 tools matter; its v1/deferred split is why the Planner digest pulls due-today assigned tasks only.
- [[Knowledge/Personal/voice]] -- day file opens with the "was here" signature; see its "Humanizer pass on packaged outputs" section.
- [[Knowledge/Personal/preferences]] -- short, concrete, one recommendation with reason.
- `humanizer` skill (`~/.claude/skills/humanizer`) -- run on the prose portions only (signature, recommendation, midday-delta and close-out narrative lines). Never on task titles, due dates, plan names, or triage item text -- those stay verbatim.

## Steps

0. **Ad-hoc capture (any time, independent of phase).** Jordan says "add \<item\> to my list" / "remind me to \<item\>": append one line to `Projects/daily/inbox.md` under `## Unconsumed`, formatted `- [ ] <item text> -- added <YYYY-MM-DD HH:MM> (jordan-request)`. Confirm back in one line. Do not touch the day file here -- the next morning brief drains the inbox.
1. **Determine phase.** Morning (first run of the day / "start my day"), midday ("midday" / "anything change"), or close-out ("wrap the day"). If the day file `Projects/daily/<today>-daily.md` does not exist, phase is morning regardless of clock.
2. **Morning brief.**
   - Run [[Skills/check-connectors/SKILL|check-connectors]] first, silently (two-source scope: Overmind, Planner via Nova's `planner` MCP -- it says nothing about mail/Teams reachability for triage-personal-items below). If it reports `NOT SAFE TO RUN A SKILL`, write the day file's opening line as the connector-check failure report and skip the Planner-digest bullet below. Still run the triage-personal-items bullet regardless -- it has its own independent fail-loud handling per source.
   - Pull today's Planner digest via Nova's `planner` MCP: Jordan's assigned tasks due today (`America/Chicago`), grouped by plan name. If the MCP call errors, stop that section and report per `CLAUDE.md`'s fail-loud rule -- don't zero out the section quietly. A task with a null or missing due date is never folded into the due-today list -- name it explicitly under a `Data quality flags (Planner)` line. Due-today only -- Jordan asked for that; don't add overdue items on top.
   - Run [[Skills/triage-personal-items/SKILL|triage-personal-items]] end to end (its own Verify included) to get the Personal Triage section: mail, Teams, and Planner-due-later items, bucketed into needs-action-today / FYI. If it reports any source `unreachable`, carry that into the day file's Personal Triage section verbatim rather than omitting the source.
   - Run [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] end to end (its own Verify included). It drafts bullets from the Planner digest already pulled above and yesterday's Carry-over section -- reuse that data rather than re-fetching. Present its draft inline and wait for Jordan's approve/edit/skip before continuing -- this is a hard stop in the morning phase, not a fire-and-forget step. Fold its result (posted, or the specific not-posted reason) into the day file as the `## Daily Status Post` section.
   - Scan `log.md` and `Knowledge/Lessons/*.md` "Open threads" for carry-overs from previous days, plus yesterday's day file "Carry-over" section if present.
   - Read `Projects/daily/inbox.md`'s `## Unconsumed` section. Every line there becomes a `(jordan-request)`-tagged action in today's list. Once folded in, remove those lines from `inbox.md` (leave `## Unconsumed` empty until Jordan adds more) -- an item lives in exactly one place at a time, either the inbox or a day file, never both.
   - Build today's action list: carry-overs first, then drained inbox items. Planner tasks never enter this list -- they get their own section, see the output template.
   - Draft the day file using the output template, including the Planner digest section. One recommendation for the day, with the reason. Run `humanizer` on the signature line and the recommendation only -- action-item bullets and Planner task lines stay verbatim. Write the final version.
3. **Midday pulse.** Re-pull the Planner digest and triage sources and diff against the morning snapshot in the day file: new items, items cleared. Also check `Projects/daily/inbox.md` for anything added since the morning drain; fold new items in under the same `(jordan-request)` tag and clear them the same way. Append a "Midday delta" section to the day file. If nothing changed on either front, say so in one line -- no fabricated movement.
4. **Close-out.** Mark each action item done / moved / still open. Anything still open becomes tomorrow's "Carry-over" section. Planner tasks are excluded from this reconciliation entirely -- they don't count toward the done/moved/still-open conservation check and they don't carry over via the day file's Carry-over mechanism. Reasoning: for the action list the day file *is* the tracking system, so conservation matters. For Planner tasks, Planner itself is the system of record; Kilroy re-reads it fresh every morning, so carrying a "still open" Planner task forward here would just create a second, divergent copy of state Planner already owns. Say so explicitly in the Close-out section: "Planner tasks are not reconciled here -- see Planner directly for current status." Then run [[Skills/session-recap/SKILL|session-recap]] if anything reusable was learned. Append the log.md entry (per step 5: the prose line plus its `kilroy-log` companion).
5. **Log format:** the prose line `## [<date>] daily | <phase> -- <n> actions, <n> carried over`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=run-daily-workflow event=daily status=<ok|warn> phase=<morning|midday|close-out> actions=<n> carried=<n> -->`. `status=warn` when the day file carries a WARN banner line or a `Data quality flags (Planner)` line, else `status=ok`.

## Proactive invocation

Kilroy is local-first, so "proactive" means a scheduled morning run: Windows Task Scheduler or cron invoking `claude -p "kilroy run my day"` in the repo, or a Claude Code Routine where available. The schedule triggers the same skill; nothing else changes. (The autonomy expansion in `.scratch/kilroy-autonomy/` is turning this into a four-phase scheduled loop -- see that spec and its tickets for the target state.)

## Verify

Before handing the day file back to Jordan:

1. **Action traceability**: every action item traces to a real carry-over line in a prior day file or lesson, or a real line in `inbox.md`'s `## Unconsumed` section at drain time. No invented work.
2. **Fail loud**: if `check-connectors` reports a FAIL, or a triage source is unreachable mid-run, the day file says so at the top and the affected sections are marked unavailable -- never silently reuse yesterday's numbers as today's.
3. **Close-out conservation**: actions done + moved + still-open = actions opened that morning (plus any added midday). No action silently disappears.
4. **Inbox conservation**: every line drained from `inbox.md`'s `## Unconsumed` section appears in exactly one day file's action list, and is removed from `inbox.md` in the same step. No inbox item is folded in twice, and none is silently dropped without appearing in a day file.
5. **Humanizer stayed in its lane**: action-item bullets, Planner task lines, and triage item text in the final version are byte-for-byte identical to the pre-humanizer draft. Only the signature line, recommendation, and narrative lines changed.
6. **Planner task traceability**: every task listed in "Today's tasks (Planner)" matches a real item from the Nova `planner` MCP pull (or a documented dry-run stand-in), assigned to Jordan and due today. No invented tasks.
7. **Planner data quality flags**: a task with a null or missing due date is named explicitly under a "Data quality flags (Planner)" line -- never silently dropped, never guessed into the due-today list.
8. **Personal Triage inherited verify**: the Personal Triage section passes [[Skills/triage-personal-items/SKILL|triage-personal-items]]'s own Verify checklist (count check, no double-count between buckets, source completeness, no cross-source dedup, bucket traceability) before being merged in.
9. **Structured line audit**: the `kilroy-log` companion line sits on the line immediately after the prose log line and follows `log.md`'s header contract; `actions`/`carried` match the day file's state for the phase being logged, and `status` follows the WARN rule in step 5.
10. **Daily Status Post inherited verify**: the `## Daily Status Post` section passes [[Skills/confluence-daily-status/SKILL|confluence-daily-status]]'s own Verify checklist (date-match guard, no double-post, scope containment, notify-checkbox confirmation, approval-gate integrity, fail-loud traceability) before being folded in. The morning phase did not proceed past this step without an explicit Jordan response (approve/edit/skip) -- a silently-skipped approval prompt is a Verify failure here, not just in the sub-skill.

## Output template

```markdown
# Daily -- <YYYY-MM-DD>

> Kilroy was here at HH:MM CDT. <n> actions today, <n> Planner tasks due.

## Today's actions

- [ ] <carry-over item> -- (carry-over from <YYYY-MM-DD>)
- [ ] <item text from inbox.md> -- (jordan-request, added <YYYY-MM-DD HH:MM>)

## Today's tasks (Planner)

**<Plan name A> (<n>)**
- [ ] <task title> -- due today

**<Plan name B> (<n>)**
- [ ] <task title> -- due today

Data quality flags (Planner): <task title> -- due date returned null/missing, excluded from the list above. Needs <resolution step>. (Omit this line entirely if there are no flags.)

## Personal Triage

**Needs action today**
- [Planner] <task title> -- due <today|N days overdue>
- [Mail] <subject> -- from <sender>, flagged
- [Teams] <chat/channel name> -- @mentioned by <sender>
(or "None flagged" if empty)

**FYI**
- Mail: <n> unread (top 3: <subject>, <subject>, <subject>)
- Teams: <n> unread (top 3: <chat name>, <chat name>, <chat name>)
- Planner: <n> due later this week

**Source status:** mail <ok|unreachable> | teams <ok|unreachable> | planner <ok|unreachable>

## Daily Status Post

**Posted** to Week <MM/DD/YYYY>, <Weekday> <date> -- notify-watchers confirmed unchecked.
<!-- or -->
**NOT POSTED** -- <specific reason: page-not-found | date-mismatch | already-posted | checkbox-unconfirmed | profile-locked | playwright-failure: <detail> | skipped (empty draft or by Jordan)>

## Carry-over (from yesterday)

- <item> -- <source: prior day file / lesson open thread>

## Midday delta

(appended at midday: new items, items cleared -- or one line saying nothing changed)

## Close-out

(appended at end of day)
- Done: <n> -- <items>
- Moved: <n> -- <items, where they went>
- Still open (tomorrow's carry-over): <n> -- <items>

Planner tasks are not reconciled here -- see Planner directly for current status.

## Recommendation

<one recommendation with the reason.>
```

## Examples

**Good trigger:** *"kilroy run my day"* -> morning phase, full brief.
**Good trigger:** *"anything change since this morning?"* -> midday phase, delta appended to the day file.
**Good trigger:** *"add 'call vendor' to my list"* -> appended to `Projects/daily/inbox.md` immediately, tagged `(jordan-request)`; folded into the next morning brief's action list, then cleared from the inbox.
**Good trigger:** morning brief reaches the Confluence-status step -> draft shown inline, Jordan approves, [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] posts, result folded into `## Daily Status Post`.

**Bad trigger:** *"kilroy handoff gftx-cybercab-2m-b3-agv"* -> that is [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]], not the day runner.

## Anti-patterns

- Inventing action items to make the day look fuller. Every action traces to a carry-over or a real `inbox.md` line.
- Letting a missing data source silently zero a section. Fail loud -- mark the section unavailable.
- Running close-out without reconciling every open action. Done + moved + still-open must equal what was opened.
- Leaving a folded-in item sitting in `inbox.md`'s `## Unconsumed` section. It gets re-drained (and duplicated) the next morning if it isn't cleared.
- Running the humanizer pass over action-item bullets, Planner task lines, or triage item text. It touches the signature, recommendation, and narrative lines only.
- Silently dropping a Planner pull failure. If the check-connectors probe or the morning pull fails, say so in the day file's Planner section -- don't zero it out quietly.
- Silently dropping a Personal Triage source failure. If [[Skills/triage-personal-items/SKILL|triage-personal-items]] reports mail, Teams, or Planner as `unreachable`, carry that into the day file's Personal Triage section -- don't omit the source or zero its count.
- Letting the morning phase continue past [[Skills/confluence-daily-status/SKILL|confluence-daily-status]]'s draft without an explicit Jordan response. No auto-approve, no timeout-based skip -- the brief waits.
- Re-implementing confluence-daily-status's page-resolution or notify-checkbox logic inline here instead of delegating to that skill. This skill orchestrates; it doesn't duplicate the sub-skill's Confluence-specific mechanics.
- Inventing overdue-item handling for Planner. Jordan asked for due-today only -- don't add scope he didn't ask for.
- Reconciling Planner tasks at close-out. Planner is the system of record and Kilroy re-reads it fresh every morning -- don't fold Planner tasks into the done/moved/still-open count and don't carry them forward.
- Reviving the retired AMR board or Graph-API Planner pull. Git history has the old version; the consolidation decision record explains why it went.
