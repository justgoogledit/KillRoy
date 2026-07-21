---
name: run-daily-workflow
type: executional
trigger: Jordan says "kilroy run my day" / "kilroy daily" / "morning brief" / "start my day" (or "kilroy midday" / "kilroy wrap the day" for the other phases), "add <item> to my list" for ad-hoc capture any time -- OR headless via `claude -p "/run-daily-workflow --autonomous --phase=<morning|delta|closeout>"` from Windows Task Scheduler
inputs: optional `--autonomous` flag + `--phase=<morning|delta|closeout>` (headless scheduled runs); nothing required interactively
outputs:
  - Projects/daily/<YYYY-MM-DD>-daily.md (the day file, primary artifact -- a living document updated across the day)
  - Projects/daily/runs/<YYYY-MM-DD>-<phase>.json (status marker, one per autonomous phase run -- the login hook and Verify read these)
  - Projects/daily/runs/journal.jsonl (append-only run journal, one line per autonomous phase -- the learning loop reads this)
  - Projects/daily/inbox.md (ad-hoc capture scratch file -- appended to any time, drained into the next morning brief)
  - mirrored copies of daily outputs under `$OBSIDIAN_VAULT_PATH/daily/` when that env var is set and non-empty (see the vault-mirror step; `Projects/daily/` stays authoritative)
  - log.md append (prose event line + structured `kilroy-log` companion line, per log.md's header contract)
---

# run-daily-workflow

The day runner. Four phases -- morning prep, two midday deltas, close-out -- that run unattended on a schedule (Windows Task Scheduler, Mon-Thu: 07:00, 11:00, 13:00, 16:00) and surface their output the next time Jordan interacts. Interactive invocation still works and is where the one human gate (Confluence post approval) lives.

Scope note (2026-07-21 consolidation): the AMR blocker board and Graph-API Planner digest are gone -- see `Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md`. Planner comes through Nova's `planner` MCP.

## When to use

- **Scheduled/autonomous** -- Task Scheduler fires `claude -p "/run-daily-workflow --autonomous --phase=<phase>"`. No questions, no posts; everything is prepared as drafts and files.
- **Interactive** -- "kilroy run my day" / "start my day" (morning), "kilroy midday" / "anything change" (delta), "kilroy wrap the day" (closeout). Same steps, plus the Confluence approval gate.
- Any time -- "add \<item\> to my list" / "remind me to \<item\>". Ad-hoc capture, independent of phase.
- Not for one-off fleet packaging -- use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]].

## Autonomous mode -- the hard rules

1. **No interactive questions.** If a decision would need Jordan, take the fail-loud default, record it in the marker's `detail`, and move on.
2. **NEVER post to Confluence or touch the `playwright` MCP.** Autonomous runs draft the status post as text in the day file only. The approve-then-post flow exists solely in interactive mode. This holds regardless of what any permission allowlist technically permits -- it is a skill-level prohibition, and `.claude/settings.json` on the work PC additionally hard-denies those tools in headless context.
3. **Mon-Thu only** (`America/Chicago`). On Fri/Sat/Sun, write a marker with `"status": "skipped"` and exit cleanly -- no sources pulled, no day file touched.
4. **Fail loud, per source.** A dead source gets `"status": "failed"` with a specific `detail` in the marker and an explicit callout in the day file; the run continues with the remaining sources. Overall `status` = `ok` (all sources ok), `partial` (mix), `failed` (nothing usable). Never silently drop a source or reuse yesterday's data as today's.

## Status marker

Every autonomous phase writes `Projects/daily/runs/<YYYY-MM-DD>-<phase>.json` (create `runs/` if absent):

```json
{
  "status": "ok|partial|failed|skipped",
  "sources": {
    "<source>": { "status": "ok|failed", "detail": "<string>" }
  },
  "vaultMirror": "mirrored -- <path> | skipped -- OBSIDIAN_VAULT_PATH not set",
  "startedAt": "<ISO 8601>",
  "finishedAt": "<ISO 8601>"
}
```

Source keys in play per phase: `mail`, `teams`, `planner`, `loop`, `overmind` (only when a fleet pull actually ran). A `skipped` marker carries an empty `sources` map. `vaultMirror` is the one-line result of the vault-mirror step (step 5) -- a mirror skip is recorded here as a note, never as a failure, and never changes the overall `status`. After the marker, append the run's journal line to `Projects/daily/runs/journal.jsonl` -- schema and the Thursday reflection that consumes it live in the Learning loop section of `.scratch/kilroy-autonomy/issues/08-learning-loop.md` until ticket 08 lands it here.

## Applies

- [[Skills/check-connectors/SKILL|check-connectors]] -- run first, silently, before any data pull. A FAIL stops data-pulling steps; the marker records it.
- Nova's `planner` MCP -- Planner assignments (due today + assigned-no-due-date). UNVERIFIED-until-Windows; untested by `mcp-server`'s suite.
- Microsoft Loop -- via Nova `loop` MCP if present, else Loop-synced tasks through the `planner` MCP; see [[Skills/triage-personal-items/SKILL|triage-personal-items]]'s Loop path (ticket 04). UNVERIFIED-until-Windows.
- `mail` / `microsoft-teams` MCPs -- mentions, DM tags, and the group chats configured in `Knowledge/Personal/monitored-chats.md` (filled at bootstrap; if the file is missing or empty, record that in the marker and skip group-chat scanning -- don't guess chats).
- [[Skills/triage-personal-items/SKILL|triage-personal-items]] -- morning triage input. Its own Verify covers per-source completeness.
- [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] -- **draft steps only in autonomous mode** (its steps 1-5 minus the approval wait); the post flow (steps 5-7) runs only interactively.
- [[Skills/session-recap/SKILL|session-recap]] -- interactive close-out only, if anything reusable was learned.
- [[Knowledge/Personal/daily-workflow]], [[Knowledge/Personal/voice]], [[Knowledge/Personal/preferences]] -- day shape, signature, register.
- `humanizer` skill -- prose portions only (signature, recommendation, narrative lines); never task titles, item text, or checklist lines.

## Steps

0. **Ad-hoc capture (any time).** "add \<item\> to my list": append `- [ ] <item text> -- added <YYYY-MM-DD HH:MM> (jordan-request)` under `## Unconsumed` in `Projects/daily/inbox.md`. Confirm in one line. Day file untouched until the next morning drain.
1. **Resolve mode, phase, and weekday.**
   - `--autonomous` present: phase comes from `--phase=` (missing/invalid phase = write a `failed` marker naming the bad argument, exit). Record `startedAt` now. If today is Fri/Sat/Sun (`America/Chicago`): write the `skipped` marker, exit cleanly.
   - Interactive: infer phase from the trigger words; if the day file `Projects/daily/<today>-daily.md` doesn't exist, phase is morning regardless of clock.
2. **Morning phase.**
   - Run [[Skills/check-connectors/SKILL|check-connectors]] silently. FAIL = day file opens with the failure report; data-pulling bullets below are skipped for the failed sources; marker records each.
   - Gather, one source at a time, each fail-loud into the marker's `sources` map:
     - **Mail** -- messages where Jordan is directly addressed or flagged, since last workday.
     - **Teams** -- DMs and @mentions, plus the group chats listed in `Knowledge/Personal/monitored-chats.md` (summarize each configured chat's activity; skip with a marker note if the config is absent).
     - **Planner** -- Jordan's assigned tasks: due today, and assigned-with-no-due-date.
     - **Loop** -- Jordan's Loop task assignments via the resolved Loop path (ticket 04). If neither Loop path responds, `loop: failed` in the marker -- never silently omit.
   - Run [[Skills/triage-personal-items/SKILL|triage-personal-items]] end to end for the Personal Triage section (it reuses the pulls above where its Steps allow).
   - **Draft** the Confluence status post per [[Skills/confluence-daily-status/SKILL|confluence-daily-status]]'s drafting steps -- text only, into the day file's `## Daily Status Post` section marked `DRAFT -- awaiting approval`. Autonomous mode stops there; interactive mode presents it and, on approval, hands the post to that skill's Playwright flow.
   - Scan `log.md` + `Knowledge/Lessons/*.md` open threads + yesterday's day file Carry-over section for carry-overs. Drain `inbox.md` `## Unconsumed` lines into today's actions (`(jordan-request)` tag), removing them from the inbox -- an item lives in exactly one place.
   - **Generate the day checklist** -- the ordered plan for Jordan's day, biggest work first, from everything gathered above. Ordering follows the `## Tier rules` section below -- tiers first, then the documented tiebreaks within a tier. Every checklist item cites its source inline: the chat/task id or link it came from (a Teams message link, a Planner or Loop task id, an AMR unit id, a carry-over's day-file date, an inbox line). An item with no citable source does not go on the checklist -- that is Verify's no-invented-work check.
   - Write the day file (template below). Humanizer on signature + recommendation only. Marker (`finishedAt`, statuses) + journal line last.
3. **Delta phase (11:00, 13:00, or "kilroy midday").** Re-pull mail/Teams/Planner/Loop deltas since the morning snapshot; append a `## Delta <HH:MM>` section: new items, cleared items, checklist adjustments -- or one line saying nothing changed. Fold any new `inbox.md` lines in, same drain rule. Marker + journal line.
4. **Closeout phase (16:00 or "kilroy wrap the day").** Reconcile the checklist and action list: done / moved / still open (autonomous runs mark best-guess from source state, flagged `proposed --` for Jordan to confirm at next login; interactive runs confirm live). Still-open items become tomorrow's Carry-over section. Planner/Loop tasks are never reconciled here -- their systems of record own them; say so in the section. Thursday closeout additionally runs the weekly reflection (ticket 08). Marker + journal line; log.md entry per step 6. Interactive close-out also runs [[Skills/session-recap/SKILL|session-recap]] if anything reusable was learned.
5. **Vault mirror (every phase, after any daily-output write).** After writing or appending any daily output -- the morning day file, a delta append, the close-out section -- copy the updated file to `$OBSIDIAN_VAULT_PATH/daily/` (create the subfolder if absent). `Projects/daily/` stays authoritative; the vault copy is the one Jordan reads and annotates, and it never feeds back into this skill's state. If `OBSIDIAN_VAULT_PATH` is unset or blank (Mac dev runs won't have it), skip the mirror and record the one-line note in the phase's status marker (`"vaultMirror": "skipped -- OBSIDIAN_VAULT_PATH not set"`) -- a skip is never an error and never degrades the marker's overall `status`. Run this before finalizing the marker so the mirror result lands in it. The path comes from `.env` only -- never hardcoded.
6. **Log format** (morning and closeout, both modes): prose line `## [<date>] daily | <phase> -- <n> actions, <n> carried over`, then `<!-- kilroy-log date=<date> skill=run-daily-workflow event=daily status=<ok|warn> phase=<phase> actions=<n> carried=<n> -->`. `status=warn` when the day file carries any source-failure callout or data-quality flag.

## Tier rules

The single home for the day-checklist ordering rules. The checklist generator (morning phase, step 2) reads this section, and the Thursday weekly reflection (ticket 08) points at it when proposing changes -- nothing else restates these rules.

Heavy-first tiers:

- **Tier 1** -- assigned tasks from Teams + Loop.
- **Tier 2** -- AMR repairs + commissioning work.
- **Tier 3** -- assigned tasks with no due date.
- **Tier 4** -- mentions needing a reply.
- **Tier 5** -- FYI / light admin (end of day).

Ties within a tier: earlier due date first, then older item first (original creation time). Due date is always checked before age -- an older item with a later due date sorts after a younger item due sooner. Items without due dates fall straight through to the age tiebreak. Carry-overs and drained inbox items tier by what the item is (a carried Teams-assigned task is still Tier 1), and age counts from the item's original creation, not the day it was carried.

These rules are static -- the generator never reorders on judgment -- but tunable: the Thursday reflection proposes tier-rule changes based on what Jordan actually reordered, and an approved proposal is edited into this section via the normal skill-creator process, never applied by the reflection itself.

## Verify

1. **Marker exists and is coherent** (autonomous runs): `Projects/daily/runs/<date>-<phase>.json` written, valid JSON, `finishedAt` >= `startedAt`, and overall `status` consistent with the `sources` map (all ok = ok; mix = partial; none ok = failed; weekend = skipped with empty sources).
2. **Journal line appended**: one new line in `journal.jsonl`, valid JSON, date/phase matching the marker. Append-only -- no prior line modified.
3. **No posting tools in the autonomous path**: grep this skill's autonomous steps -- no `playwright` invocation, no Confluence write call. The status post exists only as day-file draft text until interactive approval.
4. **Fail loud held**: every source with `failed` in the marker has a matching explicit callout in the day file section it feeds -- never an empty-but-normal-looking section.
5. **Action + inbox conservation**: every action traces to a carry-over, a real inbox line at drain time, or a gathered assignment; drained inbox lines removed in the same step; closeout's done + moved + still-open equals what was opened.
6. **Checklist traceability**: every checklist item traces to a gathered item (Teams/Loop/Planner assignment, AMR work, carry-over, inbox line) and carries its source citation (chat/task id or link) inline. No invented work; ordering matches `## Tier rules`.
7. **Humanizer stayed in its lane**: task titles, item text, and checklist lines byte-identical pre/post humanizer.
8. **Inherited verifies**: triage-personal-items' checklist for its section; confluence-daily-status' drafting checks for the draft (its posting checks apply only after interactive approval).
9. **Structured line audit**: the `kilroy-log` companion follows `log.md`'s header contract and matches the day file's counts.
10. **Vault mirror behavior**: with `OBSIDIAN_VAULT_PATH` set and non-empty, every daily output written this phase has an identical copy under `$OBSIDIAN_VAULT_PATH/daily/`; with it unset or blank, no mirror was attempted, the marker carries the one-line `vaultMirror` skip note, and the skip did not change the marker's overall `status`.

## Output template

```markdown
# Daily -- <YYYY-MM-DD>

> Kilroy was here at HH:MM CDT. <n> checklist items, <n> Planner tasks due, <n> mentions to answer.

<per-source failure callouts, if any -- one line each, verbatim from the marker details>

## Day checklist

1. [ ] <item> -- <source: Teams/Loop/Planner/AMR/carry-over/inbox> (<chat/task id or link>) <due/age note>
2. [ ] ...

## Mentions & messages

- [Mail] <subject> -- from <sender>, <why it needs Jordan>
- [Teams] <chat> -- @mention by <sender>: <one-line gist>
- [Teams:<configured chat>] <summary of activity>

## Today's tasks (Planner)

**<Plan name> (<n>)**
- [ ] <task title> -- due today

Data quality flags (Planner): <task title> -- due date null/missing, excluded above. (Omit line if none.)

## Loop assignments

- [ ] <task> -- <status/source path note>

## Personal Triage

<triage-personal-items' section, verbatim per its own template>

## Daily Status Post

DRAFT -- awaiting approval:
- <bullet>
- <bullet>
<!-- after interactive approval this becomes: **Posted** ... or **NOT POSTED** -- <specific reason> -->

## Carry-over (from yesterday)

- <item> -- <source>

## Delta <HH:MM>

(appended by delta phases: new / cleared / adjusted -- or "nothing changed")

## Close-out

- Done: <n> -- <items>            <- autonomous: each line prefixed "proposed --"
- Moved: <n> -- <items, where>
- Still open (tomorrow's carry-over): <n> -- <items>

Planner and Loop tasks are not reconciled here -- their systems of record own them.

## Recommendation

<one recommendation with the reason.>
```

## Examples

**Good trigger (scheduled):** Task Scheduler, Tuesday 07:00 -> `claude -p "/run-daily-workflow --autonomous --phase=morning"` -> day file + checklist + status-post draft + marker + journal line; nothing posted anywhere.
**Good trigger (scheduled, weekend):** same command on Saturday -> `skipped` marker, clean exit, nothing else.
**Good trigger (interactive):** "kilroy run my day" at 10:15 after the 07:00 run already fired -> surfaces the existing brief, runs the Confluence approval gate on the pending draft.
**Good trigger:** "add 'call vendor' to my list" -> inbox append, folded in next morning.

**Bad trigger:** *"kilroy handoff gftx-cybercab-2m-b3-agv"* -> [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]].

## Anti-patterns

- Posting to Confluence (or launching playwright at all) in an autonomous run. Draft only; the human gate is the point.
- Asking questions in an autonomous run. Take the fail-loud default and record it.
- Running data pulls on a Friday/weekend instead of writing the `skipped` marker.
- Silently zeroing a section whose source died. Marker + explicit callout, every time.
- Inventing checklist or action items. Everything traces to a gathered item.
- Rewriting journal.jsonl history. Append-only.
- Letting an interactive session skip the Confluence approval prompt on a pending draft. Approve, edit, or skip -- explicitly.
- Re-implementing confluence-daily-status' page/checkbox mechanics here. This skill orchestrates.
- Reviving the retired AMR board or Graph-API Planner pull. Consolidation decision record explains why they went.
