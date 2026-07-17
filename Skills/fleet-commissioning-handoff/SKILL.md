---
name: fleet-commissioning-handoff
type: executional
trigger: Jordan says "kilroy handoff <fleet>" / "package the handoff for <fleet>" / "handoff doc for <fleet>"
inputs: fleet-name (e.g. gftx-cybercab-2m-b3-agv)
outputs:
  - Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md (the handoff package, primary artifact)
  - log.md append (event line: date, fleet, open-item count, production-ready count)
---

# fleet-commissioning-handoff

Package a single fleet's current commissioning state into a markdown artifact Jordan can hand to line-side ops.

## When to use

- End of a commissioning cycle when a fleet is ready to be handed off to production ops.
- Ad-hoc "what's the state of <fleet>" pulls when a stakeholder asks for a snapshot.
- Not for daily progress checks -- use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] for that.

## Applies

- [[Knowledge/Sources/2026-07-02-pc-amr-gates|Gate ownership map]] -- 220/250/270/280/290 -> owning team.
- [[Knowledge/Personal/voice]] -- packaged outputs open with the "was here" signature; see its "Humanizer pass on packaged outputs" section for the precedence rule below.
- [[Knowledge/Personal/preferences]] -- one recommendation with reason; concrete over abstract.
- `humanizer` skill (`~/.claude/skills/humanizer`) -- run on the drafted package before finalizing (step 6).

## Steps

1. Resolve the fleet name. Confirm it appears in the Master Tracker CSV (`$MASTER_TRACKER_CSV_PATH`, column `projectIdentifier` or equivalent). If not, stop and ask Jordan.
2. Pull current `active/*.yaml` state via Overmind GraphQL for that fleet: image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas. Base URL from `$OVERMIND_BASE_URL_TEMPLATE` with `{fleet}` substituted.
3. Pull AMR Hub gate data via `GET $AMR_HUB_BASE_URL/api/amrs` (optionally filtered by fleet). For each unit extract `buyoff220Status`, `buyoff250Status`, `buyoff270Status`, `buyoff280Status`, corresponding `*BlockedReason` fields, and `updatedAt`. Derive `production-ready` = all 4 gates `= Complete`.
4. Read the Master Tracker CSV. Extract per-unit `pipelineStatus`, `etaAtFactory`, `projectIdentifier`, `vendorRef`, `hardwareRevision` for units in this fleet.
5. Cross-reference:
   - Units listed in Master Tracker but not in AMR Hub -> flag as "incoming, not yet ingested."
   - Units in AMR Hub but not in Master Tracker -> flag as "in dashboard, no upstream record" (possible data-entry gap).
   - Units offline in Overmind but with open buyoff items -> flag as "may block gate progression."
6. Draft the handoff package using the output template below. Open with the "was here" signature. Run the `humanizer` skill on the draft before finalizing -- [[Knowledge/Personal/voice]]'s rules win on any conflict (rare; see that file's "Humanizer pass" section). Write the final version to `Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md`.
7. Append to `log.md`: `## [<date>] handoff | <fleet> -- <production-ready>/<total> ready, <open-item-count> open items`.

## Verify

Before handing the package back to Jordan:

1. **Re-read the produced markdown** and quote two facts back:
   - One fact from the Overmind response (e.g. image tag)
   - One fact from the AMR Hub response (e.g. a specific unit's blocked reason)
   Confirm both quotes appear verbatim in the raw response payloads.
2. **Sum audit**: total unit count in the handoff = total unit count returned from `GET /api/amrs` for this fleet. No unit falls off.
3. **No fabricated IDs**: every robot ID mentioned in the handoff appears in the Overmind payload, the AMR Hub payload, or the Master Tracker CSV. (The CSV is a valid source here, not just AMR Hub/Overmind -- step 5's "incoming, not yet ingested" finding necessarily cites a unit that exists only in the Master Tracker CSV.)
4. **CSV freshness**: if the Master Tracker CSV's `mtime` is older than `$MASTER_TRACKER_STALE_WARN_HOURS`, include a `> Warning: Master Tracker CSV is <N>h old. Re-export before final handoff.` line at the top of the package.
5. **Humanizer didn't touch facts**: re-run steps 1-3 above against the post-humanizer version, not just the draft. A rewrite pass can smooth phrasing in a way that loosens a specific number, drops a unit ID, or rephrases a blocker reason into something vaguer -- confirm none of that happened before delivering.

If any verify step fails, do not deliver the package -- fix the underlying issue first.

## Output template

```markdown
# Handoff -- <fleet-name> -- <YYYY-MM-DD>

> Kilroy was in `<fleet-name>` at HH:MM CDT. <production-ready>/<total> production-ready, <open-item-count> open items, <blocker-count> active blockers.

## Fleet state (Overmind)

- Image tag: `<tag>`
- Robot count (Overmind): <n>
- Tracer events active: <n>
- MFS wiring: <summary>

## Buyoff-gate status (AMR Hub)

| Unit | 220 | 250 | 270 | 280 | Production-ready | Open blocker |
|---|---|---|---|---|---|---|
| T3L2_<nnn> | Complete | Complete | InProgress | NotStarted | No | 270: <reason> |
| ... |

## Upstream context (Master Tracker)

| Unit | Pipeline status | ETA | Vendor ref | HW rev |
|---|---|---|---|---|
| T3L2_<nnn> | On-site | 2026-06-15 | <ref> | Rev C |
| ... |

## Cross-reference findings

- <finding 1>
- <finding 2>

## Recommendation

<one recommendation with the reason -- e.g. "Hold handoff to line ops until T3L2_014 clears 250. MFA Controls has the action; ETA per blocker note is 2 days.">
```

## Examples

**Good trigger:** *"kilroy handoff gftx-cybercab-2m-b3-agv"*
**Good trigger:** *"package the handoff for cybercab 2m please"* (resolve alias -> fleet name via Master Tracker)

**Bad trigger:** *"what's the status of the fleet"* -- too vague, no fleet named. Ask Jordan which fleet.
**Bad trigger:** *"show me T3L2_014 progress"* -- single unit, not a fleet package. Use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]].

## Anti-patterns

- Fabricating fields. If the Master Tracker CSV is missing a column, note it in the package, don't invent values.
- Writing to AMR Hub. Read-only. Jordan updates gate status through the dashboard.
- Skipping the CSV freshness check. Stale upstream data has bitten real handoffs before.
- Multi-fleet output. This skill packages one fleet per invocation. Batch-mode is out of scope for v1.
- Letting the humanizer pass rewrite facts. It edits prose, not data -- re-run Verify steps 1-3 against the post-humanizer version, not just the draft.
