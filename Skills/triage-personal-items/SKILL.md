---
name: triage-personal-items
type: executional
trigger: run-daily-workflow's morning-brief step (see run-daily-workflow Applies); or Jordan says "what needs my attention today" / "triage my inbox and Teams" / "kilroy triage" outside the daily cadence
inputs: none required beyond MCP access to the `mail`, `microsoft-teams`, and `planner` MCP servers; Microsoft Loop assignments arrive via a Nova `loop` MCP when one is present, else through the same `planner` MCP (dual-path, see Steps)
outputs: a `## Personal Triage` section, either merged into run-daily-workflow's day file or returned standalone when invoked directly
---

# triage-personal-items

## When to use

- run-daily-workflow's morning phase, as its third orchestrated input alongside the AMR gate board and the Planner digest.
- Jordan asks "what's on my plate today" / "triage my inbox" / "anything I'm missing on Teams" outside the daily cadence.
- Not for AMR gate data -- this skill only touches mail, Teams, Planner, and Loop. [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] and the Planner digest already in [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] cover that ground.

## Applies

- [[Knowledge/Personal/voice]] -- when merged into the day file, the Personal Triage section is part of a packaged output and gets the same humanizer scoping rule as the rest of run-daily-workflow: humanizer runs on narrative lines only, never on item text (subject lines, task titles, sender/chat names) -- those stay verbatim, same reasoning as blocker text and Planner task lines.
- [[Knowledge/Personal/daily-workflow]] -- Teams mentions and flagged email moved out of that file's "Deferred" list on 2026-07-20 specifically because this skill now covers them; see its update note. The Planner-overdue scope here (Step 3) is a deliberately separate, broader view from run-daily-workflow's own Planner digest (due-today-only, per that file's v1 scope) -- the digest exists for the action list, this exists for a personal at-a-glance triage, and the two intentionally differ in window.
- [[Knowledge/Personal/monitored-chats]] -- scopes which Teams group chats get scanned in Step 2. If that file is missing or has no filled rows, skip group-chat scanning, record it in the Source status line, and never guess chat names.
- Not safety-adjacent. CLAUDE.md's safety-tier non-negotiables (fail-loud on AMR fields, human read-through on gate-attribution changes) don't apply to this skill in that formal sense -- it's normal tier. The fail-loud discipline in Steps/Verify below is carried over anyway because it's good practice regardless of tier, not because this skill is safety-adjacent.

## Steps

1. Pull mail via the `mail` MCP's `MailSearch` tool: one call for `flagged: true` OR `importance: high` (uncapped -- these are rare enough not to need a cap), and one call for `is_read: false` capped to the 25 most recent (`top: 25`) for the FYI count and top-3 list.
2. Pull Teams items via the `microsoft-teams` MCP: unread chats via `ListChats` (default limit), and @mentions in the last 7 days via `SearchMessages` with `IsMentioned:true` scoped to that window. Group-chat scanning is scoped by [[Knowledge/Personal/monitored-chats]] -- scan only the chats listed there. If that file is missing or has no filled rows, skip group-chat scanning, record `group chats not configured` in the Source status line, and never guess chat names.
3. Pull Planner tasks via the `planner` MCP's `ListMyTasks`, filtered to due today or overdue for "Needs action today", and due within the next 7 days (excluding today/overdue) for the FYI count -- two distinct sets, not one pull re-sliced.
4. Pull Microsoft Loop assignments -- dual-path. **Both paths are UNVERIFIED-until-Windows:** neither has run against the real work-PC setup; the work-PC bootstrap (autonomy ticket 07) resolves which path is real and updates this marker.
   a. **Preferred** -- if a Nova `loop` MCP server is present in the session, probe it and pull Jordan's Loop task assignments from it.
   b. **Fallback** -- if no `loop` MCP is present, read Loop tasks through the same Nova `planner` MCP as Step 3. Loop task lists can back Planner plans, so use the plan/task provenance notes to identify Loop-backed tasks; attribute those to the Loop source and exclude them from Step 3's Planner counts. That's source attribution of one underlying item read once, not the cross-source dedup Step 7 forbids.
   Slice the Loop results like Planner: due today or overdue -> "Needs action today"; due within the next 7 days -> FYI. If (a) is absent and (b) surfaces no Loop-backed tasks it can identify (no provenance signal, or the call errors), the source is `unreachable` -- mark it in the Source status line exactly like the mail/Teams/Planner handling in Step 6, never silently omit Loop. When Loop is `ok`, note which path served it (see the Output template note).
5. Bucket every item into exactly one of "Needs action today" or "FYI" -- never both, so the FYI counts in the output template never include an item already listed under Needs action:
   - **Needs action today** -- Planner or Loop tasks due today or overdue, mail flagged or (unread AND importance=high), Teams messages where Jordan is @mentioned.
   - **FYI** -- mail unread but not flagged/important, Teams chats unread but with no @mention, Planner or Loop tasks due in the next 7 days but not today/overdue. Condense to a count per source plus the top 3 most recent.
6. If any of the four sources errors or returns nothing when something was expected, do not silently omit that source. Mark it `unreachable` in the Source status line and say so in the relevant bucket (e.g. "Teams: unreachable, not counted below").
7. Do not merge or deduplicate items across sources even when they plausibly reference the same underlying work (e.g. a Teams mention and a Planner task both about the same vendor call). Show both -- silently merging can hide that Jordan has the same follow-up coming from two directions. (Step 4b's Loop attribution is the one sanctioned exception, and it's attribution, not dedup.)
8. Render using the output template below. If invoked directly (not via run-daily-workflow), return it as the whole response. If invoked as part of the morning brief, hand this section back to run-daily-workflow to merge in.

## Verify

1. **Count check** -- every count in the output (e.g. "3 flagged mail") matches the raw item count returned by the tool call, not a rounded or estimated figure.
2. **No double-count between buckets** -- no item appearing in "Needs action today" is also counted in that same source's FYI number. Pick one flagged-and-unread mail item and confirm it appears once, under Needs action, and is excluded from the Mail FYI count.
3. **Source completeness** -- all four sources (mail, Teams, Planner, Loop) have an entry in the Source status line, either data or an explicit `unreachable` -- never a silently missing source.
4. **No cross-source dedup** -- spot-check that no two items referencing similar content were collapsed into one line.
5. **Bucket traceability** -- every item in "Needs action today" actually meets one of the three named criteria (due today/overdue, flagged/important+unread, @mentioned) -- no item lands there on a vibe.
6. **Loop path recorded** -- when Loop is `ok`, the output names which documented path served it (loop MCP or Planner sync); when neither path yielded Loop data, the Source status line shows `loop unreachable` -- never a silent skip.
7. **No Loop/Planner double-count on the fallback path** -- when Loop came through Step 4b, spot-check one Loop-backed task and confirm it appears under Loop only, excluded from the Planner counts.
8. **Group-chat scoping** -- every group chat scanned appears by name in [[Knowledge/Personal/monitored-chats]]; if that file was missing or unfilled, the Source status line records `group chats not configured` and no chat name was guessed.

## Output template

```markdown
## Personal Triage

**Needs action today**
- [Planner] <task title> -- due <today|N days overdue>
- [Loop] <task title> -- due <today|N days overdue>
- [Mail] <subject> -- from <sender>, flagged
- [Teams] <chat/channel name> -- @mentioned by <sender>
(or "None flagged" if empty)

**FYI**
- Mail: <n> unread (top 3: <subject>, <subject>, <subject>)
- Teams: <n> unread (top 3: <chat name>, <chat name>, <chat name>)
- Planner: <n> due later this week
- Loop: <n> due later this week

**Source status:** mail <ok|unreachable> | teams <ok|unreachable> | planner <ok|unreachable> | loop <ok|unreachable> | group chats <n monitored|not configured>
```

When `loop` is `ok`, append which documented path served it -- `via loop MCP` or `via planner sync` -- after the `ok` (e.g. `loop ok, via planner sync`), so Verify item 6 has something to check.

## Examples

**Good trigger:** *"kilroy triage"* outside the daily cadence -> standalone Personal Triage section, mail/Teams/Planner pulled fresh, returned directly to Jordan.
**Good trigger:** run-daily-workflow's morning phase calling this skill as its third input -> section merged into the day file under the Planner digest.
**Bad trigger:** *"anything change on the AMR side"* -> that's [[Skills/run-daily-workflow/SKILL|run-daily-workflow]]'s midday phase or [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] directly, not this skill.

## Anti-patterns

- Silently dropping a source that errors instead of marking it `unreachable`.
- Pulling AMR Hub, Overmind, or Master Tracker data into this skill -- stays scoped to mail/Teams/Planner/Loop.
- Hand-rolling a Graph or HTTP fallback for Loop when neither documented path works. The two documented paths (Nova `loop` MCP, Planner sync) are the only ones -- anything past them is `unreachable`, not an invitation to improvise.
- Guessing Teams group-chat names when [[Knowledge/Personal/monitored-chats]] is missing or unfilled -- skip group-chat scanning and record it instead.
- Deduplicating items across sources without saying so.
- Counting a flagged/mentioned/due-today item in both "Needs action today" and its source's FYI number. Each item lives in exactly one bucket.
- Running humanizer over item text (subjects, task titles, sender/chat names) -- narrative lines only, same rule as the rest of run-daily-workflow.
- Treating this as safety-adjacent and applying the gate-attribution human-read-through process to routine edits here -- it isn't in that tier.
